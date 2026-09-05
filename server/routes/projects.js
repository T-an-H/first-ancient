import { Router } from 'express';
import pool from '../db.js';

const router = Router();

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseJson(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function mapProject(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    name: row.name,
    hours: Number(row.hours),
    content: row.content || '',
    keyPoints: row.key_points || '',
    knowledgePoints: row.knowledge_points || '',
    orderNo: Number(row.order_no),
    weekNo: row.week_no || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFile(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    fileType: row.file_type,
    name: row.name,
    size: Number(row.size || 0),
    dataUrl: row.data_url || '',
    createdAt: row.created_at,
  };
}

function mapProgress(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    studentId: row.student_id,
    progressType: row.progress_type,
    status: row.status,
    score: row.score == null ? null : Number(row.score),
    comment: row.comment || '',
    attachments: parseJson(row.attachments, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuestionnaire(row) {
  if (!row) return null;
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    questions: parseJson(row.questions, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapResponse(row) {
  return {
    id: row.id,
    questionnaireId: row.questionnaire_id,
    studentId: row.student_id,
    answers: parseJson(row.answers, []),
    createdAt: row.created_at,
  };
}

function ok(res, data = null) { return res.json({ code: 200, msg: 'success', data }); }
function fail(res, error) {
  console.error('[projects]', error);
  return res.status(500).json({ code: 500, msg: error.message || 'request failed' });
}

router.get('/projects', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM course_projects WHERE (? = \'\' OR course_id = ?) ORDER BY order_no, created_at',
      [req.query.courseId || '', req.query.courseId || '']
    );
    return ok(res, rows.map(mapProject));
  } catch (error) { return fail(res, error); }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM course_projects WHERE id = ?', [req.params.id]);
    return ok(res, rows[0] ? mapProject(rows[0]) : null);
  } catch (error) { return fail(res, error); }
});

router.post('/projects', async (req, res) => {
  try {
    const p = req.body || {};
    const projectId = p.id || id('proj');
    await pool.execute(
      `INSERT INTO course_projects
       (id, course_id, name, hours, content, key_points, knowledge_points, order_no, week_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, p.courseId || '', p.name || '', p.hours || 2, p.content || '', p.keyPoints || p.key_points || '', p.knowledgePoints || p.knowledge_points || '', p.orderNo ?? 0, p.weekNo || p.week_no || '']
    );
    const [rows] = await pool.execute('SELECT * FROM course_projects WHERE id = ?', [projectId]);
    return ok(res, mapProject(rows[0]));
  } catch (error) { return fail(res, error); }
});

router.post('/projects/bulk', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const saved = [];
    for (const [index, p] of (Array.isArray(req.body) ? req.body : []).entries()) {
      const projectId = p.id || id('proj');
      await connection.execute(
        `INSERT INTO course_projects
         (id, course_id, name, hours, content, key_points, knowledge_points, order_no, week_no)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [projectId, p.courseId || '', p.name || '', p.hours || 2, p.content || '', p.keyPoints || p.key_points || '', p.knowledgePoints || p.knowledge_points || '', p.orderNo ?? index, p.weekNo || p.week_no || '']
      );
      saved.push(projectId);
    }
    if (saved.length === 0) return ok(res, []);
    const [rows] = await connection.query(`SELECT * FROM course_projects WHERE id IN (${saved.map(() => '?').join(',')}) ORDER BY order_no`, saved);
    return ok(res, rows.map(mapProject));
  } catch (error) { return fail(res, error); }
  finally { connection.release(); }
});

router.put('/projects/:id', async (req, res) => {
  try {
    const p = req.body || {};
    await pool.execute(
      `UPDATE course_projects SET course_id=?, name=?, hours=?, content=?, key_points=?, knowledge_points=?, order_no=COALESCE(?, order_no), week_no=? WHERE id=?`,
      [p.courseId || '', p.name || '', p.hours || 2, p.content || '', p.keyPoints || p.key_points || '', p.knowledgePoints || p.knowledge_points || '', p.orderNo ?? null, p.weekNo || p.week_no || '', req.params.id]
    );
    const [rows] = await pool.execute('SELECT * FROM course_projects WHERE id = ?', [req.params.id]);
    return ok(res, rows[0] ? mapProject(rows[0]) : null);
  } catch (error) { return fail(res, error); }
});

router.delete('/projects/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM course_project_files WHERE project_id = ?', [req.params.id]);
    await pool.execute('DELETE FROM course_project_progress WHERE project_id = ?', [req.params.id]);
    await pool.execute('DELETE FROM course_projects WHERE id = ?', [req.params.id]);
    return ok(res);
  } catch (error) { return fail(res, error); }
});

router.get('/projects/:projectId/files', async (req, res) => {
  try {
    const params = [req.params.projectId];
    let sql = 'SELECT * FROM course_project_files WHERE project_id = ?';
    if (req.query.fileType) { sql += ' AND file_type = ?'; params.push(req.query.fileType); }
    sql += ' ORDER BY created_at, id';
    const [rows] = await pool.execute(sql, params);
    return ok(res, rows.map(mapFile));
  } catch (error) { return fail(res, error); }
});

router.post('/projects/files', async (req, res) => {
  try {
    const f = req.body || {};
    const fileId = f.id || id('pfile');
    await pool.execute(
      'INSERT INTO course_project_files (id, project_id, file_type, name, size, data_url) VALUES (?, ?, ?, ?, ?, ?)',
      [fileId, f.projectId || '', f.fileType || '', f.name || '', f.size || 0, f.dataUrl || f.data_url || '']
    );
    const [rows] = await pool.execute('SELECT * FROM course_project_files WHERE id = ?', [fileId]);
    return ok(res, mapFile(rows[0]));
  } catch (error) { return fail(res, error); }
});

router.delete('/projects/files/:id', async (req, res) => {
  try { await pool.execute('DELETE FROM course_project_files WHERE id = ?', [req.params.id]); return ok(res); }
  catch (error) { return fail(res, error); }
});

// ====== 课程标准（教师上传，学生端同步查看） ======

function mapStandard(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    name: row.name,
    size: Number(row.size || 0),
    dataUrl: row.data_url || '',
    uploader: row.uploader || '',
    createdAt: row.created_at,
  };
}

router.get('/course-standards', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM course_standards WHERE course_id = ? ORDER BY created_at DESC, id',
      [req.query.courseId || '']
    );
    return ok(res, rows.map(mapStandard));
  } catch (error) { return fail(res, error); }
});

router.post('/course-standards', async (req, res) => {
  try {
    const f = req.body || {};
    const fileId = f.id || id('cstd');
    await pool.execute(
      'INSERT INTO course_standards (id, course_id, name, size, data_url, uploader) VALUES (?, ?, ?, ?, ?, ?)',
      [fileId, f.courseId || '', f.name || '', f.size || 0, f.dataUrl || f.data_url || '', f.uploader || '']
    );
    const [rows] = await pool.execute('SELECT * FROM course_standards WHERE id = ?', [fileId]);
    return ok(res, mapStandard(rows[0]));
  } catch (error) { return fail(res, error); }
});

router.delete('/course-standards/:id', async (req, res) => {
  try { await pool.execute('DELETE FROM course_standards WHERE id = ?', [req.params.id]); return ok(res); }
  catch (error) { return fail(res, error); }
});

router.get('/projects/:projectId/progress', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM course_project_progress WHERE project_id = ? ORDER BY created_at, id', [req.params.projectId]);
    return ok(res, rows.map(mapProgress));
  } catch (error) { return fail(res, error); }
});

router.post('/projects/:projectId/progress', async (req, res) => {
  try {
    const p = req.body || {};
    const [existing] = await pool.execute(
      'SELECT id FROM course_project_progress WHERE project_id=? AND student_id=? AND progress_type=?',
      [req.params.projectId, p.studentId || '', p.progressType || '']
    );
    const progressId = existing[0]?.id || p.id || id('pprog');
    await pool.execute(
      `INSERT INTO course_project_progress
       (id, project_id, student_id, progress_type, status, score, comment, attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status=VALUES(status), score=COALESCE(VALUES(score), score), comment=VALUES(comment), attachments=VALUES(attachments)`,
      [progressId, req.params.projectId, p.studentId || '', p.progressType || '', p.status || '', p.score ?? null, p.comment || '', JSON.stringify(p.attachments || [])]
    );
    const [rows] = await pool.execute('SELECT * FROM course_project_progress WHERE id = ?', [progressId]);
    return ok(res, mapProgress(rows[0]));
  } catch (error) { return fail(res, error); }
});

router.put('/projects/progress/:id', async (req, res) => {
  try {
    await pool.execute('UPDATE course_project_progress SET score=?, comment=?, status=\'graded\' WHERE id=?', [req.body?.score ?? null, req.body?.comment || '', req.params.id]);
    const [rows] = await pool.execute('SELECT * FROM course_project_progress WHERE id = ?', [req.params.id]);
    return ok(res, rows[0] ? mapProgress(rows[0]) : null);
  } catch (error) { return fail(res, error); }
});

router.get('/questionnaire', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM course_eval_questionnaires WHERE course_id = ?', [req.query.courseId || '']);
    return ok(res, mapQuestionnaire(rows[0]));
  } catch (error) { return fail(res, error); }
});

router.post('/questionnaire', async (req, res) => {
  try {
    const q = req.body || {};
    const [existing] = await pool.execute('SELECT id FROM course_eval_questionnaires WHERE course_id = ?', [q.courseId || '']);
    const questionnaireId = existing[0]?.id || q.id || id('qnr');
    await pool.execute(
      `INSERT INTO course_eval_questionnaires (id, course_id, title, questions) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), questions=VALUES(questions)`,
      [questionnaireId, q.courseId || '', q.title || '', JSON.stringify(q.questions || [])]
    );
    const [rows] = await pool.execute('SELECT * FROM course_eval_questionnaires WHERE id = ?', [questionnaireId]);
    return ok(res, mapQuestionnaire(rows[0]));
  } catch (error) { return fail(res, error); }
});

router.delete('/questionnaire/:id', async (req, res) => {
  try { await pool.execute('DELETE FROM course_eval_responses WHERE questionnaire_id=?', [req.params.id]); await pool.execute('DELETE FROM course_eval_questionnaires WHERE id=?', [req.params.id]); return ok(res); }
  catch (error) { return fail(res, error); }
});

router.get('/questionnaire/:id/responses', async (req, res) => {
  try { const [rows] = await pool.execute('SELECT * FROM course_eval_responses WHERE questionnaire_id=? ORDER BY created_at, id', [req.params.id]); return ok(res, rows.map(mapResponse)); }
  catch (error) { return fail(res, error); }
});

router.post('/questionnaire/:id/responses', async (req, res) => {
  try {
    const r = req.body || {};
    const [existing] = await pool.execute('SELECT id FROM course_eval_responses WHERE questionnaire_id=? AND student_id=?', [req.params.id, r.studentId || '']);
    const responseId = existing[0]?.id || r.id || id('resp');
    await pool.execute(
      `INSERT INTO course_eval_responses (id, questionnaire_id, student_id, answers) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE answers=VALUES(answers)`,
      [responseId, req.params.id, r.studentId || '', JSON.stringify(r.answers || [])]
    );
    const [rows] = await pool.execute('SELECT * FROM course_eval_responses WHERE id=?', [responseId]);
    return ok(res, mapResponse(rows[0]));
  } catch (error) { return fail(res, error); }
});

export default router;
