<template>
  <div class="space-y-6">
    <!-- 标题 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">学员总览</h1>
      <p class="text-gray-400 mt-1">查看管辖学院的所有学员信息</p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-brand-600/10 flex items-center justify-center">
          <Users class="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p class="text-xs text-gray-400">总学员数</p>
          <p class="text-xl font-bold text-gray-900">{{ filteredStudents.length }}</p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-brand-600/10 flex items-center justify-center">
          <UserCheck class="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p class="text-xs text-gray-400">活跃学员</p>
          <p class="text-xl font-bold text-gray-900">{{ activeCount }}</p>
        </div>
      </div>
    </div>

    <!-- 搜索 + 班级过滤 -->
    <div class="flex flex-wrap gap-3">
      <div class="relative flex-1 min-w-[200px] max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="searchText" type="text" placeholder="搜索学员姓名或学号..."
          class="w-full pl-9 pr-4 py-2.5 rounded-lg border border-brand-400/30 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none text-sm" />
      </div>
      <select v-model="selectedClass"
        class="px-4 py-2.5 rounded-lg border border-brand-400/30 focus:border-brand-600 outline-none text-sm bg-white">
        <option value="">全部班级</option>
        <option v-for="cls in classList" :key="cls" :value="cls">{{ cls }}</option>
      </select>
    </div>

    <!-- 按班级分组的学员列表 -->
    <div v-for="cls in filteredClassList" :key="cls" class="space-y-3">
      <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <Users class="w-4 h-4 text-brand-600" />
        {{ cls }}
        <span class="text-xs font-normal text-gray-400">（{{ groupedStudents[cls]?.length }}人）</span>
      </h3>

      <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="bg-brand-400/10 border-b border-brand-400/20">
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">姓名</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">学号</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">手机</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">邮箱</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">入学成绩</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in groupedStudents[cls]" :key="s.id"
              class="border-b border-gray-50 hover:bg-brand-400/10 transition-colors cursor-pointer"
              @click="openDetail(s)">
              <!-- 姓名（可点击） -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-3" @click.stop="openDetail(s)">
                  <div class="w-8 h-8 rounded-full bg-brand-600/15 flex items-center justify-center">
                    <span class="text-xs font-bold text-gray-600">{{ s.name[0] }}</span>
                  </div>
                  <span class="text-sm font-medium text-brand-600 hover:underline">{{ s.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ s.studentId || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ s.phone }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ s.email }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ s.enrollmentScore ?? '-' }}</td>
              <td class="px-4 py-3">
                <span class="text-xs px-2 py-1 rounded-full"
                  :class="s.status === 'active' ? 'bg-brand-600/10 text-gray-600' : 'bg-brand-400/10 text-gray-400'">
                  {{ s.status === 'active' ? '活跃' : '不活跃' }}
                </span>
              </td>
            </tr>
            <tr v-if="!groupedStudents[cls]?.length">
              <td colspan="6" class="px-4 py-12 text-center text-gray-400">暂无学员数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="filteredClassList.length === 0" class="text-center py-12 text-gray-400">
      无匹配的学员数据
    </div>

    <!-- 学员详情弹窗 -->
    <Modal :is-open="detailModalOpen" :on-close="closeDetail" :title="detailStudent?.name || '学员详情'" max-width="max-w-2xl">
      <div v-if="detailStudent" class="space-y-6">
        <!-- 基本信息 -->
        <div class="bg-brand-400/5 rounded-xl p-4">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-full bg-brand-600/15 flex items-center justify-center">
              <span class="text-lg font-bold text-gray-600">{{ detailStudent.name[0] }}</span>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ detailStudent.name }}</h3>
              <p class="text-sm text-gray-400">{{ detailStudent.studentId }} · {{ detailStudent.className }}</p>
            </div>
            <span class="ml-auto text-xs px-2 py-1 rounded-full"
              :class="detailStudent.status === 'active' ? 'bg-brand-600/10 text-gray-600' : 'bg-brand-400/10 text-gray-400'">
              {{ detailStudent.status === 'active' ? '活跃' : '不活跃' }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="flex justify-between border-b border-brand-400/10 pb-1">
              <span class="text-gray-400">电话</span>
              <span class="font-medium text-gray-800">{{ detailStudent.phone || '-' }}</span>
            </div>
            <div class="flex justify-between border-b border-brand-400/10 pb-1">
              <span class="text-gray-400">邮箱</span>
              <span class="font-medium text-gray-800">{{ detailStudent.email || '-' }}</span>
            </div>
            <div class="flex justify-between border-b border-brand-400/10 pb-1">
              <span class="text-gray-400">入学成绩</span>
              <span class="font-medium text-gray-800">{{ detailStudent.enrollmentScore ?? '-' }}</span>
            </div>
            <div class="flex justify-between border-b border-brand-400/10 pb-1">
              <span class="text-gray-400">入学日期</span>
              <span class="font-medium text-gray-800">{{ detailStudent.joinDate || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 已选课程 -->
        <div>
          <h4 class="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BookOpen class="w-4 h-4 text-brand-600" />
            已选课程（{{ studentEnrollments.length }}门）
          </h4>
          <div v-if="studentEnrollments.length === 0" class="text-center py-6 text-gray-400 text-sm">
            该学生尚未选课
          </div>
          <div v-for="enroll in studentEnrollments" :key="enroll.courseId"
            class="border border-brand-400/20 rounded-lg p-3 mb-2 last:mb-0">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-gray-800">{{ getCourseName(enroll.courseId) }}</span>
            </div>
            <div class="text-sm">
              <template v-if="getFinalScore(detailStudent!.id, enroll.courseId) !== null">
                <span class="font-semibold text-brand-600">{{ getFinalScore(detailStudent!.id, enroll.courseId) }}分</span>
                <span class="text-gray-400 ml-1">（最终成绩）</span>
              </template>
              <template v-else-if="getRegularScore(detailStudent!.id, enroll.courseId)">
                <span class="font-semibold text-gray-700">{{ getRegularScore(detailStudent!.id, enroll.courseId) }}分</span>
                <span class="text-gray-400 ml-1">（平时成绩，待最终评定）</span>
              </template>
              <template v-else>
                <span class="text-gray-400">成绩未出</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { fetchDepartmentStudents } from '@/api'
import { getStoredUserDepartment } from '@/lib/studentSession'
import { Search, Users, UserCheck, BookOpen } from 'lucide-vue-next'
import Modal from '@/components/Modal.vue'
import type { Student } from '@/types'

const store = useAppStore()

// ===== 数据 =====
/**
 * 学员列表。
 *
 * 优先使用后端按学院查询的结果（真实数据）；
 * 接口不可用时退回 store.getLeaderStudents()（同样按当前登录用户的学院过滤），
 * 保证页面不会空白。
 */
const remoteStudents = ref<Student[] | null>(null)
const allStudents = computed<Student[]>(() =>
  remoteStudents.value ?? store.getLeaderStudents()
)

onMounted(async () => {
  const dept = getStoredUserDepartment()
  if (!dept) return
  try {
    const res = await fetchDepartmentStudents(dept)
    if (res.success && Array.isArray(res.students)) {
      remoteStudents.value = res.students
    }
  } catch (e) {
    console.warn('学员总览：接口加载失败，改用本地数据:', e)
  }
})

const activeCount = computed(() => filteredStudents.value.filter((s) => s.status === 'active').length)

// ===== 搜索和过滤 =====
const searchText = ref('')
const selectedClass = ref('')

const classList = computed(() => {
  const set = new Set(allStudents.value.map((s) => s.className).filter(Boolean))
  return [...set].sort()
})

const filteredStudents = computed(() => {
  let list = allStudents.value
  if (selectedClass.value) {
    list = list.filter((s) => s.className === selectedClass.value)
  }
  if (searchText.value.trim()) {
    const q = searchText.value.trim().toLowerCase()
    list = list.filter((s) => s.name.toLowerCase().includes(q) || s.studentId?.toLowerCase().includes(q))
  }
  return list
})

const groupedStudents = computed(() => {
  const map: Record<string, Student[]> = {}
  for (const s of filteredStudents.value) {
    const cls = s.className || '未分类'
    if (!map[cls]) map[cls] = []
    map[cls].push(s)
  }
  return map
})

const filteredClassList = computed(() => Object.keys(groupedStudents.value).sort())

// ===== 详情弹窗 =====
const detailModalOpen = ref(false)
const detailStudent = ref<Student | null>(null)

function openDetail(s: Student) {
  detailStudent.value = s
  detailModalOpen.value = true
}

function closeDetail() {
  detailModalOpen.value = false
  detailStudent.value = null
}

const studentEnrollments = computed(() => {
  if (!detailStudent.value) return []
  return store.enrollments.filter((e) => e.studentId === detailStudent.value!.id)
})

function getCourseName(courseId: string): string {
  return store.courses.find((c) => c.id === courseId)?.title || '未知'
}

/** 获取学生某课程的最终成绩（grade.score + 素质评价计入分），若未出则返回 null */
function getFinalScore(studentId: string, courseId: string): number | null {
  const g = store.grades.find((g) => g.studentId === studentId && g.courseId === courseId)
  if (g?.score == null) return null
  return Math.min(100, g.score + store.getStudentQualityScore(courseId, studentId))
}

/** 获取学生某课程的平时成绩（detailedGrade 中所有已评子项按权重计算），用于最终成绩未出时展示 */
function getRegularScore(studentId: string, courseId: string): number | null {
  const dg = store.detailedGrades.find((d) => d.studentId === studentId && d.courseId === courseId)
  if (!dg) return null
  const cfg = store.getGradeConfig(courseId)
  const regularSubs: { score: number | undefined; weight: number }[] = [
    { score: dg.selfEvalScore, weight: cfg.selfEvalWeight },
    { score: dg.peerReviewScore, weight: cfg.peerReviewWeight },
    { score: dg.interGroupScore, weight: cfg.interGroupEvalWeight },
    { score: dg.teacherScore, weight: cfg.teacherScoreWeight },
    { score: dg.mentorScore, weight: cfg.mentorScoreWeight },
  ]
  const valid = regularSubs.filter((s) => s.score !== undefined && s.weight > 0)
  if (valid.length === 0) return null
  const weightedSum = valid.reduce((sum, s) => sum + (s.score ?? 0) * s.weight, 0)
  const totalWeight = valid.reduce((sum, s) => sum + s.weight, 0)
  if (totalWeight === 0) return null
  return Math.round(weightedSum / totalWeight * cfg.regularWeight / 100)
}
</script>
