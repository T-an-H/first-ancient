/**
 * 共享鉴权校验：JWT 解码 + 校验 token_version 与库一致。
 * 改密后 token_version 自增，旧 token 的 tv 与库不一致 → 视为失效。
 */
import jwt from 'jsonwebtoken';
import JWT_SECRET from './jwt-secret.js';
import pool from '../db.js';

/**
 * 校验请求的 Bearer token，返回 decoded 用户对象或 null。
 * null 表示未登录/过期/被踢下线。
 */
export async function verifyAuth(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
  // 校验 token_version（若库里已自增，旧 token 失效）
  try {
    const [rows] = await pool.query(
      'SELECT token_version FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );
    if (rows.length === 0) return null;
    const dbTv = Number(rows[0].token_version) || 0;
    const tokenTv = Number(decoded.tv) || 0;
    if (dbTv !== tokenTv) return null;
  } catch {
    return null;
  }
  return decoded;
}
