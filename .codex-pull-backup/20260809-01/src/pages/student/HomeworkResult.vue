<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="space-y-1">
        <button
          class="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          @click="goBack"
        >
          <ArrowLeft class="h-4 w-4" />
          返回作业列表
        </button>
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">批改结果</h1>
          <p class="text-sm text-gray-500">
            {{ homeworkTitle }}
            <span v-if="chapterTitle"> · {{ chapterTitle }}</span>
          </p>
        </div>
      </div>

      <div v-if="result" class="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <div class="text-right">
          <p class="text-xs text-gray-400">总分</p>
          <p class="text-3xl font-bold" :class="scoreColor(result.totalScore || 0)">
            {{ result.totalScore || 0 }}
            <span class="text-base font-medium text-gray-400">/ {{ result.maxScore || 100 }}</span>
          </p>
          <p class="text-xs text-gray-400">正确 {{ correctCount }}/{{ result.questions?.length || 0 }} 题</p>
        </div>
      </div>
    </div>

    <div v-if="loading" class="rounded-2xl border border-blue-100 bg-blue-50/70 p-8 text-center">
      <LoaderCircle class="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
      <p class="text-sm font-medium text-blue-700">正在加载批改结果</p>
      <p class="mt-1 text-xs text-blue-500">页面会在结果就绪后自动显示</p>
    </div>

    <div
      v-else-if="waitingForGrading"
      class="rounded-2xl border border-amber-100 bg-amber-50/80 p-8 text-center"
    >
      <LoaderCircle class="mx-auto mb-3 h-8 w-8 animate-spin text-amber-500" />
      <p class="text-sm font-medium text-amber-700">AI 正在批改这份作业</p>
      <p class="mt-1 text-xs text-amber-600">结果页已打开，批改完成后会自动刷新</p>
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded-2xl border border-red-100 bg-red-50/80 p-8 text-center"
    >
      <AlertCircle class="mx-auto mb-3 h-8 w-8 text-red-500" />
      <p class="text-sm font-medium text-red-700">{{ errorMessage }}</p>
      <div class="mt-4 flex justify-center gap-3">
        <button
          class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          @click="loadResult(true)"
        >
          重新加载
        </button>
        <button
          class="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          @click="goBack"
        >
          返回作业列表
        </button>
      </div>
    </div>

    <template v-else-if="result">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p class="text-xs text-gray-400">得分率</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{{ scoreRate }}%</p>
        </div>
        <div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p class="text-xs text-gray-400">提交时间</p>
          <p class="mt-2 text-sm font-medium text-gray-900">{{ result.submittedAt || '--' }}</p>
        </div>
        <div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p class="text-xs text-gray-400">状态</p>
          <p class="mt-2 text-sm font-medium text-emerald-600">已完成批改</p>
        </div>
      </div>

      <div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-medium text-gray-900">答题情况</p>
          <p class="text-xs text-gray-400">绿色为正确，红色为错误</p>
        </div>
        <div class="flex gap-1">
          <div
            v-for="(q, i) in result.questions || []"
            :key="q.id || i"
            :title="`第${i + 1}题 ${q.isCorrect ? '正确' : '错误'}`"
            class="h-2 flex-1 rounded-full"
            :class="q.isCorrect ? 'bg-emerald-400' : 'bg-red-400'"
          />
        </div>
      </div>

      <div class="space-y-4">
        <div
          v-for="(q, i) in result.questions || []"
          :key="q.id"
          class="rounded-2xl border p-5 shadow-sm"
          :class="q.isCorrect ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'"
        >
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="questionTypeClass(q.questionType)">
                {{ questionTypeLabel(q.questionType) }}
              </span>
              <span class="text-xs text-gray-500">{{ q.score }}分</span>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
            >
              {{ q.isCorrect ? '正确' : '错误' }} · 得{{ q.studentScore }}分
            </span>
          </div>

          <p class="mb-3 text-sm font-medium text-gray-900">{{ i + 1 }}. {{ q.questionText }}</p>

          <div v-if="q.options?.length" class="mb-3 grid gap-2 sm:grid-cols-2">
            <div
              v-for="(opt, oi) in q.options"
              :key="oi"
              class="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm text-gray-700"
            >
              {{ 'ABCD'[oi] }}. {{ opt }}
            </div>
          </div>

          <div class="space-y-2 text-sm">
            <p class="text-gray-600">
              你的答案：
              <span :class="q.isCorrect ? 'text-emerald-600' : 'text-red-600'">
                {{ q.studentAnswer || '(未作答)' }}
              </span>
            </p>
            <p class="text-gray-600">
              正确答案：
              <span class="text-emerald-600">{{ q.answer || '--' }}</span>
            </p>
            <div
              v-if="q.aiFeedback"
              class="rounded-xl border border-gray-100 bg-white p-3 text-xs leading-6 text-gray-500"
            >
              {{ q.aiFeedback }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertCircle, ArrowLeft, LoaderCircle } from 'lucide-vue-next'
import { API_BASE } from '@/api'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const courseId = computed(() => String(route.params.courseId || ''))
const homeworkId = computed(() => String(route.params.homeworkId || ''))
const homeworkTitle = computed(() => String(route.query.title || '作业结果'))
const chapterTitle = computed(() => String(route.query.chapterTitle || ''))

const loading = ref(true)
const waitingForGrading = ref(false)
const errorMessage = ref('')
const result = ref<any>(null)

let pollTimer: number | null = null
let pollCount = 0

const studentId = computed(() => {
  const queryStudentId = String(route.query.studentId || '')
  if (queryStudentId) return queryStudentId

  try {
    const info = JSON.parse(localStorage.getItem('userInfo') || '{}')
    if (info.student_id) return info.student_id
  } catch {
    // ignore
  }

  const student = store.students.find((item) => item.name === store.currentUser)
  return student?.id || ''
})

const correctCount = computed(() =>
  result.value?.questions?.filter((q: any) => q.isCorrect).length || 0,
)

const scoreRate = computed(() => {
  const totalScore = Number(result.value?.totalScore || 0)
  const maxScore = Number(result.value?.maxScore || 0)
  if (!maxScore) return 0
  return Math.round((totalScore / maxScore) * 100)
})

onMounted(() => {
  void loadResult(true)
})

onBeforeUnmount(() => {
  clearPollTimer()
})

async function loadResult(showSkeleton = false) {
  if (!studentId.value || !homeworkId.value) {
    loading.value = false
    errorMessage.value = '缺少学生或作业信息，无法加载批改结果'
    return
  }

  if (showSkeleton) {
    loading.value = true
  }

  errorMessage.value = ''

  try {
    const res = await fetch(`${API_BASE}/homeworks/${homeworkId.value}/result/${studentId.value}`)
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || '加载批改结果失败')
    }

    result.value = data.result

    if (data.result?.status === 'graded') {
      waitingForGrading.value = false
      loading.value = false
      clearPollTimer()
      return
    }

    waitingForGrading.value = true
    loading.value = false
    schedulePoll()
  } catch (e: any) {
    loading.value = false
    waitingForGrading.value = false
    errorMessage.value = e.message || '加载批改结果失败'
    clearPollTimer()
  }
}

function schedulePoll() {
  clearPollTimer()

  if (pollCount >= 10) {
    waitingForGrading.value = false
    errorMessage.value = '批改结果还没有准备好，请稍后重新打开'
    return
  }

  pollCount += 1
  pollTimer = window.setTimeout(() => {
    void loadResult(false)
  }, 1200)
}

function clearPollTimer() {
  if (pollTimer !== null) {
    window.clearTimeout(pollTimer)
    pollTimer = null
  }
}

function goBack() {
  void router.push({
    name: 'StudentCourseLearn',
    params: { id: courseId.value },
    query: { tab: 'homework' },
  })
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function questionTypeLabel(type: string) {
  const map: Record<string, string> = {
    choice: '选择题',
    true_false: '判断题',
    fill: '填空题',
    short_answer: '简答题',
  }
  return map[type] || type
}

function questionTypeClass(type: string) {
  const map: Record<string, string> = {
    choice: 'bg-blue-50 text-blue-600',
    true_false: 'bg-purple-50 text-purple-600',
    fill: 'bg-amber-50 text-amber-600',
    short_answer: 'bg-emerald-50 text-emerald-600',
  }
  return map[type] || 'bg-gray-50 text-gray-600'
}
</script>
