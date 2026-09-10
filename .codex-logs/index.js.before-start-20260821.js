/**
 * 服务器入口文件
 *
 * 启动 Express 服务器，注册中间件和路由
 */
import express from 'express';
import cors from 'cors';
import { authMiddleware, requireTeacher } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import studentRoutes from './routes/students.js';
import scheduleRoutes from './routes/schedules.js';
import categoryRoutes from './routes/categories.js';
import courseRoutes from './routes/courses.js';
import teachingRoutes from './routes/teaching.js';
import extraRoutes from './routes/extra.js';
import taskRoutes from './routes/tasks.js';

const app = express();
const PORT = 3000;

// ====== 中间件 ======

// CORS：允许前端跨域请求（开发时前端在 localhost:5173）
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:4173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// 解析 JSON 请求体
app.use(express.json());

// ====== 鉴权中间件 ======
// 写接口（POST/PUT/DELETE）校验 JWT，登录/注册/健康检查等公开接口与读接口放行
app.use('/api', authMiddleware);

// ====== 路由 ======

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 认证路由（旧，学生专用）
app.use('/api/auth', authRoutes);

// 统一登录路由（所有角色）
app.use('/api/user', userRoutes);

// 学生管理路由（管理员用）
app.use('/api/students', studentRoutes);

// 排课管理路由
app.use('/api/schedules', scheduleRoutes);

// 分类管理路由
app.use('/api/categories', categoryRoutes);

// 课程数据路由
app.use('/api/courses', courseRoutes);

// 教学数据路由（选课/成绩/分组）——写操作要求教师及以上角色
app.use('/api/teaching', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();
  return requireTeacher(req, res, next);
}, teachingRoutes);

// 课程任务路由（教师布置/学生提交/教师导师评分）
app.use('/api/tasks', taskRoutes);

// 教师端扩展数据路由（待办/笔记/在线文档/AI分层）——写操作要求教师及以上角色
app.use('/api/teaching', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();
  return requireTeacher(req, res, next);
}, extraRoutes);

// ====== 启动服务器 ======
app.listen(PORT, () => {
  console.log(`✅ 后端服务已启动！`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  登录API: http://localhost:${PORT}/api/auth/login`);
  console.log(`  注册API: http://localhost:${PORT}/api/auth/register`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
});
