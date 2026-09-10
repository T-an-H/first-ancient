const COLOR_PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#ef4444',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
];

export const DEFAULT_ORPHAN_DEPARTMENT_NAME = '未分配学院';

export function httpError(statusCode, message, code = 'BAD_REQUEST') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function handleRouteError(res, error) {
  const statusCode = error?.statusCode || 500;
  const message = error?.message || '服务器错误';
  const code = error?.code;

  if (statusCode >= 500) {
    console.error(error);
  }

  const payload = { success: false, message };
  if (code) {
    payload.code = code;
  }

  res.status(statusCode).json(payload);
}

export function normalizeText(value) {
  return String(value ?? '').trim();
}

export function normalizeOptionalText(value) {
  const text = normalizeText(value);
  return text || '';
}

export function normalizeColor(value, fallback = COLOR_PALETTE[0]) {
  const text = normalizeText(value);
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : fallback;
}

export function pickColor(seed) {
  const text = normalizeText(seed);
  if (!text) {
    return COLOR_PALETTE[0];
  }

  let total = 0;
  for (const char of text) {
    total += char.codePointAt(0) || 0;
  }

  return COLOR_PALETTE[total % COLOR_PALETTE.length];
}

export function toId(value) {
  return value == null ? '' : String(value);
}

export function formatDate(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function createCourseId() {
  return `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createStudentId() {
  return `S${Date.now()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export function mapDepartmentRow(row) {
  return {
    id: toId(row.id),
    name: row.name,
    color: normalizeColor(row.color, pickColor(row.name)),
    createdAt: formatDate(row.created_at),
    categoryCount: Number(row.category_count || 0),
    courseCount: Number(row.course_count || 0),
    classCount: Number(row.class_count || 0),
    studentCount: Number(row.student_count || 0),
    teacherCount: Number(row.teacher_count || 0),
  };
}

export function mapCategoryRow(row) {
  return {
    id: toId(row.id),
    name: row.name,
    color: normalizeColor(row.color, pickColor(row.name)),
    courseCount: Number(row.course_count || 0),
    departmentId: row.department_id == null ? '' : toId(row.department_id),
    departmentName: row.department_name || '',
    createdAt: formatDate(row.created_at),
  };
}

export function mapCourseRow(row) {
  return {
    id: toId(row.id),
    title: row.title,
    description: row.description || '',
    categoryId: row.category_id == null ? '' : String(row.category_id),
    categoryName: row.joined_category_name || row.category_name || '',
    departmentId: row.department_id == null ? '' : toId(row.department_id),
    departmentName: row.department_name || row.department || '',
    cover: row.cover || '',
    startDate: formatDate(row.course_start_date || row.start_date),
    endDate: formatDate(row.course_end_date || row.end_date),
    credits: Number(row.credits || 0),
    duration: Number(row.duration || 0),
    status: row.status || 'active',
    createdAt: formatDate(row.created_at),
    teacher: row.teacher || '',
    mentor: row.mentor || '',
  };
}

export function mapClassRow(row) {
  return {
    id: toId(row.id),
    name: row.name,
    count: Number(row.student_count || row.count || 0),
    studentCount: Number(row.student_count || row.count || 0),
    departmentId: row.department_id == null ? '' : toId(row.department_id),
    departmentName: row.department_name || '',
    createdAt: formatDate(row.created_at),
  };
}

export function mapStudentRow(row) {
  const name = row.name || '';
  const className = row.class_name || '';

  return {
    id: toId(row.id),
    name,
    studentId: row.student_id || '',
    phone: row.phone || '',
    email: row.email || '',
    classId: row.class_id == null ? '' : toId(row.class_id),
    className,
    departmentId: row.department_id == null ? '' : toId(row.department_id),
    department: row.department_name || row.department || '',
    status: row.status || 'active',
    joinDate: formatDate(row.created_at),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
  };
}

export function mapTeacherRow(row) {
  const name = row.name || '';

  return {
    id: toId(row.id),
    name,
    phone: row.phone || '',
    email: row.email || '',
    departmentId: row.department_id == null ? '' : toId(row.department_id),
    departmentName: row.department_name || '',
    courseCount: Number(row.course_count || 0),
    scheduleCount: Number(row.schedule_count || 0),
    createdAt: formatDate(row.created_at),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
  };
}

async function loadTeacherUsageMaps(connection) {
  const [courseRows] = await connection.query(
    `SELECT TRIM(teacher) AS name, COUNT(*) AS total
     FROM courses
     WHERE teacher IS NOT NULL AND TRIM(teacher) <> ''
     GROUP BY TRIM(teacher)`
  );

  const [scheduleRows] = await connection.query(
    `SELECT TRIM(teacher) AS name, COUNT(*) AS total
     FROM schedules
     WHERE teacher IS NOT NULL AND TRIM(teacher) <> ''
     GROUP BY TRIM(teacher)`
  );

  return {
    courseCountByName: new Map(
      courseRows
        .map((row) => [normalizeText(row.name), Number(row.total || 0)])
        .filter(([name]) => name)
    ),
    scheduleCountByName: new Map(
      scheduleRows
        .map((row) => [normalizeText(row.name), Number(row.total || 0)])
        .filter(([name]) => name)
    ),
  };
}

export async function attachTeacherStats(connection, teacherRows) {
  if (!Array.isArray(teacherRows) || teacherRows.length === 0) {
    return teacherRows;
  }

  const { courseCountByName, scheduleCountByName } = await loadTeacherUsageMaps(connection);

  return teacherRows.map((row) => {
    const normalizedName = normalizeText(row.name);
    return {
      ...row,
      course_count: courseCountByName.get(normalizedName) ?? Number(row.course_count || 0),
      schedule_count: scheduleCountByName.get(normalizedName) ?? Number(row.schedule_count || 0),
    };
  });
}

export async function listTeachers(connection) {
  const [rows] = await connection.query(
    `SELECT
       teacher.id,
       teacher.name,
       teacher.phone,
       teacher.email,
       teacher.department_id,
       teacher.created_at,
       dept.name AS department_name
     FROM teachers AS teacher
     LEFT JOIN departments AS dept ON dept.id = teacher.department_id
     ORDER BY dept.name, teacher.name`
  );

  return attachTeacherStats(connection, rows);
}

export async function getTeacherById(connection, teacherId) {
  const normalizedId = normalizeText(teacherId);
  if (!normalizedId) return null;

  const [rows] = await connection.query(
    `SELECT
       teacher.id,
       teacher.name,
       teacher.phone,
       teacher.email,
       teacher.department_id,
       teacher.created_at,
       dept.name AS department_name,
       usr.account AS user_phone,
       usr.department AS user_department
     FROM teachers AS teacher
     LEFT JOIN departments AS dept ON dept.id = teacher.department_id
     LEFT JOIN users AS usr ON usr.ref_id = CONCAT(teacher.id) AND usr.ref_type = 'teacher'
     WHERE teacher.id = ?
     LIMIT 1`,
    [normalizedId]
  );

  const [fixedRow] = rows;
  if (fixedRow) {
    fixedRow.phone = fixedRow.phone || fixedRow.user_phone || '';
    fixedRow.department_name = fixedRow.department_name || fixedRow.user_department || '';
  }

  const [teacher] = await attachTeacherStats(connection, rows);
  return teacher || null;
}

export async function getTeacherByName(connection, teacherName) {
  const normalizedName = normalizeText(teacherName);
  if (!normalizedName) return null;

  const [rows] = await connection.query(
    `SELECT
       teacher.id,
       teacher.name,
       teacher.phone,
       teacher.email,
       teacher.department_id,
       teacher.created_at,
       dept.name AS department_name
     FROM teachers AS teacher
     LEFT JOIN departments AS dept ON dept.id = teacher.department_id
     WHERE teacher.name = ?
     LIMIT 1`,
    [normalizedName]
  );

  const [teacher] = await attachTeacherStats(connection, rows);
  return teacher || null;
}

export async function ensureTeacher(connection, options = {}) {
  const {
    teacherName,
    departmentId,
    departmentName,
    phone,
    email,
    createIfMissing = false,
  } = options;

  const normalizedName = normalizeText(teacherName);
  if (!normalizedName) {
    return null;
  }

  let resolvedDepartmentId = null;
  const departmentById = await getDepartmentById(connection, departmentId);
  if (departmentById) {
    resolvedDepartmentId = departmentById.id;
  } else {
    const departmentByName = await getDepartmentByName(connection, departmentName);
    if (departmentByName) {
      resolvedDepartmentId = departmentByName.id;
    }
  }

  const normalizedPhone = normalizeOptionalText(phone);
  const normalizedEmail = normalizeOptionalText(email);
  const existing = await getTeacherByName(connection, normalizedName);

  if (existing) {
    const nextDepartmentId =
      existing.department_id == null && resolvedDepartmentId != null
        ? resolvedDepartmentId
        : existing.department_id;
    const nextPhone = existing.phone || normalizedPhone || '';
    const nextEmail = existing.email || normalizedEmail || '';

    if (
      String(nextDepartmentId ?? '') !== String(existing.department_id ?? '') ||
      nextPhone !== (existing.phone || '') ||
      nextEmail !== (existing.email || '')
    ) {
      await connection.query(
        `UPDATE teachers
         SET department_id = ?, phone = ?, email = ?
         WHERE id = ?`,
        [nextDepartmentId, nextPhone || null, nextEmail || null, existing.id]
      );
    }

    return getTeacherById(connection, existing.id);
  }

  if (!createIfMissing) {
    return null;
  }

  const [result] = await connection.query(
    `INSERT INTO teachers (name, phone, email, department_id)
     VALUES (?, ?, ?, ?)`,
    [normalizedName, normalizedPhone || null, normalizedEmail || null, resolvedDepartmentId]
  );

  return getTeacherById(connection, result.insertId);
}

export async function listDepartments(connection) {
  const [rows] = await connection.query(
    'SELECT id, name, color, created_at FROM departments ORDER BY id'
  );
  return rows;
}

export async function getDepartmentById(connection, departmentId) {
  const normalizedId = normalizeText(departmentId);
  if (!normalizedId) return null;

  const [rows] = await connection.query(
    'SELECT id, name, color, created_at FROM departments WHERE id = ? LIMIT 1',
    [normalizedId]
  );
  return rows[0] || null;
}

export async function getDepartmentByName(connection, departmentName) {
  const normalizedName = normalizeText(departmentName);
  if (!normalizedName) return null;

  const [rows] = await connection.query(
    'SELECT id, name, color, created_at FROM departments WHERE name = ? LIMIT 1',
    [normalizedName]
  );
  return rows[0] || null;
}

export async function getOnlyDepartment(connection) {
  const rows = await listDepartments(connection);
  return rows.length === 1 ? rows[0] : null;
}

export async function ensureFallbackDepartment(connection) {
  const existing = await getDepartmentByName(connection, DEFAULT_ORPHAN_DEPARTMENT_NAME);
  if (existing) {
    return existing;
  }

  const color = pickColor(DEFAULT_ORPHAN_DEPARTMENT_NAME);
  const [result] = await connection.query(
    'INSERT INTO departments (name, color) VALUES (?, ?)',
    [DEFAULT_ORPHAN_DEPARTMENT_NAME, color]
  );

  return getDepartmentById(connection, result.insertId);
}

export async function ensureDepartment(connection, options = {}) {
  const { departmentId, departmentName, color, createIfMissing = false } = options;

  const byId = await getDepartmentById(connection, departmentId);
  if (byId) {
    return byId;
  }

  const normalizedName = normalizeText(departmentName);
  if (!normalizedName) {
    return null;
  }

  const existing = await getDepartmentByName(connection, normalizedName);
  if (existing) {
    return existing;
  }

  if (!createIfMissing) {
    throw httpError(400, '所选学院不存在', 'DEPARTMENT_NOT_FOUND');
  }

  const chosenColor = normalizeColor(color, pickColor(normalizedName));
  const [result] = await connection.query(
    'INSERT INTO departments (name, color) VALUES (?, ?)',
    [normalizedName, chosenColor]
  );

  return getDepartmentById(connection, result.insertId);
}

export async function getClassById(connection, classId) {
  const normalizedId = normalizeText(classId);
  if (!normalizedId) return null;

  const [rows] = await connection.query(
    `SELECT cls.id, cls.name, cls.department_id, cls.created_at, dept.name AS department_name
     FROM classes AS cls
     JOIN departments AS dept ON dept.id = cls.department_id
     WHERE cls.id = ?
     LIMIT 1`,
    [normalizedId]
  );

  return rows[0] || null;
}

export async function getClassByNameAndDepartment(connection, className, departmentId) {
  const normalizedName = normalizeText(className);
  const normalizedDepartmentId = normalizeText(departmentId);
  if (!normalizedName || !normalizedDepartmentId) {
    return null;
  }

  const [rows] = await connection.query(
    `SELECT cls.id, cls.name, cls.department_id, cls.created_at, dept.name AS department_name
     FROM classes AS cls
     JOIN departments AS dept ON dept.id = cls.department_id
     WHERE cls.name = ? AND cls.department_id = ?
     LIMIT 1`,
    [normalizedName, normalizedDepartmentId]
  );

  return rows[0] || null;
}

export async function ensureClass(connection, options = {}) {
  const {
    classId,
    className,
    departmentId,
    departmentName,
    createIfMissing = false,
  } = options;

  const byId = await getClassById(connection, classId);
  if (byId) {
    return byId;
  }

  const normalizedClassName = normalizeText(className);
  if (!normalizedClassName) {
    return null;
  }

  let department = await ensureDepartment(connection, {
    departmentId,
    departmentName,
    createIfMissing,
  });

  if (!department) {
    department = await getOnlyDepartment(connection);
  }

  if (!department) {
    throw httpError(400, '班级必须关联学院', 'CLASS_DEPARTMENT_REQUIRED');
  }

  const existing = await getClassByNameAndDepartment(connection, normalizedClassName, department.id);
  if (existing) {
    return existing;
  }

  if (!createIfMissing) {
    throw httpError(400, '所选班级不存在', 'CLASS_NOT_FOUND');
  }

  const [result] = await connection.query(
    'INSERT INTO classes (name, department_id) VALUES (?, ?)',
    [normalizedClassName, department.id]
  );

  return getClassById(connection, result.insertId);
}

export async function countDepartmentRelations(connection, departmentId) {
  const [[categoryRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM categories WHERE department_id = ?',
    [departmentId]
  );
  const [[courseRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM courses WHERE department_id = ?',
    [departmentId]
  );
  const [[classRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM classes WHERE department_id = ?',
    [departmentId]
  );
  const [[studentRow]] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM students AS stu
     JOIN classes AS cls ON cls.id = stu.class_id
     WHERE cls.department_id = ?`,
    [departmentId]
  );
  const [[teacherRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM teachers WHERE department_id = ?',
    [departmentId]
  );

  return {
    categoryCount: Number(categoryRow.total || 0),
    courseCount: Number(courseRow.total || 0),
    classCount: Number(classRow.total || 0),
    studentCount: Number(studentRow.total || 0),
    teacherCount: Number(teacherRow.total || 0),
  };
}
