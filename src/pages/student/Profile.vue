<template>
  <div class="space-y-6">
    <section class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-6">
      <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">个人画像</h1>
          <p class="text-sm text-gray-500 mt-1">查看个人信息、课程状态和今日安排</p>
        </div>
        <div v-if="loading" class="text-sm text-gray-400">正在同步数据库数据...</div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-6 mt-6">
        <div class="rounded-xl border border-gray-100 bg-gray-50 p-5">
          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-full bg-brand-400/10 text-brand-700 flex items-center justify-center text-2xl font-bold">
              {{ displayName.slice(0, 1) || '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 flex-wrap">
                <h2 class="text-xl font-semibold text-gray-900">{{ displayName }}</h2>
                <span class="px-2.5 py-1 rounded-full text-xs font-medium" :class="statusClass">
                  {{ statusText }}
                </span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm text-gray-600">
                <div>
                  <div class="text-gray-400">学号</div>
                  <div class="mt-1 font-medium text-gray-900">{{ displayStudentId }}</div>
                </div>
                <div>
                  <div class="text-gray-400">班级</div>
                  <div class="mt-1 font-medium text-gray-900">{{ currentClassName || '未关联班级' }}</div>
                </div>
                <div>
                  <div class="text-gray-400">邮箱</div>
                  <div class="mt-1 font-medium text-gray-900 break-all">{{ student?.email || '未设置' }}</div>
                </div>
                <div>
                  <div class="text-gray-400">电话</div>
                  <div class="mt-1 font-medium text-gray-900">{{ student?.phone || '未设置' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div v-for="item in statCards" :key="item.label" class="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div class="text-xs text-gray-400">{{ item.label }}</div>
            <div class="mt-2 text-2xl font-bold" :class="item.color">{{ item.value }}</div>
            <div v-if="item.tip" class="mt-1 text-xs text-gray-400">{{ item.tip }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">今日学习轨迹</h2>
          <span class="text-sm text-gray-400">{{ todaySchedules.length }} 节</span>
        </div>

        <div v-if="todaySchedules.length === 0" class="text-sm text-gray-400 py-10 text-center">
          今天还没有课程安排
        </div>

        <div v-else class="mt-5 space-y-3">
          <div
            v-for="schedule in todaySchedules"
            :key="schedule.id"
            class="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="font-medium text-gray-900 truncate">
                  {{ schedule.title || getCourse(schedule.courseId)?.title || '未命名课程' }}
                </div>
                <div class="mt-1 text-sm text-gray-500">
                  {{ schedule.timeSlot || '未设置时间' }}
                </div>
              </div>
              <div class="text-right text-sm text-gray-500 flex-shrink-0">
                <div>{{ schedule.room || '未设置地点' }}</div>
                <div class="mt-1">{{ schedule.teacher || '未设置教师' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">成绩概览</h2>
          <span class="text-sm text-gray-400">{{ scoreSummaries.length }} 门</span>
        </div>

        <div v-if="scoreSummaries.length === 0" class="text-sm text-gray-400 py-10 text-center">
          数据库中还没有这位学生的成绩记录
        </div>

        <div v-else class="mt-5 space-y-3">
          <div
            v-for="item in scoreSummaries"
            :key="item.courseId"
            class="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <div class="font-medium text-gray-900 truncate">{{ item.courseTitle }}</div>
                <div class="mt-1 text-sm text-gray-500">{{ item.teacher || '未设置教师' }}</div>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="text-xl font-bold" :class="gradeColorClass(item.score)">
                  {{ item.score }}
                </div>
                <div class="mt-1 text-xs text-gray-400">{{ gradeLevel(item.score) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-6">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">课程进度</h2>
        <span class="text-sm text-gray-400">{{ courseRows.length }} 门</span>
      </div>

      <div v-if="courseRows.length === 0" class="text-sm text-gray-400 py-10 text-center">
        还没有从后端读取到这位学生的课程
      </div>

      <div v-else class="mt-5 space-y-4">
        <div
          v-for="item in courseRows"
          :key="item.courseId"
          class="rounded-xl border border-gray-100 p-4"
        >
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <div class="flex items-center gap-3 flex-wrap">
                <h3 class="text-base font-semibold text-gray-900 truncate">{{ item.courseTitle }}</h3>
                <span class="px-2.5 py-1 rounded-full text-xs font-medium" :class="item.badgeClass">
                  {{ item.statusText }}
                </span>
              </div>
              <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
                <span>教师：{{ item.teacher || '未设置' }}</span>
                <span>学分：{{ item.credits }}</span>
                <span>时间：{{ item.timeLabel }}</span>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <div class="text-sm text-gray-400">当前进度</div>
              <div class="mt-1 text-2xl font-bold text-brand-700">{{ item.progress }}%</div>
            </div>
          </div>

          <div class="mt-4">
            <div class="h-2 rounded-full bg-brand-400/10 overflow-hidden">
              <div class="h-full rounded-full bg-brand-700" :style="{ width: `${item.progress}%` }" />
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span>开始：{{ item.startDate }}</span>
            <span>结束：{{ item.endDate }}</span>
            <span v-if="item.score !== null">成绩：{{ item.score }} 分</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  fetchSchedules,
  fetchStudentCourses,
  fetchStudentScores,
  fetchStudents,
} from '@/api'
import {
  getStoredStudentSession,
  getStudentLookupKeyword,
  matchStudentFromSession,
} from '@/lib/studentSession'
import { isScheduleVisibleToClass, mergeSchedulesForClass } from '@/lib/schedule'
import { useAppStore } from '@/stores/app'
import type { Course, Enrollment, Grade, Schedule, Student } from '@/types'

type StudentScore = {
  id: string
  courseId: string
  courseTitle?: string
  studentId: string
  examName: string
  score: number
  fullScore: number
  weight: number
  type: string
  status: string
  gradedAt: string
}

const store = useAppStore()

const loading = ref(false)
const remoteStudent = ref<Student | null>(null)
const remoteCourses = ref<Course[]>([])
const remoteEnrollments = ref<Enrollment[]>([])
const remoteScores = ref<StudentScore[]>([])
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

const myGrades = computed(() => {
  if (!student.value) return []
  return store.grades.filter((item) => item.studentId === student.value!.id)
})

const displayName = computed(() => student.value?.name || store.currentUser || '当前学生')
const displayStudentId = computed(() => student.value?.studentId || student.value?.id || '未识别')
const statusText = computed(() => (student.value?.status === 'inactive' ? '停用' : '在读'))
const statusClass = computed(() =>
  student.value?.status === 'inactive'
    ? 'bg-red-50 text-red-600'
    : 'bg-emerald-50 text-emerald-600',
)

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

function replaceStudentGrades(studentId: string, scores: StudentScore[]) {
  const grouped = new Map<string, StudentScore[]>()
  scores.forEach((score) => {
    const courseId = String(score.courseId || '').trim()
    if (!courseId) return
    if (!grouped.has(courseId)) grouped.set(courseId, [])
    grouped.get(courseId)!.push(score)
  })

  const grades: Grade[] = Array.from(grouped.entries()).map(([courseId, items]) => {
    const totalWeight = items.reduce((sum, item) => sum + Number(item.weight || 0), 0)
    const weightedTotal = totalWeight > 0
      ? items.reduce((sum, item) => sum + Number(item.score || 0) * Number(item.weight || 0), 0) / totalWeight
      : items.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(items.length, 1)
    const latest = [...items].sort((left, right) => String(right.gradedAt).localeCompare(String(left.gradedAt)))[0]

    return {
      id: `db-grade-${studentId}-${courseId}`,
      studentId,
      courseId,
      score: Math.round(weightedTotal),
      semester: '',
      comment: '',
      gradedAt: latest?.gradedAt || '',
      totalScore: Math.round(weightedTotal),
    }
  })

  store.grades = [
    ...store.grades.filter((item) => item.studentId !== studentId),
    ...grades,
  ]
}

function getCourse(courseId: string) {
  // 只认接口回来的课程。此前会回落到 store.courses（本地存储，空时是 mock），
  // 于是已删除的课程仍能显示出标题。
  return remoteCourses.value.find((item) => item.id === courseId)
}

function parseClockTime(value?: string) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return { hours: Number(match[1]), minutes: Number(match[2]) }
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

function getScheduleWeekday(schedule: Schedule) {
  const normalizedDay = String(schedule.day || '').trim()
  if (normalizedDay && weekdayMap[normalizedDay] != null) return weekdayMap[normalizedDay]
  const startDate = schedule.startDate ? new Date(schedule.startDate) : null
  return startDate && !Number.isNaN(startDate.getTime()) ? (startDate.getDay() + 6) % 7 : -1
}

function formatDate(value?: string) {
  if (!value) return '未设置'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function getEnrollmentProgress(enrollment: Enrollment) {
  const occurrences = getCourseOccurrences(enrollment.courseId, currentClassName.value)
  if (occurrences.length === 0) return Math.max(0, Math.min(100, Number(enrollment.progress || 0)))
  const completedCount = occurrences.filter((item) => item.end.getTime() <= Date.now()).length
  return Math.round((completedCount / occurrences.length) * 100)
}

function getEnrollmentStatusText(enrollment: Enrollment) {
  const className = currentClassName.value
  if (store.isCourseEnded(enrollment.courseId, className) || enrollment.status === 'completed') {
    return '已结束'
  }
  if (store.isFirstClassStarted(enrollment.courseId, className) || enrollment.status === 'in_progress') {
    return '学习中'
  }
  return '未开始'
}

function getEnrollmentBadgeClass(statusText: string) {
  if (statusText === '已结束') return 'bg-gray-100 text-gray-600'
  if (statusText === '学习中') return 'bg-brand-400/10 text-brand-700'
  return 'bg-amber-50 text-amber-600'
}

function gradeLevel(score: number) {
  if (score >= 90) return '优秀'
  if (score >= 80) return '良好'
  if (score >= 60) return '及格'
  return '待提升'
}

function gradeColorClass(score: number) {
  if (score >= 90) return 'text-emerald-600'
  if (score >= 80) return 'text-blue-600'
  if (score >= 60) return 'text-brand-700'
  return 'text-red-500'
}

const completedCount = computed(() => {
  const className = currentClassName.value
  return myEnrollments.value.filter(
    (item) => item.status === 'completed' || store.isCourseEnded(item.courseId, className),
  ).length
})

const inProgressCount = computed(() => {
  const className = currentClassName.value
  return myEnrollments.value.filter((item) => {
    if (item.status === 'dropped') return false
    return (
      !store.isCourseEnded(item.courseId, className) &&
      (store.isFirstClassStarted(item.courseId, className) || item.status === 'in_progress')
    )
  }).length
})

const avgScore = computed(() => {
  if (myGrades.value.length === 0) return 0
  const total = myGrades.value.reduce(
    (sum, item) => sum + Number(item.totalScore ?? item.score ?? 0),
    0,
  )
  return Math.round(total / myGrades.value.length)
})

const totalCredits = computed(() =>
  myEnrollments.value.reduce((sum, item) => sum + Number(getCourse(item.courseId)?.credits || 0), 0),
)

const avgProgress = computed(() => {
  if (myEnrollments.value.length === 0) return 0
  const total = myEnrollments.value.reduce((sum, item) => sum + getEnrollmentProgress(item), 0)
  return Math.round(total / myEnrollments.value.length)
})

const statCards = computed(() => [
  { label: '学习中课程', value: `${inProgressCount.value} 门`, color: 'text-brand-700', tip: '根据真实排课进度计算' },
  { label: '已完成课程', value: `${completedCount.value} 门`, color: 'text-emerald-600', tip: '只有最后一节课结束后才计入' },
  { label: '总学分', value: `${totalCredits.value}`, color: 'text-gray-900', tip: '按课程学分汇总' },
  { label: '平均进度', value: `${avgProgress.value}%`, color: 'text-gray-900', tip: avgScore.value > 0 ? `平均成绩 ${avgScore.value} 分` : '暂无成绩' },
])

const todaySchedules = computed(() => {
  const todayIndex = (new Date().getDay() + 6) % 7
  return [...dbSchedules.value]
    .filter((item) => getScheduleWeekday(item) === todayIndex)
    .sort((left, right) => String(left.timeSlot || '').localeCompare(String(right.timeSlot || '')))
})

const scoreSummaries = computed(() => {
  const scoreMap = new Map(myGrades.value.map((item) => [item.courseId, item]))
  const courseIds = Array.from(
    new Set([
      ...remoteScores.value.map((item) => item.courseId),
      ...myGrades.value.map((item) => item.courseId),
    ]),
  )

  return courseIds
    .map((courseId) => {
      const grade = scoreMap.get(courseId)
      const course = getCourse(courseId)
      return {
        courseId,
        courseTitle: course?.title || remoteScores.value.find((item) => item.courseId === courseId)?.courseTitle || '未命名课程',
        teacher: course?.teacher || '',
        score: Math.round(Number(grade?.totalScore ?? grade?.score ?? 0)),
      }
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
})

const courseRows = computed(() =>
  myEnrollments.value.map((enrollment) => {
    const course = getCourse(enrollment.courseId)
    const score = myGrades.value.find((item) => item.courseId === enrollment.courseId)
    const statusText = getEnrollmentStatusText(enrollment)
    const relatedSchedules = dbSchedules.value.filter((item) => item.courseId === enrollment.courseId)
    const sortedSchedules = [...relatedSchedules].sort((left, right) =>
      String(left.startDate || '').localeCompare(String(right.startDate || '')),
    )
    const firstSchedule = sortedSchedules[0]
    const lastSchedule = sortedSchedules[sortedSchedules.length - 1]

    return {
      courseId: enrollment.courseId,
      courseTitle: course?.title || firstSchedule?.title || '未命名课程',
      teacher: course?.teacher || firstSchedule?.teacher || '',
      credits: Number(course?.credits || 0),
      progress: getEnrollmentProgress(enrollment),
      statusText,
      badgeClass: getEnrollmentBadgeClass(statusText),
      startDate: formatDate(course?.startDate || firstSchedule?.startDate || enrollment.enrollDate),
      endDate: formatDate(course?.endDate || lastSchedule?.endDate || firstSchedule?.endDate),
      timeLabel: firstSchedule?.timeSlot || '未设置',
      score: score ? Math.round(Number(score.totalScore ?? score.score ?? 0)) : null,
    }
  }),
)

async function loadRemoteProfileData() {
  loading.value = true

  try {
    const session = getStoredStudentSession()
    const search = getStudentLookupKeyword(store.currentUser, session)
    let resolvedStudent =
      matchStudentFromSession(store.students, store.currentUser, session) ?? createSessionStudent()

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
        const [courseRes, scoreRes] = await Promise.all([
          fetchStudentCourses(studentId),
          fetchStudentScores(studentId),
        ])

        remoteStudent.value = courseRes.student ?? remoteStudent.value
        remoteCourses.value = courseRes.courses ?? []
        remoteEnrollments.value = courseRes.enrollments ?? []
        remoteScores.value = scoreRes.scores ?? []

        mergeStudentIntoStore(remoteStudent.value)
        mergeCoursesIntoStore(remoteCourses.value)
        replaceStudentEnrollments(remoteStudent.value?.id || studentId, remoteEnrollments.value)
        replaceStudentGrades(remoteStudent.value?.id || studentId, remoteScores.value)
      } catch (error) {
        console.warn('加载学生课程或成绩失败，继续使用已存在数据', error)
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
  void loadRemoteProfileData()
})
</script>
