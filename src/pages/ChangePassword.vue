<template>
  <div class="min-h-screen bg-gradient-to-br from-brand-50 to-brand-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">首次登录 · 修改密码</h2>
      <p class="text-gray-500 mb-6">你的学号/工号是 <span class="font-bold text-brand-600">{{ userNo }}</span>，请牢记</p>

      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
          <input
            v-model="newPassword"
            type="password"
            placeholder="至少 8 位，含字母和数字"
            class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none transition-all"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">确认密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入新密码"
            class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none transition-all"
          />
        </div>

        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-lg disabled:opacity-50"
        >
          {{ loading ? '提交中...' : '确认修改并进入系统' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { changePassword } from '@/api'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const store = useAppStore()

// 首登临时中转：Login.vue 把 token/userInfo/portal 写入 localStorage
const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const userNo = userInfo?.userNo || ''
const portal = localStorage.getItem('pendingPortal') || '/'
const token = localStorage.getItem('token') || ''

const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

function resolveStoreRole(role: string, subRole?: string) {
  if (role === 'teacher' && subRole && subRole !== 'teacher') {
    return subRole as 'mentor' | 'leader'
  }
  return role as 'admin' | 'teacher' | 'student'
}

function getExtraRoleFlags(name: string, subRole?: string) {
  let isTeacherFromDb = false
  let isMentorFromDb = false
  if (subRole === 'leader') {
    const leaderData = store.leaders.find((leader) => leader.name === name)
    if (leaderData?.asTeacher) isTeacherFromDb = true
    if (leaderData?.asMentor) isMentorFromDb = true
  }
  return { isTeacherFromDb, isMentorFromDb }
}

async function handleSubmit() {
  error.value = ''
  if (newPassword.value.length < 8) {
    error.value = '新密码至少 8 位'
    return
  }
  if (!/[a-zA-Z]/.test(newPassword.value) || !/\d/.test(newPassword.value)) {
    error.value = '新密码需同时包含字母和数字'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  try {
    await changePassword(newPassword.value)
    // 改密成功：正式建立会话，直接进入主页（不再退回登录页）
    const name = userInfo?.name || ''
    const role = userInfo?.role || ''
    const subRole = userInfo?.sub_role
    const account = userInfo?.account || ''
    const { isTeacherFromDb, isMentorFromDb } = getExtraRoleFlags(name, subRole)
    store.login(name, resolveStoreRole(role, subRole), isTeacherFromDb, isMentorFromDb, {
      token,
      userInfo,
      sub_role: subRole,
      account,
      portal,
    })
    // 清理首登临时中转
    localStorage.removeItem('pendingPortal')
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    router.push(portal)
  } catch (err: any) {
    error.value = err instanceof Error ? err.message : '修改失败，请稍后再试'
    loading.value = false
  }
}
</script>
