import { Router } from 'express';
import pool from '../db.js';
import {
  attachTeacherStats,
  ensureDepartment,
  getTeacherById,
  handleRouteError,
  httpError,
  mapTeacherRow,
  normalizeOptionalText,
  normalizeText,
} from '../lib/admin.js';

const router = Router();

function buildTeacherListQuery(whereClause = '') {
  return `SELECT
    teacher.id,
    teacher.name,
    COALESCE(teacher.phone, usr.account) AS phone,
    teacher.email,
    teacher.department_id,
    COALESCE(dept.name, usr.department) AS department_name,
    teacher.created_at
  FROM teachers AS teacher
  LEFT JOIN departments AS dept ON dept.id = teacher.department_id
  LEFT JOIN users AS usr ON usr.ref_id = CAST(teacher.id AS CHAR) AND usr.ref_type = 'teacher'
  ${whereClause}
  ORDER BY dept.name, teacher.name`;
}

router.get('/', async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    const departmentId = normalizeText(req.query.departmentId);
    const departmentName = normalizeText(req.query.department);
    const search = normalizeText(req.query.search || req.query.keyword || req.query.q);

    if (departmentId) {
      conditions.push('teacher.department_id = ?');
      params.push(departmentId);
    }

    if (departmentName) {
      conditions.push('dept.name = ?');
      params.push(departmentName);
    }

    if (search) {
      const keyword = `%${search}%`;
      conditions.push(
        '(teacher.name LIKE ? OR teacher.phone LIKE ? OR teacher.email LIKE ? OR COALESCE(dept.name, \'\') LIKE ?)'
      );
      params.push(keyword, keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(buildTeacherListQuery(whereClause), params);
    const teachers = await attachTeacherStats(pool, rows);

    res.json({
      success: true,
      teachers: teachers.map(mapTeacherRow),
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

router.get('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const teacher = await getTeacherById(connection, req.params.id);
    if (!teacher) {
      throw httpError(404, '教师不存在', 'TEACHER_NOT_FOUND');
    }

    res.json({
      success: true,
      teacher: mapTeacherRow(teacher),
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
    const existing = await getTeacherById(connection, req.params.id);
    if (!existing) {
      throw httpError(404, '教师不存在', 'TEACHER_NOT_FOUND');
    }

    const name = normalizeText(req.body?.name) || existing.name;
    const phone = normalizeOptionalText(req.body?.phone ?? existing.phone);
    const email = normalizeOptionalText(req.body?.email ?? existing.email);
    const department = await ensureDepartment(connection, {
      departmentId: req.body?.departmentId || existing.department_id,
      departmentName: req.body?.department || existing.department_name,
      createIfMissing: false,
    });

    if (!department) {
      throw httpError(400, '教师必须关联学院', 'TEACHER_DEPARTMENT_REQUIRED');
    }

    const [duplicateRows] = await connection.query(
      'SELECT id FROM teachers WHERE name = ? AND id <> ? LIMIT 1',
      [name, req.params.id]
    );
    if (duplicateRows.length > 0) {
      throw httpError(409, '教师姓名已存在', 'TEACHER_EXISTS');
    }

    await connection.beginTransaction();

    await connection.query(
      `UPDATE teachers
       SET name = ?, phone = ?, email = ?, department_id = ?
       WHERE id = ?`,
      [name, phone || null, email || null, department.id, req.params.id]
    );

    if (name !== existing.name) {
      await connection.query(
        'UPDATE courses SET teacher = ? WHERE TRIM(teacher) = ?',
        [name, existing.name]
      );
      await connection.query(
        'UPDATE schedules SET teacher = ? WHERE TRIM(teacher) = ?',
        [name, existing.name]
      );
    }

    await connection.commit();

    const updated = await getTeacherById(connection, req.params.id);
    res.json({
      success: true,
      teacher: mapTeacherRow(updated),
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
    const existing = await getTeacherById(connection, req.params.id);
    if (!existing) {
      throw httpError(404, '教师不存在', 'TEACHER_NOT_FOUND');
    }

    const [[courseRow]] = await connection.query(
      'SELECT COUNT(*) AS total FROM courses WHERE TRIM(teacher) = ?',
      [existing.name]
    );
    const [[scheduleRow]] = await connection.query(
      'SELECT COUNT(*) AS total FROM schedules WHERE TRIM(teacher) = ?',
      [existing.name]
    );

    const courseCount = Number(courseRow.total || 0);
    const scheduleCount = Number(scheduleRow.total || 0);
    if (courseCount > 0 || scheduleCount > 0) {
      throw httpError(
        409,
        '该教师仍有关联课程或排课数据，不能直接删除',
        'TEACHER_HAS_DATA'
      );
    }

    await connection.query('DELETE FROM teachers WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

export default router;
