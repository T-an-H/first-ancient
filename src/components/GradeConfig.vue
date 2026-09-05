<template>
  <div v-if="open" class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" @click="onClose">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto" @click.stop>
      <div class="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-brand-400/20">
        <div class="flex items-center gap-3">
          <Settings class="w-5 h-5 text-gray-800" />
          <h2 class="text-lg font-bold text-gray-900">成绩权重配置</h2>
        </div>
        <button @click="onClose" class="p-2 rounded-lg hover:bg-brand-400/10 transition-colors">
          <X class="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div class="p-6 space-y-6">
        <Section title="总成绩权重" :hint="`合计：${mainTotal}%${mainTotal !== 100 ? '（须等于 100%）' : ''}`" :valid="mainTotal === 100">
          <Slider label="平时成绩" :val="cfg.regularWeight" @change="(v: number) => update('regularWeight', v)" />
          <Slider label="期中成绩" :val="cfg.midtermWeight" @change="(v: number) => update('midtermWeight', v)" />
          <Slider label="期末成绩" :val="cfg.finalWeight" @change="(v: number) => update('finalWeight', v)" />
          <Slider label="素质评价" :val="cfg.qualityEvalWeight" @change="(v: number) => update('qualityEvalWeight', v)" />
        </Section>

        <Section title="平时成绩构成" :hint="`合计：${regularTotal}%${regularTotal !== 100 ? '（须等于 100%）' : ''}`" :valid="regularTotal === 100">
          <Slider label="个人自评" :val="cfg.selfEvalWeight" @change="(v: number) => update('selfEvalWeight', v)" />
          <Slider label="小组内互评" :val="cfg.peerReviewWeight" @change="(v: number) => update('peerReviewWeight', v)" />
          <Slider label="小组间互评" :val="cfg.interGroupEvalWeight" @change="(v: number) => update('interGroupEvalWeight', v)" />
          <Slider label="教师评价" :val="cfg.teacherScoreWeight" @change="(v: number) => update('teacherScoreWeight', v)" />
          <Slider label="企业导师评价" :val="cfg.mentorScoreWeight" @change="(v: number) => update('mentorScoreWeight', v)" />
        </Section>

        <Section title="期中成绩构成" :hint="`合计：${midtermSubTotal}%${midtermSubTotal !== 100 ? '（须等于 100%）' : ''}`" :valid="midtermSubTotal === 100">
          <Slider label="期中考试" :val="cfg.midtermExamWeight" @change="(v: number) => update('midtermExamWeight', v)" />
          <Slider label="项目成绩" :val="cfg.midtermProjectWeight" @change="(v: number) => update('midtermProjectWeight', v)" />
        </Section>

        <Section title="期末成绩构成" :hint="`合计：${finalSubTotal}%${finalSubTotal !== 100 ? '（须等于 100%）' : ''}`" :valid="finalSubTotal === 100">
          <Slider label="期末测试" :val="cfg.finalExamWeight" @change="(v: number) => update('finalExamWeight', v)" />
          <Slider label="项目成绩" :val="cfg.finalProjectWeight" @change="(v: number) => update('finalProjectWeight', v)" />
        </Section>
      </div>

      <div class="sticky bottom-0 bg-white border-t border-brand-400/20 p-4 flex justify-end gap-3">
        <button @click="onClose" class="px-5 py-2.5 rounded-lg border border-brand-400/30 hover:bg-brand-400/10 text-gray-800 transition-colors text-sm font-medium">取消</button>
        <button @click="handleSave" :disabled="mainTotal !== 100 || regularTotal !== 100 || midtermSubTotal !== 100 || finalSubTotal !== 100"
          class="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-brand-400 text-white rounded-lg transition-colors text-sm font-medium">
          <Save class="w-4 h-4" /> 保存配置
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Settings, Save, X } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { getDefaultGradeConfig } from '@/types'
import type { GradeWeightConfig } from '@/types'
import Slider from './GradeConfig/Slider.vue'
import Section from './GradeConfig/Section.vue'

const props = defineProps<{
  courseId: string
  open: boolean
  onClose: () => void
}>()

const store = useAppStore()
const cfg = ref<GradeWeightConfig>(getDefaultGradeConfig(props.courseId))

watch(() => props.open, (val) => {
  if (val) {
    cfg.value = store.gradeConfigs[props.courseId] || getDefaultGradeConfig(props.courseId)
  }
})

const update = (key: keyof GradeWeightConfig, val: number) => {
  cfg.value = { ...cfg.value, [key]: Math.max(0, Math.min(100, val || 0)) }
}

const mainTotal = computed(() => cfg.value.regularWeight + cfg.value.midtermWeight + cfg.value.finalWeight + cfg.value.qualityEvalWeight)
const regularTotal = computed(() => cfg.value.selfEvalWeight + cfg.value.peerReviewWeight + cfg.value.interGroupEvalWeight + cfg.value.teacherScoreWeight + cfg.value.mentorScoreWeight)
const midtermSubTotal = computed(() => cfg.value.midtermExamWeight + cfg.value.midtermProjectWeight)
const finalSubTotal = computed(() => cfg.value.finalExamWeight + cfg.value.finalProjectWeight)

const handleSave = () => {
  store.saveGradeConfig({ ...cfg.value, courseId: props.courseId })
  store.markConfigCompleted(props.courseId, 'weights')
  props.onClose()
}
</script>

