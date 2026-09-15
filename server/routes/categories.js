import { Router } from 'express';
import pool from '../db.js';
import {
  createCourseId,
  ensureDepartment,
  ensureFallbackDepartment,
  ensureTeacher,
  getDepartmentById,
  getDepartmentByName,
  getOnlyDepartment,
  handleRouteError,
  httpError,
  listDepartments,
  mapCategoryRow,
  mapCourseRow,
  normalizeColor,
  normalizeText,
  pickColor,
} from '../lib/admin.js';

const router = Router();

async function getCategoryById(connection, categoryId) {
  const normalizedId = normalizeText(categoryId);
  if (!normalizedId) {
    return null;
  }

  const [rows] = await connection.query(
    `SELECT
       category.id,
       category.name,
       category.color,
       category.department_id,
       category.created_at,
       dept.name AS department_name
     FROM categories AS category
     LEFT JOIN departments AS dept ON dept.id = category.department_id
     WHERE category.id = ?
     LIMIT 1`,
    [normalizedId]
  );

  return rows[0] || null;
}

function deriveCategoryName(className) {
  const normalizedClassName = normalizeText(className);
  if (!normalizedClassName) {
    return '未分类';
  }

  const match = normalizedClassName.match(/^(.+?)(?:\d|班|级)/);
  const baseName = normalizeText(match?.[1] || normalizedClassName);
  if (!baseName) {
    return '未分类';
  }

  return baseName.endsWith('类') ? baseName : `${baseName}类`;
}

async function ensureCategory(connection, { departmentId, name }) {
  const normalizedName = normalizeText(name);
  const [rows] = await connection.query(
    `SELECT
       category.id,
       category.name,
       category.color,
       category.department_id,
       category.created_at,
       dept.name AS department_name
     FROM categories AS category
     LEFT JOIN departments AS dept ON dept.id = category.department_id
     WHERE category.department_id = ? AND category.name = ?
     LIMIT 1`,
    [departmentId, normalizedName]
  );

  if (rows.length > 0) {
    return rows[0];
  }

  const color = normalizeColor('', pickColor(normalizedName));
  const [result] = await connection.query(
    'INSERT INTO categories (name, color, department_id) VALUES (?, ?, ?)',
    [normalizedName, color, departmentId]
  );

  return getCategoryById(connection, result.insertId);
}

function createLegacyCategoryKey(departmentId, categoryName) {
  const normalizedDepartmentId =
    departmentId == null ? '' : String(departmentId).trim();
  const normalizedCategoryName = normalizeText(categoryName);

  if (!normalizedDepartmentId || !normalizedCategoryName) {
    return '';
  }

  return `${normalizedDepartmentId}::${normalizedCategoryName}`;
}

async function loadCategoryCourseStats(connection) {
  const [courseRows] = await connection.query(
    `SELECT category_id, category_name, department_id
     FROM courses`
  );

  const countByCategoryId = new Map();
  const legacyCountByCategoryKey = new Map();

  for (const row of courseRows) {
    const categoryId = normalizeText(row.category_id);
    if (categoryId) {
      countByCategoryId.set(categoryId, (countByCategoryId.get(categoryId) || 0) + 1);
      continue;
    }

    const legacyKey = createLegacyCategoryKey(row.department_id, row.category_name);
    if (!legacyKey) {
      continue;
    }

    legacyCountByCategoryKey.set(
      legacyKey,
      (legacyCountByCategoryKey.get(legacyKey) || 0) + 1
    );
  }

  return {
    countByCategoryId,
    legacyCountByCategoryKey,
  };
}

function getCategoryCourseCount(stats, category) {
  const categoryId = normalizeText(category?.id);
  const directCount = categoryId ? stats.countByCategoryId.get(categoryId) || 0 : 0;
  const legacyKey = createLegacyCategoryKey(category?.department_id, category?.name);
  const legacyCount = legacyKey ? stats.legacyCountByCategoryKey.get(legacyKey) || 0 : 0;

  return directCount + legacyCount;
}

router.get('/', async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    const departmentId = normalizeText(req.query.departmentId);
    const departmentName = normalizeText(req.query.department);

    if (departmentId) {
      conditions.push('category.department_id = ?');
      params.push(departmentId);
    }

    if (departmentName) {
      conditions.push('dept.name = ?');
      params.push(departmentName);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, courseStats] = await Promise.all([
      pool.query(
      `SELECT
         category.id,
         category.name,
         category.color,
         category.department_id,
         category.created_at,
         dept.name AS department_name
       FROM categories AS category
       LEFT JOIN departments AS dept ON dept.id = category.department_id
       ${whereClause}
       ORDER BY dept.name, category.name`,
      params
      ),
      loadCategoryCourseStats(pool),
    ]);

    res.json({
      success: true,
      categories: rows[0].map((row) =>
        mapCategoryRow({
          ...row,
          course_count: getCategoryCourseCount(courseStats, row),
        })
      ),
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
      throw httpError(400, '课程分类名称不能为空', 'CATEGORY_NAME_REQUIRED');
    }

    const department = await ensureDepartment(connection, {
      departmentId: req.body?.departmentId,
      departmentName: req.body?.department,
      createIfMissing: false,
    });

    if (!department) {
      throw httpError(400, '课程分类必须关联学院', 'CATEGORY_DEPARTMENT_REQUIRED');
    }

    const [duplicateRows] = await connection.query(
      'SELECT id FROM categories WHERE department_id = ? AND name = ? LIMIT 1',
      [department.id, name]
    );
    if (duplicateRows.length > 0) {
      throw httpError(409, '该学院下已存在同名课程分类', 'CATEGORY_EXISTS');
    }

    const color = normalizeColor(req.body?.color, pickColor(name));
    const [result] = await connection.query(
      'INSERT INTO categories (name, color, department_id) VALUES (?, ?, ?)',
      [name, color, department.id]
    );
    const category = await getCategoryById(connection, result.insertId);

    res.status(201).json({
      success: true,
      category: mapCategoryRow({
        ...category,
        course_count: 0,
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
    const category = await getCategoryById(connection, req.params.id);
    if (!category) {
      throw httpError(404, '课程分类不存在', 'CATEGORY_NOT_FOUND');
    }

    const name = normalizeText(req.body?.name) || category.name;
    const color = normalizeColor(req.body?.color, category.color || pickColor(name));
    const department = await ensureDepartment(connection, {
      departmentId: req.body?.departmentId || category.department_id,
      departmentName: req.body?.department || category.department_name,
      createIfMissing: false,
    });

    if (!department) {
      throw httpError(400, '课程分类必须关联学院', 'CATEGORY_DEPARTMENT_REQUIRED');
    }

    const [duplicateRows] = await connection.query(
      'SELECT id FROM categories WHERE department_id = ? AND name = ? AND id <> ? LIMIT 1',
      [department.id, name, req.params.id]
    );
    if (duplicateRows.length > 0) {
      throw httpError(409, '该学院下已存在同名课程分类', 'CATEGORY_EXISTS');
    }

    await connection.query(
      'UPDATE categories SET name = ?, color = ?, department_id = ? WHERE id = ?',
      [name, color, department.id, req.params.id]
    );

    await connection.query(
      `UPDATE courses
       SET category_id = ?, category_name = ?, department_id = ?, department = ?
       WHERE category_id = ?
          OR (category_id IS NULL AND category_name = ? AND department_id = ?)`,
      [
        String(req.params.id),
        name,
        department.id,
        department.name,
        req.params.id,
        category.name,
        category.department_id,
      ]
    );

    const updated = await getCategoryById(connection, req.params.id);
    const courseStats = await loadCategoryCourseStats(connection);

    res.json({
      success: true,
      category: mapCategoryRow({
        ...updated,
        course_count: getCategoryCourseCount(courseStats, updated),
      }),
    });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const category = await getCategoryById(connection, req.params.id);
    if (!category) {
      throw httpError(404, '课程分类不存在', 'CATEGORY_NOT_FOUND');
    }

    const courseStats = await loadCategoryCourseStats(connection);
    const courseCount = getCategoryCourseCount(courseStats, category);

    if (courseCount > 0) {
      throw httpError(409, '该课程分类下还有课程，不能直接删除', 'CATEGORY_HAS_COURSES');
    }

    await connection.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.get('/courses', async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    const departmentId = normalizeText(req.query.departmentId);
    const departmentName = normalizeText(req.query.department);

    if (departmentId) {
      conditions.push('course.department_id = ?');
      params.push(departmentId);
    }

    if (departmentName) {
      conditions.push('dept.name = ?');
      params.push(departmentName);
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
         category.name AS joined_category_name,
         dept.name AS department_name
       FROM courses AS course
       LEFT JOIN categories AS category ON category.id = CAST(course.category_id AS UNSIGNED)
       LEFT JOIN departments AS dept ON dept.id = course.department_id
       ${whereClause}
       ORDER BY dept.name, course.title`,
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

router.post('/sync', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [scheduleRows] = await connection.query(
      `SELECT DISTINCT
         schedule.course_id,
         schedule.title,
         schedule.teacher,
         schedule.class_name,
         course.department_id,
         course.department,
         course.category_name AS course_category_name,
         class_table.department_id AS class_department_id
       FROM schedules AS schedule
       LEFT JOIN courses AS course ON course.id = schedule.course_id
       LEFT JOIN classes AS class_table ON class_table.name = schedule.class_name
       WHERE schedule.title IS NOT NULL AND TRIM(schedule.title) <> ''`
    );

    const departments = await listDepartments(connection);
    const singleDepartment = departments.length === 1 ? departments[0] : null;
    let fallbackDepartment = null;
    let createdCategories = 0;
    let createdCourses = 0;
    let updatedCourses = 0;

    async function resolveDepartment(row) {
      if (row.department_id != null) {
        return getDepartmentById(connection, row.department_id);
      }

      if (row.class_department_id != null) {
        return getDepartmentById(connection, row.class_department_id);
      }

      if (normalizeText(row.department)) {
        return getDepartmentByName(connection, row.department);
      }

      if (singleDepartment) {
        return singleDepartment;
      }

      fallbackDepartment ||= await ensureFallbackDepartment(connection);
      return fallbackDepartment;
    }

    for (const row of scheduleRows) {
      const department = await resolveDepartment(row);
      if (!department) {
        continue;
      }

      // ⚠️ 全班级排课（class_name 为空）反推不出班级，若直接交给 deriveCategoryName
      // 会得到「未分类」，为每门只挂全班级排课的课凭空造一个「未分类」分类。
      // 此时改用课程自身已有的 category_name，取不到才落「未分类」。
      const categoryName = normalizeText(row.class_name)
        ? deriveCategoryName(row.class_name)
        : (normalizeText(row.course_category_name) || '未分类');
      const [existingCategoryRows] = await connection.query(
        'SELECT id FROM categories WHERE department_id = ? AND name = ? LIMIT 1',
        [department.id, categoryName]
      );

      let categoryId;
      if (existingCategoryRows.length > 0) {
        categoryId = existingCategoryRows[0].id;
      } else {
        const category = await ensureCategory(connection, {
          departmentId: department.id,
          name: categoryName,
        });
        categoryId = category.id;
        createdCategories += 1;
      }

      const courseId = normalizeText(row.course_id) || createCourseId();
      const title = normalizeText(row.title);
      const teacher = normalizeText(row.teacher);

      const [existingCourseRows] = await connection.query(
        'SELECT id FROM courses WHERE id = ? OR title = ? LIMIT 1',
        [courseId, title]
      );

      if (existingCourseRows.length > 0) {
        await connection.query(
          `UPDATE courses
           SET title = ?,
               teacher = ?,
               category_id = ?,
               category_name = ?,
               department_id = ?,
               department = ?,
               status = COALESCE(status, 'active')
           WHERE id = ?`,
          [title, teacher, String(categoryId), categoryName, department.id, department.name, existingCourseRows[0].id]
        );
        updatedCourses += 1;
      } else {
        await connection.query(
          `INSERT INTO courses (
             id,
             title,
             teacher,
             category_id,
             category_name,
             department_id,
             department,
             status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
          [courseId, title, teacher, String(categoryId), categoryName, department.id, department.name]
        );
        createdCourses += 1;
      }

      if (teacher) {
        await ensureTeacher(connection, {
          teacherName: teacher,
          departmentId: department.id,
          departmentName: department.name,
          createIfMissing: true,
        });
      }
    }

    res.json({
      success: true,
      message: `同步完成：新增 ${createdCategories} 个课程分类，新增 ${createdCourses} 门课程，更新 ${updatedCourses} 门课程`,
      createdCategories,
      createdCourses,
      updatedCourses,
    });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

export default router;
