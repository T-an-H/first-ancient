/**
 * 成绩域 schema：grade_config（成绩权重配置）+ detailed_grade（成绩明细）。
 *
 * 依据 demand §7.2 表清单。存在意义：
 * - grade_config：一门课一条，存「平时/期中/期末」一级权重与「平时五类」二级权重。
 * - detailed_grade：每生每课一条，存五类平时评价分 + 期中/期末分项分（由 evaluations 聚合回填）。
 * 有了这两张表，「平时成绩（综合评价）」才有后端权威源，学生端不再依赖 localStorage/mock。
 *
 * ⚠️ collation：新表必须与既有表（尤其 courses）一致，否则 `detailed_grade.course_id = courses.id`
 * 这类跨表 JOIN/比较会抛 ER_CANT_AGGREGATE_2COLLATIONS。
 * 历史库 collation 混乱（有的 utf8mb4_bin、有的 utf8mb4_0900_ai_ci、有的 utf8mb4_unicode_ci），
 * 故这里**运行时探测 courses.id 的 collation 并沿用**，而不是写死。
 */
import pool from '../db.js';
import { syncDetailedGradesFromEvaluations } from '../lib/detailedGrades.js';

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

export default function ensureGradeSchema() {
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    const connection = await pool.getConnection();
    try {
      const COLLATION = await detectCollation(connection);
      console.log(`[grade-schema] 新表 collation 对齐既有表: ${COLLATION}`);

      // 成绩权重配置：一课一条（course_id 主键）
      await connection.query(`
        CREATE TABLE IF NOT EXISTS grade_config (
          course_id               VARCHAR(64) NOT NULL,
          regular_weight          INT NOT NULL DEFAULT 40,
          midterm_weight          INT NOT NULL DEFAULT 0,
          final_weight            INT NOT NULL DEFAULT 60,
          quality_eval_weight     INT NOT NULL DEFAULT 0,
          quality_eval_max_bonus  INT NOT NULL DEFAULT 10,
          self_eval_weight        INT NOT NULL DEFAULT 10,
          peer_review_weight      INT NOT NULL DEFAULT 20,
          inter_group_eval_weight INT NOT NULL DEFAULT 10,
          teacher_score_weight    INT NOT NULL DEFAULT 30,
          mentor_score_weight     INT NOT NULL DEFAULT 30,
          midterm_exam_weight     INT NOT NULL DEFAULT 50,
          midterm_project_weight  INT NOT NULL DEFAULT 50,
          final_exam_weight       INT NOT NULL DEFAULT 50,
          final_project_weight    INT NOT NULL DEFAULT 50,
          created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${COLLATION} COMMENT='成绩权重配置'
      `);

      // 成绩明细：每生每课一条（student_id + course_id 唯一）
      await connection.query(`
        CREATE TABLE IF NOT EXISTS detailed_grade (
          id                    VARCHAR(128) NOT NULL,
          student_id            VARCHAR(64)  NOT NULL,
          course_id             VARCHAR(64)  NOT NULL,
          self_eval_score       DECIMAL(5,1) NULL,
          peer_review_score     DECIMAL(5,1) NULL,
          inter_group_score     DECIMAL(5,1) NULL,
          teacher_score         DECIMAL(5,1) NULL,
          mentor_score          DECIMAL(5,1) NULL,
          midterm_exam_score    DECIMAL(5,1) NULL,
          midterm_project_score DECIMAL(5,1) NULL,
          final_exam_score      DECIMAL(5,1) NULL,
          final_project_score   DECIMAL(5,1) NULL,
          graded_at             VARCHAR(32)  DEFAULT '',
          updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_detailed_grade_student_course (student_id, course_id),
          KEY idx_detailed_grade_course (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${COLLATION} COMMENT='成绩明细（每生每课一条）'
      `);

      // 历史数据回填：有评价的课程若 detailed_grade 缺失，补一次聚合。
      // 此前聚合从无调用方（前端只更新 localStorage、后端 /detailed-grades/sync 无人调用），
      // 线上 1155 条评价对应的成绩明细全空，个人中心的能力雷达/职业推荐永远无数据。
      // 幂等：仅对「有评价但无明细」的课程补算，正常运行后每次启动都是空操作。
      await backfillDetailedGrades(connection);
    } finally {
      connection.release();
    }
  })();

  return schemaReadyPromise;
}

/**
 * 回填历史成绩明细：找出「有评价但 detailed_grade 一条都没有」的课程，逐门聚合。
 *
 * 逐门（而非全库全量）是为了启动开销可控，且只补真正缺的课。
 *
 * ⚠️ 这里刻意用「两次单表查询 + JS 求差」，而不是
 * `course_id NOT IN (SELECT course_id FROM detailed_grade)`：
 * 后者是跨表列比较，两表排序规则不一致时会抛 ER_CANT_AGGREGATE_2COLLATIONS，
 * 而这句又在 try/catch 里 —— 结果就是**静默不回填**，成绩明细永远为空
 * （能力雷达/职业推荐跟着一直没数据），且日志只有一行 warning，极难定位。
 */
async function backfillDetailedGrades(connection) {
  try {
    const [evalCourses] = await connection.query(
      `SELECT DISTINCT course_id
       FROM evaluations
       WHERE course_id IS NOT NULL AND TRIM(course_id) <> ''`
    );
    const [detailedCourses] = await connection.query(
      'SELECT DISTINCT course_id FROM detailed_grade'
    );
    const alreadyDone = new Set(detailedCourses.map((row) => String(row.course_id)));

    const courses = evalCourses
      .map((row) => String(row.course_id))
      .filter((courseId) => courseId && !alreadyDone.has(courseId));
    if (courses.length === 0) return;

    let written = 0;
    for (const courseId of courses) {
      written += await syncDetailedGradesFromEvaluations(connection, courseId);
    }
    console.log(`[grade-schema] 回填历史成绩明细：${courses.length} 门课，${written} 条`);
  } catch (e) {
    console.warn('[grade-schema] 回填历史成绩明细失败（不影响启动）:', e.message);
  }
}
