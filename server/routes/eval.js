/**
 * 评价管理路由
 */
import { Router } from 'express';
import pool from '../db.js';
import { syncDetailedGradesFromEvaluations, EVAL_TYPE_TO_COLUMN } from '../lib/detailedGrades.js';

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

/**
 * 评价写入/删除后自动回填成绩明细（detailed_grade）
 *
 * 为什么挂在写入侧：个人中心的「能力雷达」「职业方向推荐」读的是 detailed_grade，
 * 而它依赖 evaluations 聚合。此前没有任何调用方触发聚合（前端只更新 localStorage、
 * 后端 /detailed-grades/sync 无人调用），导致线上有 1155 条评价、detailed_grade 却全空，
 * 两个模块永远显示空态。
 *
 * 除了聚合，还要把「已无评价的类型」对应的列清零 —— 聚合只写有数据的列，
 * 删除最后一条评价后旧值会残留，导致图不随数据减少而更新。
 *
 * 放在响应前 await：保证「评价一产生，成绩明细即更新」，前端随后拉取就能拿到。
 * 失败不影响评价本身落库。
 */
async function syncGradesAfterEvalWrite(courseId, studentId = '') {
  if (!courseId) return
  let connection
  try {
    connection = await pool.getConnection()
    await syncDetailedGradesFromEvaluations(connection, courseId, studentId)
    await clearStaleEvalColumns(connection, courseId, studentId)
  } catch (e) {
    console.warn('评价写入后回填成绩明细失败（评价已保存）:', e.message)
  } finally {
    connection?.release()
  }
}

/**
 * 把「该学生该课程下已无评价」的五类列清空。
 *
 * 例：删掉最后一条 self 评价后，self_eval_score 应归零/清空，
 * 否则雷达与职业推荐会继续沿用已删除评价的旧分数。
 */
async function clearStaleEvalColumns(connection, courseId, studentId) {
  if (!courseId) return
  const params = [courseId]
  let filter = ''
  if (studentId) { filter = ' AND student_id = ?'; params.push(studentId) }

  const [rows] = await connection.query(
    `SELECT student_id, type FROM evaluations
     WHERE course_id = ?${filter}
     GROUP BY student_id, type`,
    params
  )
  // 每个学生实际拥有的评价类型
  const have = new Map()
  for (const r of rows) {
    const sid = String(r.student_id || '')
    if (!sid) continue
    if (!have.has(sid)) have.set(sid, new Set())
    have.get(sid).add(r.type)
  }

  // 明细里出现过的学生（含已无任何评价的）
  const detailParams = [courseId]
  let detailFilter = ''
  if (studentId) { detailFilter = ' AND student_id = ?'; detailParams.push(studentId) }
  const [details] = await connection.query(
    `SELECT student_id FROM detailed_grade WHERE course_id = ?${detailFilter}`,
    detailParams
  )

  for (const d of details) {
    const sid = String(d.student_id || '')
    const owned = have.get(sid) || new Set()
    const staleCols = Object.entries(EVAL_TYPE_TO_COLUMN)
      .filter(([evalType]) => !owned.has(evalType))
      .map(([, column]) => column)
    if (staleCols.length === 0) continue
    await connection.query(
      `UPDATE detailed_grade SET ${staleCols.map((c) => `${c} = NULL`).join(', ')}
       WHERE course_id = ? AND student_id = ?`,
      [courseId, sid]
    )
  }
}

/** POST /api/eval/save - 保存一条评价 */
router.post('/save', async (req, res) => {
  try {
    const { id, courseId, studentId, sessionNumber, type, score, items, evaluatorId, evaluatorName, comment, createdAt } = req.body;
    await pool.execute(
      'REPLACE INTO evaluations (id, course_id, student_id, session_number, type, score, items, evaluator_id, evaluator_name, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, courseId, studentId, sessionNumber, type, score, items ? JSON.stringify(items) : null, evaluatorId || '', evaluatorName || '', comment || '', createdAt || '']
    );
    // 只回填该学生，避免每次保存都聚合整门课
    await syncGradesAfterEvalWrite(courseId, studentId);
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
    // 批量后按「课程+学生」去重回填，避免同一学生重复聚合
    const targets = new Map();
    for (const e of evaluations) {
      if (e?.courseId && e?.studentId) targets.set(`${e.courseId}||${e.studentId}`, [e.courseId, e.studentId]);
    }
    for (const [courseId, studentId] of targets.values()) {
      await syncGradesAfterEvalWrite(courseId, studentId);
    }
    res.json({ success: true, count: evaluations.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** DELETE /api/eval/:id - 删除一条评价 */
router.delete('/:id', async (req, res) => {
  try {
    // 先取出该评价归属，删除后按同样的课程/学生回填
    const [rows] = await pool.execute(
      'SELECT course_id, student_id FROM evaluations WHERE id = ? LIMIT 1',
      [req.params.id]
    );
    await pool.execute('DELETE FROM evaluations WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      await syncGradesAfterEvalWrite(rows[0].course_id, rows[0].student_id);
    }
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
