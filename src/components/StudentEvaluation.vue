<template>
  <div>
    <!-- 无配置 -->
    <div v-if="!config" class="bg-brand-400/10 rounded-lg p-4 text-center text-sm text-gray-400">该课程尚未配置评价方案</div>
    <div v-else-if="enabledTypes.length === 0" class="bg-brand-400/10 rounded-lg p-4 text-center text-sm text-gray-400">当前课程配置下无可用的评价类型</div>
    <div v-else class="space-y-3">
      <!-- 配置标签 -->
      <div class="flex items-center gap-2 flex-wrap mb-2">
        <span class="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-600 border border-brand-400">{{ EvalTemplateLabels[config.template] }}</span>
        <span class="text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600 border border-cyan-200">
          {{ EvalFrequencyLabels[config.frequency] }}
          <span class="ml-1 text-[10px] text-cyan-400">（共{{ sessionCount }}次）</span>
        </span>
        <span v-if="!courseHasGroups" class="text-[10px] px-1.5 py-0.5 rounded bg-brand-400/10 text-gray-400">小组内/小组间互评自动隐藏（未分组）</span>
        <span v-if="!config.hasMentor" class="text-[10px] px-1.5 py-0.5 rounded bg-brand-400/10 text-gray-400">企业导师评价自动隐藏（无企业参与）</span>
      </div>

      <!-- 评价场次列表 -->
      <div v-for="session in displaySessions" :key="session" class="border rounded-lg overflow-hidden" :class="sessionReminders[session]?.status === 'overdue' ? 'border-brand-400' : 'border-brand-400/20'">
        <button @click="sessionState(session).disabled ? null : openEvalModal(session)" :disabled="sessionState(session).disabled" class="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors" :class="sessionState(session).disabled ? 'bg-brand-400/10 cursor-not-allowed text-gray-400' : 'hover:bg-brand-400/10 text-gray-800'">
          <div class="flex items-center gap-3">
            <span :class="sessionState(session).disabled ? 'text-gray-400' : 'font-medium text-gray-800'">第{{ session }}次评价</span>
            <span v-if="sessionState(session).disabled && sessionState(session).reason" class="text-xs px-1.5 py-0.5 rounded-full bg-brand-400/10 text-gray-400">
              {{ sessionState(session).reason }}
            </span>
            <span v-else :class="`text-xs px-1.5 py-0.5 rounded-full ${sessionReminders[session]?.status === 'overdue' ? 'bg-brand-600/15 text-brand-600' : sessionReminders[session]?.status === 'pending' ? 'bg-brand-600/15 text-brand-600' : 'text-gray-400'}`">
              {{ sessionReminders[session]?.status === 'overdue' ? '已逾期' : sessionReminders[session]?.status === 'pending' ? '待评价' : '' }}
            </span>
            <span class="text-xs" :class="sessionState(session).disabled ? 'text-gray-400/60' : 'text-gray-400'">{{ getSessionEvals(session).filter(e => e.record).length }}/{{ enabledTypes.length }} 项已评</span>
          </div>
          <div class="flex items-center gap-2">
            <CheckCircle v-if="!sessionState(session).disabled && getSessionEvals(session).filter(e => e.record).length === enabledTypes.length" class="w-3.5 h-3.5 text-brand-600" />
            <Lock v-else-if="sessionState(session).disabled" class="w-3.5 h-3.5 text-gray-400/60" />
            <ChevronRight v-else class="w-4 h-4 text-gray-400" />
          </div>
        </button>
      </div>
    </div>

    <!-- 评价弹窗（移出 v-if 链，确保始终可渲染） -->
    <Modal :is-open="evalModalOpen" :on-close="closeEvalModal" :title="`第${editingSession}次评价填写`" max-width="max-w-2xl">
      <!-- 异常预警 -->
        <div v-if="modalAnomalies.length > 0" class="mb-4 bg-brand-600/10 border border-brand-400 rounded-lg p-3">
          <div class="flex items-center gap-2 text-brand-600 text-sm font-medium mb-1">
            <AlertTriangle class="w-4 h-4" />
            异常预警 ({{ modalAnomalies.length }}条)
          </div>
          <p v-for="a in modalAnomalies" :key="a.id" class="text-xs text-brand-600 ml-6">{{ a.warning }}</p>
        </div>

        <!-- 表单 - 各评价类型 -->
        <div class="space-y-4">
          <div v-for="{ type, record, icon: Icon } in modalEvalTypes" :key="type" class="flex items-start gap-3 p-3 rounded-lg border" :class="EvalTypeColors[type]">
            <component :is="Icon" class="w-4 h-4 mt-1" />
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold mb-1">{{ EvalTypeLabels[type] }}</p>

              <!-- 个人自评：分项评分 -->
              <div v-if="type === 'self'" class="space-y-2">
                <div
                  v-for="(item, itemIndex) in getEvalItemDefinitions('self')"
                  :key="itemIndex"
                  class="flex items-center justify-between gap-3 rounded bg-white/70 border border-brand-400/20 px-3 py-2"
                >
                  <span class="text-xs text-gray-800">{{ item.label }} ：</span>
                  <div class="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      :max="item.max"
                      :value="selfItemDraft[itemIndex] ?? ''"
                      @input="setSelfItemScore(itemIndex, $event)"
                      placeholder="填写分数"
                      class="w-24 rounded border border-gray-200 px-2 py-1 text-center text-sm outline-none focus:border-blue-500"
                    />
                    <span class="text-xs text-gray-400">/ {{ item.max }} 分</span>
                  </div>
                </div>
                <p v-if="validationErrors.self" class="text-xs text-brand-600">{{ validationErrors.self }}</p>
                <p class="text-right text-xs font-medium text-gray-700">合计：{{ selfItemTotal }} 分</p>
              </div>

              <!-- 教师/企业导师评价：查看 -->
              <div v-else-if="type === 'teacher' || type === 'mentor'" class="space-y-1.5">
                <template v-if="record?.items?.length">
                  <div v-for="(item, itemIndex) in record.items" :key="itemIndex" class="flex items-center justify-between text-xs">
                    <span class="text-gray-700">{{ item.label }}：</span>
                    <span class="font-medium text-gray-900">{{ item.score }} 分</span>
                  </div>
                  <div class="flex items-center justify-between border-t border-brand-400/10 pt-1 text-xs font-semibold text-gray-800">
                    <span>合计</span>
                    <span>{{ record.score }} 分</span>
                  </div>
                </template>
                <span v-else class="text-sm" :class="record ? 'font-bold' : 'text-gray-400'">
                  {{ record ? `${record.score}分` : '待评价' }}
                </span>
              </div>

              <!-- 小组内互评 / 小组间互评：按评价对象填写分项 -->
              <div v-else class="space-y-2">
                <div v-if="getPeerTargets(type).length === 0" class="text-xs text-gray-400">暂无互评目标</div>
                <div v-for="target in getPeerTargets(type)" :key="target.key" class="rounded border border-brand-400/20 bg-white/60 px-3 py-2">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-xs font-medium text-gray-800">{{ target.label }}</span>
                    <template v-if="hasSubmittedPeerFor(target)">
                      <span class="text-xs font-medium text-brand-600">已评 {{ getSubmittedPeerScore(target) }} 分</span>
                    </template>
                  </div>
                  <template v-if="!hasSubmittedPeerFor(target)">
                    <div class="mt-2 space-y-1.5">
                      <div
                        v-for="(item, itemIndex) in getEvalItemDefinitions(type)"
                        :key="itemIndex"
                        class="flex items-center justify-between gap-3"
                      >
                        <span class="text-xs text-gray-700">{{ item.label }} ：</span>
                        <div class="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            :max="item.max"
                            :value="getPeerItemScore(type, target.key, itemIndex)"
                            @input="setPeerItemScore(type, target.key, itemIndex, $event)"
                            placeholder="填写分数"
                            class="w-24 rounded border border-gray-200 px-2 py-1 text-center text-xs outline-none focus:border-blue-500"
                          />
                          <span class="text-[11px] text-gray-400">/ {{ item.max }}</span>
                        </div>
                      </div>
                      <p class="text-right text-[11px] font-medium text-gray-700">合计：{{ getPeerItemTotal(type, target.key) }} 分</p>
                    </div>
                    <p v-if="validationErrors[`peer_${target.key}`]" class="mt-1 text-xs text-brand-600">{{ validationErrors[`peer_${target.key}`] }}</p>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- 提交按钮 -->
          <div class="flex items-center gap-3 pt-2 border-t border-brand-400/20">
            <div v-if="submitError" class="flex-1 text-xs text-brand-600 flex items-center gap-1">
              <AlertTriangle class="w-3 h-3" />{{ submitError }}
            </div>
            <button @click="handleModalSubmit" class="ml-auto px-6 py-2 bg-brand-600 hover:bg-brand-800 text-white text-sm font-medium rounded-lg transition-colors">
              保存提交
            </button>
          </div>
        </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type Component } from 'vue'
import { useAppStore } from '@/stores/app'
import {
  AlertTriangle, User, Users, Building2, GraduationCap, Briefcase,
  CheckCircle, ChevronRight, Lock
} from 'lucide-vue-next'
import type { EvalType, EvalAnomaly, Evaluation } from '@/types'
import { EvalTypeLabels, EvalTypeColors, EvalTemplateLabels, EvalFrequencyLabels, TEMPLATE_EVAL_TYPES } from '@/types'
import Modal from './Modal.vue'
import { getNow } from '@/lib/date'
import {
  createEmptyEvalDraft,
  evalItemsFromDraft,
  getEvalItemDefinitions,
  scoreFromEvalDraft,
  type EvalScoreDraftValue,
} from '@/lib/evalStandards'

const props = defineProps<{
  courseId: string
  studentId: string
  studentName: string
  /** 指定评价轮次：放入某个项目/测试时只展示并填写该轮次 */
  sessionNumber?: number
}>()

const store = useAppStore()

// ===== 基础数据 =====
const config = computed(() => store.evalConfigs.find((c) => c.courseId === props.courseId))
const totalSessions = computed(() => store.getEvalSessions(props.courseId))
const sessionCount = computed(() => (props.sessionNumber ? 1 : totalSessions.value))
const displaySessions = computed(() =>
  props.sessionNumber
    ? [props.sessionNumber]
    : Array.from({ length: totalSessions.value }, (_, index) => index + 1)
)
const courseHasGroups = computed(() => store.hasGroups(props.courseId))

watch(() => props.courseId, () => {
  store.generateEvalReminders(props.courseId)
}, { immediate: true })

const baseEnabledTypes = computed(() => config.value ? TEMPLATE_EVAL_TYPES[config.value.template] : [])
const enabledTypes = computed(() =>
  baseEnabledTypes.value.filter((t) => {
    if ((t === 'intra_group' || t === 'inter_group') && !courseHasGroups.value) return false
    if (t === 'mentor' && !config.value?.hasMentor) return false
    return true
  })
)

// ===== 任务提醒状态 =====
const studentReminders = computed(() =>
  store.evalReminders.filter((r) => r.courseId === props.courseId && r.studentId === props.studentId)
)
const sessionReminders = computed(() => {
  const map: Record<number, any> = {}
  for (const r of studentReminders.value) {
    map[r.sessionNumber] = r
  }
  return map
})

// ===== 弹窗状态 =====
const evalModalOpen = ref(false)
const editingSession = ref(0)

function sessionState(session: number): { disabled: boolean; reason: string } {
  // 已锁定 → 不可评价
  if (store.isSessionLocked(props.courseId, session)) {
    return { disabled: true, reason: '该轮次评价已锁定' }
  }
  // 最终轮次已过截止期
  if (session === totalSessions.value && store.isFinalSessionDeadlinePassed?.(props.courseId, totalSessions.value)) {
    return { disabled: true, reason: '评价已截止' }
  }
  // 未到开启时间
  if (!store.isSessionTime(props.courseId, session)) {
    return { disabled: true, reason: session === 1 ? '第一节课尚未开始' : '该轮次尚未到开启时间' }
  }
  return { disabled: false, reason: '' }
}

function openEvalModal(session: number) {
  editingSession.value = session
  // 当第 N 次评价开启时，自动锁定第 1 ~ N-1 次
  store.autoLockPreviousSession(props.courseId, session)
  selfItemDraft.value = createEmptyEvalDraft('self')
  peerItemDrafts.value = {}
  validationErrors.value = {}
  submitError.value = ''
  evalModalOpen.value = true
}

function closeEvalModal() {
  evalModalOpen.value = false
  editingSession.value = 0
}

// ===== 弹窗内评价类型列表 =====
const modalEvalTypes = computed(() => {
  const icons: Record<EvalType, Component> = {
    self: User, intra_group: Users, inter_group: Building2, teacher: GraduationCap, mentor: Briefcase,
  }
  return enabledTypes.value.map((type) => ({
    type,
    record: getEvalForType(editingSession.value, type),
    icon: icons[type],
  }))
})

// ===== 弹窗内异常预警 =====
const modalAnomalies = computed(() => {
  if (!editingSession.value) return []
  return store.detectAnomalies(props.courseId, editingSession.value)
})

// ===== 分项评分草稿 =====
const selfItemDraft = ref<EvalScoreDraftValue[]>([])
const peerItemDrafts = ref<Record<string, EvalScoreDraftValue[]>>({})

function getPeerItemDraft(type: EvalType, key: string) {
  if (!peerItemDrafts.value[key]) {
    peerItemDrafts.value[key] = createEmptyEvalDraft(type)
  }
  return peerItemDrafts.value[key]
}

function setSelfItemScore(index: number, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  const parsed = Number(raw)
  const next: EvalScoreDraftValue = raw === '' || Number.isNaN(parsed) ? '' : parsed
  selfItemDraft.value = selfItemDraft.value.map((value, i) => (i === index ? next : value))
}

function getPeerItemScore(type: EvalType, key: string, index: number): EvalScoreDraftValue {
  return getPeerItemDraft(type, key)[index] ?? ''
}

function setPeerItemScore(type: EvalType, key: string, index: number, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  const parsed = Number(raw)
  const next: EvalScoreDraftValue = raw === '' || Number.isNaN(parsed) ? '' : parsed
  const draft = getPeerItemDraft(type, key)
  draft[index] = next
  peerItemDrafts.value = { ...peerItemDrafts.value, [key]: draft }
}

function getPeerItemTotal(type: EvalType, key: string) {
  const draft = getPeerItemDraft(type, key)
  return scoreFromEvalDraft(getEvalItemDefinitions(type), draft)
}

const selfItemTotal = computed(() =>
  scoreFromEvalDraft(getEvalItemDefinitions('self'), selfItemDraft.value)
)

// ===== 互评目标 =====
const groups = computed(() => store.studentGroups.filter((g) => g.courseId === props.courseId))
const myGroup = computed(() => groups.value.find((g) => g.memberIds.includes(props.studentId)))

interface PeerTarget {
  key: string
  label: string
  type: EvalType
  studentId?: string
  groupId?: string
  groupName?: string
  memberIds?: string[]
}

/** 根据组内成员的班级推断小组所属班级 */
function getGroupClass(groupId: string): string | null {
  const group = groups.value.find((g) => g.id === groupId)
  if (!group || group.memberIds.length === 0) return null
  const classes = new Set(group.memberIds.map((id) => store.students.find((s) => s.id === id)?.className).filter(Boolean))
  // 如果组内成员来自多个班级，返回 null（不应发生）
  return classes.size === 1 ? classes.values().next().value : null
}

function getPeerTargets(type: EvalType): PeerTarget[] {
  if (type === 'intra_group' && myGroup.value) {
    return myGroup.value.memberIds
      .filter((id) => id !== props.studentId)
      .map((id) => {
        const s = store.students.find((st) => st.id === id)
        return { key: id, label: s?.name || '未知', type, studentId: id }
      })
  }
  if (type === 'inter_group' && myGroup.value) {
    const myClass = getGroupClass(myGroup.value.id)
    return groups.value
      .filter((g) => g.id !== myGroup.value!.id && (myClass ? getGroupClass(g.id) === myClass : true))
      .map((g) => ({
        key: g.id,
        label: g.name,
        type,
        groupId: g.id,
        groupName: g.name,
        memberIds: g.memberIds,
      }))
  }
  return []
}

function hasSubmittedPeerFor(target: PeerTarget): boolean {
  if (target.type === 'intra_group' && target.studentId) {
    return store.evaluations.some(
      (e) => e.courseId === props.courseId && e.studentId === target.studentId &&
        e.sessionNumber === editingSession.value && e.type === target.type &&
        e.evaluatorId === props.studentId
    )
  }
  if (target.type === 'inter_group' && target.memberIds) {
    return target.memberIds.some((mid) =>
      store.evaluations.some(
        (e) => e.courseId === props.courseId && e.studentId === mid &&
          e.sessionNumber === editingSession.value && e.type === target.type &&
          e.evaluatorId === props.studentId
      )
    )
  }
  return false
}

function getSubmittedPeerScore(target: PeerTarget): number {
  if (target.type === 'intra_group' && target.studentId) {
    const ev = store.evaluations.find(
      (e) => e.courseId === props.courseId && e.studentId === target.studentId &&
        e.sessionNumber === editingSession.value && e.type === target.type &&
        e.evaluatorId === props.studentId
    )
    return ev?.score ?? 0
  }
  if (target.type === 'inter_group' && target.memberIds && target.memberIds[0]) {
    const ev = store.evaluations.find(
      (e) => e.courseId === props.courseId && e.studentId === target.memberIds[0] &&
        e.sessionNumber === editingSession.value && e.type === target.type &&
        e.evaluatorId === props.studentId
    )
    return ev?.score ?? 0
  }
  return 0
}

// ===== 验证与提交 =====
const validationErrors = ref<Record<string, string>>({})
const submitError = ref('')

function scoreColorClass(score: number): string {
  if (score >= 85) return 'text-brand-600'
  if (score >= 60) return 'text-brand-600'
  return 'text-brand-600'
}

function validateForm(): boolean {
  validationErrors.value = {}
  submitError.value = ''
  let valid = true

  // 验证个人自评分项
  const selfDefs = getEvalItemDefinitions('self')
  const missingSelf = selfDefs.some((item, index) => {
    const value = selfItemDraft.value[index]
    return value === '' || typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > item.max
  })
  if (missingSelf) {
    validationErrors.value = { ...validationErrors.value, self: '请完整填写个人自评各项分数' }
    valid = false
  }

  // 验证未提交的小组内/小组间互评分项
  for (const type of ['intra_group', 'inter_group'] as EvalType[]) {
    for (const target of getPeerTargets(type)) {
      if (hasSubmittedPeerFor(target)) continue
      const defs = getEvalItemDefinitions(type)
      const draft = getPeerItemDraft(type, target.key)
      const invalid = defs.some((item, index) => {
        const value = draft[index]
        return value === '' || typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > item.max
      })
      if (invalid) {
        validationErrors.value = {
          ...validationErrors.value,
          [`peer_${target.key}`]: '请完整填写该对象各项分数'
        }
        valid = false
      }
    }
  }

  if (!valid) {
    submitError.value = '请修正以上填写错误后再提交'
  }

  return valid
}

function handleModalSubmit() {
  if (!validateForm()) return

  const session = editingSession.value

  // 提交自评
  handleSelfSubmit(session)

  // 提交互评
  for (const type of ['intra_group', 'inter_group'] as EvalType[]) {
    for (const target of getPeerTargets(type)) {
      if (hasSubmittedPeerFor(target)) continue
      const draft = getPeerItemDraft(type, target.key)
      if (type === 'intra_group' && target.studentId) {
        submitPeerEval(target.studentId, session, type, draft)
      } else if (type === 'inter_group' && target.memberIds) {
        submitGroupEval(target, session, draft)
      }
    }
  }

  closeEvalModal()
}

// ===== 评价提交方法 =====
function getEvalForType(sessionNumber: number, type: EvalType) {
  return store.evaluations.find(
    (e) => e.courseId === props.courseId && e.studentId === props.studentId && e.sessionNumber === sessionNumber && e.type === type
  )
}

function getSessionEvals(session: number) {
  const icons: Record<EvalType, Component> = {
    self: User, intra_group: Users, inter_group: Building2, teacher: GraduationCap, mentor: Briefcase,
  }
  return enabledTypes.value.map((type) => ({ type, record: getEvalForType(session, type), icon: icons[type] }))
}

function handleSelfSubmit(sessionNumber: number) {
  const existing = getEvalForType(sessionNumber, 'self')
  const defs = getEvalItemDefinitions('self')
  const items = evalItemsFromDraft(defs, selfItemDraft.value)
  const score = scoreFromEvalDraft(defs, selfItemDraft.value)
  const ev: Evaluation = {
    id: existing ? existing.id : `ev-${Date.now()}`,
    courseId: props.courseId,
    studentId: props.studentId,
    sessionNumber,
    type: 'self' as EvalType,
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
  store.markEvalReminderCompleted(props.courseId, props.studentId, sessionNumber)
}

function submitPeerEval(targetId: string, session: number, type: EvalType, draft: EvalScoreDraftValue[]) {
  const existing = store.evaluations.find(
    (e) => e.courseId === props.courseId && e.studentId === targetId &&
      e.sessionNumber === session && e.type === type && e.evaluatorId === props.studentId
  )
  const defs = getEvalItemDefinitions(type)
  const items = evalItemsFromDraft(defs, draft)
  const score = scoreFromEvalDraft(defs, draft)
  const ev: Evaluation = {
    id: existing ? existing.id : `ev-peer-${Date.now()}-${targetId}`,
    courseId: props.courseId,
    studentId: targetId,
    sessionNumber: session,
    type,
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

function submitGroupEval(target: PeerTarget, session: number, draft: EvalScoreDraftValue[]) {
  const defs = getEvalItemDefinitions(target.type as EvalType)
  const items = evalItemsFromDraft(defs, draft)
  const score = scoreFromEvalDraft(defs, draft)
  target.memberIds!.forEach((mid) => {
    const existing = store.evaluations.find(
      (e) => e.courseId === props.courseId && e.studentId === mid &&
        e.sessionNumber === session && e.type === target.type && e.evaluatorId === props.studentId
    )
    const ev: Evaluation = {
      id: existing ? existing.id : `ev-peer-${Date.now()}-${target.groupId}-${mid}`,
      courseId: props.courseId,
      studentId: mid,
      sessionNumber: session,
      type: target.type as EvalType,
      score,
      items: items.map((item) => ({ ...item })),
      evaluatorId: props.studentId,
      evaluatorName: props.studentName,
      createdAt: getNow().toISOString().split('T')[0],
    }
    if (existing) {
      store.updateEvaluation(ev.id, { score, items: items.map((item) => ({ ...item })), createdAt: ev.createdAt })
    } else {
      store.addEvaluation(ev)
    }
  })
}
</script>
