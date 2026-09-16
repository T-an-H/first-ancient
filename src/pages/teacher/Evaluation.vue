<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">评价管理</h1>
        <p class="text-sm text-gray-400 mt-1">管理课程评价方案，一键批量评价</p>
      </div>
    </div>

    <!-- 课程选择 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <button
        v-for="course in myCourses" :key="course.id"
        @click="selectedCourse = course.id; evalTypeFilter = 'all'; showSettings = false"
        :class="`text-left p-4 rounded-xl border-2 transition-all ${selectedCourse === course.id ? 'border-brand-400 bg-brand-400/10' : 'border-brand-400/20 bg-white hover:border-brand-400'}`"
      >
        <div class="flex items-center gap-2 mb-1">
          <BookOpen class="w-4 h-4 text-gray-400" />
          <span class="font-medium text-gray-900">{{ course.title }}</span>
        </div>
        <p class="text-xs text-gray-400">{{ course.teacher }} · {{ course.duration }}课时</p>
        <div class="flex gap-1 mt-1 flex-wrap">
          <span class="text-xs px-2 py-0.5 rounded-full bg-brand-400/10 text-brand-600 border border-brand-400">
            {{ getCourseConfig(course.id) ? EvalTemplateLabels[getCourseConfig(course.id).template] : '未配置' }}
          </span>
          <span v-if="getCourseConfig(course.id)" class="text-xs px-2 py-0.5 rounded-full bg-brand-400/10 text-brand-600 border border-brand-400">
            {{ EvalFrequencyLabels[getCourseConfig(course.id).frequency] }} ({{ store.getEvalSessions(course.id) }}次)
          </span>
        </div>
      </button>
    </div>

    <template v-if="selectedCourse && selectedCourseData">
      <div class="space-y-6">
        <!-- 评价方案设置（折叠式） -->
        <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-5">
          <button
            @click="showSettings = !showSettings"
            class="w-full flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <Settings class="w-5 h-5 text-gray-400" />
              <h2 class="font-semibold text-gray-900">评价方案配置</h2>
            </div>
            <div class="flex items-center gap-3">
              <!-- 当前配置摘要 -->
              <span class="text-xs text-gray-400">
                {{ selectedConfig ? EvalTemplateLabels[selectedConfig.template] : '未配置' }} ·
                {{ selectedConfig ? EvalFrequencyLabels[selectedConfig.frequency] : '默认频率' }}
              </span>
              <span class="text-xs text-gray-400 hover:text-brand-600">{{ showSettings ? '收起 ▲' : '展开 ▼' }}</span>
            </div>
          </button>

          <!-- 自动隐藏信息 -->
          <div class="flex flex-wrap gap-2 mt-3 mb-1">
            <template v-for="t in ALL_EVAL_TYPES" :key="t">
              <span v-if="!selectedConfig || !TEMPLATE_EVAL_TYPES[selectedConfig.template].includes(t)"
                class="text-xs px-2.5 py-1 rounded-full bg-brand-400/10 text-gray-400/60 border border-brand-400/30">
                {{ EvalTypeLabels[t] }} ✗
              </span>
              <span v-else-if="(t === 'intra_group' || t === 'inter_group') && !courseHasGroups || t === 'mentor' && selectedConfig && !selectedConfig.hasMentor"
                class="text-xs px-2.5 py-1 rounded-full bg-brand-400/10 text-gray-400 border border-brand-400/50">
                <EyeOff class="w-3 h-3 inline mr-0.5" />
                {{ EvalTypeLabels[t] }}（自动隐藏）
              </span>
              <span v-else
                :class="`text-xs px-2.5 py-1 rounded-full border ${EvalTypeColors[t]}`">
                <Eye class="w-3 h-3 inline mr-0.5" />
                {{ EvalTypeLabels[t] }}
              </span>
            </template>
          </div>

          <template v-if="showSettings">
            <div class="border-t border-brand-400/20 mt-3 pt-4 space-y-4">
              <!-- 评价模板 -->
              <div>
                <p class="text-sm font-medium text-gray-800 mb-2">评价模板</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button
                    v-for="tpl in EVAL_TEMPLATE_KEYS" :key="tpl"
                    @click="handleSetConfig({ template: tpl })"
                    :class="`text-left p-3 rounded-lg border transition-all ${selectedConfig?.template === tpl ? 'border-brand-400 bg-brand-400/10' : 'border-brand-400/30 bg-white hover:border-brand-400'}`"
                  >
                    <span class="text-sm font-medium text-gray-900">{{ EvalTemplateLabels[tpl] }}</span>
                    <p class="text-xs text-gray-400 mt-0.5">{{ EvalTemplateDescs[tpl] }}</p>
                    <div class="flex gap-1 mt-1">
                      <span v-for="et in TEMPLATE_EVAL_TYPES[tpl]" :key="et"
                        class="text-[10px] px-1.5 py-0.5 rounded bg-brand-400/10 text-gray-400">
                        {{ EvalTypeLabels[et] }}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <!-- 评价频率 -->
              <div>
                <p class="text-sm font-medium text-gray-800 mb-2">评价频率</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button
                    v-for="freq in EVAL_FREQUENCY_KEYS" :key="freq"
                    @click="handleSetConfig({ frequency: freq })"
                    :class="`text-left p-3 rounded-lg border transition-all ${selectedConfig?.frequency === freq ? 'border-brand-400 bg-brand-400/10' : 'border-brand-400/30 bg-white hover:border-brand-400'}`"
                  >
                    <span class="text-sm font-medium text-gray-900">{{ EvalFrequencyLabels[freq] }}</span>
                    <p class="text-xs text-gray-400 mt-0.5">{{ EvalFrequencyDescs[freq] }}</p>
                    <span class="text-xs text-brand-600 mt-0.5 block">
                      共 {{ selectedCourse ? store.getEvalSessions(selectedCourse) : 0 }} 次评价
                    </span>
                  </button>
                </div>
                <div v-if="selectedConfig?.frequency === 'custom'" class="mt-2">
                  <label class="text-xs text-gray-400">自定义评价次数：</label>
                  <input type="number" min="1" max="20"
                    :value="selectedConfig?.customSessions || 3"
                    @change="(e) => handleSetConfig({ customSessions: parseInt((e.target as HTMLInputElement).value) || 3 })"
                    class="ml-2 w-16 px-2 py-1 border border-brand-400/30 rounded-lg text-sm" />
                </div>
              </div>

              <div class="flex items-center gap-3">
                <label class="text-sm font-medium text-gray-800">企业导师参与评价</label>
                <button
                  @click="handleSetConfig({ hasMentor: !selectedConfig?.hasMentor })"
                  :class="`relative w-10 h-5 rounded-full transition-colors ${selectedConfig?.hasMentor ? 'bg-brand-600' : 'bg-brand-400/10'}`"
                >
                  <span :class="`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${selectedConfig?.hasMentor ? 'left-5.5' : 'left-0.5'}`" />
                </button>
                <span class="text-xs text-gray-400">
                  {{ selectedConfig?.hasMentor ? '已启用' : '已禁用' }}——
                  {{ selectedConfig?.hasMentor ? '学生端将显示企业导师评价卡片' : '学生端自动隐藏企业导师评价' }}
                </span>
              </div>

              <div>
                <p class="text-sm font-medium text-gray-800 mb-2">逾期未评处理规则</p>
                <div class="flex gap-3">
                  <button
                    v-for="rule in OVERDUE_RULE_KEYS" :key="rule"
                    @click="handleSetConfig({ overdueRule: rule })"
                    :class="`px-4 py-2 rounded-lg border text-sm transition-all ${selectedConfig?.overdueRule === rule ? 'border-brand-400 bg-brand-400/10 text-gray-800 font-medium' : 'border-brand-400/30 bg-white text-gray-400 hover:border-brand-400'}`"
                  >
                    {{ OverdueRuleLabels[rule] }}
                  </button>
                </div>
              </div>

            </div>
          </template>
        </div>

        <!-- 异常预警 -->
        <div v-if="anomalies.length > 0" class="bg-brand-600/10 border border-brand-400 rounded-xl p-4">
          <div class="flex items-center gap-2 text-brand-600 font-medium mb-2">
            <AlertTriangle class="w-5 h-5" />
            异常预警（个人自评与其他评价差异过大）
          </div>
          <div class="space-y-1">
            <p v-for="{ session, anomaly } in anomalies" :key="anomaly.id" class="text-sm text-brand-600">{{ anomaly.warning }}</p>
          </div>
        </div>

        <!-- 一键批量评价 -->
        <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <ClipboardCheck class="w-5 h-5 text-gray-400" />
              <h2 class="font-semibold text-gray-900">一键等级批量评价</h2>
              <span class="text-xs text-gray-400">
                为所有学生第
                <select v-model.number="batchSession" class="inline border-b border-brand-400/30 bg-transparent text-center w-6">
                  <option v-for="s in totalSessions" :key="s" :value="s">{{ s }}</option>
                </select>
                次评价生成教师/导师评价
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button @click="handleProcessOverdue"
                class="text-xs flex items-center gap-1 px-3 py-1.5 bg-brand-400/10 text-brand-600 border border-brand-400 rounded-lg hover:bg-brand-600/15">
                <RefreshCw class="w-3 h-3" />
                处理逾期评价
              </button>
              <span v-if="overdueMsg" class="text-xs text-brand-600 font-medium">{{ overdueMsg }}</span>
            </div>
          </div>

          <div class="flex flex-wrap gap-4">
            <template v-for="type in enabledTypes.filter(t => t === 'teacher' || t === 'mentor')" :key="type">
              <div class="flex-1 min-w-[200px] p-3 rounded-lg border border-brand-400/20 bg-brand-400/10">
                <p class="text-sm font-medium text-gray-800 mb-2">{{ EvalTypeLabels[type] }}批量</p>
                <div class="flex flex-col gap-1.5">
                  <button
                    v-for="level in LEVEL_OPTIONS" :key="level.label"
                    @click="handleBatchEval(type, level.label)"
                    :class="`text-xs px-3 py-1.5 rounded-lg border transition-all ${level.color} hover:opacity-80`"
                  >
                    {{ level.label }} ({{ level.range[0] }}-{{ level.range[1] }}分)
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 学生评价详情 -->
        <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <Users class="w-5 h-5 text-gray-400" />
              <h2 class="font-semibold text-gray-900">学生评价详情</h2>
              <span class="text-xs text-gray-400">{{ enrolledStudents.length }}名学生 · 共{{ totalSessions }}次评价</span>
            </div>
            <select
              :value="evalTypeFilter"
              @change="evalTypeFilter = ($event.target as HTMLSelectElement).value as EvalType | 'all'"
              class="text-xs px-2 py-1 border border-brand-400/30 rounded-lg bg-white"
            >
              <option value="all">全部类型</option>
              <option v-for="t in enabledTypes" :key="t" :value="t">{{ EvalTypeLabels[t] }}</option>
            </select>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-brand-400/20">
                  <th class="text-left py-2 px-2 text-gray-400 font-medium">学生</th>
                  <th v-for="s in displaySessions" :key="s"
                    class="text-left py-2 px-2 text-gray-400 font-medium"
                    :colspan="filteredEvalTypes.length">
                    第{{ s }}次评价
                  </th>
                </tr>
                <tr class="border-b border-brand-400/20">
                  <th class="py-1 px-2"></th>
                  <template v-for="s in displaySessions" :key="s">
                    <th v-for="t in filteredEvalTypes" :key="`${s}-${t}`"
                      class="text-left py-1 px-2 text-[10px] text-gray-400 font-medium">
                      {{ EvalTypeLabels[t] }}
                    </th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <tr v-for="{ student } in enrolledStudents" :key="student!.id"
                  class="border-b border-brand-400/10 hover:bg-brand-400/10">
                  <td class="py-2 px-2 text-sm font-medium text-gray-800">{{ student!.name }}</td>
                  <template v-for="s in displaySessions" :key="s">
                    <td v-for="t in filteredEvalTypes" :key="`${student!.id}-${s}-${t}`" class="py-2 px-2">
                      <div :class="`text-xs px-2 py-1 rounded ${getScoreClass(student!.id, s, t)}`">
                        {{ getScoreDisplay(student!.id, s, t) }}
                        <AlertTriangle v-if="showAnomalyIcon(student!.id, s, t)" class="w-3 h-3 inline ml-1 text-red-400" />
                      </div>
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { batchSaveEvaluations, fetchCourseEvaluationState, fetchCourseStudents, fetchEvalConfig, fetchTeacherCourses } from '@/api'
import {
  BookOpen, Settings, Users, AlertTriangle, ClipboardCheck,
  Eye, EyeOff, RefreshCw
} from 'lucide-vue-next'
import { EvalTemplateLabels, EvalTemplateDescs, TEMPLATE_EVAL_TYPES, EvalTypeLabels, EvalTypeColors,
  EvalFrequencyLabels, EvalFrequencyDescs, OverdueRuleLabels } from '@/types'
import type { EvalTemplate, EvalType, Evaluation, EvalFrequency, OverdueRule } from '@/types'
import { getNow } from '@/lib/date'
import { makeEvalItemsForTotal } from '@/lib/evalStandards'

const store = useAppStore()

const LEVEL_OPTIONS = [
  { label: 'A (优秀)', range: [90, 100], color: 'bg-brand-600/15 text-gray-800 border-brand-400' },
  { label: 'B (良好)', range: [80, 89], color: 'bg-brand-600/15 text-gray-800 border-brand-400' },
  { label: 'C (中等)', range: [70, 79], color: 'bg-brand-600/15 text-gray-800 border-brand-400/50' },
  { label: 'D (及格)', range: [60, 69], color: 'bg-brand-600/15 text-gray-800 border-brand-400' },
]

const ALL_EVAL_TYPES: EvalType[] = ['self', 'intra_group', 'inter_group', 'teacher', 'mentor']
const EVAL_TEMPLATE_KEYS = Object.keys(EvalTemplateLabels) as EvalTemplate[]
const EVAL_FREQUENCY_KEYS = Object.keys(EvalFrequencyLabels) as EvalFrequency[]
const OVERDUE_RULE_KEYS = Object.keys(OverdueRuleLabels) as OverdueRule[]

const selectedCourse = ref<string | null>(null)
const showSettings = ref(false)
const evalTypeFilter = ref<EvalType | 'all'>('all')
const batchSession = ref(1)
const overdueMsg = ref('')

const myCourses = ref<any[]>([])
/** courseId → 评价方案（接口数据，用于课程卡片上的摘要） */
const configByCourse = ref<Record<string, any>>({})

/**
 * 当前选中课程的评价记录。
 *
 * 由 store.syncCourseEvaluationState(courseId) 从 /eval/course/:id 拉取后写入
 * store.evaluations（按 courseId 过滤出本课），是数据库里的真实记录。
 */
const courseEvaluations = computed(() =>
  selectedCourse.value
    ? store.evaluations.filter((e) => e.courseId === selectedCourse.value)
    : []
)
/** 当前选中课程的学生名单（接口数据） */
const courseStudents = ref<any[]>([])
const loadingCourse = ref(false)

/**
 * 初始化：拉取教师本人课程（接口数据，不再读 store.courses）。
 *
 * 本页此前没有任何网络请求，课程/学生/评价全从 store 取 —— 更早时 store 初值是
 * mock（假 id，与真实课程对不上），显示的是并不存在的课程与学员；store 改为空后
 * 直接进入本页就是一片空白。现在数据全部来自接口。
 */
onMounted(() => {
  void loadCourses()
})

async function loadCourses() {
  try {
    const res = await fetchTeacherCourses(store.currentUser || '')
    myCourses.value = res?.success ? res.courses || [] : []
    await loadConfigs()
  } catch (error) {
    console.error('加载教师课程失败:', error)
    myCourses.value = []
  }
}

/** 拉取每门课的评价方案（课程卡片上要显示「模板 · 频率」摘要） */
async function loadConfigs() {
  const entries = await Promise.all(
    myCourses.value.map(async (course) => {
      try {
        const res = await fetchEvalConfig(String(course.id))
        return [String(course.id), res?.config ?? null] as const
      } catch {
        return [String(course.id), null] as const
      }
    })
  )
  configByCourse.value = Object.fromEntries(entries.filter(([, config]) => config))
}

/**
 * 切换课程时加载该课的评价方案、评价记录与学员名单。
 *
 * - syncCourseEvaluationState 拉 /eval/course/:id（评价）、/eval/config/:id（方案）、分组
 * - fetchCourseStudents 拉该课学员（教师端导入的选课记录，权威源）
 */
watch(selectedCourse, async (courseId) => {
  courseStudents.value = []
  if (!courseId) return

  loadingCourse.value = true
  try {
    const [studentsRes] = await Promise.allSettled([
      fetchCourseStudents(courseId),
      store.syncCourseEvaluationState(courseId),
    ])
    courseStudents.value =
      studentsRes.status === 'fulfilled' && studentsRes.value?.success
        ? studentsRes.value.students || []
        : []
  } catch (error) {
    console.error('加载课程评价数据失败:', error)
  } finally {
    loadingCourse.value = false
  }
})

const selectedCourseData = computed(() => selectedCourse.value ? myCourses.value.find((c) => c.id === selectedCourse.value) : null)
const selectedConfig = computed(() => selectedCourse.value ? store.evalConfigs.find((c) => c.courseId === selectedCourse.value) : null)
const baseEnabledTypes = computed<EvalType[]>(() => selectedConfig.value ? TEMPLATE_EVAL_TYPES[selectedConfig.value.template] : [])
const totalSessions = computed(() => selectedCourse.value ? store.getEvalSessions(selectedCourse.value) : 1)
const courseHasGroups = computed(() => selectedCourse.value ? store.hasGroups(selectedCourse.value) : false)

const enabledTypes = computed(() => baseEnabledTypes.value.filter((t) => {
  if ((t === 'intra_group' || t === 'inter_group') && !courseHasGroups.value) return false
  if (t === 'mentor' && !selectedConfig.value?.hasMentor) return false
  return true
}))

const filteredEvalTypes = computed(() => enabledTypes.value.filter((t) => evalTypeFilter.value === 'all' || t === evalTypeFilter.value))

const displaySessions = computed(() => {
  return Array.from({ length: totalSessions.value }, (_, i) => i + 1)
})

const getCourseConfig = (courseId: string) => configByCourse.value[String(courseId)] || null

const enrolledStudents = computed(() => {
  if (!selectedCourse.value) return []
  return courseStudents.value.map((student: any) => ({
    enrollmentId: `enr-${selectedCourse.value}-${student.id}`,
    student,
  }))
})

const anomalies = computed(() => {
  if (!selectedCourse.value) return []
  const results: { session: number; anomaly: import('@/types').EvalAnomaly }[] = []
  for (let s = 1; s <= totalSessions.value; s++) {
    store.detectAnomalies(selectedCourse.value, s).forEach((a) => results.push({ session: s, anomaly: a }))
  }
  return results
})

const handleSetConfig = (updates: Partial<import('@/types').EvaluationConfig>) => {
  if (!selectedCourse.value) return
  const existing = store.evalConfigs.find((c) => c.courseId === selectedCourse.value)
  const config = {
    courseId: selectedCourse.value,
    template: existing?.template || 'standard',
    frequency: existing?.frequency || 'biweekly',
    hasMentor: existing?.hasMentor ?? false,
    overdueRule: existing?.overdueRule || 'average',
    ...existing,
    ...updates,
  }
  store.setEvalConfig(config)
}

const handleBatchEval = (type: EvalType, level: string) => {
  if (!selectedCourse.value) return
  const range = LEVEL_OPTIONS.find((o) => o.label === level)?.range
  if (!range) return
  const score = Math.round((range[0] + range[1]) / 2)
  const session = batchSession.value

  enrolledStudents.value.forEach(({ student }) => {
    if (!student) return
    const existing = courseEvaluations.value.find(
      (e) => e.studentId === student.id && e.type === type && e.sessionNumber === session
    )
    const ev: Evaluation = {
      id: existing ? existing.id : `ev-batch-${Date.now()}-${student.id}-${type}`,
      courseId: selectedCourse.value,
      studentId: student.id,
      sessionNumber: session,
      type,
      score,
      // 批量档次评价没有分项输入，按总分等比拆成各项明细，
      // 以便再次打开评价界面时能回显（回显读的是 items）
      items: makeEvalItemsForTotal(type, score),
      evaluatorId: store.currentUser || 'teacher',
      evaluatorName: store.currentUser || '教师',
      comment: level,
      createdAt: getNow().toISOString().split('T')[0],
    }
    if (existing) {
      store.updateEvaluation(ev.id, { score, items: makeEvalItemsForTotal(type, score), comment: level, createdAt: ev.createdAt })
    } else {
      store.addEvaluation(ev)
    }
  })
}

const getStudentEvals = (studentId: string, sessionNumber: number, type: EvalType) => {
  return courseEvaluations.value.filter(
    (e) => e.studentId === studentId && e.sessionNumber === sessionNumber && e.type === type
  )
}

/**
 * 处理逾期未评：为「规则覆盖的轮次 × 学生 × 已启用评价类型」补一条兜底评价。
 *
 * ⚠️ 此前调 store.processSessionOverdue，它有两个问题：
 *   1. 依赖 store.courses / store.enrollments，两者为空时**静默 return**，
 *      什么都不做，界面却照样提示「已处理 N 轮次」；
 *   2. 只写 localStorage，**不落库**，刷新即丢。
 * 现在直接由本页的接口数据算出待补评价，经 /eval/batch 写入数据库
 * （该接口写完后会回填成绩明细），并按真实写入条数给出提示。
 */
const handleProcessOverdue = async () => {
  if (!selectedCourse.value) return
  const course = selectedCourseData.value
  const config = selectedConfig.value
  if (!course || !config || config.overdueRule === 'none') {
    overdueMsg.value = '该课程未配置逾期处理规则'
    setTimeout(() => { overdueMsg.value = '' }, 3000)
    return
  }

  const scoreByRule: Record<string, number> = { average: 60, zero: 0, full: 100 }
  const commentByRule: Record<string, string> = {
    average: '逾期未评，默认60分',
    zero: '逾期未评，记0分',
    full: '逾期未评，记满分',
  }
  const score = scoreByRule[config.overdueRule]
  const comment = commentByRule[config.overdueRule]
  if (score === undefined) {
    overdueMsg.value = '未知的逾期处理规则'
    setTimeout(() => { overdueMsg.value = '' }, 3000)
    return
  }

  const pending: Evaluation[] = []
  for (let s = 1; s <= totalSessions.value; s++) {
    if (store.isSessionLocked(selectedCourse.value, s)) continue
    for (const { student } of enrolledStudents.value) {
      if (!student) continue
      for (const type of enabledTypes.value) {
        const exists = courseEvaluations.value.some(
          (e) => e.studentId === student.id && e.sessionNumber === s && e.type === type
        )
        if (exists) continue

        const targetIsTeacher = type === 'teacher' || type === 'mentor'
        pending.push({
          id: `auto-${selectedCourse.value}-${student.id}-${s}-${type}-${Date.now()}`,
          courseId: selectedCourse.value,
          studentId: student.id,
          sessionNumber: s,
          type,
          score,
          items: makeEvalItemsForTotal(type, score),
          evaluatorId: targetIsTeacher ? course.teacher : student.id,
          evaluatorName: targetIsTeacher ? course.teacher : student.name || '',
          comment,
          createdAt: getNow().toISOString().split('T')[0],
        })
      }
    }
  }

  if (pending.length === 0) {
    overdueMsg.value = '没有待处理的逾期评价'
    setTimeout(() => { overdueMsg.value = '' }, 3000)
    return
  }

  try {
    await batchSaveEvaluations(pending)
    // 重新拉取，确保界面显示的是库里的真实记录
    await store.syncCourseEvaluationState(selectedCourse.value)
    overdueMsg.value = `已处理 ${pending.length} 条逾期评价`
  } catch (error) {
    console.error('处理逾期评价失败:', error)
    overdueMsg.value = '处理失败，请稍后重试'
  } finally {
    setTimeout(() => { overdueMsg.value = '' }, 4000)
  }
}

const getScoreClass = (studentId: string, sessionNumber: number, type: EvalType) => {
  const evals = getStudentEvals(studentId, sessionNumber, type)
  const avgScore = evals.length > 0 ? Math.round(evals.reduce((a, e) => a + e.score, 0) / evals.length) : null
  const isSelf = type === 'self'
  const otherEvals = isSelf ? courseEvaluations.value.filter(
    (e) => e.studentId === studentId && e.sessionNumber === sessionNumber && e.type !== 'self'
  ) : []
  const otherAvg = otherEvals.length > 0 ? Math.round(otherEvals.reduce((a, e) => a + e.score, 0) / otherEvals.length) : null
  const showAnomaly = isSelf && avgScore !== null && otherAvg !== null && Math.abs(avgScore - otherAvg) > 20

  if (showAnomaly) return 'bg-brand-600/10 text-brand-600'
  if (avgScore !== null) return isSelf ? 'bg-brand-600/10 text-brand-600' : 'bg-brand-400/10 text-brand-600'
  return 'text-gray-400/60'
}

const getScoreDisplay = (studentId: string, sessionNumber: number, type: EvalType) => {
  const evals = getStudentEvals(studentId, sessionNumber, type)
  const avgScore = evals.length > 0 ? Math.round(evals.reduce((a, e) => a + e.score, 0) / evals.length) : null
  return avgScore !== null ? `${avgScore}分` : '-'
}

const showAnomalyIcon = (studentId: string, sessionNumber: number, type: EvalType) => {
  if (type !== 'self') return false
  const evals = getStudentEvals(studentId, sessionNumber, type)
  const avgScore = evals.length > 0 ? Math.round(evals.reduce((a, e) => a + e.score, 0) / evals.length) : null
  const otherEvals = courseEvaluations.value.filter(
    (e) => e.studentId === studentId && e.sessionNumber === sessionNumber && e.type !== 'self'
  )
  const otherAvg = otherEvals.length > 0 ? Math.round(otherEvals.reduce((a, e) => a + e.score, 0) / otherEvals.length) : null
  return avgScore !== null && otherAvg !== null && Math.abs(avgScore - otherAvg) > 20
}
</script>
