/**
 * 排课 → 学习进度 的公共计算。
 *
 * 进度/状态一律由**排课时间实时推算**（已上过的课次 / 总课次），
 * 而不是读 `enrollments.progress` 列 —— 后端从不写那一列，它恒为初始值。
 *
 * 抽成公共模块的原因：这套算法原先只存在于 `routes/students.js`，
 * 教师端「学员进度」若再复制一份，两处口径迟早漂移（同一学生两页看到不同百分比）。
 */
import { normalizeText } from './admin.js';

export function parseDateValue(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const WEEKDAY_MAP = {
  '周一': 0, '星期一': 0,
  '周二': 1, '星期二': 1,
  '周三': 2, '星期三': 2,
  '周四': 3, '星期四': 3,
  '周五': 4, '星期五': 4,
  '周六': 5, '星期六': 5,
  '周日': 6, '星期日': 6, '星期天': 6,
};

function parseClockTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function applyClockTime(baseDate, timeValue) {
  const clock = parseClockTime(timeValue);
  if (!clock) return null;

  const next = new Date(baseDate);
  next.setHours(clock.hours, clock.minutes, 0, 0);
  return next;
}

function getWeekdayInSameWeek(date, weekday) {
  const mondayBasedIndex = (date.getDay() + 6) % 7;
  const result = new Date(date);
  result.setDate(result.getDate() - mondayBasedIndex + weekday);
  result.setHours(0, 0, 0, 0);
  return result;
}

function normalizeDateOnly(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getFirstWeekdayOnOrAfter(date, weekday) {
  const result = getWeekdayInSameWeek(date, weekday);
  if (result.getTime() < normalizeDateOnly(date).getTime()) {
    result.setDate(result.getDate() + 7);
  }
  return result;
}

function getLastWeekdayOnOrBefore(date, weekday) {
  const result = getWeekdayInSameWeek(date, weekday);
  if (result.getTime() > normalizeDateOnly(date).getTime()) {
    result.setDate(result.getDate() - 7);
  }
  return result;
}

function getScheduleWeekday(scheduleRow) {
  const normalizedDay = normalizeText(scheduleRow.day);
  if (normalizedDay && WEEKDAY_MAP[normalizedDay] != null) {
    return WEEKDAY_MAP[normalizedDay];
  }

  const startBoundary = parseDateValue(scheduleRow.start_date);
  return startBoundary ? (startBoundary.getDay() + 6) % 7 : null;
}

export function buildScheduleOccurrences(scheduleRow) {
  const startBoundary = parseDateValue(scheduleRow.start_date);
  const endBoundary = parseDateValue(scheduleRow.end_date) || startBoundary;
  const [startTime = '', endTime = ''] = String(scheduleRow.time_slot || '')
    .split('-')
    .map((part) => part.trim());

  if (!startBoundary || !endBoundary || !startTime || !endTime) {
    return [];
  }

  const hasExplicitWeekday = Boolean(normalizeText(scheduleRow.day));
  const weekday = getScheduleWeekday(scheduleRow);
  const dates = [];

  if (hasExplicitWeekday && weekday != null) {
    const firstDate = getFirstWeekdayOnOrAfter(startBoundary, weekday);
    const lastDate = getLastWeekdayOnOrBefore(endBoundary, weekday);
    if (firstDate.getTime() > lastDate.getTime()) {
      return [];
    }

    for (
      const cursor = new Date(firstDate);
      cursor.getTime() <= lastDate.getTime();
      cursor.setDate(cursor.getDate() + 7)
    ) {
      dates.push(new Date(cursor));
    }
  } else {
    dates.push(new Date(startBoundary));
  }

  const occurrences = [];
  for (const date of dates) {
    const start = applyClockTime(date, startTime);
    const end = applyClockTime(date, endTime);
    if (!start || !end) continue;

    if (end.getTime() < start.getTime()) {
      end.setDate(end.getDate() + 1);
    }

    occurrences.push({ start, end });
  }

  return occurrences;
}

export function getScheduleOccurrenceStats(scheduleRows) {
  const occurrences = [];
  const seen = new Set();

  for (const scheduleRow of scheduleRows) {
    for (const occurrence of buildScheduleOccurrences(scheduleRow)) {
      const key = `${scheduleRow.id}::${occurrence.start.getTime()}::${occurrence.end.getTime()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      occurrences.push(occurrence);
    }
  }

  occurrences.sort((left, right) => left.start.getTime() - right.start.getTime());

  return {
    occurrences,
    totalCount: occurrences.length,
    completedCount: occurrences.filter((occurrence) => occurrence.end.getTime() <= Date.now()).length,
    firstStart: occurrences[0]?.start || null,
    lastEnd: occurrences[occurrences.length - 1]?.end || null,
  };
}

export function buildDateRangeProgress(startDate, endDate) {
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  const now = Date.now();

  if (!start || !end) {
    return { progress: 0, status: 'enrolled', firstStart: start, lastEnd: end };
  }

  if (now < start.getTime()) {
    return { progress: 0, status: 'enrolled', firstStart: start, lastEnd: end };
  }

  if (now >= end.getTime()) {
    return { progress: 100, status: 'completed', firstStart: start, lastEnd: end };
  }

  const total = end.getTime() - start.getTime();
  const elapsed = now - start.getTime();
  const progress = total > 0 ? Math.round((elapsed / total) * 100) : 0;

  return {
    progress: Math.max(0, Math.min(99, progress)),
    status: 'in_progress',
    firstStart: start,
    lastEnd: end,
  };
}

/**
 * 一门课在一个班级下的进度与状态。
 *
 * @param {Array} scheduleRows 该课程的排课行（已按班级过滤，或为空表示全班级）
 * @param {string} [courseStart] 课程起止，排课无法计算时兜底
 * @param {string} [courseEnd]
 */
export function buildEnrollmentProgress(scheduleRows, courseStart, courseEnd) {
  const stats = getScheduleOccurrenceStats(scheduleRows || []);
  if (stats.totalCount === 0) {
    return buildDateRangeProgress(courseStart, courseEnd);
  }

  const now = Date.now();
  if (stats.firstStart && now < stats.firstStart.getTime()) {
    return { progress: 0, status: 'enrolled', firstStart: stats.firstStart, lastEnd: stats.lastEnd };
  }

  if (stats.lastEnd && now >= stats.lastEnd.getTime()) {
    return { progress: 100, status: 'completed', firstStart: stats.firstStart, lastEnd: stats.lastEnd };
  }

  const progress = Math.round((stats.completedCount / stats.totalCount) * 100);
  return {
    progress: Math.max(0, Math.min(99, progress)),
    status: 'in_progress',
    firstStart: stats.firstStart,
    lastEnd: stats.lastEnd,
  };
}
