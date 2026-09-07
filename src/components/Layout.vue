<template>
  <div id="d3-layout-root" class="flex min-h-screen bg-white">
    <!-- 移动端顶部栏 -->
    <div class="md:hidden fixed top-0 left-0 right-0 z-30 bg-brand-750 text-white flex items-center px-4 h-12 shadow">
      <button @click="mobileNavOpen = true" aria-label="打开菜单" class="p-2 -ml-2 rounded hover:bg-white/10">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <span class="ml-2 text-sm font-medium">课程平台</span>
    </div>

    <!-- 侧边栏：桌面静态 / 移动抽屉 -->
    <div
      :class="[
        'fixed inset-y-0 left-0 z-40 transition-transform duration-200',
        'md:relative md:translate-x-0 md:flex md:z-auto',
        mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ]"
    >
      <Sidebar />
    </div>
    <!-- 移动端遮罩 -->
    <div v-if="mobileNavOpen" @click="mobileNavOpen = false" class="md:hidden fixed inset-0 z-30 bg-black/40"></div>

    <main class="flex-1 overflow-auto pt-12 md:pt-0">
      <div class="p-4 md:p-6 max-w-7xl mx-auto">
        <router-view />
      </div>
    </main>
    <AgentChat />
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { useRouter, useRoute } from 'vue-router'
import Sidebar from './Sidebar.vue'
import AgentChat from './AgentChat.vue'

const store = useAppStore()
const router = useRouter()
const route = useRoute()

const mobileNavOpen = ref(false)

if (!store.isLoggedIn) router.replace('/login')

// 切换页面时关闭移动端抽屉
watch(() => route.path, () => { mobileNavOpen.value = false })

// 管理员必须选择学院后才能使用管理功能
watch(() => store.currentRole, () => {
  checkDepartment()
}, { immediate: true })

function checkDepartment() {
  if (store.currentRole === 'admin' && !store.selectedDepartmentId && route.path !== '/admin') {
    router.replace('/admin')
  }
}

onMounted(() => {
  store.checkAndGenerateSessionReminders()
  store.generateAutoTodos()
})

// 每次切换页面时重新生成自动待办（让红点实时更新）
watch(
  () => route.path,
  () => {
    store.generateAutoTodos()
  },
)
</script>
