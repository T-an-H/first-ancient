/**
 * 评价/成绩种子数据（幂等，可重复执行）
 *
 * 解决的问题：线上库有 81 学生但只有 1 门课、3 条评价，导致
 *   ① 学生端「我的课程」读不到课程（排课 class_name 为空）
 *   ② 平时成绩（综合评价）没有后端权威源（无 grade_config / detailed_grade）
 *   ③ 职业方向推荐没有足够的课程/成绩可对照
 *
 * 本脚本补齐：
 *   1. 若干门课程（标题对齐 src/data/courseCareerMap.ts，便于职业推荐命中）
 *   2. 每门课的排课（**填 class_name**，恢复学生端课程可见）
 *   3. 选课 enrollments（教师端名单）
 *   4. 多轮 evaluations（self/intra_group/inter_group/teacher）
 *   5. 部分课的期中/期末 exam_scores（验证「有期中期末则替换」分支）
 *   6. 每门课 grade_config
 *   7. 由 evaluations 聚合回填 detailed_grade
 *
 * 幂等策略：
 *   - 课程按 title 查重（已存在则复用其 id，不新建）
 *   - 排课按 (course_id, class_name, day, time_slot) 查重
 *   - 选课按 (student_id, course_id) 查重
 *   - 评价用固定 id（`seed-ev-...`）REPLACE，重跑覆盖自己但不碰真实评价
 *   - exam_scores 用固定 id REPLACE
 *
 * 运行：cd server && node scripts/seed-eval-data.mjs
 *   （DB_NAME 可指向目标库；默认走 server/db.js 的 course_platform）
 */
import '../load-env.js';
import pool from '../db.js';
import { syncDetailedGradesFromEvaluations } from '../lib/detailedGrades.js';

/** 目标班级：学生端按 schedules.class_name 匹配，统一用它 */
const TARGET_CLASS = '计算机2101班';
const TARGET_DEPARTMENT = '计算机学院';
/** 演示教师（已存在于线上 teachers 表） */
const TEACHER = '钱老师';
const SEMESTER = '2026秋季学期';
const START = '2026-09-08';
const END = '2026-12-31';

/**
 * 课程定义（title 尽量对齐 courseCareerMap.ts，保证职业推荐命中有意义）。
 * assessment: 'regular' 只出平时成绩；'midterm'/'final' 额外出期中/期末。
 */
const COURSES = [
  { title: 'React 前端开发实战', categoryName: '软件工程', credits: 4, assessment: 'regular' },
  { title: 'Python 数据分析入门', categoryName: '大数据技术', credits: 4, assessment: 'regular' },
  { title: '机器学习基础', categoryName: '机器学习', credits: 5, assessment: 'final' },
  { title: 'SQL 数据库设计', categoryName: '数据库系统', credits: 3, assessment: 'regular' },
  { title: 'Vue 3 组合式 API', categoryName: '软件工程', credits: 4, assessment: 'midterm' },
  { title: '微服务架构设计', categoryName: '软件工程', credits: 4, assessment: 'final' },
  { title: '数据可视化与商业分析', categoryName: '大数据技术', credits: 3, assessment: 'regular' },
  { title: 'AI 生成式应用开发', categoryName: 'AI智能', credits: 4, assessment: 'regular' },
];

/** 评价模板对应的开启类型（demand §5.1.1 project 模板） */
const EVAL_TYPES = ['self', 'intra_group', 'inter_group', 'teacher'];

function stableHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** 确定性分数：同一 (key, session, type) 每次运行结果一致，便于幂等复跑 */
function scoreFor(key, session, type) {
  const base = 58 + (stableHash(`${key}|${session}|${type}`) % 38); // 58~95
  return Math.min(98, Math.max(40, base));
}

async function main() {
  const connection = await pool.getConnection();
  const summary = { courses: 0, schedules: 0, enrollments: 0, evaluations: 0, examScores: 0, gradeConfigs: 0, detailedGrades: 0 };
  try {
    // ---- 解析目标班级与学生 ----
    const [classRows] = await connection.query(
      'SELECT id, name, department_id FROM classes WHERE name = ? LIMIT 1',
      [TARGET_CLASS]
    );
    if (classRows.length === 0) throw new Error(`班级不存在: ${TARGET_CLASS}（请先建班）`);
    const classId = classRows[0].id;

    const [studentRows] = await connection.query(
      `SELECT student.id, student.name
       FROM students AS student
       WHERE student.class_id = ? OR TRIM(COALESCE(student.class_name,'')) = ?
       ORDER BY student.id`,
      [classId, TARGET_CLASS]
    );
    if (studentRows.length === 0) throw new Error(`班级 ${TARGET_CLASS} 下没有学生`);
    const students = studentRows.map((r) => ({ id: String(r.id), name: String(r.name) }));
    console.log(`目标班级 ${TARGET_CLASS}: ${students.length} 名学生`);

    // 分组（组内互评需要）：两两一组
    const groups = [];
    for (let i = 0; i < students.length; i += 2) {
      groups.push(students.slice(i, i + 2).map((s) => s.id));
    }

    await connection.beginTransaction();

    for (const def of COURSES) {
      // ---- 1. 课程（按 title 查重） ----
      const [catRows] = await connection.query(
        'SELECT id, name, department_id FROM categories WHERE name = ? LIMIT 1',
        [def.categoryName]
      );
      const category = catRows[0] || null;

      const [existing] = await connection.query('SELECT id FROM courses WHERE title = ? LIMIT 1', [def.title]);
      let courseId;
      if (existing.length > 0) {
        courseId = String(existing[0].id);
      } else {
        courseId = `course-seed-${stableHash(def.title)}`;
        await connection.query(
          `INSERT INTO courses
             (id, title, description, category_id, category_name, cover, credits, duration,
              status, semester, teacher, mentor, department, department_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE title = VALUES(title)`,
          [
            courseId, def.title, `${def.title}（种子课程）`, category ? String(category.id) : null,
            def.categoryName, '', def.credits, def.credits * 8, 'active', SEMESTER, TEACHER, '',
            TARGET_DEPARTMENT, category?.department_id ?? null,
          ]
        );
        summary.courses += 1;
      }

      // ---- 2. 排课（关键：class_name 必填） ----
      const slots = [
        { day: '周一', timeSlot: '08:00-10:00', room: 'A101' },
        { day: '周三', timeSlot: '10:15-12:15', room: 'A102' },
      ];
      for (const slot of slots) {
        const [dup] = await connection.query(
          `SELECT id FROM schedules
           WHERE course_id = ? AND TRIM(COALESCE(class_name,'')) = ?
             AND TRIM(COALESCE(day,'')) = ? AND TRIM(COALESCE(time_slot,'')) = ?
           LIMIT 1`,
          [courseId, TARGET_CLASS, slot.day, slot.timeSlot]
        );
        if (dup.length > 0) continue;
        await connection.query(
          `INSERT INTO schedules
             (course_id, title, teacher, mentor, semester, room, class_name, day, start_date, end_date, time_slot)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [courseId, def.title, TEACHER, '', SEMESTER, slot.room, TARGET_CLASS, slot.day, START, END, slot.timeSlot]
        );
        summary.schedules += 1;
      }

      // ---- 3. 选课 ----
      for (const stu of students) {
        const enrollId = `enr-seed-${courseId}-${stu.id}`;
        await connection.query(
          `INSERT INTO enrollments (id, student_id, course_id, schedule_id, enroll_date, progress, status)
           VALUES (?, ?, ?, '', ?, 45, 'enrolled')
           ON DUPLICATE KEY UPDATE status = VALUES(status)`,
          [enrollId, stu.id, courseId, START]
        );
        summary.enrollments += 1;
      }

      // ---- 4. 多轮评价 ----
      const ROUNDS = def.assessment === 'regular' ? 2 : 3;
      for (let session = 1; session <= ROUNDS; session++) {
        for (const stu of students) {
          // 组内互评：同组其他成员给该生打分
          const group = groups.find((g) => g.includes(stu.id)) || [stu.id];
          const intraEvaluators = group.filter((id) => id !== stu.id);
          // 组间互评：非本组成员给该生打分（取前 2 名作评价人）
          const interEvaluators = students
            .filter((s) => !group.includes(s.id))
            .slice(0, 2)
            .map((s) => s.id);

          const evals = [
            { type: 'self', evaluatorId: stu.id, evaluatorName: stu.name },
            { type: 'teacher', evaluatorId: 'seed-teacher', evaluatorName: TEACHER },
            ...intraEvaluators.map((id) => ({ type: 'intra_group', evaluatorId: id, evaluatorName: students.find((s) => s.id === id)?.name || id })),
            ...interEvaluators.map((id) => ({ type: 'inter_group', evaluatorId: id, evaluatorName: students.find((s) => s.id === id)?.name || id })),
          ];

          for (const ev of evals) {
            const id = `seed-ev-${courseId}-${stu.id}-s${session}-${ev.type}-${ev.evaluatorId}`;
            const score = scoreFor(`${courseId}|${stu.id}|${ev.evaluatorId}`, session, ev.type);
            await connection.query(
              `REPLACE INTO evaluations
                 (id, course_id, student_id, session_number, type, score, items, evaluator_id, evaluator_name, comment, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id, courseId, stu.id, session, ev.type, score,
                JSON.stringify([{ label: '综合表现', max: 100, score }]),
                ev.evaluatorId, ev.evaluatorName, '', `${START}`,
              ]
            );
            summary.evaluations += 1;
          }
        }
      }

      // ---- 5. 期中/期末（仅部分课程，验证「有期中期末则替换」分支） ----
      const needsMidterm = def.assessment === 'midterm' || def.assessment === 'final';
      const needsFinal = def.assessment === 'final';
      for (const stu of students) {
        if (needsMidterm) {
          const id = `seed-exam-${courseId}-${stu.id}-midterm`;
          await connection.query(
            `REPLACE INTO exam_scores (id, course_id, student_id, exam_name, score, full_score, weight, type, status, graded_at)
             VALUES (?, ?, ?, '期中考试', ?, 100, 50, 'midterm_exam', 'submitted', ?)`,
            [id, courseId, stu.id, scoreFor(`${courseId}|${stu.id}`, 99, 'midterm'), START]
          );
          summary.examScores += 1;
        }
        if (needsFinal) {
          const id = `seed-exam-${courseId}-${stu.id}-final`;
          await connection.query(
            `REPLACE INTO exam_scores (id, course_id, student_id, exam_name, score, full_score, weight, type, status, graded_at)
             VALUES (?, ?, ?, '期末考试', ?, 100, 50, 'final_exam', 'submitted', ?)`,
            [id, courseId, stu.id, scoreFor(`${courseId}|${stu.id}`, 100, 'final'), END]
          );
          summary.examScores += 1;
        }
      }

      // ---- 6. grade_config（默认权重；已存在则不覆盖） ----
      const [cfgDup] = await connection.query('SELECT course_id FROM grade_config WHERE course_id = ? LIMIT 1', [courseId]);
      if (cfgDup.length === 0) {
        await connection.query('INSERT INTO grade_config (course_id) VALUES (?)', [courseId]);
        summary.gradeConfigs += 1;
      }

      // ---- 6b. eval_configs（评价模板，与现有线上课程一致用 project） ----
      await connection.query(
        `INSERT INTO eval_configs (course_id, template, frequency, custom_sessions, has_mentor, overdue_rule)
         VALUES (?, 'project', 'biweekly', NULL, 0, 'average')
         ON DUPLICATE KEY UPDATE template = VALUES(template)`,
        [courseId]
      );

      // ---- 7. 聚合回填 detailed_grade ----
      const written = await syncDetailedGradesFromEvaluations(connection, courseId);
      summary.detailedGrades += written;
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  console.log('✅ 种子完成：');
  console.log(`   新增课程 ${summary.courses} 门 / 排课 ${summary.schedules} 条 / 选课 ${summary.enrollments} 条`);
  console.log(`   评价 ${summary.evaluations} 条 / 期中期末 ${summary.examScores} 条 / 权重配置 ${summary.gradeConfigs} 条`);
  console.log(`   回填 detailed_grade ${summary.detailedGrades} 条`);
  await pool.end();
}

main().catch((error) => {
  console.error('❌ 种子失败:', error);
  process.exit(1);
});
