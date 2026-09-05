/**
 * 评价管理路由
 */
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

function formatDateValue(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value);
}

function mapEvaluationRow(row) {
  let items = [];
  if (row.items) {
    try {
      items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
    } catch {
      items = [];
    }
  }
  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    sessionNumber: Number(row.session_number || 0),
    type: row.type,
    score: Number(row.score || 0),
    items: Array.isArray(items) ? items : [],
    evaluatorId: row.evaluator_id || '',
    evaluatorName: row.evaluator_name || '',
    comment: row.comment || '',
    createdAt: formatDateValue(row.created_at),
  };
}

function mapSubmittedEvalKey(row) {
  return `${row.course_id}||${row.student_id}||${row.session_number}||${row.type}`;
}

router.get('/course/:courseId', async (req, res) => {
  try {
    const [evaluationRows] = await pool.execute(
      'SELECT * FROM evaluations WHERE course_id = ? ORDER BY session_number, created_at, id',
      [req.params.courseId]
    );
    const [submittedRows] = await pool.execute(
      'SELECT course_id, student_id, session_number, type FROM teacher_submitted_evals WHERE course_id = ?',
      [req.params.courseId]
    );

    res.json({
      success: true,
      evaluations: evaluationRows.map(mapEvaluationRow),
      teacherSubmittedEvals: submittedRows.map(mapSubmittedEvalKey),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ==================== 评价配置 ====================

/** GET /api/eval/config/:courseId - 获取评价配置 */
router.get('/config/:courseId', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM eval_configs WHERE course_id = ?', [req.params.courseId]);
    if (rows.length === 0) return res.json({ success: true, config: null });
    const c = rows[0];
    res.json({ success: true, config: {
      courseId: c.course_id,
      template: c.template,
      frequency: c.frequency,
      customSessions: c.custom_sessions,
      hasMentor: !!c.has_mentor,
      overdueRule: c.overdue_rule,
    }});
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** POST /api/eval/config - 保存评价配置 */
router.post('/config', async (req, res) => {
  try {
    const { courseId, template, frequency, customSessions, hasMentor, overdueRule } = req.body;
    await pool.execute(
      'REPLACE INTO eval_configs (course_id, template, frequency, custom_sessions, has_mentor, overdue_rule) VALUES (?, ?, ?, ?, ?, ?)',
      [courseId, template, frequency, customSessions || null, hasMentor ? 1 : 0, overdueRule]
    );
    res.json({ success: true, message: '保存成功' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==================== 评价记录 ====================

/** POST /api/eval/save - 保存一条评价 */
router.post('/save', async (req, res) => {
  try {
    const { id, courseId, studentId, sessionNumber, type, score, items, evaluatorId, evaluatorName, comment, createdAt } = req.body;
    await pool.execute(
      'REPLACE INTO evaluations (id, course_id, student_id, session_number, type, score, items, evaluator_id, evaluator_name, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, courseId, studentId, sessionNumber, type, score, items ? JSON.stringify(items) : null, evaluatorId || '', evaluatorName || '', comment || '', createdAt || '']
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** POST /api/eval/batch - 批量保存评价 */
router.post('/batch', async (req, res) => {
  try {
    const { evaluations } = req.body;
    if (!evaluations?.length) return res.json({ success: true, count: 0 });
    for (const e of evaluations) {
      await pool.execute(
        'REPLACE INTO evaluations (id, course_id, student_id, session_number, type, score, items, evaluator_id, evaluator_name, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [e.id, e.courseId, e.studentId, e.sessionNumber, e.type, e.score, e.items ? JSON.stringify(e.items) : null, e.evaluatorId || '', e.evaluatorName || '', e.comment || '', e.createdAt || '']
      );
    }
    res.json({ success: true, count: evaluations.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** DELETE /api/eval/:id - 删除一条评价 */
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM evaluations WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==================== 提交标记 ====================

/** POST /api/eval/submit - 标记教师评价已提交 */
router.post('/submit', async (req, res) => {
  try {
    const { courseId, studentId, sessionNumber, type } = req.body;
    const id = `${courseId}||${studentId}||${sessionNumber}||${type}`;
    await pool.execute(
      'REPLACE INTO teacher_submitted_evals (id, course_id, student_id, session_number, type) VALUES (?, ?, ?, ?, ?)',
      [id, courseId, studentId, sessionNumber, type]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==================== 评价提醒 ====================

/** POST /api/eval/reminders - 批量保存提醒 */
router.post('/reminders', async (req, res) => {
  try {
    const { reminders } = req.body;
    if (!reminders?.length) return res.json({ success: true });
    for (const r of reminders) {
      await pool.execute(
        'REPLACE INTO eval_reminders (id, course_id, course_title, student_id, session_number, deadline, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.courseId, r.courseTitle || '', r.studentId, r.sessionNumber, r.deadline || '', r.status || 'pending']
      );
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** PUT /api/eval/reminders/:id - 更新提醒状态 */
router.put('/reminders/:id', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.execute('UPDATE eval_reminders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
