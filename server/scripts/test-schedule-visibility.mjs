/**
 * 「全班级」排课语义回归测试
 *
 * 语义约定：schedule.className 为空 = 全班级，对本课程所有学生生效。
 *
 * 背景：此前空班级被当作「班级未填写」，学生端按班级拉排课时精确等值匹配
 * 永远命中不了空行，导致排课读不到、AI 分层闸门恒不开（杨洋案例）。
 *
 * 运行：node server/scripts/test-schedule-visibility.mjs
 */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '../..');

const bundle = await build({
  entryPoints: [resolve(projectRoot, 'src/lib/schedule.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'node',
  tsconfig: resolve(projectRoot, 'tsconfig.json'),
  logLevel: 'silent',
});
const mod = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);
const { isScheduleVisibleToClass, buildCourseScheduleOccurrences, mergeSchedulesForClass } = mod;

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

/** 造一条排课；className 省略 = 全班级。默认单周（startDate ~ endDate 同一周内 → 1 次课） */
const mk = (id, className, { courseId = 'c1', day = '周二', start = '2026-09-15', end = '2026-09-15', slot = '10:15-12:15', room = 'A101' } = {}) => ({
  id,
  courseId,
  title: 'T',
  className,
  day,
  startDate: start,
  endDate: end,
  timeSlot: slot,
  room,
  teacher: '王老师',
});

console.log('\n[1] isScheduleVisibleToClass — 可见性判据');
test('全班级行（className 为空）对所有班级可见', () => {
  assert.equal(isScheduleVisibleToClass({ className: '' }, '甲班'), true);
  assert.equal(isScheduleVisibleToClass({ className: '' }, '乙班'), true);
  assert.equal(isScheduleVisibleToClass({ className: undefined }, '甲班'), true);
  assert.equal(isScheduleVisibleToClass({ className: null }, '甲班'), true);
});
test('班级专属行只对本班可见', () => {
  assert.equal(isScheduleVisibleToClass({ className: '甲班' }, '甲班'), true);
  assert.equal(isScheduleVisibleToClass({ className: '甲班' }, '乙班'), false);
});
test('班级名首尾空格不影响匹配', () => {
  assert.equal(isScheduleVisibleToClass({ className: ' 甲班 ' }, '甲班'), true);
  assert.equal(isScheduleVisibleToClass({ className: '甲班' }, ' 甲班 '), true);
});
test('未传班级（教师/管理端）→ 全部可见', () => {
  assert.equal(isScheduleVisibleToClass({ className: '甲班' }, ''), true);
  assert.equal(isScheduleVisibleToClass({ className: '甲班' }, undefined), true);
});

console.log('\n[2] buildCourseScheduleOccurrences — 杨洋案例（原 bug 的复现面）');
test('全班级排课 + 按班级查询 → 不再返回空数组', () => {
  const schedules = [mk('s1', ''), mk('s2', '', { day: '周三', slot: '19:00-21:00' }), mk('s3', '', { day: '周六' })];
  const occurrences = buildCourseScheduleOccurrences(schedules, 'c1', '物联网工程2101班');
  assert.equal(occurrences.length, 3, `期望 3 次课，实得 ${occurrences.length}`);
});
test('全班级行与本班专属行同处时段 → 只算一次课', () => {
  const schedules = [mk('global', ''), mk('mine', '甲班')];
  const occurrences = buildCourseScheduleOccurrences(schedules, 'c1', '甲班');
  assert.equal(occurrences.length, 1, `期望去重为 1 次课，实得 ${occurrences.length}`);
});
test('重合时保留班级专属行（教室更贴近本班）', () => {
  const schedules = [mk('global', '', { room: '大礼堂' }), mk('mine', '甲班', { room: 'A101' })];
  const occurrences = buildCourseScheduleOccurrences(schedules, 'c1', '甲班');
  assert.equal(occurrences[0].schedule.room, 'A101');
});
test('不相关班级的行不进入本班视角', () => {
  const schedules = [mk('other', '乙班'), mk('global', '')];
  const occurrences = buildCourseScheduleOccurrences(schedules, 'c1', '甲班');
  assert.equal(occurrences.length, 1);
});
test('课程隔离：其他课程的排课不参与', () => {
  const schedules = [mk('a', '', { courseId: 'c1' }), mk('b', '', { courseId: 'c2' })];
  assert.equal(buildCourseScheduleOccurrences(schedules, 'c1', '甲班').length, 1);
});

console.log('\n[3] 教师视角（未传班级）——并行班不得塌缩');
test('班A/班B 相同时段 → 保持 2 个独立课次', () => {
  const schedules = [mk('a', '甲班'), mk('b', '乙班')];
  const occurrences = buildCourseScheduleOccurrences(schedules, 'c1', '');
  assert.equal(occurrences.length, 2, `期望 2 次课，实得 ${occurrences.length}`);
});
test('两条完全相同的全班级行 → 去重为 1', () => {
  const schedules = [mk('g1', ''), mk('g2', '')];
  assert.equal(buildCourseScheduleOccurrences(schedules, 'c1', '').length, 1);
});
test('多周次的班级行仍各自展开互不去重', () => {
  const schedules = [mk('a', '甲班', { end: '2026-09-29' })];
  // startDate 09-15 周二 ~ 09-29 周二 → 3 次课
  assert.equal(buildCourseScheduleOccurrences(schedules, 'c1', '').length, 3);
});

console.log('\n[4] mergeSchedulesForClass — store 合并幂等性');
test('合并保留其他课程的行', () => {
  const prev = [mk('x', '', { courseId: 'c2' })];
  const incoming = [mk('y', '', { courseId: 'c1' })];
  const merged = mergeSchedulesForClass(prev, incoming, '甲班', { courseId: 'c1' });
  assert.equal(merged.length, 2);
  assert.ok(merged.some((s) => s.id === 'x'), '其他课程的行被误删');
});
test('合并移除旧的本班可见行（含旧全班级行），不残留', () => {
  const prev = [mk('oldGlobal', ''), mk('oldMine', '甲班'), mk('otherClass', '乙班')];
  const incoming = [mk('newGlobal', '')];
  const merged = mergeSchedulesForClass(prev, incoming, '甲班', { courseId: 'c1' });
  const ids = merged.map((s) => s.id).sort();
  assert.deepEqual(ids, ['newGlobal', 'otherClass']);
});
test('重复合并幂等', () => {
  const incoming = [mk('g', ''), mk('m', '甲班')];
  const once = mergeSchedulesForClass([], incoming, '甲班', { courseId: 'c1' });
  const twice = mergeSchedulesForClass(once, incoming, '甲班', { courseId: 'c1' });
  assert.equal(twice.length, once.length, `幂等性破坏：${once.length} → ${twice.length}`);
});
test('不传 scope 时对整个列表生效（课表页无 courseId 的调用）', () => {
  const prev = [mk('x', '', { courseId: 'c2' }), mk('y', '甲班', { courseId: 'c1' })];
  const merged = mergeSchedulesForClass(prev, [mk('z', '')], '甲班');
  assert.deepEqual(merged.map((s) => s.id), ['z']);
});

console.log(`\n通过 ${passed} 项${process.exitCode ? '，存在失败' : '，全部通过'}\n`);
