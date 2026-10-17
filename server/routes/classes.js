import { Router } from 'express';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  ensureDepartment,
  getClassById,
  getClassByNameAndDepartment,
  handleRouteError,
  httpError,
  mapClassRow,
  normalizeText,
} from '../lib/admin.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    const departmentId = normalizeText(req.query.departmentId);
    const departmentName = normalizeText(req.query.department);

    if (departmentId) {
      conditions.push('cls.department_id = ?');
      params.push(departmentId);
    }

    if (departmentName) {
      conditions.push('dept.name = ?');
      params.push(departmentName);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT
         cls.id,
         cls.name,
         cls.department_id,
         cls.created_at,
         dept.name AS department_name,
         (SELECT COUNT(*) FROM students WHERE class_id = cls.id) AS student_count
       FROM classes AS cls
       JOIN departments AS dept ON dept.id = cls.department_id
       ${whereClause}
       ORDER BY dept.name, cls.name`,
      params
    );

    res.json({
      success: true,
      classes: rows.map(mapClassRow),
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const name = normalizeText(req.body?.name);
    if (!name) {
      throw httpError(400, '班级名称不能为空', 'CLASS_NAME_REQUIRED');
    }

    const department = await ensureDepartment(connection, {
      departmentId: req.body?.departmentId,
      departmentName: req.body?.department,
      createIfMissing: false,
    });

    if (!department) {
      throw httpError(400, '班级必须关联学院', 'CLASS_DEPARTMENT_REQUIRED');
    }

    const duplicate = await getClassByNameAndDepartment(connection, name, department.id);
    if (duplicate) {
      throw httpError(409, '班级名称已存在', 'CLASS_EXISTS');
    }

    const [result] = await connection.query(
      'INSERT INTO classes (name, department_id) VALUES (?, ?)',
      [name, department.id]
    );
    const created = await getClassById(connection, result.insertId);

    res.status(201).json({
      success: true,
      class: mapClassRow({
        ...created,
        student_count: 0,
      }),
    });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const existing = await getClassById(connection, req.params.id);
    if (!existing) {
      throw httpError(404, '班级不存在', 'CLASS_NOT_FOUND');
    }

    const name = normalizeText(req.body?.name) || existing.name;
    const department = await ensureDepartment(connection, {
      departmentId: req.body?.departmentId || existing.department_id,
      departmentName: req.body?.department || existing.department_name,
      createIfMissing: false,
    });

    if (!department) {
      throw httpError(400, '班级必须关联学院', 'CLASS_DEPARTMENT_REQUIRED');
    }

    const duplicate = await getClassByNameAndDepartment(connection, name, department.id);
    if (duplicate && String(duplicate.id) !== String(req.params.id)) {
      throw httpError(409, '班级名称已存在', 'CLASS_EXISTS');
    }

    await connection.query(
      'UPDATE classes SET name = ?, department_id = ? WHERE id = ?',
      [name, department.id, req.params.id]
    );

    await connection.query(
      'UPDATE students SET class_name = ?, department = ? WHERE class_id = ?',
      [name, department.name, req.params.id]
    );

    const updated = await getClassById(connection, req.params.id);
    const [[countRow]] = await connection.query(
      'SELECT COUNT(*) AS total FROM students WHERE class_id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      class: mapClassRow({
        ...updated,
        student_count: countRow.total,
      }),
    });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const existing = await getClassById(connection, req.params.id);
    if (!existing) {
      throw httpError(404, '班级不存在', 'CLASS_NOT_FOUND');
    }

    const [[studentRow]] = await connection.query(
      'SELECT COUNT(*) AS total FROM students WHERE class_id = ?',
      [req.params.id]
    );

    if (Number(studentRow.total || 0) > 0) {
      throw httpError(409, '该班级下还有学生，不能直接删除', 'CLASS_HAS_STUDENTS');
    }

    await connection.query('DELETE FROM classes WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

export default router;
