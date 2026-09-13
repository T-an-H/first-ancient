import { Router } from 'express';
import pool from '../db.js';
import {
  createStudentId,
  ensureClass,
  formatDate,
  getClassById,
  getClassByNameAndDepartment,
  handleRouteError,
  httpError,
  mapClassRow,
  mapCourseRow,
  mapStudentRow,
  normalizeText,
  parsePositiveInt,
} from '../lib/admin.js';

const router = Router();

function buildStudentWhereClause(query) {
  const conditions = [];
  const params = [];

  const search = normalizeText(query.search);
  const className = normalizeText(query.class);
  const classId = normalizeText(query.classId);
  const departmentName = normalizeText(query.department);
  const departmentId = normalizeText(query.departmentId);

  // 线上历史库 students/classes 的字符列是 utf8mb4_bin，而连接参数是 utf8mb4_unicode_ci，
  // 直接比较/模糊匹配会抛 ER_CANT_AGGREGATE_2COLLATIONS。统一在**每个参与运算的表达式**上
  // 显式指定 collation（含 COALESCE 内部各列，否则 COALESCE 自身就会先冲突）。
  // 对已是 unicode_ci 的库无影响。
  const C = 'utf8mb4_unicode_ci';
  const col = (expr) => `(${expr}) COLLATE ${C}`;

  if (search) {
    const keyword = `%${search}%`;
    conditions.push(
      `(${col('student.name')} LIKE ? OR ${col('student.student_id')} LIKE ? OR ${col(`COALESCE(${col('cls.name')}, ${col('student.class_name')}, '')`)} LIKE ?)`
    );
    params.push(keyword, keyword, keyword);
  }

  if (className) {
    conditions.push(`(${col(`COALESCE(${col('cls.name')}, ${col('student.class_name')})`)} = ?)`);
    params.push(className);
  }

  if (classId) {
    conditions.push('student.class_id = ?');
    params.push(classId);
  }

  if (departmentName) {
    conditions.push(`(${col(`COALESCE(${col('dept.name')}, ${col('student.department')})`)} = ?)`);
    params.push(departmentName);
  }

  if (departmentId) {
    conditions.push('cls.department_id = ?');
    params.push(departmentId);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/**
 * 安全取数：非法/缺失时回退
 */
function numOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function getStudentRowById(connection, studentId) {
  const [rows] = await connection.query(
    `SELECT
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
     WHERE student.id = ?
     LIMIT 1`,
    [studentId]
  );

  return rows[0] || null;
}

function parseDateValue(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const WEEKDAY_MAP = {
  '周一': 0,
  '星期一': 0,
  '周二': 1,
  '星期二': 1,
  '周三': 2,
  '星期三': 2,
  '周四': 3,
  '星期四': 3,
  '周五': 4,
  '星期五': 4,
  '周六': 5,
  '星期六': 5,
  '周日': 6,
  '星期日': 6,
  '星期天': 6,
};

function parseClockTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  };
}

function applyClockTime(baseDate, timeValue) {
  const clock = parseClockTime(timeValue);
  if (!clock) return null;

  const next = new Date(baseDate);
  next.setHours(clock.hours, clock.minutes, 0, 0);
  return next;
}

function getWeekdayInSameWeek(date, weekday) {
  const mondayBasedIndex = (date.getDay() + 6) % 7;
  const result = new Date(date);
  result.setDate(result.getDate() - mondayBasedIndex + weekday);
  result.setHours(0, 0, 0, 0);
  return result;
}

function normalizeDateOnly(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getFirstWeekdayOnOrAfter(date, weekday) {
  const result = getWeekdayInSameWeek(date, weekday);
  if (result.getTime() < normalizeDateOnly(date).getTime()) {
    result.setDate(result.getDate() + 7);
  }
  return result;
}

function getLastWeekdayOnOrBefore(date, weekday) {
  const result = getWeekdayInSameWeek(date, weekday);
  if (result.getTime() > normalizeDateOnly(date).getTime()) {
    result.setDate(result.getDate() - 7);
  }
  return result;
}

function getScheduleWeekday(scheduleRow) {
  const normalizedDay = normalizeText(scheduleRow.day);
  if (normalizedDay && WEEKDAY_MAP[normalizedDay] != null) {
    return WEEKDAY_MAP[normalizedDay];
  }

  const startBoundary = parseDateValue(scheduleRow.start_date);
  return startBoundary ? (startBoundary.getDay() + 6) % 7 : null;
}

function buildScheduleOccurrences(scheduleRow) {
  const startBoundary = parseDateValue(scheduleRow.start_date);
  const endBoundary = parseDateValue(scheduleRow.end_date) || startBoundary;
  const [startTime = '', endTime = ''] = String(scheduleRow.time_slot || '')
    .split('-')
    .map((part) => part.trim());

  if (!startBoundary || !endBoundary || !startTime || !endTime) {
    return [];
  }

  const hasExplicitWeekday = Boolean(normalizeText(scheduleRow.day));
  const weekday = getScheduleWeekday(scheduleRow);
  const dates = [];

  if (hasExplicitWeekday && weekday != null) {
    const firstDate = getFirstWeekdayOnOrAfter(startBoundary, weekday);
    const lastDate = getLastWeekdayOnOrBefore(endBoundary, weekday);
    if (firstDate.getTime() > lastDate.getTime()) {
      return [];
    }

    for (
      const cursor = new Date(firstDate);
      cursor.getTime() <= lastDate.getTime();
      cursor.setDate(cursor.getDate() + 7)
    ) {
      dates.push(new Date(cursor));
    }
  } else {
    dates.push(new Date(startBoundary));
  }

  const occurrences = [];
  for (const date of dates) {
    const start = applyClockTime(date, startTime);
    const end = applyClockTime(date, endTime);
    if (!start || !end) continue;

    if (end.getTime() < start.getTime()) {
      end.setDate(end.getDate() + 1);
    }

    occurrences.push({ start, end });
  }

  return occurrences;
}

function getScheduleOccurrenceStats(scheduleRows) {
  const occurrences = [];
  const seen = new Set();

  for (const scheduleRow of scheduleRows) {
    for (const occurrence of buildScheduleOccurrences(scheduleRow)) {
      const key = `${scheduleRow.id}::${occurrence.start.getTime()}::${occurrence.end.getTime()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      occurrences.push(occurrence);
    }
  }

  occurrences.sort((left, right) => left.start.getTime() - right.start.getTime());

  return {
    occurrences,
    totalCount: occurrences.length,
    completedCount: occurrences.filter((occurrence) => occurrence.end.getTime() <= Date.now()).length,
    firstStart: occurrences[0]?.start || null,
    lastEnd: occurrences[occurrences.length - 1]?.end || null,
  };
}

function buildDateRangeProgress(startDate, endDate) {
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  const now = Date.now();

  if (!start || !end) {
    return { progress: 0, status: 'enrolled', firstStart: start, lastEnd: end };
  }

  if (now < start.getTime()) {
    return { progress: 0, status: 'enrolled', firstStart: start, lastEnd: end };
  }

  if (now >= end.getTime()) {
    return { progress: 100, status: 'completed', firstStart: start, lastEnd: end };
  }

  const totalMs = Math.max(end.getTime() - start.getTime(), 1);
  const elapsedMs = Math.max(now - start.getTime(), 0);
  const progress = Math.max(1, Math.min(99, Math.round((elapsedMs / totalMs) * 100)));
  return { progress, status: 'in_progress', firstStart: start, lastEnd: end };
}

function buildEnrollmentProgress(scheduleRows) {
  const stats = getScheduleOccurrenceStats(scheduleRows);
  if (stats.totalCount === 0) {
    const startDates = scheduleRows
      .map((row) => parseDateValue(row.start_date))
      .filter(Boolean);
    const endDates = scheduleRows
      .map((row) => parseDateValue(row.end_date))
      .filter(Boolean);
    const startDate = startDates.length > 0
      ? new Date(Math.min(...startDates.map((date) => date.getTime())))
      : null;
    const endDate = endDates.length > 0
      ? new Date(Math.max(...endDates.map((date) => date.getTime())))
      : startDate;
    return buildDateRangeProgress(startDate, endDate);
  }

  const now = Date.now();
  if (stats.firstStart && now < stats.firstStart.getTime()) {
    return {
      progress: 0,
      status: 'enrolled',
      firstStart: stats.firstStart,
      lastEnd: stats.lastEnd,
    };
  }

  if (stats.lastEnd && now >= stats.lastEnd.getTime()) {
    return {
      progress: 100,
      status: 'completed',
      firstStart: stats.firstStart,
      lastEnd: stats.lastEnd,
    };
  }

  const progress = Math.round((stats.completedCount / stats.totalCount) * 100);
  return {
    progress: Math.max(0, Math.min(99, progress)),
    status: 'in_progress',
    firstStart: stats.firstStart,
    lastEnd: stats.lastEnd,
  };
}

router.get('/classes', async (req, res) => {
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
       ORDER BY cls.name`,
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

router.get('/', async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.pageSize, 100);
    const offset = (page - 1) * pageSize;
    const { whereClause, params } = buildStudentWhereClause(req.query);

    const fromClause = `
      FROM students AS student
      LEFT JOIN classes AS cls ON cls.id = student.class_id
      LEFT JOIN departments AS dept ON dept.id = cls.department_id
    `;

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total ${fromClause} ${whereClause}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT
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
       ${fromClause}
       ${whereClause}
       ORDER BY student.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      success: true,
      total: Number(countRows[0]?.total || 0),
      students: rows.map(mapStudentRow),
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
       WHERE COALESCE(dept.name, student.department) = ?
       ORDER BY class_name, student.name`,
      [departmentName]
    );

    res.json({
      success: true,
      students: rows.map(mapStudentRow),
    });
  } catch (error) {
    handleRouteError(res, error);
  }
});

router.get('/:id/courses', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const student = await getStudentRowById(connection, req.params.id);
    if (!student) {
      throw httpError(404, 'Student not found', 'STUDENT_NOT_FOUND');
    }

    const studentId = String(student.id);
    const className = normalizeText(student.class_name);

    const COURSE_SELECT = `
      SELECT
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
    `;

    // ---- 来源一（权威）：教师端在该课程内「导入学生」写入的选课记录 ----
    // 学生在课程内被导入 → 学生端即应看到该课程（不再依赖班级与排课班级是否一致）。
    const [enrollmentRows] = await connection.query(
      `SELECT id, course_id, schedule_id, enroll_date, progress, status
       FROM enrollments
       WHERE student_id = ? AND COALESCE(status, '') <> 'dropped'`,
      [studentId]
    );
    const enrollmentByCourse = new Map();
    for (const row of enrollmentRows) {
      const cid = normalizeText(row.course_id);
      if (cid && !enrollmentByCourse.has(cid)) enrollmentByCourse.set(cid, row);
    }
    const enrolledCourseIds = [...enrollmentByCourse.keys()];

    // ---- 来源二（兜底）：学生所在班级的排课（保留原有行为，避免回归）----
    let classScheduleRows = [];
    if (className) {
      const [rows] = await connection.query(
        `SELECT id, course_id, title, teacher, mentor, room, class_name, day, start_date, end_date, time_slot
         FROM schedules
         WHERE TRIM(COALESCE(class_name, '')) = ?
         ORDER BY start_date ASC, time_slot ASC, id ASC`,
        [className]
      );
      classScheduleRows = rows;
    }

    // 已选课程的排课（不限班级，用于取教师/导师/日期与进度）
    let enrolledScheduleRows = [];
    if (enrolledCourseIds.length > 0) {
      const [rows] = await connection.query(
        `SELECT id, course_id, title, teacher, mentor, room, class_name, day, start_date, end_date, time_slot
         FROM schedules
         WHERE course_id IN (${enrolledCourseIds.map(() => '?').join(', ')})
         ORDER BY start_date ASC, time_slot ASC, id ASC`,
        enrolledCourseIds
      );
      enrolledScheduleRows = rows;
    }

    // 排课按课程分组（course_id 优先，退化为 title）
    const schedulesByCourse = new Map();
    const addSchedule = (key, row) => {
      if (!key) return;
      if (!schedulesByCourse.has(key)) schedulesByCourse.set(key, []);
      schedulesByCourse.get(key).push(row);
    };
    for (const row of [...enrolledScheduleRows, ...classScheduleRows]) {
      addSchedule(normalizeText(row.course_id) || normalizeText(row.title), row);
    }

    // 课程集合 = 已选课（权威） ∪ 班级排课（兜底）
    const candidateCourseIds = [...new Set([
      ...enrolledCourseIds,
      ...classScheduleRows.map((row) => normalizeText(row.course_id)).filter(Boolean),
    ])];

    let courseRows = [];
    if (candidateCourseIds.length > 0) {
      const [rows] = await connection.query(
        `${COURSE_SELECT} WHERE course.id IN (${candidateCourseIds.map(() => '?').join(', ')})`,
        candidateCourseIds
      );
      courseRows = rows;
    }
    const courseById = new Map(courseRows.map((row) => [String(row.id), row]));
    const courseByTitle = new Map(courseRows.map((row) => [normalizeText(row.title), row]));

    const courses = [];
    const enrollments = [];
    const seenCourseIds = new Set();

    const emitCourse = (courseRow, fallbackGroupKey) => {
      const courseId = String(courseRow.id);
      if (seenCourseIds.has(courseId)) return;
      seenCourseIds.add(courseId);

      const allRows = [
        ...(schedulesByCourse.get(normalizeText(courseRow.id)) || []),
        ...(schedulesByCourse.get(normalizeText(courseRow.title)) || []),
      ];
      // 进度按「学生所在班级」的排课算（与旧行为一致）。学生无班级、或该课没排到他班上时，
      // 不借用别班排课（会虚高），改由下方按课程起止日期兜底。
      const timingRows = className
        ? allRows.filter((row) => normalizeText(row.class_name) === className)
        : [];

      const uniqueTeachers = [...new Set(allRows.map((row) => normalizeText(row.teacher)).filter(Boolean))];
      const uniqueMentors = [...new Set(allRows.map((row) => normalizeText(row.mentor)).filter(Boolean))];

      // 进度/状态：优先按本班排课算，无则按课程起止日期算
      const progressInfo = timingRows.length > 0
        ? buildEnrollmentProgress(timingRows)
        : buildDateRangeProgress(courseRow.course_start_date, courseRow.course_end_date);

      const mappedCourse = mapCourseRow(courseRow);
      const enrollmentRow = enrollmentByCourse.get(courseId)
        || enrollmentByCourse.get(normalizeText(courseRow.id));

      courses.push({
        ...mappedCourse,
        startDate: formatDate(progressInfo.firstStart || mappedCourse.startDate || courseRow.course_start_date),
        endDate: formatDate(progressInfo.lastEnd || mappedCourse.endDate || courseRow.course_end_date),
        teacher: mappedCourse.teacher || uniqueTeachers.join(' / '),
        mentor: mappedCourse.mentor || uniqueMentors.join(' / '),
      });

      // 进度恒按排课/课程起止实时计算（服务端从不写 enrollments.progress，该列恒为初始 0）；
      // 仅在完全无排课且无起止日期时，才退回列值。
      const hasScheduleTiming = Boolean(
        progressInfo.firstStart || progressInfo.lastEnd || courseRow.course_start_date || courseRow.course_end_date
      );

      enrollments.push({
        id: enrollmentRow?.id || `db-enrollment-${studentId}-${courseId}`,
        studentId,
        courseId,
        scheduleId: String(enrollmentRow?.schedule_id || timingRows[0]?.id || ''),
        enrollDate: formatDate(enrollmentRow?.enroll_date || progressInfo.firstStart || courseRow.course_start_date),
        progress: hasScheduleTiming ? progressInfo.progress : numOr(enrollmentRow?.progress, progressInfo.progress),
        status: hasScheduleTiming ? progressInfo.status : 'enrolled',
      });
    };

    // 1) 已导入的课程（权威）
    for (const courseId of enrolledCourseIds) {
      const courseRow = courseById.get(courseId);
      if (courseRow) emitCourse(courseRow, courseId);
    }
    // 2) 班级排课兜底（按 id，其次按 title）
    for (const row of classScheduleRows) {
      const courseRow =
        courseById.get(normalizeText(row.course_id)) ||
        courseByTitle.get(normalizeText(row.title));
      if (courseRow) emitCourse(courseRow, normalizeText(row.course_id) || normalizeText(row.title));
    }

    res.json({
      success: true,
      student: mapStudentRow(student),
      courses,
      enrollments,
    });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.get('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const student = await getStudentRowById(connection, req.params.id);
    if (!student) {
      throw httpError(404, '学生不存在', 'STUDENT_NOT_FOUND');
    }

    res.json({
      success: true,
      student: mapStudentRow(student),
    });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const name = normalizeText(req.body?.name);
    if (!name) {
      throw httpError(400, '学生姓名不能为空', 'STUDENT_NAME_REQUIRED');
    }

    const klass = await ensureClass(connection, {
      classId: req.body?.classId,
      className: req.body?.className,
      departmentId: req.body?.departmentId,
      departmentName: req.body?.department,
      createIfMissing: true,
    });

    if (!klass) {
      throw httpError(400, '学生必须关联班级', 'STUDENT_CLASS_REQUIRED');
    }

    const studentId = normalizeText(req.body?.studentId) || createStudentId();
    const [duplicateRows] = await connection.query(
      'SELECT id FROM students WHERE student_id = ? LIMIT 1',
      [studentId]
    );
    if (duplicateRows.length > 0) {
      throw httpError(409, '学号已存在', 'STUDENT_ID_EXISTS');
    }

    await connection.query(
      `INSERT INTO students (
         student_id,
         name,
         phone,
         email,
         class_name,
         department,
         class_id,
         status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        name,
        normalizeText(req.body?.phone) || null,
        normalizeText(req.body?.email) || null,
        klass.name,
        klass.department_name,
        klass.id,
        normalizeText(req.body?.status) === 'inactive' ? 'inactive' : 'active',
      ]
    );

    const [[createdRow]] = await connection.query('SELECT LAST_INSERT_ID() AS id');
    const created = await getStudentRowById(connection, createdRow.id);

    res.status(201).json({
      success: true,
      student: mapStudentRow(created),
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
    const student = await getStudentRowById(connection, req.params.id);
    if (!student) {
      throw httpError(404, '学生不存在', 'STUDENT_NOT_FOUND');
    }

    let klass = null;
    if (
      req.body?.classId != null ||
      req.body?.className != null ||
      req.body?.departmentId != null ||
      req.body?.department != null
    ) {
      klass = await ensureClass(connection, {
        classId: req.body?.classId,
        className: req.body?.className || student.class_name,
        departmentId: req.body?.departmentId || student.department_id,
        departmentName: req.body?.department || student.department_name,
        createIfMissing: true,
      });
    } else if (student.class_id) {
      klass = await getClassById(connection, student.class_id);
    } else if (student.class_name && student.department_name) {
      klass = await getClassByNameAndDepartment(connection, student.class_name, student.department_id);
    }

    if (!klass) {
      throw httpError(400, '学生必须关联班级', 'STUDENT_CLASS_REQUIRED');
    }

    const studentId = normalizeText(req.body?.studentId) || student.student_id;
    const [duplicateRows] = await connection.query(
      'SELECT id FROM students WHERE student_id = ? AND id <> ? LIMIT 1',
      [studentId, req.params.id]
    );
    if (duplicateRows.length > 0) {
      throw httpError(409, '学号已存在', 'STUDENT_ID_EXISTS');
    }

    await connection.query(
      `UPDATE students
       SET student_id = ?,
           name = ?,
           phone = ?,
           email = ?,
           class_name = ?,
           department = ?,
           class_id = ?,
           status = ?
       WHERE id = ?`,
      [
        studentId,
        normalizeText(req.body?.name) || student.name,
        normalizeText(req.body?.phone) || null,
        normalizeText(req.body?.email) || null,
        klass.name,
        klass.department_name,
        klass.id,
        normalizeText(req.body?.status) === 'inactive' ? 'inactive' : 'active',
        req.params.id,
      ]
    );

    const updated = await getStudentRowById(connection, req.params.id);
    res.json({
      success: true,
      student: mapStudentRow(updated),
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
    const student = await getStudentRowById(connection, req.params.id);
    if (!student) {
      throw httpError(404, '学生不存在', 'STUDENT_NOT_FOUND');
    }

    await connection.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    handleRouteError(res, error);
  } finally {
    connection.release();
  }
});

export default router;
