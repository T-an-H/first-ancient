-- ============================================================
-- 课程管理平台 · 教师端后端模块 建表脚本
-- 数据库: course_db  (MySQL 8)
-- 执行方式: mysql -uroot -p070808 < schema.sql
--           或在 Navicat/Workbench 中打开本文件整段执行
-- ============================================================

CREATE DATABASE IF NOT EXISTS course_db
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE course_db;

-- ------------------------------------------------------------
-- 1. 选课记录 enrollment
-- ------------------------------------------------------------
DROP TABLE IF EXISTS enrollment;
CREATE TABLE enrollment (
    id          VARCHAR(64)  NOT NULL COMMENT '主键（前端生成，如 enr-xxx）',
    student_id  VARCHAR(64)  NOT NULL COMMENT '学生ID/学号',
    course_id   VARCHAR(64)  NOT NULL COMMENT '课程ID',
    schedule_id VARCHAR(64)  DEFAULT '' COMMENT '关联排课ID',
    enroll_date DATE         DEFAULT NULL COMMENT '选课日期',
    progress    INT          NOT NULL DEFAULT 0 COMMENT '学习进度 0-100',
    status      VARCHAR(32)  NOT NULL DEFAULT 'enrolled' COMMENT 'enrolled/in_progress/completed/dropped',
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_course (course_id),
    KEY idx_student (student_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '选课记录';

-- ------------------------------------------------------------
-- 2. 分组 student_group（group 是 MySQL 保留字，故用 student_group）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS student_group;
CREATE TABLE student_group (
    id         VARCHAR(64)  NOT NULL COMMENT '主键（前端生成，如 grp-xxx）',
    course_id  VARCHAR(64)  NOT NULL COMMENT '课程ID',
    name       VARCHAR(128) NOT NULL COMMENT '组名',
    member_ids TEXT         NULL COMMENT '成员学生ID列表（JSON数组，如 ["s1","s2"]）',
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_course (course_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '学生分组';

-- ------------------------------------------------------------
-- 3. 课程资源 course_file
-- ------------------------------------------------------------
DROP TABLE IF EXISTS course_file;
CREATE TABLE course_file (
    id                     VARCHAR(64)  NOT NULL COMMENT '主键（前端生成，如 file-xxx）',
    course_id              VARCHAR(64)  NOT NULL COMMENT '课程ID',
    name                   VARCHAR(255) NOT NULL COMMENT '文件名',
    size                   BIGINT       NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
    type                   VARCHAR(128) DEFAULT '' COMMENT 'MIME类型',
    data_url               TEXT         NULL COMMENT '文件URL或Base64',
    uploaded_at            DATE         DEFAULT NULL COMMENT '上传日期',
    uploaded_by            VARCHAR(64)  DEFAULT '' COMMENT '上传人',
    visibility_scope       VARCHAR(32)  DEFAULT 'students' COMMENT '可见范围 private/students',
    visible_to_class_names TEXT         NULL COMMENT '可见班级列表（JSON数组）',
    created_at             DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_course (course_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '课程资源';

-- ------------------------------------------------------------
-- 4. 成绩权重配置 grade_config（一门课程一条，course_id 即主键）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS grade_config;
CREATE TABLE grade_config (
    course_id              VARCHAR(64) NOT NULL COMMENT '课程ID（主键）',
    regular_weight         INT NOT NULL DEFAULT 40 COMMENT '平时成绩占比%',
    midterm_weight         INT NOT NULL DEFAULT 0 COMMENT '期中占比%',
    final_weight           INT NOT NULL DEFAULT 60 COMMENT '期末占比%',
    self_eval_weight       INT NOT NULL DEFAULT 10 COMMENT '自评占比%',
    peer_review_weight     INT NOT NULL DEFAULT 20 COMMENT '组内互评占比%',
    inter_group_eval_weight INT NOT NULL DEFAULT 10 COMMENT '组间互评占比%',
    teacher_score_weight   INT NOT NULL DEFAULT 30 COMMENT '教师评分占比%',
    mentor_score_weight    INT NOT NULL DEFAULT 30 COMMENT '企业导师评分占比%',
    midterm_exam_weight    INT NOT NULL DEFAULT 50 COMMENT '期中考试占期中的比例%',
    midterm_project_weight INT NOT NULL DEFAULT 50 COMMENT '期中项目占期中的比例%',
    final_exam_weight      INT NOT NULL DEFAULT 50 COMMENT '期末考试占期末的比例%',
    final_project_weight   INT NOT NULL DEFAULT 50 COMMENT '期末项目占期末的比例%',
    quality_eval_max_bonus INT NOT NULL DEFAULT 10 COMMENT '素质评价加成上限（分）',
    created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (course_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '成绩权重配置';

-- ------------------------------------------------------------
-- 5. 课程评价 evaluation
-- ------------------------------------------------------------
DROP TABLE IF EXISTS evaluation;
CREATE TABLE evaluation (
    id             VARCHAR(64)  NOT NULL COMMENT '主键（前端生成）',
    course_id      VARCHAR(64)  NOT NULL COMMENT '课程ID',
    student_id     VARCHAR(64)  NOT NULL COMMENT '被评价学生ID',
    session_number INT          NOT NULL DEFAULT 1 COMMENT '第N次评价',
    type           VARCHAR(32)  NOT NULL DEFAULT 'self' COMMENT 'self/intra_group/inter_group/teacher/mentor',
    score          DECIMAL(5,1) NULL COMMENT '得分 0-100',
    evaluator_id   VARCHAR(64)  DEFAULT '' COMMENT '评价人ID',
    evaluator_name VARCHAR(64)  DEFAULT '' COMMENT '评价人姓名',
    comment        TEXT         NULL COMMENT '评语',
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_course (course_id),
    KEY idx_student (student_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '课程评价';

-- ------------------------------------------------------------
-- 6. 课程 course
-- ------------------------------------------------------------
DROP TABLE IF EXISTS course;
CREATE TABLE course (
    id            VARCHAR(64)  NOT NULL COMMENT '主键（前端生成，如 course-xxx）',
    title         VARCHAR(200) NOT NULL COMMENT '课程名称',
    description   TEXT         NULL COMMENT '课程简介',
    category_id   VARCHAR(64)  DEFAULT '' COMMENT '课程分类ID',
    department_id VARCHAR(64)  DEFAULT '' COMMENT '所属学院ID',
    cover         VARCHAR(500) DEFAULT '' COMMENT '封面图URL',
    start_date    DATE         DEFAULT NULL COMMENT '开课日期',
    end_date      DATE         DEFAULT NULL COMMENT '结课日期',
    credits       INT          NOT NULL DEFAULT 0 COMMENT '学分',
    duration      INT          NOT NULL DEFAULT 0 COMMENT '课时',
    status        VARCHAR(16)  NOT NULL DEFAULT 'active' COMMENT 'active/inactive/draft',
    teacher       VARCHAR(64)  DEFAULT '' COMMENT '授课教师',
    mentor        VARCHAR(64)  DEFAULT '' COMMENT '企业导师',
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_teacher (teacher)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '课程';

-- ------------------------------------------------------------
-- 7. 学生 student
-- ------------------------------------------------------------
DROP TABLE IF EXISTS student;
CREATE TABLE student (
    id               VARCHAR(64)  NOT NULL COMMENT '主键（前端生成，如 stu-xxx）',
    name             VARCHAR(64)  NOT NULL COMMENT '姓名',
    student_id       VARCHAR(64)  DEFAULT '' COMMENT '学号',
    class_name       VARCHAR(64)  DEFAULT '' COMMENT '班级',
    phone            VARCHAR(32)  DEFAULT '' COMMENT '电话',
    email            VARCHAR(128) DEFAULT '' COMMENT '邮箱',
    avatar           VARCHAR(500) DEFAULT '' COMMENT '头像URL',
    join_date        DATE         DEFAULT NULL COMMENT '入学日期',
    status           VARCHAR(16)  NOT NULL DEFAULT 'active' COMMENT 'active/inactive',
    enrollment_score INT          DEFAULT NULL COMMENT '高考/入学成绩（用于分层判定）',
    created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_student_no (student_id),
    KEY idx_class (class_name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '学生';

-- ------------------------------------------------------------
-- 8. 排课 schedule
-- ------------------------------------------------------------
DROP TABLE IF EXISTS schedule;
CREATE TABLE schedule (
    id         VARCHAR(64)  NOT NULL COMMENT '主键（前端生成，如 sch-xxx）',
    course_id  VARCHAR(64)  NOT NULL COMMENT '课程ID',
    title      VARCHAR(200) DEFAULT '' COMMENT '排课标题',
    day        VARCHAR(16)  DEFAULT '' COMMENT '周几（周一~周日）',
    class_name VARCHAR(64)  DEFAULT '' COMMENT '上课班级；空 = 全班级（语义未在 Java 服务实现，见 Schedule.java）',
    start_date DATE         DEFAULT NULL COMMENT '开始日期',
    end_date   DATE         DEFAULT NULL COMMENT '结束日期',
    time_slot  VARCHAR(64)  DEFAULT '' COMMENT '时间段，如 8:00-9:40',
    room       VARCHAR(64)  DEFAULT '' COMMENT '教室',
    teacher    VARCHAR(64)  DEFAULT '' COMMENT '授课教师',
    mentor     VARCHAR(64)  DEFAULT '' COMMENT '企业导师',
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_course (course_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '排课';

-- ------------------------------------------------------------
-- 9. 综合成绩 grade
-- ------------------------------------------------------------
DROP TABLE IF EXISTS grade;
CREATE TABLE grade (
    id          VARCHAR(64)  NOT NULL COMMENT '主键（前端生成）',
    student_id  VARCHAR(64)  NOT NULL COMMENT '学生ID',
    course_id   VARCHAR(64)  NOT NULL COMMENT '课程ID',
    score       DECIMAL(5,1) NOT NULL DEFAULT 0 COMMENT '成绩',
    semester    VARCHAR(32)  DEFAULT '' COMMENT '学期',
    comment     TEXT         NULL COMMENT '评语',
    total_score DECIMAL(5,1) DEFAULT NULL COMMENT '综合总成绩',
    graded_at   DATETIME     DEFAULT NULL COMMENT '评分时间',
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_course (course_id),
    KEY idx_student (student_id),
    KEY idx_course_student (course_id, student_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '综合成绩';

-- ------------------------------------------------------------
-- 10. 考试/项目成绩 exam_score
-- ------------------------------------------------------------
DROP TABLE IF EXISTS exam_score;
CREATE TABLE exam_score (
    id         VARCHAR(64)  NOT NULL COMMENT '主键（前端生成）',
    course_id  VARCHAR(64)  NOT NULL COMMENT '课程ID',
    student_id VARCHAR(64)  NOT NULL COMMENT '学生ID',
    exam_name  VARCHAR(128) DEFAULT '' COMMENT '考试/项目名称，如"期中考试"',
    score      DECIMAL(5,1) NOT NULL DEFAULT 0 COMMENT '得分',
    full_score DECIMAL(5,1) NOT NULL DEFAULT 100 COMMENT '满分',
    weight     INT          NOT NULL DEFAULT 50 COMMENT '权重%',
    type       VARCHAR(32)  NOT NULL DEFAULT 'quiz' COMMENT 'midterm_exam/midterm_project/final_exam/final_project/quiz/assignment',
    status     VARCHAR(16)  NOT NULL DEFAULT 'draft' COMMENT 'draft/submitted',
    graded_at  DATETIME     DEFAULT NULL COMMENT '评分时间',
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_course_student (course_id, student_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '考试/项目成绩';

-- ------------------------------------------------------------
-- 11. 作业 homework
-- ------------------------------------------------------------
DROP TABLE IF EXISTS homework;
CREATE TABLE homework (
    id          VARCHAR(64)  NOT NULL COMMENT '主键（前端生成）',
    course_id   VARCHAR(64)  NOT NULL COMMENT '课程ID',
    title       VARCHAR(200) NOT NULL COMMENT '作业标题',
    description TEXT         NULL COMMENT '作业要求',
    due_date    DATETIME     DEFAULT NULL COMMENT '截止时间',
    created_by  VARCHAR(64)  DEFAULT '' COMMENT '布置人（教师ID）',
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_course (course_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '作业';

-- ------------------------------------------------------------
-- 12. 作业提交 homework_submission
-- ------------------------------------------------------------
DROP TABLE IF EXISTS homework_submission;
CREATE TABLE homework_submission (
    id            VARCHAR(64)  NOT NULL COMMENT '主键（前端生成）',
    homework_id   VARCHAR(64)  NOT NULL COMMENT '作业ID',
    course_id     VARCHAR(64)  NOT NULL COMMENT '课程ID',
    student_id    VARCHAR(64)  NOT NULL COMMENT '学生ID',
    submitted_at  DATETIME     DEFAULT NULL COMMENT '提交时间',
    file_name     VARCHAR(255) DEFAULT '' COMMENT '文件名',
    file_data_url TEXT         NULL COMMENT '文件URL或Base64',
    file_size     BIGINT       NOT NULL DEFAULT 0 COMMENT '文件大小',
    file_type     VARCHAR(128) DEFAULT '' COMMENT 'MIME类型',
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_homework_student (homework_id, student_id),
    KEY idx_course (course_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '作业提交';

-- ------------------------------------------------------------
-- 13. 素质评价 quality_evaluation（submissions 为 JSON 数组）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS quality_evaluation;
CREATE TABLE quality_evaluation (
    id         VARCHAR(64) NOT NULL COMMENT '主键（前端生成）',
    course_id  VARCHAR(64) NOT NULL COMMENT '课程ID',
    student_id VARCHAR(64) NOT NULL COMMENT '学生ID',
    submissions TEXT       NULL COMMENT '提交记录列表（JSON数组，含文件/打分/评语）',
    created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_course (course_id),
    KEY idx_student (student_id),
    KEY idx_course_student (course_id, student_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '素质评价';

-- ------------------------------------------------------------
-- 14. 评价方案配置 eval_config（每门课程一条，course_id 为主键）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS eval_config;
CREATE TABLE eval_config (
    course_id       VARCHAR(64) NOT NULL COMMENT '课程ID（主键，一门课一条配置）',
    template        VARCHAR(16) NOT NULL DEFAULT 'all' COMMENT '评价模板：all/standard/simple/project',
    frequency       VARCHAR(32) NOT NULL DEFAULT 'biweekly' COMMENT '评价频率：biweekly/per_unit/project_milestone/custom',
    custom_sessions INT         DEFAULT NULL COMMENT '自定义评价次数（仅 frequency=custom 时有效）',
    has_mentor      TINYINT(1)  NOT NULL DEFAULT 0 COMMENT '是否有企业导师参与：0否 1是',
    overdue_rule    VARCHAR(16) NOT NULL DEFAULT 'average' COMMENT '逾期处理规则：average/none/zero/full',
    created_at      DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (course_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '评价方案配置';

-- ------------------------------------------------------------
-- 15. 成绩明细 detailed_grade（每个学生每门课一条）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS detailed_grade;
CREATE TABLE detailed_grade (
    id                  VARCHAR(64)  NOT NULL COMMENT '主键（前端生成）',
    student_id          VARCHAR(64)  NOT NULL COMMENT '学生ID',
    course_id           VARCHAR(64)  NOT NULL COMMENT '课程ID',
    self_eval_score     DECIMAL(5,1) DEFAULT NULL COMMENT '自评得分',
    peer_review_score   DECIMAL(5,1) DEFAULT NULL COMMENT '组内互评得分',
    inter_group_score   DECIMAL(5,1) DEFAULT NULL COMMENT '组间互评得分',
    teacher_score       DECIMAL(5,1) DEFAULT NULL COMMENT '教师评分',
    mentor_score        DECIMAL(5,1) DEFAULT NULL COMMENT '企业导师评分',
    midterm_exam_score  DECIMAL(5,1) DEFAULT NULL COMMENT '期中考试得分',
    midterm_project_score DECIMAL(5,1) DEFAULT NULL COMMENT '期中项目得分',
    final_exam_score    DECIMAL(5,1) DEFAULT NULL COMMENT '期末考试得分',
    final_project_score DECIMAL(5,1) DEFAULT NULL COMMENT '期末项目得分',
    graded_at           DATETIME     DEFAULT NULL COMMENT '评分时间',
    created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_student_course (student_id, course_id),
    KEY idx_course (course_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '成绩明细';

-- ------------------------------------------------------------
-- 16. 评价提醒 eval_reminder
-- ------------------------------------------------------------
DROP TABLE IF EXISTS eval_reminder;
CREATE TABLE eval_reminder (
    id             VARCHAR(64)  NOT NULL COMMENT '主键（前端生成）',
    course_id      VARCHAR(64)  NOT NULL COMMENT '课程ID',
    course_title   VARCHAR(200) DEFAULT '' COMMENT '课程名称',
    student_id     VARCHAR(64)  NOT NULL COMMENT '学生ID',
    session_number INT          NOT NULL DEFAULT 1 COMMENT '第N次评价',
    deadline       DATETIME     DEFAULT NULL COMMENT '截止时间',
    status         VARCHAR(16)  NOT NULL DEFAULT 'pending' COMMENT 'pending/completed/overdue',
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_course (course_id),
    KEY idx_student (student_id),
    KEY idx_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '评价提醒';

-- ------------------------------------------------------------
-- 17. 待办事项 todo
-- ------------------------------------------------------------
DROP TABLE IF EXISTS todo;
CREATE TABLE todo (
    id         VARCHAR(64)  NOT NULL COMMENT '主键（前端生成）',
    title      VARCHAR(255) NOT NULL COMMENT '待办标题',
    completed  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否完成 0/1',
    due_date   DATETIME     DEFAULT NULL COMMENT '截止时间',
    created_by VARCHAR(64)  DEFAULT '' COMMENT '创建人',
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_created_by (created_by)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '待办事项';

-- ------------------------------------------------------------
-- 18. 笔记 note（attachments 为 JSON 数组）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS note;
CREATE TABLE note (
    id          VARCHAR(64)  NOT NULL COMMENT '主键（前端生成）',
    title       VARCHAR(255) NOT NULL COMMENT '笔记标题',
    content     TEXT         NULL COMMENT '笔记内容',
    created_by  VARCHAR(64)  DEFAULT '' COMMENT '创建人',
    attachments TEXT         NULL COMMENT '附件列表（JSON数组，含 fileName/fileSize/fileType/dataUrl）',
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_created_by (created_by)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '笔记';

-- ------------------------------------------------------------
-- 19. AI 分层记录 student_tier（一门课程一名学生一条）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS student_tier;
CREATE TABLE student_tier (
    id         VARCHAR(64) NOT NULL COMMENT '主键（前端生成）',
    course_id  VARCHAR(64) NOT NULL COMMENT '课程ID',
    student_id VARCHAR(64) NOT NULL COMMENT '学生ID',
    tier       VARCHAR(16) NOT NULL DEFAULT 'basic' COMMENT 'basic/advanced/excellent',
    score      INT         NOT NULL DEFAULT 0 COMMENT '测试得分',
    created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_course_student (course_id, student_id),
    KEY idx_student (student_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = 'AI分层记录';

-- ------------------------------------------------------------
-- 21. 课程分类 category（基础数据）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS category;
CREATE TABLE category (
    id            VARCHAR(64)  NOT NULL COMMENT '主键（前端生成，如 cat-xxx）',
    name          VARCHAR(128) NOT NULL COMMENT '分类名称',
    color         VARCHAR(32)  DEFAULT '#3b82f6' COMMENT '分类颜色',
    course_count  INT          NOT NULL DEFAULT 0 COMMENT '课程数（展示用）',
    department_id VARCHAR(64)  DEFAULT '' COMMENT '所属学院ID',
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '课程分类';

-- ------------------------------------------------------------
-- 22. 学院 department（基础数据）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS department;
CREATE TABLE department (
    id         VARCHAR(64)  NOT NULL COMMENT '主键（前端生成，如 dept-xxx）',
    name       VARCHAR(128) NOT NULL COMMENT '学院名称',
    color      VARCHAR(32)  DEFAULT '#3b82f6' COMMENT '学院颜色',
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '学院';

-- ------------------------------------------------------------
-- 23. 学院班级映射 department_class（基础数据）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS department_class;
CREATE TABLE department_class (
    id            VARCHAR(64)  NOT NULL COMMENT '主键（前端生成）',
    department_id VARCHAR(64)  NOT NULL COMMENT '学院ID',
    class_name    VARCHAR(128) NOT NULL COMMENT '班级名称',
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_department (department_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '学院班级映射';

-- ------------------------------------------------------------
-- 24. 教师 teacher（基础数据）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS teacher;
CREATE TABLE teacher (
    id         VARCHAR(64)  NOT NULL COMMENT '主键（前端生成，如 t-xxx）',
    name       VARCHAR(64)  NOT NULL COMMENT '姓名（显示名，登录账号见 courses.teacher/账号体系）',
    phone      VARCHAR(32)  DEFAULT '' COMMENT '电话',
    email      VARCHAR(128) DEFAULT '' COMMENT '邮箱',
    avatar     VARCHAR(500) DEFAULT '' COMMENT '头像URL',
    course_ids TEXT         NULL COMMENT '授课课程ID列表（JSON数组）',
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '教师';

-- ------------------------------------------------------------
-- 25. 企业导师 mentor（基础数据）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS mentor;
CREATE TABLE mentor (
    id         VARCHAR(64)  NOT NULL COMMENT '主键（前端生成，如 m-xxx）',
    name       VARCHAR(64)  NOT NULL COMMENT '姓名（显示名）',
    phone      VARCHAR(32)  DEFAULT '' COMMENT '电话',
    email      VARCHAR(128) DEFAULT '' COMMENT '邮箱',
    avatar     VARCHAR(500) DEFAULT '' COMMENT '头像URL',
    course_ids TEXT         NULL COMMENT '负责课程ID列表（JSON数组）',
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '企业导师';

-- ------------------------------------------------------------
-- 26. 学院领导 leader（基础数据）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS leader;
CREATE TABLE leader (
    id                 VARCHAR(64)  NOT NULL COMMENT '主键（前端生成，如 l-xxx）',
    name               VARCHAR(64)  NOT NULL COMMENT '姓名（显示名）',
    phone              VARCHAR(32)  DEFAULT '' COMMENT '电话',
    email              VARCHAR(128) DEFAULT '' COMMENT '邮箱',
    category_ids       TEXT         NULL COMMENT '管辖分类ID列表（JSON数组）',
    as_teacher         TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否兼任授课教师 0/1',
    teacher_course_ids TEXT         NULL COMMENT '作为教师授课的课程ID列表（JSON数组）',
    as_mentor          TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否兼任企业导师 0/1',
    mentor_course_ids  TEXT         NULL COMMENT '作为导师负责的课程ID列表（JSON数组）',
    created_at         DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '学院领导';
