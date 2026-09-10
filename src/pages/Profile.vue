<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">个人中心</h1>
      <p class="mt-1 text-sm text-gray-500">查看个人信息、账号安全、切换账号与退出登录</p>
    </div>

    <!-- 头像 + 基本信息 -->
    <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="relative group">
          <div class="w-20 h-20 rounded-full overflow-hidden bg-brand-400/10 text-brand-700 flex items-center justify-center text-2xl font-bold cursor-pointer ring-2 ring-transparent group-hover:ring-brand-400/40 transition"
               @click="triggerAvatarPick">
            <img v-if="avatarUrl" :src="avatarUrl" alt="头像" class="w-full h-full object-cover" />
            <span v-else>{{ (profile?.name || currentUser || '?').slice(0, 1) }}</span>
          </div>
          <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="handleAvatarChange" />
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-3 flex-wrap">
            <h2 class="text-lg font-semibold text-gray-900">{{ profile?.name || currentUser || '-' }}</h2>
            <span v-if="profile" class="rounded-full px-2 py-0.5 text-xs"
              :class="profile.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
              {{ profile.status === 'active' ? '正常' : '禁用' }}
            </span>
          </div>
          <p class="mt-1 text-sm text-gray-500">{{ profile?.roleLabel || '' }}<span v-if="profile?.department"> · {{ profile.department }}</span></p>
          <p v-if="avatarMsg" class="mt-1 text-xs" :class="avatarMsgType === 'error' ? 'text-red-500' : 'text-green-600'">{{ avatarMsg }}</p>
        </div>
      </div>
    </div>

    <!-- 主视图：基本信息 + 入口 -->
    <div v-if="view === 'main'" class="space-y-6">
      <!-- 详细基本信息 -->
      <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-gray-900">基本信息</h2>
        <div v-if="loading" class="py-8 text-center text-gray-400">加载中...</div>
        <div v-else-if="profile" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-lg bg-gray-50 p-4">
            <div class="text-xs text-gray-400">姓名</div>
            <div class="mt-1 text-sm font-medium text-gray-900">{{ profile.name }}</div>
          </div>
          <div class="rounded-lg bg-gray-50 p-4">
            <div class="text-xs text-gray-400">学号/工号</div>
            <div class="mt-1 text-sm font-medium text-gray-900">{{ profile.userNo || '-' }}</div>
          </div>
          <div class="rounded-lg bg-gray-50 p-4">
            <div class="text-xs text-gray-400">手机号</div>
            <div class="mt-1 text-sm font-medium text-gray-900">{{ profile.phone }}</div>
          </div>
          <div class="rounded-lg bg-gray-50 p-4">
            <div class="text-xs text-gray-400">身份</div>
            <div class="mt-1 text-sm font-medium text-gray-900">{{ profile.roleLabel }}</div>
          </div>
          <div class="rounded-lg bg-gray-50 p-4">
            <div class="text-xs text-gray-400">学院</div>
            <div class="mt-1 text-sm font-medium text-gray-900">{{ profile.department || '未设置' }}</div>
          </div>
          <div v-if="profile.className" class="rounded-lg bg-gray-50 p-4">
            <div class="text-xs text-gray-400">班级</div>
            <div class="mt-1 text-sm font-medium text-gray-900">{{ profile.className }}</div>
          </div>
          <div v-if="profile.email" class="rounded-lg bg-gray-50 p-4">
            <div class="text-xs text-gray-400">邮箱</div>
            <div class="mt-1 text-sm font-medium text-gray-900">{{ profile.email }}</div>
          </div>
        </div>
      </div>

      <!-- 功能入口 -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button @click="view = 'security'"
          class="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition text-left">
          <span class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <span>
            <span class="block text-sm font-semibold text-gray-900">账号与安全</span>
            <span class="block text-xs text-gray-500">修改密码、修改绑定手机号</span>
          </span>
        </button>

        <button @click="openSwitch"
          class="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition text-left">
          <span class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="M3 8l6 6"/><path d="M21 8l-6 6"/></svg>
          </span>
          <span>
            <span class="block text-sm font-semibold text-gray-900">切换账号</span>
            <span class="block text-xs text-gray-500">保留数据，最多 5 个账号</span>
          </span>
        </button>

        <button @click="handleLogout"
          class="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition text-left">
          <span class="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </span>
          <span>
            <span class="block text-sm font-semibold text-gray-900">退出登录</span>
            <span class="block text-xs text-gray-500">结束当前窗口会话</span>
          </span>
        </button>
      </div>
    </div>

    <!-- 账号与安全视图 -->
    <div v-if="view === 'security'" class="space-y-4">
      <button @click="view = 'main'" class="text-sm text-brand-600 hover:text-brand-700">&larr; 返回个人中心</button>
      <div class="grid gap-6 lg:grid-cols-2">
      <!-- 修改密码 -->
      <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-gray-900">修改密码</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
            <input v-model="pwdForm.oldPassword" type="password" placeholder="请输入当前密码"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">新密码</label>
            <input v-model="pwdForm.newPassword" type="password" placeholder="至少 8 位，含字母和数字"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
            <input v-model="pwdForm.confirmPassword" type="password" placeholder="再次输入新密码"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <p v-if="pwdError" class="text-sm text-red-500">{{ pwdError }}</p>
          <p v-if="pwdSuccess" class="text-sm text-green-600">{{ pwdSuccess }}</p>
          <button @click="handleChangePassword" :disabled="pwdLoading"
            class="w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">
            {{ pwdLoading ? '提交中...' : '确认修改' }}
          </button>
        </div>
      </div>

      <!-- 修改手机号 -->
      <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-gray-900">修改绑定手机号</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">当前手机号</label>
            <input :value="profile?.phone || ''" type="text" disabled
              class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">新手机号 *</label>
            <input v-model="phoneForm.newPhone" type="text" maxlength="11" placeholder="请输入新手机号（11 位）"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">当前密码 *</label>
            <input v-model="phoneForm.password" type="password" placeholder="输入当前密码以确认身份"
              class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <p v-if="phoneError" class="text-sm text-red-500">{{ phoneError }}</p>
          <p v-if="phoneSuccess" class="text-sm text-green-600">{{ phoneSuccess }}</p>
          <button @click="handleChangePhone" :disabled="phoneLoading"
            class="w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">
            {{ phoneLoading ? '提交中...' : '确认修改' }}
          </button>
        </div>
      </div>
      </div>
    </div>

    <!-- 切换账号视图 -->
    <div v-if="view === 'switch'" class="space-y-4">
      <button @click="view = 'main'" class="text-sm text-brand-600 hover:text-brand-700">&larr; 返回个人中心</button>
      <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-gray-900">切换账号</h2>
        <p class="mb-4 text-sm text-gray-500">保留数据，可随时切回。最多保存 5 个账号。</p>
        <div v-if="switchableAccounts.length === 0" class="py-6 text-center text-sm text-gray-400">
          暂无其他可切换的账号
        </div>
        <div v-else class="space-y-3">
          <div v-for="acc in switchableAccounts" :key="acc.id"
            class="flex items-center justify-between rounded-lg border border-gray-100 p-4 hover:border-brand-300 transition">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-brand-400/10 text-brand-700 flex items-center justify-center text-sm font-bold">
                {{ (acc.name || '?').slice(0, 1) }}
              </div>
              <div>
                <div class="text-sm font-medium text-gray-900">{{ acc.name }}</div>
                <div class="text-xs text-gray-500">{{ acc.account }} · {{ roleLabel(acc.role, acc.sub_role) }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button @click="handleSwitch(acc.id)"
                class="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">切换</button>
              <button @click="handleRemoveSaved(acc.id)"
                class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:border-red-300">移除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchUserProfile, changePassword, changePhone, uploadAvatar } from '@/api'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const store = useAppStore()

const loading = ref(false)
const profile = ref<any>(null)
const view = ref<'main' | 'security' | 'switch'>('main')
const currentUser = computed(() => store.currentUser)

// ====== 头像 ======
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUrl = computed(() => profile.value?.avatar || '')
const avatarMsg = ref('')
const avatarMsgType = ref<'error' | 'success'>('success')

function triggerAvatarPick() {
  avatarInput.value?.click()
}

async function handleAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  avatarMsg.value = ''
  try {
    const base64 = await compressImage(file, 200 * 1024)
    await uploadAvatar(base64)
    profile.value = { ...profile.value, avatar: base64 }
    avatarMsg.value = '头像更新成功'
    avatarMsgType.value = 'success'
  } catch (err: any) {
    avatarMsg.value = err instanceof Error ? err.message : '头像上传失败'
    avatarMsgType.value = 'error'
  } finally {
    input.value = ''
  }
}

function compressImage(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        const maxSize = 256
        if (width > height) {
          if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize }
        } else {
          if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('无法处理图片')); return }
        ctx.drawImage(img, 0, 0, width, height)
        let quality = 0.85
        let out = canvas.toDataURL('image/jpeg', quality)
        while (out.length > maxBytes && quality > 0.3) {
          quality -= 0.1
          out = canvas.toDataURL('image/jpeg', quality)
        }
        resolve(out)
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

// ====== 切换账号 ======
const savedAccounts = ref(store.getSavedAccounts())
const currentAccount = computed(() => {
  try {
    const raw = sessionStorage.getItem('activeSession')
    return raw ? (JSON.parse(raw)?.userInfo?.account ?? null) : null
  } catch { return null }
})
const switchableAccounts = computed(() =>
  savedAccounts.value.filter((a) => a.account !== currentAccount.value),
)

function refreshSavedAccounts() {
  savedAccounts.value = store.getSavedAccounts()
}

function roleLabel(role: string, subRole?: string) {
  if (role === 'admin') return '管理员'
  if (role === 'student') return '学生'
  if (subRole === 'mentor') return '企业导师'
  if (subRole === 'leader') return '学院领导'
  return '教师'
}

function openSwitch() {
  refreshSavedAccounts()
  view.value = 'switch'
}

function handleSwitch(id: string) {
  const portal = store.switchAccount(id)
  if (portal) {
    router.push(portal)
  }
}

function handleRemoveSaved(id: string) {
  store.removeSavedAccount(id)
  refreshSavedAccounts()
}

// ====== 退出登录 ======
function handleLogout() {
  store.logout()
  router.replace('/login')
}

async function loadProfile() {
  loading.value = true
  try {
    const data = await fetchUserProfile()
    profile.value = data.profile
  } catch (err: any) {
    console.error('加载个人信息失败:', err)
  } finally {
    loading.value = false
  }
}

// ====== 修改密码 ======
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdError = ref('')
const pwdSuccess = ref('')
const pwdLoading = ref(false)

async function handleChangePassword() {
  pwdError.value = ''
  pwdSuccess.value = ''
  if (!pwdForm.value.oldPassword.trim()) {
    pwdError.value = '请输入当前密码'
    return
  }
  if (pwdForm.value.newPassword.length < 8) {
    pwdError.value = '新密码至少 8 位'
    return
  }
  if (!/[a-zA-Z]/.test(pwdForm.value.newPassword) || !/\d/.test(pwdForm.value.newPassword)) {
    pwdError.value = '新密码需同时包含字母和数字'
    return
  }
  if (pwdForm.value.newPassword !== pwdForm.value.confirmPassword) {
    pwdError.value = '两次输入的密码不一致'
    return
  }
  pwdLoading.value = true
  try {
    await changePassword(pwdForm.value.newPassword, pwdForm.value.oldPassword)
    pwdSuccess.value = '密码修改成功'
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err: any) {
    pwdError.value = err instanceof Error ? err.message : '修改失败'
  } finally {
    pwdLoading.value = false
  }
}

// ====== 修改手机号 ======
const phoneForm = ref({ newPhone: '', password: '' })
const phoneError = ref('')
const phoneSuccess = ref('')
const phoneLoading = ref(false)

async function handleChangePhone() {
  phoneError.value = ''
  phoneSuccess.value = ''
  if (!/^1\d{10}$/.test(phoneForm.value.newPhone)) {
    phoneError.value = '请输入正确的 11 位手机号'
    return
  }
  if (!phoneForm.value.password) {
    phoneError.value = '请输入当前密码'
    return
  }
  phoneLoading.value = true
  try {
    await changePhone(phoneForm.value.newPhone, phoneForm.value.password)
    phoneSuccess.value = '手机号修改成功'
    phoneForm.value = { newPhone: '', password: '' }
    await loadProfile()
  } catch (err: any) {
    phoneError.value = err instanceof Error ? err.message : '修改失败'
  } finally {
    phoneLoading.value = false
  }
}

onMounted(loadProfile)
</script>
