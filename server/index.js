/**
 * 服务器入口文件
 *
 * 启动 Express 服务器，注册中间件和路由
 */
import './load-env.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import departmentRoutes from './routes/departments.js';
import classRoutes from './routes/classes.js';
import studentRoutes from './routes/students.js';
import teacherRoutes from './routes/teachers.js';
import scheduleRoutes from './routes/schedules.js';
import categoryRoutes from './routes/categories.js';
import courseRoutes from './routes/courses.js';
import teachingRoutes from './routes/teaching.js';
import evalRoutes from './routes/eval.js';
import homeworkRoutes from './routes/homeworks.js';
import tierTestRoutes from './routes/tierTest.js';
import assistantRoutes from './routes/assistant.js';
import { warmAssistantModel } from './assistant-agent.js';
import qualityEvaluationRoutes from './routes/qualityEvaluations.js';
import ensureAdminSchema from './bootstrap/ensureAdminSchema.js';
import ensureProjectSchema from './bootstrap/ensureProjectSchema.js';
import projectRoutes from './routes/projects.js';
import accountRoutes from './routes/accounts.js';
import { authMiddleware, requireAdmin } from './middleware/auth.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5177',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5177',
];
const ENV_CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];
const CORS_ORIGINS = [...new Set([...DEFAULT_CORS_ORIGINS, ...ENV_CORS_ORIGINS])];

// ====== 中间件 ======

// CORS：允许前端跨域请求（开发时前端在 localhost:5173）
app.use(cors({
  origin(origin, callback) {
    if (!origin || CORS_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

// 解析 JSON 请求体
app.use(express.json({ limit: '12mb' }));

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
app.use('/api/departments', departmentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);

// 排课管理路由
app.use('/api/schedules', scheduleRoutes);

// 分类管理路由
app.use('/api/categories', categoryRoutes);

// 课程数据路由
app.use('/api/courses', courseRoutes);

// 教学数据路由（选课/成绩/分组）
app.use('/api/teaching', teachingRoutes);

// 评价管理路由
app.use('/api/eval', evalRoutes);

// 作业管理路由（含AI出题/批改）
app.use('/api/homeworks', homeworkRoutes);
app.use('/api/quality-evaluations', qualityEvaluationRoutes);

// AI 分层测试路由
app.use('/api/tier-test', tierTestRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api', projectRoutes);

// 账号管理路由（仅管理员，需 JWT + admin 角色）
app.use('/api/accounts', authMiddleware, requireAdmin, accountRoutes);

// ====== 启动服务器 ======
async function start() {
  await ensureAdminSchema();
  await ensureProjectSchema();

  app.listen(PORT, () => {
    void warmAssistantModel();
    console.log(`✅ 后端服务已启动！`);
    console.log(`  地址: http://localhost:${PORT}`);
    console.log(`  登录API: http://localhost:${PORT}/api/auth/login`);
    console.log(`  注册API: http://localhost:${PORT}/api/auth/register`);
    console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  });
}

start().catch((error) => {
  console.error('后端启动失败:', error);
  process.exit(1);
});
