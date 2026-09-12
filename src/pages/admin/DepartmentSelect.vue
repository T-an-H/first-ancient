<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
    <div class="w-full max-w-4xl">
      <!-- Header -->
      <div class="text-center mb-10">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center mx-auto mb-4">
          <GraduationCap class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">选择管理学院</h1>
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
                {{ store.getDepartmentCategories(dept.id).length }} 个专业
              </p>
            </div>
            <ArrowRight class="w-5 h-5 text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
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
        <div class="absolute inset-0 bg-black/50" @click="showDeleteConfirm = false" />
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
          <p class="text-sm text-gray-500 mb-5">确定要删除「{{ deleteTarget?.name }}」吗？如果该学院下已有专业、课程、班级或学生数据，将无法删除。</p>
          <div class="flex gap-3">
            <button @click="handleDelete" class="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">确认删除</button>
            <button @click="showDeleteConfirm = false" class="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors">取消</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createDepartment, deleteDepartment as apiDeleteDepartment, fetchDepartments, updateDepartment as apiUpdateDepartment } from '@/api'
import { useAppStore } from '@/stores/app'
import { GraduationCap, Plus, ArrowRight, LogOut, Trash2 } from 'lucide-vue-next'
import type { Department } from '@/types'
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

const showDeleteConfirm = ref(false)
const deleteTarget = ref<Department | null>(null)

onMounted(() => {
  void loadDepartments()
})

async function loadDepartments() {
  try {
    const res = await fetchDepartments()
    if (res.success) {
      const nextDepartments = res.departments.length > 0 ? res.departments : store.departments
      store.departments = nextDepartments
      if (store.selectedDepartmentId && nextDepartments.length > 0 && !nextDepartments.some((dept: Department) => dept.id === store.selectedDepartmentId)) {
        store.setSelectedDepartment(null)
      }
    }
  } catch (error) {
    console.error('加载学院失败:', error)
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

function confirmDeleteDept() {
  if (editingDept.value) {
    deleteTarget.value = editingDept.value
    showDeleteConfirm.value = true
  }
}

async function handleDelete() {
  if (!deleteTarget.value) return

  try {
    await apiDeleteDepartment(deleteTarget.value.id)
    await loadDepartments()
    showDeleteConfirm.value = false
    deleteTarget.value = null
    showModal.value = false
  } catch (error: any) {
    window.alert(error?.message || '删除学院失败')
  }
}

function handleLogout() {
  store.logout()
  router.replace('/login')
}
</script>
