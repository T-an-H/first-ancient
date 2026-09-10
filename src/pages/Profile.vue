<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">个人中心</h1>
      <p class="mt-1 text-sm text-gray-500">查看个人信息、修改密码和绑定手机号</p>
    </div>

    <!-- 基本信息 -->
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
        <div class="rounded-lg bg-gray-50 p-4">
          <div class="text-xs text-gray-400">状态</div>
          <div class="mt-1">
            <span class="rounded-full px-2 py-0.5 text-xs" :class="profile.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
              {{ profile.status === 'active' ? '正常' : '禁用' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 修改密码 + 修改手机号 -->
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchUserProfile, changePassword, changePhone } from '@/api'

const loading = ref(false)
const profile = ref<any>(null)

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
