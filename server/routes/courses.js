import { Router } from 'express';
import pool from '../db.js';
import { buildEnrollmentProgress } from '../lib/scheduleProgress.js';
import {
  createCourseId,
  ensureDepartment,
  ensureTeacher,
  getDepartmentById,
  handleRouteError,
  httpError,
  mapCourseRow,
  mapStudentRow,
  normalizeOptionalText,
  normalizeText,
} from '../lib/admin.js';

const router = Router();

async function getCategoryById(connection, categoryId) {
  const normalizedId = normalizeText(categoryId);
  if (!normalizedId) {
    return null;
  }

  const [rows] = await connection.query(
    `SELECT category.id, category.name, category.department_id, dept.name AS department_name
     FROM categories AS category
     LEFT JOIN departments AS dept ON dept.id = category.department_id
     WHERE category.id = ?
     LIMIT 1`,
    [normalizedId]
  );

  return rows[0] || null;
}

async function getCourseRowById(connection, courseId) {
  const [rows] = await connection.query(
    `SELECT
       course.id,
       course.title,
       course.description,
       course.category_id,
       course.category_name,
       course.cover,
       course.credits,
       course.duration,
       course.status,
       course.semester,
       course.teacher,
       course.mentor,
       course.department,
       course.department_id,
       course.created_at,
       (SELECT MIN(schedule.start_date) FROM schedules AS schedule WHERE schedule.course_id = course.id) AS course_start_date,
       (SELECT MAX(schedule.end_date) FROM schedules AS schedule WHERE schedule.course_id = course.id) AS course_end_date,
       category.name AS joined_category_name,
       dept.name AS department_name
     FROM courses AS course
     LEFT JOIN categories AS category ON category.id = CAST(course.category_id AS UNSIGNED)
     LEFT JOIN departments AS dept ON dept.id = course.department_id
     WHERE course.id = ?
     LIMIT 1`,
    [courseId]
  );

  return rows[0] || null;
}

async function resolveCourseDepartment(connection, body, existingCourse = null) {
  const category = await getCategoryById(connection, body.categoryId ?? existingCourse?.category_id);
  let department = await ensureDepartment(connection, {
    departmentId: body.departmentId ?? existingCourse?.department_id,
    departmentName: body.department ?? existingCourse?.department,
    createIfMissing: false,
  });

  if (!department && category?.department_id != null) {
    department = await getDepartmentById(connection, category.department_id);
  }

  if (!department) {
    throw httpError(400, '课程必须关联学院', 'COURSE_DEPARTMENT_REQUIRED');
  }

  if (category && category.department_id != null && String(category.department_id) !== String(department.id)) {
    throw httpError(400, '课程分类不属于当前学院', 'CATEGORY_DEPARTMENT_MISMATCH');
  }

  return { category, department };
}

router.get('/', async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    const departmentId = normalizeText(req.query.departmentId);
    const departmentName = normalizeText(req.query.department);
    const categoryId = normalizeText(req.query.categoryId);
    const teacherName = normalizeText(req.query.teacher);

    if (departmentId) {
      conditions.push('course.department_id = ?');
      params.push(departmentId);
    }

    if (departmentName) {
      conditions.push('dept.name = ?');
      params.push(departmentName);
    }

    if (categoryId) {
      conditions.push('course.category_id = ?');
      params.push(categoryId);
    }

    if (teacherName) {
      conditions.push('(course.teacher = ? OR course.mentor = ?)');
      params.push(teacherName, teacherName);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT
         course.id,
         course.title,
         course.description,
         course.category_id,
         course.category_name,
         course.cover,
         course.credits,
         course.duration,
         course.status,
         course.semester,
         course.teacher,
         course.mentor,
         course.department,
         course.department_id,
         course.created_at,
         (SELECT MIN(schedule.start_date) FROM schedules AS schedule WHERE schedule.course_id = course.id) AS course_start_date,
         (SELECT MAX(schedule.end_date) FROM schedules AS schedule WHERE schedule.course_id = course.id) AS course_end_date,
         category.name AS joined_category_name,
         dept.name AS department_name
       FROM courses AS course
       LEFT JOIN categories AS category ON category.id = CAST(course.category_id AS UNSIGNED)
       LEFT JOIN departments AS dept ON dept.id = course.department_id
       ${whereClause}
       ORDER BY course.status DESC, course.title`,
      params
    );

    res.json({
      success: true,
      courses: rows.map(mapCourseRow),
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const title = normalizeText(req.body?.title);
    if (!title) {
      throw httpError(400, '课程名称不能为空', 'COURSE_TITLE_REQUIRED');
    }

    const courseId = normalizeText(req.body?.id) || createCourseId();
    const existingCourse = await getCourseRowById(connection, courseId);
    if (existingCourse) {
      throw httpError(409, '课程编号已存在', 'COURSE_ID_EXISTS');
    }

    const { category, department } = await resolveCourseDepartment(connection, req.body);
    const description = normalizeOptionalText(req.body?.description);
    const teacher = normalizeOptionalText(req.body?.teacher);
    const mentor = normalizeOptionalText(req.body?.mentor);
    const cover = normalizeOptionalText(req.body?.cover);
    const credits = Number(req.body?.credits || 0);
    const duration = Number(req.body?.duration || 0);
    const status = normalizeText(req.body?.status) || 'active';
    const semester = normalizeOptionalText(req.body?.semester);

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO courses (
         id,
         title,
         description,
         category_id,
         category_name,
         cover,
         credits,
         duration,
         status,
         semester,
         teacher,
         mentor,
         department,
         department_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        title,
        description || null,
        category ? String(category.id) : null,
        category?.name || null,
        cover || null,
        Number.isFinite(credits) ? credits : 0,
        Number.isFinite(duration) ? duration : 0,
        status || 'active',
        semester || null,
        teacher,
        mentor || null,
        department.name,
        department.id,
      ]
    );

    if (teacher) {
      await ensureTeacher(connection, {
        teacherName: teacher,
        departmentId: department.id,
        departmentName: department.name,
        createIfMissing: true,
      });
    }

    await connection.commit();

    const created = await getCourseRowById(connection, courseId);
    res.status(201).json({
      success: true,
      course: mapCourseRow(created),
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // no-op
    }
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.get('/teacher/:name', async (req, res) => {
  try {
    const teacherName = normalizeText(req.params.name);
    const departmentName = normalizeText(req.query.department);
    const departmentId = normalizeText(req.query.departmentId);
    const conditions = ['(course.teacher = ? OR course.mentor = ?)'];
    const params = [teacherName, teacherName];

    if (departmentName) {
      conditions.push('dept.name = ?');
      params.push(departmentName);
    }

    if (departmentId) {
      conditions.push('course.department_id = ?');
      params.push(departmentId);
    }

    const [rows] = await pool.query(
      `SELECT
         course.id,
         course.title,
         course.description,
         course.category_id,
         course.category_name,
         course.cover,
         course.credits,
         course.duration,
         course.status,
         course.semester,
         course.teacher,
         course.mentor,
         course.department,
         course.department_id,
         course.created_at,
         (SELECT MIN(schedule.start_date) FROM schedules AS schedule WHERE schedule.course_id = course.id) AS course_start_date,
         (SELECT MAX(schedule.end_date) FROM schedules AS schedule WHERE schedule.course_id = course.id) AS course_end_date,
         category.name AS joined_category_name,
         dept.name AS department_name
       FROM courses AS course
       LEFT JOIN categories AS category ON category.id = CAST(course.category_id AS UNSIGNED)
       LEFT JOIN departments AS dept ON dept.id = course.department_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY course.status DESC, course.title`,
      params
    );

    res.json({
      success: true,
      courses: rows.map(mapCourseRow),
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

router.get('/department/:dept', async (req, res) => {
  try {
    const departmentName = normalizeText(req.params.dept);
    const [rows] = await pool.query(
      `SELECT
         course.id,
         course.title,
         course.description,
         course.category_id,
         course.category_name,
         course.cover,
         course.credits,
         course.duration,
         course.status,
         course.semester,
         course.teacher,
         course.mentor,
         course.department,
         course.department_id,
         course.created_at,
         (SELECT MIN(schedule.start_date) FROM schedules AS schedule WHERE schedule.course_id = course.id) AS course_start_date,
         (SELECT MAX(schedule.end_date) FROM schedules AS schedule WHERE schedule.course_id = course.id) AS course_end_date,
         category.name AS joined_category_name,
         dept.name AS department_name
       FROM courses AS course
       LEFT JOIN categories AS category ON category.id = CAST(course.category_id AS UNSIGNED)
       LEFT JOIN departments AS dept ON dept.id = course.department_id
       WHERE dept.name = ? OR course.department = ?
       ORDER BY course.status DESC, course.title`,
      [departmentName, departmentName]
    );

    res.json({
      success: true,
      courses: rows.map(mapCourseRow),
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

router.get('/:id/students', async (req, res) => {
  try {
    // 课程学员 = 教师在本课程内导入的选课记录（enrollments），这是唯一权威源。
    //
    // 此前这里还会「排课班级反推」：取 schedules.class_name 去匹配学生所在班级，
    // 再用 OR 拼进条件（不是 AND），于是名单实际是
    //   「已选课的」∪「班级名恰好匹配排课班级的」
    // 结果与选课记录不一致，还会诱发两个问题：
    //   1. 排课填了「计算机2101班」时，该班全部学生都进了名单，与其是否选课无关
    //   2. 该比较跨表比 collation（classes.name / students.class_name），
    //      线上实测触发 ER_CANT_AGGREGATE_2COLLATIONS，接口直接 500
    // 班级维度改由教师端「班级管理」维护，不再用于推导课程归属。
    const [rows] = await pool.query(
      `SELECT DISTINCT
         student.id,
         student.student_id,
         student.name,
         student.phone,
         student.email,
         student.class_id,
         COALESCE(cls.name, student.class_name) AS class_name,
         cls.department_id,
         COALESCE(dept.name, student.department) AS department_name,
         student.status,
         student.created_at,
         enrollment.class_name AS course_class_name
       FROM students AS student
       LEFT JOIN classes AS cls ON cls.id = student.class_id
       LEFT JOIN departments AS dept ON dept.id = cls.department_id
       INNER JOIN enrollments AS enrollment
         ON enrollment.student_id = student.id
        AND enrollment.course_id = ?
        AND enrollment.status <> 'dropped'
       ORDER BY class_name, student.name`,
      [req.params.id]
    );

    // 进度：与 /students/:id/courses 同一套口径（按排课时间实时推算）。
    // 教师端「学员进度」需要一次性看到整门课的进度，逐个学生调那个接口是 N+1，
    // 故在这里用共享模块就地算出来。
    const [scheduleRows] = await pool.query(
      'SELECT id, class_name, day, start_date, end_date, time_slot FROM schedules WHERE course_id = ?',
      [req.params.id]
    );
    const starts = scheduleRows.map((r) => r.start_date).filter(Boolean).sort();
    const ends = scheduleRows.map((r) => r.end_date).filter(Boolean).sort();
    const courseStart = starts[0] || null;
    const courseEnd = ends[ends.length - 1] || null;

    const students = rows.map((row) => {
      const mapped = mapStudentRow(row);
      // 本课程内班级优先（教师分班），否则用学籍班级
      const className = String(row.course_class_name || '').trim() || String(row.class_name || '').trim();
      // 全班级排课（class_name 为空）对该课所有学生生效，必须计入
      const timingRows = scheduleRows.filter((schedule) => {
        const rowClass = String(schedule.class_name || '').trim();
        return !rowClass || rowClass === className;
      });
      const progress = buildEnrollmentProgress(timingRows, courseStart, courseEnd);
      return { ...mapped, progress: progress.progress, progressStatus: progress.status };
    });

    res.json({ success: true, students });
  } catch (error) {
    handleRouteError(res, error);
  }
});

router.get('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const course = await getCourseRowById(connection, req.params.id);
    if (!course) {
      throw httpError(404, '课程不存在', 'COURSE_NOT_FOUND');
    }

    res.json({
      success: true,
      course: mapCourseRow(course),
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
    const existingCourse = await getCourseRowById(connection, req.params.id);
    if (!existingCourse) {
      throw httpError(404, '课程不存在', 'COURSE_NOT_FOUND');
    }

    const title = normalizeText(req.body?.title) || existingCourse.title;
    const description = normalizeOptionalText(req.body?.description ?? existingCourse.description);
    const teacher = normalizeOptionalText(req.body?.teacher ?? existingCourse.teacher);
    const mentor = normalizeOptionalText(req.body?.mentor ?? existingCourse.mentor);
    const cover = normalizeOptionalText(req.body?.cover ?? existingCourse.cover);
    const credits = Number(req.body?.credits ?? existingCourse.credits ?? 0);
    const duration = Number(req.body?.duration ?? existingCourse.duration ?? 0);
    const status = normalizeText(req.body?.status) || existingCourse.status || 'active';
    const semester = normalizeOptionalText(req.body?.semester ?? existingCourse.semester);

    const { category, department } = await resolveCourseDepartment(connection, req.body, existingCourse);

    await connection.beginTransaction();

    await connection.query(
      `UPDATE courses
       SET title = ?,
           description = ?,
           category_id = ?,
           category_name = ?,
           cover = ?,
           credits = ?,
           duration = ?,
           status = ?,
           semester = ?,
           teacher = ?,
           mentor = ?,
           department = ?,
           department_id = ?
       WHERE id = ?`,
      [
        title,
        description || null,
        category ? String(category.id) : null,
        category?.name || null,
        cover || null,
        Number.isFinite(credits) ? credits : 0,
        Number.isFinite(duration) ? duration : 0,
        status,
        semester || null,
        teacher,
        mentor || null,
        department.name,
        department.id,
        req.params.id,
      ]
    );

    if (teacher) {
      await ensureTeacher(connection, {
        teacherName: teacher,
        departmentId: department.id,
        departmentName: department.name,
        createIfMissing: true,
      });
    }

    await connection.commit();

    const updated = await getCourseRowById(connection, req.params.id);
    res.json({
      success: true,
      course: mapCourseRow(updated),
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // no-op
    }
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const existingCourse = await getCourseRowById(connection, req.params.id);
    if (!existingCourse) {
      throw httpError(404, '课程不存在', 'COURSE_NOT_FOUND');
    }

    await connection.query('DELETE FROM schedules WHERE course_id = ?', [req.params.id]);
    await connection.query('DELETE FROM courses WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

export default router;
