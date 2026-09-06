<template>
  <div class="fixed inset-0 z-[70] flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40" @click="emit('close')" />
    <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col">
      <!-- 头部 -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <GitBranch class="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ props.project.name }}</h3>
            <p class="text-xs text-gray-400">{{ props.project.hours }} 学时<template v-if="props.project.weekNo"> · 第 {{ props.project.weekNo }} 周</template><template v-if="props.project.knowledgePoints"> · {{ props.project.knowledgePoints }}</template></p>
          </div>
        </div>
        <button @click="emit('close')" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 项目说明 -->
      <div v-if="props.project.content || props.project.keyPoints" class="px-6 pt-4">
        <div class="bg-indigo-50/50 rounded-xl p-3.5 text-xs text-indigo-800 space-y-1.5">
          <p v-if="props.project.content"><strong>教学内容：</strong>{{ props.project.content }}</p>
          <p v-if="props.project.keyPoints"><strong>重点/难点：</strong>{{ props.project.keyPoints }}</p>
        </div>
      </div>

      <!-- 5 个内容 Tab -->
      <div class="flex gap-1 px-6 pt-3 border-b border-gray-100 overflow-x-auto">
        <button v-for="sec in sections" :key="sec.key" @click="activeSection = sec.key"
          :class="`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSection === sec.key ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-600'}`">
          <component :is="sec.icon" class="w-4 h-4" />
          {{ sec.label }}
        </button>
      </div>

      <!-- 内容区 -->
      <div class="flex-1 overflow-y-auto px-6 py-5">
        <!-- ===== 1. 预习资料 ===== -->
        <div v-if="activeSection === 'preview'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h5 class="text-sm font-semibold text-gray-700">教师上传的预习资料</h5>
            <span v-if="myProgress('preview')" class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">已完成预习</span>
          </div>
          <div v-if="files.preview.length === 0" class="text-center py-10 text-gray-400 text-sm">暂无预习资料</div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div v-for="(f, i) in files.preview" :key="f.id || i"
              :class="`flex items-center gap-3 p-3 rounded-lg border ${f.dataUrl ? 'border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer' : 'border-gray-100 bg-gray-50'}`"
              @click="markViewed('preview', f)">
              <FileText class="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-800 truncate">{{ f.name }}</p>
                <p class="text-xs text-gray-400">{{ formatFileSize(f.size) }}</p>
              </div>
              <button v-if="f.dataUrl" class="text-xs px-2 py-1 rounded bg-indigo-500 text-white hover:bg-indigo-600" @click.stop="openFileDetail(f.dataUrl)">查看</button>
            </div>
          </div>
          <p class="text-xs text-gray-400">点击资料查看后将自动记录预习进度，教师端可查看同学预习情况。</p>
        </div>

        <!-- ===== 2. 工单 ===== -->
        <div v-if="activeSection === 'workorder'" class="space-y-4">
          <div>
            <h5 class="text-sm font-semibold text-gray-700 mb-2">教师上传的本节课工单</h5>
            <div v-if="files.workorder.length === 0" class="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">暂无工单</div>
            <div v-else class="space-y-2">
              <div v-for="(f, i) in files.workorder" :key="f.id || i" class="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                <FileText class="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-800 truncate">{{ f.name }}</p>
                  <p class="text-xs text-gray-400">{{ formatFileSize(f.size) }}</p>
                </div>
                <button v-if="f.dataUrl" class="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600" @click="openFileDetail(f.dataUrl)">下载</button>
              </div>
            </div>
          </div>

          <div class="border-t border-gray-100 pt-4">
            <div class="flex items-center justify-between mb-2">
              <h5 class="text-sm font-semibold text-gray-700">我的工单提交</h5>
              <span v-if="myWorkorderScore !== null" class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">得分 {{ myWorkorderScore }} 分</span>
            </div>
            <div v-if="mySubmission('workorder')" class="mb-3">
              <div class="flex flex-wrap gap-1.5">
                <span v-for="(f, fi) in mySubmission('workorder')?.attachments || []" :key="fi"
                  :class="`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border ${f.dataUrl ? 'bg-blue-50 text-blue-600 border-blue-100 cursor-pointer' : 'bg-gray-50 text-gray-500 border-gray-200'}`"
                  @click="f.dataUrl && openFileDetail(f.dataUrl)">
                  <FileText class="w-3 h-3" /><span class="max-w-[160px] truncate">{{ f.name }}</span>
                </span>
              </div>
              <p v-if="mySubmission('workorder')?.comment" class="mt-1.5 text-xs text-gray-500">{{ mySubmission('workorder').comment }}</p>
            </div>
            <input ref="workorderInput" type="file" multiple class="hidden" @change="onSubmitFile('workorder', $event)" />
            <div class="flex items-center gap-2">
              <button @click="workorderInput?.click()"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                <Upload class="w-3.5 h-3.5" /> 选择文件{{ myWorkorderDraft.length ? `（${myWorkorderDraft.length} 个）` : '' }}
              </button>
              <button @click="submitWorkorder" :disabled="myWorkorderDraft.length === 0"
                class="px-3.5 py-2 text-xs font-medium rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed">
                提交工单
              </button>
            </div>
            <p class="text-xs text-gray-400 mt-2">下载工单并完成后上传提交，教师批改后可见得分。</p>
          </div>
        </div>

        <!-- ===== 3. 本节课资料 ===== -->
        <div v-if="activeSection === 'material'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h5 class="text-sm font-semibold text-gray-700">教师上传的本节课资料</h5>
            <span v-if="myProgress('material')" class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">已查看</span>
          </div>
          <div v-if="files.material.length === 0" class="text-center py-10 text-gray-400 text-sm">暂无本节课资料</div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div v-for="(f, i) in files.material" :key="f.id || i"
              :class="`flex items-center gap-3 p-3 rounded-lg border ${f.dataUrl ? 'border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer' : 'border-gray-100 bg-gray-50'}`"
              @click="markViewed('material', f)">
              <FileText class="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-800 truncate">{{ f.name }}</p>
                <p class="text-xs text-gray-400">{{ formatFileSize(f.size) }}</p>
              </div>
              <button v-if="f.dataUrl" class="text-xs px-2 py-1 rounded bg-indigo-500 text-white hover:bg-indigo-600" @click.stop="openFileDetail(f.dataUrl)">查看</button>
            </div>
          </div>
          <p class="text-xs text-gray-400">点击资料查看后将自动记录查看情况，教师端可查看同学们的学习情况。</p>
        </div>

        <!-- ===== 4. 测试题目 ===== -->
        <div v-if="activeSection === 'test'" class="space-y-4">
          <div>
            <h5 class="text-sm font-semibold text-gray-700 mb-2">教师上传的测试题目</h5>
            <div v-if="files.test.length === 0" class="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">暂无测试题目</div>
            <div v-else class="space-y-2">
              <div v-for="(f, i) in files.test" :key="f.id || i" class="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                <FileText class="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-800 truncate">{{ f.name }}</p>
                  <p class="text-xs text-gray-400">{{ formatFileSize(f.size) }}</p>
                </div>
                <button v-if="f.dataUrl" class="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600" @click="openFileDetail(f.dataUrl)">查看题目</button>
              </div>
            </div>
          </div>

          <div class="border-t border-gray-100 pt-4">
            <div class="flex items-center justify-between mb-2">
              <h5 class="text-sm font-semibold text-gray-700">我的测试作答</h5>
              <span v-if="myTestScore !== null" class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">得分 {{ myTestScore }} 分</span>
            </div>
            <div v-if="mySubmission('test')" class="mb-3">
              <div class="flex flex-wrap gap-1.5">
                <span v-for="(f, fi) in mySubmission('test')?.attachments || []" :key="fi"
                  :class="`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border ${f.dataUrl ? 'bg-blue-50 text-blue-600 border-blue-100 cursor-pointer' : 'bg-gray-50 text-gray-500 border-gray-200'}`"
                  @click="f.dataUrl && openFileDetail(f.dataUrl)">
                  <FileText class="w-3 h-3" /><span class="max-w-[160px] truncate">{{ f.name }}</span>
                </span>
              </div>
              <p v-if="mySubmission('test')?.comment" class="mt-1.5 text-xs text-gray-500 whitespace-pre-wrap bg-gray-50 rounded-lg px-2.5 py-1.5">{{ mySubmission('test').comment }}</p>
            </div>
            <textarea v-model="testAnswer" rows="3" placeholder="填写你的答案（选填，可上传作答文件）"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"></textarea>
            <input ref="testInput" type="file" multiple class="hidden" @change="onSubmitFile('test', $event)" />
            <div class="flex items-center gap-2 mt-2">
              <button @click="testInput?.click()"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                <Upload class="w-3.5 h-3.5" /> 选择作答文件{{ myTestDraft.length ? `（${myTestDraft.length} 个）` : '' }}
              </button>
              <button @click="submitTest" :disabled="myTestDraft.length === 0 && !testAnswer.trim()"
                class="px-3.5 py-2 text-xs font-medium rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed">
                提交测试
              </button>
            </div>
            <p class="text-xs text-gray-400 mt-2">完成测试题目后提交作答，教师批改后可见得分与评价。</p>
          </div>

          <div class="border-t border-gray-100 pt-4">
            <div class="mb-3">
              <h5 class="text-sm font-semibold text-gray-700">评价</h5>
              <p class="text-xs text-gray-400 mt-1">完成个人自评、小组内互评、小组间互评，并在此查看教师评价和企业导师评价。</p>
            </div>
            <div class="mb-4 space-y-2">
              <div v-for="record in projectTeacherEvalRecords" :key="record.id" class="rounded-lg border border-gray-200 bg-white/70 p-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-gray-800">{{ EvalTypeLabels[record.type] }}</span>
                  <span class="text-sm font-bold text-indigo-600">{{ record.score }} 分</span>
                </div>
                <div v-if="record.items?.length" class="mt-2 grid grid-cols-1 gap-1">
                  <div v-for="(item, ii) in record.items" :key="ii" class="flex items-center justify-between text-xs text-gray-600">
                    <span>{{ item.label }}</span>
                    <span>{{ item.score }} / {{ item.max ?? '—' }}</span>
                  </div>
                </div>
              </div>
              <p v-if="projectTeacherEvalRecords.length === 0" class="text-xs text-gray-400">教师或企业导师评价后，会在此显示分数。</p>
            </div>
            <StudentEvaluation
              v-if="courseId && myStudentId"
              :course-id="courseId"
              :student-id="myStudentId"
              :student-name="currentStudentName"
              :session-number="projectEvalSession"
            />
          </div>
          <div class="border-t border-gray-100 pt-4">
            <h5 class="mb-2 text-xs font-semibold text-gray-500">本任务评价雷达（五项能力百分制均分）</h5>
            <RadarChart
              :labels="studentRadarData.labels"
              :values="studentRadarData.values"
              :count="studentRadarData.count"
              empty-text="暂无分项评价数据，评分后自动生成雷达图。"
            />
          </div>
        </div>

        <!-- ===== 5. 评教 ===== -->
        <div v-if="activeSection === 'eval'" class="space-y-4">
          <div v-if="!questionnaire" class="text-center py-10 text-gray-400 text-sm">教师尚未发布评教问卷</div>
          <div v-else-if="myResponse" class="text-center py-10">
            <CheckCircle class="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <p class="text-sm font-medium text-gray-700">已完成评教填写</p>
            <p class="text-xs text-gray-400 mt-1">感谢你的反馈，提交时间：{{ formatTime(myResponse.createdAt) }}</p>
          </div>
          <div v-else>
            <h5 class="text-sm font-semibold text-gray-700 mb-1">{{ questionnaire.title }}</h5>
            <p v-if="questionnaire.builtin" class="text-xs text-gray-400 mb-3">教师尚未发布专属问卷，以下为课程统一评教指标（每项 1-10 分，直接填写）</p>
            <div v-else class="mb-3"></div>
            <div class="space-y-4">
              <div v-for="(q, qi) in questionnaire.questions || []" :key="qi" class="p-4 rounded-xl border border-gray-100">
                <p class="text-sm text-gray-800 mb-2">{{ qi + 1 }}. {{ q.text }}</p>
                <template v-if="q.type === 'rating'">
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="1"
                      :value="evalAnswers[qi] ?? ''"
                      @input="setRatingAnswer(qi, $event)"
                      placeholder="填写1-10"
                      class="w-28 rounded-lg border border-gray-200 px-3 py-2 text-center text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-300/20"
                    />
                    <span class="text-xs text-gray-400">分（1-10）</span>
                  </div>
                </template>
                <template v-else-if="q.type === 'single'">
                  <div class="flex flex-wrap gap-2">
                    <button v-for="(opt, oi) in q.options || []" :key="oi" @click="evalAnswers[qi] = opt"
                      :class="`px-3 py-1.5 text-sm rounded-lg border transition-all ${evalAnswers[qi] === opt ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`">
                      {{ opt }}
                    </button>
                  </div>
                </template>
                <template v-else>
                  <textarea v-model="evalAnswers[qi]" rows="2" placeholder="请输入你的评价"
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"></textarea>
                </template>
              </div>
            </div>
            <div class="flex justify-end mt-4">
              <button @click="submitEval" :disabled="!evalFormValid"
                class="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed">
                提交评教
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { X, FileText, Upload, CheckCircle, BookOpen, Wrench, ClipboardCheck, FileQuestion, Star, GitBranch } from 'lucide-vue-next'
import StudentEvaluation from '@/components/StudentEvaluation.vue'
import RadarChart from '@/components/RadarChart.vue'
import { javaListProjectFiles, javaUpsertProjectProgress, javaListProjectProgress, javaGetQuestionnaire, javaListEvalResponses, javaSubmitEvalResponse } from '@/api/knowledgeGraph'
import { useAppStore } from '@/stores/app'
import { EvalTypeLabels } from '@/types'
import { computeRadarData } from '@/lib/evalRadar'
import { createBuiltinEvalQuestionnaire } from '@/lib/evalQuestionnaire'

const props = defineProps<{
  project: any
  courseId: string
  myStudentId: string
}>()
const emit = defineEmits<{ (e: 'close'): void }>()
const store = useAppStore()

const currentStudentName = computed(() => {
  const found = store.students.find((student) => student.id === props.myStudentId)
  return found?.name || store.currentUser || ''
})
const projectEvalSession = computed(() => Number(props.project?.orderNo ?? 0) + 1)
const projectTeacherEvalRecords = computed(() =>
  store.evaluations.filter(
    (e) => e.courseId === props.courseId && e.studentId === props.myStudentId &&
      e.sessionNumber === projectEvalSession.value && (e.type === 'teacher' || e.type === 'mentor')
  )
)
const studentRadarData = computed(() =>
  computeRadarData(
    store.evaluations.filter(
      (e) => e.courseId === props.courseId && e.studentId === props.myStudentId &&
        e.sessionNumber === projectEvalSession.value
    )
  )
)

const sections = [
  { key: 'preview', label: '预习资料', icon: BookOpen },
  { key: 'workorder', label: '工单', icon: Wrench },
  { key: 'material', label: '本节课资料', icon: ClipboardCheck },
  { key: 'test', label: '测试题目', icon: FileQuestion },
  { key: 'eval', label: '评教', icon: Star },
]
const activeSection = ref('preview')

// ===== 文件 =====
const files = ref<Record<string, any[]>>({ preview: [], workorder: [], material: [], test: [] })
async function loadFiles() {
  const types = ['preview', 'workorder', 'material', 'test'] as const
  for (const t of types) {
    try {
      const list: any = await javaListProjectFiles(props.project.id, t)
      files.value[t] = Array.isArray(list) ? list : []
    } catch {
      files.value[t] = []
    }
  }
}

// ===== 我的进度 =====
const myProgressList = ref<any[]>([])
async function loadProgress() {
  try {
    const list: any = await javaListProjectProgress(props.project.id)
    myProgressList.value = Array.isArray(list) ? list.filter((r) => r.studentId === props.myStudentId) : []
  } catch {
    myProgressList.value = []
  }
}
const myProgress = (type: string) => myProgressList.value.find((r) => r.progressType === type)
const mySubmission = (type: string) => myProgress(type)
const myWorkorderScore = computed(() => {
  const r = myProgress('workorder')
  return r?.score != null ? Number(r.score) : null
})
const myTestScore = computed(() => {
  const r = myProgress('test')
  return r?.score != null ? Number(r.score) : null
})

/** 查看资料并自动记录预习/资料查看进度 */
async function markViewed(type: string, f: any) {
  if (!f.dataUrl) return
  openFileDetail(f.dataUrl)
  if (myProgress(type)) return
  try {
    await javaUpsertProjectProgress(props.project.id, {
      studentId: props.myStudentId,
      progressType: type,
      status: 'viewed',
    })
    await loadProgress()
  } catch { /* 静默失败不影响查看 */ }
}

// ===== 工单/测试提交 =====
const workorderInput = ref<HTMLInputElement | null>(null)
const testInput = ref<HTMLInputElement | null>(null)
const workorderDraft = ref<{ name: string; size: number; dataUrl: string }[]>([])
const testDraft = ref<{ name: string; size: number; dataUrl: string }[]>([])
const testAnswer = ref('')
const myWorkorderDraft = computed(() => workorderDraft.value)
const myTestDraft = computed(() => testDraft.value)

function onSubmitFile(type: string, e: Event) {
  const input = e.target as HTMLInputElement
  const fileList = input.files
  if (!fileList || fileList.length === 0) return
  const target = type === 'workorder' ? workorderDraft.value : testDraft.value
  Array.from(fileList).forEach((file) => {
    const reader = new FileReader()
    reader.onload = () => {
      target.push({ name: file.name, size: file.size, dataUrl: String(reader.result) })
    }
    reader.readAsDataURL(file)
  })
  input.value = ''
}

async function submitWorkorder() {
  if (workorderDraft.value.length === 0) return
  try {
    await javaUpsertProjectProgress(props.project.id, {
      studentId: props.myStudentId,
      progressType: 'workorder',
      status: 'submitted',
      attachments: workorderDraft.value,
    })
    workorderDraft.value = []
    await loadProgress()
    alert('工单提交成功')
  } catch (err: any) { alert('提交失败：' + (err.message || err)) }
}

async function submitTest() {
  if (testDraft.value.length === 0 && !testAnswer.value.trim()) return
  try {
    await javaUpsertProjectProgress(props.project.id, {
      studentId: props.myStudentId,
      progressType: 'test',
      status: 'submitted',
      comment: testAnswer.value.trim() || undefined,
      attachments: testDraft.value.length ? testDraft.value : undefined,
    })
    testDraft.value = []
    testAnswer.value = ''
    await loadProgress()
    alert('测试提交成功')
  } catch (err: any) { alert('提交失败：' + (err.message || err)) }
}

// ===== 评教 =====
/** 系统内置评教指标（来自《评教指标.docx》），教师未发布问卷时作为默认问卷展示 */
const BUILTIN_EVAL_QUESTIONS = [
  { type: 'rating', text: '教学准备充分，教学内容契合课程目标' },
  { type: 'rating', text: '授课逻辑清晰，重难点突出，易于理解' },
  { type: 'rating', text: '教学节奏适宜，课程难度设置合理' },
  { type: 'rating', text: '教学方法恰当，注重启发学生独立思考' },
  { type: 'rating', text: '注重师生互动，课堂氛围良好' },
  { type: 'rating', text: '教学态度端正，对待学生友善，答疑耐心' },
  { type: 'rating', text: '课程学习任务布置科学合理' },
  { type: 'rating', text: '对学习任务能够给出反馈讲解' },
  { type: 'rating', text: '课堂管理到位，维持良好课堂秩序' },
  { type: 'rating', text: '课程学习能够带来知识或能力提升' },
]

/** 内置问卷按课程隔离 id，保证各课程评教记录互不影响 */
function builtinQuestionnaire() {
  return {
    id: `qnr-builtin-${props.courseId}`,
    title: '课程评教指标',
    questions: BUILTIN_EVAL_QUESTIONS.map((q) => ({ ...q })),
    builtin: true,
  }
}

const questionnaire = ref<any>(null)
const myResponse = ref<any>(null)
const evalAnswers = ref<Record<number, any>>({})

const evalFormValid = computed(() => {
  const qs = questionnaire.value?.questions || []
  if (qs.length === 0) return false
  return qs.every((q: any, i: number) => {
    if (q.type === 'text') return String(evalAnswers.value[i] || '').trim() !== ''
    if (q.type === 'rating') {
      const value = Number(evalAnswers.value[i])
      return Number.isFinite(value) && value >= 1 && value <= 10
    }
    return evalAnswers.value[i] !== undefined && evalAnswers.value[i] !== ''
  })
})

function setRatingAnswer(index: number, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  evalAnswers.value[index] = raw === '' ? '' : Number(raw)
}

async function loadQuestionnaire() {
  myResponse.value = null
  evalAnswers.value = {}
  questionnaire.value = createBuiltinEvalQuestionnaire(props.courseId)
  try {
    const list: any = await javaListEvalResponses(questionnaire.value.id)
    const arr = Array.isArray(list) ? list : []
    myResponse.value = arr.find((r) => r.studentId === props.myStudentId) || null
  } catch {
    myResponse.value = null
  }
}

async function submitEval() {
  try {
    await javaSubmitEvalResponse(questionnaire.value.id, {
      studentId: props.myStudentId,
      answers: Object.keys(evalAnswers.value).sort((a, b) => Number(a) - Number(b)).map((k) => evalAnswers.value[Number(k)]),
    })
    await loadQuestionnaire()
    alert('评教提交成功，感谢你的反馈')
  } catch (err: any) { alert('提交失败：' + (err.message || err)) }
}

// ===== 工具 =====
function openFileDetail(dataUrl: string) {
  const w = window.open('', '_blank')
  if (w) w.document.write(`<iframe src="${dataUrl}" style="width:100%;height:100%;border:none"></iframe>`)
}
function formatFileSize(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`
}
function formatTime(t?: string) {
  if (!t) return ''
  const d = new Date(String(t).includes('T') ? String(t) : String(t).replace(' ', 'T'))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadFiles()
  loadProgress()
  loadQuestionnaire()
})

watch(() => props.project?.id, () => {
  if (!props.project?.id) return
  activeSection.value = 'preview'
  loadFiles()
  loadProgress()
  loadQuestionnaire()
})
</script>
