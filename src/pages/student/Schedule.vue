<template>
  <div id="student-schedule-root"></div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import * as d3 from 'd3'
import { fetchSchedules, fetchStudents } from '@/api'
import type { Schedule } from '@/types'
import { getStoredStudentSession, matchStudentFromSession } from '@/lib/studentSession'
import { mergeSchedulesForClass } from '@/lib/schedule'
import { renderIcon } from '@/utils/d3-renderer'
import { isVirtualToday, getVirtualMonday, getTodayStart, getSemesterOf, parseLocalDate } from '@/lib/date'

const store = useAppStore()

// ---- 浠庢暟鎹簱鍔犺浇瀛︾敓璇捐〃 ----
const dbSchedules = ref<Schedule[]>([])
const loading = ref(true)

function pickStudent(students: any[], session: ReturnType<typeof getStoredStudentSession>) {
  if (students.length === 0) return null
  return (
    matchStudentFromSession(students, store.currentUser, session) ||
    students[0]
  )
}

onMounted(async () => {
  await loadMySchedules()
  const el = document.getElementById('student-schedule-root')
  if (el) renderSchedule(el)
})

async function loadMySchedules() {
  loading.value = true
  try {
    const session = getStoredStudentSession()
    let className = session.className

    if (!className) {
      const search = session.studentId || session.name || store.currentUser || ''
      if (search) {
        const stuRes = await fetchStudents({ search, pageSize: 10 })
        const myInfo = pickStudent(stuRes.students ?? [], session)
        className = myInfo?.className || ''
      }
    }

    if (!className) {
      throw new Error('Student class not resolved')
    }

    const schRes = await fetchSchedules({ class: className })
    const remoteSchedules = (schRes.schedules ?? []) as Schedule[]
    dbSchedules.value = remoteSchedules
    // 按班级全量拉取，替换 store 中「本班可见」的旧行（含旧的全班级行）
    store.schedules = mergeSchedulesForClass(store.schedules, remoteSchedules, className)
  } catch (e) {
    console.error('加载课表失败:', e)
    const myStudent = matchStudentFromSession(store.students, store.currentUser)
    const myCourseIds = new Set(
      store.enrollments.filter((e) => e.studentId === myStudent?.id).map((e) => e.courseId)
    )
    dbSchedules.value = store.schedules.filter((s) => myCourseIds.has(s.courseId))
  } finally {
    loading.value = false
  }
}
const weekStart = ref(getVirtualMonday())

function getMonday(d: Date): Date {
  const date = new Date(d)
  const mondayOffset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - mondayOffset)
  date.setHours(0, 0, 0, 0)
  return date
}

function fmtDate(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function isToday(d: Date): boolean {
  return isVirtualToday(d)
}

const weekDays = computed(() => {
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.value)
    d.setDate(d.getDate() + i)
    return { label: labels[i], date: d, dateStr: fmtDate(d), isToday: isToday(d) }
  })
})

const weekRange = computed(() => `${weekDays.value[0].dateStr} - ${weekDays.value[6].dateStr}`)

const weekNumber = computed(() => {
  const s = new Date(weekStart.value)
  const y = new Date(s.getFullYear(), 0, 1)
  return Math.ceil(((s.getTime() - y.getTime()) / 86400000 + y.getDay() + 1) / 7)
})

function prevWeek() { const d = new Date(weekStart.value); d.setDate(d.getDate() - 7); weekStart.value = d; reRender() }
function nextWeek() { const d = new Date(weekStart.value); d.setDate(d.getDate() + 7); weekStart.value = d; reRender() }

// ---- "浠婂ぉ"鎸夐挳锛氱涓€娆＄偣鍑诲睍寮€鏃ュ巻閫夋嫨鏃ユ湡锛岀浜屾鐐瑰嚮鐩存帴璺宠浆浠婂ぉ ----
const showCalendar = ref(false)
const calendarMonth = ref(getTodayStart())

function todayFn() {
  if (showCalendar.value) {
    // 绗簩娆＄偣鍑伙細鐩存帴璺宠浆鍒颁粖澶╂墍鍦ㄥ懆
    showCalendar.value = false
    weekStart.value = getVirtualMonday()
  } else {
    // 绗竴娆＄偣鍑伙細灞曞紑鏃ユ湡閫夋嫨鏃ュ巻
    calendarMonth.value = getTodayStart()
    showCalendar.value = true
  }
  reRender()
}

/** 璺宠浆鍒版墍閫夋棩鏈熸墍鍦ㄥ懆 */
function goToDate(date: Date) {
  weekStart.value = getMonday(date)
  showCalendar.value = false
  reRender()
}

/** 娓叉煋鏃ユ湡閫夋嫨鏃ュ巻 */
function renderCalendar(navWrap: d3.Selection<any, any, any, any>) {
  if (!showCalendar.value) return
  const cal = navWrap.append('div')
    .attr('class', 'cal-panel absolute right-0 top-full mt-2 z-30 w-72 bg-white rounded-xl border border-gray-200 shadow-xl p-4')
    .on('click', (event: Event) => event.stopPropagation())

  const cm = calendarMonth.value
  const y = cm.getFullYear()
  const m = cm.getMonth()

  // 鏈堜唤鍒囨崲
  const calHeader = cal.append('div').attr('class', 'flex items-center justify-between mb-3')
  const prevM = calHeader.append('button').attr('class', 'p-1.5 rounded-md hover:bg-gray-100 transition-colors').on('click', () => {
    const d = new Date(calendarMonth.value)
    d.setMonth(d.getMonth() - 1)
    calendarMonth.value = d
    reRender()
  })
  renderIcon(prevM, 'chevronLeft').attr('class', 'w-4 h-4 text-gray-400')
  calHeader.append('span').attr('class', 'text-sm font-semibold text-gray-800').text(`${y}年${m + 1}月`)
  const nextM = calHeader.append('button').attr('class', 'p-1.5 rounded-md hover:bg-gray-100 transition-colors').on('click', () => {
    const d = new Date(calendarMonth.value)
    d.setMonth(d.getMonth() + 1)
    calendarMonth.value = d
    reRender()
  })
  renderIcon(nextM, 'chevronRight').attr('class', 'w-4 h-4 text-gray-400')

  // 鏄熸湡琛ㄥご
  const dowRow = cal.append('div').attr('class', 'grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400 mb-1')
  ;['日', '一', '二', '三', '四', '五', '六'].forEach((l) => dowRow.append('div').text(l))

  // 鏃ユ湡缃戞牸
  const grid = cal.append('div').attr('class', 'grid grid-cols-7 gap-1')
  const firstDay = new Date(y, m, 1)
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const leading = firstDay.getDay() // 0=鍛ㄦ棩
  for (let i = 0; i < leading; i++) grid.append('div')

  const today = getTodayStart()
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(y, m, d)
    const isToday = cellDate.getTime() === today.getTime()
    grid.append('button')
      .attr('class', `h-8 text-xs rounded-lg transition-colors ${isToday ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-600 hover:bg-indigo-50'}`)
      .text(String(d))
      .on('click', () => goToDate(cellDate))
  }
}

// ---- 瀛︾敓璇捐〃鏁版嵁锛堜粠鏁版嵁搴撴寜鐝骇鍔犺浇锛?----
const mySchedules = computed(() => dbSchedules.value)

// ---- 瀛︽湡閫夋嫨锛堝彧鍒楀嚭鏈夋帓璇炬暟鎹殑瀛︽湡锛?----
const semesterOptions = computed(() => {
  const set = new Set<string>()
  mySchedules.value.forEach((s) => {
    const sem = getSemesterOf(s.startDate)
    if (sem) set.add(sem)
  })
  return [...set].sort()
})

const selectedSemester = ref<string>('')

watch(semesterOptions, (opts) => {
  if (opts.length === 0) return
  if (!selectedSemester.value || !opts.includes(selectedSemester.value)) {
    selectedSemester.value = opts[0]
  }
  const firstDate = mySchedules.value
    .filter((schedule) => getSemesterOf(schedule.startDate) === selectedSemester.value)
    .map((schedule) => parseLocalDate(schedule.startDate))
    .filter((date): date is Date => date !== null)
    .sort((left, right) => left.getTime() - right.getTime())[0]
  if (firstDate) {
    weekStart.value = getMonday(firstDate)
  }
}, { immediate: true })

/** 褰撳墠瀛︽湡涓嬬殑鎺掕 */
const filteredSchedules = computed(() => {
  if (!selectedSemester.value) return mySchedules.value
  return mySchedules.value.filter((s) => getSemesterOf(s.startDate) === selectedSemester.value)
})

/** 鍒囨崲瀛︽湡鏃惰烦鍒拌瀛︽湡绗竴鍫傝鐨勫懆涓€ */
function onSemesterChange() {
  const first = filteredSchedules.value
    .map((s) => s.startDate)
    .filter(Boolean)
    .sort()
  if (first.length > 0) {
    weekStart.value = getMonday(new Date(first[0]))
  }
  reRender()
}

// ---- 提取课程的周规律（以后端 day/class/timeSlot 为准）----
interface CoursePattern {
  scheduleId: string
  courseId: string
  dayOfWeek: number // 0=周一, 6=周日
  timeSlot: string
  title: string
  teacher: string
  room: string
  startBoundary: Date
  endBoundary: Date
  hasExplicitWeekday: boolean
}

const weekdayLabelMap: Record<string, number> = {
  周一: 0,
  星期一: 0,
  周二: 1,
  星期二: 1,
  周三: 2,
  星期三: 2,
  周四: 3,
  星期四: 3,
  周五: 4,
  星期五: 4,
  周六: 5,
  星期六: 5,
  周日: 6,
  星期日: 6,
  周天: 6,
  星期天: 6,
}

function getMondayBasedWeekday(date: Date): number {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

function getScheduleDayOfWeek(schedule: Schedule, startBoundary?: Date | null): number | null {
  const label = String(schedule.day ?? '').trim()
  if (label && label in weekdayLabelMap) return weekdayLabelMap[label]

  const startDate = startBoundary ?? parseLocalDate(schedule.startDate)
  return startDate ? getMondayBasedWeekday(startDate) : null
}

function normalizeDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function getWeekdayInSameWeek(anchor: Date, dayOfWeek: number): Date {
  const monday = getMonday(anchor)
  monday.setDate(monday.getDate() + dayOfWeek)
  return monday
}

function getFirstWeekdayOnOrAfter(anchor: Date, dayOfWeek: number): Date {
  const result = getWeekdayInSameWeek(anchor, dayOfWeek)
  if (result.getTime() < normalizeDay(anchor).getTime()) {
    result.setDate(result.getDate() + 7)
  }
  return result
}

function getLastWeekdayOnOrBefore(anchor: Date, dayOfWeek: number): Date {
  const result = getWeekdayInSameWeek(anchor, dayOfWeek)
  if (result.getTime() > normalizeDay(anchor).getTime()) {
    result.setDate(result.getDate() - 7)
  }
  return result
}

function getCourseTitle(schedule: Schedule): string {
  const course = store.courses.find((item) => item.id === schedule.courseId)
  return String(course?.title || schedule.title || '').trim()
}

const coursePatterns = computed(() => {
  const map = new Map<string, CoursePattern[]>()
  const seen = new Set<string>()

  filteredSchedules.value.forEach((schedule) => {
    const startBoundary = parseLocalDate(schedule.startDate)
    const endBoundary = parseLocalDate(schedule.endDate) ?? startBoundary
    const dayOfWeek = getScheduleDayOfWeek(schedule, startBoundary)
    if (!startBoundary || !endBoundary || dayOfWeek === null) return

    const patternKey = [
      schedule.id,
      schedule.courseId,
      schedule.className || '',
      schedule.day || '',
      schedule.startDate,
      schedule.endDate,
      schedule.timeSlot,
    ].join('::')
    if (seen.has(patternKey)) return
    seen.add(patternKey)

    if (!map.has(schedule.courseId)) map.set(schedule.courseId, [])
    map.get(schedule.courseId)!.push({
      scheduleId: schedule.id,
      courseId: schedule.courseId,
      dayOfWeek,
      timeSlot: schedule.timeSlot,
      title: getCourseTitle(schedule),
      teacher: schedule.teacher,
      room: schedule.room,
      startBoundary,
      endBoundary,
      hasExplicitWeekday: Boolean(String(schedule.day ?? '').trim()),
    })
  })

  return map
})

// ---- 鏍囧噯鏃堕棿娈?----
interface ParsedSlot { key: string; label: string; periodLabel: string }

const STANDARD_SLOTS: ParsedSlot[] = [
  { key: '08:00', label: '08:00', periodLabel: '上午一' },
  { key: '09:00', label: '09:00', periodLabel: '上午二' },
  { key: '10:00', label: '10:00', periodLabel: '上午三' },
  { key: '11:00', label: '11:00', periodLabel: '上午四' },
  { key: '13:00', label: '13:00', periodLabel: '下午一' },
  { key: '14:00', label: '14:00', periodLabel: '下午二' },
  { key: '15:00', label: '15:00', periodLabel: '下午三' },
  { key: '16:00', label: '16:00', periodLabel: '下午四' },
  { key: '17:00', label: '17:00', periodLabel: '下午五' },
  { key: '19:00', label: '19:00', periodLabel: '晚课一' },
  { key: '20:00', label: '20:00', periodLabel: '晚课二' },
]

const timeSlots = computed(() => STANDARD_SLOTS)

// ---- 鍧楃姸甯冨眬鍙傛暟 ----
const HOUR_HEIGHT = 56
const SCHEDULE_START = 8
const SCHEDULE_END = 21

const totalHeight = computed(() => (SCHEDULE_END - SCHEDULE_START) * HOUR_HEIGHT)

// ---- 閰嶈壊鏂规 ----
interface CourseColor {
  cellBg: string
  cardBg: string
  border: string
  text: string
}

const PALETTE: CourseColor[] = [
  { cellBg: '#e8f5e9', cardBg: '#4caf50', border: '#388e3c', text: '#ffffff' },
  { cellBg: '#e3f2fd', cardBg: '#2196f3', border: '#1565c0', text: '#ffffff' },
  { cellBg: '#fff3e0', cardBg: '#ff9800', border: '#e65100', text: '#ffffff' },
  { cellBg: '#fce4ec', cardBg: '#e91e63', border: '#c2185b', text: '#ffffff' },
  { cellBg: '#f3e5f5', cardBg: '#9c27b0', border: '#7b1fa2', text: '#ffffff' },
  { cellBg: '#e0f7fa', cardBg: '#00bcd4', border: '#00838f', text: '#ffffff' },
  { cellBg: '#fffde7', cardBg: '#ffc107', border: '#ff8f00', text: '#ffffff' },
  { cellBg: '#fbe9e7', cardBg: '#ff5722', border: '#bf360c', text: '#ffffff' },
  { cellBg: '#e8eaf6', cardBg: '#3f51b5', border: '#1a237e', text: '#ffffff' },
  { cellBg: '#e0f2f1', cardBg: '#009688', border: '#004d40', text: '#ffffff' },
  { cellBg: '#f1f8e9', cardBg: '#8bc34a', border: '#558b2f', text: '#ffffff' },
  { cellBg: '#ede7f6', cardBg: '#673ab7', border: '#4527a0', text: '#ffffff' },
]

const courseColorMap = computed(() => {
  const map = new Map<string, CourseColor>()
  const ids = Array.from(coursePatterns.value.keys())
  ids.forEach((id, i) => map.set(id, PALETTE[i % PALETTE.length]))
  return map
})

function getCourseColor(courseId: string): CourseColor {
  return courseColorMap.value.get(courseId) ?? PALETTE[0]
}

// ---- 璇剧▼鍗＄墖 ----
interface CardItem extends CourseColor {
  id: string
  courseName: string
  teacher: string
  room: string
  timeSlot: string
  startMinutes: number
  endMinutes: number
  columnIndex: number
  columnCount: number
}

/** 瑙ｆ瀽鏃堕棿娈?"09:00-11:00" 鎴?"09:00-10:30" */
function parseTimeSlotToRange(timeSlot: string): { start: number; end: number; startMin: number; endMin: number } | null {
  const parts = timeSlot.split('-')
  if (parts.length !== 2) return null
  const startParts = parts[0].split(':')
  const endParts = parts[1].split(':')
  return {
    start: parseInt(startParts[0], 10),
    end: parseInt(endParts[0], 10),
    startMin: parseInt(startParts[1] || '0', 10),
    endMin: parseInt(endParts[1] || '0', 10),
  }
}

/** 鑾峰彇鏌愬ぉ鐨勬墍鏈夎绋嬪崱鐗囷紙鍘婚噸锛?*/
function isPatternOnDay(pattern: CoursePattern, day: Date): boolean {
  const target = normalizeDay(day)

  if (pattern.hasExplicitWeekday) {
    if (pattern.dayOfWeek !== getMondayBasedWeekday(target)) return false
    const firstDate = normalizeDay(getFirstWeekdayOnOrAfter(pattern.startBoundary, pattern.dayOfWeek))
    const lastDate = normalizeDay(getLastWeekdayOnOrBefore(pattern.endBoundary, pattern.dayOfWeek))
    return target.getTime() >= firstDate.getTime() && target.getTime() <= lastDate.getTime()
  }

  return target.getTime() === normalizeDay(pattern.startBoundary).getTime()
}

function layoutCards(cards: CardItem[]): CardItem[] {
  if (cards.length <= 1) return cards

  const sorted = [...cards].sort((left, right) =>
    left.startMinutes - right.startMinutes ||
    left.endMinutes - right.endMinutes ||
    left.courseName.localeCompare(right.courseName)
  )
  const result: CardItem[] = []
  let group: CardItem[] = []
  let groupEnd = -1

  const flushGroup = () => {
    if (group.length === 0) return

    const laidOut = group.map((card) => ({ ...card }))
    const active: Array<{ endMinutes: number; columnIndex: number }> = []
    let maxColumns = 1

    laidOut.forEach((card) => {
      for (let index = active.length - 1; index >= 0; index -= 1) {
        if (active[index].endMinutes <= card.startMinutes) {
          active.splice(index, 1)
        }
      }

      const usedColumns = new Set(active.map((item) => item.columnIndex))
      let columnIndex = 0
      while (usedColumns.has(columnIndex)) columnIndex += 1

      card.columnIndex = columnIndex
      active.push({ endMinutes: card.endMinutes, columnIndex })
      maxColumns = Math.max(maxColumns, active.length)
    })

    laidOut.forEach((card) => {
      card.columnCount = maxColumns
    })
    result.push(...laidOut)
    group = []
    groupEnd = -1
  }

  sorted.forEach((card) => {
    if (group.length === 0) {
      group = [card]
      groupEnd = card.endMinutes
      return
    }

    if (card.startMinutes < groupEnd) {
      group.push(card)
      groupEnd = Math.max(groupEnd, card.endMinutes)
      return
    }

    flushGroup()
    group = [card]
    groupEnd = card.endMinutes
  })

  flushGroup()
  return result
}

function getDayCourseCards(day: Date): CardItem[] {
  const dayOfWeek = getMondayBasedWeekday(day)
  const result: CardItem[] = []
  const added = new Set<string>()
  coursePatterns.value.forEach((patterns, courseId) => {
    for (const p of patterns) {
      if (p.dayOfWeek !== dayOfWeek) continue
      if (!isPatternOnDay(p, day)) continue

      const range = parseTimeSlotToRange(p.timeSlot)
      if (!range) continue

      const dayKey = normalizeDay(day).toISOString().split('T')[0]
      const cardKey = `${p.scheduleId}::${dayKey}::${p.timeSlot}`
      if (added.has(cardKey)) continue
      added.add(cardKey)

      const startMinutes = range.start * 60 + range.startMin
      let endMinutes = range.end * 60 + range.endMin
      if (endMinutes <= startMinutes) endMinutes += 24 * 60

      const c = getCourseColor(courseId)
      result.push({
        id: cardKey,
        courseName: p.title,
        teacher: p.teacher,
        room: p.room,
        timeSlot: p.timeSlot,
        startMinutes,
        endMinutes,
        columnIndex: 0,
        columnCount: 1,
        ...c,
      })
    }
  })
  return layoutCards(result)
}

/** 鑾峰彇鏍囧噯鏃堕棿鏍囩鍦ㄦ椂闂磋酱涓婄殑 top (px) */
function getTimeLabelTop(slotKey: string): number {
  const hour = parseInt(slotKey.split(':')[0], 10)
  return (hour - SCHEDULE_START) * HOUR_HEIGHT
}

/** 鑾峰彇璇剧▼鍧楀湪鍒椾腑鐨?top (px)锛岀簿纭埌鍒嗛挓 */
function getBlockTop(timeSlot: string): number {
  const r = parseTimeSlotToRange(timeSlot)
  if (!r) return 0
  const totalMin = (r.start - SCHEDULE_START) * 60 + r.startMin
  return totalMin / 60 * HOUR_HEIGHT
}

/** 鑾峰彇璇剧▼鍧楃殑楂樺害 (px)锛岀簿纭埌鍒嗛挓 */
function getBlockHeight(timeSlot: string): number {
  const r = parseTimeSlotToRange(timeSlot)
  if (!r) return 0
  const durationMin = (r.end - r.start) * 60 + (r.endMin - r.startMin)
  return Math.max(durationMin / 60 * HOUR_HEIGHT, 24)
}

// ---- 鍥句緥 ----
const courseColorsMap = computed(() => {
  const map = new Map<string, { label: string; cardBg: string; border: string; text: string }>()
  coursePatterns.value.forEach((patterns, courseId) => {
    if (!map.has(courseId)) {
      const c = getCourseColor(courseId)
      map.set(courseId, { label: patterns[0]?.title || '', cardBg: c.cardBg, border: c.border, text: c.text })
    }
  })
  return Array.from(map.values())
})

// ---- D3 娓叉煋锛堝潡鐘跺竷灞€锛?----
function reRender() {
  const el = document.getElementById('student-schedule-root')
  if (el) renderSchedule(el)
}

function renderSchedule(root: HTMLElement) {
  const container = d3.select(root)
  container.selectAll('*').remove()

  // 鐐瑰嚮鏃ュ巻澶栭儴鍖哄煙鏃跺叧闂棩鏈熼€夋嫨鍣?
  d3.select(root).on('click', (event: Event) => {
    const target = event.target as Element | null
    // target.isConnected锛氭帓闄ょ偣鍑荤洰鏍囧凡琚?reRender 绉婚櫎鐨勬儏鍐碉紙濡傜偣鍑?浠婂ぉ"灞曞紑鏃ュ巻鍚庢棫鎸夐挳琚?detached锛夛紝閬垮厤璇垽涓虹偣鍑诲閮?
    if (showCalendar.value && target?.isConnected && target.closest && !target.closest('.cal-panel') && !target.closest('.cal-nav')) {
      showCalendar.value = false
      renderSchedule(root)
    }
  })

  const days = weekDays.value
  const legends = courseColorsMap.value

  // ---- 澶撮儴锛氬懆瀵艰埅 ----
  const headerDiv = container.append('div').attr('class', 'flex items-center justify-between flex-wrap gap-3 mb-6')
  const titleDiv = headerDiv.append('div')
  titleDiv.append('h1').attr('class', 'text-2xl font-bold text-gray-900').text('我的课表')
  const subtitle = titleDiv.append('p').attr('class', 'text-sm text-gray-500 mt-1 flex items-center gap-2')
  subtitle.append('span').text(weekRange.value)
  subtitle.append('span').attr('class', 'w-1 h-1 rounded-full bg-indigo-400/60')
  subtitle.append('span').text(`第${weekNumber.value}周`)

  const navWrap = headerDiv.append('div').attr('class', 'relative flex items-center gap-2 cal-nav')

  // 瀛︽湡閫夋嫨锛氬彧鍒楀嚭鏈夋帓璇炬暟鎹殑瀛︽湡
  if (semesterOptions.value.length > 0) {
    const semSel = navWrap.append('select')
      .attr('class', 'px-2 py-1.5 text-xs font-medium text-gray-600 bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer outline-none')
      .on('change', (event: Event) => {
        selectedSemester.value = (event.target as HTMLSelectElement).value
        onSemesterChange()
      })
    semesterOptions.value.forEach((sem) => {
      semSel.append('option').attr('value', sem).text(sem)
    })
    semSel.property('value', selectedSemester.value)
  }

  const navDiv = navWrap.append('div').attr('class', 'flex items-center gap-1 bg-white rounded-lg border border-gray-200 shadow-sm p-0.5')
  const prevBtn = navDiv.append('button').attr('class', 'p-2 rounded-md hover:bg-indigo-50 transition-colors').attr('title', '上一周').on('click', prevWeek)
  renderIcon(prevBtn, 'chevronLeft').attr('class', 'w-4 h-4 text-gray-400')
  navDiv.append('button').attr('class', 'px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-indigo-50 rounded-md transition-colors').on('click', todayFn).text('今天')
  const nextBtn = navDiv.append('button').attr('class', 'p-2 rounded-md hover:bg-indigo-50 transition-colors').attr('title', '下一周').on('click', nextWeek)
  renderIcon(nextBtn, 'chevronRight').attr('class', 'w-4 h-4 text-gray-400')

  // 鏃ユ湡閫夋嫨鏃ュ巻锛?浠婂ぉ"鎸夐挳灞曞紑锛?
  renderCalendar(navWrap)

  // 缁熻鏈懆鏄惁鏈夎
  const hasCards = days.some(d => getDayCourseCards(d.date).length > 0)

  // ---- 绌虹姸鎬?----
  if (!hasCards) {
    const emptyDiv = container.append('div').attr('class', 'bg-white rounded-xl border border-gray-200 shadow-sm py-20 text-center')
    const iconWrap = emptyDiv.append('div').attr('class', 'inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4')
    renderIcon(iconWrap, 'calendarDays').attr('class', 'w-8 h-8 text-gray-300')
    emptyDiv.append('p').attr('class', 'text-gray-800 font-medium').text('本周暂无课程安排')
    emptyDiv.append('p').attr('class', 'text-gray-400 text-sm mt-1').text(`${weekRange.value} 没有课程`)
    const backBtn = emptyDiv.append('button').attr('class', 'mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1').on('click', todayFn)
    renderIcon(backBtn, 'calendarDays').attr('class', 'w-4 h-4')
    backBtn.append('span').text('返回本周')
    return
  }

  // ---- 璇捐〃涓讳綋 ----
  const wrap = container.append('div').attr('class', 'bg-white rounded-xl border border-gray-200 shadow-sm')
  const scrollDiv = wrap.append('div').attr('class', 'overflow-x-auto')
  const outer = scrollDiv.append('div').style('min-width', '820px')

  // ---- 琛ㄥご锛氭棩鏈熷垪 ----
  const headerRow = outer.append('div').attr('class', 'flex border-b border-gray-200')
  headerRow.append('div').attr('class', 'flex-shrink-0 w-16 bg-indigo-50')

  days.forEach((day) => {
    const dayHeader = headerRow.append('div')
      .attr('class', `flex-1 p-2 text-center ${day.isToday ? 'bg-indigo-50' : 'bg-indigo-50'}`)
    const innerDiv = dayHeader.append('div').attr('class', 'relative inline-flex flex-col items-center')
    if (day.isToday) {
      innerDiv.append('span').attr('class', 'text-[9px] font-bold text-white bg-indigo-600 px-1.5 rounded-b-sm leading-4 -mt-2 mb-0.5').text('今')
    }
    innerDiv.append('span').attr('class', `text-xs font-semibold ${day.isToday ? 'text-indigo-700' : 'text-gray-600'}`).text(day.label)
    innerDiv.append('span').attr('class', `text-[11px] mt-0.5 ${day.isToday ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`).text(day.dateStr)
  })

  // ---- 鏃堕棿杞?+ 璇剧▼鍧?----
  const body = outer.append('div').attr('class', 'flex relative').style('height', totalHeight.value + 'px')

  // 鏃堕棿杞达紙宸︿晶锛?
  const timeAxis = body.append('div').attr('class', 'flex-shrink-0 w-16 relative')
  STANDARD_SLOTS.forEach((slot) => {
    const top = getTimeLabelTop(slot.key) - 10
    const g = timeAxis.append('div')
      .attr('class', 'absolute left-0 w-full text-center')
      .style('top', top + 'px')
    g.append('div').attr('class', 'text-[11px] text-gray-400 font-medium leading-none').text(slot.label)
    g.append('div').attr('class', 'text-[9px] text-gray-300 mt-0.5 leading-none').text(slot.periodLabel)
  })

  // 姣忔棩璇剧▼鍒?
  days.forEach((day) => {
    const col = body.append('div')
      .attr('class', 'flex-1 relative border-l border-gray-200 last:border-r-0')

    // 灏忔椂鍒嗛殧绾?
    STANDARD_SLOTS.forEach((slot) => {
      col.append('div')
        .attr('class', 'absolute left-0 right-0 border-t border-gray-100')
        .style('top', getTimeLabelTop(slot.key) + 'px')
    })
    // 搴曢儴杈圭晫绾?
    col.append('div').attr('class', 'absolute left-0 right-0 bottom-0 border-t border-gray-100')

    // 璇剧▼鍧楋紙缁濆瀹氫綅锛?
    const cards = getDayCourseCards(day.date)
    cards.forEach((card) => {
      const block = col.append('div')
        .attr('class', 'absolute rounded-lg px-2.5 py-1.5 overflow-hidden cursor-pointer transition-all duration-150 border hover:shadow-lg flex flex-col')
        .style('top', getBlockTop(card.timeSlot) + 'px')
        .style('height', getBlockHeight(card.timeSlot) + 'px')
        .style('left', `${card.columnIndex * 100 / card.columnCount}%`)
        .style('width', `${100 / card.columnCount}%`)
        .style('background', card.cardBg)
        .style('border-color', card.border)

      block.append('p')
        .attr('class', 'font-semibold truncate text-[12px] leading-tight')
        .style('color', card.text)
        .text(card.courseName)

      block.append('p')
        .attr('class', 'text-[10px] mt-0.5 font-medium truncate')
        .style('color', card.text)
        .style('opacity', 0.8)
        .text(card.teacher)

      block.append('p')
        .attr('class', 'text-[9px] mt-0.5 truncate')
        .style('color', card.text)
        .style('opacity', 0.6)
        .text(`${card.room} · ${card.timeSlot}`)
    })
  })

  // ---- 鍥句緥 ----
  if (legends.length > 0) {
    const legendDiv = container.append('div').attr('class', 'flex flex-wrap gap-2 text-xs mt-6')
    legends.forEach((l) => {
      const item = legendDiv.append('span')
        .attr('class', 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border')
        .style('background', l.cardBg)
        .style('border-color', l.border)
        .style('color', l.text)
      item.append('span').attr('class', 'w-2.5 h-2.5 rounded-sm').style('background', l.border)
      item.append('span').text(l.label)
    })
  }
}

watch([mySchedules, weekStart], () => {
  const el = document.getElementById('student-schedule-root')
  if (el) renderSchedule(el)
}, { deep: true })
</script>

