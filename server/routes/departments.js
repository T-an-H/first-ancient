import { Router } from 'express';
import pool from '../db.js';
import {
  countDepartmentRelations,
  ensureDepartment,
  getDepartmentById,
  handleRouteError,
  httpError,
  mapDepartmentRow,
  normalizeColor,
  normalizeText,
  pickColor,
} from '../lib/admin.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         dept.id,
         dept.name,
         dept.color,
         dept.created_at,
         (SELECT COUNT(*) FROM categories WHERE department_id = dept.id) AS category_count,
         (SELECT COUNT(*) FROM courses WHERE department_id = dept.id) AS course_count,
         (SELECT COUNT(*) FROM classes WHERE department_id = dept.id) AS class_count,
         (
           SELECT COUNT(*)
           FROM students AS stu
           JOIN classes AS cls ON cls.id = stu.class_id
           WHERE cls.department_id = dept.id
         ) AS student_count,
         (SELECT COUNT(*) FROM teachers WHERE department_id = dept.id) AS teacher_count
       FROM departments AS dept
       ORDER BY dept.name`
    );

    res.json({
      success: true,
      departments: rows.map(mapDepartmentRow),
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const name = normalizeText(req.body?.name);
    if (!name) {
      throw httpError(400, '学院名称不能为空', 'DEPARTMENT_NAME_REQUIRED');
    }

    const existing = await ensureDepartment(connection, {
      departmentName: name,
      createIfMissing: false,
    }).catch((error) => {
      if (error?.code === 'DEPARTMENT_NOT_FOUND') return null;
      throw error;
    });

    if (existing) {
      throw httpError(409, '学院名称已存在', 'DEPARTMENT_EXISTS');
    }

    const color = normalizeColor(req.body?.color, pickColor(name));
    const [result] = await connection.query(
      'INSERT INTO departments (name, color) VALUES (?, ?)',
      [name, color]
    );

    const department = await getDepartmentById(connection, result.insertId);
    res.status(201).json({
      success: true,
      department: mapDepartmentRow({
        ...department,
        category_count: 0,
        course_count: 0,
        class_count: 0,
        student_count: 0,
        teacher_count: 0,
      }),
    });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.put('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const department = await getDepartmentById(connection, req.params.id);
    if (!department) {
      throw httpError(404, '学院不存在', 'DEPARTMENT_NOT_FOUND');
    }

    const name = normalizeText(req.body?.name) || department.name;
    const color = normalizeColor(req.body?.color, department.color || pickColor(name));

    const [duplicateRows] = await connection.query(
      'SELECT id FROM departments WHERE name = ? AND id <> ? LIMIT 1',
      [name, req.params.id]
    );
    if (duplicateRows.length > 0) {
      throw httpError(409, '学院名称已存在', 'DEPARTMENT_EXISTS');
    }

    await connection.query(
      'UPDATE departments SET name = ?, color = ? WHERE id = ?',
      [name, color, req.params.id]
    );

    await connection.query(
      'UPDATE courses SET department = ? WHERE department_id = ?',
      [name, req.params.id]
    );
    await connection.query(
      `UPDATE students
       SET department = ?
       WHERE class_id IN (SELECT id FROM classes WHERE department_id = ?)`,
      [name, req.params.id]
    );

    const updated = await getDepartmentById(connection, req.params.id);
    const counts = await countDepartmentRelations(connection, req.params.id);

    res.json({
      success: true,
      department: mapDepartmentRow({
        ...updated,
        category_count: counts.categoryCount,
        course_count: counts.courseCount,
        class_count: counts.classCount,
        student_count: counts.studentCount,
        teacher_count: counts.teacherCount,
      }),
    });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

/**
 * 删除学院前的影响面（供界面展示具体数量）
 *
 * 汇总「本学院 → 课程 → 各相关表」的条数，让教师在确认前看到究竟会删掉什么。
 */
async function getDepartmentUsage(connection, departmentId) {
  const counts = await countDepartmentRelations(connection, departmentId);
  const courseScope = 'course_id IN (SELECT id FROM courses WHERE department_id = ?)';
  return {
    ...counts,
    scheduleCount: await safeCount(connection, `SELECT COUNT(*) AS total FROM schedules WHERE ${courseScope}`, [departmentId]),
    enrollmentCount: await safeCount(connection, `SELECT COUNT(*) AS total FROM enrollments WHERE ${courseScope}`, [departmentId]),
    evaluationCount: await safeCount(connection, `SELECT COUNT(*) AS total FROM evaluations WHERE ${courseScope}`, [departmentId]),
    detailedGradeCount: await safeCount(connection, `SELECT COUNT(*) AS total FROM detailed_grade WHERE ${courseScope}`, [departmentId]),
    examScoreCount: await safeCount(connection, `SELECT COUNT(*) AS total FROM exam_scores WHERE ${courseScope}`, [departmentId]),
  };
}

/**
 * 表不存在时忽略（老库可能缺表），其余错误照抛。
 */
async function safeDelete(connection, sql, params) {
  try {
    await connection.query(sql, params);
  } catch (e) {
    if (e?.code === 'ER_NO_SUCH_TABLE' || e?.code === 'ER_BAD_FIELD_ERROR') return;
    throw e;
  }
}

/** 安全计数：表或列不存在时返回 0，避免因老库缺表把整个影响面统计拖垮 */
async function safeCount(connection, sql, params) {
  try {
    const [[row]] = await connection.query(sql, params);
    return Number(row?.total || 0);
  } catch (e) {
    if (e?.code === 'ER_NO_SUCH_TABLE' || e?.code === 'ER_BAD_FIELD_ERROR') return 0;
    throw e;
  }
}

/**
 * 级联删除学院及其全部关联数据（**不可逆**）
 *
 * 删除顺序严格「子表 → 父表」，全程一个事务：任何一步失败整体回滚，
 * 不会留下删了一半的脏数据。
 *
 * ⚠️ 会连带删除：本学院下的课程及其排课/选课/评价/成绩/作业/任务/项目/
 * AI 分层结果，以及挂在本学院班级下的学生、班级、专业分类、教师。
 */
async function cascadeDeleteDepartment(connection, departmentId) {
  const [[{ courseCount }]] = await connection.query(
    'SELECT COUNT(*) AS courseCount FROM courses WHERE department_id = ?',
    [departmentId]
  );

  // 课程子表（依赖 project_id / task_id / questionnaire_id 的再包一层）
  const byCourse = [
    'course_eval_responses',   // 经 questionnaire_id 间接关联
    'course_eval_questionnaires',
    'course_project_files',
    'course_project_progress',
    'course_projects',
    'course_standards',
    'course_task_submission',
    'course_task',
    'quality_eval_submissions',
    'quality_evaluations',
    'evaluations',
    'eval_reminders',
    'eval_configs',
    'exam_scores',
    'detailed_grade',
    'grade_config',
    'student_tiers',
    'tier_test_results',
    'tier_test_questions',
    'teacher_submitted_evals',
    'student_groups',
    'course_classes',
    'enrollments',
    'schedules',
  ];

  await connection.beginTransaction();
  try {
    // 间接关联的表先删（其父 id 来自本学院的课程/项目/任务/问卷）
    await safeDelete(connection,
      `DELETE FROM course_eval_responses WHERE questionnaire_id IN (
         SELECT id FROM course_eval_questionnaires
         WHERE course_id IN (SELECT id FROM courses WHERE department_id = ?))`, [departmentId]);
    await safeDelete(connection,
      `DELETE FROM course_project_files WHERE project_id IN (
         SELECT id FROM course_projects
         WHERE course_id IN (SELECT id FROM courses WHERE department_id = ?))`, [departmentId]);
    await safeDelete(connection,
      `DELETE FROM course_project_progress WHERE project_id IN (
         SELECT id FROM course_projects
         WHERE course_id IN (SELECT id FROM courses WHERE department_id = ?))`, [departmentId]);
    await safeDelete(connection,
      `DELETE FROM course_task_submission WHERE task_id IN (
         SELECT id FROM course_task
         WHERE course_id IN (SELECT id FROM courses WHERE department_id = ?))`, [departmentId]);

    // 直接按 course_id 关联的表
    for (const table of byCourse) {
      if (['course_eval_responses', 'course_project_files', 'course_project_progress', 'course_task_submission'].includes(table)) continue;
      await safeDelete(connection,
        `DELETE FROM \`${table}\` WHERE course_id IN (SELECT id FROM courses WHERE department_id = ?)`,
        [departmentId]);
    }

    // 课程本体
    await safeDelete(connection, 'DELETE FROM courses WHERE department_id = ?', [departmentId]);

    // 本学院班级下的学生（与 countDepartmentRelations 的统计口径一致）
    await safeDelete(connection,
      `DELETE FROM students WHERE class_id IN (SELECT id FROM classes WHERE department_id = ?)`,
      [departmentId]);

    // 班级、专业分类、教师、学院本体
    await safeDelete(connection, 'DELETE FROM classes WHERE department_id = ?', [departmentId]);
    await safeDelete(connection, 'DELETE FROM categories WHERE department_id = ?', [departmentId]);
    await safeDelete(connection, 'DELETE FROM teachers WHERE department_id = ?', [departmentId]);
    await safeDelete(connection, 'DELETE FROM departments WHERE id = ?', [departmentId]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  return { courseCount: Number(courseCount || 0) };
}

/**
 * GET /departments/:id/usage — 删除前的影响面预览（不执行删除）
 *
 * 供前端在弹确认框时展示「会删掉什么」，避免用「试着删一下」来探测
 * （那样空学院会被直接删掉、没有二次确认）。
 */
router.get('/:id/usage', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const department = await getDepartmentById(connection, req.params.id);
    if (!department) throw httpError(404, '学院不存在', 'DEPARTMENT_NOT_FOUND');
    const usage = await getDepartmentUsage(connection, req.params.id);
    const total =
      usage.categoryCount + usage.courseCount + usage.classCount +
      usage.studentCount + usage.teacherCount;
    res.json({ success: true, usage, hasData: total > 0 });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const department = await getDepartmentById(connection, req.params.id);
    if (!department) {
      throw httpError(404, '学院不存在', 'DEPARTMENT_NOT_FOUND');
    }

    const counts = await countDepartmentRelations(connection, req.params.id);
    const total =
      counts.categoryCount +
      counts.courseCount +
      counts.classCount +
      counts.studentCount +
      counts.teacherCount;

    // 默认仍拒绝直接删除；显式传 force=true 才级联删除（前端会先弹二次确认）
    const force = String(req.query.force ?? '') === 'true' || req.body?.force === true;
    if (total > 0 && !force) {
      const usage = await getDepartmentUsage(connection, req.params.id);
      const err = httpError(
        409,
        '该学院下还有课程分类、课程、班级、学生或教师数据',
        'DEPARTMENT_HAS_DATA'
      );
      // 带上具体数量，前端据此列出「会删掉什么」
      err.details = usage;
      throw err;
    }

    const usage = total > 0 ? await getDepartmentUsage(connection, req.params.id) : null;
    await cascadeDeleteDepartment(connection, req.params.id);

    res.json({ success: true, message: '删除成功', deleted: usage });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

export default router;
