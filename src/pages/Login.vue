<template>
  <div class="min-h-screen bg-gradient-to-br from-brand-50 to-brand-50 flex items-center justify-center p-4">
    <div class="flex w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 to-brand-800 p-12 flex-col justify-between">
        <div>
          <div class="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
            <img src="@/assets/doubao.svg" alt="小智" class="w-12 h-12" />
          </div>
          <h1 class="text-3xl font-bold text-white mb-3">课程平台</h1>
          <p class="text-white/70 text-lg">统一登录后进入对应角色工作区</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <div class="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white/80 text-sm">管理员</div>
          <div class="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white/80 text-sm">教师</div>
          <div class="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white/80 text-sm">学生</div>
        </div>
      </div>

      <div class="w-full lg:w-1/2 p-8">
        <div class="text-center mb-8 lg:hidden">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center mx-auto mb-4">
            <img src="@/assets/doubao.svg" alt="小智" class="w-8 h-8" />
          </div>
          <h2 class="text-xl font-bold text-gray-900">课程平台</h2>
        </div>

        <h2 class="text-2xl font-bold text-gray-900 mb-2 hidden lg:block">欢迎登录</h2>
        <p class="text-gray-500 mb-8 hidden lg:block">输入账号和密码，系统会自动识别身份</p>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">账号</label>
            <div class="relative">
              <User class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                v-model="account"
                type="text"
                placeholder="手机号 / 学号 / 工号"
                class="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none transition-all"
                @input="error = ''"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="请输入密码"
                class="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none transition-all"
                @input="error = ''"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <component :is="showPassword ? EyeOff : Eye" class="w-5 h-5" />
              </button>
            </div>
          </div>

          <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

          <button
            type="submit"
            :disabled="loading"
            :class="[
              'w-full py-3 font-medium rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2',
              loading ? 'bg-brand-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/25',
            ]"
          >
            <template v-if="loading">
              <LoaderCircle class="w-5 h-5 animate-spin" />
              登录中...
            </template>
            <template v-else>
              <LogIn class="w-5 h-5" />
              登录
            </template>
          </button>

          <div class="bg-brand-50 border border-brand-200 rounded-lg p-3 text-xs text-brand-700">
            <p class="font-medium mb-1">登录方式：手机号 或 学号/工号 + 密码</p>
            <p>首登密码为身份证后 6 位，登录后需修改密码</p>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Eye, EyeOff, LogIn, LoaderCircle } from 'lucide-vue-next'
import { unifiedLogin } from '@/api'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const store = useAppStore()

const account = ref('')
const password = ref('')
const showPassword = ref(false)
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

function completeLogin(user: { name: string; role: string; sub_role?: string }, portal: string, options?: {
  token?: string
  userInfo?: unknown
}) {
  const { isTeacherFromDb, isMentorFromDb } = getExtraRoleFlags(user.name, user.sub_role)

  if (options?.token) {
    localStorage.setItem('token', options.token)
  }

  if (options?.userInfo) {
    localStorage.setItem('userInfo', JSON.stringify(options.userInfo))
  }

  store.login(
    user.name,
    resolveStoreRole(user.role, user.sub_role),
    isTeacherFromDb,
    isMentorFromDb,
  )

  loading.value = false
  router.push(portal)
}

async function handleLogin() {
  if (!account.value.trim() || !password.value.trim()) {
    error.value = '请输入账号和密码'
    return
  }

  loading.value = true
  error.value = ''

  const acc = account.value.trim()
  const pwd = password.value.trim()

  try {
    const data = await unifiedLogin(acc, pwd)
    if (data.need_change_password) {
      // 首登强制改密：存 portal，跳改密页
      localStorage.setItem('token', data.token)
      localStorage.setItem('userInfo', JSON.stringify({ ...data.user, userNo: data.user?.userNo || '' }))
      localStorage.setItem('pendingPortal', data.portal || '/')
      loading.value = false
      router.push('/change-password')
      return
    }
    completeLogin(data.user, data.portal || '/', {
      token: data.token,
      userInfo: data.user,
    })
  } catch (err: any) {
    error.value = err instanceof Error ? err.message : '登录失败，请稍后再试'
    loading.value = false
  }
}
</script>
