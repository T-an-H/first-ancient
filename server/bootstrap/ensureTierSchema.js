/**
 * AI 分层测试 schema：tier_test_questions（题库）+ tier_test_results（学生分层结果）。
 *
 * 存在意义：`server/routes/tierTest.js` 的 3 个接口（取题 / 提交判分 / 查结果）
 * 依赖这两张表，但建表语句此前缺失，调用必然 ER_NO_SUCH_TABLE。
 * 学生端读层级也要读 tier_test_results。
 *
 * ⚠️ collation：与既有表（尤其 courses）保持一致，否则跨表比较会抛
 * ER_CANT_AGGREGATE_2COLLATIONS。历史库 collation 不统一，故运行时探测而非写死。
 */
import pool from '../db.js';

let schemaReadyPromise;

/** 探测既有表的实际 collation（取 courses.id 为准），找不到则回退 unicode_ci */
async function detectCollation(connection) {
  const [rows] = await connection.query(
    `SELECT COLLATION_NAME AS collation
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'id'
     LIMIT 1`
  );
  return String(rows[0]?.collation || '') || 'utf8mb4_unicode_ci';
}

/**
 * 补列：enrollments.class_name（「学生在这门课里属于哪个班」）
 *
 * 为什么放这里自愈而不是让运维手跑 SQL：该列是「课程内分班」的唯一权威存储，
 * 此前只写在前端 localStorage，导致换电脑/切角色就丢、多老师之间不共享。
 * 用 information_schema 探测后再 ALTER，重复启动安全。
 */
async function ensureEnrollmentClassColumn(connection) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'enrollments' AND COLUMN_NAME = 'class_name'`
  );
  if (rows.length > 0) return;
  await connection.query(
    "ALTER TABLE enrollments ADD COLUMN class_name VARCHAR(64) DEFAULT '' COMMENT '本课程内所属班级（空=未分班）'"
  );
}

export default function ensureTierSchema() {
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    const connection = await pool.getConnection();
    try {
      const COLLATION = await detectCollation(connection);

      // 课程内分班的权威存储（补列，重复启动安全）
      await ensureEnrollmentClassColumn(connection);

      // 题库：一门课一套，全课程共用（不区分学生）
      await connection.query(`
        CREATE TABLE IF NOT EXISTS tier_test_questions (
          id            VARCHAR(64)  NOT NULL,
          course_id     VARCHAR(64)  NOT NULL,
          question_type VARCHAR(16)  NOT NULL DEFAULT 'single_choice' COMMENT 'single_choice/true_false',
          question_text TEXT         NOT NULL,
          options       LONGTEXT     NULL COMMENT '选项 JSON 数组',
          answer        VARCHAR(255) DEFAULT '' COMMENT '正确答案（选项原文）',
          score         INT          NOT NULL DEFAULT 10,
          order_index   INT          NOT NULL DEFAULT 0,
          created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_tier_questions_course (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${COLLATION} COMMENT='AI 分层测试题库'
      `);

      // 学生结果：每生每课一条
      await connection.query(`
        CREATE TABLE IF NOT EXISTS tier_test_results (
          id           VARCHAR(64)  NOT NULL,
          course_id    VARCHAR(64)  NOT NULL,
          student_id   VARCHAR(64)  NOT NULL,
          score        DECIMAL(5,1) NOT NULL DEFAULT 0,
          tier         VARCHAR(16)  NOT NULL DEFAULT 'basic' COMMENT 'basic/advanced/excellent',
          submitted_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_tier_result_student_course (course_id, student_id),
          KEY idx_tier_results_student (student_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${COLLATION} COMMENT='AI 分层测试结果'
      `);
    } finally {
      connection.release();
    }
  })();

  return schemaReadyPromise;
}
