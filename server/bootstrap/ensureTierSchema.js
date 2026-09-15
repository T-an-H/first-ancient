/**
 * AI 分层测试 schema：tier_test_questions（题库）+ tier_test_results（学生分层结果）。
 *
 * 存在意义：`server/routes/tierTest.js` 的 3 个接口（取题 / 提交判分 / 查结果）
 * 依赖这两张表，但建表语句此前缺失，调用必然 ER_NO_SUCH_TABLE。
 * 另外 `homeworks.js` 按层级过滤作业、学生端读层级也都要读 tier_test_results。
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

export default function ensureTierSchema() {
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    const connection = await pool.getConnection();
    try {
      const COLLATION = await detectCollation(connection);

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
