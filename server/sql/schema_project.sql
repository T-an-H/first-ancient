-- ------------------------------------------------------------
-- 课程管理（知识图谱）项目体系
-- 由授课计划表（Excel：项目/学时/教学内容/重点难点/知识点）生成，
-- 每 2 学时 = 1 个项目（泡泡）。每个项目含 5 个学习内容：
--   1 预习资料(preview) 2 工单(workorder) 3 本节课资料(material)
--   4 测试题目(test，评价迁移任务评价体系) 5 评教(questionnaire)
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 项目 course_project
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_project (
  id                 VARCHAR(64) PRIMARY KEY COMMENT '项目ID（前端生成 proj-xxx）',
  course_id          VARCHAR(64)  DEFAULT '' COMMENT '所属课程ID',
  name               VARCHAR(128) DEFAULT '' COMMENT '项目名称',
  hours              INT          DEFAULT 2 COMMENT '学时（每2学时一个项目）',
  content            TEXT NULL COMMENT '教学内容',
  key_points         TEXT NULL COMMENT '重点/难点',
  knowledge_points   TEXT NULL COMMENT '知识点',
  order_no           INT          DEFAULT 0 COMMENT '排序号',
  week_no            VARCHAR(32)  DEFAULT '' COMMENT '周次（可选）',
  visible_tiers      LONGTEXT NULL COMMENT '可见层次JSON，如["basic","advanced","excellent"]',
  test_task_id       VARCHAR(64)  DEFAULT '' COMMENT '关联测试任务ID（course_task，评价迁移）',
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '课程项目（知识图谱节点）';

-- ------------------------------------------------------------
-- 项目文件 course_project_file（预习/工单/资料/测试题目）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_project_file (
  id          VARCHAR(64) PRIMARY KEY COMMENT '文件ID（前端生成 pfile-xxx）',
  project_id  VARCHAR(64) DEFAULT '' COMMENT '项目ID',
  file_type   VARCHAR(16) DEFAULT '' COMMENT 'preview预习/workorder工单/material资料/test测试题目',
  name        VARCHAR(255) DEFAULT '' COMMENT '文件名',
  size        BIGINT       DEFAULT 0 COMMENT '文件大小',
  data_url    LONGTEXT NULL COMMENT '文件 dataUrl（base64）',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '项目文件';

-- ------------------------------------------------------------
-- 项目进度 course_project_progress（学生预习/工单提交/资料查看/测试完成）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_project_progress (
  id            VARCHAR(64) PRIMARY KEY COMMENT '进度ID（前端生成 pprog-xxx）',
  project_id    VARCHAR(64) DEFAULT '' COMMENT '项目ID',
  student_id    VARCHAR(64) DEFAULT '' COMMENT '学生内部ID（stu-xxx，与 student 表一致）',
  progress_type VARCHAR(16) DEFAULT '' COMMENT 'preview预习/workorder工单/material资料/test测试',
  status        VARCHAR(16) DEFAULT '' COMMENT 'viewed已查看/submitted已提交/graded已批改',
  score         DECIMAL(5,1) NULL COMMENT '教师评分（工单/测试）',
  comment       TEXT NULL COMMENT '备注/评语',
  attachments   TEXT NULL COMMENT '学生提交附件（JSON）',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '项目学生进度';

-- ------------------------------------------------------------
-- 评教问卷 course_eval_questionnaire（每课程一份）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_eval_questionnaire (
  id          VARCHAR(64) PRIMARY KEY COMMENT '问卷ID（前端生成 qnr-xxx）',
  course_id   VARCHAR(64) DEFAULT '' COMMENT '课程ID',
  title       VARCHAR(128) DEFAULT '' COMMENT '问卷标题',
  questions   TEXT NULL COMMENT '题目列表（JSON数组）',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '评教问卷';

-- ------------------------------------------------------------
-- 评教填写 course_eval_response
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_eval_response (
  id               VARCHAR(64) PRIMARY KEY COMMENT '填写ID（前端生成 resp-xxx）',
  questionnaire_id VARCHAR(64) DEFAULT '' COMMENT '问卷ID',
  student_id       VARCHAR(64) DEFAULT '' COMMENT '学生内部ID（stu-xxx）',
  answers          TEXT NULL COMMENT '答案列表（JSON数组）',
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '评教填写记录';
