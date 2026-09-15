import type { Schedule } from '@/types'
import { parseLocalDate } from '@/lib/date'

export type ScheduleOccurrence = {
  schedule: Schedule
  start: Date
  end: Date
}

const weekdayMap: Record<string, number> = {
  '\u5468\u4e00': 0,
  '\u661f\u671f\u4e00': 0,
  '\u5468\u4e8c': 1,
  '\u661f\u671f\u4e8c': 1,
  '\u5468\u4e09': 2,
  '\u661f\u671f\u4e09': 2,
  '\u5468\u56db': 3,
  '\u661f\u671f\u56db': 3,
  '\u5468\u4e94': 4,
  '\u661f\u671f\u4e94': 4,
  '\u5468\u516d': 5,
  '\u661f\u671f\u516d': 5,
  '\u5468\u65e5': 6,
  '\u661f\u671f\u65e5': 6,
  '\u5468\u5929': 6,
  '\u661f\u671f\u5929': 6,
}

export function parseClockTime(value?: string): { hours: number; minutes: number } | null {
  const match = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return { hours, minutes }
}

export function applyClockTime(date: Date, value?: string): Date | null {
  const parsed = parseClockTime(value)
  if (!parsed) return null

  const result = new Date(date)
  result.setHours(parsed.hours, parsed.minutes, 0, 0)
  return result
}

export function normalizeDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export function getMondayBasedWeekday(date: Date): number {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

export function getWeekdayInSameWeek(anchor: Date, weekday: number): Date {
  const result = normalizeDay(anchor)
  result.setDate(result.getDate() - getMondayBasedWeekday(result) + weekday)
  return result
}

export function getScheduleDayOfWeek(schedule: Schedule): number | null {
  const label = String(schedule.day ?? '').trim()
  if (label && label in weekdayMap) return weekdayMap[label]

  const startDate = parseLocalDate(schedule.startDate)
  return startDate ? getMondayBasedWeekday(startDate) : null
}

/**
 * Expand one backend schedule into concrete class occurrences.
 *
 * startDate/endDate are treated as the first and last week boundaries when
 * an explicit weekday is provided. This matches the admin scheduling form.
 */
export function buildScheduleOccurrences(schedule: Schedule): ScheduleOccurrence[] {
  const startBoundary = parseLocalDate(schedule.startDate)
  const endBoundary = parseLocalDate(schedule.endDate) ?? startBoundary
  const [startTime = '', endTime = ''] = String(schedule.timeSlot ?? '')
    .split('-')
    .map((part) => part.trim())

  if (!startBoundary || !endBoundary || !startTime || !endTime) return []
  if (normalizeDay(endBoundary).getTime() < normalizeDay(startBoundary).getTime()) return []

  const weekday = getScheduleDayOfWeek(schedule)
  const dates: Date[] = []

  if (String(schedule.day ?? '').trim() && weekday !== null) {
    const firstDate = getWeekdayInSameWeek(startBoundary, weekday)
    const lastDate = getWeekdayInSameWeek(endBoundary, weekday)
    if (firstDate.getTime() > lastDate.getTime()) return []

    for (
      const cursor = new Date(firstDate);
      cursor.getTime() <= lastDate.getTime();
      cursor.setDate(cursor.getDate() + 7)
    ) {
      dates.push(new Date(cursor))
    }
  } else {
    dates.push(normalizeDay(startBoundary))
  }

  return dates
    .map((date) => {
      const start = applyClockTime(date, startTime)
      const end = applyClockTime(date, endTime)
      if (!start || !end) return null
      if (end.getTime() < start.getTime()) end.setDate(end.getDate() + 1)
      return { schedule, start, end }
    })
    .filter((item): item is ScheduleOccurrence => item !== null)
}

/**
 * 排课对某个班级是否可见。
 *
 * ⚠️ 语义约定：`className` 为空（NULL / 空串）表示「全班级」，
 * 即该排课对本课程所有学生生效 —— 不是「班级未填写」。
 * 管理端建课时不指定班级，产出的就是全班级排课。
 *
 * 未传 `className`（教师/管理端看整门课）时返回全部，与既有口径一致。
 */
export function isScheduleVisibleToClass(
  schedule: Pick<Schedule, 'className'>,
  className?: string,
): boolean {
  const target = String(className ?? '').trim()
  const rowClass = String(schedule.className ?? '').trim()
  if (!target) return true // 未指定班级：不按班级收窄
  if (!rowClass) return true // 全班级排课
  return rowClass === target
}

/** 排课行的班级键；空班级归一为全班级哨兵 */
function scheduleClassKey(schedule: Pick<Schedule, 'className'>): string {
  return String(schedule.className ?? '').trim() || '__GLOBAL__'
}

export function buildCourseScheduleOccurrences(
  schedules: Schedule[],
  courseId: string,
  className = '',
): ScheduleOccurrence[] {
  const normalizedClassName = String(className).trim()
  const sourceSchedules = schedules.filter(
    (schedule) =>
      schedule.courseId === courseId && isScheduleVisibleToClass(schedule, normalizedClassName),
  )

  // 班级专属行优先，保证与全班级行重合时保留的是本班那条（教室/教师更贴近）
  const ordered = [...sourceSchedules].sort((left, right) => {
    const leftGlobal = scheduleClassKey(left) === '__GLOBAL__' ? 1 : 0
    const rightGlobal = scheduleClassKey(right) === '__GLOBAL__' ? 1 : 0
    return leftGlobal - rightGlobal
  })

  const occurrences: ScheduleOccurrence[] = []
  const seen = new Set<string>()

  for (const schedule of ordered) {
    for (const occurrence of buildScheduleOccurrences(schedule)) {
      // 学生视角：同一时刻就是同一次课，全班级行与本班专属行重合只算一次。
      // 教师视角（未传班级）：并行班（班A/班B相同时段）是各自独立的课次，
      // 必须按班级键区分，否则课次数与评价轮次会塌缩。
      const key = normalizedClassName
        ? `${occurrence.start.getTime()}::${occurrence.end.getTime()}`
        : `${scheduleClassKey(schedule)}::${occurrence.start.getTime()}::${occurrence.end.getTime()}`
      if (seen.has(key)) continue
      seen.add(key)
      occurrences.push(occurrence)
    }
  }

  return occurrences.sort((left, right) => left.start.getTime() - right.start.getTime())
}

/**
 * 把服务端返回的排课合并进本地缓存。
 *
 * 移除旧的「本班可见」行后追加新行 —— 判据严格是 isScheduleVisibleToClass 的补集，
 * 因为服务端返回的可见集合本就包含全班级行，范围必须一致，否则会残留旧行或误删他班行。
 *
 * 传 `scope.courseId` 时只在该课程范围内替换：带 courseId 的请求（课程页）不能
 * 清掉其他课程的行。
 */
export function mergeSchedulesForClass(
  prev: Schedule[],
  incoming: Schedule[],
  className: string,
  scope: { courseId?: string } = {},
): Schedule[] {
  const kept = prev.filter((schedule) => {
    if (scope.courseId && schedule.courseId !== scope.courseId) return true
    return !isScheduleVisibleToClass(schedule, className)
  })
  return [...kept, ...incoming]
}
