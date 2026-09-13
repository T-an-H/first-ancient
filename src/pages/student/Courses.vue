<template>
  <div id="student-courses-root"></div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchCategories, fetchCourses, fetchSchedules, fetchStudentCourses, fetchStudents } from '@/api'
import { getStoredStudentSession, getStudentLookupKeyword, matchStudentFromSession } from '@/lib/studentSession'
import { getTodayStart, parseLocalDate } from '@/lib/date'
import { useAppStore } from '@/stores/app'
import * as d3 from 'd3'
import { renderIcon } from '@/utils/d3-renderer'
import type { Course, Enrollment, Schedule, Student } from '@/types'

const router = useRouter()
const store = useAppStore()

const loading = ref(true)
const remoteLoaded = ref(false)
const remoteStudent = ref<Student | null>(null)
const remoteCourses = ref<Course[]>([])
const remoteEnrollments = ref<Enrollment[]>([])

const localStudent = computed(() => matchStudentFromSession(store.students, store.currentUser) ?? null)
const student = computed(() => remoteStudent.value ?? localStudent.value ?? null)

function pickStudent(students: Student[], session: ReturnType<typeof getStoredStudentSession>) {
  if (students.length === 0) return null
  return (
    matchStudentFromSession(students, store.currentUser, session) ||
    students[0]
  )
}

function mergeStudentIntoStore(nextStudent: Student | null) {
  if (!nextStudent?.id) return
  const studentMap = new Map(store.students.map((item) => [item.id, item]))
  studentMap.set(nextStudent.id, nextStudent)
  store.students = Array.from(studentMap.values())
}

function mergeCoursesIntoStore(nextCourses: Course[]) {
  if (nextCourses.length === 0) return
  const courseMap = new Map(store.courses.map((item) => [item.id, item]))
  nextCourses.forEach((course) => courseMap.set(course.id, course))
  store.courses = Array.from(courseMap.values())
}

function replaceStudentEnrollments(studentId: string, nextEnrollments: Enrollment[]) {
  if (!studentId) return
  store.enrollments = [
    ...store.enrollments.filter((enrollment) => enrollment.studentId !== studentId),
    ...nextEnrollments,
  ]
}

function parseDateValue(value?: string) {
  return parseLocalDate(value)
}

function buildEnrollmentProgress(startDate?: string, endDate?: string) {
  const start = parseDateValue(startDate)
  const end = parseDateValue(endDate)
  const today = getTodayStart()

  if (!start || !end) {
    return { progress: 0, status: 'enrolled' as const }
  }

  if (today < start) {
    return { progress: 0, status: 'enrolled' as const }
  }

  if (today > end) {
    return { progress: 100, status: 'completed' as const }
  }

  const totalMs = Math.max(end.getTime() - start.getTime(), 1)
  const elapsedMs = Math.max(today.getTime() - start.getTime(), 0)
  const progress = Math.max(1, Math.min(99, Math.round((elapsedMs / totalMs) * 100)))
  return { progress, status: 'in_progress' as const }
}

function createSessionStudent(session: ReturnType<typeof getStoredStudentSession>): Student | null {
  if (!session.id && !session.studentId && !session.name) return null

  return {
    id: session.id || session.studentId || '',
    name: session.name || store.currentUser || '当前学生',
    phone: '',
    email: '',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(session.name || session.studentId || 'student')}`,
    joinDate: '',
    status: 'active',
    studentId: session.studentId,
    className: session.className,
  }
}

async function resolveRemoteStudent() {
  const session = getStoredStudentSession()
  if (session.id && session.className) {
    return {
      id: session.id,
      student: createSessionStudent(session),
      session,
    }
  }

  const search = getStudentLookupKeyword(store.currentUser, session)
  if (!search) {
    return { id: session.id || '', student: createSessionStudent(session), session }
  }

  const response = await fetchStudents({ search, pageSize: 10 })
  const resolved = pickStudent(response.students ?? [], session)
  return {
    id: resolved?.id || session.id || '',
    student: resolved ?? createSessionStudent(session),
    session,
  }
}

async function buildFallbackCourseState(baseStudent: Student | null, session: ReturnType<typeof getStoredStudentSession>) {
  let resolvedStudent = baseStudent
  let className = session.className || baseStudent?.className || ''

  if (!className) {
    const search = getStudentLookupKeyword(store.currentUser, session)
    if (search) {
      const studentRes = await fetchStudents({ search, pageSize: 10 })
      resolvedStudent = pickStudent(studentRes.students ?? [], session) ?? resolvedStudent
      className = session.className || resolvedStudent?.className || ''
    }
  }

  if (!className) {
    return {
      student: resolvedStudent ?? createSessionStudent(session),
      courses: [] as Course[],
      enrollments: [] as Enrollment[],
    }
  }

  const [scheduleRes, courseRes] = await Promise.all([
    fetchSchedules({ class: className }),
    fetchCourses(),
  ])

  const schedules: Schedule[] = scheduleRes.schedules ?? []
  const normalizedClassName = String(className).trim()
  if (normalizedClassName) {
    store.schedules = [
      ...store.schedules.filter(
        (schedule) => String(schedule.className ?? '').trim() !== normalizedClassName,
      ),
      ...schedules,
    ]
  }
  const courseList: Course[] = courseRes.courses ?? []
  const courseById = new Map(courseList.map((course) => [course.id, course]))
  const courseByTitle = new Map(courseList.map((course) => [course.title, course]))
  const groupedSchedules = new Map<string, Schedule[]>()

  schedules.forEach((schedule) => {
    const key = schedule.courseId || schedule.title || schedule.id
    if (!groupedSchedules.has(key)) {
      groupedSchedules.set(key, [])
    }
    groupedSchedules.get(key)!.push(schedule)
  })

  const courses: Course[] = []
  const enrollments: Enrollment[] = []
  const studentId = resolvedStudent?.id || session.id || ''

  groupedSchedules.forEach((items, key) => {
    const first = items[0]
    const matchedCourse = courseById.get(first.courseId) || courseByTitle.get(first.title)
    const sortedStartDates = items.map((item) => item.startDate).filter(Boolean).sort()
    const sortedEndDates = items.map((item) => item.endDate).filter(Boolean).sort()
    const startDate = sortedStartDates[0] || ''
    const endDate = sortedEndDates[sortedEndDates.length - 1] || startDate
    const teacherNames = [...new Set(items.map((item) => item.teacher).filter(Boolean))]
    const mentorNames = [...new Set(items.map((item) => item.mentor).filter(Boolean))]
    const courseId = matchedCourse?.id || first.courseId || key

    courses.push({
      id: courseId,
      title: matchedCourse?.title || first.title || '未命名课程',
      description: matchedCourse?.description || '',
      categoryId: matchedCourse?.categoryId || '',
      departmentId: matchedCourse?.departmentId,
      cover: matchedCourse?.cover || '',
      startDate: matchedCourse?.startDate || startDate,
      endDate: matchedCourse?.endDate || endDate,
      credits: matchedCourse?.credits || 0,
      duration: matchedCourse?.duration || 0,
      status: matchedCourse?.status || 'active',
      createdAt: matchedCourse?.createdAt || startDate || new Date().toISOString(),
      teacher: matchedCourse?.teacher || teacherNames.join(' / '),
      mentor: matchedCourse?.mentor || mentorNames.join(' / '),
    })

    const { progress, status } = buildEnrollmentProgress(startDate, endDate)
    enrollments.push({
      id: `db-enrollment-${studentId}-${courseId}`,
      studentId,
      courseId,
      scheduleId: first.id,
      enrollDate: startDate,
      progress,
      status,
    })
  })

  return {
    student: resolvedStudent ?? createSessionStudent(session),
    courses,
    enrollments,
  }
}

async function loadRemoteCourses() {
  loading.value = true
  remoteLoaded.value = false

  // 同步分类（板块分组用）；失败不阻塞主流程
  try {
    const catRes = await fetchCategories()
    const cats = catRes?.categories
    if (Array.isArray(cats) && cats.length > 0) {
      store.categories = cats
    }
  } catch { /* 分类拉取失败，分组退回课程自带 categoryName */ }

  try {
    const { id, student: resolvedStudent, session } = await resolveRemoteStudent()
    const className = String(session.className || resolvedStudent?.className || '').trim()
    mergeStudentIntoStore(resolvedStudent ?? null)

    if (className) {
      try {
        const scheduleRes = await fetchSchedules({ class: className })
        const schedules: Schedule[] = scheduleRes.schedules ?? []
        store.schedules = [
          ...store.schedules.filter(
            (schedule) => String(schedule.className ?? '').trim() !== className,
          ),
          ...schedules,
        ]
      } catch (error) {
        console.warn('同步学生班级排课失败，继续使用已有本地排课', error)
      }
    }

    if (id) {
      try {
        const response = await fetchStudentCourses(id)
        remoteStudent.value = response.student ?? resolvedStudent ?? null
        remoteCourses.value = response.courses ?? []
        remoteEnrollments.value = response.enrollments ?? []
        mergeStudentIntoStore(remoteStudent.value)
        mergeCoursesIntoStore(remoteCourses.value)
        replaceStudentEnrollments(remoteStudent.value?.id || id, remoteEnrollments.value)
        remoteLoaded.value = true
        return
      } catch (error) {
        console.warn('学生课程接口暂不可用，改用排课数据回填:', error)
      }
    }

    const fallback = await buildFallbackCourseState(resolvedStudent, session)
    remoteStudent.value = fallback.student
    remoteCourses.value = fallback.courses
    remoteEnrollments.value = fallback.enrollments
    mergeStudentIntoStore(remoteStudent.value)
    mergeCoursesIntoStore(remoteCourses.value)
    if (remoteStudent.value?.id) {
      replaceStudentEnrollments(remoteStudent.value.id, remoteEnrollments.value)
    }
    remoteLoaded.value = true
  } catch (error) {
    console.error('加载学生课程失败:', error)
    remoteStudent.value = null
    remoteCourses.value = []
    remoteEnrollments.value = []
  } finally {
    loading.value = false
  }
}

const enrolledCourses = computed(() => {
  if (remoteLoaded.value) {
    return remoteEnrollments.value
  }

  if (!student.value) return []
  return store.enrollments.filter((enrollment) => enrollment.studentId === student.value.id)
})

const getCourse = (courseId: string) =>
  remoteCourses.value.find((course) => course.id === courseId) ||
  store.courses.find((course) => course.id === courseId)

/** 分类名：优先课程对象自带 categoryName，再查 store.categories，最后「未分类」 */
function getCategoryLabel(courseId: string): string {
  const course = getCourse(courseId) as any
  const direct = String(course?.categoryName || '').trim()
  if (direct) return direct
  const catId = String(course?.categoryId || '').trim()
  if (catId) {
    const cat = (store.categories as any[]).find((c) => String(c.id) === catId)
    const name = String(cat?.name || '').trim()
    if (name) return name
  }
  return '未分类'
}

const getTeacherInfo = (teacherName: string) => store.teachers.find((teacher) => teacher.name === teacherName)

const getTeacherAvatar = (teacherName: string) => {
  const teacher = store.teachers.find((item) => item.name === teacherName)
  return teacher?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(teacherName || 'teacher')}`
}

const currentClassName = computed(() =>
  String(remoteStudent.value?.className || student.value?.className || getStoredStudentSession().className || '').trim(),
)

const isEnded = (enrollment: Enrollment) => {
  const endedByDate = store.isCourseEnded(enrollment.courseId, currentClassName.value)
  return endedByDate || enrollment.status === 'dropped'
}

const hasPendingEval = (enrollment: Enrollment) => {
  return store.evalReminders.some(
    (reminder) =>
      reminder.studentId === enrollment.studentId &&
      reminder.courseId === enrollment.courseId &&
      (reminder.status === 'pending' || reminder.status === 'overdue'),
  )
}

const getTierBadge = (courseId: string) => {
  if (!student.value) return null
  const record = store.getStudentTier(courseId, student.value.id)
  if (!record) return null

  const map: Record<string, { class: string; label: string }> = {
    basic: {
      class: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-600/15 text-gray-800 border border-brand-400/50',
      label: '基础层',
    },
    advanced: {
      class: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-600/15 text-gray-800 border border-brand-400',
      label: '进阶层',
    },
    excellent: {
      class: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-600/15 text-gray-800 border border-brand-400',
      label: '卓越层',
    },
  }

  return map[record.tier] || null
}

const progressBarColor = (_progress: number) => 'bg-brand-600'

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'enrolled':
      return 'bg-brand-600/10 text-gray-600 border border-brand-400'
    case 'in_progress':
      return 'bg-brand-400/10 text-emerald-600 border border-brand-400'
    case 'completed':
      return 'bg-brand-400/10 text-gray-600 border border-brand-400/30'
    case 'dropped':
      return 'bg-brand-600/10 text-gray-600 border border-brand-400'
    default:
      return 'bg-brand-400/10 text-gray-600 border border-brand-400/30'
  }
}

const statusIconName = (status: string) => {
  switch (status) {
    case 'enrolled':
      return 'clock'
    case 'in_progress':
      return 'bookOpen'
    case 'completed':
      return 'checkCircle'
    case 'dropped':
      return 'alertCircle'
    default:
      return 'clock'
  }
}

const statusLabel = (status: string) => {
  switch (status) {
    case 'enrolled':
      return '已报名'
    case 'in_progress':
      return '学习中'
    case 'completed':
      return '已完成'
    case 'dropped':
      return '已退课'
    default:
      return status
  }
}

function renderCourses(root: HTMLElement) {
  const container = d3.select(root)
  container.html('')

  const header = container.append('div')
  header.append('h1').attr('class', 'text-2xl font-bold text-gray-900').text('我的课程')
  header.append('p').attr('class', 'text-gray-500 mt-1').text('按课程分类查看已选课程的学习进度')

  if (loading.value) {
    const loadingDiv = container.append('div').attr('class', 'text-center py-16 text-gray-400')
    loadingDiv.append('p').text('课程加载中...')
    return
  }

  const enrollments = enrolledCourses.value
  if (enrollments.length === 0) {
    const emptyDiv = container.append('div').attr('class', 'text-center py-16 text-gray-400')
    renderIcon(emptyDiv, 'bookOpen', 'w-12 h-12 mx-auto mb-4 text-gray-400')
    emptyDiv.append('p').text('暂无已选课程')
    return
  }

  // 按课程分类（categoryName）分板块；缺失归入「未分类」
  const categoryOf = (courseId: string) => {
    const c = getCourse(courseId) as any
    return String(c?.categoryName || '').trim() || '未分类'
  }
  const groups = new Map<string, typeof enrollments>()
  for (const enrollment of enrollments) {
    const key = categoryOf(enrollment.courseId)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(enrollment)
  }
  // 分类板块按名称排序，「未分类」置末尾
  const orderedGroups = [...groups.entries()].sort(([a], [b]) => {
    if (a === '未分类') return 1
    if (b === '未分类') return -1
    return a.localeCompare(b, 'zh-CN')
  })

  const sectionsRoot = container.append('div').attr('class', 'space-y-8')

  for (const [categoryName, items] of orderedGroups) {
    const section = sectionsRoot.append('section')

    const sectionHeader = section.append('div').attr('class', 'flex items-center gap-2 mb-3')
    sectionHeader
      .append('span')
      .attr('class', 'w-1 h-4 rounded-full bg-brand-600')
    sectionHeader
      .append('h2')
      .attr('class', 'text-base font-semibold text-gray-800')
      .text(categoryName)
    sectionHeader
      .append('span')
      .attr('class', 'text-xs text-gray-400')
      .text(`${items.length} 门`)

    // 卡片缩小：3 列、更矮的封面
    const grid = section.append('div').attr('class', 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4')

    items.forEach((enrollment) => renderCourseCard(grid as any, enrollment))
  }
}

function renderCourseCard(grid: any, enrollment: any) {
  {
    const course = getCourse(enrollment.courseId)
    const ended = isEnded(enrollment)
    const pendingEval = !ended && hasPendingEval(enrollment)
    const tierBadge = getTierBadge(enrollment.courseId)

    const cardClasses = [
      'group bg-white rounded-xl border shadow-sm transition-all duration-200 overflow-hidden relative cursor-pointer',
      ended ? 'border-brand-400/30 opacity-60 hover:opacity-70' : 'border-brand-400/20 hover:shadow-lg',
    ].join(' ')

    const card = grid
      .append('div')
      .attr('class', cardClasses)
      .attr('title', pendingEval ? '有未完成的评价，点击可直接进入评价填写' : '')
      .on('click', () =>
        router.push(`/student/courses/${enrollment.courseId}${pendingEval ? '?tab=evaluations' : ''}`),
      )

    if (pendingEval) {
      const evalBadge = card
        .append('div')
        .attr('class', 'absolute top-3 right-3 z-20 cursor-pointer')
        .attr('title', '有未完成的评价，点击前往评价填写')
        .on('click', (event) => {
          event.stopPropagation()
          router.push(`/student/courses/${enrollment.courseId}?tab=evaluations`)
        })

      const span = evalBadge.append('span').attr('class', 'relative inline-flex')
      renderIcon(span, 'alertCircle', 'w-5 h-5 text-gray-600')
      span
        .append('span')
        .attr('class', 'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse')
    }

    if (tierBadge) {
      const tierDiv = card.append('div').attr('class', `absolute top-3 left-3 z-10 ${tierBadge.class}`)
      renderIcon(tierDiv, 'layers', 'w-3 h-3')
      tierDiv.append('span').text(tierBadge.label)
    }

    const coverDiv = card
      .append('div')
      .attr('class', 'relative h-24 bg-gradient-to-br from-brand-600 to-brand-600 overflow-hidden')

    if (course?.cover) {
      const imgClasses = [
        'w-full h-full object-cover transition-transform duration-300',
        ended ? 'grayscale' : 'group-hover:scale-105',
      ].join(' ')

      coverDiv.append('img').attr('src', course.cover).attr('alt', course.title || '').attr('class', imgClasses)
    }

    coverDiv.append('div').attr('class', 'absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent')

    if (ended) {
      const watermark = coverDiv.append('div').attr('class', 'absolute inset-0 flex items-center justify-center')
      watermark
        .append('span')
        .attr('class', 'text-white/50 text-lg font-bold tracking-widest -rotate-12 select-none')
        .text('已结束')
    }

    const bottomInfo = coverDiv.append('div').attr('class', 'absolute bottom-2 left-3 right-3')
    bottomInfo.append('h3').attr('class', 'text-white font-bold text-sm leading-tight truncate').text(course?.title || '')

    const badgeRow = bottomInfo.append('div').attr('class', 'flex items-center gap-2 mt-1')
    badgeRow
      .append('span')
      .attr('class', 'text-[11px] text-white/80 bg-white/20 px-1.5 py-0.5 rounded-full')
      .text(`${course?.credits || 0} 学分`)
    badgeRow
      .append('span')
      .attr('class', 'text-[11px] text-white/80 bg-white/20 px-1.5 py-0.5 rounded-full')
      .text(`${course?.duration || 0} 课时`)

    const contentDiv = card.append('div').attr('class', 'p-3 space-y-2')

    const teacherName = course?.teacher || ''
    const teacherDiv = contentDiv.append('div').attr('class', 'flex items-center gap-2')
    teacherDiv
      .append('img')
      .attr('src', getTeacherAvatar(teacherName))
      .attr('alt', teacherName)
      .attr('class', 'w-6 h-6 rounded-full bg-gray-100 object-cover')

    const teacherInfo = teacherDiv.append('div').attr('class', 'flex-1 min-w-0')
    teacherInfo.append('p').attr('class', 'text-xs font-medium text-gray-900 truncate').text(teacherName || '未设置教师')

    const progressSection = contentDiv.append('div')
    const progressLabel = progressSection.append('div').attr('class', 'flex justify-between text-[11px] text-gray-500 mb-1')
    progressLabel.append('span').text('学习进度')
    progressLabel.append('span').text(`${enrollment.progress}%`)

    const barOuter = progressSection.append('div').attr('class', 'w-full h-1.5 bg-gray-100 rounded-full overflow-hidden')
    barOuter
      .append('div')
      .attr('class', `h-full rounded-full transition-all duration-300 ${progressBarColor(enrollment.progress)}`)
      .style('width', `${enrollment.progress}%`)

    const footerDiv = contentDiv.append('div').attr('class', 'flex items-center justify-between pt-1')
    const badgeSpan = footerDiv
      .append('span')
      .attr('class', `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusBadgeClass(enrollment.status)}`)

    renderIcon(badgeSpan, statusIconName(enrollment.status) as never, 'w-3 h-3')
    badgeSpan.append('span').text(statusLabel(enrollment.status))

    const actionLink = footerDiv
      .append('span')
      .attr(
        'class',
        `inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
          ended ? 'text-gray-400' : 'text-gray-600 group-hover:text-gray-800'
        }`,
      )

    actionLink.text(ended ? '查看记录' : '进入学习')
    renderIcon(actionLink, 'arrowRight', 'w-3 h-3 transition-transform group-hover:translate-x-0.5')
  }
}

function rerender() {
  const root = document.getElementById('student-courses-root')
  if (root) renderCourses(root)
}

onMounted(async () => {
  await loadRemoteCourses()
  rerender()
})

watch([enrolledCourses, remoteCourses, loading], () => {
  rerender()
}, { deep: true })
</script>
