/**
 * 由 evaluations + exam_scores 聚合回填 detailed_grade（平时五类分项 + 期中/期末分项）。
 *
 * 口径（与前端 store.calcTotalScore 对齐）：
 *   - 平时：同类评价跨 session 取平均 → self/peer/inter/teacher/mentor 列。
 *   - 期中/期末：exam_scores 里 status='submitted' 的同类成绩取平均 → midterm_exam/project、final_exam/project 列。
 * 幂等：按 (student_id, course_id) upsert，仅覆盖本次聚合出的列，其余列保持原值。
 * 供 routes/grades.js 与 scripts/seed-eval-data.mjs 共用。
 */

/** evaluations.type → detailed_grade 列名 */
export const EVAL_TYPE_TO_COLUMN = {
  self: 'self_eval_score',
  intra_group: 'peer_review_score',
  inter_group: 'inter_group_score',
  teacher: 'teacher_score',
  mentor: 'mentor_score',
};

/** exam_scores.type → detailed_grade 列名 */
export const EXAM_TYPE_TO_COLUMN = {
  midterm_exam: 'midterm_exam_score',
  midterm_project: 'midterm_project_score',
  final_exam: 'final_exam_score',
  final_project: 'final_project_score',
};

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {string} courseId
 * @param {string} [studentId] 为空则整门课
 * @returns {Promise<number>} 写入/更新的学生数
 */
export async function syncDetailedGradesFromEvaluations(connection, courseId, studentId = '') {
  const params = [courseId];
  let studentFilter = '';
  if (studentId) {
    studentFilter = ' AND student_id = ?';
    params.push(studentId);
  }

  // student_id → { column: score }
  const byStudent = new Map();
  const ensure = (sid) => {
    if (!byStudent.has(sid)) byStudent.set(sid, {});
    return byStudent.get(sid);
  };

  // 1) 平时五类：同类评价跨 session 取平均
  const [evalRows] = await connection.query(
    `SELECT student_id, type, AVG(score) AS avg_score
     FROM evaluations
     WHERE course_id = ?${studentFilter}
     GROUP BY student_id, type`,
    params
  );
  for (const row of evalRows) {
    const column = EVAL_TYPE_TO_COLUMN[row.type];
    if (!column) continue;
    const sid = String(row.student_id || '');
    if (!sid) continue;
    ensure(sid)[column] = Math.round(num(row.avg_score));
  }

  // 2) 期中/期末：仅取已提交（status='submitted'）
  const [examRows] = await connection.query(
    `SELECT student_id, type, AVG(score) AS avg_score
     FROM exam_scores
     WHERE course_id = ? AND status = 'submitted'${studentFilter}
     GROUP BY student_id, type`,
    params
  );
  for (const row of examRows) {
    const column = EXAM_TYPE_TO_COLUMN[row.type];
    if (!column) continue;
    const sid = String(row.student_id || '');
    if (!sid) continue;
    ensure(sid)[column] = Math.round(num(row.avg_score));
  }

  let written = 0;
  for (const [sid, columns] of byStudent) {
    const cols = Object.keys(columns);
    if (cols.length === 0) continue;
    const id = `dg-${sid}-${courseId}`;
    const updates = cols.map((c) => `${c} = VALUES(${c})`).join(', ');
    const insertCols = ['id', 'student_id', 'course_id', ...cols, 'graded_at'];
    const placeholders = insertCols.map(() => '?').join(', ');
    const values = [id, sid, courseId, ...cols.map((c) => columns[c]), new Date().toISOString().slice(0, 10)];
    await connection.query(
      `INSERT INTO detailed_grade (${insertCols.join(', ')})
       VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE ${updates}`,
      values
    );
    written += 1;
  }
  return written;
}
