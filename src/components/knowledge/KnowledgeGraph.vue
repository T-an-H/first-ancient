<template>
  <div class="space-y-6">
    <!-- 顶部：上传授课计划表 / 新增项目 -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-2">
          <Network class="w-5 h-5 text-indigo-500" />
          <h2 class="font-semibold text-gray-900">知识图谱</h2>
          <span class="text-xs text-gray-400">{{ displayProjects.length }} 个任务 · 每 2 学时一个任务</span>
        </div>
        <div v-if="canManage" class="flex items-center gap-2">
          <button @click="openUploadModal"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors">
            <Upload class="w-3.5 h-3.5" /> 上传课程标准
          </button>
          <button @click="openProjectModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors">
            <Plus class="w-3.5 h-3.5" /> 新增任务
          </button>
        </div>
      </div>

      <!-- 说明 -->
      <div class="mt-3 flex items-start gap-2 px-3 py-2.5 bg-indigo-50/60 rounded-lg text-xs text-indigo-600">
        <Info class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <p v-if="canManage">
          上传课程标准文件（支持 PDF / Word / Excel / PPT / 图片等），上传后自动同步到学生端「课程标准」板块，学生可在线查看与下载。
        </p>
        <p v-else>
          教师上传的课程标准文件可在「课程标准」标签页中查看与下载。
        </p>
      </div>

      <!-- 导入结果提示 -->
      <div v-if="importMsg" :class="`mt-3 text-sm p-3 rounded-lg ${importMsg.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`">
        {{ importMsg.text }}
      </div>

      <!-- 已上传的课程标准文件列表 -->
      <div v-if="standards.length > 0" class="mt-3 space-y-2">
        <div v-for="f in standards" :key="f.id"
          class="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg group hover:bg-indigo-400/5 transition-colors">
          <FileText class="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span class="flex-1 min-w-0 truncate text-xs text-gray-700">{{ f.name }}</span>
          <span class="text-[10px] text-gray-400 flex-shrink-0">{{ formatFileSize(f.size) }}</span>
          <span class="text-[10px] text-gray-400 flex-shrink-0">{{ formatDateTime(f.createdAt) }}</span>
          <a :href="f.dataUrl" :download="f.name"
            class="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 flex-shrink-0" title="查看/下载">
            <Download class="w-4 h-4" />
          </a>
          <button v-if="canManage" @click="deleteStandard(f)"
            class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 flex-shrink-0" title="删除">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 知识图谱泡泡连线图 -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold text-gray-900">任务地图</h3>
          <span class="text-xs text-gray-400">泡泡大小 = 学时 · 点击名称进入任务详情</span>
        </div>
        <div class="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span class="inline-block w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300"></span> 未开始
          <span class="inline-block w-3 h-3 rounded-full bg-indigo-400 ml-2"></span> 已布置资料
          <span class="inline-block w-3 h-3 rounded-full bg-emerald-500 ml-2"></span> 有学生完成
        </div>
      </div>

      <div v-if="displayProjects.length === 0" class="text-center py-14">
        <div class="w-20 h-20 mx-auto mb-3 rounded-full bg-indigo-50 flex items-center justify-center">
          <Network class="w-10 h-10 text-indigo-300" />
        </div>
        <p class="text-sm text-gray-500">暂无任务</p>
        <p class="text-xs text-gray-400 mt-1">点击「新增任务」手动创建任务</p>
      </div>

      <div v-else class="relative overflow-x-auto">
        <svg :width="chartWidth" :height="chartHeight" class="min-w-full">
          <!-- 连接线 -->
          <line v-for="(l, i) in linkLines" :key="'l' + i"
            :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
            :stroke="l.active ? '#6366f1' : '#e2e8f0'" stroke-width="2" :stroke-dasharray="l.active ? 'none' : '5 4'" />
          <!-- 箭头 -->
          <circle v-for="(l, i) in linkLines" :key="'a' + i"
            :cx="l.x2" :cy="l.y2" r="3.5" :fill="l.active ? '#6366f1' : '#cbd5e1'" />

          <!-- 泡泡 -->
          <g v-for="p in bubbles" :key="p.id" :transform="`translate(${p.x}, ${p.y})`" class="cursor-pointer" @click="openProjectDetail(p.raw)">
            <circle :r="p.r" :fill="p.fill" :stroke="p.stroke" stroke-width="2" class="transition-all hover:opacity-80" />
            <text text-anchor="middle" :y="-4" class="select-none" font-size="13" font-weight="600" :fill="p.textColor">{{ p.label }}</text>
            <text text-anchor="middle" :y="12" class="select-none" font-size="10" :fill="p.textColor" opacity="0.75">{{ p.subLabel }}</text>
          </g>
        </svg>
      </div>
    </div>

    <!-- 项目列表（可管理） -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <ListChecks class="w-5 h-5 text-gray-400" />
          <h3 class="font-semibold text-gray-900">任务列表</h3>
        </div>
      </div>
      <div v-if="displayProjects.length === 0" class="text-center py-8 text-gray-400 text-sm">暂无任务</div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div v-for="(p, i) in displayProjects" :key="p.id" @click="openProjectDetail(p)"
          class="group flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-indigo-400/40 hover:bg-indigo-400/5 transition-colors cursor-pointer">
          <div class="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-500 flex-shrink-0">{{ i + 1 }}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ p.name }}</p>
            <p class="text-xs text-gray-400 mt-0.5 truncate">{{ p.hours }} 学时<template v-if="p.knowledgePoints"> · {{ p.knowledgePoints }}</template></p>
          </div>
          <div v-if="canManage" class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button @click.stop="openProjectModal(p)" class="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="编辑">
              <Pencil class="w-4 h-4" />
            </button>
            <button @click.stop="deleteProject(p)" class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="删除">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 项目详情弹窗：教师版 / 学生版 -->
    <ProjectDetailModal v-if="!studentMode && selectedProject" :project="selectedProject" :course-id="courseId" :students="students" :can-manage="canManage" :eval-type="evalType || 'teacher'" @close="selectedProject = null" />
    <StudentProjectModal v-else-if="studentMode && selectedProject" :project="selectedProject" :course-id="courseId" :my-student-id="myStudentId" @close="selectedProject = null" />

    <!-- 上传课程标准弹窗 -->
    <div v-if="showUploadModal" class="fixed inset-0 z-[70] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="showUploadModal = false" />
      <div class="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">上传课程标准</h3>
          <button @click="showUploadModal = false" class="p-1 text-gray-400 hover:text-gray-600"><X class="w-5 h-5" /></button>
        </div>
        <p class="text-xs text-gray-500 mb-3">支持 PDF / Word / Excel / PPT / 图片等常见格式，单个文件不超过 8MB。上传后将同步到学生端「课程标准」板块。</p>
        <div class="border border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400/60 hover:bg-indigo-400/5 transition-colors"
          @click="planFileInput?.click()" @dragover.prevent @drop.prevent="onPlanDrop">
          <Upload class="w-6 h-6 mx-auto text-gray-400 mb-1.5" />
          <p class="text-xs text-gray-500">点击或拖拽文件到此处上传</p>
          <p class="text-[10px] text-gray-400 mt-1">上传后学生端立即可见</p>
        </div>
        <input ref="planFileInput" type="file" class="hidden" @change="onPlanFileChange" />
        <div v-if="planFile" class="mt-3 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <FileText class="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span class="flex-1 min-w-0 truncate">{{ planFile.name }}</span>
          <span class="text-gray-400">{{ formatFileSize(planFile.size) }}</span>
        </div>
        <div v-if="uploadError" class="mt-3 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{{ uploadError }}</div>
        <div class="flex items-center justify-end gap-2 mt-5">
          <button @click="showUploadModal = false" class="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
          <button @click="confirmUpload" :disabled="!planFile || importing"
            class="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg disabled:opacity-50">
            {{ importing ? '上传中…' : '上传' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑项目弹窗 -->
    <div v-if="showProjectModal" class="fixed inset-0 z-[70] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="showProjectModal = false" />
      <div class="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">{{ editingProjectId ? '编辑任务' : '新增任务' }}</h3>
          <button @click="showProjectModal = false" class="p-1 text-gray-400 hover:text-gray-600"><X class="w-5 h-5" /></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">任务名称 <span class="text-red-500">*</span></label>
            <input v-model="projectForm.name" type="text" placeholder="例如：React 组件化开发" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">学时</label>
              <input v-model.number="projectForm.hours" type="number" min="1" max="20" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">周次（可选）</label>
              <input v-model="projectForm.weekNo" type="text" placeholder="如 1-2" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">可见层次</label>
            <div class="flex flex-wrap gap-2">
              <label v-for="tier in tierOptions" :key="tier" class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs">
                <input v-model="projectForm.visibleTiers" type="checkbox" :value="tier" class="accent-indigo-600" />
                {{ TierLabels[tier] }}
              </label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">教学内容</label>
            <textarea v-model="projectForm.content" rows="2" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">重点/难点</label>
            <textarea v-model="projectForm.keyPoints" rows="2" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">知识点</label>
            <textarea v-model="projectForm.knowledgePoints" rows="2" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 mt-5">
          <button @click="showProjectModal = false" class="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
          <button @click="saveProject" :disabled="!projectForm.name.trim()" class="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Network, Upload, Plus, X, Pencil, Trash2, Info, ListChecks, FileText, Download } from 'lucide-vue-next'
import ProjectDetailModal from './ProjectDetailModal.vue'
import StudentProjectModal from './StudentProjectModal.vue'
import { javaListProjects, javaAddProjectsBulk, javaAddProject, javaUpdateProject, javaDeleteProject, javaListProjectFiles, javaListProjectProgress, javaListCourseStandards, javaAddCourseStandard, javaDeleteCourseStandard } from '@/api/knowledgeGraph'
import { useAppStore } from '@/stores/app'
import { TierLabels } from '@/types'
import type { LearningTier } from '@/types'

const props = defineProps<{
  courseId: string
  students: { id: string; name: string; studentId?: string; className?: string }[]
  canManage?: boolean
  /** 学生端模式：点击项目打开学生版操作弹窗 */
  studentMode?: boolean
  /** 学生内部 ID（stu-xxx），学生端模式下必传 */
  myStudentId?: string
  evalType?: 'teacher' | 'mentor'
}>()
const store = useAppStore()
const tierOptions: LearningTier[] = ['basic', 'advanced', 'excellent']

// ===== 项目数据 =====
const projects = ref<any[]>([])
const displayProjects = computed(() => {
  if (!props.studentMode) return projects.value
  const tier = props.myStudentId
    ? store.getStudentTier(props.courseId, props.myStudentId)?.tier ?? 'basic'
    : 'basic'
  return projects.value.filter((p) => {
    const visible = Array.isArray(p.visibleTiers) ? p.visibleTiers : []
    return visible.length === 0 || visible.includes(tier)
  })
})
const selectedProject = ref<any>(null)
const importMsg = ref<{ success: boolean; text: string } | null>(null)

async function loadProjects() {
  try {
    const list: any = await javaListProjects(props.courseId)
    const arr = Array.isArray(list) ? list : []
    // 并行拉取每个项目的文件数与进度数（用于泡泡状态配色）
    await Promise.all(
      arr.map(async (p: any) => {
        try {
          const [filesArr, progArr] = await Promise.all([
            javaListProjectFiles(p.id),
            javaListProjectProgress(p.id),
          ])
          p._fileCount = (Array.isArray(filesArr) ? filesArr : []).length
          p._progressCount = (Array.isArray(progArr) ? progArr : []).length
        } catch {
          p._fileCount = 0
          p._progressCount = 0
        }
      })
    )
    projects.value = arr
  } catch {
    projects.value = []
  }
}
onMounted(() => {
  loadProjects()
  loadStandards()
})

// ===== 课程标准上传 =====
const showUploadModal = ref(false)
const planFileInput = ref<any>(null)
const planFile = ref<File | null>(null)
const uploadError = ref('')
const importing = ref(false)
const standards = ref<any[]>([])
/** 与后端 express.json({ limit: '12mb' ) 对齐：base64 约膨胀 4/3，文件限制 8MB */
const MAX_FILE_SIZE = 8 * 1024 * 1024

async function loadStandards() {
  try {
    const list: any = await javaListCourseStandards(props.courseId)
    standards.value = Array.isArray(list) ? list : []
  } catch {
    standards.value = []
  }
}

function openUploadModal() {
  planFile.value = null
  uploadError.value = ''
  showUploadModal.value = true
}
function onPlanDrop(e: DragEvent) {
  const file = e.dataTransfer?.files[0]
  if (file) planFile.value = file
}
function onPlanFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) planFile.value = file
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

async function confirmUpload() {
  if (!planFile.value) return
  if (planFile.value.size > MAX_FILE_SIZE) {
    uploadError.value = '文件超过 8MB，请压缩后再上传'
    return
  }
  importing.value = true
  uploadError.value = ''
  try {
    const dataUrl = await readAsDataUrl(planFile.value)
    await javaAddCourseStandard({
      courseId: props.courseId,
      name: planFile.value.name,
      size: planFile.value.size,
      dataUrl,
    })
    showUploadModal.value = false
    await loadStandards()
    importMsg.value = { success: true, text: `课程标准「${planFile.value.name}」上传成功，已同步到学生端` }
    setTimeout(() => (importMsg.value = null), 4000)
  } catch (err: any) {
    uploadError.value = '上传失败：' + (err.message || err)
  } finally {
    importing.value = false
  }
}

async function deleteStandard(f: any) {
  if (!confirm(`确定删除课程标准「${f.name}」？学生端将不再可见。`)) return
  try {
    await javaDeleteCourseStandard(f.id)
    await loadStandards()
  } catch (err: any) {
    alert('删除失败：' + (err.message || err))
  }
}

// ===== 项目 CRUD =====
const showProjectModal = ref(false)
const editingProjectId = ref<string | null>(null)
const projectForm = ref<any>({ name: '', hours: 2, content: '', keyPoints: '', knowledgePoints: '', weekNo: '', visibleTiers: [...tierOptions] })

function openProjectModal(p?: any) {
  editingProjectId.value = p?.id ?? null
  projectForm.value = p
    ? { name: p.name, hours: p.hours || 2, content: p.content || '', keyPoints: p.keyPoints || '', knowledgePoints: p.knowledgePoints || '', weekNo: p.weekNo || '', visibleTiers: p.visibleTiers?.length ? p.visibleTiers : [...tierOptions] }
    : { name: '', hours: 2, content: '', keyPoints: '', knowledgePoints: '', weekNo: '', visibleTiers: [...tierOptions] }
  showProjectModal.value = true
}
async function saveProject() {
  if (!projectForm.value.name.trim()) return
  const payload = {
    courseId: props.courseId,
    name: projectForm.value.name.trim(),
    hours: projectForm.value.hours || 2,
    content: projectForm.value.content || '',
    keyPoints: projectForm.value.keyPoints || '',
    knowledgePoints: projectForm.value.knowledgePoints || '',
    weekNo: projectForm.value.weekNo || '',
    visibleTiers: projectForm.value.visibleTiers?.length ? projectForm.value.visibleTiers : [...tierOptions],
  }
  try {
    if (editingProjectId.value) {
      await javaUpdateProject(editingProjectId.value, payload)
    } else {
      await javaAddProject({ ...payload, orderNo: projects.value.length })
    }
    showProjectModal.value = false
    await loadProjects()
  } catch (err: any) {
    alert('保存失败：' + (err.message || err))
  }
}
async function deleteProject(p: any) {
  if (!confirm(`确定删除任务「${p.name}」？其文件与进度记录会一并删除。`)) return
  try {
    await javaDeleteProject(p.id)
    await loadProjects()
  } catch (err: any) {
    alert('删除失败：' + (err.message || err))
  }
}

function openProjectDetail(p: any) {
  selectedProject.value = p
}

// ===== 泡泡图布局 =====
const COLS = 6
const COL_W = 170
const ROW_H = 150
const R = 34
const chartWidth = computed(() => Math.max(600, Math.min(COLS, bubbles.value.length) * COL_W + 40))
const chartHeight = computed(() => Math.max(220, Math.ceil(bubbles.value.length / COLS) * ROW_H + 60))

/** 泡泡节点：蛇形布局 + 状态颜色 */
const bubbles = computed(() => {
  return displayProjects.value.map((p, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const x = 40 + col * COL_W
    const y = 50 + row * ROW_H + (col % 2 === 1 ? 30 : 0)
    const r = R + Math.min(10, (p.hours || 2) * 1.5)
    const hasProgress = p._progressCount > 0
    const hasFiles = p._fileCount > 0
    const fill = hasProgress ? '#10b981' : hasFiles ? '#6366f1' : '#eef2ff'
    const stroke = hasProgress ? '#059669' : hasFiles ? '#4f46e5' : '#c7d2fe'
    const textColor = hasProgress || hasFiles ? '#ffffff' : '#4338ca'
    return {
      id: p.id,
      raw: p,
      x, y, r, fill, stroke, textColor,
      label: p.name || `任务 ${i + 1}`,
      subLabel: `${p.hours || 2}学时`,
    }
  })
})

/** 连接线：按顺序连接相邻泡泡（含箭头圆点） */
const linkLines = computed(() => {
  const arr: { x1: number; y1: number; x2: number; y2: number; active: boolean }[] = []
  for (let i = 0; i < bubbles.value.length - 1; i++) {
    const a = bubbles.value[i]
    const b = bubbles.value[i + 1]
    arr.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, active: true })
  }
  return arr
})

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`
}

function formatDateTime(value: any) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

defineExpose({ loadProjects })
</script>
