<template>
  <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>
  <div v-else-if="!student" class="text-center py-12 text-gray-400">学生不存在</div>
  <div v-else class="space-y-6">
    <div class="flex items-center gap-4">
      <router-link to="/admin/students" class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <ArrowLeft class="w-5 h-5 text-gray-500" />
      </router-link>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ student.name }}</h1>
        <p class="text-gray-500 mt-1">{{ student.studentId }} · {{ student.className }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <h3 class="text-sm font-semibold text-gray-800">已选课程</h3>
        <div v-for="enroll in enrolledCourses" :key="enroll.courseId" class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3">
              <BookOpen class="w-5 h-5 text-blue-500" />
              <span class="font-medium text-gray-900">{{ enroll.courseTitle }}</span>
            </div>
            <span class="text-xs text-gray-400">{{ enroll.progress }}%</span>
          </div>
          <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-blue-500 transition-all" :style="{ width: `${enroll.progress}%` }" />
          </div>
        </div>
        <div v-if="enrolledCourses.length === 0" class="text-center py-8 text-gray-400">该学生尚未选课</div>
      </div>

      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-fit">
        <h3 class="text-sm font-semibold text-gray-800 mb-3">个人资料</h3>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">学号</span>
            <span class="font-medium">{{ student.studentId }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">姓名</span>
            <span class="font-medium">{{ student.name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">班级</span>
            <span class="font-medium">{{ student.className }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">状态</span>
            <span :class="student.status === 'active' ? 'text-green-600' : 'text-red-600'">
              {{ student.status === 'active' ? '正常' : '禁用' }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">邮箱</span>
            <span class="font-medium">{{ student.email || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">电话</span>
            <span class="font-medium">{{ student.phone || '-' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchStudentCourses, fetchStudents } from '@/api'
import { ArrowLeft, BookOpen } from 'lucide-vue-next'

/**
 * 学生详情（管理员端）。
 *
 * ⚠️ 数据全部来自接口，**不读 store**。
 *
 * 本页此前没有任何网络请求，只从 store.students / store.enrollments 取数：
 * - 更早时 store 初值是 mock，会把并不存在的学生/选课当成真的显示；
 * - store 改为空之后，直接进入本页（没有别的页面先替它加载）就什么都看不到。
 * 现在自行拉取，数据始终是库里的真实记录。
 */
const route = useRoute()

const loading = ref(true)
const student = ref<any>(null)
/** 接口返回的选课记录（进度由服务端按排课日期实时计算） */
const enrollments = ref<any[]>([])
/** courseId → 课程标题（选课记录只带 courseId，标题在同响应的 courses 里） */
const courseTitleById = ref<Record<string, string>>({})

const studentId = computed(() => String(route.params.id || ''))

const enrolledCourses = computed(() =>
  enrollments.value.map((enrollment) => {
    const courseId = String(enrollment.courseId || '')
    return {
      courseId,
      courseTitle: courseTitleById.value[courseId] || '未知课程',
      progress: Number(enrollment.progress ?? 0),
    }
  }),
)

onMounted(() => {
  void loadStudent()
})

async function loadStudent() {
  loading.value = true
  try {
    const id = studentId.value
    if (!id) return

    // 学生基础信息：按主键/学号精确匹配（列表接口支持大页一次取回）
    const listRes = await fetchStudents({ pageSize: '500' })
    const rows: any[] = listRes?.success ? listRes.students || [] : []
    student.value =
      rows.find((row) => String(row.id) === id) ||
      rows.find((row) => String(row.studentId || row.student_id) === id) ||
      null

    if (!student.value) return

    // 已选课程 + 进度（服务端按排课日期实时算，不是本地缓存）
    const courseRes = await fetchStudentCourses(String(student.value.id))
    if (courseRes?.success) {
      courseTitleById.value = Object.fromEntries(
        (courseRes.courses || []).map((course: any) => [String(course.id), course.title || ''])
      )
      enrollments.value = courseRes.enrollments || []
    }
  } catch (error) {
    console.error('加载学生详情失败:', error)
  } finally {
    loading.value = false
  }
}
</script>
