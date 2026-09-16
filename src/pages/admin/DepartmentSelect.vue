<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
    <div class="w-full max-w-4xl">
      <!-- Header -->
      <div class="text-center mb-10">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center mx-auto mb-4">
          <GraduationCap class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">课程多元评价平台</h1>
        <p class="text-gray-500">请选择一个学院进入管理后台</p>
      </div>

      <!-- Department Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <div
          v-for="dept in store.departments"
          :key="dept.id"
          @click="selectDepartment(dept)"
          class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
              :style="{ backgroundColor: dept.color }"
            >
              {{ dept.name[0] }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-gray-900 text-lg group-hover:text-brand-600 transition-colors truncate">{{ dept.name }}</h3>
              <p class="text-sm text-gray-400 mt-0.5">
                {{ getCategoryCount(dept.id) }} 个专业
              </p>
            </div>
            <!-- 卡片内操作：编辑 / 删除（.stop 阻止冒泡，避免误触发进入学院） -->
            <div class="flex-shrink-0 flex items-center gap-1">
              <button
                type="button"
                @click.stop="openEditModal(dept)"
                class="p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-blue-600 hover:bg-blue-50 transition-all"
                title="编辑学院"
              >
                <Pencil class="w-4 h-4" />
              </button>
              <button
                type="button"
                @click.stop="openDeleteConfirm(dept)"
                class="p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all"
                title="删除学院"
              >
                <Trash2 class="w-4 h-4" />
              </button>
              <ArrowRight class="w-5 h-5 text-gray-300 group-hover:text-brand-500 transition-colors" />
            </div>
          </div>
        </div>

        <!-- Add Department Card -->
        <div
          @click="openAddModal"
          class="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-6 hover:border-brand-400 hover:bg-brand-50/30 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[88px]"
        >
          <Plus class="w-8 h-8 text-gray-300 mb-1" />
          <span class="text-sm text-gray-400">添加学院</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center">
        <button @click="handleLogout" class="text-sm text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1">
          <LogOut class="w-4 h-4" /> 退出登录
        </button>
      </div>
    </div>

    <!-- Add/Edit Department Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false" />
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ editingDept ? '编辑学院' : '添加学院' }}</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">学院名称</label>
              <input v-model="form.name" type="text" placeholder="如：计算机学院" class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">颜色</label>
              <div class="flex items-center gap-3">
                <span
                  class="h-10 w-10 flex-shrink-0 rounded border border-gray-200"
                  :style="{ backgroundColor: form.color }"
                />
                <select
                  v-model="form.color"
                  class="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option v-if="!isDepartmentColorOption(form.color)" :value="form.color">
                    {{ getDepartmentColorName(form.color) }}
                  </option>
                  <option v-for="color in DEPARTMENT_COLOR_OPTIONS" :key="color.value" :value="color.value">
                    {{ color.name }}
                  </option>
                </select>
              </div>
            </div>
            <div v-if="editingDept" class="border-t pt-4">
              <button
                @click="confirmDeleteDept"
                class="text-sm text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
              >
                <Trash2 class="w-4 h-4" /> 删除此学院
              </button>
            </div>
            <div class="flex gap-3 pt-2">
              <button @click="handleSave" :disabled="!form.name.trim()" class="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">
                保存
              </button>
              <button @click="showModal = false" class="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors">
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="closeDeleteConfirm" />
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">确认删除学院</h3>

          <!-- 有数据：列出具体会删掉什么 -->
          <template v-if="deleteImpact">
            <p class="text-sm text-gray-600 mb-3">
              删除「<strong>{{ deleteTarget?.name }}</strong>」将<strong class="text-red-600">永久删除</strong>以下数据：
            </p>
            <ul class="text-xs text-gray-600 bg-red-50 border border-red-200 rounded-lg p-3 space-y-1 mb-3 max-h-48 overflow-y-auto">
              <li v-for="line in deleteImpactLines" :key="line">· {{ line }}</li>
            </ul>
            <p class="text-xs text-red-600 mb-4">此操作不可撤销，且无法恢复。</p>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">
              请输入学院名称以确认：<span class="text-gray-400">{{ deleteTarget?.name }}</span>
            </label>
            <input
              v-model="deleteConfirmInput"
              type="text"
              :placeholder="deleteTarget?.name"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-red-400 outline-none text-sm mb-4"
            />
          </template>

          <!-- 无数据：普通确认 -->
          <p v-else class="text-sm text-gray-500 mb-5">
            确定要删除「{{ deleteTarget?.name }}」吗？该学院下没有关联数据。
          </p>

          <div class="flex gap-3">
            <button
              @click="handleDelete"
              :disabled="Boolean(deleteImpact) && deleteConfirmInput.trim() !== deleteTarget?.name"
              class="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              确认删除
            </button>
            <button @click="closeDeleteConfirm" class="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors">
              取消
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createDepartment, deleteDepartment as apiDeleteDepartment, fetchCategories, fetchDepartments, updateDepartment as apiUpdateDepartment, fetchDepartmentUsage } from '@/api'
import { useAppStore } from '@/stores/app'
import { GraduationCap, Plus, ArrowRight, LogOut, Trash2, Pencil } from 'lucide-vue-next'
import type { Category, Department } from '@/types'
import {
  DEPARTMENT_COLOR_OPTIONS,
  getDepartmentColorName,
  isDepartmentColorOption,
} from '@/lib/departmentColors'

const store = useAppStore()
const router = useRouter()

const showModal = ref(false)
const editingDept = ref<Department | null>(null)
const form = ref({ name: '', color: '#3b82f6' })

/**
 * 学院卡片上的「N 个专业」用的专业列表。
 *
 * 必须来自接口的 `fetchCategories()`，**不能**用 `store.categories`：
 * store 的 categories 初值来自 localStorage，本地为空时回落到 mock 数据，
 * 而 mock 的学院 id 是 'dept-1' 这类假 id，与真实学院 id（'1'、'113'…）
 * 交集恒为 0 —— 于是每个学院都显示「0 个专业」，刷新后尤其明显。
 */
const apiCategories = ref<Category[]>([])

/** 某学院下的专业数（按接口数据统计） */
function getCategoryCount(departmentId: string) {
  return apiCategories.value.filter(
    (category) => String(category.departmentId) === String(departmentId)
  ).length
}

const showDeleteConfirm = ref(false)
const deleteTarget = ref<Department | null>(null)
/** 有数据时的删除影响面统计（来自后端 409 的 details），null 表示无关联数据 */
const deleteImpact = ref<Record<string, number> | null>(null)
const deleteConfirmInput = ref('')

/** 影响面 → 人类可读的行；只列出数量大于 0 的项 */
const deleteImpactLines = computed(() => {
  const d = deleteImpact.value
  if (!d) return []
  const map: [string, string][] = [
    ['courseCount', '门课程'],
    ['classCount', '个班级'],
    ['studentCount', '名学生'],
    ['teacherCount', '名教师'],
    ['categoryCount', '个专业分类'],
    ['scheduleCount', '条排课'],
    ['enrollmentCount', '条选课记录'],
    ['evaluationCount', '条评价记录'],
    ['detailedGradeCount', '条成绩明细'],
    ['examScoreCount', '条考试成绩'],
  ]
  return map
    .filter(([key]) => Number(d[key] || 0) > 0)
    .map(([key, unit]) => `${d[key]} ${unit}`)
})

function closeDeleteConfirm() {
  showDeleteConfirm.value = false
  deleteImpact.value = null
  deleteConfirmInput.value = ''
}

/**
 * 卡片上的「删除」入口
 *
 * 先拉取该学院的影响面（不执行删除）：
 *   - 有数据 → 列出会删掉什么，并要求输入学院名称才能确认（防误删）
 *   - 无数据 → 普通二次确认
 * 这样空学院也需要点「确认删除」，不会一点就没。
 */
async function openDeleteConfirm(dept: Department) {
  deleteTarget.value = dept
  deleteImpact.value = null
  deleteConfirmInput.value = ''
  showDeleteConfirm.value = true

  try {
    const res: any = await fetchDepartmentUsage(dept.id)
    if (res?.hasData && res?.usage) {
      deleteImpact.value = res.usage
    }
  } catch (error: any) {
    // 拉取失败不阻断：按无数据处理，删除时后端仍会拦
    console.warn('获取学院影响面失败:', error)
  }
}

onMounted(() => {
  void loadDepartments()
})

async function loadDepartments() {
  // 两个请求各自独立容错：专业拉不到只影响卡片上的计数，
  // 不该连累学院列表一起加载不出来。
  const [deptRes, categoryRes] = await Promise.allSettled([
    fetchDepartments(),
    fetchCategories(),
  ])

  if (categoryRes.status === 'fulfilled' && categoryRes.value?.success) {
    apiCategories.value = categoryRes.value.categories || []
    // 同步给 store，让「课程管理」等页面在切过去时就有正确数据
    store.categories = apiCategories.value
  } else if (categoryRes.status === 'rejected') {
    console.error('加载专业失败，学院卡片计数将显示 0:', categoryRes.reason)
  }

  if (deptRes.status === 'fulfilled' && deptRes.value?.success) {
    // 接口返回空列表是「真的没有学院」，不能回落到本地 store —— 那里可能是
    // mock 数据（假 id），会把已删除的学院、错误的数据重新显示出来。
    const nextDepartments: Department[] = deptRes.value.departments || []
    store.departments = nextDepartments
    if (
      store.selectedDepartmentId &&
      !nextDepartments.some((dept) => dept.id === store.selectedDepartmentId)
    ) {
      store.setSelectedDepartment(null)
    }
  } else if (deptRes.status === 'rejected') {
    console.error('加载学院失败:', deptRes.reason)
  }
}

function selectDepartment(dept: Department) {
  store.setSelectedDepartment(dept.id)
  router.push({
    path: '/admin/categories',
    query: { departmentId: dept.id },
  })
}

function openAddModal() {
  editingDept.value = null
  form.value = { name: '', color: '#3b82f6' }
  showModal.value = true
}

/** 卡片上的「编辑」入口：带入该学院当前值 */
function openEditModal(dept: Department) {
  editingDept.value = dept
  form.value = { name: dept.name, color: dept.color || '#3b82f6' }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name.trim()) return

  try {
    if (editingDept.value) {
      await apiUpdateDepartment(editingDept.value.id, {
        name: form.value.name.trim(),
        color: form.value.color,
      })
    } else {
      await createDepartment({
        name: form.value.name.trim(),
        color: form.value.color,
      })
    }

    await loadDepartments()
    showModal.value = false
  } catch (error: any) {
    window.alert(error?.message || '保存学院失败')
  }
}

/** 编辑弹窗里的「删除此学院」入口：转为走同一套影响面确认流程 */
function confirmDeleteDept() {
  if (editingDept.value) {
    const target = editingDept.value
    showModal.value = false
    void openDeleteConfirm(target)
  }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  const deletedId = deleteTarget.value.id

  try {
    // force=true：已在上一步展示过影响面并要求输入名称确认，这里执行级联删除
    await apiDeleteDepartment(deletedId, true)
    await loadDepartments()
    // 删掉的正是当前选定学院时清空选择，否则后续进入「专业」页会带上已失效的 id
    if (store.selectedDepartmentId === deletedId) {
      store.setSelectedDepartment(null)
    }
    closeDeleteConfirm()
    deleteTarget.value = null
  } catch (error: any) {
    window.alert(error?.message || '删除学院失败')
  }
}

function handleLogout() {
  store.logout()
  router.replace('/login')
}
</script>
