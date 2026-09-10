<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">学生管理</h1>
        <p class="mt-1 text-sm text-gray-500">学生账号来自数据库，以下信息与数据库同步。</p>
      </div>
      <button @click="showAddModal = true" class="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600">
        <Plus class="h-4 w-4" /> 添加学生入库
      </button>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">学生总数</p>
            <p class="mt-2 text-2xl font-semibold text-gray-900">{{ studentRows.length }}</p>
          </div>
          <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Users class="h-5 w-5" />
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">已标注学院</p>
            <p class="mt-2 text-2xl font-semibold text-gray-900">{{ assignedDepartmentCount }}</p>
          </div>
          <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Building2 class="h-5 w-5" />
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">正常状态</p>
            <p class="mt-2 text-2xl font-semibold text-gray-900">{{ activeCount }}</p>
          </div>
          <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <UserCheck class="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-1 flex-col gap-3 sm:flex-row">
          <div class="relative flex-1">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input v-model="keyword" type="text" placeholder="搜索学生姓名、学号或手机号"
              class="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <select v-model="departmentFilter" class="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none sm:w-48">
            <option value="all">全部学院</option>
            <option v-for="d in departmentOptions" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
          <select v-model="classFilter" class="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none sm:w-48">
            <option value="all">全部班级</option>
            <option v-for="c in classOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="text-sm text-gray-500">共 {{ filteredStudents.length }} 名学生</div>
      </div>

      <div class="mt-4 overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">姓名</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">学号</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">手机号</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">学院</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">班级</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">状态</th>
              <th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filteredStudents" :key="s.id" class="border-b border-gray-50 transition-colors hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">{{ (s.name || '?').slice(0, 1) }}</div>
                  <span class="text-sm font-medium text-gray-900">{{ s.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ s.studentId || s.id || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ s.phone || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ s.department || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ s.className || '-' }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-xs" :class="s.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">{{ s.status === 'active' ? '正常' : '禁用' }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-2">
                  <button @click="openEditStudent(s)" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600" title="编辑学生">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button @click="promptDeleteStudent(s)" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600" title="删除学生">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredStudents.length === 0">
              <td colspan="7" class="px-4 py-14 text-center text-sm text-gray-400">暂无符合条件的学生</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="closeEditModal" />
        <div class="relative mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <div class="mb-5 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">编辑学生</h3>
            <button @click="closeEditModal" class="text-gray-400 transition-colors hover:text-gray-600"><X class="h-5 w-5" /></button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-500">姓名 <span class="text-red-500">*</span></label>
              <input v-model="editForm.name" type="text" class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-500">学院</label>
              <select v-model="editForm.department" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                <option value="">未设置</option>
                <option v-for="d in departmentOptions" :key="d.id" :value="d.name">{{ d.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-500">班级</label>
              <input v-model="editForm.className" type="text" class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-500">手机号</label>
              <input v-model="editForm.phone" type="text" class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-500">状态</label>
              <select v-model="editForm.status" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                <option value="active">正常</option>
                <option value="inactive">禁用</option>
              </select>
            </div>
            <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>
            <div class="flex gap-3 pt-2">
              <button @click="closeEditModal" class="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-200">取消</button>
              <button @click="saveStudent" class="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="closeDeleteModal" />
        <div class="relative mx-4 w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle class="h-6 w-6 text-red-600" />
          </div>
          <h3 class="text-base font-semibold text-gray-800">确认删除</h3>
          <p class="mt-2 text-sm text-gray-500">确定要删除学生 <span class="font-medium text-gray-800">{{ deletingStudent?.name }}</span> 吗？此操作不可恢复。</p>
          <div class="mt-5 flex gap-3">
            <button @click="closeDeleteModal" class="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-200">取消</button>
            <button @click="confirmDeleteStudent" class="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>

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
          <button @click="handleAddStudent" :disabled="adding" class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">{{ adding ? '入库中...' : '入库' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, Building2, Pencil, Plus, Search, Trash2, UserCheck, Users, X } from 'lucide-vue-next'
import { fetchStudents, updateAdminStudent, deleteAdminStudent, fetchDepartments, fetchClasses, createAccountStudent } from '@/api'
import { useAppStore } from '@/stores/app'
import type { Department } from '@/types'

const store = useAppStore()
const departments = ref<Department[]>([])
const classes = ref<any[]>([])
const students = ref<any[]>([])

const keyword = ref('')
const departmentFilter = ref('all')
const classFilter = ref('all')
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const editingStudentId = ref('')
const deletingStudent = ref<any | null>(null)
const formError = ref('')

const editForm = ref({ name: '', department: '', className: '', phone: '', status: 'active' })

onMounted(() => { void loadPageData() })

async function loadPageData() {
  try {
    const [deptRes, classRes, stuRes] = await Promise.all([
      fetchDepartments(),
      fetchClasses(),
      fetchStudents({ pageSize: '500' }),
    ])
    if (deptRes.success) { departments.value = deptRes.departments; store.departments = deptRes.departments }
    if (classRes.success) classes.value = classRes.classes || []
    if (stuRes.success) students.value = stuRes.students || []
  } catch (e) { console.error('加载数据失败:', e) }
}

const departmentOptions = computed(() => [...departments.value].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')))
const classOptions = computed(() => {
  if (departmentFilter.value === 'all') return classes.value
  const dept = departments.value.find((d) => d.id === departmentFilter.value)
  return classes.value.filter((c: any) => c.departmentId === departmentFilter.value || c.departmentName === dept?.name)
})

const studentRows = computed(() => students.value.map((s: any) => ({
  ...s,
  studentId: s.studentId || s.student_id || '',
  className: s.className || s.class_name || '',
  department: s.department || '',
  status: s.status || 'active',
})))

const filteredStudents = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return studentRows.value.filter((s) => {
    if (departmentFilter.value !== 'all' && s.department !== departmentOptions.value.find((d) => d.id === departmentFilter.value)?.name) return false
    if (classFilter.value !== 'all' && s.className !== classOptions.value.find((c) => c.id === classFilter.value)?.name) return false
    if (!search) return true
    return [s.name, s.studentId, s.phone].filter(Boolean).some((v) => v.toLowerCase().includes(search))
  })
})

const assignedDepartmentCount = computed(() => studentRows.value.filter((s) => s.department).length)
const activeCount = computed(() => studentRows.value.filter((s) => s.status === 'active').length)

function openEditStudent(s: any) {
  editingStudentId.value = s.id
  editForm.value = { name: s.name, department: s.department || '', className: s.className || '', phone: s.phone || '', status: s.status || 'active' }
  formError.value = ''
  showEditModal.value = true
}
function closeEditModal() { showEditModal.value = false; formError.value = '' }

async function saveStudent() {
  if (!editForm.value.name.trim()) { formError.value = '请填写姓名'; return }
  try {
    await updateAdminStudent(editingStudentId.value, {
      name: editForm.value.name.trim(),
      department: editForm.value.department,
      className: editForm.value.className,
      phone: editForm.value.phone,
      status: editForm.value.status,
    })
    await loadPageData()
    closeEditModal()
  } catch (e: any) { formError.value = e?.message || '保存失败' }
}

function promptDeleteStudent(s: any) { deletingStudent.value = s; showDeleteModal.value = true }
function closeDeleteModal() { showDeleteModal.value = false; deletingStudent.value = null }

async function confirmDeleteStudent() {
  if (!deletingStudent.value) return
  try {
    await deleteAdminStudent(deletingStudent.value.id)
    await loadPageData()
    closeDeleteModal()
  } catch (e: any) { alert(e?.message || '删除失败') }
}

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
    await loadPageData()
  } catch (err: any) {
    addError.value = err instanceof Error ? err.message : '入库失败'
  } finally {
    adding.value = false
  }
}
</script>
