/**
 * 排课管理路由
 *
 * 支持单条添加、批量导入（Excel 解析后数据）
 */
import { Router } from 'express';
import pool from '../db.js';
import { ensureTeacher, normalizeText } from '../lib/admin.js';

/** 格式化 MySQL 日期，避免 toISOString 时区偏移 */
function fmtDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  // d 是 Date 对象 → 按本地时间格式化 yyyy-mm-dd
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const router = Router();

async function getCourseRow(connection, courseId, title = '') {
  const normalizedCourseId = normalizeText(courseId);
  const normalizedTitle = normalizeText(title);

  if (normalizedCourseId) {
    const [courseRows] = await connection.execute(
      'SELECT id, department_id, department FROM courses WHERE id = ? LIMIT 1',
      [normalizedCourseId]
    );
    if (courseRows.length > 0) {
      return courseRows[0];
    }
  }

  if (normalizedTitle) {
    const [courseRows] = await connection.execute(
      'SELECT id, department_id, department FROM courses WHERE title = ? LIMIT 1',
      [normalizedTitle]
    );
    if (courseRows.length > 0) {
      return courseRows[0];
    }
  }

  return null;
}

/**
 * GET /api/schedules - 获取所有排课
 * 支持 ?class=xxx / ?courseId=xxx 筛选
 */
router.get('/', async (req, res) => {
  try {
    const { class: className, courseId } = req.query;
    let sql = 'SELECT id, course_id, title, teacher, mentor, semester, room, class_name, day, start_date, end_date, time_slot FROM schedules';
    const params = [];
    const conditions = [];

    // ⚠️ 班级语义：class_name 为空（NULL / 空串）= 全班级，对本课程所有学生生效。
    // 因此按班级查询要同时取「本班专属」与「全班级」两类，只写 class_name = ?
    // 会漏掉全部空班级排课（曾导致学生端 AI 分层闸门恒不开）。
    // 同时 NULL 与 '' 双写法都要覆盖，故统一用 TRIM(COALESCE(...))。
    const normalizedClassName = String(className ?? '').trim();
    if (normalizedClassName) {
      conditions.push("(TRIM(COALESCE(class_name, '')) = ? OR TRIM(COALESCE(class_name, '')) = '')");
      params.push(normalizedClassName);
    }

    if (courseId) {
      conditions.push('course_id = ?');
      params.push(courseId);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY start_date DESC, time_slot';

    const [rows] = await pool.execute(sql, params);

    const schedules = rows.map((s) => ({
      id: String(s.id),
      courseId: s.course_id,
      title: s.title,
      teacher: s.teacher,
      mentor: s.mentor || '',
      semester: s.semester || '',
      room: s.room,
      className: s.class_name || '',
      day: s.day || '',
      startDate: fmtDate(s.start_date),
      endDate: fmtDate(s.end_date),
      timeSlot: s.time_slot,
    }));

    res.json({ success: true, schedules });
  } catch (error) {
    console.error('获取排课列表失败:', error);
    res.status(500).json({ success: false, message: '获取排课列表失败' });
  }
});

/**
 * POST /api/schedules/bulk - 批量导入排课
 * 接收: { schedules: [ { courseId, title, startDate, endDate, timeSlot, room, teacher }, ... ] }
 */
router.post('/bulk', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { schedules } = req.body;

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ success: false, message: '没有有效的排课数据' });
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    // 新语义下两类「语义重复」会被跳过，分开计数，避免管理员以为导入成功却没生效
    let coveredByGlobal = 0;
    let shadowedByClass = 0;

    for (const s of schedules) {
      const teacher = (s.teacher || '').trim();
      const mentor = (s.mentor || '').trim();
      const room = (s.room || '').trim();
      const title = (s.title || '').trim();
      const className = (s.className || '').trim();
      const day = (s.day || '').trim();
      const semester = (s.semester || '').trim();

      // 跳过无效行（只需要 title、日期、时段）
      if (!title || !s.startDate || !s.timeSlot) {
        skipped++;
        continue;
      }

      // 查同一时段的既有行（可能多行：全班级 1 行 + 各班 1 行，或并行班多行）。
      // ⚠️ 刻意不把 class_name 放进 WHERE：班级语义为「空 = 全班级」后，
      // 「全班级一行」与「每班一行」在时间上指向同一次课，用 class_name 做键
      // 会判定为不同记录，从而插入重复课次（课次与评价轮次都会翻倍）。
      // 注意必须取全部匹配行：用 LIMIT 1 会命中别班的行，导致把 A 班的排课改成 B 班。
      const lookupId = s.courseId || s.title;
      const [matches] = await connection.execute(
        `SELECT id, TRIM(COALESCE(class_name, '')) AS class_name
         FROM schedules
         WHERE course_id = ?
           AND start_date = ?
           AND time_slot = ?
           AND COALESCE(day, '') = ?
           AND COALESCE(semester, '') = ?`,
        [lookupId, s.startDate, s.timeSlot, day, semester]
      );

      const sameClassRow = matches.find(
        (row) => String(row.class_name || '').trim() === className
      );
      const globalRow = matches.find((row) => !String(row.class_name || '').trim());
      const hasClassRow = matches.some((row) => String(row.class_name || '').trim());

      if (!sameClassRow) {
        // ① 已有全班级行 → 本次（无论是否指定班级）都已被它覆盖，跳过
        if (globalRow) {
          coveredByGlobal++;
          skipped++;
          continue;
        }
        // ② 本次导入全班级行，但该时段已有班级专属行 → 跳过。
        //    否则会给每个班都凭空多出一节课。
        //    注意：两个「不同非空班级」同段是合法的并行班，必须落到下面的 INSERT。
        if (!className && hasClassRow) {
          shadowedByClass++;
          skipped++;
          continue;
        }
      }

      if (sameClassRow) {
        // 同一班级的重复导入 → 更新信息
        await connection.execute(
          'UPDATE schedules SET title = ?, teacher = ?, mentor = ?, semester = ?, room = ?, class_name = ?, day = ?, end_date = ? WHERE id = ?',
          [title, teacher, mentor || null, semester || null, room, className || null, day || null, s.endDate || s.startDate, sameClassRow.id]
        );
        updated++;
      } else {
        await connection.execute(
          'INSERT INTO schedules (course_id, title, teacher, mentor, semester, room, class_name, day, start_date, end_date, time_slot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            lookupId,
            title,
            teacher,
            mentor || null,
            semester || null,
            room,
            className || null,
            day || null,
            s.startDate,
            s.endDate || s.startDate,
            s.timeSlot,
          ]
        );

        // 自动创建课程（如果不存在）
        try {
          const [courseExist] = await connection.execute('SELECT id FROM courses WHERE id = ? OR title = ?', [lookupId, s.title]);
          if (courseExist.length === 0) {
            await connection.execute(
              'INSERT INTO courses (id, title, teacher, mentor, department, status) VALUES (?, ?, ?, ?, ?, ?)',
              [lookupId, title, teacher, mentor || null, s.department || null, 'active']
            );
          }
        } catch (e) {
          console.error('自动创建课程失败:', e.message);
        }
        inserted++;
      }

      if (teacher) {
        const course = await getCourseRow(connection, lookupId, s.title);
        await ensureTeacher(connection, {
          teacherName: teacher,
          departmentId: course?.department_id,
          departmentName: course?.department || s.department,
          createIfMissing: true,
        });
      }
    }

    const reasons = [];
    if (coveredByGlobal > 0) reasons.push(`${coveredByGlobal} 条已由全班级排课覆盖`);
    if (shadowedByClass > 0) reasons.push(`${shadowedByClass} 条与已存在的班级排课重复`);

    res.json({
      success: true,
      message: `成功导入 ${inserted} 条${updated > 0 ? `，更新 ${updated} 条` : ''}${skipped > 0 ? `，跳过 ${skipped} 条${reasons.length ? `（${reasons.join('；')}）` : ''}` : ''}`,
      inserted, updated, skipped,
      coveredByGlobal, shadowedByClass,
    });
  } catch (error) {
    console.error('批量导入排课失败:', error);
    res.status(500).json({ success: false, message: '导入失败：' + error.message });
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/schedules/:id - 更新一条排课
 *
 * ⚠️ class_name 采用「仅在显式传参时才覆盖」：整行 UPDATE 会把请求里没带的字段写成
 * NULL，而班级语义是「空 = 全班级」——管理端编辑弹窗本就不含班级字段，
 * 于是「只想改个教室」会把班级专属排课静默升级为对全校生效。
 */
router.put('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { title, teacher, mentor, semester, room, className, day, startDate, endDate, timeSlot } = req.body;
    const normalizedTeacher = (teacher || '').trim();
    const normalizedMentor = (mentor || '').trim();
    const normalizedSemester = (semester || '').trim();
    const normalizedRoom = (room || '').trim();
    const normalizedDay = (day || '').trim();
    const [scheduleRows] = await connection.execute(
      'SELECT course_id FROM schedules WHERE id = ? LIMIT 1',
      [id]
    );

    // 只有请求里明确带了 className 这个键，才改动班级；否则保留库中原值
    const hasClassName = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'className');
    const setClauses = [
      'title = ?',
      'teacher = ?',
      'mentor = ?',
      'semester = ?',
      'room = ?',
      'day = ?',
      'start_date = ?',
      'end_date = ?',
      'time_slot = ?',
    ];
    const setParams = [
      title,
      normalizedTeacher,
      normalizedMentor || null,
      normalizedSemester || null,
      normalizedRoom,
      normalizedDay || null,
      startDate,
      endDate || startDate,
      timeSlot,
    ];
    if (hasClassName) {
      setClauses.push('class_name = ?');
      setParams.push(String(className ?? '').trim() || null);
    }
    setParams.push(id);

    await connection.execute(
      `UPDATE schedules SET ${setClauses.join(', ')} WHERE id = ?`,
      setParams
    );

    if (normalizedMentor && scheduleRows[0]?.course_id) {
      await connection.execute(
        'UPDATE courses SET mentor = ? WHERE id = ?',
        [normalizedMentor, scheduleRows[0].course_id]
      );
    }

    if (normalizedTeacher) {
      const course = await getCourseRow(
        connection,
        normalizeText(req.body?.courseId) || scheduleRows[0]?.course_id,
        title
      );
      await ensureTeacher(connection, {
        teacherName: normalizedTeacher,
        departmentId: course?.department_id,
        departmentName: course?.department,
        createIfMissing: true,
      });
    }

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新排课失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/schedules/:id - 删除一条排课
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM schedules WHERE id = ?', [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除排课失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

export default router;
