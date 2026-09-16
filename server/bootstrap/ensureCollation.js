/**
 * 全库字符集/排序规则（collation）自愈。
 *
 * 背景：这个库的历史表由不同来源建出来 —— 有的来自 `course_db_full_schema.sql`
 * （utf8mb4_unicode_ci），有的由早期迁移脚本建（吃 MySQL 8 的服务端默认
 * utf8mb4_0900_ai_ci）。同排序规则的表之间比较没问题，**一旦跨表比较**
 * （如 `course_id IN (SELECT id FROM courses WHERE ...)`）就会抛：
 *
 *   ER_CANT_AGGREGATE_2COLLATIONS:
 *   Illegal mix of collations (utf8mb4_unicode_ci,IMPLICIT)
 *                     and (utf8mb4_0900_ai_ci,IMPLICIT) for operation '='
 *
 * 症状是「删学院永远失败」「某些统计恒为 0」，且错误与业务无关、极难从界面看出。
 *
 * 做法：以 `courses.id` 的排序规则为基准（课程是各域的中心表），把**所有**
 * 文本列排序规则不一致的表 `CONVERT TO` 过来。为什么整体 CONVERT 而不是只改少数列：
 * `course_id`/`student_id` 这类关联列会按 join 条件逐对比较，漏一列就还会炸；
 * 整表转换一次性消除整类问题，代价只是启动时一次全表重建（数据量小，秒级）。
 *
 * 幂等：只处理真正不一致的表，一致时是空操作。失败的库记 warning 继续启动，
 * 不因一个表卡住整个服务。
 */
import pool from '../db.js';

let readyPromise;

/** 基准排序规则：取 courses.id 的 collation；取不到则回退 unicode_ci */
async function detectBaseCollation(connection) {
  const [rows] = await connection.query(
    `SELECT COLLATION_NAME AS collation
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'courses'
       AND COLUMN_NAME = 'id'
     LIMIT 1`
  );
  return String(rows[0]?.collation || '') || 'utf8mb4_unicode_ci';
}

/**
 * 找出文本列排序规则与基准不一致的表。
 *
 * 只取字符类型列（COLUMN_NAME 有 COLLATION_NAME 即为字符列），
 * 数字/日期列没有排序规则，不参与判断。
 */
async function findMismatchedTables(connection, baseCollation) {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME, COLLATION_NAME, COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND COLLATION_NAME IS NOT NULL
       AND COLLATION_NAME <> ?
     GROUP BY TABLE_NAME, COLLATION_NAME
     ORDER BY TABLE_NAME`,
    [baseCollation]
  );
  return rows;
}

export default function ensureCollation() {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    const connection = await pool.getConnection();
    try {
      const base = await detectBaseCollation(connection);
      const mismatched = await findMismatchedTables(connection, base);

      if (mismatched.length === 0) {
        console.log(`[collation] 全库字符集一致: ${base}`);
        return;
      }

      const names = mismatched.map((row) => row.TABLE_NAME);
      console.log(`[collation] 基准=${base}，${names.length} 张表不一致，开始统合: ${names.join(', ')}`);

      let converted = 0;
      const failed = [];
      for (const row of mismatched) {
        try {
          // 表名来自 information_schema（非用户输入），反引号包裹即可
          await connection.query(
            `ALTER TABLE \`${row.TABLE_NAME}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE ${base}`
          );
          converted += 1;
        } catch (error) {
          failed.push(`${row.TABLE_NAME}(${error.code || error.message})`);
        }
      }

      if (failed.length > 0) {
        // 不阻断启动：转换失败的表仍然可用，只是跨表比较可能报错。
        console.warn(`[collation] 以下表统合失败，需人工处理: ${failed.join(', ')}`);
      }
      console.log(`[collation] 已统合 ${converted}/${names.length} 张表为 ${base}`);
    } catch (error) {
      console.warn('[collation] 字符集自愈失败（不影响启动）:', error.message);
    } finally {
      connection.release();
    }
  })();

  return readyPromise;
}
