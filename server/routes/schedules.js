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
    let sql = 'SELECT id, course_id, title, teacher, mentor, room, class_name, day, start_date, end_date, time_slot FROM schedules';
    const params = [];
    const conditions = [];

    if (className) {
      conditions.push('class_name = ?');
      params.push(className);
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

    for (const s of schedules) {
      const teacher = (s.teacher || '').trim();
      const mentor = (s.mentor || '').trim();
      const room = (s.room || '').trim();
      const title = (s.title || '').trim();
      const className = (s.className || '').trim();
      const day = (s.day || '').trim();

      // 跳过无效行（只需要 title、日期、时段）
      if (!title || !s.startDate || !s.timeSlot) {
        skipped++;
        continue;
      }

      // 检查是否重复（同课程 + 同班级 + 同周几 + 同开始日期 + 同时段）
      const lookupId = s.courseId || s.title;
      const [existing] = await connection.execute(
        `SELECT id
         FROM schedules
         WHERE course_id = ?
           AND start_date = ?
           AND time_slot = ?
           AND COALESCE(day, '') = ?
           AND COALESCE(class_name, '') = ?
         LIMIT 1`,
        [lookupId, s.startDate, s.timeSlot, day, className]
      );

      if (existing.length > 0) {
        // 重复则更新信息（教师、班级等可能变化）
        await connection.execute(
          'UPDATE schedules SET title = ?, teacher = ?, mentor = ?, room = ?, class_name = ?, day = ?, end_date = ? WHERE id = ?',
          [title, teacher, mentor || null, room, className || null, day || null, s.endDate || s.startDate, existing[0].id]
        );
        updated++;
      } else {
        await connection.execute(
          'INSERT INTO schedules (course_id, title, teacher, mentor, room, class_name, day, start_date, end_date, time_slot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            lookupId,
            title,
            teacher,
            mentor || null,
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

    res.json({
      success: true,
      message: `成功导入 ${inserted} 条${updated > 0 ? `，更新 ${updated} 条` : ''}${skipped > 0 ? `，跳过 ${skipped} 条` : ''}`,
      inserted, updated, skipped,
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
 */
router.put('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { title, teacher, mentor, room, className, day, startDate, endDate, timeSlot } = req.body;
    const normalizedTeacher = (teacher || '').trim();
    const normalizedMentor = (mentor || '').trim();
    const normalizedRoom = (room || '').trim();
    const normalizedDay = (day || '').trim();
    const [scheduleRows] = await connection.execute(
      'SELECT course_id FROM schedules WHERE id = ? LIMIT 1',
      [id]
    );

    await connection.execute(
      'UPDATE schedules SET title = ?, teacher = ?, mentor = ?, room = ?, class_name = ?, day = ?, start_date = ?, end_date = ?, time_slot = ? WHERE id = ?',
      [title, normalizedTeacher, normalizedMentor || null, normalizedRoom, className || null, normalizedDay || null, startDate, endDate || startDate, timeSlot, id]
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
