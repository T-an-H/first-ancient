import { Router } from 'express';
import pool from '../db.js';
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
         teacher,
         mentor,
         department,
         department_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    const [scheduleRows] = await pool.query(
      `SELECT DISTINCT class_name
       FROM schedules
       WHERE course_id = ?
         AND class_name IS NOT NULL
         AND TRIM(class_name) <> ''`,
      [req.params.id]
    );

    const classNames = scheduleRows
      .map((row) => normalizeText(row.class_name))
      .filter(Boolean);

    const conditions = ['enrollment.id IS NOT NULL'];
    const params = [req.params.id];

    if (classNames.length > 0) {
      const placeholders = classNames.map(() => '?').join(', ');
      conditions.push(`TRIM(COALESCE(cls.name, student.class_name, '')) IN (${placeholders})`);
      params.push(...classNames);
    }

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
         student.created_at
       FROM students AS student
       LEFT JOIN classes AS cls ON cls.id = student.class_id
       LEFT JOIN departments AS dept ON dept.id = cls.department_id
       LEFT JOIN enrollments AS enrollment
         ON enrollment.student_id = student.id
        AND enrollment.course_id = ?
        AND enrollment.status <> 'dropped'
       WHERE ${conditions.map((condition) => `(${condition})`).join(' OR ')}
       ORDER BY class_name, student.name`,
      params
    );

    res.json({
      success: true,
      students: rows.map(mapStudentRow),
    });
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
