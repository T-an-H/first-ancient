-- ============================================================
-- Express 后端(course_platform) 主库建表脚本
-- 执行方式: 先建库，再整段执行（幂等，可重复执行）
-- 对应路由: server/routes/*.js
-- ============================================================

CREATE DATABASE IF NOT EXISTS course_platform DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE course_platform;

-- ------------------------------------------------------------
-- 统一账号 users（/api/user/login 登录用）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  account    VARCHAR(64)  NOT NULL UNIQUE COMMENT '登录账号',
  password   VARCHAR(128) NOT NULL COMMENT 'bcrypt 加密密码',
  name       VARCHAR(64)  DEFAULT '' COMMENT '姓名',
  department VARCHAR(64)  DEFAULT '' COMMENT '部门/学院',
  role       VARCHAR(16)  NOT NULL DEFAULT 'student' COMMENT 'admin/teacher/student/leader',
  sub_role   VARCHAR(16)  DEFAULT '' COMMENT 'teacher/mentor/leader',
  status     VARCHAR(16)  DEFAULT 'active' COMMENT 'active/inactive',
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '统一账号';

-- ------------------------------------------------------------
-- 学生 students
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id         VARCHAR(64)  PRIMARY KEY COMMENT '学生ID（前端生成的学号）',
  student_id VARCHAR(64)  NOT NULL UNIQUE COMMENT '学号',
  name       VARCHAR(64)  DEFAULT '' COMMENT '姓名',
  password   VARCHAR(128) DEFAULT '' COMMENT 'bcrypt 加密密码',
  phone      VARCHAR(32)  DEFAULT '' COMMENT '电话',
  email      VARCHAR(128) DEFAULT '' COMMENT '邮箱',
  class_name VARCHAR(64)  DEFAULT '' COMMENT '班级',
  department VARCHAR(64)  DEFAULT '' COMMENT '学院',
  status     VARCHAR(16)  DEFAULT 'active' COMMENT 'active/inactive',
  created_at VARCHAR(64)  DEFAULT '' COMMENT '创建时间'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '学生';

-- ------------------------------------------------------------
-- 分类 categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(64) NOT NULL COMMENT '分类名',
  color VARCHAR(32) DEFAULT '' COMMENT '颜色'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '课程分类';

-- ------------------------------------------------------------
-- 课程 courses
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id            VARCHAR(64) PRIMARY KEY COMMENT '课程ID（前端生成）',
  title         VARCHAR(255) DEFAULT '' COMMENT '课程名',
  teacher       VARCHAR(64)  DEFAULT '' COMMENT '授课教师',
  mentor        VARCHAR(64)  DEFAULT '' COMMENT '企业导师',
  category_id   VARCHAR(64)  DEFAULT '' COMMENT '分类ID',
  category_name VARCHAR(64)  DEFAULT '' COMMENT '分类名',
  credits       DECIMAL(4,1) DEFAULT 0 COMMENT '学分',
  duration      INT          DEFAULT 0 COMMENT '学时',
  department    VARCHAR(64)  DEFAULT '' COMMENT '学院',
  status        VARCHAR(16)  DEFAULT 'active' COMMENT 'active/inactive'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '课程';

-- ------------------------------------------------------------
-- 排课 schedules
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  course_id  VARCHAR(64) DEFAULT '' COMMENT '课程ID',
  title      VARCHAR(255) DEFAULT '' COMMENT '课程名',
  teacher    VARCHAR(64)  DEFAULT '' COMMENT '教师',
  room       VARCHAR(64)  DEFAULT '' COMMENT '教室',
  class_name VARCHAR(64)  DEFAULT NULL COMMENT '班级',
  start_date VARCHAR(32)  DEFAULT '' COMMENT '开始日期',
  end_date   VARCHAR(32)  DEFAULT '' COMMENT '结束日期',
  time_slot  VARCHAR(32)  DEFAULT '' COMMENT '时间段'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '排课';

-- ------------------------------------------------------------
-- 选课 enrollments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id          VARCHAR(64) PRIMARY KEY COMMENT '选课ID（前端生成）',
  student_id  VARCHAR(64) DEFAULT '' COMMENT '学号',
  course_id   VARCHAR(64) DEFAULT '' COMMENT '课程ID',
  schedule_id VARCHAR(64) DEFAULT '' COMMENT '排课ID',
  enroll_date VARCHAR(32) DEFAULT '' COMMENT '选课日期',
  progress    INT         DEFAULT 0 COMMENT '进度',
  status      VARCHAR(16) DEFAULT 'enrolled' COMMENT 'enrolled/dropped'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '选课';

-- ------------------------------------------------------------
-- 学生分组 student_groups
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_groups (
  id         VARCHAR(64) PRIMARY KEY COMMENT '分组ID（前端生成）',
  course_id  VARCHAR(64) DEFAULT '' COMMENT '课程ID',
  name       VARCHAR(64) DEFAULT '' COMMENT '分组名',
  member_ids TEXT NULL COMMENT '成员学号（JSON数组）'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '学生分组';

-- ------------------------------------------------------------
-- 成绩 exam_scores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_scores (
  id          VARCHAR(64) PRIMARY KEY COMMENT '成绩ID（前端生成）',
  course_id   VARCHAR(64)  DEFAULT '' COMMENT '课程ID',
  student_id  VARCHAR(64)  DEFAULT '' COMMENT '学号',
  exam_name   VARCHAR(64)  DEFAULT '' COMMENT '考试名称',
  score       DECIMAL(5,1) DEFAULT 0 COMMENT '得分',
  full_score  DECIMAL(5,1) DEFAULT 100 COMMENT '满分',
  weight      DECIMAL(5,2) DEFAULT 0 COMMENT '权重',
  type        VARCHAR(16)  DEFAULT '' COMMENT '类型',
  status      VARCHAR(16)  DEFAULT 'graded' COMMENT 'graded/pending',
  graded_at   VARCHAR(32)  DEFAULT '' COMMENT '评分时间'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '成绩';

-- ------------------------------------------------------------
-- 评价配置 eval_configs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eval_configs (
  course_id        VARCHAR(64) PRIMARY KEY COMMENT '课程ID',
  template         VARCHAR(16)  DEFAULT '' COMMENT '模板',
  frequency        VARCHAR(16)  DEFAULT '' COMMENT '频率',
  custom_sessions  VARCHAR(16)  DEFAULT '' COMMENT '自定义次数',
  has_mentor       TINYINT(1)   DEFAULT 0 COMMENT '是否有导师',
  overdue_rule     VARCHAR(16)  DEFAULT '' COMMENT '逾期规则'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '评价配置';

-- ------------------------------------------------------------
-- 评价记录 evaluations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluations (
  id             VARCHAR(64) PRIMARY KEY COMMENT '评价ID（前端生成）',
  course_id      VARCHAR(64)  DEFAULT '' COMMENT '课程ID',
  student_id     VARCHAR(64)  DEFAULT '' COMMENT '学号',
  session_number INT          DEFAULT 1 COMMENT '第N次评价',
  type           VARCHAR(16)  DEFAULT '' COMMENT '评价类型',
  score          DECIMAL(5,1) DEFAULT 0 COMMENT '得分',
  items          LONGTEXT NULL COMMENT '分项评分JSON',
  evaluator_id   VARCHAR(64)  DEFAULT '' COMMENT '评价人ID',
  evaluator_name VARCHAR(64)  DEFAULT '' COMMENT '评价人姓名',
  comment        TEXT NULL COMMENT '评语',
  created_at     VARCHAR(32)  DEFAULT '' COMMENT '创建时间'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '评价记录';

-- ------------------------------------------------------------
-- 教师已提交评价 teacher_submitted_evals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_submitted_evals (
  id             VARCHAR(64) PRIMARY KEY COMMENT '记录ID（前端生成）',
  course_id      VARCHAR(64) DEFAULT '' COMMENT '课程ID',
  student_id     VARCHAR(64) DEFAULT '' COMMENT '学号',
  session_number INT         DEFAULT 1 COMMENT '第N次评价',
  type           VARCHAR(16) DEFAULT '' COMMENT '评价类型'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '教师已提交评价';
