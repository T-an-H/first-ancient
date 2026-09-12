<template>
  <div class="space-y-6">
    <template v-if="!selectedCategory">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">专业管理</h1>
          <p class="mt-1 text-gray-500">
            当前学院：<span class="font-medium text-gray-700">{{ currentDepartmentName || '未选择学院' }}</span>
            · 点击专业查看该专业下课程
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="openCategoryModal(null)"
            class="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <Plus class="h-4 w-4" /> 新建专业
          </button>
          <button
            @click="switchDepartment"
            class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <RefreshCw class="h-4 w-4" /> 切换学院
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="cat in visibleCategories"
          :key="cat.id"
          class="group cursor-pointer rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          @click="selectCategory(cat)"
        >
          <div class="mb-3 flex items-start justify-between">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg" :style="{ backgroundColor: cat.color }">
              <BookOpen class="h-5 w-5 text-white" />
            </div>
            <div class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button @click.stop="openCategoryModal(cat)" class="rounded px-2 py-1 text-xs text-blue-500 transition-colors hover:bg-blue-50">编辑</button>
              <button @click.stop="handleDeleteCategory(cat)" class="rounded px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-50">删除</button>
            </div>
          </div>
          <h3 class="font-semibold text-gray-900">{{ cat.name }}</h3>
          <p class="mt-1 text-xs text-gray-400">{{ getDepartmentName(cat.departmentId) }}</p>
          <p class="mt-1 text-xs text-gray-400">{{ getCourseCount(cat.id) }} 门课程</p>
        </div>
        <div v-if="visibleCategories.length === 0" class="col-span-full py-20 text-center text-gray-400">
          <BookOpen class="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>当前学院暂无专业，点击上方按钮新建</p>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="mb-2 flex items-center gap-3">
        <button
          @click="backToCategoryList"
          class="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          <ArrowLeft class="h-4 w-4" /> 返回专业列表
        </button>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg" :style="{ backgroundColor: selectedCategory.color }">
            <BookOpen class="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ selectedCategory.name }}</h1>
            <p class="mt-1 text-gray-500">
              {{ getDepartmentName(selectedCategory.departmentId) }} · {{ filteredCourses.length }} 门课程
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="openCategoryModal(selectedCategory)"
            class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-blue-500 transition-colors hover:bg-blue-50"
          >
            <PenLine class="h-4 w-4" /> 编辑专业
          </button>
          <button
            @click="handleDeleteCategory(selectedCategory)"
            class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-50"
          >
            <Trash2 class="h-4 w-4" /> 删除专业
          </button>
          <button
            @click="openCourseModal(null)"
            class="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <Plus class="h-4 w-4" /> 新建课程
          </button>
        </div>
      </div>

      <div class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchText"
          type="text"
          placeholder="搜索课程名称..."
          class="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">课程名称</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">学期</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">教师</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">状态</th>
              <th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="course in filteredCourses"
              :key="course.id"
              class="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50"
              @click="openCourseSchedules(course)"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg" :style="{ backgroundColor: selectedCategory.color }">
                    <BookOpen class="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ course.title }}</p>
                    <p class="text-xs text-gray-400">{{ course.id }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ course.semester || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ course.teacher || '-' }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-1 text-xs" :class="statusClass(course.status)">
                  {{ statusLabel(course.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button @click.stop="openCourseModal(course)" class="mr-3 text-xs text-blue-500 hover:underline">编辑</button>
                <button @click.stop="handleDeleteCourse(course)" class="text-xs text-red-400 hover:underline">删除</button>
              </td>
            </tr>
            <tr v-if="filteredCourses.length === 0">
              <td colspan="4" class="px-4 py-12 text-center text-gray-400">暂无课程数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="showCategoryModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showCategoryModal = false" />
        <div class="relative mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <h3 class="mb-4 text-lg font-semibold text-gray-900">{{ editingCategory ? '编辑专业' : '新建专业' }}</h3>
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">专业名称</label>
              <input v-model="categoryForm.name" type="text" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">所属学院</label>
              <select v-model="categoryForm.departmentId" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="">请选择学院</option>
                <option v-for="department in departments" :key="department.id" :value="department.id">
                  {{ department.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">颜色</label>
              <div class="flex gap-2">
                <input v-model="categoryForm.color" type="color" class="h-10 w-10 cursor-pointer rounded" />
                <span class="self-center text-sm text-gray-500">{{ categoryForm.color }}</span>
              </div>
            </div>
            <div class="flex gap-3 pt-2">
              <button @click="handleSaveCategory" class="flex-1 rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600">保存</button>
              <button @click="showCategoryModal = false" class="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200">取消</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showCourseModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="closeCourseModal" />
        <div class="relative mx-4 flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white p-8 shadow-2xl">
          <h3 class="mb-8 text-2xl font-bold text-gray-900">{{ editingCourse ? '编辑课程' : '新增排课' }}</h3>

          <div class="flex-1 space-y-6 overflow-y-auto pr-2">
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">课程名称</label>
              <input
                v-model="courseForm.title"
                type="text"
                placeholder="请输入课程名称"
                class="w-full rounded-xl border border-gray-200 px-5 py-4 text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <p class="mt-2 text-sm text-gray-400">默认使用专业名称，也可以在此修改课程名称</p>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">授课教师</label>
              <input
                v-model="courseForm.teacher"
                list="category-course-teachers"
                type="text"
                placeholder="从列表选择或输入教师姓名"
                class="w-full rounded-xl border border-gray-200 px-5 py-4 text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <p class="mt-2 text-sm text-gray-400">教师须为教师管理中已存在的人员，否则课程不会出现在该教师端</p>
              <datalist id="category-course-teachers">
                <option v-for="teacher in courseTeacherOptions" :key="teacher.id" :value="teacher.name">{{ teacher.name }}</option>
              </datalist>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">企业导师</label>
              <input
                v-model="courseForm.mentor"
                type="text"
                placeholder="选填"
                class="w-full rounded-xl border border-gray-200 px-5 py-4 text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <p class="mt-2 text-sm text-gray-400">选填，将同步到课程的导师分配</p>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">学期</label>
              <select
                v-model="courseForm.semester"
                @change="onSemesterChange"
                class="w-full rounded-xl border border-gray-200 bg-white px-5 py-4 text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option v-for="sem in semesterOptions" :key="sem" :value="sem">{{ sem }}</option>
              </select>
              <p class="mt-2 text-sm text-gray-400">选择学期后自动填充起止日期（可手动调整）</p>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">开始时间</label>
                <input
                  v-model="courseForm.startDate"
                  type="date"
                  class="w-full rounded-xl border border-gray-200 px-5 py-4 text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">结束时间</label>
                <input
                  v-model="courseForm.endDate"
                  type="date"
                  class="w-full rounded-xl border border-gray-200 px-5 py-4 text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">总课时</label>
                <input
                  v-model.number="courseForm.duration"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="填写总课时"
                  class="w-full rounded-xl border border-gray-200 px-5 py-4 text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">学分</label>
                <input
                  v-model.number="courseForm.credits"
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="填写学分"
                  class="w-full rounded-xl border border-gray-200 px-5 py-4 text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div v-if="dateRangeWarning" class="text-sm text-red-500">
              {{ dateRangeWarning }}
            </div>

            <div>
              <label class="mb-3 block text-sm font-medium text-gray-700">
                选择上课时间（单击空格多选，地点选填，可填写在各格子内）
              </label>
              <div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-200 bg-gray-50">
                      <th class="w-[140px] border-r border-gray-200 p-3 text-left font-medium text-gray-400"></th>
                      <th v-for="day in dayLabels" :key="day" class="p-3 text-center font-medium text-gray-500">{{ day }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="slot in timeSlots" :key="slot.label" class="border-b border-gray-100 last:border-b-0">
                      <td class="border-r border-gray-100 p-3 text-center text-gray-400">{{ slot.label }}</td>
                      <td v-for="day in dayLabels" :key="`${day}-${slot.label}`" class="border-r border-gray-100 p-2 last:border-r-0">
                        <div
                          v-if="getSelectedSlot(dayLabels.indexOf(day), slot.start, slot.end)"
                          class="relative min-h-[72px] rounded-xl border-2 border-blue-300 bg-blue-50"
                        >
                          <input
                            v-model="getSelectedSlot(dayLabels.indexOf(day), slot.start, slot.end)!.room"
                            @click.stop
                            placeholder="地点"
                            class="h-full min-h-[68px] w-full bg-transparent px-2 text-center text-sm text-blue-700 outline-none placeholder:text-blue-300"
                          />
                        </div>
                        <button
                          v-else
                          type="button"
                          @click="handleSlotClick(day, slot)"
                          class="flex min-h-[72px] w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-lg text-gray-300 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-500"
                        >
                          +
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="selectedSlots.length" class="space-y-2">
              <div class="text-sm text-gray-400">已选时段</div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="(slot, index) in selectedSlots"
                  :key="`${slot.dayLabel}-${slot.start}-${slot.end}`"
                  class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700"
                >
                  {{ slot.dayLabel }} {{ slot.start }}-{{ slot.end }}
                  <span v-if="slot.room" class="font-medium">{{ slot.room }}</span>
                  <button type="button" @click="selectedSlots.splice(index, 1)" class="text-blue-400 transition-colors hover:text-blue-600">
                    <X class="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            </div>

            <div v-if="conflictWarning" class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <AlertTriangle class="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{{ conflictWarning }}</span>
            </div>
          </div>

          <div class="mt-8 flex justify-end gap-3">
            <button @click="closeCourseModal" class="rounded-lg px-4 py-2 text-base text-gray-500 transition-colors hover:bg-gray-50">取消</button>
            <button
              @click="handleSaveCourse"
              :disabled="!canSaveCourse"
              class="rounded-lg bg-blue-500 px-6 py-2 text-base font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              {{ editingCourse ? '保存修改' : '确认添加' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next'
import {
  bulkImportSchedules,
  createCategory,
  createCourse,
  deleteCategory,
  deleteCourse,
  fetchCategories,
  fetchClasses,
  fetchCourses,
  fetchDepartments,
  fetchSchedules,
  fetchTeachers,
  updateCategory,
  updateCourse,
  updateSchedule,
} from '@/api'
import { getSemesterOf } from '@/lib/date'
import type { Category, Course, Department, Schedule, Teacher } from '@/types'

type CategoryRow = Category & {
  departmentName?: string
}

type ClassItem = {
  id: string
  name: string
  departmentId: string
  departmentName?: string
  studentCount?: number
}

type CourseFormState = {
  title: string
  description: string
  categoryId: string
  teacher: string
  mentor: string
  semester: string
  startDate: string
  endDate: string
  duration: number | ''
  credits: number | ''
}

type SlotSelection = {
  dayIdx: number
  dayLabel: string
  start: string
  end: string
  room: string
}

const store = useAppStore()
const route = useRoute()
const router = useRouter()

const departments = ref<Department[]>([...store.departments])
const teachers = ref<Teacher[]>([...store.teachers])
const apiCategories = ref<CategoryRow[]>(store.categories.map((category) => ({ ...category })))
const apiCourses = ref<Course[]>([...store.courses])
const apiClasses = ref<ClassItem[]>([])
const apiSchedules = ref<Schedule[]>([])

const selectedCategory = ref<CategoryRow | null>(null)
const searchText = ref('')

const showCategoryModal = ref(false)
const editingCategory = ref<CategoryRow | null>(null)
const categoryForm = ref({
  name: '',
  color: '#3b82f6',
  departmentId: '',
})

const showCourseModal = ref(false)
const editingCourse = ref<Course | null>(null)
const courseTarget = ref<Course | null>(null)
const editingSchedule = ref<Schedule | null>(null)
const courseForm = ref<CourseFormState>(createCourseFormState())
const selectedSlots = ref<SlotSelection[]>([])

const hasLoadedData = ref(false)

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const timeSlots = [
  { label: '08:00-10:00', start: '08:00', end: '10:00' },
  { label: '10:15-12:15', start: '10:15', end: '12:15' },
  { label: '14:00-16:00', start: '14:00', end: '16:00' },
  { label: '16:15-18:15', start: '16:15', end: '18:15' },
  { label: '19:00-21:00', start: '19:00', end: '21:00' },
]

const routeDepartmentId = computed(() => (typeof route.query.departmentId === 'string' ? route.query.departmentId : ''))
const routeCategoryId = computed(() => (typeof route.query.categoryId === 'string' ? route.query.categoryId : ''))
const departmentList = computed(() => (departments.value.length > 0 ? departments.value : store.departments))
const categoryList = computed<CategoryRow[]>(() => (apiCategories.value.length > 0 ? apiCategories.value : store.categories.map((category) => ({ ...category }))))
const teacherList = computed(() => (teachers.value.length > 0 ? teachers.value : store.teachers))
const activeDepartmentId = computed(() => routeDepartmentId.value || store.selectedDepartmentId || '')

const currentDepartment = computed(() => {
  if (!activeDepartmentId.value) return null
  return departmentList.value.find((department) => department.id === activeDepartmentId.value) || null
})

const currentDepartmentName = computed(() => currentDepartment.value?.name || '')

const visibleCategories = computed(() => {
  if (!activeDepartmentId.value) return []
  return categoryList.value
    .filter((category) => category.departmentId === activeDepartmentId.value)
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
})

const filteredCourses = computed(() => {
  if (!selectedCategory.value) return []

  const keyword = searchText.value.trim().toLowerCase()
  return apiCourses.value
    .filter((course) => {
      if (!courseBelongsToCategory(course, selectedCategory.value!)) return false
      if (!keyword) return true
      return course.title.toLowerCase().includes(keyword)
    })
    .sort((left, right) => {
      const currentName = selectedCategory.value?.name || ''
      const leftPrimary = normalizeOptionalValue(left.title) === normalizeOptionalValue(currentName)
      const rightPrimary = normalizeOptionalValue(right.title) === normalizeOptionalValue(currentName)
      if (leftPrimary !== rightPrimary) {
        return leftPrimary ? -1 : 1
      }
      return left.title.localeCompare(right.title, 'zh-Hans-CN')
    })
})

const courseTeacherOptions = computed(() => {
  const departmentId = selectedCategory.value?.departmentId || activeDepartmentId.value
  if (!departmentId) return []
  return teacherList.value
    .filter((teacher) => teacher.departmentId === departmentId)
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
})

const dateRangeWarning = computed(() => {
  if (!courseForm.value.startDate || !courseForm.value.endDate) return ''
  return courseForm.value.endDate < courseForm.value.startDate ? '结束时间不能早于开始时间' : ''
})

// ===== 学期选择 =====

/** 学期选项：上一年至下一年的春秋学期（如 2025春季 ~ 2027秋季） */
const semesterOptions = computed(() => {
  const year = new Date().getFullYear()
  const list: string[] = []
  for (let y = year - 1; y <= year + 1; y++) {
    list.push(`${y}春季学期`, `${y}秋季学期`)
  }
  return list
})

/** 学期 → 起止日期（与教师端 getSemesterOf 的划分保持一致：2-7月春、8-1月秋） */
function semesterDateRange(semester: string): { start: string; end: string } | null {
  const match = semester.match(/^(\d{4})(春季|秋季)学期$/)
  if (!match) return null
  const year = Number(match[1])
  return match[2] === '春季'
    ? { start: `${year}-02-24`, end: `${year}-07-15` }
    : { start: `${year}-09-01`, end: `${year + 1}-01-31` }
}

/** 切换学期时自动填充起止日期 */
function onSemesterChange() {
  const range = semesterDateRange(courseForm.value.semester)
  if (range) {
    courseForm.value.startDate = range.start
    courseForm.value.endDate = range.end
  }
}

const conflictWarning = computed(() => {
  const teacherName = normalizeOptionalValue(courseForm.value.teacher)

  if (!selectedSlots.value.length) return ''

  for (const slot of selectedSlots.value) {
    const timeSlot = `${slot.start}-${slot.end}`
    const roomName = normalizeOptionalValue(slot.room)
    const conflict = apiSchedules.value.find((schedule) => {
      if (editingSchedule.value && schedule.id === editingSchedule.value.id) {
        return false
      }

      if (getScheduleDayLabel(schedule) !== slot.dayLabel) return false
      if (!timesOverlap(schedule.timeSlot, timeSlot)) return false

      const sameTeacher = teacherName && normalizeOptionalValue(schedule.teacher) === teacherName
      const sameRoom = roomName && normalizeOptionalValue(schedule.room) === roomName

      return Boolean(sameTeacher || sameRoom)
    })

    if (!conflict) continue

    if (teacherName && normalizeOptionalValue(conflict.teacher) === teacherName) {
      return `授课教师「${teacherName}」在 ${slot.dayLabel} ${timeSlot} 已有排课`
    }

    if (roomName && normalizeOptionalValue(conflict.room) === roomName) {
      return `地点「${roomName}」在 ${slot.dayLabel} ${timeSlot} 已被占用`
    }
  }

  return ''
})

const canSaveCourse = computed(() => {
  return Boolean(
    selectedCategory.value &&
    courseForm.value.title.trim() &&
    courseForm.value.categoryId &&
    courseForm.value.teacher.trim() &&
    courseForm.value.startDate &&
    courseForm.value.endDate &&
    !dateRangeWarning.value &&
    !conflictWarning.value &&
    typeof courseForm.value.duration === 'number' &&
    courseForm.value.duration > 0 &&
    typeof courseForm.value.credits === 'number' &&
    courseForm.value.credits > 0 &&
    selectedSlots.value.length > 0,
  )
})

onMounted(() => {
  syncDepartmentFromRoute()
  void loadData()
})

watch(
  () => routeDepartmentId.value,
  () => {
    syncDepartmentFromRoute()
  },
  { immediate: true },
)

watch(
  () => [
    activeDepartmentId.value,
    routeCategoryId.value,
    categoryList.value.map((category) => `${category.id}:${category.departmentId}`).join('|'),
  ].join('||'),
  () => {
    syncSelectedCategory()
  },
  { immediate: true },
)

async function loadData() {
  try {
    const [departmentRes, teacherRes, categoryRes, courseRes, classRes, scheduleRes] = await Promise.all([
      fetchDepartments(),
      fetchTeachers(),
      fetchCategories(),
      fetchCourses(),
      fetchClasses(),
      fetchSchedules(),
    ])

    if (departmentRes.success) {
      departments.value = departmentRes.departments
      store.departments = departmentRes.departments
    }

    if (teacherRes.success) {
      teachers.value = teacherRes.teachers
      store.teachers = teacherRes.teachers
    }

    if (categoryRes.success) {
      apiCategories.value = categoryRes.categories
      store.categories = categoryRes.categories
    }

    if (courseRes.success) {
      apiCourses.value = courseRes.courses
      store.courses = courseRes.courses
    }

    if (classRes.success) {
      apiClasses.value = classRes.classes
    }

    if (scheduleRes.success) {
      apiSchedules.value = scheduleRes.schedules
    }

    ensureDepartmentStillExists()
    syncSelectedCategory()
  } catch (error) {
    console.error('加载分类数据失败:', error)
  } finally {
    hasLoadedData.value = true
  }
}

function syncDepartmentFromRoute() {
  if (routeDepartmentId.value && routeDepartmentId.value !== store.selectedDepartmentId) {
    store.setSelectedDepartment(routeDepartmentId.value)
  }
}

function ensureDepartmentStillExists() {
  if (
    activeDepartmentId.value &&
    departmentList.value.length > 0 &&
    !departmentList.value.some((department) => department.id === activeDepartmentId.value)
  ) {
    selectedCategory.value = null
    searchText.value = ''
    store.setSelectedDepartment(null)
    void router.replace('/admin')
  }
}

function syncSelectedCategory() {
  if (!activeDepartmentId.value) {
    selectedCategory.value = null
    searchText.value = ''
    return
  }

  if (routeCategoryId.value) {
    const matchedCategory = visibleCategories.value.find((category) => category.id === routeCategoryId.value) || null
    selectedCategory.value = matchedCategory
    if (!matchedCategory) {
      searchText.value = ''
      if (hasLoadedData.value) {
        void router.replace({
          query: activeDepartmentId.value ? { departmentId: activeDepartmentId.value } : {},
        })
      }
    }
    return
  }

  if (selectedCategory.value) {
    const refreshedCategory = visibleCategories.value.find((category) => category.id === selectedCategory.value?.id) || null
    selectedCategory.value = refreshedCategory
    if (!refreshedCategory) {
      searchText.value = ''
    }
  }
}

function getDepartmentName(departmentId: string) {
  return departmentList.value.find((department) => department.id === departmentId)?.name || '未设置学院'
}

function getCourseCount(categoryId: string) {
  const category = categoryList.value.find((item) => item.id === categoryId)
  if (!category) return 0
  return apiCourses.value.filter((course) => courseBelongsToCategory(course, category)).length
}

function selectCategory(category: CategoryRow) {
  selectedCategory.value = category
  searchText.value = ''
  void router.replace({
    query: {
      departmentId: category.departmentId,
      categoryId: category.id,
    },
  })
}

function backToCategoryList() {
  selectedCategory.value = null
  searchText.value = ''
  void router.replace({
    query: activeDepartmentId.value ? { departmentId: activeDepartmentId.value } : {},
  })
}

function switchDepartment() {
  selectedCategory.value = null
  searchText.value = ''
  store.setSelectedDepartment(null)
  void router.push('/admin')
}

function openCourseSchedules(course: Course) {
  const departmentId = selectedCategory.value?.departmentId || activeDepartmentId.value || course.departmentId
  void router.push({
    path: '/admin/schedules',
    query: {
      departmentId,
      categoryId: course.categoryId,
      courseId: course.id,
    },
  })
}

function openCategoryModal(category: CategoryRow | null) {
  editingCategory.value = category

  if (category) {
    categoryForm.value = {
      name: category.name,
      color: category.color || '#3b82f6',
      departmentId: category.departmentId,
    }
  } else {
    categoryForm.value = {
      name: '',
      color: '#3b82f6',
      departmentId: currentDepartment.value?.id || selectedCategory.value?.departmentId || departmentList.value[0]?.id || '',
    }
  }

  showCategoryModal.value = true
}

async function handleSaveCategory() {
  const payload = {
    name: categoryForm.value.name.trim(),
    color: categoryForm.value.color,
    departmentId: categoryForm.value.departmentId,
  }

  if (!payload.name) {
    window.alert('请先填写专业名称')
    return
  }

  if (!payload.departmentId) {
    window.alert('请先选择所属学院')
    return
  }

  try {
    if (editingCategory.value) {
      await updateCategory(editingCategory.value.id, payload)
    } else {
      await createCategory(payload)
    }

    showCategoryModal.value = false
    editingCategory.value = null
    await loadData()
  } catch (error: any) {
    window.alert(error?.message || '保存分类失败')
  }
}

async function handleDeleteCategory(category: CategoryRow) {
  if (!window.confirm(`确定要删除专业“${category.name}”吗？如果该专业下还有课程，将无法删除。`)) {
    return
  }

  try {
    await deleteCategory(category.id)

    if (selectedCategory.value?.id === category.id || routeCategoryId.value === category.id) {
      selectedCategory.value = null
      searchText.value = ''
      void router.replace({
        query: activeDepartmentId.value ? { departmentId: activeDepartmentId.value } : {},
      })
    }

    await loadData()
  } catch (error: any) {
    window.alert(error?.message || '删除专业失败')
  }
}

function statusLabel(status: string) {
  if (status === 'active') return '进行中'
  if (status === 'inactive') return '已结束'
  return '草稿'
}

function statusClass(status: string) {
  if (status === 'active') return 'bg-green-50 text-green-600'
  if (status === 'inactive') return 'bg-gray-100 text-gray-500'
  return 'bg-yellow-50 text-yellow-600'
}

function createCourseFormState(course: Course | null = null, schedule: Schedule | null = null): CourseFormState {
  const currentSemester = getSemesterOf(new Date().toISOString())
  const derivedSemester = schedule?.startDate
    ? getSemesterOf(schedule.startDate)
    : course?.semester || (course?.startDate ? getSemesterOf(course.startDate) : '')
  return {
    title: selectedCategory.value?.name || course?.title || '',
    description: course?.description || '',
    categoryId: selectedCategory.value?.id || course?.categoryId || '',
    teacher: schedule?.teacher || course?.teacher || '',
    mentor: schedule?.mentor || course?.mentor || '',
    semester: derivedSemester || currentSemester,
    startDate: schedule?.startDate || '',
    endDate: schedule?.endDate || '',
    duration: typeof course?.duration === 'number' && course.duration > 0 ? course.duration : '',
    credits: typeof course?.credits === 'number' && course.credits > 0 ? course.credits : '',
  }
}

function closeCourseModal() {
  showCourseModal.value = false
  editingCourse.value = null
  courseTarget.value = null
  editingSchedule.value = null
  selectedSlots.value = []
  courseForm.value = createCourseFormState()
}

function openCourseModal(course: Course | null) {
  if (!selectedCategory.value) {
    window.alert('请先选择专业')
    return
  }

  if (course) {
    const schedules = getCourseSchedules(course)
    if (schedules.length > 1) {
      const shouldNavigate = window.confirm(`该课程已有 ${schedules.length} 条排课记录，请在排课页面逐条编辑。现在前往排课页面吗？`)
      if (shouldNavigate) {
        openCourseSchedules(course)
      }
      return
    }

    editingCourse.value = course
    courseTarget.value = course
    editingSchedule.value = schedules[0] || null
    courseForm.value = createCourseFormState(course, editingSchedule.value)
    courseForm.value.title = course.title || selectedCategory.value.name
    courseForm.value.categoryId = selectedCategory.value.id
    selectedSlots.value = createSelectedSlots(editingSchedule.value)
  } else {
    const existingCourse = getCategoryCourse(
      selectedCategory.value.id,
      selectedCategory.value.name,
      selectedCategory.value.departmentId,
    )
    editingCourse.value = null
    courseTarget.value = existingCourse
    editingSchedule.value = null
    courseForm.value = createCourseFormState(existingCourse)
    courseForm.value.title = selectedCategory.value.name
    courseForm.value.categoryId = selectedCategory.value.id
    selectedSlots.value = []
  }

  showCourseModal.value = true
}

async function handleSaveCourse() {
  if (!selectedCategory.value || !canSaveCourse.value) return

  const teacher = courseForm.value.teacher.trim()
  const mentor = courseForm.value.mentor.trim()
  const duration = Number(courseForm.value.duration)
  const credits = Number(courseForm.value.credits)

  // 教师姓名必须与教师库一致，否则课程不会出现在任何教师端
  const knownTeacherNames = new Set(teacherList.value.map((item) => item.name))
  if (teacher && !knownTeacherNames.has(teacher)) {
    window.alert(`教师「${teacher}」不存在，请在教师管理中先添加该教师，或从下拉列表中选择已有教师。`)
    return
  }
  if (mentor && !knownTeacherNames.has(mentor)) {
    window.alert(`企业导师「${mentor}」不存在，请先在教师管理中以「企业导师」身份添加该人员。`)
    return
  }

  try {
    const targetCourse = await ensureCourseRecord({
      category: selectedCategory.value,
      teacher,
      mentor,
      duration,
      credits,
    })

    const buildPayload = (slot: SlotSelection) => ({
      courseId: targetCourse.id,
      title: courseForm.value.title.trim() || selectedCategory.value?.name || targetCourse.title,
      teacher,
      mentor,
      day: slot.dayLabel,
      room: slot.room.trim(),
      startDate: courseForm.value.startDate,
      endDate: courseForm.value.endDate,
      timeSlot: `${slot.start}-${slot.end}`,
    })

    if (editingSchedule.value) {
      const [firstSlot, ...restSlots] = selectedSlots.value
      await updateSchedule(editingSchedule.value.id, buildPayload(firstSlot))
      if (restSlots.length > 0) {
        await bulkImportSchedules(restSlots.map(buildPayload))
      }
    } else {
      await bulkImportSchedules(selectedSlots.value.map(buildPayload))
    }

    closeCourseModal()
    await loadData()
  } catch (error: any) {
    window.alert(error?.message || '保存课程失败')
  }
}

async function handleDeleteCourse(course: Course) {
  if (!window.confirm(`确定要删除课程“${course.title}”吗？`)) {
    return
  }

  try {
    await deleteCourse(course.id)
    await loadData()
  } catch (error: any) {
    window.alert(error?.message || '删除课程失败')
  }
}

function normalizeOptionalValue(value?: string | null) {
  const normalized = String(value ?? '').trim()
  return normalized === '未指定' ? '' : normalized
}

function courseBelongsToCategory(course: Course, category: CategoryRow) {
  if (normalizeOptionalValue(course.categoryId) === normalizeOptionalValue(category.id)) {
    return true
  }

  return (
    normalizeOptionalValue(course.title) === normalizeOptionalValue(category.name) &&
    normalizeOptionalValue(course.departmentId) === normalizeOptionalValue(category.departmentId)
  )
}

function getCategoryCourse(categoryId: string, categoryName: string, departmentId: string) {
  const matches = apiCourses.value.filter((course) => {
    if (normalizeOptionalValue(course.categoryId) === normalizeOptionalValue(categoryId)) {
      return true
    }

    return (
      normalizeOptionalValue(course.title) === normalizeOptionalValue(categoryName) &&
      normalizeOptionalValue(course.departmentId) === normalizeOptionalValue(departmentId)
    )
  })

  if (matches.length === 0) {
    return null
  }

  return matches.find((course) => normalizeOptionalValue(course.title) === normalizeOptionalValue(categoryName)) || matches[0]
}

function getCourseSchedules(course: Course) {
  return apiSchedules.value
    .filter((schedule) => {
      return normalizeOptionalValue(schedule.courseId) === normalizeOptionalValue(course.id) ||
        normalizeOptionalValue(schedule.title) === normalizeOptionalValue(course.title)
    })
    .sort((left, right) => {
      const leftKey = `${left.startDate}|${left.timeSlot}|${getScheduleDayLabel(left)}`
      const rightKey = `${right.startDate}|${right.timeSlot}|${getScheduleDayLabel(right)}`
      return leftKey.localeCompare(rightKey, 'zh-Hans-CN')
    })
}

function createSelectedSlots(schedule: Schedule | null) {
  if (!schedule) return []

  const dayLabel = getScheduleDayLabel(schedule)
  const dayIdx = dayLabels.indexOf(dayLabel)
  const [start, end] = String(schedule.timeSlot || '').split('-')

  if (dayIdx < 0 || !start || !end) {
    return []
  }

  return [
    {
      dayIdx,
      dayLabel,
      start,
      end,
      room: schedule.room || '',
    },
  ]
}

function getSelectedSlot(dayIdx: number, start: string, end: string) {
  return selectedSlots.value.find((slot) => slot.dayIdx === dayIdx && slot.start === start && slot.end === end)
}

function handleSlotClick(day: string, slot: { start: string; end: string }) {
  const dayIdx = dayLabels.indexOf(day)
  if (dayIdx < 0) return

  const exists = selectedSlots.value.some((item) => item.dayIdx === dayIdx && item.start === slot.start && item.end === slot.end)
  if (exists) return

  const defaultRoom = selectedSlots.value[0]?.room || ''
  selectedSlots.value.push({
    dayIdx,
    dayLabel: day,
    start: slot.start,
    end: slot.end,
    room: defaultRoom,
  })
  selectedSlots.value.sort((left, right) => {
    if (left.dayIdx !== right.dayIdx) return left.dayIdx - right.dayIdx
    return left.start.localeCompare(right.start)
  })
}

function getScheduleDayLabel(schedule: Schedule) {
  if (schedule.day) return schedule.day
  if (schedule.startDate) {
    const date = new Date(schedule.startDate)
    if (!Number.isNaN(date.getTime())) {
      return dayLabels[(date.getDay() + 6) % 7]
    }
  }
  return '-'
}

function timesOverlap(left: string, right: string) {
  const [leftStart, leftEnd] = left.split('-')
  const [rightStart, rightEnd] = right.split('-')
  if (!leftStart || !leftEnd || !rightStart || !rightEnd) return false

  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    return hours * 60 + minutes
  }

  return toMinutes(leftStart) < toMinutes(rightEnd) && toMinutes(rightStart) < toMinutes(leftEnd)
}

async function ensureCourseRecord(payload: {
  category: CategoryRow
  teacher: string
  mentor: string
  duration: number
  credits: number
}) {
  if (!courseTarget.value) {
    const result = await createCourse({
      title: courseForm.value.title.trim() || payload.category.name,
      description: courseForm.value.description.trim(),
      categoryId: payload.category.id,
      departmentId: payload.category.departmentId,
      teacher: payload.teacher,
      mentor: payload.mentor,
      duration: payload.duration,
      credits: payload.credits,
      status: 'active',
      semester: courseForm.value.semester,
    })

    courseTarget.value = result.course
    return result.course as Course
  }

  const nextTeacher = editingCourse.value ? payload.teacher : normalizeOptionalValue(courseTarget.value.teacher) || payload.teacher
  const nextMentor = editingCourse.value ? payload.mentor : normalizeOptionalValue(courseTarget.value.mentor) || payload.mentor
  const result = await updateCourse(courseTarget.value.id, {
    title: courseForm.value.title.trim() || payload.category.name,
    description: courseTarget.value.description || courseForm.value.description.trim(),
    categoryId: payload.category.id,
    departmentId: payload.category.departmentId,
    teacher: nextTeacher,
    mentor: nextMentor,
    duration: payload.duration,
    credits: payload.credits,
    status: courseTarget.value.status || 'active',
    semester: courseForm.value.semester,
  })

  courseTarget.value = result.course
  return result.course as Course
}
</script>
