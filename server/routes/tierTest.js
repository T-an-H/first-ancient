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

// --- 判分辅助函数开始 ---
// 注意：这段被 server/lib/tierGrading.js 按标记抽出做单测，改逻辑时保留标记。
// （曾因文件头注释里出现「const router = Router」导致按文本定位抽错内容，故改用显式标记。）

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
 * 答案等价类：把同一含义的写法归一到同一个 key，跨类比较。
 *
 * 必要性：front/back 两侧对判断题的表述不一致，直接全等会整段判错 —
 * - AI 出题：prompt 要求 answer 写「正确 / 错误」
 * - 本地兜底题库：answer 写「正确 / 错误」
 * - 前端提交：`picked ? '正确' : '错误'`
 * - 但模型仍可能返回 true/false、对/错、T/F、√/× 等写法
 * 归一化后统一映射到 T/F；选择题则回落到原文比较。
 */
function answerKey(value) {
  const text = normalizeAnswer(value);
  if (!text) return '';
  if (['正确', '对', '是', 'true', 't', 'yes', 'y', '√'].includes(text)) return 'T';
  if (['错误', '错', '否', 'false', 'f', 'no', 'n', '×', 'x'].includes(text)) return 'F';
  return text;
}

/**
 * 兜底：AI 若把选择题答案写成选项序号（「B」「选项B」「2」…），
 * 按序号取回选项原文再比较，避免整道题对所有学生恒判错。
 */
function resolveChoiceAnswer(expected, options) {
  const raw = String(expected ?? '').trim();
  if (!raw || !Array.isArray(options) || options.length === 0) return '';
  const idxMatch = raw.match(/^(?:选项|option)?\s*([A-Za-z]|\d{1,2})$/) || raw.match(/^([A-Za-z]|\d{1,2})[.、)]$/);
  if (!idxMatch) return '';
  const token = idxMatch[1];
  let idx = /^\d/.test(token) ? Number(token) - 1 : token.toUpperCase().charCodeAt(0) - 65;
  if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) return '';
  return String(options[idx]);
}

/**
 * 存库前把答案规范化成「选项原文」：
 * - 判断题：对/错、true/false 等一律写成选项数组里的那两个字，保证与前端提交值同构
 * - 选择题：答案是序号时还原成选项原文
 * 这样落库的 answer 与判分口径一致，避免两处逻辑分叉。
 */
function canonicalAnswer(answer, options) {
  const raw = String(answer ?? '').trim();
  if (!Array.isArray(options) || options.length === 0) return raw;
  const key = answerKey(raw);
  if (key === 'T' || key === 'F') {
    const hit = options.find(o => answerKey(o) === key);
    if (hit) return String(hit);
  }
  return resolveChoiceAnswer(raw, options) || raw;
}
// --- 判分辅助函数结束 ---

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
      const options = q.options && q.options.length ? q.options : ['正确', '错误'];
      const answer = canonicalAnswer(q.answer, options);
      // 答案对不上任何选项 → 该题对所有学生恒判错，落日志便于发现题库问题
      if (!options.some(o => answerKey(o) === answerKey(answer))) {
        console.warn(`[分层测试] 题目 ${qId} 的答案无法匹配任何选项，该题将恒判错：answer=${JSON.stringify(q.answer)} options=${JSON.stringify(options)}`);
      }
      await pool.execute(
        'INSERT INTO tier_test_questions (id, course_id, question_type, question_text, options, answer, score, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          qId,
          courseId,
          q.question_type,
          q.question_text,
          JSON.stringify(options),
          answer,
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

    // 判分：选择题/判断题比对答案原文，忽略空格、大小写与标点，
    // 且判断题在「正确/错误」「对/错」「true/false」「T/F」之间互相等价
    let totalScore = 0;
    const details = questions.map(q => {
      const studentAns = answers.find(a => a.questionId === q.id);
      const studentKey = studentAns?.answerText ? answerKey(studentAns.answerText) : '';
      const rawCorrect = String(q.answer ?? '').trim();

      const options = typeof q.options === 'string'
        ? (() => { try { return JSON.parse(q.options); } catch { return []; } })()
        : q.options;

      // 主比较：答案原文（判断题经 answerKey 归一后跨写法等价）
      let isCorrect = Boolean(studentKey) && studentKey === answerKey(rawCorrect);

      // 兜底：答案写成选项序号时，按序号取回选项原文再比一次
      if (!isCorrect) {
        const resolved = resolveChoiceAnswer(rawCorrect, options);
        if (resolved) isCorrect = studentKey === answerKey(resolved);
      }

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
