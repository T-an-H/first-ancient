<template>
  <div class="space-y-6">
    <!-- 标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">课程总览</h1>
        <p class="text-gray-400 mt-1">查看本学院的所有课程信息{{ usingMockData ? '（演示模式）' : '（数据来源：MySQL）' }}</p>
      </div>
      <div class="flex items-center gap-2 text-xs" :class="loading ? 'text-amber-500' : usingMockData ? 'text-blue-500' : 'text-green-500'">
        <span class="w-2 h-2 rounded-full" :class="loading ? 'bg-amber-500 animate-pulse' : usingMockData ? 'bg-blue-500' : 'bg-green-500'"></span>
        {{ loading ? '加载中...' : usingMockData ? `演示数据 · ${courses.length} 门课程` : `已连接 · ${courses.length} 门课程` }}
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-brand-600/10 flex items-center justify-center">
          <BookOpen class="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p class="text-xs text-gray-400">总课程数</p>
          <p class="text-xl font-bold text-gray-900">{{ courses.length }}</p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-green-600/10 flex items-center justify-center">
          <Play class="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p class="text-xs text-gray-400">进行中</p>
          <p class="text-xl font-bold text-gray-900">{{ activeCount }}</p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-lg bg-gray-400/10 flex items-center justify-center">
          <CheckCircle class="w-5 h-5 text-gray-500" />
        </div>
        <div>
          <p class="text-xs text-gray-400">已结束</p>
          <p class="text-xl font-bold text-gray-900">{{ inactiveCount }}</p>
        </div>
      </div>
    </div>

    <!-- 搜索框 -->
    <div class="relative max-w-md">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input v-model="searchText" type="text" placeholder="搜索课程名称或教师..."
        class="w-full pl-9 pr-4 py-2.5 border border-brand-400/20 rounded-lg text-sm bg-white focus:border-brand-400 outline-none" />
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-12 text-gray-400">
      <LoaderCircle class="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
      <span>加载中...</span>
    </div>

    <!-- 课程按分类分板块展示（卡片式） -->
    <div v-else class="space-y-8">
      <section v-for="group in groupedCourses" :key="group.categoryName">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-1 h-4 rounded-full bg-blue-500"></span>
          <h2 class="text-base font-semibold text-gray-800">{{ group.categoryName }}</h2>
          <span class="text-xs text-gray-400">{{ group.courses.length }} 门</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="course in group.courses" :key="course.id"
            @click="goDetail(course.id)"
            class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-4 hover:shadow-md transition-all cursor-pointer">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                <BookOpen class="w-5 h-5 text-white" />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-semibold text-gray-900 truncate">{{ course.title }}</h3>
                <p class="text-xs text-gray-400 mt-0.5 truncate">
                  {{ course.teacher }} · {{ course.duration }}学时 · {{ course.credits }}学分
                </p>
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between">
              <span class="text-xs text-gray-400">{{ course.createdAt }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full" :class="course.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'">
                {{ course.status === 'active' ? '进行中' : course.status === 'draft' ? '草稿' : '已结束' }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div v-if="filteredCourses.length === 0" class="text-center py-12 text-gray-400">
        暂无课程数据
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, BookOpen, Play, CheckCircle, LoaderCircle } from 'lucide-vue-next'
import { fetchDepartmentCourses } from '@/api'
import { useAppStore } from '@/stores/app'
import { getStoredUserDepartment } from '@/lib/studentSession'

const store = useAppStore()
const router = useRouter()

const courses = ref<any[]>([])
const loading = ref(true)
const searchText = ref('')
const usingMockData = ref(false)

const activeCount = computed(() => filteredCourses.value.filter((c: any) => c.status === 'active').length)
const inactiveCount = computed(() => filteredCourses.value.filter((c: any) => c.status !== 'active').length)

const filteredCourses = computed(() => {
  if (!searchText.value.trim()) return courses.value
  const q = searchText.value.trim().toLowerCase()
  return courses.value.filter((c: any) =>
    c.title.toLowerCase().includes(q) || (c.teacher && c.teacher.toLowerCase().includes(q))
  )
})

function getCategoryName(categoryId: string): string {
  const cat = store.categories.find((c: any) => c.id === categoryId)
  return cat?.name || '未分类'
}

/** 按课程分类分板块（优先课程自带 categoryName，退回按 categoryId 查分类表） */
const groupedCourses = computed(() => {
  const groups = new Map<string, any[]>()
  for (const course of filteredCourses.value as any[]) {
    const name =
      String(course.categoryName || '').trim() ||
      getCategoryName(course.categoryId)
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name)!.push(course)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === '未分类') return 1
      if (b === '未分类') return -1
      return a.localeCompare(b, 'zh-CN')
    })
    .map(([categoryName, courses]) => ({ categoryName, courses }))
})

/** 进入课程只读详情（领导端仅查看） */
function goDetail(courseId: string) {
  router.push(`/leader/courses/${courseId}`)
}

async function loadCourses() {
  loading.value = true
  usingMockData.value = false
  // 按当前登录领导所属学院查询（登录时后端返回的 user.department），
  // 此前写死为「计算机学院」，其他学院的领导永远拿不到本学院课程。
  const dept = getStoredUserDepartment()
  try {
    if (!dept) throw new Error('当前账号未设置所属学院')
    const res = await fetchDepartmentCourses(dept)
    if (res.success && res.courses && res.courses.length > 0) {
      courses.value = res.courses
    } else {
      throw new Error('No data from API')
    }
  } catch (e) {
    console.warn('API加载课程失败，改用本地课程数据:', e)
    usingMockData.value = true
    // 后端接口不可用时退回 store 里的课程（同样按学院过滤）
    courses.value = store.getLeaderCourses()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCourses()
})
</script>
