<template>
  <div class="space-y-6">
    <!-- Toast 提示 -->
    <div v-if="toast.show"
      class="fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all"
      :class="toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'">
      {{ toast.message }}
    </div>

    <!-- 顶部 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <BookOpen class="w-5 h-5 text-gray-400" />
        <h2 class="text-lg font-semibold text-gray-900">作业管理</h2>
      </div>
      <button @click="openCreateDialog"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
        <Plus class="w-4 h-4" />
        布置新作业
      </button>
    </div>

    <!-- 章节管理 -->
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-xs text-gray-400 mr-1">章节：</span>
      <button v-for="ch in chapters" :key="ch.id"
        @click="selectedChapterId = ch.id"
        :class="`text-xs px-3 py-1.5 rounded-lg transition-colors ${selectedChapterId === ch.id ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`">
        {{ ch.title }}
        <button @click.stop="deleteChapter(ch.id, ch.title)"
          class="ml-1 p-0.5 rounded hover:bg-red-100 hover:text-red-500 text-gray-400" title="删除章节">✕</button>
      </button>
      <button @click="showAddChapter = true"
        class="text-xs px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50">
        + 添加章节
      </button>
    </div>

    <!-- 新增章节输入框 -->
    <div v-if="showAddChapter" class="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
      <input v-model="newChapterTitle" placeholder="输入章节名称（如：第1章 变量）"
        class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button @click="addChapter" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">确定</button>
      <button @click="showAddChapter = false; newChapterTitle = ''" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">取消</button>
    </div>

    <!-- 作业列表 -->
    <div class="space-y-3">
      <div v-for="hw in homeworks" :key="hw.id"
        class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="flex items-center justify-between p-4">
          <div class="flex items-center gap-3">
            <span :class="`px-2 py-0.5 text-xs rounded-full font-medium ${hw.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`">
              {{ hw.status === 'published' ? '已发布' : '草稿' }}
            </span>
            <span v-if="hw.tier"
              :class="`px-2 py-0.5 text-xs rounded-full font-medium ${tierClass(hw.tier)}`">
              {{ tierLabel(hw.tier) }}
            </span>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ hw.title }}</p>
              <p class="text-xs text-gray-400">{{ hw.chapterTitle || '全部章节' }} · {{ formatDate(hw.createdAt) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button v-if="hw.status === 'draft'" @click="publishHomework(hw.id)"
              class="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
              发布
            </button>
            <button @click="viewHomework(hw.id)"
              class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              查看
            </button>
            <button @click="confirmDelete(hw.id)"
              class="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="homeworks.length === 0" class="text-center py-12 text-gray-400">
        <BookOpen class="w-12 h-12 mx-auto mb-3 text-gray-200" />
        <p class="text-sm">暂无作业</p>
        <p class="text-xs mt-1">点击上方"布置新作业"开始</p>
      </div>
    </div>

    <!-- ===== 布置作业弹窗 ===== -->
    <div v-if="showCreateDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="closeCreateDialog">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto m-4">
        <div class="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div class="flex items-center gap-3">
            <Sparkles class="w-5 h-5 text-blue-500" />
            <h3 class="text-lg font-semibold text-gray-900">AI 布置作业</h3>
            <span class="text-xs text-gray-400 bg-blue-50 px-2 py-0.5 rounded-full">
              {{ isTieredMode ? '自动为3个层级出题' : '统一生成1套题' }}
            </span>
          </div>
          <button @click="closeCreateDialog" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-5">
          <!-- 选择章节 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">选择章节（可选）</label>
            <select v-model="createForm.chapterId"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">全部章节</option>
              <option v-for="ch in chapters" :key="ch.id" :value="ch.id">{{ ch.title }}</option>
            </select>
          </div>

          <!-- 输入要求 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              描述你要布置什么作业
              <span class="text-gray-400 font-normal">（如：出10道选择题）</span>
            </label>
            <div class="flex items-start gap-2">
              <textarea v-model="createForm.requirement" rows="3"
              placeholder="例如：出10道关于Python基础的选择题，覆盖变量、数据类型、运算符等知识点"
              class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
              <button
                type="button"
                class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                :class="isListening
                  ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                  : 'border-blue-200 bg-white text-blue-600 hover:bg-blue-50'"
                :title="isListening ? '停止语音输入' : '开始语音输入'"
                :aria-label="isListening ? '停止语音输入' : '开始语音输入'"
                :aria-pressed="isListening"
                :disabled="aiLoading"
                @click="toggleVoiceInput"
              >
                <component :is="isListening ? MicOff : Mic" class="h-4 w-4" />
              </button>
            </div>
            <p v-if="voiceError" class="mt-2 text-xs text-red-500">{{ voiceError }}</p>
          </div>

          <div class="space-y-2">
            <span class="block text-sm font-medium text-gray-700">出题方式</span>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="createForm.mode = 'tiered'"
                :class="[
                  'rounded-lg border px-4 py-3 text-left transition-colors',
                  createForm.mode === 'tiered'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                ]"
              >
                <div class="text-sm font-medium">分层三套</div>
                <div class="mt-1 text-xs text-gray-400">基础、进阶、卓越各出一套</div>
              </button>
              <button
                type="button"
                @click="createForm.mode = 'unified'"
                :class="[
                  'rounded-lg border px-4 py-3 text-left transition-colors',
                  createForm.mode === 'unified'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                ]"
              >
                <div class="text-sm font-medium">统一一套</div>
                <div class="mt-1 text-xs text-gray-400">所有学生共用同一套题目</div>
              </button>
            </div>
          </div>

          <!-- AI 出题按钮 -->
          <div v-if="!aiLoading && !generatedGroups.length" class="flex justify-center">
            <button @click="aiGenerate" :disabled="!createForm.requirement.trim()"
              class="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25">
              <Sparkles class="w-5 h-5" />
              {{ generateButtonText }}
            </button>
          </div>

          <!-- AI 加载中 -->
          <div v-if="aiLoading" class="flex flex-col items-center py-8">
            <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p class="text-sm text-gray-500">{{ generateLoadingText }}</p>
            <p class="text-xs text-gray-400 mt-1">需要 30-60 秒，请耐心等待</p>
          </div>

          <!-- 预览生成结果 -->
          <div v-if="generatedGroups.length > 0" class="space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-gray-800">{{ generatedSummaryTitle }}</h4>
              <span class="text-xs text-gray-400">{{ generatedSummaryHint }}</span>
            </div>

            <div v-for="group in generatedGroups" :key="group.tier" class="border border-gray-200 rounded-xl overflow-hidden">
              <button @click="group.expanded = !group.expanded"
                class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                <div class="flex items-center gap-2">
                  <span :class="`text-xs font-bold px-2 py-0.5 rounded-full ${tierClass(group.tier)}`">
                    {{ tierLabel(group.tier) }}
                  </span>
                  <span class="text-sm text-gray-700">{{ group.questions.length }} 道题 · 总分 {{ groupScore(group) }} 分</span>
                </div>
                <span class="text-gray-400 text-xs">{{ group.expanded ? '▲ 收起' : '▼ 展开查看' }}</span>
              </button>

              <div v-if="group.expanded" class="border-t border-gray-100 p-4 space-y-3 bg-gray-50/60">
                <div v-for="(q, i) in group.questions" :key="i" class="bg-white border border-gray-100 rounded-lg p-3 space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="text-xs px-1.5 py-0.5 rounded" :class="questionTypeClass(q.question_type)">{{ questionTypeLabel(q.question_type) }}</span>
                    <span class="text-xs text-gray-400">{{ q.score }}分</span>
                  </div>
                  <textarea v-model="q.question_text" rows="2"
                    class="w-full text-sm text-gray-900 border border-gray-100 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"></textarea>
                  <div v-if="q.question_type === 'choice'" class="pl-2 space-y-1">
                    <div v-for="(opt, oi) in q.options" :key="oi" class="flex items-center gap-1">
                      <span class="text-xs text-gray-400 w-4">{{ 'ABCD'[oi] }}.</span>
                      <input v-model="q.options[oi]" class="flex-1 text-xs border border-gray-100 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500 whitespace-nowrap">正确答案：</span>
                    <input v-model="q.answer" class="flex-1 text-xs border border-gray-100 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3 pt-2">
              <button @click="publishGeneratedHomeworks"
                class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-sm">
                {{ publishGeneratedText }}
              </button>
              <button @click="saveAsDraft"
                class="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors">
                保存草稿（稍后发布）
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 查看作业详情弹窗 ===== -->
    <div v-if="showViewDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showViewDialog = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto m-4">
        <div class="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div class="flex items-center gap-3">
            <BookOpen class="w-5 h-5 text-gray-400" />
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ viewingHomework?.title }}</h3>
              <p class="text-xs text-gray-400">
                {{ viewingHomework?.chapterTitle || '全部章节' }} ·
                {{ viewingHomework?.status === 'published' ? '已发布' : '草稿' }}
              </p>
            </div>
          </div>
          <button @click="showViewDialog = false" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div v-for="(q, i) in viewingQuestions" :key="q.id" class="border border-gray-200 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="questionTypeClass(q.questionType)">
                {{ questionTypeLabel(q.questionType) }}
              </span>
              <span class="text-xs text-gray-400">{{ q.score }}分</span>
            </div>
            <p class="text-sm text-gray-900 mb-2">{{ i + 1 }}. {{ q.questionText }}</p>
            <div v-if="q.options" class="pl-4 space-y-1 mb-2">
              <p v-for="(opt, oi) in q.options" :key="oi" class="text-xs text-gray-600">{{ 'ABCD'[oi] }}. {{ opt }}</p>
            </div>
            <div class="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">正确答案：{{ q.answer }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted } from 'vue'
import { BookOpen, Mic, MicOff, Plus, Sparkles, X, Trash2 } from 'lucide-vue-next'
import { API_BASE } from '@/api'

const props = defineProps<{ courseId: string }>()

const API = `${API_BASE}/homeworks`

// ====== 状态 ======
const chapters = ref<any[]>([])
const selectedChapterId = ref<string>('')
const showAddChapter = ref(false)
const newChapterTitle = ref('')
const homeworks = ref<any[]>([])

// Toast
const toast = ref<{ show: boolean; message: string; type: string }>({ show: false, message: '', type: 'success' })
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(message: string, type = 'success') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer = setTimeout(() => { toast.value.show = false }, 3000)
}

type GenerateMode = 'tiered' | 'unified'

// 创建作业
interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionResultListLike {
  length: number
  [index: number]: SpeechRecognitionResultLike
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

const showCreateDialog = ref(false)
const createForm = ref<{ chapterId: string; requirement: string; mode: GenerateMode }>({
  chapterId: '',
  requirement: '',
  mode: 'tiered',
})
const aiLoading = ref(false)
const generatedGroups = ref<any[]>([])
const generatedGroupId = ref<string>('')
const isTieredMode = computed(() => createForm.value.mode === 'tiered')
const generateButtonText = computed(() => (
  isTieredMode.value ? '让 AI 出题（自动生成3套）' : '让 AI 出题（统一生成1套）'
))
const generateLoadingText = computed(() => (
  isTieredMode.value ? 'AI 正在为3个层级分别出题，请稍候...' : 'AI 正在生成统一题目，请稍候...'
))
const generatedMode = computed<GenerateMode>(() => (
  generatedGroups.value.length === 1 && generatedGroups.value[0]?.tier === 'all' ? 'unified' : 'tiered'
))
const generatedSummaryTitle = computed(() => (
  generatedMode.value === 'unified' ? 'AI 已生成 1 套统一题目 ✅' : 'AI 已生成 3 套题目 ✅'
))
const generatedSummaryHint = computed(() => (
  generatedMode.value === 'unified' ? '可展开查看/编辑这套题目' : '可展开查看/编辑每套题目'
))
const publishGeneratedText = computed(() => (
  generatedMode.value === 'unified' ? '发布这套统一作业' : '发布全部3套作业'
))

// 查看作业
const isListening = ref(false)
const isVoiceSupported = ref(false)
const voiceError = ref('')
let voiceRecognition: SpeechRecognitionLike | null = null
let voiceBaseRequirement = ''
let voiceTranscript = ''
const showViewDialog = ref(false)
const viewingHomework = ref<any>(null)
const viewingQuestions = ref<any[]>([])

onMounted(() => {
  isVoiceSupported.value = Boolean(getSpeechRecognitionConstructor())
  loadChapters()
  loadHomeworks()
})

onBeforeUnmount(() => {
  voiceRecognition?.stop()
  voiceRecognition = null
})

// ====== 章节管理 ======
async function loadChapters() {
  try {
    const res = await fetch(`${API}/chapters/${props.courseId}`)
    const data = await res.json()
    if (data.success) chapters.value = data.chapters
  } catch (e) { console.error('加载章节失败:', e) }
}

async function addChapter() {
  if (!newChapterTitle.value.trim()) return
  try {
    const res = await fetch(`${API}/chapter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: props.courseId, title: newChapterTitle.value.trim() }),
    })
    const data = await res.json()
    if (data.success) {
      chapters.value.push(data.chapter)
      newChapterTitle.value = ''
      showToast('章节添加成功')
    } else {
      showToast('添加失败：' + (data.message || '未知错误'), 'error')
    }
  } catch (e: any) {
    showToast('添加失败：' + e.message, 'error')
  }
}

async function deleteChapter(id: string, title: string) {
  if (!confirm(`确认删除章节「${title}」？`)) return
  try {
    const res = await fetch(`${API}/chapter/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      chapters.value = chapters.value.filter(c => c.id !== id)
      if (selectedChapterId.value === id) selectedChapterId.value = ''
      showToast('章节已删除')
    } else {
      showToast('删除失败：' + (data.message || ''), 'error')
    }
  } catch (e: any) {
    showToast('删除失败：' + e.message, 'error')
  }
}

// ====== 作业列表 ======
async function loadHomeworks() {
  try {
    const res = await fetch(`${API}/${props.courseId}`)
    const data = await res.json()
    if (data.success) homeworks.value = data.homeworks
  } catch (e) { console.error('加载作业列表失败:', e) }
}

// ====== AI 出题 ======
async function aiGenerate() {
  if (!createForm.value.requirement.trim()) return
  aiLoading.value = true
  generatedGroups.value = []

  try {
    const chapter = chapters.value.find(c => c.id === createForm.value.chapterId)
    const res = await fetch(`${API}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: props.courseId,
        chapterId: createForm.value.chapterId || null,
        courseTitle: '当前课程',
        chapterTitle: chapter?.title || '全部章节',
        requirement: createForm.value.requirement,
        generateMode: createForm.value.mode,
      }),
    })
    const data = await res.json()
    if (data.success) {
      generatedGroupId.value = data.groupId
      // 把每套题目加上 expanded=false
      generatedGroups.value = data.homeworks.map((hw: any) => ({
        ...hw,
        expanded: data.homeworks.length === 1,
      }))
    } else {
      showToast('AI 出题失败：' + data.message, 'error')
    }
  } catch (e: any) {
    showToast('AI 出题失败：' + e.message, 'error')
  } finally {
    aiLoading.value = false
  }
}

// ====== 发布生成结果 ======
async function publishGeneratedHomeworks() {
  if (!generatedGroupId.value) return
  // 找第一套作业的 id 用来触发发布接口
  const firstHw = generatedGroups.value[0]
  if (!firstHw) return
  try {
    const shouldPublishAll = generatedGroups.value.length > 1
    const requestInit: RequestInit = { method: 'POST' }
    if (shouldPublishAll) {
      requestInit.headers = { 'Content-Type': 'application/json' }
      requestInit.body = JSON.stringify({ publishAll: true })
    }

    const res = await fetch(`${API}/${firstHw.id}/publish`, requestInit)
    const data = await res.json()
    if (data.success) {
      showToast(
        shouldPublishAll
          ? '3套作业已全部发布！学生将看到匹配自己层级的作业'
          : '统一作业已发布！所有学生将看到同一套题目',
      )
      closeCreateDialog()
      loadHomeworks()
    }
  } catch (e: any) {
    showToast('发布失败：' + e.message, 'error')
  }
}

async function saveAsDraft() {
  closeCreateDialog()
  loadHomeworks()
  showToast('已保存为草稿，可在作业列表中稍后发布')
}

function openCreateDialog() {
  showCreateDialog.value = true
  createForm.value = { chapterId: selectedChapterId.value, requirement: '', mode: 'tiered' }
  generatedGroups.value = []
  generatedGroupId.value = ''
  voiceError.value = ''
}

function closeCreateDialog() {
  if (isListening.value) {
    voiceRecognition?.stop()
  }
  showCreateDialog.value = false
  createForm.value = { chapterId: '', requirement: '', mode: 'tiered' }
  generatedGroups.value = []
  generatedGroupId.value = ''
  aiLoading.value = false
  voiceError.value = ''
}

async function publishHomework(id: string) {
  if (!confirm('确认发布此作业？发布后学生将立即看到。')) return
  try {
    const res = await fetch(`${API}/${id}/publish`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      showToast('发布成功！')
      loadHomeworks()
    }
  } catch (e: any) {
    showToast('发布失败：' + e.message, 'error')
  }
}

async function viewHomework(id: string) {
  try {
    const res = await fetch(`${API}/detail/${id}`)
    const data = await res.json()
    if (data.success) {
      viewingHomework.value = data.homework
      viewingQuestions.value = data.homework.questions
      showViewDialog.value = true
    }
  } catch (e) { console.error('查看作业失败:', e) }
}

async function confirmDelete(id: string) {
  if (!confirm('确认删除此作业？（此操作不可恢复）')) return
  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) loadHomeworks()
  } catch (e) { console.error('删除失败:', e) }
}

// ====== 工具函数 ======
function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null
}

function ensureVoiceRecognition(): SpeechRecognitionLike | null {
  if (voiceRecognition) return voiceRecognition

  const Recognition = getSpeechRecognitionConstructor()
  if (!Recognition) {
    isVoiceSupported.value = false
    return null
  }

  const recognition = new Recognition()
  recognition.lang = 'zh-CN'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 1
  recognition.onresult = (event) => {
    let transcript = ''
    for (let index = 0; index < event.results.length; index += 1) {
      transcript += event.results[index][0]?.transcript ?? ''
    }

    voiceTranscript = transcript.trim()
    createForm.value.requirement = [voiceBaseRequirement, voiceTranscript].filter(Boolean).join(' ')
  }
  recognition.onerror = (event) => {
    const errorMessages: Record<string, string> = {
      'not-allowed': '请允许浏览器使用麦克风',
      'audio-capture': '没有检测到可用的麦克风',
      'no-speech': '没有听清，请再试一次',
      network: '语音识别网络错误，请稍后重试',
    }
    voiceError.value = errorMessages[event.error] || '语音识别失败，请重试'
    isListening.value = false
  }
  recognition.onend = () => {
    isListening.value = false
  }

  voiceRecognition = recognition
  isVoiceSupported.value = true
  return recognition
}

function toggleVoiceInput() {
  if (aiLoading.value) return

  voiceError.value = ''
  const recognition = ensureVoiceRecognition()
  if (!recognition) {
    voiceError.value = '当前浏览器不支持语音识别，请使用 Chrome 或 Edge'
    return
  }

  if (isListening.value) {
    recognition.stop()
    return
  }

  voiceBaseRequirement = createForm.value.requirement.trim()
  voiceTranscript = ''

  try {
    recognition.start()
    isListening.value = true
  } catch (error: any) {
    isListening.value = false
    voiceError.value = error?.message || '语音识别启动失败，请重试'
  }
}

function groupScore(group: any) {
  return group.questions.reduce((sum: number, q: any) => sum + (Number(q.score) || 0), 0)
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function tierLabel(tier: string) {
  return { basic: '基础层', advanced: '进阶层', excellent: '卓越层', all: '统一题' }[tier] || tier
}

function tierClass(tier: string) {
  return {
    basic:    'bg-blue-50 text-blue-600',
    advanced: 'bg-amber-50 text-amber-600',
    excellent:'bg-emerald-50 text-emerald-600',
    all:      'bg-slate-100 text-slate-700',
  }[tier] || 'bg-gray-50 text-gray-600'
}

function questionTypeLabel(type: string) {
  return { choice: '选择题', true_false: '判断题', fill: '填空题', short_answer: '简答题' }[type] || type
}

function questionTypeClass(type: string) {
  return {
    choice:       'bg-blue-50 text-blue-600',
    true_false:   'bg-purple-50 text-purple-600',
    fill:         'bg-amber-50 text-amber-600',
    short_answer: 'bg-emerald-50 text-emerald-600',
  }[type] || 'bg-gray-50 text-gray-600'
}
</script>
