/**
 * 待办 schema：todos 表（单数→复数收敛）
 *
 * 存在意义：`server/routes/todos.js` 依赖 todos 表，但此前**没有任何建表语句
 * 会被运行时执行**——`server/sql/schema_extra.sql` 只是给人手跑的脚本，
 * 且它建的是复数表 `todos`，而最初的 `routes/extra.js` 查的是单数 `todo`，
 * 两者对不上，调用必然 ER_NO_SUCH_TABLE。
 *
 * 这里统一收敛到**复数** `todos`，理由：
 *   - 建表脚本 schema_extra.sql 已经用的是复数；
 *   - `course_db_full_schema.sql`（另一个库的历史脚本）用的单数，但那份
 *     从不被 Express 执行，也不属于本库 course_platform。
 *
 * ⚠️ collation：与既有表（尤其 courses）保持一致，否则跨表比较会抛
 * ER_CANT_AGGREGATE_2COLLATIONS。历史库 collation 不统一，故运行时探测而非写死。
 *
 * ⚠️ 时间字段刻意用 VARCHAR(64) 而非 DATETIME：前端传的是 `'2026-10-15'`
 * 字符串，且空值用 `''` 兜底（见 routes/todos.js）。DATETIME 存不下空串。
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

async function tableExists(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function tableRowCount(connection, tableName) {
  const [[row]] = await connection.query(`SELECT COUNT(*) AS total FROM \`${tableName}\``);
  return Number(row?.total || 0);
}

/**
 * 防御性迁移：若历史库存在**单数** `todo` 表且有数据，而新的复数 `todos` 还是空的，
 * 把旧数据搬过来，避免用户此前存下的待办看起来"消失"。
 *
 * best-effort：任何异常都吞掉（旧表结构可能与新表不同），不阻断启动。
 */
async function migrateLegacyTodoTable(connection) {
  try {
    if (!(await tableExists(connection, 'todo'))) return;
    if (await tableRowCount(connection, 'todos') > 0) return;

    await connection.query(`
      INSERT IGNORE INTO todos (id, title, completed, created_at, due_date, created_by)
      SELECT id, title, completed, created_at, due_date, created_by FROM todo
    `);
    console.log('[ensureExtraSchema] 已把历史单数表 todo 的数据迁移到 todos');
  } catch (error) {
    console.warn('[ensureExtraSchema] 单数表 todo 迁移跳过:', error.code || error.message);
  }
}

export default function ensureExtraSchema() {
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    const connection = await pool.getConnection();
    try {
      const COLLATION = await detectCollation(connection);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id         VARCHAR(64)  NOT NULL COMMENT '主键（前端生成，如 todo-xxx）',
          title      VARCHAR(255) NOT NULL COMMENT '待办标题',
          completed  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否完成 0/1',
          created_at VARCHAR(64)  DEFAULT '' COMMENT '创建时间',
          due_date   VARCHAR(64)  DEFAULT '' COMMENT '截止时间',
          created_by VARCHAR(64)  DEFAULT '' COMMENT '创建人（存 users.name，服务端注入）',
          PRIMARY KEY (id),
          KEY idx_todos_created_by (created_by)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${COLLATION} COMMENT='待办事项'
      `);

      await migrateLegacyTodoTable(connection);
    } finally {
      connection.release();
    }
  })();

  return schemaReadyPromise;
}
