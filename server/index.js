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
import tierTestRoutes from './routes/tierTest.js';
import assistantRoutes from './routes/assistant.js';
import { warmAssistantModel } from './assistant-agent.js';
import qualityEvaluationRoutes from './routes/qualityEvaluations.js';
import ensureAdminSchema from './bootstrap/ensureAdminSchema.js';
import ensureProjectSchema from './bootstrap/ensureProjectSchema.js';
import ensureGradeSchema from './bootstrap/ensureGradeSchema.js';
import ensureTierSchema from './bootstrap/ensureTierSchema.js';
import ensureCollation from './bootstrap/ensureCollation.js';
import projectRoutes from './routes/projects.js';
import gradeRoutes from './routes/grades.js';
import accountRoutes from './routes/accounts.js';
import { authMiddleware, requireAdmin } from './middleware/auth.js';
import { MAX_UPLOAD_BODY_SIZE } from './lib/uploadLimits.js';
import pool from './db.js';

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
app.use(express.json({ limit: MAX_UPLOAD_BODY_SIZE }));

// 全链路鉴权：写接口（POST/PUT/DELETE）必须 JWT，读接口放行
app.use(authMiddleware);

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

// 成绩配置 + 成绩明细路由（平时成绩后端权威源）：/api/grade-config/*、/api/detailed-grades/*
app.use('/api', gradeRoutes);

app.use('/api/quality-evaluations', qualityEvaluationRoutes);

// AI 分层测试路由
app.use('/api/tier-test', tierTestRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api', projectRoutes);

// 账号管理路由（仅管理员，authMiddleware 已全局挂载）
app.use('/api/accounts', requireAdmin, accountRoutes);

// ====== 兜底错误处理 ======
//
// 必须放在所有路由之后、且在 start() 之前注册。
// 没有它的时候，body-parser 抛的 PayloadTooLargeError 会走 Express 默认处理器，
// 返回一段 HTML，前端 `response.json()` 解析失败只拿到 {}，最终把「文件太大」
// 显示成含糊的「请求失败 (413)」。这里统一改回项目约定的 JSON 包装，
// 并把体积类错误翻译成人能看懂的话。
app.use((err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      code: 413,
      // 不写具体上限：请求可能先被 nginx 挡下，也可能走到这里被 Express 挡下，
      // 两层上限未必相同。写死一个数字反而会在另一层上骗人。
      msg: '上传内容过大，请压缩文件后重试，或将文件分批上传',
      data: null,
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 400, msg: '请求体格式错误，无法解析', data: null });
  }

  console.error('[error]', req.method, req.originalUrl, err);
  return res.status(err.status || 500).json({
    code: err.status || 500,
    msg: err.message || '服务器内部错误',
    data: null,
  });
});

// ====== 启动服务器 ======

/**
 * MySQL 单包上限自检（只读，不修改服务端配置）
 *
 * 上传的文件是 base64 直塞 JSON body、再整串写进 LONGTEXT 列的，所以
 * `max_allowed_packet` 必须大于请求体上限，否则 MySQL 报
 * ER_NET_PACKET_TOO_LARGE 并**直接掐断连接** —— 后端控制台看到的会是
 * 「服务器已重启」而不是一条报错，极难定位。
 *
 * 这里只检测并告警：改 MySQL 配置需要重启 mysql 服务，不属于应用该做的事。
 */
async function checkMaxAllowedPacket() {
  const requiredBytes = 20 * 1024 * 1024; // 与 lib/uploadLimits.js 的 20mb 对齐
  const requiredMB = 20;
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
      const actual = Number(rows[0]?.Value || 0);
      if (actual > 0 && actual < requiredBytes) {
        console.warn(
          `[mysql] max_allowed_packet=${Math.round(actual / 1024 / 1024)}MB，小于上传所需 ${requiredMB}MB。\n` +
          `        大文件上传会在 MySQL 层断开连接，表现为「上传失败」且服务日志只显示重启。\n` +
          `        修复：在 my.cnf 的 [mysqld] 下加 max_allowed_packet=${requiredMB}M 后重启 mysql。`
        );
      } else {
        console.log(`[mysql] max_allowed_packet=${Math.round(actual / 1024 / 1024)}MB，满足上传需求`);
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.warn('[mysql] max_allowed_packet 自检失败（不影响启动）:', error.message);
  }
}

async function start() {
  // 先把全库字符集统合，再让各域补齐结构 —— 否则新建的表会沿用各自的
  // 默认 collation，与既有表混用后跨表比较抛 ER_CANT_AGGREGATE_2COLLATIONS
  // （症状：删学院恒失败、部分统计恒为 0）。
  await ensureCollation();
  await ensureAdminSchema();
  await ensureProjectSchema();
  await ensureGradeSchema();
  await ensureTierSchema();
  await checkMaxAllowedPacket();

  app.listen(PORT, () => {
    void warmAssistantModel();
    console.log(`✅ 后端服务已启动！`);
    console.log(`  地址: http://localhost:${PORT}`);
    console.log(`  登录API: http://localhost:${PORT}/api/user/login`);
    console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  });
}

start().catch((error) => {
  console.error('后端启动失败:', error);
  process.exit(1);
});
