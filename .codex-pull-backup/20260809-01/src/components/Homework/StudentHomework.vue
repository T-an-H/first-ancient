<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-800">课程作业</h3>
      <span class="text-xs text-gray-400">{{ submittedCount }}/{{ homeworks.length }} 已提交</span>
    </div>

    <div v-if="!answeringHomework" class="space-y-3">
      <div
        v-for="hw in homeworks"
        :key="hw.id"
        class="rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900">{{ hw.title }}</p>
            <p v-if="hw.chapterTitle" class="mt-0.5 text-xs text-gray-400">{{ hw.chapterTitle }}</p>
            <p v-if="hw.description" class="mt-1 text-xs text-gray-500">{{ hw.description }}</p>
          </div>
          <div class="ml-3 flex flex-shrink-0 items-center gap-2">
            <span
              v-if="!hw.submission"
              class="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600"
            >
              未提交
            </span>
            <span
              v-else-if="hw.submission.status === 'graded'"
              class="rounded-full px-2 py-1 text-xs font-medium"
              :class="getScoreClass(hw.submission.totalScore)"
            >
              {{ hw.submission.totalScore }}分
            </span>
            <span
              v-else-if="hw.submission.status === 'submitted'"
              class="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600"
            >
              待重试
            </span>
            <span
              v-else
              class="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600"
            >
              批改中
            </span>
          </div>
        </div>

        <div class="mt-3 flex items-center gap-3">
          <button
            v-if="!hw.submission"
            class="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            @click="startAnswer(hw)"
          >
            开始作答
          </button>
          <button
            v-else-if="hw.submission.status === 'graded'"
            class="rounded-lg bg-emerald-50 px-4 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-100"
            @click="openResultPage(hw)"
          >
            查看结果
          </button>
          <button
            v-else-if="hw.submission.status === 'submitted'"
            class="rounded-lg bg-rose-50 px-4 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-100"
            @click="retryAnswer(hw)"
          >
            重新提交
          </button>
          <button
            v-else
            disabled
            class="cursor-not-allowed rounded-lg bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-400"
          >
            批改中...
          </button>
        </div>
      </div>

      <div v-if="homeworks.length === 0" class="py-8 text-center text-gray-400">
        <BookOpen class="mx-auto mb-2 h-10 w-10 text-gray-200" />
        <p class="text-sm">暂无作业</p>
      </div>
    </div>

    <div v-if="answeringHomework" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-gray-900">{{ answeringHomework.title }}</h4>
          <p v-if="answeringHomework.chapterTitle" class="text-xs text-gray-400">
            {{ answeringHomework.chapterTitle }}
          </p>
        </div>
        <button
          class="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          @click="cancelAnswer"
        >
          返回列表
        </button>
      </div>

      <div
        v-for="(q, i) in questions"
        :key="q.id"
        class="space-y-3 rounded-xl border border-gray-200 p-4"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="questionTypeClass(q.questionType)">
              {{ questionTypeLabel(q.questionType) }}
            </span>
            <span class="text-xs text-gray-400">{{ q.score }}分</span>
          </div>
          <span v-if="answers[q.id]?.trim()" class="text-xs text-emerald-500">已作答</span>
        </div>

        <p class="text-sm text-gray-900">{{ i + 1 }}. {{ q.questionText }}</p>

        <div v-if="q.questionType === 'choice'" class="space-y-2 pl-2">
          <label
            v-for="(opt, oi) in q.options"
            :key="oi"
            :class="[
              'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all',
              answers[q.id] === opt
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
            ]"
          >
            <input
              :name="'q-' + q.id"
              :checked="answers[q.id] === opt"
              :value="opt"
              type="radio"
              class="text-blue-600 focus:ring-blue-500"
              @change="answers[q.id] = opt"
            />
            <span class="text-sm text-gray-700">{{ 'ABCD'[oi] }}. {{ opt }}</span>
          </label>
        </div>

        <div v-if="q.questionType === 'true_false'" class="flex gap-4 pl-2">
          <label
            :class="[
              'flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 transition-all',
              answers[q.id] === '对'
                ? 'border-green-300 bg-green-50'
                : 'border-gray-100 hover:border-gray-200',
            ]"
          >
            <input
              :name="'q-' + q.id"
              :checked="answers[q.id] === '对'"
              value="对"
              type="radio"
              class="text-green-600 focus:ring-green-500"
              @change="answers[q.id] = '对'"
            />
            <span class="text-sm">对</span>
          </label>
          <label
            :class="[
              'flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 transition-all',
              answers[q.id] === '错'
                ? 'border-red-300 bg-red-50'
                : 'border-gray-100 hover:border-gray-200',
            ]"
          >
            <input
              :name="'q-' + q.id"
              :checked="answers[q.id] === '错'"
              value="错"
              type="radio"
              class="text-red-600 focus:ring-red-500"
              @change="answers[q.id] = '错'"
            />
            <span class="text-sm">错</span>
          </label>
        </div>

        <div v-if="q.questionType === 'fill'" class="pl-2">
          <input
            v-model="answers[q.id]"
            placeholder="请输入答案"
            class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div v-if="q.questionType === 'short_answer'" class="pl-2">
          <textarea
            v-model="answers[q.id]"
            rows="3"
            placeholder="请输入你的回答"
            class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <button
          :disabled="submitting || !allAnswered"
          class="flex-1 rounded-xl bg-blue-600 py-3 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="submitAnswers"
        >
          {{ submitting ? '提交批改中...' : '提交作业' }}
        </button>
        <p v-if="!allAnswered" class="text-xs text-amber-500">
          还有 {{ unansweredCount }} 题未作答
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpen } from 'lucide-vue-next'
import { API_BASE } from '@/api'

const props = defineProps<{ courseId: string; studentId: string; tier?: string }>()

const router = useRouter()
const API = `${API_BASE}/homeworks`

const homeworks = ref<any[]>([])
const answeringHomework = ref<any>(null)
const questions = ref<any[]>([])
const answers = ref<Record<string, string>>({})
const submitting = ref(false)
const studentTier = ref('')

onMounted(async () => {
  await fetchStudentTier()
  await loadHomeworks()
})

watch(
  () => [props.courseId, props.studentId, props.tier],
  async () => {
    await fetchStudentTier()
    await loadHomeworks()
  },
)

const submittedCount = computed(() =>
  homeworks.value.filter((h) => h.submission?.status === 'graded').length,
)

const allAnswered = computed(() =>
  questions.value.every((q) => answers.value[q.id]?.trim()),
)

const unansweredCount = computed(() =>
  questions.value.filter((q) => !answers.value[q.id]?.trim()).length,
)

async function fetchStudentTier() {
  if (!props.studentId) return

  try {
    const res = await fetch(`${API_BASE}/tier-test/${props.courseId}/result/${props.studentId}`)
    const data = await res.json()
    if (data.success && data.result) {
      studentTier.value = data.result.tier
    }
  } catch {
    studentTier.value = props.tier || ''
  }
}

async function loadHomeworks() {
  try {
    const tier = studentTier.value || props.tier || ''
    const tierParam = tier ? `&tier=${tier}` : ''
    const res = await fetch(`${API}/student/${props.courseId}?studentId=${props.studentId}${tierParam}`)
    const data = await res.json()
    if (data.success) {
      homeworks.value = data.homeworks
    }
  } catch (e) {
    console.error('加载作业列表失败:', e)
  }
}

async function startAnswer(hw: any) {
  try {
    const res = await fetch(`${API}/student/view/${hw.id}`)
    const data = await res.json()
    if (data.success) {
      answeringHomework.value = data.homework
      questions.value = data.homework.questions
      answers.value = {}
    }
  } catch (e) {
    console.error('加载作业题目失败:', e)
  }
}

function retryAnswer(hw: any) {
  void startAnswer(hw)
}

function cancelAnswer() {
  answeringHomework.value = null
  questions.value = []
  answers.value = {}
}

async function submitAnswers() {
  if (!allAnswered.value || !answeringHomework.value) return

  submitting.value = true

  try {
    const currentHomework = answeringHomework.value
    const answerList = Object.entries(answers.value).map(([questionId, answerText]) => ({
      questionId,
      answerText,
    }))

    const res = await fetch(`${API}/${currentHomework.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: props.studentId, answers: answerList }),
    })
    const data = await res.json()

    if (!data.success) {
      await loadHomeworks()
      alert('提交失败：' + data.message)
      return
    }

    cancelAnswer()
    await router.push({
      name: 'StudentHomeworkResult',
      params: {
        courseId: props.courseId,
        homeworkId: currentHomework.id,
      },
      query: {
        title: currentHomework.title || '',
        chapterTitle: currentHomework.chapterTitle || '',
        studentId: props.studentId,
        source: 'submit',
      },
    })
  } catch (e: any) {
    await loadHomeworks()
    alert('提交失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

function openResultPage(hw: any) {
  void router.push({
    name: 'StudentHomeworkResult',
    params: {
      courseId: props.courseId,
      homeworkId: hw.id,
    },
    query: {
      title: hw.title || '',
      chapterTitle: hw.chapterTitle || '',
      studentId: props.studentId,
      source: 'list',
    },
  })
}

function getScoreClass(score: number) {
  if (score >= 80) return 'bg-emerald-50 text-emerald-600'
  if (score >= 60) return 'bg-amber-50 text-amber-600'
  return 'bg-red-50 text-red-600'
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
