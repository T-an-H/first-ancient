/**
 * AI 分层测试路由
 *
 * GET  /api/tier-test/:courseId/questions        — 获取分层测试题（没有则自动 AI 生成）
 * POST /api/tier-test/:courseId/submit            — 学生提交测试答案，返回层级结果
 * GET  /api/tier-test/:courseId/result/:studentId — 查询学生的分层结果
 */
import { Router } from 'express';
import pool from '../db.js';
import { generateTierTestQuestions } from '../deepseek.js';

const router = Router();

/**
 * 归一化答案文本：去空格、去标点、统一大小写。
 * AI 生成的正确答案可能带「。」或全角/半角标点，前端提交的是选项原文，
 * 直接字符串相等会误判为错。
 */
function normalizeAnswer(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，,。.!！？?；;：:、"'‘’“”()（）【】\[\]-]/g, '');
}

/**
 * GET /api/tier-test/:courseId/questions
 * 获取分层测试题目（课程共用）
 * - 有缓存 → 直接返回
 * - 无缓存 → 调 DeepSeek 生成，存库，返回（不含正确答案，防止作弊）
 */
router.get('/:courseId/questions', async (req, res) => {
  try {
    const { courseId } = req.params;

    // 查是否已经有题目
    const [existing] = await pool.execute(
      'SELECT * FROM tier_test_questions WHERE course_id = ? ORDER BY order_index',
      [courseId]
    );

    if (existing.length > 0) {
      // 已有题目，直接返回（不含 answer）
      return res.json({
        success: true,
        questions: existing.map(q => ({
          id: q.id,
          questionType: q.question_type,
          questionText: q.question_text,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
          score: q.score,
          orderIndex: q.order_index,
        })),
        fromCache: true,
      });
    }

    // 没有题目 → 查课程信息
    const [courses] = await pool.execute(
      'SELECT title, description FROM courses WHERE id = ?',
      [courseId]
    );
    if (courses.length === 0) {
      return res.status(404).json({ success: false, message: '课程不存在' });
    }

    const course = courses[0];

    // 调 AI 生成
    const questions = await generateTierTestQuestions({
      courseTitle: course.title,
      courseDesc: course.description || '',
    });

    // 存库
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = `tq-${courseId}-${i}-${Date.now()}`;
      await pool.execute(
        'INSERT INTO tier_test_questions (id, course_id, question_type, question_text, options, answer, score, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          qId,
          courseId,
          q.question_type,
          q.question_text,
          JSON.stringify(q.options || ['正确', '错误']),
          String(q.answer),
          q.score || 10,
          i,
        ]
      );
      q._id = qId;
    }

    // 返回（不含 answer）
    res.json({
      success: true,
      questions: questions.map((q, i) => ({
        id: q._id || `tq-${courseId}-${i}`,
        questionType: q.question_type,
        questionText: q.question_text,
        options: q.options || ['正确', '错误'],
        score: q.score || 10,
        orderIndex: i,
      })),
      fromCache: false,
    });
  } catch (e) {
    console.error('获取分层测试题失败:', e);
    res.status(500).json({ success: false, message: `获取题目失败: ${e.message}` });
  }
});

/**
 * POST /api/tier-test/:courseId/submit
 * 提交分层测试答案，自动判分返回层级
 * body: { studentId, answers: [{ questionId, answerText }] }
 */
router.post('/:courseId/submit', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId, answers } = req.body;

    if (!studentId || !answers?.length) {
      return res.status(400).json({ success: false, message: '学生ID和答案为必填' });
    }

    // 检查是否已提交过
    const [existing] = await pool.execute(
      'SELECT * FROM tier_test_results WHERE course_id = ? AND student_id = ?',
      [courseId, studentId]
    );
    if (existing.length > 0) {
      return res.json({
        success: true,
        alreadySubmitted: true,
        tier: existing[0].tier,
        score: existing[0].score,
        message: '你已完成分层测试',
      });
    }

    // 查出所有题目（含答案，用于判分）
    const [questions] = await pool.execute(
      'SELECT * FROM tier_test_questions WHERE course_id = ? ORDER BY order_index',
      [courseId]
    );
    if (questions.length === 0) {
      return res.status(400).json({ success: false, message: '还没有分层测试题目' });
    }

    // 判分（选择题/判断题直接比对，忽略空格、大小写与标点，避免「正确。」这类差异误判）
    let totalScore = 0;
    const details = questions.map(q => {
      const studentAns = answers.find(a => a.questionId === q.id);
      const studentText = normalizeAnswer(studentAns?.answerText);
      const correctText = normalizeAnswer(q.answer);
      const isCorrect = Boolean(studentText) && studentText === correctText;
      const score = isCorrect ? (q.score || 10) : 0;
      totalScore += score;
      return { questionId: q.id, isCorrect, score, correctAnswer: q.answer, studentAnswer: studentAns?.answerText || '' };
    });

    // 判定层级
    let tier = 'basic';
    if (totalScore >= 80) tier = 'excellent';
    else if (totalScore >= 60) tier = 'advanced';

    // 存结果（唯一键 course_id+student_id：并发/重复提交时用 REPLACE，避免 ER_DUP_ENTRY）
    const resultId = `tr-${courseId}-${studentId}`;
    await pool.execute(
      'REPLACE INTO tier_test_results (id, course_id, student_id, score, tier) VALUES (?, ?, ?, ?, ?)',
      [resultId, courseId, studentId, totalScore, tier]
    );

    res.json({
      success: true,
      score: totalScore,
      tier,
      tierLabel: { basic: '基础层', advanced: '进阶层', excellent: '卓越层' }[tier],
      details,
    });
  } catch (e) {
    console.error('提交分层测试失败:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/tier-test/:courseId/result/:studentId
 * 查询学生分层结果
 */
router.get('/:courseId/result/:studentId', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM tier_test_results WHERE course_id = ? AND student_id = ?',
      [req.params.courseId, req.params.studentId]
    );
    if (rows.length === 0) {
      return res.json({ success: true, result: null });
    }
    const r = rows[0];
    res.json({
      success: true,
      result: {
        tier: r.tier,
        score: r.score,
        tierLabel: { basic: '基础层', advanced: '进阶层', excellent: '卓越层' }[r.tier],
        submittedAt: r.submitted_at,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
