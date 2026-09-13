/**
 * 成绩配置 + 成绩明细路由（demand §7.2 grade_config / detailed_grade）
 *
 * 平时成绩（综合评价）的后端权威源：
 * - grade_config：一门课一条权重配置（前端「成绩配置」页读写）。
 * - detailed_grade：每生每课一条明细，五类平时评价分由 evaluations 聚合回填。
 *
 * 聚合口径与前端 store.calcTotalScore 对齐：
 *   同类评价跨 session 取平均 → 各类型按 grade_config 权重加权 → 得「平时成绩」。
 */
import { Router } from 'express';
import pool from '../db.js';
import { getDefaultGradeConfig } from '../lib/gradeDefaults.js';
import { syncDetailedGradesFromEvaluations } from '../lib/detailedGrades.js';

const router = Router();

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** DB 行 → 前端 GradeWeightConfig 驼峰结构 */
function mapGradeConfigRow(row) {
  const d = getDefaultGradeConfig(row.course_id);
  return {
    courseId: String(row.course_id || ''),
    regularWeight: num(row.regular_weight, d.regularWeight),
    midtermWeight: num(row.midterm_weight, d.midtermWeight),
    finalWeight: num(row.final_weight, d.finalWeight),
    qualityEvalWeight: num(row.quality_eval_weight, d.qualityEvalWeight),
    qualityEvalMaxBonus: num(row.quality_eval_max_bonus, d.qualityEvalMaxBonus),
    selfEvalWeight: num(row.self_eval_weight, d.selfEvalWeight),
    peerReviewWeight: num(row.peer_review_weight, d.peerReviewWeight),
    interGroupEvalWeight: num(row.inter_group_eval_weight, d.interGroupEvalWeight),
    teacherScoreWeight: num(row.teacher_score_weight, d.teacherScoreWeight),
    mentorScoreWeight: num(row.mentor_score_weight, d.mentorScoreWeight),
    midtermExamWeight: num(row.midterm_exam_weight, d.midtermExamWeight),
    midtermProjectWeight: num(row.midterm_project_weight, d.midtermProjectWeight),
    finalExamWeight: num(row.final_exam_weight, d.finalExamWeight),
    finalProjectWeight: num(row.final_project_weight, d.finalProjectWeight),
  };
}

/** DB 行 → 前端 DetailedGrade 驼峰结构（null 保持 null，供前端「仅计已评子项」判断） */
function mapDetailedGradeRow(row) {
  const dec = (v) => (v === null || v === undefined ? null : Number(v));
  return {
    id: String(row.id || ''),
    studentId: String(row.student_id || ''),
    courseId: String(row.course_id || ''),
    selfEvalScore: dec(row.self_eval_score),
    peerReviewScore: dec(row.peer_review_score),
    interGroupScore: dec(row.inter_group_score),
    teacherScore: dec(row.teacher_score),
    mentorScore: dec(row.mentor_score),
    midtermExamScore: dec(row.midterm_exam_score),
    midtermProjectScore: dec(row.midterm_project_score),
    finalExamScore: dec(row.final_exam_score),
    finalProjectScore: dec(row.final_project_score),
    gradedAt: String(row.graded_at || ''),
  };
}

// ==================== 成绩权重配置 ====================

/** GET /api/grade-config/:courseId - 取某课成绩权重（无则回默认） */
router.get('/grade-config/:courseId', async (req, res) => {
  try {
    const courseId = String(req.params.courseId || '').trim();
    const [rows] = await pool.execute('SELECT * FROM grade_config WHERE course_id = ?', [courseId]);
    if (rows.length === 0) {
      res.json({ success: true, config: getDefaultGradeConfig(courseId), persisted: false });
      return;
    }
    res.json({ success: true, config: mapGradeConfigRow(rows[0]), persisted: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/** PUT /api/grade-config/:courseId - 保存某课成绩权重（upsert） */
router.put('/grade-config/:courseId', async (req, res) => {
  try {
    const courseId = String(req.params.courseId || '').trim();
    if (!courseId) {
      res.status(400).json({ success: false, message: '缺少课程ID' });
      return;
    }
    const body = req.body || {};
    const d = getDefaultGradeConfig(courseId);
    const pick = (key) => (body[key] === undefined || body[key] === null ? d[key] : num(body[key], d[key]));

    await pool.execute(
      `INSERT INTO grade_config (
         course_id, regular_weight, midterm_weight, final_weight, quality_eval_weight, quality_eval_max_bonus,
         self_eval_weight, peer_review_weight, inter_group_eval_weight, teacher_score_weight, mentor_score_weight,
         midterm_exam_weight, midterm_project_weight, final_exam_weight, final_project_weight
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         regular_weight = VALUES(regular_weight),
         midterm_weight = VALUES(midterm_weight),
         final_weight = VALUES(final_weight),
         quality_eval_weight = VALUES(quality_eval_weight),
         quality_eval_max_bonus = VALUES(quality_eval_max_bonus),
         self_eval_weight = VALUES(self_eval_weight),
         peer_review_weight = VALUES(peer_review_weight),
         inter_group_eval_weight = VALUES(inter_group_eval_weight),
         teacher_score_weight = VALUES(teacher_score_weight),
         mentor_score_weight = VALUES(mentor_score_weight),
         midterm_exam_weight = VALUES(midterm_exam_weight),
         midterm_project_weight = VALUES(midterm_project_weight),
         final_exam_weight = VALUES(final_exam_weight),
         final_project_weight = VALUES(final_project_weight)`,
      [
        courseId,
        pick('regularWeight'), pick('midtermWeight'), pick('finalWeight'),
        pick('qualityEvalWeight'), pick('qualityEvalMaxBonus'),
        pick('selfEvalWeight'), pick('peerReviewWeight'), pick('interGroupEvalWeight'),
        pick('teacherScoreWeight'), pick('mentorScoreWeight'),
        pick('midtermExamWeight'), pick('midtermProjectWeight'),
        pick('finalExamWeight'), pick('finalProjectWeight'),
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM grade_config WHERE course_id = ?', [courseId]);
    res.json({ success: true, config: mapGradeConfigRow(rows[0]) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ==================== 成绩明细 ====================

/** GET /api/detailed-grades/student/:studentId - 取某生全部成绩明细 */
router.get('/detailed-grades/student/:studentId', async (req, res) => {
  try {
    const studentId = String(req.params.studentId || '').trim();
    const [rows] = await pool.execute(
      'SELECT * FROM detailed_grade WHERE student_id = ? ORDER BY course_id',
      [studentId]
    );
    res.json({ success: true, grades: rows.map(mapDetailedGradeRow) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/** POST /api/detailed-grades/sync/:courseId - 由 evaluations 聚合回填（可带 ?studentId=） */
router.post('/detailed-grades/sync/:courseId', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const courseId = String(req.params.courseId || '').trim();
    const studentId = String(req.query.studentId || req.body?.studentId || '').trim();
    const written = await syncDetailedGradesFromEvaluations(connection, courseId, studentId);
    res.json({ success: true, written });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  } finally {
    connection.release();
  }
});

export default router;
