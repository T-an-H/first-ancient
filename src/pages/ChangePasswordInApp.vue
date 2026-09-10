<template>
  <div class="min-h-screen bg-gradient-to-br from-brand-50 to-brand-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">修改密码</h2>
      <p class="text-gray-500 mb-6">请输入旧密码和新密码</p>

      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">旧密码</label>
          <input
            v-model="oldPassword"
            type="password"
            placeholder="请输入当前密码"
            class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none transition-all"
          />
        </div>
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
          <label class="block text-sm font-medium text-gray-700 mb-1.5">确认新密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入新密码"
            class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none transition-all"
          />
        </div>

        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
        <p v-if="success" class="text-green-600 text-sm">{{ success }}</p>

        <div class="flex gap-3">
          <button
            type="button"
            @click="goBack"
            class="flex-1 py-3 font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            返回
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="flex-1 py-3 font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-lg disabled:opacity-50"
          >
            {{ loading ? '提交中...' : '确认修改' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { changePassword } from '@/api'

const router = useRouter()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)

function goBack() {
  router.back()
}

async function handleSubmit() {
  error.value = ''
  success.value = ''

  if (!oldPassword.value.trim()) {
    error.value = '请输入旧密码'
    return
  }
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
    await changePassword(newPassword.value, oldPassword.value)
    success.value = '密码修改成功，即将返回...'
    setTimeout(() => {
      router.back()
    }, 1500)
  } catch (err: any) {
    error.value = err instanceof Error ? err.message : '修改失败，请稍后再试'
    loading.value = false
  }
}
</script>
