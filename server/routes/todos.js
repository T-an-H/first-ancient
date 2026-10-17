/**
 * 待办路由（用户私有数据）
 *
 * 挂在 /api/todos，全局 authMiddleware 已保证写接口需 JWT、GET 放行——
 * 但本模块的每个接口都自己解析 token 拿 created_by，不信任前端传参，
 * 避免「随便传个 createdBy 就能读别人待办」的越权（原 routes/extra.js 有此问题）。
 *
 * 表：todos（复数），建表见 bootstrap/ensureExtraSchema.js。
 * 前端把整个待办列表（含自动派生的 auto-* 项与其完成/删除状态）全量同步过来，
 * 登录时再拉回，实现跨设备保留。
 */
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import JWT_SECRET from '../lib/jwt-secret.js';

const router = Router();

/** 从 Authorization: Bearer <token> 解析当前用户，失败返回 null */
function currentUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // created_by 存 users.name（与前端 TodoItem.createdBy 及 TodoList 的
    // createdBy === currentUser 过滤口径一致）；name 缺失时退回 account，再退回 id
    const owner = decoded.name || decoded.account || String(decoded.id ?? '');
    return owner ? { id: decoded.id, owner } : null;
  } catch {
    return null;
  }
}

/** 统一注入 created_by，忽略请求体里的同名值 */
function normalizeTodo(raw, owner) {
  return {
    id: String(raw?.id || '').trim(),
    title: String(raw?.title ?? '').trim(),
    completed: raw?.completed ? 1 : 0,
    createdAt: String(raw?.createdAt ?? ''),
    dueDate: String(raw?.dueDate ?? ''),
    createdBy: owner,
  };
}

/**
 * GET /api/todos — 当前用户的全部待办
 *
 * 注意是 GET：authMiddleware 会放行不校验 JWT，所以这里必须自己解析 token；
 * 解析不到就 401（不能退化成"无过滤返回全表"）。
 */
router.get('/', async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, title, completed, created_at, due_date, created_by FROM todos WHERE created_by = ? ORDER BY created_at, id',
      [user.owner]
    );
    res.json({
      success: true,
      todos: rows.map((r) => ({
        id: r.id,
        title: r.title,
        completed: !!r.completed,
        createdAt: r.created_at || '',
        dueDate: r.due_date || '',
        createdBy: r.created_by || '',
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/todos/sync — 全量对账当前用户的待办
 *
 * 事务内：删除该用户不在列表中的行 → REPLACE 列表中的行。
 * 前端是唯一写入方，整表覆盖即可，无需逐条 diff。
 *
 * ⚠️ 只允许操作 created_by = 当前用户 的行，不能碰到别人的待办。
 */
router.post('/sync', async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' });
  }

  const list = Array.isArray(req.body?.todos) ? req.body.todos : null;
  if (!list) {
    return res.status(400).json({ success: false, message: 'todos 必须是数组' });
  }

  // 丢弃无 id / 无标题的空行，避免写入脏数据
  const rows = list
    .map((item) => normalizeTodo(item, user.owner))
    .filter((item) => item.id && item.title);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      await connection.query(
        `DELETE FROM todos WHERE created_by = ? AND id NOT IN (${ids.map(() => '?').join(',')})`,
        [user.owner, ...ids]
      );
    } else {
      await connection.query('DELETE FROM todos WHERE created_by = ?', [user.owner]);
    }

    for (const row of rows) {
      await connection.execute(
        `REPLACE INTO todos (id, title, completed, created_at, due_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [row.id, row.title, row.completed, row.createdAt, row.dueDate, row.createdBy]
      );
    }

    await connection.commit();
    res.json({ success: true, synced: rows.length });
  } catch (e) {
    try { await connection.rollback(); } catch { /* no-op */ }
    res.status(500).json({ success: false, message: e.message });
  } finally {
    connection.release();
  }
});

export default router;
