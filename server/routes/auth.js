/**
 * 认证路由：处理学生登录和注册
 *
 * 用 bcryptjs 加密密码，用 jsonwebtoken 生成令牌
 * 登录验证流程：接收用户名密码 → 查数据库 → 比对密码 → 颁发 JWT → 返回
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import JWT_SECRET from '../lib/jwt-secret.js';

const router = Router();

const JWT_EXPIRES = '7d'; // 令牌有效期 7 天

/**
 * POST /api/auth/login - 学生登录
 * 接收: { studentId, password }
 * 返回: { success, token, user }
 */
router.post('/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;

    // 1. 校验必填字段
    if (!studentId || !password) {
      return res.status(400).json({
        success: false,
        message: '请输入学号和密码',
      });
    }

    // 2. 查数据库找学生
    const [rows] = await pool.execute(
      'SELECT id, student_id, name, password, phone, email, class_name, status FROM students WHERE student_id = ?',
      [studentId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '学号或密码错误',
      });
    }

    const student = rows[0];

    // 3. 检查账号状态
    if (student.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: '该账号已被禁用，请联系管理员',
      });
    }

    // 4. 比对密码
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '学号或密码错误',
      });
    }

    // 5. 生成 JWT 令牌
    const token = jwt.sign(
      {
        id: student.id,
        studentId: student.student_id,
        name: student.name,
        role: 'student',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    // 6. 返回成功（不返回密码）
    const { password: _, ...userInfo } = student;
    res.json({
      success: true,
      message: '登录成功',
      token,
      user: userInfo,
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试',
    });
  }
});

/**
 * GET /api/auth/verify - 验证 token 有效性
 * 需要请求头: Authorization: Bearer <token>
 */
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未提供认证令牌' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // 查数据库确认学生仍有效
    const [rows] = await pool.execute(
      'SELECT id, student_id, name, phone, email, class_name, status FROM students WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }

    if (rows[0].status === 'inactive') {
      return res.status(403).json({ success: false, message: '账号已被禁用' });
    }

    res.json({ success: true, user: rows[0] });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '令牌已过期，请重新登录' });
    }
    return res.status(401).json({ success: false, message: '无效的令牌' });
  }
});

export default router;
