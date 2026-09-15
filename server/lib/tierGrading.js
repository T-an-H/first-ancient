/**
 * 从分层测试路由源码中抽取判分纯函数（供测试/校验复用）。
 *
 * 为什么用抽取而不是直接 import：routes/tierTest.js 顶部会 import db 和 deepseek，
 * 直接引入会拉起数据库连接与 env 加载。判分逻辑本身是纯函数，按源码抽取更轻。
 *
 * 边界标记用显式注释，避免像先前那样被文件头注释里的同名文本误伤。
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
export const TIER_TEST_ROUTE_PATH = resolve(here, '../routes/tierTest.js');

const START = '// --- 判分辅助函数开始 ---';
const END = '// --- 判分辅助函数结束 ---';

export function loadTierGradingHelpers() {
  const source = fs.readFileSync(TIER_TEST_ROUTE_PATH, 'utf8');
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('未在 tierTest.js 中找到判分辅助函数边界标记，抽取失败');
  }
  const code = source.slice(start, end);
  return vm.runInNewContext(
    `${code}\n;({ normalizeAnswer, answerKey, resolveChoiceAnswer, canonicalAnswer })`,
    { console: { warn: () => {}, log: () => {} } },
  );
}

/**
 * 复刻 POST /:courseId/submit 的判分循环（同一套 helper、同样的比较顺序）。
 * 路由改判分逻辑时此处需同步，故单测会断言两者结果一致的关键场景。
 */
export function gradeTierAnswers({ questions, answers, answerKey, resolveChoiceAnswer }) {
  let totalScore = 0;
  const details = questions.map((q) => {
    const studentAns = answers.find((a) => a.questionId === q.id);
    const studentKey = studentAns?.answerText ? answerKey(studentAns.answerText) : '';
    const rawCorrect = String(q.answer ?? '').trim();
    const options = typeof q.options === 'string'
      ? (() => { try { return JSON.parse(q.options); } catch { return []; } })()
      : q.options;

    let isCorrect = Boolean(studentKey) && studentKey === answerKey(rawCorrect);
    if (!isCorrect) {
      const resolved = resolveChoiceAnswer(rawCorrect, options);
      if (resolved) isCorrect = studentKey === answerKey(resolved);
    }

    const score = isCorrect ? (q.score || 10) : 0;
    totalScore += score;
    return { questionId: q.id, isCorrect, score };
  });
  return { totalScore, details };
}
