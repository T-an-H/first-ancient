<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">待办</h1>
      <p class="text-gray-400 mt-1">查看并处理需要你完成的事项</p>
    </div>

    <div class="bg-white rounded-xl p-6 border border-brand-400/30 shadow-sm">
      <TodoList />
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import TodoList from './ExtraFeatures/TodoList.vue'

const store = useAppStore()

onMounted(() => {
  // 扫描所有课程，为已到时间的评价轮次生成待办提醒
  store.checkAndGenerateSessionReminders()
  // 全自动待办生成
  store.generateAutoTodos()
})
</script>
