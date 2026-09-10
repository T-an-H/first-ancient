/**
 * 鉴权中间件
 *
 * - authMiddleware: 全局挂载，校验写接口（POST/PUT/DELETE）的 JWT，读接口（GET/OPTIONS）放行
 * - requireTeacher: 要求教师及以上角色（teacher / admin），用于教学写接口
 */
import jwt from 'jsonwebtoken';
import JWT_SECRET from '../lib/jwt-secret.js';

/** 无需登录即可访问的接口（登录 / 健康检查） */
const PUBLIC_PATHS = [
  '/api/user/login',
  '/api/auth/login',
  '/api/health',
  '/api/assistant/navigate',
];

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return '';
}

export function authMiddleware(req, res, next) {
  // 读接口与 CORS 预检放行
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();

  // 登录等公开接口放行
  if (PUBLIC_PATHS.some((p) => req.originalUrl.startsWith(p))) return next();

  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: '登录凭证无效，请重新登录' });
  }
}

export function requireTeacher(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' });
  }
  if (req.user.role === 'teacher' || req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: '无权限执行该操作' });
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' });
  }
  if (req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: '仅管理员可执行该操作' });
}
