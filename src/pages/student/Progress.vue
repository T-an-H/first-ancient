<template>
  <div class="space-y-6">
    <section class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-6">
      <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">学习进度</h1>
          <p class="text-sm text-gray-500 mt-1">按后端课程、排课和成绩数据展示当前进度</p>
        </div>
        <div v-if="loading" class="text-sm text-gray-400">正在同步数据库数据...</div>
      </div>
    </section>

    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-5">
        <div class="text-sm text-gray-400">课程数量</div>
        <div class="mt-2 text-3xl font-bold text-gray-900">{{ courseRows.length }}</div>
      </div>
      <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-5">
        <div class="text-sm text-gray-400">平均进度</div>
        <div class="mt-2 text-3xl font-bold text-brand-700">{{ avgProgress }}%</div>
      </div>
      <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-5">
        <div class="text-sm text-gray-400">平均成绩</div>
        <div class="mt-2 text-3xl font-bold" :class="getGradeColor(avgScore)">
          {{ avgScore > 0 ? avgScore : '--' }}
        </div>
      </div>
    </section>

    <section class="space-y-4">
      <div
        v-for="item in courseRows"
        :key="item.courseId"
        class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-5"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <div class="flex items-center gap-3 flex-wrap">
              <h2 class="text-lg font-semibold text-gray-900 truncate">{{ item.courseName }}</h2>
              <span class="px-2.5 py-1 rounded-full text-xs font-medium" :class="item.statusClass">
                {{ item.statusText }}
              </span>
            </div>
            <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
              <span>课程编号：{{ item.courseCode }}</span>
              <span>教师：{{ item.teacher || '未设置' }}</span>
              <span>时间：{{ item.timeLabel }}</span>
            </div>
          </div>

          <div class="text-right flex-shrink-0">
            <div class="text-sm text-gray-400">总评成绩</div>
            <div class="mt-1 text-2xl font-bold" :class="getGradeColor(item.grade ?? 0)">
              {{ item.grade ?? '--' }}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
          <div class="md:col-span-2">
            <div class="flex items-center justify-between text-sm text-gray-500">
              <span>学习进度</span>
              <span>{{ item.progress }}%</span>
            </div>
            <div class="mt-2 h-2 rounded-full bg-brand-400/10 overflow-hidden">
              <div class="h-full rounded-full bg-brand-700" :style="{ width: `${item.progress}%` }" />
            </div>
          </div>

          <div>
            <div class="text-sm text-gray-400">平时成绩</div>
            <div class="mt-1 text-xl font-semibold text-emerald-600">{{ item.regularScore }}</div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-sm text-gray-400">期中</div>
              <div class="mt-1 text-xl font-semibold text-blue-600">{{ item.midtermScore }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-400">期末</div>
              <div class="mt-1 text-xl font-semibold text-purple-600">{{ item.finalScore }}</div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="courseRows.length === 0"
        class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-12 text-center text-gray-400"
      >
        暂无课程数据
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchSchedules, fetchStudentCourses, fetchStudents } from '@/api'
import { getStoredStudentSession, getStudentLookupKeyword, matchStudentFromSession } from '@/lib/studentSession'
import { isScheduleVisibleToClass, mergeSchedulesForClass } from '@/lib/schedule'
import { useAppStore } from '@/stores/app'
import type { Course, Enrollment, Schedule, Student } from '@/types'

const store = useAppStore()

const loading = ref(false)
const remoteStudent = ref<Student | null>(null)
const remoteCourses = ref<Course[]>([])
const remoteEnrollments = ref<Enrollment[]>([])
const dbSchedules = ref<Schedule[]>([])

const weekdayMap: Record<string, number> = {
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

type ScheduleOccurrence = {
  schedule: Schedule
  start: Date
  end: Date
}

const student = computed(() => remoteStudent.value ?? matchStudentFromSession(store.students, store.currentUser) ?? null)
const currentClassName = computed(() =>
  String(
    remoteStudent.value?.className ||
      student.value?.className ||
      getStoredStudentSession().className ||
      '',
  ).trim(),
)
const myEnrollments = computed(() => {
  if (remoteStudent.value?.id) return remoteEnrollments.value
  if (!student.value) return []
  return store.enrollments.filter((item) => item.studentId === student.value!.id)
})

function createSessionStudent() {
  const session = getStoredStudentSession()
  if (!session.id && !session.studentId && !session.name) return null

  return {
    id: session.id || session.studentId || '',
    name: session.name || store.currentUser || '当前学生',
    phone: '',
    email: '',
    avatar: '',
    joinDate: '',
    status: 'active' as const,
    studentId: session.studentId,
    className: session.className,
  }
}

function mergeStudentIntoStore(nextStudent: Student | null) {
  if (!nextStudent?.id) return
  const nextMap = new Map(store.students.map((item) => [item.id, item]))
  nextMap.set(nextStudent.id, nextStudent)
  store.students = Array.from(nextMap.values())
}

function mergeCoursesIntoStore(nextCourses: Course[]) {
  if (nextCourses.length === 0) return
  const nextMap = new Map(store.courses.map((item) => [item.id, item]))
  nextCourses.forEach((course) => nextMap.set(course.id, course))
  store.courses = Array.from(nextMap.values())
}

function replaceStudentEnrollments(studentId: string, nextEnrollments: Enrollment[]) {
  if (!studentId) return
  store.enrollments = [
    ...store.enrollments.filter((item) => item.studentId !== studentId),
    ...nextEnrollments,
  ]
}

function mergeSchedulesByClass(className: string, schedules: Schedule[]) {
  const normalizedClassName = String(className).trim()
  if (!normalizedClassName) return

  store.schedules = mergeSchedulesForClass(store.schedules, schedules, normalizedClassName)
}

function getCourse(courseId: string) {
  // 只认接口回来的课程。此前会回落到 store.courses（本地存储，空时是 mock），
  // 于是已删除的课程仍能显示出标题。
  return remoteCourses.value.find((item) => item.id === courseId)
}

function getGrade(courseId: string) {
  const grade = store.grades.find((item) => item.studentId === student.value?.id && item.courseId === courseId)
  return grade ? Math.round(Number(grade.totalScore ?? grade.score ?? 0)) : null
}

function getGradeColor(score: number | null) {
  if (score == null) return 'text-gray-400'
  if (score >= 90) return 'text-emerald-600'
  if (score >= 80) return 'text-blue-600'
  if (score >= 60) return 'text-brand-700'
  return 'text-red-500'
}

function parseClockTime(value?: string) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null

  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  }
}

function applyClockTime(baseDate: Date, timeValue?: string) {
  const clock = parseClockTime(timeValue)
  if (!clock) return null

  const next = new Date(baseDate)
  next.setHours(clock.hours, clock.minutes, 0, 0)
  return next
}

function getWeekdayInSameWeek(date: Date, weekday: number) {
  const mondayBasedIndex = (date.getDay() + 6) % 7
  const next = new Date(date)
  next.setDate(next.getDate() - mondayBasedIndex + weekday)
  next.setHours(0, 0, 0, 0)
  return next
}

function normalizeDateOnly(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function getFirstWeekdayOnOrAfter(date: Date, weekday: number) {
  const next = getWeekdayInSameWeek(date, weekday)
  if (next.getTime() < normalizeDateOnly(date).getTime()) {
    next.setDate(next.getDate() + 7)
  }
  return next
}

function getLastWeekdayOnOrBefore(date: Date, weekday: number) {
  const next = getWeekdayInSameWeek(date, weekday)
  if (next.getTime() > normalizeDateOnly(date).getTime()) {
    next.setDate(next.getDate() - 7)
  }
  return next
}

function getScheduleWeekday(schedule: Schedule) {
  const normalizedDay = String(schedule.day || '').trim()
  if (normalizedDay && weekdayMap[normalizedDay] != null) return weekdayMap[normalizedDay]

  const startDate = schedule.startDate ? new Date(schedule.startDate) : null
  return startDate && !Number.isNaN(startDate.getTime()) ? (startDate.getDay() + 6) % 7 : -1
}

function buildScheduleOccurrences(schedule: Schedule): ScheduleOccurrence[] {
  const startBoundary = schedule.startDate ? new Date(schedule.startDate) : null
  const endBoundary = schedule.endDate ? new Date(schedule.endDate) : startBoundary
  const [startTime = '', endTime = ''] = String(schedule.timeSlot || '')
    .split('-')
    .map((item) => item.trim())

  if (
    !startBoundary ||
    Number.isNaN(startBoundary.getTime()) ||
    !endBoundary ||
    Number.isNaN(endBoundary.getTime()) ||
    !startTime ||
    !endTime
  ) {
    return []
  }

  const hasExplicitWeekday = Boolean(String(schedule.day || '').trim())
  const weekday = getScheduleWeekday(schedule)
  const dates: Date[] = []

  if (hasExplicitWeekday && weekday >= 0) {
    const firstDate = getFirstWeekdayOnOrAfter(startBoundary, weekday)
    const lastDate = getLastWeekdayOnOrBefore(endBoundary, weekday)
    if (firstDate.getTime() > lastDate.getTime()) return []

    for (
      const cursor = new Date(firstDate);
      cursor.getTime() <= lastDate.getTime();
      cursor.setDate(cursor.getDate() + 7)
    ) {
      dates.push(new Date(cursor))
    }
  } else {
    dates.push(new Date(startBoundary))
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

function getCourseOccurrences(courseId: string, className = '') {
  const normalizedClassName = String(className).trim()
  // 空班级排课 = 全班级，对本课程所有学生可见（判据统一走 isScheduleVisibleToClass）
  const sourceSchedules = dbSchedules.value.filter(
    (item) => item.courseId === courseId && isScheduleVisibleToClass(item, normalizedClassName),
  )

  const occurrences: ScheduleOccurrence[] = []
  const seen = new Set<string>()

  sourceSchedules.forEach((schedule) => {
    buildScheduleOccurrences(schedule).forEach((occurrence) => {
      const key = `${schedule.id}::${occurrence.start.getTime()}::${occurrence.end.getTime()}`
      if (seen.has(key)) return
      seen.add(key)
      occurrences.push(occurrence)
    })
  })

  return occurrences.sort((left, right) => left.start.getTime() - right.start.getTime())
}

function getProgress(courseId: string, fallbackProgress: number) {
  const occurrences = getCourseOccurrences(courseId, currentClassName.value)
  if (occurrences.length === 0) return Math.max(0, Math.min(100, Number(fallbackProgress || 0)))
  const completedCount = occurrences.filter((item) => item.end.getTime() <= Date.now()).length
  return Math.round((completedCount / occurrences.length) * 100)
}

function getRegularScore(courseId: string) {
  const detail = store.detailedGrades.find((item) => item.studentId === student.value?.id && item.courseId === courseId)
  if (!detail) return 0
  const cfg = store.gradeConfigs[courseId]
  if (!cfg) return 0
  const scores = [
    detail.selfEvalScore || 0,
    detail.peerReviewScore || 0,
    detail.interGroupScore || 0,
    detail.teacherScore || 0,
    detail.mentorScore || 0,
  ]
  const weights = [
    cfg.selfEvalWeight || 0,
    cfg.peerReviewWeight || 0,
    cfg.interGroupEvalWeight || 0,
    cfg.teacherScoreWeight || 0,
    cfg.mentorScoreWeight || 0,
  ]
  const totalWeight = weights.reduce((sum, item) => sum + item, 0) || 1
  return Math.round(scores.reduce((sum, score, index) => sum + score * weights[index], 0) / totalWeight)
}

function getMidtermScore(courseId: string) {
  const detail = store.detailedGrades.find((item) => item.studentId === student.value?.id && item.courseId === courseId)
  if (!detail) return 0
  const cfg = store.gradeConfigs[courseId]
  if (!cfg) return 0
  const totalWeight = (cfg.midtermExamWeight || 0) + (cfg.midtermProjectWeight || 0) || 1
  return Math.round(
    ((detail.midtermExamScore || 0) * (cfg.midtermExamWeight || 0) +
      (detail.midtermProjectScore || 0) * (cfg.midtermProjectWeight || 0)) /
      totalWeight,
  )
}

function getFinalScore(courseId: string) {
  const detail = store.detailedGrades.find((item) => item.studentId === student.value?.id && item.courseId === courseId)
  if (!detail) return 0
  const cfg = store.gradeConfigs[courseId]
  if (!cfg) return 0
  const totalWeight = (cfg.finalExamWeight || 0) + (cfg.finalProjectWeight || 0) || 1
  return Math.round(
    ((detail.finalExamScore || 0) * (cfg.finalExamWeight || 0) +
      (detail.finalProjectScore || 0) * (cfg.finalProjectWeight || 0)) /
      totalWeight,
  )
}

function getStatusText(courseId: string, status: Enrollment['status']) {
  const occurrences = getCourseOccurrences(courseId, currentClassName.value)
  if (occurrences.length > 0) {
    const firstOccurrence = occurrences[0]
    const lastOccurrence = occurrences[occurrences.length - 1]
    const now = Date.now()

    if (now >= lastOccurrence.end.getTime()) return '已结束'
    if (now >= firstOccurrence.start.getTime()) return '学习中'
    return '未开始'
  }

  if (status === 'completed') return '已结束'
  if (status === 'in_progress') return '学习中'
  return '未开始'
}

function getStatusClass(statusText: string) {
  if (statusText === '已结束') return 'bg-gray-100 text-gray-600'
  if (statusText === '学习中') return 'bg-brand-400/10 text-brand-700'
  return 'bg-amber-50 text-amber-600'
}

const courseRows = computed(() =>
  myEnrollments.value.map((enrollment) => {
    const course = getCourse(enrollment.courseId)
    const statusText = getStatusText(enrollment.courseId, enrollment.status)
    const occurrences = getCourseOccurrences(enrollment.courseId, currentClassName.value)
    const firstOccurrence = occurrences[0]
    const progress = getProgress(enrollment.courseId, enrollment.progress)

    return {
      courseId: enrollment.courseId,
      courseName: course?.title || '未知课程',
      courseCode: course?.id || enrollment.courseId,
      teacher: course?.teacher || '',
      timeLabel: firstOccurrence
        ? `${firstOccurrence.start.toLocaleDateString('zh-CN')} ${firstOccurrence.schedule.timeSlot || ''}`.trim()
        : '未设置',
      progress,
      grade: getGrade(enrollment.courseId),
      regularScore: getRegularScore(enrollment.courseId),
      midtermScore: getMidtermScore(enrollment.courseId),
      finalScore: getFinalScore(enrollment.courseId),
      statusText,
      statusClass: getStatusClass(statusText),
    }
  }),
)

const avgProgress = computed(() => {
  if (courseRows.value.length === 0) return 0
  return Math.round(courseRows.value.reduce((sum, item) => sum + item.progress, 0) / courseRows.value.length)
})

const avgScore = computed(() => {
  const scores = courseRows.value.map((item) => item.grade).filter((item): item is number => item != null)
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((sum, item) => sum + item, 0) / scores.length)
})

async function loadRemoteProgress() {
  loading.value = true

  try {
    const session = getStoredStudentSession()
    const search = getStudentLookupKeyword(store.currentUser, session)
    let resolvedStudent = matchStudentFromSession(store.students, store.currentUser, session) ?? createSessionStudent()

    if (search) {
      try {
        const studentRes = await fetchStudents({ search, pageSize: 10 })
        resolvedStudent =
          matchStudentFromSession(studentRes.students ?? [], store.currentUser, session) ??
          resolvedStudent
      } catch (error) {
        console.warn('加载学生信息失败，继续使用本地学生信息', error)
      }
    }

    remoteStudent.value = resolvedStudent
    mergeStudentIntoStore(resolvedStudent)

    const studentId = resolvedStudent?.id || session.id || ''
    if (studentId) {
      try {
        const courseRes = await fetchStudentCourses(studentId)
        remoteStudent.value = courseRes.student ?? remoteStudent.value
        remoteCourses.value = courseRes.courses ?? []
        remoteEnrollments.value = courseRes.enrollments ?? []
        mergeStudentIntoStore(remoteStudent.value)
        mergeCoursesIntoStore(remoteCourses.value)
        replaceStudentEnrollments(remoteStudent.value?.id || studentId, remoteEnrollments.value)
      } catch (error) {
        console.warn('加载学生课程失败，继续使用已存在数据', error)
      }
    }

    const className = String(
      remoteStudent.value?.className || resolvedStudent?.className || session.className || '',
    ).trim()

    if (!className) {
      dbSchedules.value = []
      return
    }

    try {
      const scheduleRes = await fetchSchedules({ class: className })
      dbSchedules.value = scheduleRes.schedules ?? []
      mergeSchedulesByClass(className, dbSchedules.value)
    } catch (error) {
      console.warn('加载学生课表失败，继续使用本地课表数据', error)
      dbSchedules.value = store.schedules.filter((item) =>
        isScheduleVisibleToClass(item, className),
      )
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadRemoteProgress()
})
</script>
