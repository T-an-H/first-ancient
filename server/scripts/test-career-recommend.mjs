/**
 * 职业推荐数量契约测试
 *
 * 契约：只要有输入课程，返回条数恒在 [3, 6] 内。
 *   - 数据丰富（命中职业多）→ 取分数最高的前 6
 *   - 命中职业不足 3 → 按类目相关性补齐到 3
 *
 * 运行：node server/scripts/test-career-recommend.mjs
 */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '../..');

const bundle = await build({
  entryPoints: [resolve(projectRoot, 'src/lib/careerMatch.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'node',
  tsconfig: resolve(projectRoot, 'tsconfig.json'),
  logLevel: 'silent',
});
const { recommendCareers } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

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

const MIN = 3;
const MAX = 6;

/** 构造 n 门课；用真实存在的课程名以命中显式映射 */
const REAL_TITLES = [
  'Java程序设计',
  'Python 数据分析入门',
  'React 前端开发实战',
  'SQL 数据库设计',
  'Vue 3 组合式 API',
  '机器学习基础',
  '计算机网络',
  '数据结构与算法',
];
function makeInputs(n, title = (i) => REAL_TITLES[i % REAL_TITLES.length]) {
  return Array.from({ length: n }, (_, i) => ({
    courseId: `c${i}`,
    title: title(i),
    description: '',
    score: 90 - i,
  }));
}

console.log('\n[1] 数量契约：结果恒在 [3, 6]');
for (const n of [1, 2, 3, 4, 6, 8, 12]) {
  test(`${n} 门课 → 结果在 3~6 条`, () => {
    const out = recommendCareers(makeInputs(n), 3, MAX, MIN);
    assert.ok(
      out.length >= MIN && out.length <= MAX,
      `期望 ${MIN}~${MAX} 条，实得 ${out.length}`,
    );
  });
}

console.log('\n[2] 边界：无数据时返回空（不硬凑）');
test('0 门课 → 返回空数组', () => {
  assert.deepEqual(recommendCareers([], 3, MAX, MIN), []);
});

console.log('\n[3] 数据丰富时不超出上限');
test('12 门课 → 恰好不超过 6 条', () => {
  const out = recommendCareers(makeInputs(12), 3, MAX, MIN);
  assert.ok(out.length <= MAX, `实得 ${out.length}`);
});

console.log('\n[4] 未知课程（无映射、无信号词）也要能凑够下限');
test('完全无法匹配的课程名 → 仍返回 3 条', () => {
  const out = recommendCareers(makeInputs(3, (i) => `某某课程${i}`), 3, MAX, MIN);
  assert.equal(out.length, MIN, `期望 ${MIN} 条，实得 ${out.length}`);
});

console.log('\n[5] 补齐项标记为「参考」（无命中课程）');
test('补齐项 matchedCourseIds 为空，命中项非空', () => {
  const out = recommendCareers(makeInputs(3, (i) => `某某课程${i}`), 3, MAX, MIN);
  assert.ok(out.every((m) => m.matchedCourseIds.length === 0), '无法匹配时全部应为参考项');
  const hit = recommendCareers(makeInputs(8), 3, MAX, MIN).filter((m) => m.matchedCourseIds.length > 0);
  assert.ok(hit.length > 0, '有真实课程时应至少有一条命中');
  assert.ok(hit.every((m) => m.score > 0), '命中项 score 应大于 0');
});

console.log('\n[6] 稳定性：同样输入产出同样结果');
test('两次调用结果一致', () => {
  const a = recommendCareers(makeInputs(4), 3, MAX, MIN).map((m) => m.career.name);
  const b = recommendCareers(makeInputs(4), 3, MAX, MIN).map((m) => m.career.name);
  assert.deepEqual(a, b);
});

console.log('\n[7] 补齐不重复');
test('结果内职业名不重复', () => {
  const out = recommendCareers(makeInputs(2), 3, MAX, MIN);
  const names = out.map((m) => m.career.name);
  assert.equal(new Set(names).size, names.length, `出现重复: ${names.join(', ')}`);
});

console.log(`\n通过 ${passed} 项${process.exitCode ? '，存在失败' : '，全部通过'}\n`);
