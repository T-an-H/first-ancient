<template>
  <div class="space-y-1">
    <div class="flex items-center gap-3 px-3 py-2 rounded-lg border" :class="colorClass">
      <component :is="icon" class="w-4 h-4" />
      <span class="text-xs font-medium min-w-[5em]">{{ typeLabel }}</span>
      <div class="flex-1">
        <div v-if="receivedEvals.length > 0" class="flex items-center gap-2">
          <span class="text-sm font-bold">{{ avgScore }}分</span>
          <span class="text-[10px] text-gray-400">(来自{{ receivedEvals.length }}人)</span>
          <div class="flex gap-1 ml-1">
            <span v-for="e in receivedEvals" :key="e.id" class="text-[10px] px-1.5 py-0.5 bg-white rounded border text-gray-400" :title="`${e.evaluatorName}: ${e.score}分`">
              {{ e.evaluatorName }}:{{ e.score }}
            </span>
          </div>
        </div>
        <span v-else class="text-xs text-gray-400">暂无互评数据</span>
      </div>
    </div>

    <div v-if="myGroup && currentTargets.length > 0" class="ml-8">
      <button @click="showGive = !showGive" class="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-600">
        {{ showGive ? '收起' : `给${peerLabel}评价 (${submittedCount}/${currentTargets.length})` }}
      </button>

      <div v-if="showGive" :class="`mt-1.5 p-2 rounded-lg border space-y-2 ${isIntraGroup ? 'bg-brand-600/10 border-brand-400/20' : 'bg-brand-400/10 border-brand-400/20'}`">
        <p class="text-[10px] text-gray-400">{{ peerTitle }}：{{ isIntraGroup ? '请为以下同学打分' : '请为以下小组统一打分' }}</p>

        <template v-if="isIntraGroup">
          <div v-for="target in intraTargets" :key="target.studentId" class="flex items-center gap-2 px-2 py-1.5 bg-white rounded border border-blue-50">
            <span class="text-xs font-medium text-gray-800 min-w-[4em]">{{ target.studentName }}</span>
            <template v-if="hasSubmittedPeerEval(target.studentId)">
              <span class="text-[10px] text-brand-600 ml-auto">已评 {{ getExistingEval(target.studentId)?.score }}分</span>
            </template>
            <template v-else>
              <div class="flex items-center gap-1 ml-auto">
                <input type="range" min="0" max="100" :value="peerScores[target.studentId] ?? 75" @input="(e) => setPeerScore(target.studentId, Number((e.target as HTMLInputElement).value))" class="w-20 h-1" />
                <span class="text-xs font-bold w-8 text-center">{{ peerScores[target.studentId] ?? 75 }}</span>
                <button @click="handleSubmitPeerEval(target.studentId)" class="text-[10px] px-1.5 py-0.5 bg-brand-600 text-white rounded hover:bg-brand-800">提交</button>
              </div>
            </template>
          </div>
        </template>
        <template v-else>
          <div v-for="target in interGroupTargets" :key="target.groupId" class="px-2 py-2 bg-white rounded border border-purple-50">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-gray-800 min-w-[4em]">{{ target.groupName }}</span>
              <span class="text-[10px] text-gray-400">成员：{{ target.memberNames.join('、') }}</span>
              <template v-if="hasSubmittedGroupEval(target.groupId)">
                <span class="text-[10px] text-brand-600 ml-auto">已评 {{ getGroupExistingEval(target.groupId)?.score }}分</span>
              </template>
              <template v-else>
                <div class="flex items-center gap-1 ml-auto">
                  <input type="range" min="0" max="100" :value="peerScores[target.groupId] ?? 75" @input="(e) => setPeerScore(target.groupId, Number((e.target as HTMLInputElement).value))" class="w-20 h-1" />
                  <span class="text-xs font-bold w-8 text-center">{{ peerScores[target.groupId] ?? 75 }}</span>
                  <button @click="handleSubmitGroupEval(target.groupId, target.groupName)" class="text-[10px] px-1.5 py-0.5 bg-purple-500 text-white rounded hover:bg-purple-600">提交</button>
                </div>
              </template>
            </div>
          </div>
        </template>

        <button v-if="submittedCount < currentTargets.length" @click="handleSubmitAll" class="text-[10px] px-2 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 w-full">
          一键提交全部 ({{ currentTargets.length - submittedCount }}组未评)
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import { useAppStore } from '@/stores/app'
import type { Evaluation, EvalType } from '@/types'
import { EvalTypeLabels } from '@/types'
import { getNow } from '@/lib/date'
import { makeEvalItemsForTotal } from '@/lib/evalStandards'

const props = defineProps<{
  record: Evaluation | undefined
  courseId: string
  studentId: string
  studentName: string
  sessionNumber: number
  type: string
  colorClass: string
  icon: Component
  typeLabel: string
}>()

const store = useAppStore()
const showGive = ref(false)
const peerScores = ref<Record<string, number>>({})

const setPeerScore = (key: string, val: number) => {
  peerScores.value = { ...peerScores.value, [key]: val }
}

const isIntraGroup = computed(() => props.type === 'intra_group')

const receivedEvals = computed(() =>
  store.evaluations.filter(
    (e) => e.courseId === props.courseId && e.studentId === props.studentId && e.sessionNumber === props.sessionNumber && e.type === props.type && e.evaluatorId !== props.studentId
  )
)

const avgScore = computed(() =>
  receivedEvals.value.length > 0
    ? Math.round(receivedEvals.value.reduce((s, e) => s + e.score, 0) / receivedEvals.value.length)
    : null
)

const groups = computed(() => store.studentGroups.filter((g) => g.courseId === props.courseId))
const myGroup = computed(() => groups.value.find((g) => g.memberIds.includes(props.studentId)))

const intraTargets = computed(() => {
  if (!isIntraGroup.value || !myGroup.value) return []
  return myGroup.value.memberIds
    .filter((id) => id !== props.studentId)
    .map((id) => {
      const s = store.students.find((st) => st.id === id)
      return { studentId: id, studentName: s?.name || '未知', groupName: myGroup.value!.name }
    })
})

const interGroupTargets = computed(() => {
  if (isIntraGroup.value || !myGroup.value) return []
  return groups.value
    .filter((g) => g.id !== myGroup.value!.id)
    .map((g) => ({
      groupId: g.id,
      groupName: g.name,
      memberIds: g.memberIds,
      memberNames: g.memberIds.map((id) => store.students.find((s) => s.id === id)?.name || '未知'),
    }))
})

const currentTargets = computed(() => isIntraGroup.value ? intraTargets.value : interGroupTargets.value)
const peerLabel = computed(() => isIntraGroup.value ? '组内同学' : '其他小组')
const peerTitle = computed(() => isIntraGroup.value ? '评测同组同学' : '评价其他小组')

const hasSubmittedPeerEval = (targetId: string) => {
  return store.evaluations.some(
    (e) => e.courseId === props.courseId && e.studentId === targetId && e.sessionNumber === props.sessionNumber && e.type === props.type && e.evaluatorId === props.studentId
  )
}

const hasSubmittedGroupEval = (groupId: string) => {
  if (!myGroup.value) return false
  const targetGroup = groups.value.find((g) => g.id === groupId)
  if (!targetGroup) return false
  return targetGroup.memberIds.some((mid) =>
    store.evaluations.some(
      (e) => e.courseId === props.courseId && e.studentId === mid && e.sessionNumber === props.sessionNumber && e.type === props.type && e.evaluatorId === props.studentId
    )
  )
}

const getExistingEval = (targetId: string) => {
  return store.evaluations.find(
    (e) => e.courseId === props.courseId && e.studentId === targetId && e.sessionNumber === props.sessionNumber && e.type === props.type && e.evaluatorId === props.studentId
  )
}

const getGroupExistingEval = (groupId: string) => {
  const targetGroup = groups.value.find((g) => g.id === groupId)
  if (!targetGroup || !targetGroup.memberIds[0]) return null
  return store.evaluations.find(
    (e) => e.courseId === props.courseId && e.studentId === targetGroup.memberIds[0] && e.sessionNumber === props.sessionNumber && e.type === props.type && e.evaluatorId === props.studentId
  )
}

const submittedCount = computed(() =>
  isIntraGroup.value
    ? intraTargets.value.filter((t) => hasSubmittedPeerEval(t.studentId)).length
    : interGroupTargets.value.filter((t) => hasSubmittedGroupEval(t.groupId)).length
)

const handleSubmitPeerEval = (targetId: string) => {
  const score = peerScores.value[targetId]
  if (score === undefined || score < 0 || score > 100) return
  const existing = getExistingEval(targetId)
  // 互评只填总分，按比例拆成各项明细落库，保证再次打开能回显
  const items = makeEvalItemsForTotal(props.type as EvalType, score)
  const ev = {
    id: existing ? existing.id : `ev-peer-${Date.now()}-${targetId}`,
    courseId: props.courseId,
    studentId: targetId,
    sessionNumber: props.sessionNumber,
    type: props.type as EvalType,
    score,
    items,
    evaluatorId: props.studentId,
    evaluatorName: props.studentName,
    createdAt: getNow().toISOString().split('T')[0],
  }
  if (existing) {
    store.updateEvaluation(ev.id, { score, items, createdAt: ev.createdAt })
  } else {
    store.addEvaluation(ev)
  }
}

const handleSubmitGroupEval = (groupId: string, groupName: string) => {
  const score = peerScores.value[groupId]
  if (score === undefined || score < 0 || score > 100) return
  const targetGroup = groups.value.find((g) => g.id === groupId)
  if (!targetGroup) return
  targetGroup.memberIds.forEach((mid) => {
    const existing = store.evaluations.find(
      (e) => e.courseId === props.courseId && e.studentId === mid && e.sessionNumber === props.sessionNumber && e.type === props.type && e.evaluatorId === props.studentId
    )
    const items = makeEvalItemsForTotal(props.type as EvalType, score)
    const ev = {
      id: existing ? existing.id : `ev-peer-${Date.now()}-${groupId}-${mid}`,
      courseId: props.courseId,
      studentId: mid,
      sessionNumber: props.sessionNumber,
      type: props.type as EvalType,
      score,
      items,
      evaluatorId: props.studentId,
      evaluatorName: props.studentName,
      createdAt: getNow().toISOString().split('T')[0],
    }
    if (existing) {
      store.updateEvaluation(ev.id, { score, items, createdAt: ev.createdAt })
    } else {
      store.addEvaluation(ev)
    }
  })
}

const handleSubmitAll = () => {
  if (isIntraGroup.value) {
    intraTargets.value.forEach((t) => {
      if (peerScores.value[t.studentId] !== undefined && !hasSubmittedPeerEval(t.studentId)) {
        handleSubmitPeerEval(t.studentId)
      }
    })
  } else {
    interGroupTargets.value.forEach((t) => {
      if (peerScores.value[t.groupId] !== undefined && !hasSubmittedGroupEval(t.groupId)) {
        handleSubmitGroupEval(t.groupId, t.groupName)
      }
    })
  }
  showGive.value = false
  peerScores.value = {}
}
</script>