/**
 * 鉴权中间件
 *
 * - authMiddleware: 全局挂载，校验写接口（POST/PUT/DELETE）的 JWT，读接口（GET/OPTIONS）放行
 * - requireTeacher: 要求教师及以上角色（teacher / admin），用于教学写接口
 */
import jwt from 'jsonwebtoken';
import JWT_SECRET from '../lib/jwt-secret.js';

/**
 * 无需登录即可访问的接口（登录 / 健康检查）
 *
 * 注意：`/api/assistant/navigate` 曾在此白名单内，导致任何人（含未登录）
 * 都能调用大模型接口、白烧 DeepSeek 额度。现已移出——小智只挂在
 * Layout 内、登录后才会出现，因此要求登录不影响使用（见 routes/assistant.js 的限流）。
 */
const PUBLIC_PATHS = [
  '/api/user/login',
  '/api/auth/login',
  '/api/health',
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

/**
 * requireStaff: 教职工及以上（管理员 / 教师 / 企业导师 / 学院领导），学生不可。
 *
 * 与 requireTeacher 的区别：光看 role 会漏人。
 * - 企业导师是 role='teacher', sub_role='mentor'
 * - 学院领导是 role='teacher', sub_role='leader'，但也存在 role='leader' 的纯领导
 *   （见 routes/user.js 的 getPortal 对 role==='leader' 的显式处理）
 * 所以这里 role 与 sub_role 都要认。
 *
 * ⚠️ 只应挂到写路由上（router.post/put/patch/delete），不要整表挂到 app.use：
 * authMiddleware 放行 GET 时不写 req.user，整表挂会让所有 GET 列表被这里的
 * `!req.user` 判成 401（requireAdmin 例外，它内部会自行补验 token）。
 */
export function requireStaff(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' });
  }
  const { role, sub_role } = req.user;
  if (
    role === 'admin' ||
    role === 'teacher' ||
    role === 'leader' ||
    sub_role === 'mentor' ||
    sub_role === 'leader'
  ) {
    return next();
  }
  return res.status(403).json({ success: false, message: '无权限执行该操作' });
}

export function requireAdmin(req, res, next) {
  // authMiddleware 跳过了 GET 请求的 JWT 校验，这里补验
  if (!req.user) {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录或登录已过期' });
    }
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: '登录凭证无效，请重新登录' });
    }
  }
  if (req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: '仅管理员可执行该操作' });
}
