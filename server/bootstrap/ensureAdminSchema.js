import pool from '../db.js';
import {
  DEFAULT_ORPHAN_DEPARTMENT_NAME,
  ensureFallbackDepartment,
  listDepartments,
  normalizeText,
  pickColor,
} from '../lib/admin.js';

const TEXT_COLLATION = 'utf8mb4_unicode_ci';

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return Number(rows[0]?.total || 0) > 0;
}

async function indexExists(connection, tableName, indexName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName]
  );

  return Number(rows[0]?.total || 0) > 0;
}

async function ensureColumn(connection, tableName, columnName, definition) {
  if (await columnExists(connection, tableName, columnName)) {
    return;
  }

  await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
}

async function ensureIndex(connection, tableName, indexName, statement) {
  if (await indexExists(connection, tableName, indexName)) {
    return;
  }

  await connection.query(statement);
}

async function ensureEvaluationItemsColumn(connection) {
  const [tables] = await connection.query("SHOW TABLES LIKE 'evaluations'");
  if (tables.length === 0) {
    return;
  }

  await ensureColumn(
    connection,
    'evaluations',
    'items',
    'items LONGTEXT NULL AFTER score'
  );
}

async function dropIndexIfExists(connection, tableName, indexName) {
  if (!(await indexExists(connection, tableName, indexName))) {
    return;
  }

  await connection.query(`ALTER TABLE ${tableName} DROP INDEX ${indexName}`);
}

async function ensureTables(connection) {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS departments (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(20) DEFAULT '#3b82f6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_departments_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await connection.query(
    `CREATE TABLE IF NOT EXISTS classes (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      department_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_classes_department_name (department_id, name),
      KEY idx_classes_department (department_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await connection.query(
    `CREATE TABLE IF NOT EXISTS teachers (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(50) NULL,
      email VARCHAR(255) NULL,
      department_id INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_teachers_name (name),
      KEY idx_teachers_department (department_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await connection.query(
    `CREATE TABLE IF NOT EXISTS quality_evaluations (
      id VARCHAR(191) NOT NULL,
      course_id VARCHAR(191) NOT NULL,
      student_id VARCHAR(191) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_quality_evaluations_course_student (course_id, student_id),
      KEY idx_quality_evaluations_course (course_id),
      KEY idx_quality_evaluations_student (student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await connection.query(
    `CREATE TABLE IF NOT EXISTS student_groups (
      id VARCHAR(191) NOT NULL,
      course_id VARCHAR(191) NOT NULL,
      name VARCHAR(200) NOT NULL,
      member_ids LONGTEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_student_groups_course (course_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await connection.query(
    `CREATE TABLE IF NOT EXISTS quality_eval_submissions (
      id VARCHAR(191) NOT NULL,
      evaluation_id VARCHAR(191) NOT NULL,
      course_id VARCHAR(191) NOT NULL,
      student_id VARCHAR(191) NOT NULL,
      description TEXT NULL,
      files LONGTEXT NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      score DECIMAL(5,2) NULL,
      teacher_comment TEXT NULL,
      graded_at DATETIME NULL,
      PRIMARY KEY (id),
      KEY idx_quality_submissions_evaluation (evaluation_id),
      KEY idx_quality_submissions_course_student (course_id, student_id),
      KEY idx_quality_submissions_score (course_id, score)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

async function ensureColumnsAndIndexes(connection) {
  await ensureColumn(connection, 'categories', 'department_id', 'department_id INT NULL AFTER color');
  await ensureColumn(connection, 'courses', 'department_id', 'department_id INT NULL AFTER department');
  await ensureColumn(connection, 'students', 'class_id', 'class_id INT NULL AFTER department');
  await ensureColumn(connection, 'schedules', 'day', 'day VARCHAR(20) NULL AFTER class_name');
  await ensureColumn(connection, 'schedules', 'mentor', 'mentor VARCHAR(100) NULL AFTER teacher');
  await ensureColumn(connection, 'teachers', 'phone', 'phone VARCHAR(50) NULL AFTER name');
  await ensureColumn(connection, 'teachers', 'email', 'email VARCHAR(255) NULL AFTER phone');
  await ensureColumn(connection, 'teachers', 'department_id', 'department_id INT NULL AFTER email');
  await ensureColumn(connection, 'teachers', 'created_at', 'created_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER department_id');

  await dropIndexIfExists(connection, 'categories', 'name');
  await ensureIndex(
    connection,
    'categories',
    'uniq_categories_department_name',
    'CREATE UNIQUE INDEX uniq_categories_department_name ON categories (department_id, name)'
  );
  await ensureIndex(
    connection,
    'categories',
    'idx_categories_department',
    'CREATE INDEX idx_categories_department ON categories (department_id)'
  );
  await ensureIndex(
    connection,
    'courses',
    'idx_courses_department_id',
    'CREATE INDEX idx_courses_department_id ON courses (department_id)'
  );
  await ensureIndex(
    connection,
    'students',
    'idx_students_class_id',
    'CREATE INDEX idx_students_class_id ON students (class_id)'
  );
  await ensureIndex(
    connection,
    'teachers',
    'uniq_teachers_name',
    'CREATE UNIQUE INDEX uniq_teachers_name ON teachers (name)'
  );
  await ensureIndex(
    connection,
    'teachers',
    'idx_teachers_department',
    'CREATE INDEX idx_teachers_department ON teachers (department_id)'
  );
}

async function seedDepartments(connection) {
  const sourceNames = new Set();
  const [courseRows] = await connection.query(
    `SELECT DISTINCT TRIM(department) AS name
     FROM courses
     WHERE department IS NOT NULL AND TRIM(department) <> ''`
  );
  const [studentRows] = await connection.query(
    `SELECT DISTINCT TRIM(department) AS name
     FROM students
     WHERE department IS NOT NULL AND TRIM(department) <> ''`
  );

  for (const row of [...courseRows, ...studentRows]) {
    const name = normalizeText(row.name);
    if (name) {
      sourceNames.add(name);
    }
  }

  for (const name of sourceNames) {
    const color = pickColor(name);
    await connection.query(
      'INSERT INTO departments (name, color) VALUES (?, ?) ON DUPLICATE KEY UPDATE color = COALESCE(color, VALUES(color))',
      [name, color]
    );
  }

  let departments = await listDepartments(connection);
  const [[dataCountRow]] = await connection.query(
    `SELECT
      (SELECT COUNT(*) FROM categories) +
      (SELECT COUNT(*) FROM courses) +
      (SELECT COUNT(*) FROM students) +
      (SELECT COUNT(*) FROM schedules) AS total`
  );

  if (departments.length === 0 && Number(dataCountRow.total || 0) > 0) {
    const fallbackDepartment = await ensureFallbackDepartment(connection);
    departments = [fallbackDepartment];
  }

  return departments;
}

async function syncCourseDepartments(connection, departments) {
  const departmentIdByName = new Map(
    departments
      .map((department) => [normalizeText(department.name), department.id])
      .filter(([name, departmentId]) => name && departmentId != null)
  );

  const [orphanCourses] = await connection.query(
    `SELECT id, department
     FROM courses
     WHERE (department_id IS NULL OR department_id = 0)
       AND department IS NOT NULL
       AND TRIM(department) <> ''`
  );

  for (const course of orphanCourses) {
    const departmentId = departmentIdByName.get(normalizeText(course.department));
    if (!departmentId) {
      continue;
    }

    await connection.query(
      `UPDATE courses
       SET department_id = ?
       WHERE id = ?`,
      [departmentId, course.id]
    );
  }

  let targetDepartment = departments.length === 1 ? departments[0] : null;
  if (!targetDepartment) {
    const [[orphanCourseRow]] = await connection.query(
      'SELECT COUNT(*) AS total FROM courses WHERE department_id IS NULL'
    );
    if (Number(orphanCourseRow.total || 0) > 0) {
      targetDepartment = await ensureFallbackDepartment(connection);
    }
  }

  if (targetDepartment) {
    await connection.query(
      `UPDATE courses
       SET department_id = ?, department = ?
       WHERE department_id IS NULL`,
      [targetDepartment.id, targetDepartment.name]
    );
  }

  await connection.query(
    `UPDATE courses AS course
     JOIN departments AS dept ON dept.id = course.department_id
     SET course.department = dept.name
     WHERE course.department_id IS NOT NULL`
  );
}

async function syncCategoryDepartments(connection, departments) {
  const singleDepartment = departments.length === 1 ? departments[0] : null;
  let fallbackDepartment = null;

  const [categories] = await connection.query(
    'SELECT id, name, department_id FROM categories ORDER BY id'
  );

  for (const category of categories) {
    if (category.department_id != null) {
      continue;
    }

    const [matches] = await connection.query(
      `SELECT department_id, COUNT(*) AS total
       FROM courses
       WHERE department_id IS NOT NULL
         AND (
           category_id = ?
           OR category_name = ?
         )
       GROUP BY department_id
       ORDER BY total DESC, department_id ASC
       LIMIT 1`,
      [String(category.id), category.name]
    );

    let departmentId = matches[0]?.department_id || singleDepartment?.id || null;
    if (!departmentId) {
      fallbackDepartment ||= await ensureFallbackDepartment(connection);
      departmentId = fallbackDepartment.id;
    }

    await connection.query(
      'UPDATE categories SET department_id = ? WHERE id = ?',
      [departmentId, category.id]
    );
  }

  await connection.query(
    `UPDATE courses AS course
     JOIN categories AS category ON category.id = CAST(course.category_id AS UNSIGNED)
     SET course.category_name = category.name
     WHERE course.category_id IS NOT NULL
       AND TRIM(course.category_id) <> ''`
  );
}

async function syncClassesAndStudents(connection, departments) {
  const singleDepartment = departments.length === 1 ? departments[0] : null;
  const departmentMap = new Map(departments.map((department) => [department.name, department]));
  const departmentIdMap = new Map(departments.map((department) => [String(department.id), department]));
  let fallbackDepartment = null;

  async function getFallbackDepartment() {
    fallbackDepartment ||= await ensureFallbackDepartment(connection);
    departmentMap.set(fallbackDepartment.name, fallbackDepartment);
    departmentIdMap.set(String(fallbackDepartment.id), fallbackDepartment);
    return fallbackDepartment;
  }

  async function resolveDepartmentForName(departmentName) {
    const normalizedDepartmentName = normalizeText(departmentName);
    if (normalizedDepartmentName && departmentMap.has(normalizedDepartmentName)) {
      return departmentMap.get(normalizedDepartmentName);
    }

    if (singleDepartment) {
      return singleDepartment;
    }

    return getFallbackDepartment();
  }

  const [studentClasses] = await connection.query(
    `SELECT DISTINCT TRIM(class_name) AS class_name, TRIM(department) AS department_name
     FROM students
     WHERE class_name IS NOT NULL AND TRIM(class_name) <> ''`
  );

  const [scheduleClasses] = await connection.query(
    `SELECT DISTINCT
       TRIM(schedule.class_name) AS class_name,
       course.department_id
     FROM schedules AS schedule
     LEFT JOIN courses AS course ON course.id = schedule.course_id
     WHERE schedule.class_name IS NOT NULL AND TRIM(schedule.class_name) <> ''`
  );

  for (const row of studentClasses) {
    const className = normalizeText(row.class_name);
    if (!className) continue;
    const department = await resolveDepartmentForName(row.department_name);
    await connection.query(
      `INSERT INTO classes (name, department_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE department_id = department_id`,
      [className, department.id]
    );
  }

  for (const row of scheduleClasses) {
    const className = normalizeText(row.class_name);
    if (!className) continue;

    let department = row.department_id != null ? departmentIdMap.get(String(row.department_id)) : null;
    if (!department) {
      department = singleDepartment || await getFallbackDepartment();
    }

    await connection.query(
      `INSERT INTO classes (name, department_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE department_id = department_id`,
      [className, department.id]
    );
  }

  const [students] = await connection.query(
    `SELECT id, class_name, department, class_id
     FROM students
     WHERE class_name IS NOT NULL AND TRIM(class_name) <> ''`
  );

  for (const student of students) {
    const className = normalizeText(student.class_name);
    if (!className) continue;

    let department = await resolveDepartmentForName(student.department);
    let [classRows] = await connection.query(
      'SELECT id FROM classes WHERE name = ? AND department_id = ? LIMIT 1',
      [className, department.id]
    );

    if (classRows.length === 0) {
      await connection.query(
        'INSERT INTO classes (name, department_id) VALUES (?, ?)',
        [className, department.id]
      );
      [classRows] = await connection.query(
        'SELECT id FROM classes WHERE name = ? AND department_id = ? LIMIT 1',
        [className, department.id]
      );
    }

    await connection.query(
      `UPDATE students
       SET class_id = ?, class_name = ?, department = ?
       WHERE id = ?`,
      [classRows[0].id, className, department.name, student.id]
    );
  }
}

async function seedTeachers(connection) {
  const [courseTeachers] = await connection.query(
    `SELECT DISTINCT
       TRIM(teacher) AS name,
       department_id
     FROM courses
     WHERE teacher IS NOT NULL AND TRIM(teacher) <> ''
     ORDER BY department_id IS NULL, department_id, name`
  );

  const [scheduleTeachers] = await connection.query(
    `SELECT DISTINCT
       TRIM(schedule.teacher) AS name,
       course.department_id
     FROM schedules AS schedule
     LEFT JOIN courses AS course ON course.id = schedule.course_id
     WHERE schedule.teacher IS NOT NULL AND TRIM(schedule.teacher) <> ''
     ORDER BY course.department_id IS NULL, course.department_id, name`
  );

  async function upsertTeacher(name, departmentId) {
    const normalizedName = normalizeText(name);
    if (!normalizedName) {
      return;
    }

    await connection.query(
      `INSERT INTO teachers (name, department_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         department_id = CASE
           WHEN department_id IS NULL AND VALUES(department_id) IS NOT NULL
             THEN VALUES(department_id)
           ELSE department_id
         END`,
      [normalizedName, departmentId ?? null]
    );
  }

  for (const row of courseTeachers) {
    await upsertTeacher(row.name, row.department_id);
  }

  for (const row of scheduleTeachers) {
    await upsertTeacher(row.name, row.department_id);
  }
}

let schemaReadyPromise;

export async function ensureAdminSchema() {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    const connection = await pool.getConnection();
    try {
      await ensureTables(connection);
      await ensureColumnsAndIndexes(connection);
      await ensureEvaluationItemsColumn(connection);

      const departments = await seedDepartments(connection);
      await syncCourseDepartments(connection, departments);

      const refreshedDepartments = await listDepartments(connection);
      await syncCategoryDepartments(connection, refreshedDepartments);
      await syncClassesAndStudents(connection, refreshedDepartments);
      await seedTeachers(connection);

      console.log(`[admin-schema] ready (${refreshedDepartments.length} departments)`);
    } finally {
      connection.release();
    }
  })();

  return schemaReadyPromise;
}

export default ensureAdminSchema;
