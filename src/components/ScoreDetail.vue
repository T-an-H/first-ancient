<template>
  <div v-if="open" class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" @click="onClose">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" @click.stop>
      <div class="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-brand-400/20">
        <div>
          <h2 class="text-lg font-bold text-gray-900">{{ studentName }}</h2>
          <p class="text-sm text-gray-400">{{ courseTitle }}</p>
        </div>
        <button @click="onClose" class="p-2 rounded-lg hover:bg-brand-400/10 transition-colors">
          <X class="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div class="p-5 space-y-5">
        <div v-if="!hasDetail && (!totalScore || totalScore <= 0) && (!examScores || examScores.length === 0)" class="text-center py-8 text-gray-400 text-sm">暂无分项成绩数据</div>

        <template v-if="hasDetail">
          <SectionCalc
            title="平时成绩"
            :weight="cfg.regularWeight"
            :score="regularScore"
            :contribution="regularContrib"
            :items="regularSubs"
          />

          <SectionCalc
            v-if="cfg.midtermWeight > 0"
            title="期中成绩"
            :weight="cfg.midtermWeight"
            :score="midtermScore"
            :contribution="midtermContrib"
            :items="midtermSubs"
          />

          <SectionCalc
            v-if="cfg.finalWeight > 0"
            title="期末成绩"
            :weight="cfg.finalWeight"
            :score="finalScore"
            :contribution="finalContrib"
            :items="finalSubs"
          />
        </template>

        <!-- 总成绩：无论是否有分项数据都显示 -->
        <div v-if="totalScore && totalScore > 0" class="border-t border-brand-400/20 pt-4">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-400">最终成绩</span>
            <span class="text-2xl font-bold text-gray-900 tabular-nums">{{ (totalScore ?? 0).toFixed(1) }}</span>
          </div>
          <p v-if="hasDetail" class="text-xs text-gray-400 mt-1 tabular-nums">
            {{ regularScore.toFixed(1) }}×{{ cfg.regularWeight }}%
            {{ cfg.midtermWeight > 0 ? `+ ${midtermScore.toFixed(1)}×${cfg.midtermWeight}%` : '' }}
            {{ cfg.finalWeight > 0 ? `+ ${finalScore.toFixed(1)}×${cfg.finalWeight}%` : '' }}
            =
            {{ regularContrib.toFixed(1) }}{{ cfg.midtermWeight > 0 ? ` + ${midtermContrib.toFixed(1)}` : '' }}{{ cfg.finalWeight > 0 ? ` + ${finalContrib.toFixed(1)}` : '' }}
            <span v-if="qualityValue > 0" class="text-emerald-600">+ {{ qualityLabel }} {{ qualityValue.toFixed(1) }}</span>
            =
            <span class="font-semibold">{{ (totalScore ?? 0).toFixed(1) }}</span>
          </p>
        </div>

        <!-- 考试/项目成绩（来自课程详情成绩录入） -->
        <div v-if="examScores && examScores.length > 0" class="border-t border-brand-400/20 pt-4">
          <div class="text-sm font-medium text-gray-400 mb-2">考试/项目成绩</div>
          <div class="space-y-1.5">
            <div v-for="es in examScores" :key="es.id" class="flex items-center justify-between">
              <span class="text-xs text-gray-400">{{ es.examName }}（{{ es.weight }}%）</span>
              <span class="text-sm font-medium text-gray-800 tabular-nums">{{ es.score.toFixed(1) }}</span>
            </div>
          </div>
        </div>

        <div class="bg-brand-400/10 rounded-xl p-4 text-xs text-gray-400 space-y-1">
          <p><span class="font-medium">权重配置：</span>平时 {{ cfg.regularWeight }}% + 期中 {{ cfg.midtermWeight }}% + 期末 {{ cfg.finalWeight }}%{{ qualityConfigText }}</p>
          <p v-if="cfg.regularWeight > 0">
            平时构成：个人自评 {{ cfg.selfEvalWeight }}% · 小组内互评 {{ cfg.peerReviewWeight }}% · 小组间互评 {{ cfg.interGroupEvalWeight }}% · 教师评价 {{ cfg.teacherScoreWeight }}% · 企业导师评价 {{ cfg.mentorScoreWeight }}%
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import type { DetailedGrade, GradeWeightConfig, ExamScore } from '@/types'
import SectionCalc from './ScoreDetail/SectionCalc.vue'

const props = defineProps<{
  open: boolean
  onClose: () => void
  studentName: string
  courseTitle: string
  detail: DetailedGrade | null
  cfg: GradeWeightConfig
  totalScore: number
  examScores?: ExamScore[]
  courseId?: string
  studentId?: string
}>()

const store = useAppStore()

const qualityValue = computed(() => {
  if (!props.courseId || !props.studentId) return 0
  return store.getStudentQualityScore(props.courseId, props.studentId)
})

const usesQualityWeight = computed(() => (props.cfg.qualityEvalWeight ?? 0) > 0)
const qualityLabel = computed(() => usesQualityWeight.value ? '素质评价' : '素质加成')
const qualityConfigText = computed(() => {
  if (usesQualityWeight.value) {
    return ` + 素质评价 ${props.cfg.qualityEvalWeight ?? 0}%`
  }
  return `；素质加成上限 ${props.cfg.qualityEvalMaxBonus ?? 10} 分`
})

const wAvg = (subScores: { score: number | undefined; weight: number }[]): number => {
  const totalWeight = subScores.reduce((s, item) => s + item.weight, 0)
  if (totalWeight === 0) return 0
  const total = subScores.reduce((s, item) => s + (item.score ?? 0) * item.weight, 0)
  return Math.round((total / totalWeight) * 100) / 100
}

const regularSubs = computed(() => [
  { score: props.detail?.selfEvalScore, weight: props.cfg.selfEvalWeight, label: '个人自评' },
  { score: props.detail?.peerReviewScore, weight: props.cfg.peerReviewWeight, label: '小组内互评' },
  { score: props.detail?.interGroupScore, weight: props.cfg.interGroupEvalWeight, label: '小组间互评' },
  { score: props.detail?.teacherScore, weight: props.cfg.teacherScoreWeight, label: '教师评价' },
  { score: props.detail?.mentorScore, weight: props.cfg.mentorScoreWeight, label: '企业导师评价' },
])

const midtermSubs = computed(() => [
  { score: props.detail?.midtermExamScore, weight: props.cfg.midtermExamWeight, label: '期中考试' },
  { score: props.detail?.midtermProjectScore, weight: props.cfg.midtermProjectWeight, label: '项目成绩(期中)' },
])

const finalSubs = computed(() => [
  { score: props.detail?.finalExamScore, weight: props.cfg.finalExamWeight, label: '期末测试' },
  { score: props.detail?.finalProjectScore, weight: props.cfg.finalProjectWeight, label: '项目成绩(期末)' },
])

const regularScore = computed(() => wAvg(regularSubs.value))
const midtermScore = computed(() => wAvg(midtermSubs.value))
const finalScore = computed(() => wAvg(finalSubs.value))
const regularContrib = computed(() => regularScore.value * props.cfg.regularWeight / 100)
const midtermContrib = computed(() => midtermScore.value * props.cfg.midtermWeight / 100)
const finalContrib = computed(() => finalScore.value * props.cfg.finalWeight / 100)

const hasDetail = computed(() =>
  props.detail &&
  (regularSubs.value.some((s) => s.score !== undefined) ||
   midtermSubs.value.some((s) => s.score !== undefined) ||
   finalSubs.value.some((s) => s.score !== undefined))
)
</script>
