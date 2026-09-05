<template>
  <div class="space-y-6">
    <!-- 页面头部 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">成绩查询</h1>
        <p class="text-gray-400 mt-1">查看学生成绩、课程统计概览，支持导出和成绩同步</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="handleExportGrades"
          class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg border border-brand-400/30 text-gray-400 hover:bg-brand-400/10 transition-colors">
          <Download class="w-4 h-4" />
          导出 Excel
        </button>
        <button @click="handleExportGradesToSystem"
          :disabled="isExporting"
          class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
          :class="isExporting ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'border border-brand-600 bg-brand-600 text-white hover:bg-brand-700'">
          <Loader2 v-if="isExporting" class="w-4 h-4 animate-spin" />
          <Upload v-else class="w-4 h-4" />
          {{ isExporting ? '导出中...' : '导出成绩' }}
        </button>
      </div>
    </div>

    <!-- 导出成功通知 -->
    <Transition name="toast">
      <div v-if="showExportToast"
        class="fixed top-6 right-6 z-[60] bg-white rounded-xl shadow-xl border border-green-200 px-5 py-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
          <CheckCircle class="w-5 h-5 text-green-500" />
        </div>
        <div>
          <p class="text-sm font-medium text-gray-900">成绩数据导出成功</p>
          <p class="text-xs text-gray-500 mt-0.5">数据支持同步至教务系统</p>
        </div>
      </div>
    </Transition>

    <!-- 筛选栏 -->
    <div class="flex flex-wrap gap-4">
      <select v-model="selectedCourse"
        class="px-4 py-2.5 rounded-lg border border-brand-400/30 focus:border-brand-600 outline-none text-sm bg-white">
        <option value="all">全部课程</option>
        <option v-for="c in myCourses" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
      <select v-model="selectedSemester"
        class="px-4 py-2.5 rounded-lg border border-brand-400/30 focus:border-brand-600 outline-none text-sm bg-white min-w-[160px]">
        <option v-for="(sem, idx) in SEMESTERS" :key="idx" :value="idx === SEMESTERS.length - 1 ? 'all' : String(idx)">{{ sem.label }}</option>
      </select>
      <div class="relative min-w-[200px]">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="gradeSearch" type="text" placeholder="搜索学生姓名..."
          class="w-full pl-9 pr-3 py-2.5 rounded-lg border border-brand-400/30 focus:border-brand-600 outline-none text-sm bg-white" />
      </div>
      <button @click="showStats = !showStats"
        class="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-gray-800 rounded-lg border border-brand-400/30 bg-white">
        <BarChart3 class="w-4 h-4" />
        统计概览
        <ChevronUp v-if="showStats" class="w-3 h-3" />
        <ChevronDown v-else class="w-3 h-3" />
      </button>
      <span class="text-sm text-gray-400">
        已评 {{ stats.totalGraded }}/{{ stats.totalStudents }} 人
      </span>
    </div>

    <!-- 班级/分组过滤（仅具体课程时显示） -->
    <div v-if="selectedCourse !== 'all'" class="flex flex-wrap gap-4 items-center">
      <select v-model="gradeFilterClass"
        class="px-4 py-2.5 rounded-lg border border-brand-400/30 focus:border-brand-600 outline-none text-sm bg-white min-w-[140px]">
        <option value="">全部班级</option>
        <option v-for="cn in gradeClassOptions" :key="cn" :value="cn">{{ cn }}</option>
      </select>
      <select v-model="gradeFilterGroup"
        class="px-4 py-2.5 rounded-lg border border-brand-400/30 focus:border-brand-600 outline-none text-sm bg-white min-w-[140px]">
        <option value="">全部分组</option>
        <option v-for="gn in gradeGroupOptions" :key="gn" :value="gn">{{ gn }}</option>
      </select>
    </div>

    <!-- 统计概览（仅选择具体课程后显示） -->
    <div v-if="showStats && selectedCourse !== 'all'" class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-5 space-y-4">
      <!-- 关键指标 -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-brand-600/10 rounded-lg p-3">
          <p class="text-xs text-gray-600 mb-0.5">平均分</p>
          <p class="text-xl font-bold text-gray-800">{{ stats.avg ?? '-' }}</p>
        </div>
        <div class="bg-brand-400/10 rounded-lg p-3">
          <p class="text-xs text-gray-600 mb-0.5">最高分</p>
          <p class="text-xl font-bold text-gray-800">{{ stats.max ?? '-' }}</p>
        </div>
        <div class="bg-brand-400/10 rounded-lg p-3">
          <p class="text-xs text-gray-400 mb-0.5">最低分</p>
          <p class="text-xl font-bold text-gray-800">{{ stats.min ?? '-' }}</p>
        </div>
        <div class="bg-brand-400/10 rounded-lg p-3">
          <p class="text-xs text-gray-600 mb-0.5">及格率</p>
          <p class="text-xl font-bold text-gray-800">{{ stats.passRate !== null ? `${stats.passRate}%` : '-' }}</p>
        </div>
        <div class="bg-brand-400/10 rounded-lg p-3">
          <p class="text-xs text-gray-400 mb-0.5">已评人数</p>
          <p class="text-xl font-bold text-gray-800">{{ stats.totalGraded }}</p>
        </div>
      </div>

      <!-- 成绩分布条形图 -->
      <div v-if="stats.scoresList.length > 0">
        <p class="text-xs font-medium text-gray-400 mb-2">成绩分布（{{ selectedCourseTitle }}）</p>
        <div class="space-y-1.5">
          <div v-for="d in distribution" :key="d.label" class="flex items-center gap-2">
            <span class="text-xs text-gray-400 w-8 text-right">{{ d.label }}</span>
            <div class="flex-1 bg-brand-400/10 rounded-full h-3 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :class="d.bar" :style="{ width: `${d.pct}%` }" />
            </div>
            <span class="text-xs text-gray-400 w-12">{{ d.count }}人 ({{ d.pct }}%)</span>
          </div>
        </div>
      </div>

      <!-- 知识掌握热力图 -->
      <div v-if="selectedCourse !== 'all'" class="mt-4 border-t border-brand-400/20 pt-4">
        <p class="text-xs font-medium text-gray-400 mb-2">知识掌握热力图（{{ getCourseTitle(selectedCourse) }}）</p>
        <div class="grid grid-cols-5 gap-1.5 max-w-md">
          <div v-for="kp in knowledgePoints" :key="kp.label" class="flex flex-col items-center gap-1">
            <div class="w-full aspect-square rounded-lg flex items-center justify-center text-white text-xs font-bold" :class="kp.color">
              {{ kp.mastery }}%
            </div>
            <span class="text-[9px] text-gray-400 text-center leading-tight">{{ kp.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 权重摘要 -->
    <div v-if="currentCfg" class="bg-brand-400/10 rounded-xl p-4 border border-brand-400/50 text-sm text-gray-800 flex flex-wrap gap-x-6 gap-y-1">
      <span>总成绩 = 平时 {{ currentCfg.regularWeight }}% + 期中 {{ currentCfg.midtermWeight }}% + 期末 {{ currentCfg.finalWeight }}%{{ getQualitySummary(currentCfg) }}</span>
      <span>平时 = 个人自评 {{ currentCfg.selfEvalWeight }}% + 小组内互评 {{ currentCfg.peerReviewWeight }}% + 小组间互评 {{ currentCfg.interGroupEvalWeight }}% + 教师评价 {{ currentCfg.teacherScoreWeight }}% + 企业导师评价 {{ currentCfg.mentorScoreWeight }}%</span>
    </div>

    <!-- 成绩查询 - 卡片列表 -->
    <div ref="printRef">
      <div v-if="filteredEnrollments.length > 0">
        <!-- 具体课程：按班级展示 -->
        <template v-if="selectedCourse !== 'all'">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div v-for="(classBlock, ci) in filteredGradeClassBlocks" :key="ci"
              @click="selectedGradeClass = classBlock.className; showGradePopup = true"
              class="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-gray-800">班级 {{ classBlock.className || '未分班' }}</span>
                <ChevronRight class="w-4 h-4 text-gray-400" />
              </div>
              <div class="mt-1 flex items-center gap-2">
                <span class="text-xs text-gray-500">{{ classBlock.groups.reduce((a, g) => a + g.items.length, 0) }}人</span>
                <span v-for="(group, gi) in classBlock.groups" :key="gi" class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{{ group.groupName }}</span>
              </div>
            </div>
          </div>
        </template>
        <!-- 全部课程：按课程展示 -->
        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div v-for="courseId in myCourseIds" :key="courseId"
              @click="selectedCourse = courseId"
              class="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-gray-800">{{ getCourseTitle(courseId) }}</span>
                <ChevronRight class="w-4 h-4 text-gray-400" />
              </div>
              <div class="mt-1 text-xs text-gray-500">{{ getCourseEnrollmentsGrouped(courseId).reduce((a, g) => a + g.items.length, 0) }}人</div>
            </div>
          </div>
        </template>
      </div>
      <div v-else class="text-center py-8 text-gray-400">暂无数据</div>
    </div>

    <!-- 成绩弹窗 -->
    <div v-if="showGradePopup" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeGradePopup">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-brand-400/20">
          <h3 class="text-lg font-semibold text-gray-900">班级 {{ selectedGradeClass }} - 成绩查询</h3>
          <button @click="closeGradePopup" class="p-1 rounded-lg hover:bg-brand-400/10 transition-colors">
            <X class="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-6">
          <template v-if="currentGradeClassSection">
            <template v-for="(group, gi) in currentGradeClassSection.groups" :key="gi">
              <div class="mb-2">
                <span class="text-sm font-semibold text-gray-600">{{ group.groupName }}</span>
                <span class="text-[10px] text-gray-400 ml-1">{{ group.items.length }}人</span>
              </div>
              <table class="w-full min-w-[600px] mb-6">
                <thead>
                  <tr class="bg-brand-400/10 border-b border-brand-400/20">
                    <th class="text-left px-4 py-3 text-sm font-medium text-gray-400">学生</th>
                    <th class="text-center px-4 py-3 text-sm font-medium text-gray-400">总分</th>
                    <th class="text-center px-4 py-3 text-sm font-medium text-gray-400">等级</th>
                    <th class="text-center px-4 py-3 text-sm font-medium text-gray-400">评阅时间</th>
                    <th class="text-center px-4 py-3 text-sm font-medium text-gray-400">详情</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-brand-400/20">
                  <tr v-for="enr in group.items" :key="enr.id" class="hover:bg-brand-400/10 transition-colors">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full bg-brand-600/15 flex items-center justify-center flex-shrink-0">
                          <span class="text-xs font-medium text-gray-600">{{ getStudentName(enr.studentId).charAt(0) }}</span>
                        </div>
                        <span class="text-sm font-medium text-gray-900 whitespace-nowrap">{{ getStudentName(enr.studentId) }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span v-if="getStudentTotal(enr)" class="font-semibold text-sm" :class="getTotalColorClass(getStudentTotal(enr)!)">
                        {{ getStudentTotal(enr) }}
                      </span>
                      <span v-else class="text-gray-400/60">-</span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span v-if="getStudentTotal(enr)" class="text-xs px-2 py-0.5 rounded-full" :class="getGradeLevel(getStudentTotal(enr)!).color">
                        {{ getGradeLevel(getStudentTotal(enr)!).label }}
                      </span>
                      <span v-else class="text-gray-400/60">-</span>
                    </td>
                    <td class="px-4 py-3 text-center text-sm text-gray-400">
                      {{ getGradedAt(enr) || '-' }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <button v-if="getStudentTotal(enr) !== null"
                        @click="openDetail(enr)"
                        class="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-brand-600/10 transition-colors">
                        查看详情
                      </button>
                      <span v-else class="text-gray-400/60">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
          </template>
          <div v-else class="text-center py-8 text-gray-400">暂无数据</div>
        </div>
        <div class="flex justify-end px-6 py-4 border-t border-brand-400/20">
          <button @click="closeGradePopup"
            class="px-4 py-2 text-sm font-medium rounded-lg border border-brand-400/30 text-gray-600 hover:bg-brand-400/10 transition-colors">
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- ScoreDetail Modal -->
    <ScoreDetail v-if="detailTarget"
      :open="true"
      :on-close="() => detailTarget = null"
      :student-name="detailTarget.studentName"
      :course-title="detailTarget.courseTitle"
      :detail="detailTargetDetail"
      :cfg="detailTargetCfg"
      :total-score="detailTargetTotalScore"
      :exam-scores="detailTargetExamScores"
      :course-id="detailTarget.courseId"
      :student-id="detailTarget.studentId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { BarChart3, ChevronDown, ChevronUp, ChevronRight, Download, Upload, Loader2, CheckCircle, Search, X } from 'lucide-vue-next'
import ScoreDetail from '@/components/ScoreDetail.vue'
import type { DetailedGrade, Enrollment } from '@/types'
import { getNow } from '@/lib/date'
import { fetchCourseScores, fetchTeacherCourses } from '@/api'

const store = useAppStore()

const selectedCourse = ref('all')
const showStats = ref(true)
const selectedSemester = ref('all')
const gradeFilterClass = ref('')
const gradeFilterGroup = ref('')
const gradeSearch = ref('')
const showGradePopup = ref(false)
const detailTarget = ref<{ studentName: string; courseTitle: string; courseId: string; studentId: string } | null>(null)
const printRef = ref<HTMLElement | null>(null)
const selectedGradeClass = ref('')
const selectedStudent = ref<any>(null)
const showDetail = ref(false)

// 从数据库加载的成绩数据
const dbScores = ref<any[]>([])
const loadingScores = ref(false)

// 监听课程选择，从数据库加载成绩
watch(() => selectedCourse.value, async (courseId) => {
  if (!courseId || courseId === 'all') return
  loadingScores.value = true
  try {
    const res = await fetchCourseScores(courseId)
    if (res.success) {
      dbScores.value = res.scores
      // 回填到 store 供其他组件使用
      for (const s of res.scores) {
        const existing = store.examScores.findIndex((x: any) => x.id === s.id)
        if (existing >= 0) {
          store.examScores[existing] = s
        } else {
          store.examScores.push(s)
        }
      }
    }
  } catch { /* ignore */ } finally {
    loadingScores.value = false
  }
})

onMounted(async () => {
  // 加载教师课程
  try {
    const res = await fetchTeacherCourses(store.currentUser || '')
    if (res.success) store.courses = res.courses
  } catch { /* ignore */ }
})

const GRADE_COLORS = [
  { range: [90, 100], label: '优秀', color: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-500' },
  { range: [80, 89], label: '良好', color: 'bg-blue-100 text-blue-800', bar: 'bg-blue-500' },
  { range: [70, 79], label: '中等', color: 'bg-brand-50 text-brand-800', bar: 'bg-brand-600' },
  { range: [60, 69], label: '及格', color: 'bg-brand-50 text-brand-800', bar: 'bg-brand-600' },
  { range: [0, 59], label: '不及格', color: 'bg-red-100 text-red-800', bar: 'bg-red-500' },
]

const PASS_THRESHOLD = 60

const SEMESTERS = [
  { label: '2026年春季', start: '2026-02-01', end: '2026-06-30' },
  { label: '2026年秋季(当前)', start: '2026-09-01', end: '2027-01-31' },
  { label: '全部学期', start: '', end: '' },
]

// ====== Export to system state ======
const isExporting = ref(false)
const showExportToast = ref(false)
let exportToastTimer: ReturnType<typeof setTimeout> | null = null

// ====== Computed ======
const isMentor = computed(() => store.currentRole === 'mentor')
const isLeaderWithTeaching = computed(() => store.leaders.some((l) => l.name === store.currentUser && l.asTeacher))

const myCourses = computed(() => {
  if (isLeaderWithTeaching.value) {
    return store.getLeaderCourses(store.currentUser || '')
  }
  if (isMentor.value) {
    const mentorCourseIds = store.getMentorCourseIds(store.currentUser || '')
    return store.courses.filter((c) => mentorCourseIds.includes(c.id))
  }
  return store.courses.filter((c) => c.teacher === store.currentUser)
})
const myCourseIds = computed(() => myCourses.value.map((c) => c.id))

const filteredEnrollments = computed(() => {
  return store.enrollments.filter((e) => {
    // 只显示该教师的课程
    if (!myCourseIds.value.includes(e.courseId)) return false
    // 排除退课学生
    if (e.status === 'dropped') return false
    // 按课程筛选
    if (selectedCourse.value !== 'all' && e.courseId !== selectedCourse.value) return false
    // 按学期筛选
    if (selectedSemester.value !== 'all') {
      const idx = parseInt(selectedSemester.value)
      if (!isNaN(idx) && idx >= 0 && idx < SEMESTERS.length) {
        const sem = SEMESTERS[idx]
        if (sem && sem.start) {
          const schedule = store.schedules.find((s) => s.id === e.scheduleId)
          if (!schedule || schedule.startDate < sem.start || schedule.startDate > sem.end) {
            return false
          }
        }
      }
    }
    return true
  })
})

const getStudentName = (id: string) => store.students.find((s) => s.id === id)?.name || '未知'
const getCourseTitle = (id: string) => store.courses.find((c) => c.id === id)?.title || '未知'
const getExisting = (studentId: string, courseId: string) =>
  store.detailedGrades.find((d) => d.studentId === studentId && d.courseId === courseId)

const stats = computed(() => {
  let courseGrades = selectedCourse.value === 'all'
    ? store.grades.filter((g) => myCourseIds.value.includes(g.courseId))
    : store.grades.filter((g) => g.courseId === selectedCourse.value)

  // 按学期过滤
  if (selectedSemester.value !== 'all') {
    const sem = SEMESTERS[parseInt(selectedSemester.value)]
    if (sem && sem.start) {
      courseGrades = courseGrades.filter((g) => g.gradedAt >= sem.start && g.gradedAt <= sem.end)
    }
  }

  const scoresList = courseGrades.map((g) => g.score)
  const avg = scoresList.length > 0 ? Math.round(scoresList.reduce((a, b) => a + b, 0) / scoresList.length) : null
  const max = scoresList.length > 0 ? Math.max(...scoresList) : null
  const min = scoresList.length > 0 ? Math.min(...scoresList) : null
  const passed = courseGrades.filter((g) => g.score >= PASS_THRESHOLD).length
  const passRate = scoresList.length > 0 ? Math.round((passed / scoresList.length) * 100) : null
  const totalGraded = scoresList.length
  const totalStudents = selectedCourse.value === 'all'
    ? store.enrollments.filter((e) => myCourseIds.value.includes(e.courseId) && e.status !== 'dropped').length
    : store.enrollments.filter((e) => e.courseId === selectedCourse.value && e.status !== 'dropped').length

  return { avg, max, min, passRate, totalGraded, totalStudents, scoresList }
})

const distribution = computed(() => {
  return GRADE_COLORS.map((g) => {
    const count = stats.value.scoresList.filter((s) => s >= g.range[0] && s <= g.range[1]).length
    const pct = stats.value.scoresList.length > 0 ? Math.round((count / stats.value.scoresList.length) * 100) : 0
    return { ...g, count, pct }
  })
})

const selectedCourseTitle = computed(() => selectedCourse.value === 'all' ? '全部课程' : getCourseTitle(selectedCourse.value))

const currentCfg = computed(() => selectedCourse.value !== 'all' ? store.getGradeConfig(selectedCourse.value) : null)

const knowledgePoints = computed(() => {
  if (selectedCourse.value === 'all') return []
  const courseGrades = store.grades.filter(g => g.courseId === selectedCourse.value)
  const sortedScores = courseGrades.map(g => g.score).sort((a, b) => a - b)
  const getMastery = (idx: number) => {
    if (sortedScores.length === 0) return 60
    const p = Math.floor((idx / 4) * (sortedScores.length - 1))
    return Math.min(100, Math.max(20, sortedScores[p]))
  }
  const labels = ['基础概念', '核心算法', '应用实践', '项目开发', '前沿探索']
  return labels.map((label, i) => {
    const mastery = getMastery(i)
    const color = mastery >= 85 ? 'bg-brand-600' : mastery >= 70 ? 'bg-brand-600' : mastery >= 60 ? 'bg-brand-600' : 'bg-brand-600'
    return { label, mastery, color }
  })
})

// ====== Detail target helpers ======
const detailTargetDetail = computed(() => {
  if (!detailTarget.value) return null
  // 课程未开课时不展示评价成绩详情
  if (!store.isFirstClassStarted(detailTarget.value.courseId)) return null
  return store.detailedGrades.find((d) => d.studentId === detailTarget.value!.studentId && d.courseId === detailTarget.value!.courseId) || null
})

const detailTargetCfg = computed(() => {
  if (!detailTarget.value) return null
  return store.getGradeConfig(detailTarget.value!.courseId)
})

const detailTargetTotalScore = computed(() => {
  if (!detailTarget.value) return 0
  const base = store.grades.find((g) => g.studentId === detailTarget.value!.studentId && g.courseId === detailTarget.value!.courseId)?.score ?? 0
  return Math.min(100, base + getQualityBonus(detailTarget.value.courseId, detailTarget.value.studentId))
})

const detailTargetExamScores = computed(() => {
  if (!detailTarget.value) return []
  return store.examScores.filter((s) => s.studentId === detailTarget.value!.studentId && s.courseId === detailTarget.value!.courseId)
})

// ====== Functions ======

/** 获取学生该课程的总分 */
function getStudentTotal(enr: Enrollment): number | null {
  // 课程未开课时不展示成绩
  if (!store.isFirstClassStarted(enr.courseId)) return null
  const g = store.grades.find((g) => g.studentId === enr.studentId && g.courseId === enr.courseId)
  if (g?.score == null) return null
  return Math.min(100, g.score + getQualityBonus(enr.courseId, enr.studentId))
}

/** 素质评价按课程配置计入总成绩：有权重时按占比，否则按加成上限封顶 */
function getQualityBonus(courseId: string, studentId: string): number {
  return store.getStudentQualityScore(courseId, studentId)
}

function getQualitySummary(cfg: { qualityEvalWeight?: number; qualityEvalMaxBonus?: number }): string {
  if ((cfg.qualityEvalWeight ?? 0) > 0) {
    return ` + 素质评价 ${cfg.qualityEvalWeight ?? 0}%`
  }
  return `；素质加成上限 ${cfg.qualityEvalMaxBonus ?? 10} 分`
}

/** 获取评阅时间 */
function getGradedAt(enr: Enrollment): string {
  const g = store.grades.find((g) => g.studentId === enr.studentId && g.courseId === enr.courseId)
  return g?.gradedAt || ''
}

const getGradeLevel = (score: number) => {
  const level = GRADE_COLORS.find((g) => score >= g.range[0] && score <= g.range[1])
  return level || GRADE_COLORS[GRADE_COLORS.length - 1]
}

const getTotalColorClass = (total: number) => {
  if (total >= 90) return 'text-emerald-600'
  if (total >= 80) return 'text-blue-600'
  if (total >= 70) return 'text-brand-700'
  if (total >= 60) return 'text-brand-700'
  return 'text-red-500'
}

const openDetail = (enr: Enrollment) => {
  detailTarget.value = {
    studentName: getStudentName(enr.studentId),
    courseTitle: getCourseTitle(enr.courseId),
    courseId: enr.courseId,
    studentId: enr.studentId,
  }
}

/** 按班级+分组组织成绩数据（用于具体课程视图） */
const gradeClassBlocks = computed(() => {
  if (selectedCourse.value === 'all') return []
  const cId = selectedCourse.value
  let enrolled = filteredEnrollments.value.filter(e => e.courseId === cId)

  // 按姓名搜索过滤
  const search = gradeSearch.value.trim().toLowerCase()
  if (search) {
    enrolled = enrolled.filter(e => {
      const student = store.students.find(s => s.id === e.studentId)
      return student && (student.name.toLowerCase().includes(search) || student.id.toLowerCase().includes(search) || (student.studentId && student.studentId.toLowerCase().includes(search)))
    })
  }

  // 按班级分组
  const classMap = new Map<string, Enrollment[]>()
  for (const enr of enrolled) {
    const student = store.students.find(s => s.id === enr.studentId)
    const cn = student?.className || '未分班'
    if (!classMap.has(cn)) classMap.set(cn, [])
    classMap.get(cn)!.push(enr)
  }

  // 按分组组织
  const result: { className: string; groups: { groupName: string; items: Enrollment[] }[] }[] = []
  const groups = store.studentGroups.filter(g => g.courseId === cId)

  for (const [className, items] of classMap) {
    const memberToGroup = new Map<string, string>()
    for (const g of groups) {
      for (const mid of g.memberIds) {
        const student = store.students.find(s => s.id === mid)
        if (student && (student.className || '未分班') === className) {
          memberToGroup.set(mid, g.name)
        }
      }
    }

    const groupedMap = new Map<string, Enrollment[]>()
    const ungrouped: Enrollment[] = []
    for (const enr of items) {
      const groupName = memberToGroup.get(enr.studentId)
      if (groupName) {
        if (!groupedMap.has(groupName)) groupedMap.set(groupName, [])
        groupedMap.get(groupName)!.push(enr)
      } else {
        ungrouped.push(enr)
      }
    }

    const groupsArr: { groupName: string; items: Enrollment[] }[] = []
    for (const [name, members] of groupedMap) {
      groupsArr.push({ groupName: name, items: members })
    }
    if (ungrouped.length > 0) {
      groupsArr.push({ groupName: '未分组', items: ungrouped })
    }

    result.push({ className, groups: groupsArr })
  }
  return result
})

const gradeClassOptions = computed(() => {
  return [...new Set(gradeClassBlocks.value.map(b => b.className))]
})

const gradeGroupOptions = computed(() => {
  const block = gradeClassBlocks.value.find(b => b.className === gradeFilterClass.value)
  return block ? block.groups.map(g => g.groupName) : []
})

const filteredGradeClassBlocks = computed(() => {
  let blocks = gradeClassBlocks.value
  if (gradeFilterClass.value) {
    blocks = blocks.filter(b => b.className === gradeFilterClass.value)
  }
  if (gradeFilterGroup.value) {
    blocks = blocks.map(b => ({
      ...b,
      groups: b.groups.filter(g => g.groupName === gradeFilterGroup.value)
    })).filter(b => b.groups.length > 0)
  }
  return blocks
})

watch(gradeFilterClass, () => { gradeFilterGroup.value = '' })

const currentGradeClassSection = computed(() => {
  if (!selectedGradeClass.value) return null
  return filteredGradeClassBlocks.value.find(cb => cb.className === selectedGradeClass.value) || null
})

function closeGradePopup() {
  showGradePopup.value = false
  selectedGradeClass.value = ''
}

/** 按课程分组获取班级+分组数据（用于全部课程视图） */
function getCourseEnrollmentsGrouped(courseId: string): { groupName: string; items: Enrollment[] }[] {
  const enrolled = filteredEnrollments.value.filter(e => e.courseId === courseId)

  // 按班级分组
  const classMap = new Map<string, Enrollment[]>()
  for (const enr of enrolled) {
    const student = store.students.find(s => s.id === enr.studentId)
    const cn = student?.className || '未分班'
    if (!classMap.has(cn)) classMap.set(cn, [])
    classMap.get(cn)!.push(enr)
  }

  // 按分组 + 班级前缀组织
  const groups = store.studentGroups.filter(g => g.courseId === courseId)
  const result: { groupName: string; items: Enrollment[] }[] = []

  for (const [className, items] of classMap) {
    const memberToGroup = new Map<string, string>()
    for (const g of groups) {
      for (const mid of g.memberIds) {
        const student = store.students.find(s => s.id === mid)
        if (student && (student.className || '未分班') === className) {
          memberToGroup.set(mid, g.name)
        }
      }
    }

    const groupedMap = new Map<string, Enrollment[]>()
    const ungrouped: Enrollment[] = []
    for (const enr of items) {
      const groupName = memberToGroup.get(enr.studentId)
      if (groupName) {
        if (!groupedMap.has(groupName)) groupedMap.set(groupName, [])
        groupedMap.get(groupName)!.push(enr)
      } else {
        ungrouped.push(enr)
      }
    }

    // 添加班级分组头
    result.push({ groupName: `班级 ${className}`, items: [] })
    for (const [name, members] of groupedMap) {
      result.push({ groupName: `  ${name}`, items: members })
    }
    if (ungrouped.length > 0) {
      result.push({ groupName: '  未分组', items: ungrouped })
    }
  }
  return result
}

/** 导出 Excel */
async function handleExportGrades() {
  try {
    const XLSX = await import('xlsx')
    const data = filteredEnrollments.value.map((enr) => {
      const total = getStudentTotal(enr)
      return {
        '学生姓名': getStudentName(enr.studentId),
        '课程': getCourseTitle(enr.courseId),
        '总分': total ?? '-',
        '等级': total !== null ? getGradeLevel(total).label : '-',
        '评阅时间': getGradedAt(enr) || '-',
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '成绩')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `成绩查询-${selectedCourseTitle.value}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('导出失败:', err)
    alert('导出失败')
  }
}

/**
 * 【导出成绩功能业务逻辑说明】
 * 点击按钮后向后端发起请求，后端将课程学生成绩数据整理，提供文件下载；
 * 后续支持对接学校教务系统接口，可将成绩数据推送同步至第三方教务平台。
 */
async function handleExportGradesToSystem() {
  if (isExporting.value) return
  isExporting.value = true

  // 模拟接口请求延迟 1s
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 模拟下载效果
  const blob = new Blob(['模拟成绩导出文件'], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `成绩导出-${selectedCourseTitle.value}-${getNow().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)

  isExporting.value = false

  // 显示成功通知
  showExportToast.value = true
  if (exportToastTimer) clearTimeout(exportToastTimer)
  exportToastTimer = setTimeout(() => {
    showExportToast.value = false
  }, 4000)
}
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}
.toast-leave-active {
  transition: all 0.25s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
