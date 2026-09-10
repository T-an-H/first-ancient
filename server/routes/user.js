/**
 * 统一登录路由
 *
 * 根据 account（手机号）或 user_no（学号/工号）查询 users 表，
 * 自动判断角色并返回跳转地址。支持防爆破和首登强制改密。
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import JWT_SECRET, { JWT_EXPIRES } from '../lib/jwt-secret.js';

const router = Router();

const MAX_FAIL_COUNT = 5;
const LOCK_MINUTES = 15;

function getPortal(role, subRole) {
  if (role === 'admin') return '/admin/schedules';
  if (role === 'teacher') {
    if (subRole === 'mentor') return '/mentor/courses';
    if (subRole === 'leader') return '/leader/courses';
    return '/teacher/courses';
  }
  if (role === 'student') return '/student/courses';
  if (role === 'leader') return '/leader/courses';
  return '/';
}

/**
 * POST /api/user/login - 统一登录
 * 接收: { account, password }  account 可以是手机号或学号/工号
 * 返回: { success, token, user, portal, need_change_password }
 */
router.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body;

    if (!account || !password) {
      return res.status(400).json({ success: false, message: '请输入账号和密码' });
    }

    // 多标识查询：手机号(account) 或 学号/工号(user_no)
    const [rows] = await pool.query(
      `SELECT id, account, name, department, role, sub_role, status, password,
              user_no, need_change_password, fail_count, lock_until
       FROM users
       WHERE account = ? OR user_no = ?
       LIMIT 1`,
      [account, account]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: '账号或密码错误' });
    }

    const user = rows[0];

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: '该账号已被禁用' });
    }

    // 防爆破：检查锁定
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      const remain = Math.ceil((new Date(user.lock_until) - new Date()) / 60000);
      return res.status(423).json({
        success: false,
        message: `账号已锁定，请 ${remain} 分钟后再试`,
        code: 'ACCOUNT_LOCKED',
      });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // 累加失败次数
      const newFailCount = (user.fail_count || 0) + 1;
      if (newFailCount >= MAX_FAIL_COUNT) {
        await pool.query(
          'UPDATE users SET fail_count = ?, lock_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
          [newFailCount, LOCK_MINUTES, user.id]
        );
        return res.status(423).json({
          success: false,
          message: `密码错误次数过多，账号已锁定 ${LOCK_MINUTES} 分钟`,
          code: 'ACCOUNT_LOCKED',
        });
      }
      await pool.query('UPDATE users SET fail_count = ? WHERE id = ?', [newFailCount, user.id]);
      return res.status(401).json({
        success: false,
        message: `账号或密码错误（还剩 ${MAX_FAIL_COUNT - newFailCount} 次机会）`,
      });
    }

    // 登录成功：清零失败次数，写最近登录时间
    await pool.query(
      'UPDATE users SET fail_count = 0, lock_until = NULL, last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    // 生成 JWT
    const token = jwt.sign(
      { id: user.id, account: user.account, name: user.name, role: user.role, sub_role: user.sub_role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    const portal = getPortal(user.role, user.sub_role);
    const hasTeacherAccess = user.role === 'teacher';
    const needChangePassword = Number(user.need_change_password) === 1;

    res.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        account: user.account,
        name: user.name,
        department: user.department || '',
        role: user.role,
        sub_role: user.sub_role,
        isTeacher: hasTeacherAccess,
        userNo: user.user_no || '',
      },
      portal,
      need_change_password: needChangePassword,
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * POST /api/user/change-password - 修改密码（首登强制改密 / 日常改密）
 * 需 JWT，接收: { newPassword, oldPassword? }
 * 有 oldPassword 时先验旧密码（登录后改密场景）；无则跳过（首登场景）
 */
router.post('/change-password', async (req, res) => {
  try {
    // 自行校验 JWT（authMiddleware 尚未全局挂载）
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: '登录凭证无效，请重新登录' });
    }

    const newPassword = String(req.body?.newPassword || '');
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: '新密码至少 8 位' });
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({ success: false, message: '新密码需同时包含字母和数字' });
    }

    // 有 oldPassword 时先验旧密码（登录后改密场景）
    const oldPassword = String(req.body?.oldPassword || '');
    if (oldPassword) {
      const [userRows] = await pool.query(
        'SELECT password FROM users WHERE id = ? LIMIT 1',
        [decoded.id]
      );
      if (userRows.length === 0) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }
      const isOldMatch = await bcrypt.compare(oldPassword, userRows[0].password);
      if (!isOldMatch) {
        return res.status(400).json({ success: false, message: '旧密码不正确' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password = ?, need_change_password = 0 WHERE id = ?',
      [hashedPassword, decoded.id]
    );

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('改密错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export default router;
