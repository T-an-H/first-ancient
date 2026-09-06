<template>
  <div>
    <div v-if="hasData" ref="radarEl" class="h-72 w-full"></div>
    <div v-else class="rounded-lg bg-gray-50 px-3 py-6 text-center text-xs text-gray-400">
      {{ emptyText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = withDefaults(defineProps<{
  labels: string[]
  values: number[]
  count?: number
  emptyText?: string
}>(), {
  count: 0,
  emptyText: '暂无数据',
})

const radarEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const hasData = computed(() => props.count > 0 && props.values.length > 0)

function renderChart() {
  if (!hasData.value || !radarEl.value) return
  if (!chart) chart = echarts.init(radarEl.value)
  chart.setOption({
    tooltip: {},
    radar: {
      indicator: props.labels.map((label) => ({ name: label, max: 100 })),
      radius: '68%',
      splitNumber: 4,
    },
    series: [{
      type: 'radar',
      data: [{ value: props.values, name: '能力评价', areaStyle: { opacity: 0.22 } }],
    }],
  })
}

watch(
  () => [props.count, ...props.values],
  () => nextTick(renderChart),
  { flush: 'post', immediate: true }
)

onBeforeUnmount(() => {
  chart?.dispose()
  chart = null
})
</script>
