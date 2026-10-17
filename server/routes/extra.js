/**
 * 教师端扩展数据路由：待办 / 笔记 / AI分层
 *
 * 对应新增数据库表：todos、notes、student_tiers
 * （建表脚本见 server/sql/schema_extra.sql，数据库 course_platform）
 * 与 Java 后端(course_db, 8080) 的接口路径保持一致：/api/teaching/...
 */
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// ==================== 待办事项 (Todos) ====================

/** GET /api/teaching/todos?createdBy=xxx - 待办列表（可按创建人过滤） */
router.get('/todos', async (req, res) => {
  try {
    const { createdBy } = req.query;
    let sql = 'SELECT * FROM todos';
    const params = [];
    if (createdBy) { sql += ' WHERE created_by = ?'; params.push(createdBy); }
    sql += ' ORDER BY due_date, created_at';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, todos: rows.map((r) => ({
      id: r.id,
      title: r.title,
      completed: !!r.completed,
      createdAt: r.created_at || '',
      dueDate: r.due_date || '',
      createdBy: r.created_by || '',
    })) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** POST /api/teaching/todos - 新增待办 */
router.post('/todos', async (req, res) => {
  try {
    const { id, title, completed, createdAt, dueDate, createdBy } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title 必填' });
    const todoId = id || `todo-${Date.now()}`;
    await pool.execute(
      'INSERT INTO todos (id, title, completed, created_at, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [todoId, title, completed ? 1 : 0, createdAt || '', dueDate || '', createdBy || '']
    );
    res.json({ success: true, id: todoId });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** PUT /api/teaching/todos/:id - 更新待办（标题/完成状态/截止时间） */
router.put('/todos/:id', async (req, res) => {
  try {
    const { title, completed, dueDate } = req.body;
    const sets = []; const params = [];
    if (title !== undefined) { sets.push('title = ?'); params.push(title); }
    if (completed !== undefined) { sets.push('completed = ?'); params.push(completed ? 1 : 0); }
    if (dueDate !== undefined) { sets.push('due_date = ?'); params.push(dueDate); }
    if (sets.length === 0) return res.json({ success: true });
    params.push(req.params.id);
    await pool.execute(`UPDATE todo SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** DELETE /api/teaching/todos/:id - 删除待办 */
router.delete('/todos/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM todos WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==================== 笔记 (Notes) ====================

/** GET /api/teaching/notes?createdBy=xxx - 笔记列表 */
router.get('/notes', async (req, res) => {
  try {
    const { createdBy } = req.query;
    let sql = 'SELECT * FROM notes';
    const params = [];
    if (createdBy) { sql += ' WHERE created_by = ?'; params.push(createdBy); }
    sql += ' ORDER BY updated_at DESC';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, notes: rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content || '',
      createdAt: r.created_at || '',
      updatedAt: r.updated_at || '',
      createdBy: r.created_by || '',
      attachments: r.attachments ? JSON.parse(r.attachments) : [],
    })) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** POST /api/teaching/notes - 新增笔记 */
router.post('/notes', async (req, res) => {
  try {
    const { id, title, content, createdAt, updatedAt, createdBy, attachments } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title 必填' });
    const noteId = id || `note-${Date.now()}`;
    const now = updatedAt || createdAt || new Date().toISOString();
    await pool.execute(
      'INSERT INTO notes (id, title, content, created_at, updated_at, created_by, attachments) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [noteId, title, content || '', createdAt || now, now, createdBy || '', attachments ? JSON.stringify(attachments) : null]
    );
    res.json({ success: true, id: noteId });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** PUT /api/teaching/notes/:id - 更新笔记 */
router.put('/notes/:id', async (req, res) => {
  try {
    const { title, content, updatedAt, attachments } = req.body;
    const sets = []; const params = [];
    if (title !== undefined) { sets.push('title = ?'); params.push(title); }
    if (content !== undefined) { sets.push('content = ?'); params.push(content); }
    if (updatedAt !== undefined) { sets.push('updated_at = ?'); params.push(updatedAt); }
    if (attachments !== undefined) { sets.push('attachments = ?'); params.push(JSON.stringify(attachments)); }
    if (sets.length === 0) return res.json({ success: true });
    params.push(req.params.id);
    await pool.execute(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** DELETE /api/teaching/notes/:id - 删除笔记 */
router.delete('/notes/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM notes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==================== AI 分层记录 (Student Tiers) ====================

/** GET /api/teaching/student-tiers?courseId=&studentId= - 分层记录列表 */
router.get('/student-tiers', async (req, res) => {
  try {
    const { courseId, studentId } = req.query;
    let sql = 'SELECT * FROM student_tiers';
    const params = [];
    const where = [];
    if (courseId) { where.push('course_id = ?'); params.push(courseId); }
    if (studentId) { where.push('student_id = ?'); params.push(studentId); }
    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, tiers: rows.map((r) => ({
      id: r.id,
      courseId: r.course_id,
      studentId: r.student_id,
      tier: r.tier,
      score: Number(r.score),
      createdAt: r.created_at || '',
    })) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** POST /api/teaching/student-tiers - 保存分层记录（同课程+学生 upsert） */
router.post('/student-tiers', async (req, res) => {
  try {
    const { id, courseId, studentId, tier, score, createdAt } = req.body;
    if (!courseId || !studentId) return res.status(400).json({ success: false, message: 'courseId/studentId 必填' });
    const tierId = id || `tier-${Date.now()}`;
    await pool.execute(
      'REPLACE INTO student_tiers (id, course_id, student_id, tier, score, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [tierId, courseId, studentId, tier || 'basic', score ?? 0, createdAt || '']
    );
    res.json({ success: true, id: tierId });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** PUT /api/teaching/student-tiers/:id - 更新分层记录 */
router.put('/student-tiers/:id', async (req, res) => {
  try {
    const { tier, score } = req.body;
    const sets = []; const params = [];
    if (tier !== undefined) { sets.push('tier = ?'); params.push(tier); }
    if (score !== undefined) { sets.push('score = ?'); params.push(score); }
    if (sets.length === 0) return res.json({ success: true });
    params.push(req.params.id);
    await pool.execute(`UPDATE student_tiers SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/** DELETE /api/teaching/student-tiers/:id - 删除分层记录 */
router.delete('/student-tiers/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM student_tiers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
