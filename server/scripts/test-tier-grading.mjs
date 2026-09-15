/**
 * AI 分层测试判分回归测试
 *
 * 覆盖三类历史 bug：
 * 1. 判断题答案写法不一致（AI 写「对/错」「true/false」，前端提交「正确/错误」）
 *    —— 曾导致 AI 出题成功时学生答对却判错，白丢 30 分
 * 2. 本地兜底题库答案与选项文案不一致（错别字）
 * 3. 选择题答案被写成选项序号 / 布尔值等非原文形式
 *
 * 运行：node server/scripts/test-tier-grading.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import { loadTierGradingHelpers, gradeTierAnswers, TIER_TEST_ROUTE_PATH } from '../lib/tierGrading.js';

const here = dirname(fileURLToPath(import.meta.url));
const { answerKey, resolveChoiceAnswer, canonicalAnswer, normalizeAnswer } = loadTierGradingHelpers();

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
}

// 前端 CourseLearn.vue 的提交口径：判断题提交「正确/错误」
const FRONTEND = { TRUE: '正确', FALSE: '错误' };

console.log('\n[1] 判断题：答案写法等价（前端固定提交 正确/错误）');
for (const correctWriting of ['正确', '对', '是', 'true', 'T', '√', true]) {
  test(`答案写成 ${JSON.stringify(correctWriting)} → 学生选「正确」判对`, () => {
    assert.ok(answerKey(FRONTEND.TRUE) === answerKey(correctWriting));
  });
}
for (const wrongWriting of ['错误', '错', '否', 'false', 'F', '×', false]) {
  test(`答案写成 ${JSON.stringify(wrongWriting)} → 学生选「错误」判对`, () => {
    assert.ok(answerKey(FRONTEND.FALSE) === answerKey(wrongWriting));
  });
}

console.log('\n[2] 判断题：不应发生碰撞');
test('「正确」与「错误」不互相等价', () => {
  assert.notEqual(answerKey('正确'), answerKey('错误'));
});
test('空答案不判为正确', () => {
  assert.equal(answerKey(''), '');
  assert.notEqual(answerKey(''), answerKey('正确'));
});

console.log('\n[3] 选择题：答案写成选项序号时按序号还原');
const fourOptions = ['甲', '乙', '丙', '丁'];
for (const [writing, expected] of [['B', '乙'], ['b', '乙'], ['选项B', '乙'], ['2', '乙'], ['2.', '乙'], ['D', '丁']]) {
  test(`答案 ${JSON.stringify(writing)} → 还原为 ${JSON.stringify(expected)}`, () => {
    assert.equal(resolveChoiceAnswer(writing, fourOptions), expected);
  });
}
test('答案不是序号时不做还原（避免误伤「2」这类真实选项文本）', () => {
  assert.equal(resolveChoiceAnswer('2 个', fourOptions), '');
});
test('序号越界时不还原', () => {
  assert.equal(resolveChoiceAnswer('E', fourOptions), '');
  assert.equal(resolveChoiceAnswer('9', fourOptions), '');
});

console.log('\n[4] 选择题：原文比对（忽略空格/标点/大小写）');
test('「模板或 JSX」与「模板或jsx。」等价', () => {
  assert.equal(answerKey('模板或 JSX'), answerKey('模板或jsx。'));
});
test('不同选项不互相等价', () => {
  assert.notEqual(answerKey('模板或 JSX'), answerKey('存储过程'));
});

console.log('\n[5] 存库规范化：answer 与前端提交口径同构');
test('判断题答案统一落库为选项原文的字', () => {
  assert.equal(canonicalAnswer('对', ['正确', '错误']), '正确');
  assert.equal(canonicalAnswer(true, ['正确', '错误']), '正确');
  assert.equal(canonicalAnswer(false, ['正确', '错误']), '错误');
  assert.equal(canonicalAnswer('T', ['正确', '错误']), '正确');
});
test('选择题序号答案落库为选项原文', () => {
  assert.equal(canonicalAnswer('B', fourOptions), '乙');
  assert.equal(canonicalAnswer('乙', fourOptions), '乙');
});

console.log('\n[6] 本地兜底题库：每道题答案必须能命中某个选项');
const deepseekSrc = fs.readFileSync(resolve(here, '../deepseek.js'), 'utf8');
const bankSrc = deepseekSrc
  .slice(deepseekSrc.indexOf('function fallbackTierTestQuestions'), deepseekSrc.indexOf('function fallbackGradeSubmission'))
  .replace('function fallbackTierTestQuestions', 'function buildBank');
const { buildBank } = vm.runInNewContext(
  `${bankSrc}\n;({ buildBank })`,
  { console: { warn: () => {} } },
);

for (const courseTitle of ['前端开发实战', 'python 数据分析', '数据库与后端服务', 'UI 设计基础', '一门不存在的课']) {
  test(`「${courseTitle}」题库 10 题答案均能命中选项`, () => {
    const { questions } = buildBank({ courseTitle });
    assert.equal(questions.length, 10, '题库题量必须是 10（接口按 10 题判层）');
    questions.forEach((q, i) => {
      const options = q.options ?? [];
      const hit = options.some((opt) => answerKey(opt) === answerKey(q.answer));
      assert.ok(hit, `第 ${i + 1} 题答案 ${JSON.stringify(q.answer)} 不在选项 ${JSON.stringify(options)} 中`);
    });
  });
}

console.log('\n[7] 端到端：满题库全答对应得 100 分且层级为卓越层');
test('兜底题库全答对 → 100 分 → excellent', () => {
  const { questions } = buildBank({ courseTitle: '前端开发实战' });
  // 模拟前端提交：判断题提交「正确/错误」，选择题提交选项原文
  const answers = questions.map((q) => ({
    questionId: q.question_text,
    answerText: q.question_type === 'true_false'
      ? (answerKey(q.answer) === 'T' ? FRONTEND.TRUE : FRONTEND.FALSE)
      : q.answer,
  }));
  const { totalScore } = gradeTierAnswers({
    questions: questions.map((q) => ({ ...q, id: q.question_text, options: q.options })),
    answers,
    answerKey,
    resolveChoiceAnswer,
  });
  assert.equal(totalScore, 100, `期望满分，实得 ${totalScore}`);
  assert.ok(totalScore >= 80, '应判定为卓越层');
});

test('AI 把判断题答案写成 true/false 时全答对仍得 100 分（原 P0 回归）', () => {
  const { questions } = buildBank({ courseTitle: '前端开发实战' });
  const aiStyle = questions.map((q, i) => ({
    ...q,
    id: `q${i}`,
    answer: q.question_type === 'true_false' ? (answerKey(q.answer) === 'T') : q.answer,
  }));
  const answers = aiStyle.map((q) => ({
    questionId: q.id,
    answerText: q.question_type === 'true_false'
      ? (q.answer === true ? FRONTEND.TRUE : FRONTEND.FALSE)
      : q.answer,
  }));
  const { totalScore } = gradeTierAnswers({ questions: aiStyle, answers, answerKey, resolveChoiceAnswer });
  assert.equal(totalScore, 100, `期望满分，实得 ${totalScore}`);
});

test('全部乱答 → 0 分 → basic', () => {
  const { questions } = buildBank({ courseTitle: '前端开发实战' });
  const answers = questions.map((q, i) => ({ questionId: `q${i}`, answerText: '完全不搭边的答案' }));
  const { totalScore } = gradeTierAnswers({
    questions: questions.map((q, i) => ({ ...q, id: `q${i}` })),
    answers,
    answerKey,
    resolveChoiceAnswer,
  });
  assert.equal(totalScore, 0);
});

console.log('\n[8] 结构性检查：归一化函数仍在路由文件中（抽取标记未失效）');
test('tierTest.js 的判分标记齐全', () => {
  const source = fs.readFileSync(TIER_TEST_ROUTE_PATH, 'utf8');
  assert.ok(source.includes('// --- 判分辅助函数开始 ---'));
  assert.ok(source.includes('// --- 判分辅助函数结束 ---'));
});
test('normalizeAnswer 仍会剥离常见标点', () => {
  assert.equal(normalizeAnswer('正确。'), '正确');
  assert.equal(normalizeAnswer(' 状态 不是响应式 '), '状态不是响应式');
});

console.log(`\n通过 ${passed} 项${process.exitCode ? '，存在失败' : '，全部通过'}\n`);
