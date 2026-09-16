<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">学员名单</h1>
      <p class="text-gray-400 mt-1">查看你所授课程下的学员</p>
    </div>

    <div class="flex flex-wrap gap-4">
      <div class="relative flex-1 min-w-[200px] max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input v-model="search" type="text" placeholder="搜索学员..."
          class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-brand-400/30 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none text-sm" />
      </div>
      <select v-model="selectedCourse"
        class="px-4 py-2.5 rounded-lg border border-brand-400/30 focus:border-brand-600 outline-none text-sm bg-white">
        <option value="all">全部课程</option>
        <option v-for="c in myCourses" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>

    <div v-else class="bg-white rounded-xl border border-brand-400/20 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-brand-400/10 border-b border-brand-400/20">
              <th class="text-left px-6 py-3 text-sm font-medium text-gray-400">学员</th>
              <th class="text-left px-6 py-3 text-sm font-medium text-gray-400">学号</th>
              <th class="text-left px-6 py-3 text-sm font-medium text-gray-400">课程</th>
              <th class="text-left px-6 py-3 text-sm font-medium text-gray-400">课程内班级</th>
              <th class="text-left px-6 py-3 text-sm font-medium text-gray-400">学习进度</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-brand-400/20">
            <tr v-for="row in displayRows" :key="row.key" class="hover:bg-brand-400/10 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-brand-600/15 flex items-center justify-center">
                    <span class="text-xs font-medium text-gray-600">{{ (row.name || '?').charAt(0) }}</span>
                  </div>
                  <span class="font-medium text-gray-900">{{ row.name }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">{{ row.studentNo || '-' }}</td>
              <td class="px-6 py-4 text-sm text-gray-600">{{ row.courseTitle }}</td>
              <td class="px-6 py-4 text-sm text-gray-600">{{ row.courseClassName || '未分班' }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex-1 bg-brand-400/10 rounded-full h-2 max-w-[120px]">
                    <div class="h-full rounded-full bg-brand-600 transition-all" :style="{ width: `${row.progress}%` }" />
                  </div>
                  <span class="text-xs font-medium text-gray-600 w-14">
                    {{ row.progress }}%
                    <span class="text-gray-400">{{ statusLabels[row.progressStatus] || '' }}</span>
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="displayRows.length === 0" class="text-center py-8 text-gray-400">暂无数据</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { fetchCourseStudents, fetchTeacherCourses } from '@/api'
import { Search } from 'lucide-vue-next'

/**
 * 教师端学员名单。
 *
 * ⚠️ 数据全部来自接口，**不读 store**：
 * 本页此前没有任何网络请求，只从 store.courses/enrollments/students 取数 ——
 * 更早时 store 初值是 mock（假 id，和真实课程对不上），会显示并不存在的学员；
 * store 改为空之后，直接进入本页就什么都看不到。
 *
 * ⚠️ 进度为**只读展示**：由后端 `/courses/:id/students` 按排课时间实时推算
 * （与 /students/:id/courses 共用 server/lib/scheduleProgress.js，口径一致）。
 * 原来的 +10/-10 按钮调 store.updateEnrollment，**只写 localStorage、不落库**，
 * 而且后端从不读 enrollments.progress 列，刷新即丢，属于假操作，故改为只读。
 */
const store = useAppStore()

/** 进度状态（后端按排课时间实时推算，与 /students/:id/courses 同口径） */
const statusLabels: Record<string, string> = {
  enrolled: '未开课',
  in_progress: '学习中',
  completed: '已结课',
}

const loading = ref(true)
const search = ref('')
const selectedCourse = ref('all')

/** 教师本人课程（接口数据） */
const myCourses = ref<any[]>([])
/** 课程 id → 学员行 */
const rowsByCourse = ref<Record<string, any[]>>({})

const myCourseIds = computed(() => myCourses.value.map((c) => String(c.id)))

const allRows = computed(() =>
  myCourseIds.value.flatMap((courseId) =>
    (rowsByCourse.value[courseId] || []).map((student: any) => ({
      key: `${courseId}::${student.id}`,
      name: student.name || '',
      studentNo: student.studentId || student.student_no || '',
      courseId,
      courseTitle: titleById.value[courseId] || '未知课程',
      courseClassName: student.courseClassName ?? '',
      progress: Number(student.progress ?? 0),
      progressStatus: student.progressStatus || '',
    }))
  )
)

const titleById = computed(() =>
  Object.fromEntries(myCourses.value.map((c) => [String(c.id), c.title || '']))
)

const displayRows = computed(() =>
  allRows.value.filter((row) => {
    if (selectedCourse.value !== 'all' && row.courseId !== selectedCourse.value) return false
    const keyword = search.value.trim()
    return !keyword || row.name.includes(keyword) || row.studentNo.includes(keyword)
  })
)

onMounted(() => {
  void loadCourses()
})

watch(selectedCourse, () => {
  // 切到具体课程时按需加载该课学员；「全部课程」时确保所有课程都加载过
  void loadMissingStudents()
})

async function loadCourses() {
  loading.value = true
  try {
    const res = await fetchTeacherCourses(store.currentUser || '')
    myCourses.value = res?.success ? res.courses || [] : []
    await loadMissingStudents()
  } catch (error) {
    console.error('加载教师课程失败:', error)
    myCourses.value = []
  } finally {
    loading.value = false
  }
}

/** 拉取尚未加载的课程学员（每门课一次请求） */
async function loadMissingStudents() {
  const targets =
    selectedCourse.value === 'all'
      ? myCourseIds.value
      : [selectedCourse.value].filter((id) => myCourseIds.value.includes(id))

  await Promise.all(
    targets
      .filter((courseId) => !rowsByCourse.value[courseId])
      .map(async (courseId) => {
        try {
          const res = await fetchCourseStudents(courseId)
          rowsByCourse.value = {
            ...rowsByCourse.value,
            [courseId]: res?.success ? res.students || [] : [],
          }
        } catch (error) {
          console.error(`加载课程 ${courseId} 的学员失败:`, error)
        }
      })
  )
}
</script>
