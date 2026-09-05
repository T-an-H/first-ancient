<template>
  <div class="space-y-6">
    <section class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">成绩管理</h1>
          <p class="text-sm text-gray-500 mt-1">查看数据库中的课程成绩与考试明细</p>
        </div>

        <div class="flex items-center gap-3">
          <select
            v-model="semester"
            class="px-3 py-2.5 rounded-lg border border-brand-400/30 focus:border-brand-600 outline-none text-sm bg-white"
          >
            <option value="">全部学期</option>
            <option v-for="item in semesters" :key="item" :value="item">{{ item }}</option>
          </select>
          <div v-if="loading" class="text-sm text-gray-400">正在同步...</div>
        </div>
      </div>
    </section>

    <section
      v-if="sortedGradeEntries.length > 0"
      class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-5"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-gray-800">成绩分布</h2>
        <div class="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-sm bg-emerald-500"></span>
            <span>≥90 优秀</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-sm bg-blue-500"></span>
            <span>≥80 良好</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-sm bg-sky-400"></span>
            <span>≥60 及格</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-sm bg-red-500"></span>
            <span>&lt;60 不及格</span>
          </div>
          <div class="flex items-center gap-1.5 ml-2">
            <span class="w-0.5 h-3 bg-red-500"></span>
            <span>平均分 {{ avgScore }}</span>
          </div>
        </div>
      </div>

      <div ref="chartRef" style="width:100%;height:320px"></div>
    </section>

    <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div
        v-for="item in stats"
        :key="item.label"
        class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-5"
      >
        <div class="text-sm text-gray-400">{{ item.label }}</div>
        <div class="mt-2 text-3xl font-bold" :class="item.color">{{ item.value }}</div>
        <div v-if="item.tip" class="mt-2 text-xs text-gray-400">{{ item.tip }}</div>
      </div>
    </section>

    <section class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-6">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">课程成绩</h2>
        <span class="text-sm text-gray-400">{{ gradeEntries.length }} 门</span>
      </div>

      <div v-if="gradeEntries.length === 0" class="text-center py-12 text-gray-400">
        暂无成绩数据
      </div>

      <div v-else class="mt-5 space-y-3">
        <button
          v-for="entry in gradeEntries"
          :key="entry.courseId"
          class="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 px-5 py-4 transition-colors"
          @click="openModal(entry)"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <div class="text-base font-semibold text-gray-900 truncate">{{ entry.courseName }}</div>
              <div class="mt-1 text-sm text-gray-500">
                {{ entry.teacher || '未设置教师' }} · {{ entry.semester }}
              </div>
            </div>

            <div class="text-right flex-shrink-0">
              <div class="text-2xl font-bold" :class="getGradeColor(entry.totalScore)">
                {{ entry.totalScore }}
              </div>
              <div class="mt-1">
                <span class="px-2 py-0.5 rounded text-xs" :class="getGradeBadge(entry.totalScore)">
                  {{ getGradeLevel(entry.totalScore) }}
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </section>

    <Modal :isOpen="modalOpen" :onClose="closeModal" :title="modalTitle" maxWidth="max-w-2xl">
      <div v-if="modalEntry" class="space-y-5">
        <div class="rounded-xl border border-brand-400/20 bg-brand-400/5 p-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-base font-semibold text-gray-900">{{ modalEntry.courseName }}</div>
              <div class="mt-1 text-sm text-gray-500">
                {{ modalEntry.teacher || '未设置教师' }} · {{ modalEntry.semester }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-3xl font-bold" :class="getGradeColor(modalEntry.totalScore)">
                {{ modalEntry.totalScore }}
              </div>
              <div class="mt-1 text-xs text-gray-400">总评成绩</div>
            </div>
          </div>
        </div>

        <div v-if="regularItems(modalEntry).length > 0" class="space-y-3">
          <h3 class="text-sm font-semibold text-gray-800">平时成绩构成</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="item in regularItems(modalEntry)"
              :key="item.label"
              class="rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm text-gray-700">{{ item.label }}</span>
                <span class="text-sm font-semibold text-gray-900">{{ item.score }}/100</span>
              </div>
              <div class="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div class="h-full rounded-full bg-brand-700" :style="{ width: `${item.score}%` }" />
              </div>
              <div class="mt-2 text-xs text-gray-400">权重 {{ item.weight }}%</div>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-gray-800">考试与作业明细</h3>
          <div v-if="examItems(modalEntry).length === 0" class="text-sm text-gray-400">
            暂无明细
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="item in examItems(modalEntry)"
              :key="`${item.type}-${item.examName}`"
              class="rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ item.label }}</div>
                  <div class="mt-1 text-xs text-gray-400">
                    权重 {{ item.weight }}% · {{ item.statusText }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-lg font-bold" :class="getGradeColor(item.score)">{{ item.score }}</div>
                  <div class="mt-1 text-xs text-gray-400">满分 {{ item.fullScore }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import Modal from '@/components/Modal.vue'
import { fetchCourses, fetchStudentScores, fetchStudents } from '@/api'
import { getStoredStudentSession, getStudentLookupKeyword, matchStudentFromSession } from '@/lib/studentSession'
import { useAppStore } from '@/stores/app'
import type { Course, DetailedGrade, Grade, Student } from '@/types'
import { getDefaultGradeConfig } from '@/types'

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

type GradeEntry = {
  courseId: string
  courseName: string
  teacher: string
  semester: string
  totalScore: number
  detail?: DetailedGrade
}

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const loading = ref(false)
const semester = ref('')
const chartRef = ref<HTMLElement | null>(null)
const remoteStudent = ref<Student | null>(null)
const remoteScores = ref<StudentScore[]>([])
const modalOpen = ref(false)
const modalEntry = ref<GradeEntry | null>(null)

let chartInstance: echarts.ECharts | null = null

const student = computed(() => remoteStudent.value ?? matchStudentFromSession(store.students, store.currentUser) ?? null)
const myGrades = computed(() => (student.value ? store.grades.filter((item) => item.studentId === student.value!.id) : []))

const semesters = computed(() =>
  Array.from(
    new Set(
      myGrades.value
        .map((item) => String(item.semester || '').trim())
        .filter(Boolean),
    ),
  ),
)

const filteredGrades = computed(() => {
  if (!semester.value) return myGrades.value
  return myGrades.value.filter((item) => item.semester === semester.value)
})

const modalTitle = computed(() => (modalEntry.value ? `${modalEntry.value.courseName} - 成绩明细` : '成绩明细'))

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
    const totalScore = totalWeight > 0
      ? items.reduce((sum, item) => sum + Number(item.score || 0) * Number(item.weight || 0), 0) / totalWeight
      : items.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(items.length, 1)
    const latest = [...items].sort((left, right) => String(right.gradedAt).localeCompare(String(left.gradedAt)))[0]

    return {
      id: `db-grade-${studentId}-${courseId}`,
      studentId,
      courseId,
      score: Math.round(totalScore),
      semester: '',
      comment: '',
      gradedAt: latest?.gradedAt || '',
      totalScore: Math.round(totalScore),
    }
  })

  store.grades = [
    ...store.grades.filter((item) => item.studentId !== studentId),
    ...grades,
  ]
}

function getCourse(courseId: string) {
  return store.courses.find((item) => item.id === courseId)
}

function getDetail(courseId: string) {
  if (!student.value) return undefined
  return store.detailedGrades.find(
    (item) => item.studentId === student.value!.id && item.courseId === courseId,
  )
}

function getSemesterLabel(grade: Grade, course?: Course) {
  const explicit = String(grade.semester || '').trim()
  if (explicit) return explicit
  const seed = course?.createdAt || grade.gradedAt || ''
  if (!seed) return '未分学期'
  return `${String(seed).slice(0, 4)}年`
}

const gradeEntries = computed<GradeEntry[]>(() =>
  filteredGrades.value.map((grade) => {
    const course = getCourse(grade.courseId)
    const detail = getDetail(grade.courseId)
    const totalScore = detail
      ? store.calcTotalScore(grade.courseId, detail)
      : Math.round(Number(grade.totalScore ?? grade.score ?? 0))

    return {
      courseId: grade.courseId,
      courseName:
        course?.title ||
        remoteScores.value.find((item) => item.courseId === grade.courseId)?.courseTitle ||
        '未知课程',
      teacher: course?.teacher || '',
      semester: getSemesterLabel(grade, course),
      totalScore,
      detail,
    }
  }),
)

const sortedGradeEntries = computed(() => [...gradeEntries.value].sort((left, right) => right.totalScore - left.totalScore))
const avgScore = computed(() => {
  if (gradeEntries.value.length === 0) return 0
  return Math.round(gradeEntries.value.reduce((sum, item) => sum + item.totalScore, 0) / gradeEntries.value.length)
})
const maxScore = computed(() => (gradeEntries.value.length > 0 ? Math.max(...gradeEntries.value.map((item) => item.totalScore)) : 0))
const minScore = computed(() => (gradeEntries.value.length > 0 ? Math.min(...gradeEntries.value.map((item) => item.totalScore)) : 0))
const gradedCourses = computed(() => gradeEntries.value.length)

const stats = computed(() => [
  { label: '平均成绩', value: `${avgScore.value}`, color: avgScore.value >= 60 ? 'text-brand-700' : 'text-red-500', tip: '按数据库考试成绩汇总' },
  { label: '最高分', value: `${maxScore.value}`, color: 'text-emerald-600', tip: '' },
  { label: '最低分', value: `${minScore.value}`, color: 'text-blue-600', tip: '' },
  { label: '已评课程', value: `${gradedCourses.value}`, color: 'text-gray-900', tip: student.value ? `学生 ${student.value.name}` : '未识别学生' },
])

function getBarColor(score: number) {
  if (score >= 90) return '#10b981'
  if (score >= 80) return '#3b82f6'
  if (score >= 60) return '#38bdf8'
  return '#ef4444'
}

function initChart() {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)
  updateChart()
}

function updateChart() {
  if (!chartInstance) return
  if (sortedGradeEntries.value.length === 0) {
    chartInstance.clear()
    return
  }

  chartInstance.setOption({
    grid: { left: 50, right: 20, top: 30, bottom: 70 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const point = params?.[0]
        if (!point) return ''
        const score = Number(point.value || 0)
        return `${point.name}<br/>分数：<b>${score}</b> 分<br/>等级：<b>${getGradeLevel(score)}</b>`
      },
    },
    xAxis: {
      type: 'category',
      data: sortedGradeEntries.value.map((item) => item.courseName),
      axisLabel: {
        fontSize: 11,
        color: '#64748b',
        interval: 0,
        rotate: sortedGradeEntries.value.length > 3 ? 20 : 0,
      },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      interval: 20,
      axisLabel: { fontSize: 11, color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [{
      type: 'bar',
      barWidth: '45%',
      data: sortedGradeEntries.value.map((item) => ({
        value: item.totalScore,
        itemStyle: { color: getBarColor(item.totalScore) },
      })),
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      label: {
        show: true,
        position: 'top',
        fontSize: 11,
        fontWeight: 'bold',
        color: '#374151',
      },
      markLine: avgScore.value > 0
        ? {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#ef4444', type: 'dashed', width: 2 },
            data: [{ yAxis: avgScore.value, label: { show: false } }],
          }
        : undefined,
    }],
  })
}

function regularItems(entry: GradeEntry) {
  const detail = entry.detail
  const cfg = getDefaultGradeConfig(entry.courseId)
  if (!detail) return []

  return [
    { label: '个人自评', score: detail.selfEvalScore, weight: cfg.selfEvalWeight },
    { label: '小组内互评', score: detail.peerReviewScore, weight: cfg.peerReviewWeight },
    { label: '小组间互评', score: detail.interGroupScore, weight: cfg.interGroupEvalWeight },
    { label: '教师评价', score: detail.teacherScore, weight: cfg.teacherScoreWeight },
    { label: '导师评价', score: detail.mentorScore, weight: cfg.mentorScoreWeight },
  ].filter((item) => item.score != null) as { label: string; score: number; weight: number }[]
}

function normalizeExamLabel(item: StudentScore) {
  const map: Record<string, string> = {
    midterm_exam: '期中笔试',
    midterm_project: '期中项目',
    final_exam: '期末笔试',
    final_project: '期末项目',
    quiz: '小测',
    assignment: '作业',
  }
  return map[item.type] || item.examName || '成绩项'
}

function examItems(entry: GradeEntry) {
  return remoteScores.value
    .filter((item) => item.courseId === entry.courseId)
    .map((item) => ({
      ...item,
      label: normalizeExamLabel(item),
      statusText: item.status === 'submitted' ? '已提交' : '草稿',
    }))
}

function getGradeColor(score: number) {
  if (score >= 90) return 'text-emerald-600'
  if (score >= 80) return 'text-blue-600'
  if (score >= 60) return 'text-brand-700'
  return 'text-red-500'
}

function getGradeLevel(score: number) {
  if (score >= 90) return '优秀'
  if (score >= 80) return '良好'
  if (score >= 60) return '及格'
  return '不及格'
}

function getGradeBadge(score: number) {
  if (score >= 90) return 'bg-emerald-50 text-emerald-600'
  if (score >= 80) return 'bg-blue-50 text-blue-600'
  if (score >= 60) return 'bg-brand-50 text-brand-700'
  return 'bg-red-50 text-red-500'
}

function openModal(entry: GradeEntry) {
  modalEntry.value = entry
  modalOpen.value = true
}

function clearCourseQuery() {
  const query = { ...route.query }
  if (!query.courseId) return
  delete query.courseId
  void router.replace({ query })
}

function closeModal() {
  modalOpen.value = false
  modalEntry.value = null
  clearCourseQuery()
}

function openCourseFromQuery() {
  const courseId = typeof route.query.courseId === 'string' ? route.query.courseId : ''
  if (!courseId) return
  const entry = gradeEntries.value.find((item) => item.courseId === courseId)
  if (entry) openModal(entry)
}

async function loadRemoteGrades() {
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

    try {
      const courseRes = await fetchCourses()
      mergeCoursesIntoStore(courseRes.courses ?? [])
    } catch (error) {
      console.warn('加载课程数据失败，继续使用已存在课程数据', error)
    }

    const studentId = resolvedStudent?.id || session.id || ''
    if (studentId) {
      try {
        const scoreRes = await fetchStudentScores(studentId)
        remoteScores.value = scoreRes.scores ?? []
        replaceStudentGrades(studentId, remoteScores.value)
      } catch (error) {
        console.warn('加载学生成绩失败', error)
      }
    }
  } finally {
    loading.value = false
  }
}

watch(gradeEntries, async () => {
  await nextTick()
  updateChart()
  openCourseFromQuery()
}, { deep: true })

watch(semester, async () => {
  await nextTick()
  updateChart()
})

watch(() => route.query.courseId, () => {
  void nextTick(openCourseFromQuery)
})

onMounted(async () => {
  await loadRemoteGrades()
  await nextTick()
  initChart()
  openCourseFromQuery()
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>
