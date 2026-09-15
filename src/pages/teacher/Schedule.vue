<template>
  <div class="space-y-6">
    <!-- 页面头部 + 周导航 -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">我的课程表</h1>
        <p class="text-sm text-gray-500 mt-1 flex items-center gap-2">
          <span>{{ weekRange }}</span>
          <span class="w-1 h-1 rounded-full bg-brand-400/60" />
          <span>第 {{ weekNumber }} 周</span>
        </p>
      </div>
      <div ref="scheduleNavRef" class="relative flex items-center gap-1 bg-white rounded-lg border border-brand-400/30 shadow-sm p-0.5">
        <!-- 学期选择：只列出有排课数据的学期 -->
        <select
          v-if="semesterOptions.length > 0"
          v-model="selectedSemester"
          @change="onSemesterChange"
          class="px-2 py-1.5 text-xs font-medium text-gray-600 bg-transparent outline-none cursor-pointer"
          title="选择学期"
        >
          <option v-for="sem in semesterOptions" :key="sem" :value="sem">{{ sem }}</option>
        </select>
        <button @click="prevWeek" class="p-2 rounded-md hover:bg-brand-400/10 transition-colors" title="上一周">
          <ChevronLeft class="w-4 h-4 text-gray-400" />
        </button>
        <button
          @click="toggleCalendar"
          class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-brand-400/10 rounded-md transition-colors"
          :title="showCalendar ? '关闭日历' : '打开日历'"
        >
          今天
        </button>
        <button @click="nextWeek" class="p-2 rounded-md hover:bg-brand-400/10 transition-colors" title="下一周">
          <ChevronRight class="w-4 h-4 text-gray-400" />
        </button>

        <div
          v-if="showCalendar"
          class="absolute right-0 top-full mt-2 z-30 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
          @click.stop
        >
          <div class="mb-3 flex items-center justify-between">
            <button @click="prevCalendarMonth" class="rounded-md p-1.5 hover:bg-gray-100 transition-colors" title="上个月">
              <ChevronLeft class="w-4 h-4 text-gray-400" />
            </button>
            <span class="text-sm font-semibold text-gray-800">{{ calendarYear }}年{{ calendarMonthLabel }}月</span>
            <button @click="nextCalendarMonth" class="rounded-md p-1.5 hover:bg-gray-100 transition-colors" title="下个月">
              <ChevronRight class="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div class="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400">
            <div v-for="label in calendarWeekLabels" :key="label">{{ label }}</div>
          </div>

          <div class="grid grid-cols-7 gap-1">
            <div v-for="(cell, index) in calendarCells" :key="index" class="h-8">
              <button
                v-if="cell"
                @click="goToDate(cell)"
                class="h-8 w-full rounded-lg text-xs transition-colors"
                :class="isCurrentDay(cell)
                  ? 'bg-brand-600 text-white font-semibold'
                  : 'text-gray-600 hover:bg-brand-400/10'"
              >
                {{ cell.getDate() }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!hasCards" class="bg-white rounded-xl border border-brand-400/20 shadow-sm py-20 text-center">
      <CalendarDays class="w-12 h-12 mx-auto mb-4 text-gray-200" />
      <p class="text-gray-800 font-medium">本周暂无课程安排</p>
      <p class="text-gray-400 text-sm mt-1">{{ weekRange }} 没有课程</p>
      <button @click="goToday" class="mt-4 text-sm text-gray-600 hover:text-gray-800 font-medium inline-flex items-center gap-1">
        <CalendarDays class="w-4 h-4" /> 返回本周
      </button>
    </div>

    <!-- 课表主体 -->
    <div v-else class="bg-white rounded-xl border border-brand-400/20 shadow-sm">
      <div class="overflow-x-auto">
        <div style="min-width: 820px;">
          <!-- 表头：日期列 -->
          <div class="flex border-b border-brand-400/20">
            <div class="flex-shrink-0 w-16 bg-brand-400/10" />
            <div v-for="day in weekDays" :key="day.label"
              class="flex-1 p-2 text-center bg-brand-400/10"
              :class="day.isToday ? 'bg-brand-50' : ''">
              <div class="relative inline-flex flex-col items-center">
                <span v-if="day.isToday" class="text-[9px] font-bold text-white bg-brand-600 px-1.5 rounded-b-sm leading-4 -mt-2 mb-0.5">今</span>
                <span class="text-xs font-semibold" :class="day.isToday ? 'text-gray-600' : 'text-gray-600'">{{ day.label }}</span>
                <span class="text-[11px] mt-0.5" :class="day.isToday ? 'text-gray-600 font-semibold' : 'text-gray-400'">{{ day.dateStr }}</span>
              </div>
            </div>
          </div>

          <!-- 时间轴 + 课程块 -->
          <div class="flex relative" :style="{ height: totalHeight + 'px' }">
            <!-- 时间轴（左侧） -->
            <div class="flex-shrink-0 w-16 relative">
              <div v-for="slot in timeSlots" :key="slot.key"
                class="absolute left-0 w-full text-center"
                :style="{ top: `calc(${getTimeLabelTop(slot.key)} - 10px)` }">
                <div class="text-[11px] text-gray-400 font-medium leading-none">{{ slot.label }}</div>
                <div class="text-[9px] text-gray-300 mt-0.5 leading-none">{{ slot.periodLabel }}</div>
              </div>
            </div>

            <!-- 每日课程列 -->
            <div v-for="day in weekDays" :key="day.label"
              class="flex-1 relative border-l border-brand-400/20 last:border-r-0">
              <!-- 小时分隔线 -->
              <div v-for="slot in timeSlots" :key="'g-' + slot.key"
                class="absolute left-0 right-0 border-t border-brand-400/10"
                :style="{ top: getTimeLabelTop(slot.key) }" />
              <!-- 底部边界线 -->
              <div class="absolute left-0 right-0 bottom-0 border-t border-brand-400/10" />

              <!-- 课程块（绝对定位，精确匹配时间段） -->
              <div v-for="card in getDayCourseCards(day.date)" :key="card.id"
                class="absolute left-0.5 right-0.5 rounded-lg px-2.5 py-1.5 overflow-hidden cursor-pointer transition-all duration-150 border hover:shadow-lg flex flex-col"
                :style="{
                  top: getBlockTop(card.timeSlot),
                  height: getBlockHeight(card.timeSlot),
                  background: card.cardBg,
                  borderColor: card.border
                }">
                <p class="font-semibold truncate text-[12px] leading-tight" :style="{ color: card.text }">{{ card.courseName }}</p>
                <p class="text-[10px] mt-0.5 font-medium truncate" :style="{ color: card.text, opacity: 0.8 }">{{ cardTeacherLine(card) }}</p>
                <p class="text-[9px] mt-0.5 truncate" :style="{ color: card.text, opacity: 0.6 }">{{ card.room }} · {{ card.timeSlot }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div v-if="courseColors.length > 0" class="flex flex-wrap gap-2 text-xs">
      <!-- 导师端：在课程名后面标出「我带的」 -->
      <span v-if="isMentorView" class="w-full text-[11px] text-gray-400">标注「我带的」的课程由你负责</span>
      <span v-for="cc in courseColors" :key="cc.label"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
        :style="{ background: cc.cardBg, borderColor: cc.border, color: cc.text }">
        <span class="w-2.5 h-2.5 rounded-sm" :style="{ background: cc.border }" />
        {{ cc.label }}<template v-if="isMentorView && cc.mentor">（我带的）</template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-vue-next'
import { getNow, getTodayStart, isVirtualToday, getVirtualMonday, getSemesterOf } from '@/lib/date'
import { fetchSchedules } from '@/api'

const store = useAppStore()
const route = useRoute()

// 从数据库加载排课
const dbSchedules = ref<any[]>([])
onMounted(async () => {
  try {
    const res = await fetchSchedules()
    if (res.success) {
      dbSchedules.value = res.schedules
      store.schedules = res.schedules
    }
  } catch { /* ignore */ }
})

// ---- 周导航 ----
const weekStart = ref(getVirtualMonday())
const showCalendar = ref(false)
const calendarMonth = ref(getTodayStart())
const scheduleNavRef = ref<HTMLElement | null>(null)

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
  date.setHours(0, 0, 0, 0)
  return date
}

function fmtDate(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function isToday(d: Date): boolean {
  return isVirtualToday(d)
}

function prevWeek() { const d = new Date(weekStart.value); d.setDate(d.getDate() - 7); weekStart.value = d }
function nextWeek() { const d = new Date(weekStart.value); d.setDate(d.getDate() + 7); weekStart.value = d }
function goToday() { weekStart.value = getVirtualMonday() }

function toggleCalendar() {
  if (showCalendar.value) {
    showCalendar.value = false
    weekStart.value = getVirtualMonday()
    return
  }
  calendarMonth.value = getTodayStart()
  showCalendar.value = true
}

function goToDate(date: Date) {
  weekStart.value = getMonday(date)
  showCalendar.value = false
}

function prevCalendarMonth() {
  const d = new Date(calendarMonth.value)
  d.setMonth(d.getMonth() - 1)
  calendarMonth.value = d
}

function nextCalendarMonth() {
  const d = new Date(calendarMonth.value)
  d.setMonth(d.getMonth() + 1)
  calendarMonth.value = d
}

const calendarYear = computed(() => calendarMonth.value.getFullYear())
const calendarMonthLabel = computed(() => String(calendarMonth.value.getMonth() + 1))
const calendarWeekLabels = ['日', '一', '二', '三', '四', '五', '六']
const calendarCells = computed<(Date | null)[]>(() => {
  const y = calendarMonth.value.getFullYear()
  const m = calendarMonth.value.getMonth()
  const firstDay = new Date(y, m, 1)
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay.getDay(); i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
})

function isCurrentDay(date: Date) {
  return isVirtualToday(date)
}

function handleDocumentClick(event: MouseEvent) {
  if (!showCalendar.value) return
  const target = event.target as Node | null
  if (!target) return
  if (scheduleNavRef.value && !scheduleNavRef.value.contains(target)) {
    showCalendar.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})

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

// ---- 课表数据 ----
/** 当前是否在「导师」身份的课表页（/mentor 段，或角色为导师） */
const isMentorView = computed(() =>
  store.currentRole === 'mentor' || route.path.startsWith('/mentor')
)

/** 根据当前路由身份获取课程安排（领导在教师段→教师课程，导师段→导师课程，领导段→管辖课程） */
const userSchedules = computed(() => {
  const currentUser = store.currentUser || ''
  const role = store.currentRole
  // 路由身份判定：领导在 /mentor 段时按导师处理，/teacher 段时按教师处理
  const isMentorRoute = role === 'mentor' || route.path.startsWith('/mentor')
  const isTeacherRoute = role === 'teacher' || route.path.startsWith('/teacher')
  const isLeaderRoute = role === 'leader' && route.path.startsWith('/leader')

  // 导师：看导师负责的课程
  if (isMentorRoute) {
    const mentorCourseIds = store.getMentorCourseIds(currentUser)
    return store.schedules.filter((s) => mentorCourseIds.includes(s.courseId))
  }
  // 教师：看自己教的课；领导作为教师时看专属授课课程
  if (isTeacherRoute) {
    if (role === 'leader') {
      const teacherCourseIds = store.getLeaderTeacherCourses(currentUser).map((c) => c.id)
      return store.schedules.filter((s) =>
        teacherCourseIds.includes(s.courseId) || s.teacher === currentUser
      )
    }
    return store.schedules.filter((s) => s.teacher === currentUser)
  }
  // 领导段：管辖课程 或 自己教的课
  if (isLeaderRoute) {
    const leaderCourseIds = store.getLeaderCourses(currentUser).map((c) => c.id)
    return store.schedules.filter((s) =>
      leaderCourseIds.includes(s.courseId) || s.teacher === currentUser
    )
  }
  // fallback: 按教师名称
  return store.schedules.filter((s) => s.teacher === currentUser)
})

// ---- 学期选择（只列出有排课数据的学期） ----
const semesterOptions = computed(() => {
  const set = new Set<string>()
  userSchedules.value.forEach((s) => {
    const sem = getSemesterOf(s.startDate)
    if (sem) set.add(sem)
  })
  return [...set].sort()
})

const selectedSemester = ref<string>('')

// 默认选中当前时间所在学期，否则选第一个有数据的学期
watch(semesterOptions, (opts) => {
  if (opts.length === 0) return
  const todaySem = getSemesterOf(getNow().toISOString())
  if (!selectedSemester.value || !opts.includes(selectedSemester.value)) {
    selectedSemester.value = opts.includes(todaySem) ? todaySem : opts[0]
  }
}, { immediate: true })

/** 当前学期下的排课 */
const filteredSchedules = computed(() => {
  if (!selectedSemester.value) return userSchedules.value
  return userSchedules.value.filter((s) => getSemesterOf(s.startDate) === selectedSemester.value)
})

/** 切换学期时跳到该学期第一堂课的周一 */
function onSemesterChange() {
  const first = filteredSchedules.value
    .map((s) => s.startDate)
    .filter(Boolean)
    .sort()
  if (first.length > 0) {
    weekStart.value = getMonday(new Date(first[0]))
  }
}

// ---- 提取课程的周规律 ----
interface CoursePattern {
  dayOfWeek: number   // 0=周一, 6=周日
  timeSlot: string
  title: string
  teacher: string
  /** 企业导师（导师端课表用于显示「我是这门课的导师」） */
  mentor: string
  room: string
}

const coursePatterns = computed(() => {
  const map = new Map<string, CoursePattern[]>()
  filteredSchedules.value.forEach((s) => {
    const sd = new Date(s.startDate)
    const day = sd.getDay()
    const dow = day === 0 ? 6 : day - 1
    if (!map.has(s.courseId)) map.set(s.courseId, [])
    const list = map.get(s.courseId)!
    if (!list.some(p => p.dayOfWeek === dow && p.timeSlot === s.timeSlot)) {
      list.push({ dayOfWeek: dow, timeSlot: s.timeSlot, title: s.title, teacher: s.teacher, mentor: s.mentor ?? '', room: s.room })
    }
  })
  return map
})

// ---- 标准时间段 ----
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

// ---- 块状布局参数 ----
const HOUR_HEIGHT = 56  // 每小时的像素高度
const SCHEDULE_START = 8
const SCHEDULE_END = 21

const totalHeight = computed(() => (SCHEDULE_END - SCHEDULE_START) * HOUR_HEIGHT)

/** 获取标准时间标签在时间轴上的 top (px) */
function getTimeLabelTop(slotKey: string): string {
  const hour = parseInt(slotKey.split(':')[0], 10)
  return ((hour - SCHEDULE_START) * HOUR_HEIGHT) + 'px'
}

/** 获取课程块在列中的 top (px)，精确到分钟 */
function getBlockTop(timeSlot: string): string {
  const r = parseTimeSlotToRange(timeSlot)
  if (!r) return '0px'
  const totalMin = (r.start - SCHEDULE_START) * 60 + r.startMin
  return (totalMin / 60 * HOUR_HEIGHT) + 'px'
}

/** 获取课程块的高度 (px)，精确到分钟 */
function getBlockHeight(timeSlot: string): string {
  const r = parseTimeSlotToRange(timeSlot)
  if (!r) return '0px'
  const durationMin = (r.end - r.start) * 60 + (r.endMin - r.startMin)
  return Math.max(durationMin / 60 * HOUR_HEIGHT, 24) + 'px'
}

/** 获取某天的所有课程卡片（去重） */
function getDayCourseCards(day: Date): CardItem[] {
  const dayOfWeek = day.getDay() === 0 ? 6 : day.getDay() - 1
  const result: CardItem[] = []
  const added = new Set<string>()
  coursePatterns.value.forEach((patterns, courseId) => {
    for (const p of patterns) {
      if (p.dayOfWeek === dayOfWeek && !added.has(courseId)) {
        added.add(courseId)
        const c = getCourseColor(courseId)
        result.push({
          id: `${courseId}-${p.dayOfWeek}`,
          courseName: p.title,
          teacher: p.teacher,
          mentor: p.mentor,
          room: p.room,
          timeSlot: p.timeSlot,
          ...c,
        })
      }
    }
  })
  return result
}

// ---- 颜色方案 ----
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
  const ids = Array.from(new Map(filteredSchedules.value.map((s) => [s.courseId, s])).keys())
  ids.forEach((id, i) => map.set(id, PALETTE[i % PALETTE.length]))
  return map
})

function getCourseColor(courseId: string): CourseColor {
  return courseColorMap.value.get(courseId) ?? PALETTE[0]
}

// ---- 课程卡片 ----
interface CardItem extends CourseColor {
  id: string
  courseName: string
  teacher: string
  mentor: string
  room: string
  timeSlot: string
}

/** 解析时间段 "09:00-11:00" 或 "09:00-10:30"，含分钟信息 */
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

// ---- 空状态 / 图例 ----
const hasCards = computed(() => {
  for (const patterns of coursePatterns.value.values()) {
    if (patterns.length > 0) return true
  }
  return false
})

const courseColors = computed(() => {
  const map = new Map<string, { label: string; mentor: string; cardBg: string; border: string; text: string }>()
  coursePatterns.value.forEach((patterns, courseId) => {
    if (!map.has(courseId)) {
      const c = getCourseColor(courseId)
      map.set(courseId, { label: patterns[0]?.title || '', mentor: patterns[0]?.mentor || '', cardBg: c.cardBg, border: c.border, text: c.text })
    }
  })
  return Array.from(map.values())
})

/**
 * 课表卡片第二行显示的"人员"文案
 *
 * - 导师端：显示「张导师 · 授课：钱老师」，让导师一眼看到自己负责的课及授课教师
 * - 其他端：只显示授课教师
 */
function cardTeacherLine(card: CardItem): string {
  if (isMentorView.value && card.mentor) {
    return `${card.mentor} · 授课：${card.teacher}`
  }
  return card.teacher
}
</script>
