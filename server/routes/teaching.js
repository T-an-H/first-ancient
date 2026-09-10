/**
 * 教学数据路由：选课 / 成绩 / 分组
 */
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// ==================== 选课 (Enrollments) ====================

/** POST /api/teaching/enrollments/bulk - 批量导入选课 */
router.post('/enrollments/bulk', async (req, res) => {
  try {
    const { enrollments } = req.body;
    if (!enrollments?.length) return res.json({ success: true, inserted: 0 });

    let inserted = 0, skipped = 0, rejected = 0;
    for (const e of enrollments) {
      if (!e.studentId || !e.courseId) { skipped++; continue; }
      // 校验学生必须在总库中
      const [student] = await pool.execute(
        'SELECT id FROM students WHERE id = ? OR student_id = ? LIMIT 1',
        [e.studentId, e.studentId]
      );
      if (student.length === 0) { rejected++; continue; }
      const [exist] = await pool.execute(
        'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
        [e.studentId, e.courseId]
      );
      if (exist.length > 0) { skipped++; continue; }
      await pool.execute(
        'INSERT INTO enrollments (id, student_id, course_id, schedule_id, enroll_date, progress, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [e.id || `enr-${Date.now()}-${inserted}`, e.studentId, e.courseId, e.scheduleId || '', e.enrollDate || '', e.progress || 0, e.status || 'enrolled']
      );
      inserted++;
    }
    res.json({ success: true, message: `导入 ${inserted} 条选课${skipped ? `，跳过 ${skipped} 条` : ''}${rejected ? `，拒绝 ${rejected} 条（不在总库）` : ''}`, inserted, skipped, rejected });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** PUT /api/teaching/students/:id - 更新学生信息（如设置班级） */
router.put('/students/:id', async (req, res) => {
  try {
    const { className, name, phone, email } = req.body;
    const sets = []; const params = [];
    if (className !== undefined) { sets.push('class_name = ?'); params.push(className); }
    if (name !== undefined) { sets.push('name = ?'); params.push(name); }
    if (phone !== undefined) { sets.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { sets.push('email = ?'); params.push(email); }
    if (sets.length === 0) return res.json({ success: true });
    params.push(req.params.id);
    await pool.execute(`UPDATE students SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: '更新成功' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==================== 成绩查询 ====================

/** GET /api/teaching/scores/:courseId - 获取某课程所有成绩 */
router.get('/scores/:courseId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM exam_scores WHERE course_id = ? ORDER BY exam_name',
      [req.params.courseId]
    );
    const scores = rows.map((r) => ({
      id: r.id,
      courseId: r.course_id,
      studentId: r.student_id,
      examName: r.exam_name,
      score: Number(r.score),
      fullScore: r.full_score,
      weight: r.weight,
      type: r.type,
      status: r.status,
      gradedAt: r.graded_at || '',
    }));
    res.json({ success: true, scores });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** GET /api/teaching/scores/student/:studentId - 获取某学生的所有成绩 */
router.get('/scores/student/:studentId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT es.*, c.title AS course_title FROM exam_scores es JOIN courses c ON es.course_id = c.id WHERE es.student_id = ? ORDER BY c.title',
      [req.params.studentId]
    );
    const scores = rows.map((r) => ({
      id: r.id,
      courseId: r.course_id,
      courseTitle: r.course_title,
      studentId: r.student_id,
      examName: r.exam_name,
      score: Number(r.score),
      fullScore: r.full_score,
      weight: r.weight,
      type: r.type,
      status: r.status,
      gradedAt: r.graded_at || '',
    }));
    res.json({ success: true, scores });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==================== 成绩 (Exam Scores) ====================

/** POST /api/teaching/scores/bulk - 批量导入成绩 */
router.post('/scores/bulk', async (req, res) => {
  try {
    const { scores } = req.body;
    if (!scores?.length) return res.json({ success: true, inserted: 0 });

    let inserted = 0, updated = 0;
    for (const s of scores) {
      if (!s.courseId || !s.studentId || !s.examName) continue;
      const [exist] = await pool.execute(
        'SELECT id FROM exam_scores WHERE course_id = ? AND student_id = ? AND exam_name = ?',
        [s.courseId, s.studentId, s.examName]
      );
      if (exist.length > 0) {
        await pool.execute(
          'UPDATE exam_scores SET score = ?, full_score = ?, weight = ?, graded_at = ?, status = ? WHERE id = ?',
          [s.score, s.fullScore || 100, s.weight || 50, s.gradedAt || '', s.status || 'draft', exist[0].id]
        );
        updated++;
      } else {
        await pool.execute(
          'INSERT INTO exam_scores (id, course_id, student_id, exam_name, score, full_score, weight, type, status, graded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [s.id || `score-${Date.now()}-${inserted}`, s.courseId, s.studentId, s.examName, s.score, s.fullScore || 100, s.weight || 50, s.type || 'midterm_exam', s.status || 'draft', s.gradedAt || '']
        );
        inserted++;
      }
    }
    res.json({ success: true, message: `导入 ${inserted} 条，更新 ${updated} 条`, inserted, updated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==================== 分组 (Student Groups) ====================

/** GET /api/teaching/groups/:courseId - 获取某课程分组 */
router.get('/groups/:courseId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM student_groups WHERE course_id = ? ORDER BY id',
      [req.params.courseId]
    );

    const groups = rows.map((row) => {
      let memberIds = [];
      if (Array.isArray(row.member_ids)) {
        memberIds = row.member_ids;
      } else if (typeof row.member_ids === 'string' && row.member_ids.trim()) {
        try {
          const parsed = JSON.parse(row.member_ids);
          memberIds = Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
        } catch {
          memberIds = row.member_ids.split(',').map((id) => id.trim()).filter(Boolean);
        }
      }

      return {
        id: row.id,
        courseId: row.course_id,
        name: row.name,
        memberIds,
      };
    });

    res.json({ success: true, groups });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** POST /api/teaching/groups/sync - 按课程整体同步分组 */
router.post('/groups/sync', async (req, res) => {
  const courseId = String(req.body?.courseId || '').trim();
  const inputGroups = Array.isArray(req.body?.groups) ? req.body.groups : null;

  if (!courseId || inputGroups === null) {
    return res.status(400).json({ success: false, message: 'courseId and groups are required' });
  }

  const groups = inputGroups
    .filter((group) => group && String(group.name || '').trim())
    .map((group, index) => ({
      id: String(group.id || `group-${courseId}-${Date.now()}-${index}`),
      name: String(group.name || '').trim(),
      memberIds: Array.from(new Set(
        Array.isArray(group.memberIds)
          ? group.memberIds.map((id) => String(id)).filter(Boolean)
          : []
      )),
    }));

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM student_groups WHERE course_id = ?', [courseId]);

    for (const group of groups) {
      await connection.execute(
        'INSERT INTO student_groups (id, course_id, name, member_ids) VALUES (?, ?, ?, ?)',
        [group.id, courseId, group.name, JSON.stringify(group.memberIds)]
      );
    }

    await connection.commit();
    res.json({ success: true, courseId, groups });
  } catch (e) {
    await connection.rollback();
    res.status(500).json({ success: false, message: e.message });
  } finally {
    connection.release();
  }
});

/** POST /api/teaching/groups/bulk - 批量导入分组 */
router.post('/groups/bulk', async (req, res) => {
  try {
    const { groups } = req.body;
    if (!groups?.length) return res.json({ success: true, inserted: 0 });

    let inserted = 0;
    for (const g of groups) {
      if (!g.courseId || !g.name) continue;
      const [exist] = await pool.execute(
        'SELECT id FROM student_groups WHERE course_id = ? AND name = ?',
        [g.courseId, g.name]
      );
      if (exist.length > 0) {
        await pool.execute('UPDATE student_groups SET member_ids = ? WHERE id = ?',
          [JSON.stringify(g.memberIds || []), exist[0].id]);
        continue;
      }
      await pool.execute(
        'INSERT INTO student_groups (id, course_id, name, member_ids) VALUES (?, ?, ?, ?)',
        [g.id || `group-${Date.now()}-${inserted}`, g.courseId, g.name, JSON.stringify(g.memberIds || [])]
      );
      inserted++;
    }
    res.json({ success: true, message: `导入 ${inserted} 个分组`, inserted });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
