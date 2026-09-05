<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[90] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="onClose" />
      <div :class="`relative bg-white rounded-xl shadow-2xl w-full ${maxWidth} mx-4 max-h-[90vh] overflow-y-auto`">
        <div class="flex items-center justify-between px-6 py-4 border-b border-brand-400/20">
          <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
          <button @click="onClose" class="p-1 rounded-lg hover:bg-brand-400/10 transition-colors">
            <X class="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div class="p-6">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
  onClose: () => void
  title: string
  maxWidth?: string
}>()

watch(() => props.isOpen, (val) => {
  if (val) {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', handler)
    if (!val) document.removeEventListener('keydown', handler)
  }
})
</script>
