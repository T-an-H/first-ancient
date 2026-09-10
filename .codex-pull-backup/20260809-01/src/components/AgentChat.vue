<template>
  <div class="fixed bottom-6 right-6 z-50">
    <button
      @click="togglePanel"
      class="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
      :class="isOpen ? 'rotate-90 bg-red-400' : 'bg-brand-600'"
      :title="isOpen ? '关闭小智' : '打开小智'"
    >
      <component :is="isOpen ? X : MessageCircle" class="h-6 w-6 text-white" />
    </button>

    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-4 scale-95 opacity-0"
      enter-to-class="translate-y-0 scale-100 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 scale-100 opacity-100"
      leave-to-class="translate-y-4 scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute bottom-16 right-0 flex h-[500px] max-h-[70vh] w-80 flex-col overflow-hidden rounded-2xl border border-brand-200/60 bg-white shadow-2xl sm:w-96"
      >
        <div class="flex-shrink-0 bg-gradient-to-r from-brand-700 to-brand-600 p-4 text-white">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
              <Bot class="h-5 w-5" />
            </div>
            <div>
              <h3 class="text-sm font-semibold">小智 · 课程助手</h3>
              <p class="text-xs text-white/70">能帮你直接跳到要办的页面</p>
            </div>
          </div>
        </div>

        <div ref="messagesRef" class="flex-1 space-y-3 overflow-y-auto bg-gray-50/50 p-4">
          <div
            v-for="(msg, idx) in messages"
            :key="idx"
            class="flex"
            :class="msg.isUser ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
              :class="
                msg.isUser
                  ? 'rounded-br-md bg-brand-600 text-white'
                  : 'rounded-bl-md border border-brand-100 bg-white text-gray-700 shadow-sm'
              "
            >
              <p class="whitespace-pre-wrap">{{ msg.text }}</p>

              <div
                v-if="msg.thoughts?.length && !msg.isUser"
                class="mt-2 space-y-1 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="font-medium text-brand-600">思路摘要</p>
                  <span
                    v-if="msg.source"
                    class="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-brand-600"
                  >
                    {{ msg.source === 'llm' ? 'LLM 决策' : '本地兜底' }}
                  </span>
                </div>
                <p v-for="(thought, thoughtIdx) in msg.thoughts" :key="thoughtIdx">
                  {{ thought }}
                </p>
              </div>

              <div v-if="msg.actions?.length && !msg.isUser" class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="action in msg.actions"
                  :key="action.value"
                  type="button"
                  class="rounded-full border border-brand-200 px-3 py-1.5 text-xs text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  @click="sendQuickQuestion(action.value, action.label)"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="isThinking" class="flex justify-start">
            <div
              class="max-w-[85%] rounded-2xl rounded-bl-md border border-brand-100 bg-white px-4 py-2.5 text-sm text-gray-500 shadow-sm"
            >
              <p class="animate-pulse">小智正在判断最合适的页面...</p>
            </div>
          </div>

          <div v-if="showQuickActions" class="space-y-2 pt-2">
            <p class="text-center text-xs text-gray-400">快捷操作</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(q, qIdx) in quickQuestions"
                :key="qIdx"
                type="button"
                class="rounded-full border border-brand-200 px-3 py-1.5 text-xs text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                @click="sendQuickQuestion(q.text)"
              >
                {{ q.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="flex-shrink-0 border-t border-brand-100 bg-white p-3">
          <form class="flex gap-2" @submit.prevent="handleSend">
            <input
              ref="inputRef"
              v-model="inputText"
              type="text"
              placeholder="直接说你想做什么，比如“看成绩”“去作业区”"
              class="flex-1 rounded-xl border border-brand-200 bg-gray-50/50 px-4 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
            />
            <button
              type="button"
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              :class="isListening
                ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                : 'border-brand-200 bg-white text-brand-600 hover:bg-brand-50'"
              :title="isListening ? '停止语音输入' : '开始语音输入'"
              :aria-label="isListening ? '停止语音输入' : '开始语音输入'"
              :aria-pressed="isListening"
              :disabled="isThinking"
              @click="toggleVoiceInput"
            >
              <component :is="isListening ? MicOff : Mic" class="h-4 w-4" />
            </button>
            <button
              type="submit"
              class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              :disabled="!inputText.trim() || isThinking"
            >
              <Send class="h-4 w-4" />
            </button>
          </form>
          <p v-if="voiceError" class="mt-2 text-xs text-red-500">{{ voiceError }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { Bot, MessageCircle, Mic, MicOff, Send, X } from 'lucide-vue-next'
import { invokeAssistant } from '@/api'
import {
  buildAvailableActions,
  decodeAgentAction,
  encodeAgentAction,
  type AssistantActionTarget,
  type AssistantAgentRequest,
  type AssistantAgentResponse,
  type AssistantPageAction,
  type AssistantRole,
} from '@/lib/assistantAgent'
import { useAppStore } from '@/stores/app'
import type { Course, Student } from '@/types'

const ASSISTANT_REQUIRE_LLM = /^true$/i.test((import.meta.env.VITE_ASSISTANT_REQUIRE_LLM as string | undefined) ?? '')

type PageContext = AssistantRole
type StudentCourseAction =
  | 'course'
  | 'grade'
  | 'homework'
  | 'ai_tier'
  | 'knowledge_graph'
  | 'resources'
  | 'evaluations'
type TeacherCourseAction = 'course' | 'comments' | 'grade-config' | 'grade-entry' | 'homework' | 'students'

interface ChatAction {
  label: string
  value: string
}

interface ChatMessage {
  text: string
  isUser: boolean
  actions?: ChatAction[]
  thoughts?: string[]
  source?: 'llm' | 'fallback'
}

type PendingIntent =
  | { kind: 'student-course-selection'; action: StudentCourseAction }
  | { kind: 'teacher-course-selection'; action: TeacherCourseAction }
  | { kind: 'admin-class-selection' }
  | { kind: 'admin-student-selection' }

interface NavigateIntent {
  type: 'navigate'
  message: string
  to: RouteLocationRaw
}

interface AskIntent {
  type: 'ask'
  message: string
  actions?: ChatAction[]
  pendingIntent?: PendingIntent
}

interface AnswerIntent {
  type: 'answer'
  message: string
}

interface QuickQuestion {
  label: string
  text: string
}

interface MatchResolution<T> {
  match: T | null
  ambiguous: boolean
  candidates: T[]
}

type SelectionPayload =
  | { kind: 'student-course'; id: string }
  | { kind: 'teacher-course'; id: string }
  | { kind: 'admin-class'; value: string }
  | { kind: 'admin-student'; id: string }

type AssistantIntent = NavigateIntent | AskIntent | AnswerIntent

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

const STUDENT_COURSE_PREFIX = '__student-course__:'
const TEACHER_COURSE_PREFIX = '__teacher-course__:'
const ADMIN_CLASS_PREFIX = '__admin-class__:'
const ADMIN_STUDENT_PREFIX = '__admin-student__:'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const isOpen = ref(false)
const inputText = ref('')
const messagesRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const messages = ref<ChatMessage[]>([])
const pendingIntent = ref<PendingIntent | null>(null)
const isThinking = ref(false)
const isListening = ref(false)
const isVoiceSupported = ref(false)
const voiceError = ref('')
let voiceRecognition: SpeechRecognitionLike | null = null
let voiceBaseText = ''
let voiceTranscript = ''

const pageContext = computed<PageContext>(() => {
  const path = route.path
  if (path.startsWith('/admin')) return 'admin'
  if (path.startsWith('/teacher')) return 'teacher'
  if (path.startsWith('/student')) return 'student'
  if (path.startsWith('/mentor')) return 'mentor'
  if (path.startsWith('/leader')) return 'leader'
  return 'login'
})

const roleLabel = computed(() => {
  const map: Record<PageContext, string> = {
    admin: '管理员',
    teacher: '教师',
    student: '学生',
    mentor: '企业导师',
    leader: '学院领导',
    login: '访客',
  }
  return map[pageContext.value]
})

const currentStudent = computed(() => {
  if (pageContext.value !== 'student') return null
  return store.students.find((student) => student.name === store.currentUser) ?? null
})

const studentCourses = computed<Course[]>(() => {
  if (!currentStudent.value) return []
  const courseIds = new Set(
    store.enrollments
      .filter((enrollment) => enrollment.studentId === currentStudent.value?.id)
      .map((enrollment) => enrollment.courseId),
  )
  return store.courses.filter((course) => courseIds.has(course.id))
})

const currentStudentCourse = computed(() => {
  if (pageContext.value !== 'student') return null
  const courseId = typeof route.params.id === 'string' ? route.params.id : ''
  return studentCourses.value.find((course) => course.id === courseId) ?? null
})

const currentTeacherRecord = computed(() => {
  if (pageContext.value !== 'teacher') return null
  return store.teachers.find((teacher) => teacher.name === store.currentUser) ?? null
})

const teacherCourses = computed<Course[]>(() => {
  if (pageContext.value !== 'teacher') return []
  const courseIds = new Set(currentTeacherRecord.value?.courseIds ?? [])
  return store.courses.filter((course) => course.teacher === store.currentUser || courseIds.has(course.id))
})

const currentTeacherCourse = computed(() => {
  if (pageContext.value !== 'teacher') return null
  const courseId = typeof route.params.id === 'string' ? route.params.id : ''
  return teacherCourses.value.find((course) => course.id === courseId) ?? null
})

const selectedDepartmentName = computed(() => store.getSelectedDepartment()?.name ?? '')

const adminClassNames = computed(() => {
  const scopedClasses = store.selectedDepartmentId
    ? store.getDepartmentClasses(store.selectedDepartmentId)
    : []
  const allDepartmentClasses = Object.values(store.departmentClasses).flat()
  const studentClasses = store.students
    .map((student) => student.className ?? '')
    .filter((className) => Boolean(className))

  return uniqueStrings([...scopedClasses, ...allDepartmentClasses, ...studentClasses])
})

const adminStudents = computed<Student[]>(() => {
  if (pageContext.value !== 'admin') return []

  if (!store.selectedDepartmentId) {
    return store.students
  }

  const scopedClasses = store.getDepartmentClasses(store.selectedDepartmentId)
  if (scopedClasses.length === 0) {
    return store.students
  }

  const classSet = new Set(scopedClasses)
  return store.students.filter((student) => student.className && classSet.has(student.className))
})

const availableAgentActions = computed<AssistantPageAction[]>(() =>
  buildAvailableActions({
    pageContext: pageContext.value,
    studentCourses: studentCourses.value,
    teacherCourses: teacherCourses.value,
    adminStudents: adminStudents.value,
    adminClassNames: adminClassNames.value,
    selectedDepartmentId: store.selectedDepartmentId ?? null,
    selectedDepartmentName: selectedDepartmentName.value,
  }),
)

const agentActionMap = computed(() => new Map(availableAgentActions.value.map((action) => [action.id, action])))

const showQuickActions = computed(() => messages.value.length <= 1)

const quickQuestions = computed<QuickQuestion[]>(() => {
  if (pageContext.value === 'student') {
    return [
      { label: '看成绩', text: '帮我看成绩' },
      { label: '看课表', text: '带我去看课表' },
      { label: '看进度', text: '我想看学习进度' },
      { label: '我的课程', text: '打开我的课程' },
    ]
  }

  if (pageContext.value === 'teacher') {
    return [
      { label: '我的课程', text: '打开我的课程' },
      { label: '课程表', text: '带我去课程表' },
      { label: '评价管理', text: '打开评价管理' },
      { label: '学生进度', text: '带我去学生进度' },
    ]
  }

  if (pageContext.value === 'admin') {
    return [
      { label: '切换学院', text: '我要切换学院' },
      { label: '课程管理', text: '带我去课程管理' },
      { label: '班级管理', text: '打开班级管理' },
      { label: '学生详情', text: '查看学生详情' },
    ]
  }

  return [
    { label: '平台功能', text: '这个平台有哪些功能？' },
    { label: '我的权限', text: `我作为${roleLabel.value}可以做什么？` },
    { label: '怎么用小智', text: '你可以怎么帮我？' },
  ]
})

function uniqueStrings(values: string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
  }

  return result
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。！？、；："'“”‘’（）()【】《》<>·,.!?:;`~\-_/\\[\]{}|]/g, '')
}

function buildKeywords(value: string): string[] {
  const normalized = normalizeText(value)
  const tokens = new Set<string>()

  if (normalized) {
    tokens.add(normalized)
  }

  for (const segment of value.split(/[\s/·\-_.()（）【】\[\]]+/)) {
    const next = normalizeText(segment)
    if (next.length >= 2) {
      tokens.add(next)
    }
  }

  for (const match of value.match(/[A-Za-z0-9+#.]+/g) ?? []) {
    const next = normalizeText(match)
    if (next.length >= 2) {
      tokens.add(next)
    }
  }

  const chineseOnly = normalized.replace(/[^\u4e00-\u9fa5]/g, '')
  if (chineseOnly.length >= 2 && chineseOnly.length <= 12) {
    for (let length = 2; length <= Math.min(4, chineseOnly.length); length += 1) {
      for (let index = 0; index <= chineseOnly.length - length; index += 1) {
        tokens.add(chineseOnly.slice(index, index + length))
      }
    }
  }

  return Array.from(tokens)
}

function isSubsequence(needle: string, haystack: string): boolean {
  let index = 0

  for (const char of haystack) {
    if (char === needle[index]) {
      index += 1
      if (index === needle.length) {
        return true
      }
    }
  }

  return false
}

function scoreCandidate(query: string, texts: string[]): number {
  let best = 0

  for (const text of texts) {
    const candidate = normalizeText(text)
    if (!candidate) continue

    if (query === candidate) {
      best = Math.max(best, 1000 + candidate.length)
      continue
    }

    if (query.length >= 2 && query.includes(candidate)) {
      best = Math.max(best, 850 + candidate.length)
      continue
    }

    if (query.length >= 2 && candidate.includes(query)) {
      best = Math.max(best, 700 + query.length)
      continue
    }

    if (query.length >= 2 && isSubsequence(query, candidate)) {
      best = Math.max(best, 300 + query.length)
    }
  }

  return best
}

function resolveBestMatch<T>(
  rawText: string,
  items: T[],
  getTexts: (item: T) => string[],
): MatchResolution<T> {
  const query = normalizeText(rawText)
  if (!query) {
    return { match: null, ambiguous: false, candidates: [] }
  }

  const ranked = items
    .map((item) => ({
      item,
      score: scoreCandidate(query, getTexts(item)),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)

  if (ranked.length === 0) {
    return { match: null, ambiguous: false, candidates: [] }
  }

  if (ranked.length > 1 && ranked[0].score === ranked[1].score) {
    return {
      match: null,
      ambiguous: true,
      candidates: ranked.slice(0, 6).map((item) => item.item),
    }
  }

  return {
    match: ranked[0].item,
    ambiguous: false,
    candidates: ranked.slice(0, 6).map((item) => item.item),
  }
}

function buildCourseTexts(course: Course): string[] {
  return [course.title, ...buildKeywords(course.title)]
}

function buildStudentTexts(student: Student): string[] {
  const texts = [student.name, student.id, student.studentId ?? '', student.className ?? '']

  if (student.className) {
    texts.push(`${student.className}${student.name}`)
    texts.push(`${student.name}${student.className}`)
  }

  return texts
}

function encodeSelection(kind: SelectionPayload['kind'], value: string): string {
  switch (kind) {
    case 'student-course':
      return `${STUDENT_COURSE_PREFIX}${value}`
    case 'teacher-course':
      return `${TEACHER_COURSE_PREFIX}${value}`
    case 'admin-class':
      return `${ADMIN_CLASS_PREFIX}${encodeURIComponent(value)}`
    case 'admin-student':
      return `${ADMIN_STUDENT_PREFIX}${value}`
  }
}

function parseSelection(rawText: string): SelectionPayload | null {
  if (rawText.startsWith(STUDENT_COURSE_PREFIX)) {
    return { kind: 'student-course', id: rawText.slice(STUDENT_COURSE_PREFIX.length) }
  }

  if (rawText.startsWith(TEACHER_COURSE_PREFIX)) {
    return { kind: 'teacher-course', id: rawText.slice(TEACHER_COURSE_PREFIX.length) }
  }

  if (rawText.startsWith(ADMIN_CLASS_PREFIX)) {
    return {
      kind: 'admin-class',
      value: decodeURIComponent(rawText.slice(ADMIN_CLASS_PREFIX.length)),
    }
  }

  if (rawText.startsWith(ADMIN_STUDENT_PREFIX)) {
    return { kind: 'admin-student', id: rawText.slice(ADMIN_STUDENT_PREFIX.length) }
  }

  return null
}

function findStudentCourseById(courseId: string): Course | null {
  return studentCourses.value.find((course) => course.id === courseId) ?? null
}

function findTeacherCourseById(courseId: string): Course | null {
  return teacherCourses.value.find((course) => course.id === courseId) ?? null
}

function findAdminStudentById(studentId: string): Student | null {
  return adminStudents.value.find((student) => student.id === studentId) ?? null
}

function refersCurrentCourse(rawText: string): boolean {
  return /(这门课|当前课程|这个课程|本课程)/.test(rawText)
}

function findStudentCourse(rawText: string): MatchResolution<Course> {
  if (refersCurrentCourse(rawText) && currentStudentCourse.value) {
    return {
      match: currentStudentCourse.value,
      ambiguous: false,
      candidates: [currentStudentCourse.value],
    }
  }

  return resolveBestMatch(rawText, studentCourses.value, buildCourseTexts)
}

function findTeacherCourse(rawText: string): MatchResolution<Course> {
  if (refersCurrentCourse(rawText) && currentTeacherCourse.value) {
    return {
      match: currentTeacherCourse.value,
      ambiguous: false,
      candidates: [currentTeacherCourse.value],
    }
  }

  return resolveBestMatch(rawText, teacherCourses.value, buildCourseTexts)
}

function findAdminClass(rawText: string): MatchResolution<string> {
  return resolveBestMatch(rawText, adminClassNames.value, (className) => [className, ...buildKeywords(className)])
}

function findAdminStudent(rawText: string): MatchResolution<Student> {
  return resolveBestMatch(rawText, adminStudents.value, buildStudentTexts)
}

function getStudentOptionLabel(student: Student): string {
  const details = [student.className, student.studentId].filter(Boolean)
  return details.length > 0 ? `${student.name}（${details.join(' / ')}）` : student.name
}

function buildStudentCourseOptions(courses: Course[] = studentCourses.value): ChatAction[] {
  return courses.slice(0, 6).map((course) => ({
    label: course.title,
    value: encodeSelection('student-course', course.id),
  }))
}

function buildTeacherCourseOptions(courses: Course[] = teacherCourses.value): ChatAction[] {
  return courses.slice(0, 6).map((course) => ({
    label: course.title,
    value: encodeSelection('teacher-course', course.id),
  }))
}

function buildAdminClassOptions(classNames: string[] = adminClassNames.value): ChatAction[] {
  return classNames.slice(0, 6).map((className) => ({
    label: className,
    value: encodeSelection('admin-class', className),
  }))
}

function buildAdminStudentOptions(students: Student[] = adminStudents.value): ChatAction[] {
  return students.slice(0, 6).map((student) => ({
    label: getStudentOptionLabel(student),
    value: encodeSelection('admin-student', student.id),
  }))
}

function buildStudentCourseSelectionIntent(
  action: StudentCourseAction,
  courses: Course[] = studentCourses.value,
): AssistantIntent {
  const actions = buildStudentCourseOptions(courses)

  if (actions.length === 0) {
    return {
      type: 'navigate',
      message: '我先带你去“我的课程”，你可以先确认当前有哪些课。',
      to: '/student/courses',
    }
  }

  const prompts: Record<StudentCourseAction, string> = {
    course: '你想进入哪门课？',
    grade: '你想看哪门课的成绩？',
    homework: '你想打开哪门课的作业区？',
    ai_tier: '你想做哪门课的 AI 分层测试？',
    knowledge_graph: '你想看哪门课的知识图谱？',
    resources: '你想看哪门课的课程资源？',
    evaluations: '你想打开哪门课的评价区？',
  }

  return {
    type: 'ask',
    message: `${prompts[action]} 直接回复课程名，或者点下面的课程。`,
    actions,
    pendingIntent: {
      kind: 'student-course-selection',
      action,
    },
  }
}

function buildTeacherCourseSelectionIntent(
  action: TeacherCourseAction,
  courses: Course[] = teacherCourses.value,
): AssistantIntent {
  const actions = buildTeacherCourseOptions(courses)

  if (actions.length === 0) {
    return {
      type: 'navigate',
      message: '我先带你去“我的课程”，你可以先确认当前负责的课程。',
      to: '/teacher/courses',
    }
  }

  const prompts: Record<TeacherCourseAction, string> = {
    course: '你想进入哪门课？',
    comments: '你想打开哪门课的评价管理？',
    'grade-config': '你想打开哪门课的成绩配置？',
    'grade-entry': '你想打开哪门课的成绩管理？',
    homework: '你想打开哪门课的作业管理？',
    students: '你想打开哪门课的学生管理？',
  }

  return {
    type: 'ask',
    message: `${prompts[action]} 直接回复课程名，或者点下面的课程。`,
    actions,
    pendingIntent: {
      kind: 'teacher-course-selection',
      action,
    },
  }
}

function buildAdminClassSelectionIntent(classNames: string[] = adminClassNames.value): AssistantIntent {
  const actions = buildAdminClassOptions(classNames)

  if (actions.length === 0) {
    return {
      type: 'navigate',
      message: '我先带你去班级管理页，你可以先确认当前有哪些班级。',
      to: '/admin/students',
    }
  }

  return {
    type: 'ask',
    message: '你想打开哪个班级？直接回复班级名，或者点下面的班级。',
    actions,
    pendingIntent: {
      kind: 'admin-class-selection',
    },
  }
}

function buildAdminStudentSelectionIntent(students: Student[] = adminStudents.value): AssistantIntent {
  const actions = buildAdminStudentOptions(students)

  if (actions.length === 0) {
    return {
      type: 'navigate',
      message: '我先带你去班级管理页，你可以先确认学生列表。',
      to: '/admin/students',
    }
  }

  return {
    type: 'ask',
    message: '你想查看哪个学生的详情？直接回复学生姓名，或者点下面的学生。',
    actions,
    pendingIntent: {
      kind: 'admin-student-selection',
    },
  }
}

function buildStudentCourseActionIntent(action: StudentCourseAction, course: Course): NavigateIntent {
  if (action === 'grade') {
    return {
      type: 'navigate',
      message: `我带你去看《${course.title}》的成绩详情。`,
      to: {
        path: '/student/grades',
        query: {
          courseId: course.id,
        },
      },
    }
  }

  const tabMap: Partial<Record<StudentCourseAction, string>> = {
    homework: 'homework',
    ai_tier: 'ai_tier',
    knowledge_graph: 'knowledge_graph',
    resources: 'resources',
    evaluations: 'evaluations',
  }

  const messageMap: Record<StudentCourseAction, string> = {
    course: `我带你进入《${course.title}》。`,
    grade: `我带你去看《${course.title}》的成绩详情。`,
    homework: `我带你去《${course.title}》的作业区。`,
    ai_tier: `我带你去《${course.title}》的 AI 分层测试。`,
    knowledge_graph: `我带你去《${course.title}》的知识图谱。`,
    resources: `我带你去《${course.title}》的课程资源。`,
    evaluations: `我带你去《${course.title}》的评价区。`,
  }

  return {
    type: 'navigate',
    message: messageMap[action],
    to: {
      path: `/student/courses/${course.id}`,
      query: tabMap[action] ? { tab: tabMap[action] } : undefined,
    },
  }
}

function buildTeacherCourseActionIntent(action: TeacherCourseAction, course: Course): NavigateIntent {
  const tabMap: Partial<Record<TeacherCourseAction, string>> = {
    comments: 'comments',
    'grade-config': 'grade-config',
    'grade-entry': 'grade-entry',
    homework: 'homework',
    students: 'students',
  }

  const messageMap: Record<TeacherCourseAction, string> = {
    course: `我带你进入《${course.title}》。`,
    comments: `我带你去《${course.title}》的评价管理。`,
    'grade-config': `我带你去《${course.title}》的成绩配置。`,
    'grade-entry': `我带你去《${course.title}》的成绩管理。`,
    homework: `我带你去《${course.title}》的作业管理。`,
    students: `我带你去《${course.title}》的学生管理。`,
  }

  return {
    type: 'navigate',
    message: messageMap[action],
    to: {
      path: `/teacher/courses/${course.id}`,
      query: tabMap[action] ? { tab: tabMap[action] } : undefined,
    },
  }
}

function buildAdminClassIntent(className: string): NavigateIntent {
  return {
    type: 'navigate',
    message: `我带你去“${className}”的学生列表。`,
    to: {
      path: '/admin/students',
      query: {
        className,
      },
    },
  }
}

function buildAdminStudentIntent(student: Student): NavigateIntent {
  return {
    type: 'navigate',
    message: `我带你去看 ${student.name} 的学生详情。`,
    to: `/admin/students/${student.id}`,
  }
}

function getRoleDescription(role: PageContext): string {
  const descriptions: Record<PageContext, string> = {
    admin: '你可以切换学院、管理课程分类和班级，并查看学生详情。',
    teacher: '你可以查看我的课程、课程表、评价管理、成绩配置、成绩管理、作业管理和学生管理。',
    student: '你可以查看课程、课表、成绩、学习进度、个人画像和额外功能。',
    mentor: '你可以查看负责课程、参与学生评价，并查看相关协作内容。',
    leader: '你可以查看学院课程概况和学生统计信息。',
    login: '登录后我就能按你的角色带你去对应页面。',
  }
  return descriptions[role]
}

function getRoleExamples(role: PageContext): string {
  const examples: Record<PageContext, string> = {
    admin: '比如“带我去课程管理”“打开 1 班”“查看张明详情”。',
    teacher: '比如“打开我的课程”“去这门课的成绩配置”“打开这门课的学生管理”。',
    student: '比如“看成绩”“查看高等数学的成绩”“打开这门课的作业区”。',
    mentor: '比如“这个平台有哪些功能”。',
    leader: '比如“这个平台有哪些功能”。',
    login: '比如“这个平台有哪些功能”。',
  }
  return examples[role]
}

function resolvePendingIntent(rawText: string): AssistantIntent | null {
  if (!pendingIntent.value) return null

  if (/(不用了|算了|取消|先不用|先不看了|不需要了|先不去了)/.test(rawText)) {
    pendingIntent.value = null
    return {
      type: 'answer',
      message: '好，我先不跳转。你继续告诉我你想做什么就行。',
    }
  }

  const selection = parseSelection(rawText)
  const currentIntent = pendingIntent.value

  if (currentIntent.kind === 'student-course-selection') {
    let course: Course | null = null

    if (selection?.kind === 'student-course') {
      course = findStudentCourseById(selection.id)
    } else {
      const resolution = findStudentCourse(rawText)
      if (resolution.ambiguous) {
        return buildStudentCourseSelectionIntent(currentIntent.action, resolution.candidates)
      }
      course = resolution.match
    }

    if (!course) {
      return buildStudentCourseSelectionIntent(currentIntent.action)
    }

    pendingIntent.value = null
    return buildStudentCourseActionIntent(currentIntent.action, course)
  }

  if (currentIntent.kind === 'teacher-course-selection') {
    let course: Course | null = null

    if (selection?.kind === 'teacher-course') {
      course = findTeacherCourseById(selection.id)
    } else {
      const resolution = findTeacherCourse(rawText)
      if (resolution.ambiguous) {
        return buildTeacherCourseSelectionIntent(currentIntent.action, resolution.candidates)
      }
      course = resolution.match
    }

    if (!course) {
      return buildTeacherCourseSelectionIntent(currentIntent.action)
    }

    pendingIntent.value = null
    return buildTeacherCourseActionIntent(currentIntent.action, course)
  }

  if (currentIntent.kind === 'admin-class-selection') {
    let className = ''

    if (selection?.kind === 'admin-class') {
      className = selection.value
    } else {
      const resolution = findAdminClass(rawText)
      if (resolution.ambiguous) {
        return buildAdminClassSelectionIntent(resolution.candidates)
      }
      className = resolution.match ?? ''
    }

    if (!className) {
      return buildAdminClassSelectionIntent()
    }

    pendingIntent.value = null
    return buildAdminClassIntent(className)
  }

  let student: Student | null = null

  if (selection?.kind === 'admin-student') {
    student = findAdminStudentById(selection.id)
  } else {
    const resolution = findAdminStudent(rawText)
    if (resolution.ambiguous) {
      return buildAdminStudentSelectionIntent(resolution.candidates)
    }
    student = resolution.match
  }

  if (!student) {
    return buildAdminStudentSelectionIntent()
  }

  pendingIntent.value = null
  return buildAdminStudentIntent(student)
}

function resolveStudentIntent(rawText: string): AssistantIntent | null {
  const courseResolution = findStudentCourse(rawText)
  const currentCourse = refersCurrentCourse(rawText) ? currentStudentCourse.value : null
  const singleCourse = studentCourses.value.length === 1 ? studentCourses.value[0] : null
  const specificCourse = courseResolution.match ?? currentCourse ?? singleCourse

  const isGradeIntent = /(成绩|分数|总评|绩点|得分)/.test(rawText)
  const isScheduleIntent = /(课表|课程表|上课时间|排课)/.test(rawText)
  const isProgressIntent = /(进度|学习情况|掌握情况|完成到哪|学得怎么样)/.test(rawText)
  const isProfileIntent = /(画像|个人信息|个人资料|我的信息|能力分析)/.test(rawText)
  const isExtraIntent = /(额外功能|待办|云盘|文件|文档|笔记)/.test(rawText)
  const isHomeworkIntent = /(作业|提交作业)/.test(rawText)
  const isAITierIntent = /(ai分层|分层测试|分层测评|分层)/i.test(rawText)
  const isKnowledgeIntent = /(知识图谱|知识点图|知识图)/.test(rawText)
  const isResourcesIntent = /(资源|资料|课件)/.test(rawText)
  const isEvaluationIntent = /(评价|互评|自评|老师评价|导师评价)/.test(rawText)
  const isCourseListIntent = /(我的课程|课程列表|选课|有哪些课|课程中心)/.test(rawText)
  const hasCourseVerb = /(进入|打开|学习|查看|去)/.test(rawText)
  const isCourseDetailIntent =
    /(进入课程|打开课程|课程详情)/.test(rawText) || (hasCourseVerb && Boolean(courseResolution.match))
  const needsSpecificCourse = /(这门课|当前课程|这个课程|本课程|某门课|哪门课)/.test(rawText)

  if (isHomeworkIntent) {
    if (courseResolution.ambiguous) return buildStudentCourseSelectionIntent('homework', courseResolution.candidates)
    if (specificCourse) return buildStudentCourseActionIntent('homework', specificCourse)
    return buildStudentCourseSelectionIntent('homework')
  }

  if (isAITierIntent) {
    if (courseResolution.ambiguous) return buildStudentCourseSelectionIntent('ai_tier', courseResolution.candidates)
    if (specificCourse) return buildStudentCourseActionIntent('ai_tier', specificCourse)
    return buildStudentCourseSelectionIntent('ai_tier')
  }

  if (isKnowledgeIntent) {
    if (courseResolution.ambiguous) {
      return buildStudentCourseSelectionIntent('knowledge_graph', courseResolution.candidates)
    }
    if (specificCourse) return buildStudentCourseActionIntent('knowledge_graph', specificCourse)
    return buildStudentCourseSelectionIntent('knowledge_graph')
  }

  if (isResourcesIntent) {
    if (courseResolution.ambiguous) return buildStudentCourseSelectionIntent('resources', courseResolution.candidates)
    if (specificCourse) return buildStudentCourseActionIntent('resources', specificCourse)
    return buildStudentCourseSelectionIntent('resources')
  }

  if (isEvaluationIntent) {
    if (courseResolution.ambiguous) {
      return buildStudentCourseSelectionIntent('evaluations', courseResolution.candidates)
    }
    if (specificCourse) return buildStudentCourseActionIntent('evaluations', specificCourse)
    return buildStudentCourseSelectionIntent('evaluations')
  }

  if (isGradeIntent) {
    if (courseResolution.ambiguous) return buildStudentCourseSelectionIntent('grade', courseResolution.candidates)
    if (specificCourse && (Boolean(courseResolution.match) || Boolean(currentCourse) || needsSpecificCourse || Boolean(singleCourse))) {
      return buildStudentCourseActionIntent('grade', specificCourse)
    }
    if (needsSpecificCourse) return buildStudentCourseSelectionIntent('grade')
    return {
      type: 'navigate',
      message: '我带你去成绩查询页。',
      to: '/student/grades',
    }
  }

  if (isScheduleIntent) {
    return {
      type: 'navigate',
      message: '我带你去看课表。',
      to: '/student/schedule',
    }
  }

  if (isProgressIntent) {
    return {
      type: 'navigate',
      message: '我带你去学习进度页。',
      to: '/student/progress',
    }
  }

  if (isProfileIntent) {
    return {
      type: 'navigate',
      message: '我带你去个人画像页。',
      to: '/student/profile',
    }
  }

  if (isExtraIntent) {
    return {
      type: 'navigate',
      message: '我带你去额外功能页。',
      to: '/student/extra',
    }
  }

  if (courseResolution.ambiguous && (isCourseDetailIntent || (hasCourseVerb && needsSpecificCourse))) {
    return buildStudentCourseSelectionIntent('course', courseResolution.candidates)
  }

  if (isCourseDetailIntent) {
    if (specificCourse) return buildStudentCourseActionIntent('course', specificCourse)
    return buildStudentCourseSelectionIntent('course')
  }

  if (isCourseListIntent) {
    return {
      type: 'navigate',
      message: '我带你去我的课程页。',
      to: '/student/courses',
    }
  }

  return null
}

function resolveTeacherIntent(rawText: string): AssistantIntent | null {
  const courseResolution = findTeacherCourse(rawText)
  const currentCourse = refersCurrentCourse(rawText) ? currentTeacherCourse.value : null
  const singleCourse = teacherCourses.value.length === 1 ? teacherCourses.value[0] : null
  const specificCourse = courseResolution.match ?? currentCourse ?? singleCourse
  const hasExplicitCourseContext = Boolean(courseResolution.match) || Boolean(currentCourse)

  const isCourseListIntent = /(我的课程|课程列表|授课课程|我教的课)/.test(rawText)
  const isScheduleIntent = /(课表|课程表|上课时间|排课)/.test(rawText)
  const isProgressIntent = /(学生进度|学员进度|学习进度|学生情况)/.test(rawText)
  const isEvaluationIntent = /(评价管理|评价|评教|评语|评论)/.test(rawText)
  const isGradeConfigIntent = /(成绩配置|评分配置|权重配置|成绩权重)/.test(rawText)
  const isGradeEntryIntent = /(成绩管理|成绩录入|录入成绩|登记成绩|提交成绩)/.test(rawText)
  const isHomeworkIntent = /(作业管理|作业区|布置作业|作业)/.test(rawText)
  const isStudentManagementIntent = /(学生管理|学员管理|班级学生|学生名单)/.test(rawText)
  const isExtraIntent = /(额外功能|待办|云盘|文件|文档|笔记)/.test(rawText)
  const hasCourseVerb = /(进入|打开|查看|去)/.test(rawText)
  const isCourseDetailIntent =
    /(进入课程|打开课程|课程详情)/.test(rawText) || (hasCourseVerb && Boolean(courseResolution.match))

  if (isGradeConfigIntent) {
    if (courseResolution.ambiguous) {
      return buildTeacherCourseSelectionIntent('grade-config', courseResolution.candidates)
    }
    if (specificCourse) return buildTeacherCourseActionIntent('grade-config', specificCourse)
    return buildTeacherCourseSelectionIntent('grade-config')
  }

  if (isGradeEntryIntent) {
    if (courseResolution.ambiguous) {
      return buildTeacherCourseSelectionIntent('grade-entry', courseResolution.candidates)
    }
    if (specificCourse) return buildTeacherCourseActionIntent('grade-entry', specificCourse)
    return buildTeacherCourseSelectionIntent('grade-entry')
  }

  if (isHomeworkIntent) {
    if (courseResolution.ambiguous) {
      return buildTeacherCourseSelectionIntent('homework', courseResolution.candidates)
    }
    if (specificCourse) return buildTeacherCourseActionIntent('homework', specificCourse)
    return buildTeacherCourseSelectionIntent('homework')
  }

  if (isEvaluationIntent) {
    if (courseResolution.ambiguous && (hasCourseVerb || /这门课|当前课程|这个课程|本课程/.test(rawText))) {
      return buildTeacherCourseSelectionIntent('comments', courseResolution.candidates)
    }
    if (hasExplicitCourseContext && specificCourse) {
      return buildTeacherCourseActionIntent('comments', specificCourse)
    }
    return {
      type: 'navigate',
      message: '我带你去评价管理页。',
      to: '/teacher/evaluation',
    }
  }

  if (isStudentManagementIntent) {
    if (courseResolution.ambiguous && (hasCourseVerb || /这门课|当前课程|这个课程|本课程/.test(rawText))) {
      return buildTeacherCourseSelectionIntent('students', courseResolution.candidates)
    }
    if (hasExplicitCourseContext && specificCourse) {
      return buildTeacherCourseActionIntent('students', specificCourse)
    }
    return {
      type: 'navigate',
      message: '我带你去学生进度页。',
      to: '/teacher/students',
    }
  }

  if (isCourseListIntent) {
    return {
      type: 'navigate',
      message: '我带你去我的课程页。',
      to: '/teacher/courses',
    }
  }

  if (isScheduleIntent) {
    return {
      type: 'navigate',
      message: '我带你去教师课表。',
      to: '/teacher/schedule',
    }
  }

  if (isProgressIntent) {
    return {
      type: 'navigate',
      message: '我带你去学生进度页。',
      to: '/teacher/students',
    }
  }

  if (isExtraIntent) {
    return {
      type: 'navigate',
      message: '我带你去额外功能页。',
      to: '/teacher/extra',
    }
  }

  if (courseResolution.ambiguous && isCourseDetailIntent) {
    return buildTeacherCourseSelectionIntent('course', courseResolution.candidates)
  }

  if (isCourseDetailIntent) {
    if (specificCourse) return buildTeacherCourseActionIntent('course', specificCourse)
    return buildTeacherCourseSelectionIntent('course')
  }

  return null
}

function resolveAdminIntent(rawText: string): AssistantIntent | null {
  const classResolution = findAdminClass(rawText)
  const studentResolution = findAdminStudent(rawText)

  const isCourseManagementIntent = /(课程管理|课程分类|分类管理|排课|排课管理)/.test(rawText)
  const isClassManagementIntent = /(班级管理|学生管理|班级列表|学生列表)/.test(rawText)
  const isDepartmentIntent = /(切换学院|选择学院|学院|部门)/.test(rawText)
  const hasOpenVerb = /(打开|查看|进入|带我去|去|找)/.test(rawText)
  const isStudentDetailIntent =
    /(学生详情|详情|档案|资料|学生信息)/.test(rawText) ||
    (Boolean(studentResolution.match || studentResolution.ambiguous) && hasOpenVerb)
  const isDirectClassIntent =
    Boolean(classResolution.match || classResolution.ambiguous) &&
    (hasOpenVerb || rawText.trim() === classResolution.match)

  if (isStudentDetailIntent) {
    if (studentResolution.ambiguous) {
      return buildAdminStudentSelectionIntent(studentResolution.candidates)
    }
    if (studentResolution.match) {
      return buildAdminStudentIntent(studentResolution.match)
    }
    return buildAdminStudentSelectionIntent()
  }

  if (isDirectClassIntent || isClassManagementIntent) {
    if (classResolution.ambiguous) {
      return buildAdminClassSelectionIntent(classResolution.candidates)
    }
    if (classResolution.match) {
      return buildAdminClassIntent(classResolution.match)
    }
    return {
      type: 'navigate',
      message: '我带你去班级管理页。',
      to: '/admin/students',
    }
  }

  if (isCourseManagementIntent) {
    if (!store.selectedDepartmentId) {
      return {
        type: 'navigate',
        message: '我先带你去学院选择页，先选学院再看课程管理。',
        to: '/admin',
      }
    }

    return {
      type: 'navigate',
      message: `我带你去${selectedDepartmentName.value || '当前学院'}的课程管理。`,
      to: '/admin/categories',
    }
  }

  if (isDepartmentIntent) {
    return {
      type: 'navigate',
      message: '我带你去学院选择页。',
      to: '/admin',
    }
  }

  return null
}

function findAnswer(query: string): string {
  if (/(你好|您好|hi|hello)/i.test(query)) {
    return `你好，我是小智。你现在在${roleLabel.value}端，直接告诉我你想做什么就行。`
  }

  if (/(谢谢|感谢|3q|thanks)/i.test(query)) {
    return '不客气。继续说你想做什么，我会尽量直接带你过去。'
  }

  if (/(你可以怎么帮我|怎么用小智|怎么用你)/.test(query)) {
    return `你直接说目标就行，我会在信息足够时直接跳转，不够时先追问。${getRoleExamples(pageContext.value)}`
  }

  if (/(平台功能|有哪些功能|能做什么|功能介绍)/.test(query)) {
    return '这个平台支持课程管理、课表查看、成绩查询、学习进度、课程资源、作业管理、评价填写和 AI 分层测试。'
  }

  if (/(角色|权限|我可以做什么|我能做什么)/.test(query)) {
    return `你当前是${roleLabel.value}，${getRoleDescription(pageContext.value)}`
  }

  if (/(退出|登出|注销)/.test(query)) {
    return '左侧边栏底部有退出登录按钮，点一下就可以安全退出。'
  }

  return `我还没完全听懂。你可以换一种说法，${getRoleExamples(pageContext.value)}`
}

function resolveIntent(rawText: string): AssistantIntent {
  const pendingResult = resolvePendingIntent(rawText)
  if (pendingResult) return pendingResult

  if (pageContext.value === 'student') {
    const studentIntent = resolveStudentIntent(rawText)
    if (studentIntent) return studentIntent
  }

  if (pageContext.value === 'teacher') {
    const teacherIntent = resolveTeacherIntent(rawText)
    if (teacherIntent) return teacherIntent
  }

  if (pageContext.value === 'admin') {
    const adminIntent = resolveAdminIntent(rawText)
    if (adminIntent) return adminIntent
  }

  return {
    type: 'answer',
    message: findAnswer(rawText),
  }
}

function buildAssistantHistory(source: ChatMessage[]): Array<{ role: 'user' | 'assistant'; text: string }> {
  return source.slice(-6).map((message) => ({
    role: message.isUser ? 'user' : 'assistant',
    text: message.text,
  }))
}

function buildRouteLocation(target: AssistantActionTarget): RouteLocationRaw {
  const query = target.query && Object.keys(target.query).length > 0 ? target.query : undefined
  return {
    path: target.path,
    query,
  }
}

function buildAgentChatActions(response: AssistantAgentResponse): ChatAction[] | undefined {
  if (!response.options?.length) {
    return undefined
  }

  return response.options.map((option) => ({
    label: option.label,
    value: encodeAgentAction(option.id),
  }))
}

async function navigateWithAssistantTarget(
  target: AssistantActionTarget,
  reply: string,
  thoughts: string[] = [],
  source?: 'llm' | 'fallback',
) {
  pendingIntent.value = null
  pushAssistantMessage({
    text: reply,
    isUser: false,
    thoughts,
    source,
  })
  await router.push(buildRouteLocation(target)).catch(() => undefined)
}

async function handleAgentActionShortcut(actionId: string) {
  const action = agentActionMap.value.get(actionId)
  pendingIntent.value = null

  if (!action) {
    pushAssistantMessage({
      text: '这个选项现在不可用了。你再说一次目标，我重新帮你判断。',
      isUser: false,
    })
    return
  }

  await navigateWithAssistantTarget(action.target, '好，我现在带你过去。', [
    '你已经确认了具体目标，我直接执行页面跳转。',
  ])
}

async function handleAgentResponse(response: AssistantAgentResponse) {
  if (response.type === 'navigate' && response.action) {
    await navigateWithAssistantTarget(
      response.action.target,
      response.reply,
      response.thought ?? [],
      response.source,
    )
    return
  }

  pendingIntent.value = null

  if (response.type === 'ask') {
    pushAssistantMessage({
      text: response.reply,
      isUser: false,
      thoughts: response.thought,
      source: response.source,
      actions: buildAgentChatActions(response),
    })
    return
  }

  pushAssistantMessage({
    text: response.reply,
    isUser: false,
    thoughts: response.thought,
    source: response.source,
  })
}

async function requestAgentIntent(
  userMessage: string,
  recentMessages: Array<{ role: 'user' | 'assistant'; text: string }>,
): Promise<AssistantAgentResponse | null> {
  if (pageContext.value === 'login') {
    return null
  }

  const payload: AssistantAgentRequest = {
    userMessage,
    context: {
      role: pageContext.value,
      roleLabel: roleLabel.value,
      currentPath: route.fullPath,
      currentUser: store.currentUser ?? null,
      selectedDepartmentId: store.selectedDepartmentId ?? null,
      selectedDepartmentName: selectedDepartmentName.value,
      recentMessages,
      availableActions: availableAgentActions.value,
    },
  }

  try {
    return await invokeAssistant(payload)
  } catch (error) {
    console.error('Assistant agent request failed:', error)
    const requestError = error as Error & { code?: string }
    return {
      success: false,
      type: 'answer',
      reply: '',
      code: requestError.code,
      message: requestError.message || '智能体请求失败',
    }
  }
}

function handleAgentUnavailable(response: AssistantAgentResponse | null) {
  pendingIntent.value = null
  pushAssistantMessage({
    text: response?.message || '这次没有走到 LLM 决策，请检查 DeepSeek 和后端配置后再试。',
    isUser: false,
  })
}

function pushAssistantMessage(message: ChatMessage) {
  messages.value.push(message)
  scrollToBottom()
}

async function handleIntent(intent: AssistantIntent) {
  if (intent.type === 'navigate') {
    pendingIntent.value = null
    pushAssistantMessage({ text: intent.message, isUser: false })
    await router.push(intent.to).catch(() => undefined)
    return
  }

  if (intent.type === 'ask') {
    pendingIntent.value = intent.pendingIntent ?? null
    pushAssistantMessage({
      text: intent.message,
      isUser: false,
      actions: intent.actions,
    })
    return
  }

  pendingIntent.value = null
  pushAssistantMessage({ text: intent.message, isUser: false })
}

async function dispatchMessage(rawText: string, displayText = rawText) {
  const visibleText = displayText.trim()
  const actualText = rawText.trim()
  if (!visibleText || !actualText || isThinking.value) return

  const recentMessages = buildAssistantHistory(messages.value)

  messages.value.push({ text: visibleText, isUser: true })
  inputText.value = ''
  scrollToBottom()

  const agentActionId = decodeAgentAction(actualText)
  if (agentActionId) {
    await handleAgentActionShortcut(agentActionId)
    return
  }

  if (pendingIntent.value || parseSelection(actualText)) {
    const intent = resolveIntent(actualText)
    await handleIntent(intent)
    return
  }

  isThinking.value = true

  try {
    const agentResponse = await requestAgentIntent(actualText, recentMessages)
    if (agentResponse?.success) {
      if (agentResponse.type === 'navigate' && !agentResponse.action) {
        await handleIntent(resolveIntent(actualText))
        return
      }

      await handleAgentResponse(agentResponse)
      return
    }

    if (ASSISTANT_REQUIRE_LLM || agentResponse?.code === 'assistant_llm_unavailable') {
      handleAgentUnavailable(agentResponse)
      return
    }

    await handleIntent(resolveIntent(actualText))
  } finally {
    isThinking.value = false
  }
}

function sendQuickQuestion(text: string, displayText = text) {
  void dispatchMessage(text, displayText)
}

function sendMessage() {
  if (isThinking.value) return
  const text = inputText.value.trim()
  if (!text) return
  void dispatchMessage(text)
}

function handleSend() {
  sendMessage()
}

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
    inputText.value = [voiceBaseText, voiceTranscript].filter(Boolean).join(' ')
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
  if (isThinking.value) return

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

  voiceBaseText = inputText.value.trim()
  voiceTranscript = ''

  try {
    recognition.start()
    isListening.value = true
  } catch (error: any) {
    isListening.value = false
    voiceError.value = error?.message || '语音识别启动失败，请重试'
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

function togglePanel() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => inputRef.value?.focus())
  }
}

onMounted(() => {
  isVoiceSupported.value = Boolean(getSpeechRecognitionConstructor())
})

onBeforeUnmount(() => {
  voiceRecognition?.stop()
  voiceRecognition = null
})

watch(isOpen, (open) => {
  if (!open) return

  nextTick(() => inputRef.value?.focus())

  if (messages.value.length === 0) {
    const username = store.currentUser || '同学'
    const greeting = `你好，${username}。我是小智。\n\n你直接告诉我你想做什么，我会尽量带你跳到对应页面；如果信息还不够，我会先问清楚。`
    messages.value.push({ text: greeting, isUser: false })
  }

  scrollToBottom()
})
</script>
