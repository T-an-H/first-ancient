<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">账号管理</h1>
        <p class="mt-1 text-gray-500">统一管理所有入库账号（启用/禁用、重置密码、分配学院）</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="showAddModal = true"
          class="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600">
          <Plus class="h-4 w-4" /> 添加账号
        </button>
        <button @click="handleExportStudents" :disabled="exporting"
          class="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
          <Download class="h-4 w-4" /> 导出学生
        </button>
        <button @click="handleExportTeachers" :disabled="exporting"
          class="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
          <Download class="h-4 w-4" /> 导出教师
        </button>
        <button @click="handleExport" :disabled="exporting"
          class="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
          <Download class="h-4 w-4" /> {{ exporting ? '导出中...' : '导出脱敏' }}
        </button>
        <button @click="handleDownloadTemplate"
          class="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
          <FileSpreadsheet class="h-4 w-4" /> 下载批量添加模板
        </button>
        <button @click="triggerImport"
          class="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600">
          <Upload class="h-4 w-4" /> 批量导入
        </button>
        <input ref="importFileInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="handleImport" />
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[200px] max-w-md">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="keyword" @input="debouncedLoad" placeholder="搜索姓名 / 学号 / 手机号"
          class="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
      </div>
      <select v-model="roleFilter" @change="loadAccounts" class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm">
        <option value="">全部角色</option>
        <option value="student">学生</option>
        <option value="teacher">教师</option>
        <option value="admin">管理员</option>
      </select>
      <select v-model="statusFilter" @change="loadAccounts" class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm">
        <option value="">全部状态</option>
        <option value="active">正常</option>
        <option value="inactive">禁用</option>
      </select>
    </div>

    <div v-if="loading" class="py-12 text-center text-gray-400">
      <LoaderCircle class="mx-auto mb-2 h-8 w-8 animate-spin text-blue-500" />
      <span>加载中...</span>
    </div>
    <div v-else class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50">
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">姓名</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">学号/工号</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">手机号</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">角色</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">学院</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">初始密码</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">状态</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in accounts" :key="a.id" class="border-b border-gray-50 hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ a.name }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ a.user_no || '-' }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ a.account }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ roleLabel(a.role, a.sub_role) }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ a.department || '-' }}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{{ a.initial_password || '-' }}</td>
            <td class="px-4 py-3">
              <span class="rounded-full px-2 py-0.5 text-xs" :class="a.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
                {{ a.status === 'active' ? '正常' : '禁用' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-2">
                <button @click="toggleStatus(a)" class="text-xs text-blue-500 hover:text-blue-700">
                  {{ a.status === 'active' ? '禁用' : '启用' }}
                </button>
                <button @click="resetPwd(a)" class="text-xs text-amber-500 hover:text-amber-700">重置密码</button>
                <button @click="deleteAccount(a)" class="text-xs text-red-500 hover:text-red-700">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="accounts.length === 0">
            <td colspan="8" class="px-4 py-12 text-center text-gray-400">暂无账号数据</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="toast" class="fixed bottom-6 right-6 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">{{ toast }}</p>

    <!-- 批量导入结果弹窗 -->
    <div v-if="importResult" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="importResult = null">
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="mb-4 text-lg font-bold text-gray-900">导入结果</h2>
        <p class="text-sm text-gray-600">成功入库 {{ importResult.inserted }} 条，失败 {{ importResult.failed }} 条</p>
        <div v-if="importResult.errors.length > 0" class="mt-3 max-h-60 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div v-for="(err, i) in importResult.errors" :key="i" class="text-xs text-red-500 py-0.5">
            第 {{ err.row }} 行 {{ err.name }}：{{ err.message }}
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <button @click="importResult = null; loadAccounts()" class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">确定</button>
        </div>
      </div>
    </div>

    <!-- 添加账号弹窗 -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAddModal = false">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="mb-4 text-lg font-bold text-gray-900">添加账号入库</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">身份 *</label>
            <select v-model="addForm.roleType" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="student">学生</option>
              <option value="teacher">教师</option>
              <option value="mentor">企业导师</option>
              <option value="leader">学院领导</option>
            </select>
          </div>
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
          <div v-if="addForm.roleType === 'student'">
            <label class="block text-sm font-medium text-gray-700 mb-1">班级</label>
            <input v-model="addForm.className" type="text" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <p v-if="addError" class="text-sm text-red-500">{{ addError }}</p>
          <p v-if="addSuccess" class="text-sm text-green-600">{{ addSuccess }}</p>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button @click="closeAddModal" class="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">关闭</button>
          <button @click="handleAddAccount" :disabled="adding" class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">
            {{ adding ? '入库中...' : '入库' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, LoaderCircle, Download, Upload, FileSpreadsheet, Plus } from 'lucide-vue-next'
import { fetchAccounts, updateAccountStatus, resetAccountPassword, importAccounts, exportAccounts, exportStudents, exportTeachers, createAccountStudent, createAccountTeacher, deleteAccount as apiDeleteAccount } from '@/api'

const accounts = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
let loadTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 3000)
}

function roleLabel(role: string, subRole?: string) {
  if (role === 'admin') return '管理员'
  if (role === 'student') return '学生'
  if (role === 'teacher') {
    if (subRole === 'mentor') return '导师'
    if (subRole === 'leader') return '领导'
    return '教师'
  }
  return role
}

function debouncedLoad() {
  if (loadTimer) clearTimeout(loadTimer)
  loadTimer = setTimeout(loadAccounts, 300)
}

async function loadAccounts() {
  loading.value = true
  try {
    const params: Record<string, any> = { pageSize: 100 }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (roleFilter.value) params.role = roleFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    const data = await fetchAccounts(params)
    accounts.value = data.accounts || []
  } catch (err: any) {
    showToast(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function toggleStatus(a: any) {
  const newStatus = a.status === 'active' ? 'inactive' : 'active'
  try {
    await updateAccountStatus(a.id, newStatus)
    a.status = newStatus
    showToast(newStatus === 'active' ? `已启用 ${a.name}` : `已禁用 ${a.name}`)
  } catch (err: any) {
    showToast(err instanceof Error ? err.message : '操作失败')
  }
}

async function resetPwd(a: any) {
  if (!confirm(`确定重置 ${a.name} 的密码为身份证后 6 位？`)) return
  try {
    await resetAccountPassword(a.id)
    showToast(`已重置 ${a.name} 的密码`)
  } catch (err: any) {
    showToast(err instanceof Error ? err.message : '重置失败')
  }
}

async function deleteAccount(a: any) {
  if (!confirm(`确定删除账号 ${a.name}（${a.user_no || a.account}）吗？此操作不可恢复。`)) return
  try {
    await apiDeleteAccount(a.id)
    showToast(`已删除账号 ${a.name}`)
    await loadAccounts()
  } catch (err: any) {
    showToast(err instanceof Error ? err.message : '删除失败')
  }
}

// ====== 批量导入 / 导出 ======
const exporting = ref(false)
const importResult = ref<{ inserted: number; failed: number; errors: any[] } | null>(null)
const importFileInput = ref<HTMLInputElement | null>(null)

function triggerImport() {
  importFileInput.value?.click()
}

async function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''

  try {
    const XLSX = await import('xlsx')
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    const payload = rows.map((row) => ({
      name: row['姓名'] || row['name'] || '',
      phone: String(row['手机号'] || row['phone'] || ''),
      idCard: String(row['身份证号'] || row['idCard'] || ''),
      department: row['学院'] || row['department'] || '',
      className: row['班级'] || row['className'] || '',
      identity: row['身份'] || row['role'] || row['角色'] || '学生',
    }))

    const result = await importAccounts(payload)
    importResult.value = result.results
  } catch (err: any) {
    showToast(err instanceof Error ? err.message : '导入失败')
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const data = await exportAccounts()
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(data.accounts || [])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '账号列表')
    XLSX.writeFile(wb, `账号导出_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast('导出成功')
  } catch (err: any) {
    showToast(err instanceof Error ? err.message : '导出失败')
  } finally {
    exporting.value = false
  }
}

async function handleExportStudents() {
  exporting.value = true
  try {
    const data = await exportStudents()
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(data.students || [])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '学生数据')
    XLSX.writeFile(wb, `学生数据导出_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast('导出成功')
  } catch (err: any) {
    showToast(err instanceof Error ? err.message : '导出失败')
  } finally {
    exporting.value = false
  }
}

async function handleExportTeachers() {
  exporting.value = true
  try {
    const data = await exportTeachers()
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(data.teachers || [])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '教师数据')
    XLSX.writeFile(wb, `教师数据导出_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast('导出成功')
  } catch (err: any) {
    showToast(err instanceof Error ? err.message : '导出失败')
  } finally {
    exporting.value = false
  }
}

async function handleDownloadTemplate() {
  try {
    const XLSX = await import('xlsx')
    const header = [['姓名', '手机号', '身份证号', '学院', '身份']]
    const example = [['张三', '13800138000', '110101200001011234', '计算机学院', '学生']]
    const ws = XLSX.utils.aoa_to_sheet([...header, ...example])

    // 给"身份"列（E 列）加下拉数据验证：学生/教师/企业导师/学院领导
    const identities = '学生,教师,企业导师,学院领导'
    if (ws['!dataValidations']) {
      ws['!dataValidations'].push({
        sqref: 'E2:E1000',
        type: 'list',
        formulae: [`"${identities}"`],
      })
    } else {
      ws['!dataValidations'] = [
        { sqref: 'E2:E1000', type: 'list', formulae: [`"${identities}"`] },
      ]
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '导入模板')
    XLSX.writeFile(wb, '账号导入模板.xlsx')
    showToast('模板已下载')
  } catch (err: any) {
    showToast(err instanceof Error ? err.message : '下载失败')
  }
}

// ====== 单个添加账号 ======
const showAddModal = ref(false)
const adding = ref(false)
const addError = ref('')
const addSuccess = ref('')
const addForm = ref({ roleType: 'student', name: '', phone: '', idCard: '', department: '', className: '' })

function closeAddModal() {
  showAddModal.value = false
  addError.value = ''
  addSuccess.value = ''
  addForm.value = { roleType: 'student', name: '', phone: '', idCard: '', department: '', className: '' }
}

async function handleAddAccount() {
  addError.value = ''
  addSuccess.value = ''
  if (!addForm.value.name.trim() || !addForm.value.phone.trim() || !addForm.value.idCard.trim()) {
    addError.value = '姓名、手机号、身份证号为必填'
    return
  }
  adding.value = true
  try {
    const roleType = addForm.value.roleType
    if (roleType === 'student') {
      const data = await createAccountStudent({
        name: addForm.value.name.trim(),
        phone: addForm.value.phone.trim(),
        idCard: addForm.value.idCard.trim(),
        department: addForm.value.department.trim(),
        className: addForm.value.className.trim(),
      })
      addSuccess.value = `入库成功！学号：${data.account.userNo}，初始密码：身份证后 6 位`
    } else {
      const subRole = roleType === 'mentor' ? 'mentor' : roleType === 'leader' ? 'leader' : 'teacher'
      const data = await createAccountTeacher({
        name: addForm.value.name.trim(),
        phone: addForm.value.phone.trim(),
        idCard: addForm.value.idCard.trim(),
        subRole,
        department: addForm.value.department.trim(),
      })
      addSuccess.value = `入库成功！工号：${data.account.userNo}，初始密码：身份证后 6 位`
    }
    addForm.value = { roleType: addForm.value.roleType, name: '', phone: '', idCard: '', department: '', className: '' }
    loadAccounts()
  } catch (err: any) {
    addError.value = err instanceof Error ? err.message : '入库失败'
  } finally {
    adding.value = false
  }
}

onMounted(loadAccounts)
</script>
