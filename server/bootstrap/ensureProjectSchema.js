import pool from '../db.js';

let schemaReadyPromise;

export default function ensureProjectSchema() {
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    const connection = await pool.getConnection();
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS course_projects (
          id VARCHAR(64) NOT NULL,
          course_id VARCHAR(64) NOT NULL DEFAULT '',
          name VARCHAR(128) NOT NULL DEFAULT '',
          hours INT NOT NULL DEFAULT 2,
          content TEXT NULL,
          key_points TEXT NULL,
          knowledge_points TEXT NULL,
          order_no INT NOT NULL DEFAULT 0,
          week_no VARCHAR(32) NOT NULL DEFAULT '',
          visible_tiers LONGTEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_course_projects_course (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      const [projectColumns] = await connection.query(
        `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_projects' AND COLUMN_NAME = 'visible_tiers'`
      );
      if (Number(projectColumns[0]?.total || 0) === 0) {
        await connection.query(`ALTER TABLE course_projects ADD COLUMN visible_tiers LONGTEXT NULL AFTER week_no`);
      }

      // 任务锁定：教师点「锁定」后该任务不可再修改（补列，重复启动安全）
      const [lockedCol] = await connection.query(
        `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_projects' AND COLUMN_NAME = 'locked'`
      );
      if (Number(lockedCol[0]?.total || 0) === 0) {
        await connection.query(
          `ALTER TABLE course_projects ADD COLUMN locked TINYINT(1) NOT NULL DEFAULT 0 COMMENT '教师锁定后不可修改'`
        );
      }

      // 任务关闭时间：由教师自行设置（补列，重复启动安全）
      const [closeCol] = await connection.query(
        `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_projects' AND COLUMN_NAME = 'close_at'`
      );
      if (Number(closeCol[0]?.total || 0) === 0) {
        await connection.query(
          `ALTER TABLE course_projects ADD COLUMN close_at DATETIME NULL COMMENT '教师设置的关闭时间，空=不自动关闭'`
        );
      }
      await connection.query(`
        CREATE TABLE IF NOT EXISTS course_project_files (
          id VARCHAR(64) NOT NULL,
          project_id VARCHAR(64) NOT NULL DEFAULT '',
          file_type VARCHAR(16) NOT NULL DEFAULT '',
          name VARCHAR(255) NOT NULL DEFAULT '',
          size BIGINT NOT NULL DEFAULT 0,
          data_url LONGTEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_course_project_files_project (project_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS course_project_progress (
          id VARCHAR(64) NOT NULL,
          project_id VARCHAR(64) NOT NULL DEFAULT '',
          student_id VARCHAR(64) NOT NULL DEFAULT '',
          progress_type VARCHAR(16) NOT NULL DEFAULT '',
          status VARCHAR(16) NOT NULL DEFAULT '',
          score DECIMAL(5,1) NULL,
          comment TEXT NULL,
          attachments LONGTEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_project_progress_student_type (project_id, student_id, progress_type),
          KEY idx_course_project_progress_project (project_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS course_standards (
          id VARCHAR(64) NOT NULL,
          course_id VARCHAR(64) NOT NULL DEFAULT '',
          name VARCHAR(255) NOT NULL DEFAULT '',
          size BIGINT NOT NULL DEFAULT 0,
          data_url LONGTEXT NULL,
          uploader VARCHAR(64) NOT NULL DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_course_standards_course (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS course_eval_questionnaires (
          id VARCHAR(64) NOT NULL,
          course_id VARCHAR(64) NOT NULL DEFAULT '',
          title VARCHAR(128) NOT NULL DEFAULT '',
          questions LONGTEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_course_eval_questionnaires_course (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS course_eval_responses (
          id VARCHAR(64) NOT NULL,
          questionnaire_id VARCHAR(64) NOT NULL DEFAULT '',
          student_id VARCHAR(64) NOT NULL DEFAULT '',
          answers LONGTEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_course_eval_responses_student (questionnaire_id, student_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('[project-schema] ready');
    } finally {
      connection.release();
    }
  })();

  return schemaReadyPromise;
}
