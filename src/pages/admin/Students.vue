<template>
  <div class="space-y-6">
    <template v-if="!selectedClass">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">班级管理</h1>
          <p class="mt-1 text-gray-500">
            {{ selectedDepartment ? `${selectedDepartment.name} 下的班级，点击班级查看学生名单` : '请先选择学院，再查看该学院的班级' }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="showAddModal = true"
            class="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <Plus class="h-4 w-4" /> 添加学生入库
          </button>
          <div
            class="flex items-center gap-2 text-xs"
            :class="loading ? 'text-amber-500' : !selectedDepartment ? 'text-gray-400' : 'text-green-500'"
          >
            <span
              class="h-2 w-2 rounded-full"
              :class="loading ? 'animate-pulse bg-amber-500' : !selectedDepartment ? 'bg-gray-400' : 'bg-green-500'"
            />
            {{ loading ? '加载中...' : !selectedDepartment ? '请先选择学院' : `已连接 · ${classes.length} 个班级` }}
          </div>
        </div>
      </div>

      <div
        v-if="!selectedDepartment"
        class="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
      >
        <span>请先选择学院，再查看该学院的班级。</span>
        <button @click="router.push('/admin')" class="font-medium text-amber-700 hover:text-amber-900">去选择学院</button>
      </div>

      <template v-else>
        <div class="relative max-w-md">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="classSearch"
            type="text"
            placeholder="搜索班级名称..."
            class="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div v-if="loading" class="py-12 text-center text-gray-400">
          <LoaderCircle class="mx-auto mb-2 h-8 w-8 animate-spin text-blue-500" />
          <span>正在从数据库加载...</span>
        </div>
        <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="item in filteredClasses"
            :key="item.id"
            @click="selectClass(item.id)"
            class="group cursor-pointer rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <Users class="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 transition-colors group-hover:text-blue-600">{{ item.name }}</h3>
                  <p class="mt-0.5 text-xs text-gray-400">{{ item.count }} 名学生</p>
                </div>
              </div>
              <ArrowRight class="h-5 w-5 text-gray-300 transition-colors group-hover:text-blue-500" />
            </div>
          </div>
          <div v-if="filteredClasses.length === 0" class="col-span-full py-20 text-center text-gray-400">
            <Users class="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>{{ classSearch ? '没有匹配的班级' : '暂无班级数据' }}</p>
          </div>
        </div>
      </template>
    </template>

    <template v-else>
      <div class="mb-1 flex items-center gap-3">
        <button
          @click="selectedClassId = ''"
          class="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          <ArrowLeft class="h-4 w-4" /> 返回班级列表
        </button>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ selectedClass.name }}</h1>
          <p class="mt-1 text-gray-500">{{ filteredStudents.length }} 名学生</p>
        </div>
      </div>

      <div class="relative max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="studentSearch"
          type="text"
          placeholder="搜索学生姓名或学号..."
          class="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div v-if="loadingStudents" class="py-12 text-center text-gray-400">
        <LoaderCircle class="mx-auto mb-2 h-8 w-8 animate-spin text-blue-500" />
        <span>加载中...</span>
      </div>
      <div v-else class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">姓名</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">学号</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">电话</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in filteredStudents" :key="student.id" class="border-b border-gray-50 transition-colors hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-full" :class="student.status === 'active' ? 'bg-blue-100' : 'bg-gray-100'">
                    <span class="text-xs font-bold" :class="student.status === 'active' ? 'text-blue-600' : 'text-gray-400'">
                      {{ student.name[0] }}
                    </span>
                  </div>
                  <span class="text-sm font-medium text-gray-900">{{ student.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ student.studentId || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ student.phone || '-' }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-xs" :class="student.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
                  {{ student.status === 'active' ? '正常' : '禁用' }}
                </span>
              </td>
            </tr>
            <tr v-if="filteredStudents.length === 0">
              <td colspan="4" class="px-4 py-12 text-center text-gray-400">{{ studentSearch ? '没有匹配的学生' : '该班级暂无学生' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>

  <!-- 添加学生入库弹窗 -->
  <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAddModal = false">
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h2 class="mb-4 text-lg font-bold text-gray-900">添加学生入库</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
          <input v-model="addForm.name" type="text" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">手机号 *</label>
          <input v-model="addForm.phone" type="text" maxlength="11" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">身份证号 *</label>
          <input v-model="addForm.idCard" type="text" maxlength="18" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">学院</label>
          <input v-model="addForm.department" type="text" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">班级</label>
          <input v-model="addForm.className" type="text" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <p v-if="addError" class="text-sm text-red-500">{{ addError }}</p>
        <p v-if="addSuccess" class="text-sm text-green-600">{{ addSuccess }}</p>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button @click="showAddModal = false" class="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">关闭</button>
        <button @click="handleAddStudent" :disabled="adding" class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">
          {{ adding ? '入库中...' : '入库' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, LoaderCircle, Search, Users, Plus } from 'lucide-vue-next'
import { fetchClasses, fetchDepartments, fetchStudents, createAccountStudent } from '@/api'
import { useAppStore } from '@/stores/app'
import type { Department, Student } from '@/types'

type ClassItem = {
  id: string
  name: string
  count: number
}

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const classes = ref<ClassItem[]>([])
const students = ref<Student[]>([])
const loading = ref(false)
const loadingStudents = ref(false)
const classSearch = ref('')
const studentSearch = ref('')
const selectedClassId = ref('')

// 添加学生入库
const showAddModal = ref(false)
const adding = ref(false)
const addError = ref('')
const addSuccess = ref('')
const addForm = ref({ name: '', phone: '', idCard: '', department: '', className: '' })

async function handleAddStudent() {
  addError.value = ''
  addSuccess.value = ''
  if (!addForm.value.name.trim() || !addForm.value.phone.trim() || !addForm.value.idCard.trim()) {
    addError.value = '姓名、手机号、身份证号为必填'
    return
  }
  adding.value = true
  try {
    const data = await createAccountStudent({
      name: addForm.value.name.trim(),
      phone: addForm.value.phone.trim(),
      idCard: addForm.value.idCard.trim(),
      department: addForm.value.department.trim(),
      className: addForm.value.className.trim(),
    })
    addSuccess.value = `入库成功！学号：${data.account.userNo}，初始密码：身份证后 6 位`
    addForm.value = { name: '', phone: '', idCard: '', department: '', className: '' }
  } catch (err: any) {
    addError.value = err instanceof Error ? err.message : '入库失败'
  } finally {
    adding.value = false
  }
}

const selectedDepartment = computed<Department | null>(() => store.getSelectedDepartment())
const selectedClass = computed(() => classes.value.find((item) => item.id === selectedClassId.value) || null)

const filteredClasses = computed(() => {
  const keyword = classSearch.value.trim().toLowerCase()
  if (!keyword) return classes.value
  return classes.value.filter((item) => item.name.toLowerCase().includes(keyword))
})

const filteredStudents = computed(() => {
  const keyword = studentSearch.value.trim().toLowerCase()
  if (!keyword) return students.value
  return students.value.filter((student) => {
    return student.name.toLowerCase().includes(keyword) || (student.studentId || '').toLowerCase().includes(keyword)
  })
})

onMounted(() => {
  void ensureDepartmentsLoaded()
})

async function ensureDepartmentsLoaded() {
  if (store.departments.length > 0) return

  try {
    const result = await fetchDepartments()
    if (result.success) {
      store.departments = result.departments
    }
  } catch (error) {
    console.error('加载学院列表失败:', error)
  }
}

function applyRouteClassName() {
  const routeClassName = typeof route.query.className === 'string' ? route.query.className : ''
  if (!routeClassName) {
    selectedClassId.value = ''
    return
  }

  const matched = classes.value.find((item) => item.name === routeClassName)
  selectedClassId.value = matched?.id || ''
}

async function loadClasses() {
  const department = selectedDepartment.value
  if (!department) {
    classes.value = []
    selectedClassId.value = ''
    loading.value = false
    return
  }

  loading.value = true
  try {
    const result = await fetchClasses({ departmentId: department.id })
    classes.value = result.success ? result.classes : []
    applyRouteClassName()
    if (selectedClassId.value && !classes.value.some((item) => item.id === selectedClassId.value)) {
      selectedClassId.value = ''
    }
  } catch (error) {
    classes.value = []
    selectedClassId.value = ''
    console.error('加载班级失败:', error)
  } finally {
    loading.value = false
  }
}

function selectClass(classId: string) {
  selectedClassId.value = classId
}

async function loadClassStudents() {
  const department = selectedDepartment.value
  if (!department || !selectedClass.value) {
    students.value = []
    return
  }

  loadingStudents.value = true
  try {
    const result = await fetchStudents({
      classId: selectedClass.value.id,
      departmentId: department.id,
      pageSize: '200',
    })
    students.value = result.success ? result.students : []
  } catch (error) {
    students.value = []
    console.error('加载学生失败:', error)
  } finally {
    loadingStudents.value = false
  }
}

watch(
  () => route.query.className,
  () => {
    applyRouteClassName()
    studentSearch.value = ''
  },
)

watch(selectedClassId, (classId, previousClassId) => {
  const className = classes.value.find((item) => item.id === classId)?.name || ''
  const currentQueryClassName = typeof route.query.className === 'string' ? route.query.className : ''

  if (currentQueryClassName !== className) {
    const nextQuery = { ...route.query }
    if (className) {
      nextQuery.className = className
    } else {
      delete nextQuery.className
    }
    void router.replace({ query: nextQuery })
  }

  if (!classId) {
    students.value = []
    return
  }

  if (classId !== previousClassId) {
    studentSearch.value = ''
    void loadClassStudents()
  }
})

watch(
  () => store.selectedDepartmentId,
  () => {
    classSearch.value = ''
    studentSearch.value = ''
    students.value = []
    selectedClassId.value = ''
    void loadClasses()
  },
  { immediate: true },
)
</script>
