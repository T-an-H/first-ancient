import type { EvalType, EvalScoreItem } from '@/types'

export type EvalScoreItemDef = {
  label: string
  max: number
}

export type EvalScoreDraftValue = number | ''

export const EVAL_SCORE_ITEMS: Record<EvalType, EvalScoreItemDef[]> = {
  self: [
    { label: '信息检索', max: 10 },
    { label: '感知课堂生活', max: 10 },
    { label: '参与态度', max: 10 },
    { label: '参与态度', max: 10 },
    { label: '知识掌握', max: 40 },
    { label: '思维态度', max: 10 },
    { label: '自评反馈', max: 10 },
  ],
  intra_group: [
    { label: '课程资料、任务文档理解能力', max: 10 },
    { label: '任务成果格式，规范掌握情况', max: 10 },
    { label: '核心知识点，操作掌握情况', max: 30 },
    { label: '任务要求，技术指标等', max: 20 },
    { label: '依据任务要求独立完成对应作业/程序/报告', max: 30 },
  ],
  inter_group: [
    { label: '表述准确', max: 15 },
    { label: '语言流畅', max: 10 },
    { label: '准确反映该组完成情况', max: 15 },
    { label: '内容正确', max: 30 },
    { label: '情绪表达语句修改合理', max: 30 },
  ],
  teacher: [
    { label: '课前任务完成度', max: 10 },
    { label: '课前任务完成质量', max: 10 },
    { label: '课前测试成绩', max: 10 },
    { label: '出勤情况', max: 10 },
    { label: '课堂纪律', max: 10 },
    { label: '参与互动情况', max: 10 },
    { label: '任务完成情况', max: 10 },
    { label: '任务完成质量', max: 10 },
    { label: '课后任务完成度', max: 10 },
    { label: '课后任务完成质量', max: 10 },
  ],
  mentor: [
    { label: '成果文档/代码格式是否规范', max: 25 },
    { label: '核心语法，操作，知识点使用是否正确', max: 25 },
    { label: '关键参数、方案配置设置是否合理', max: 25 },
    { label: '工具、组件、素材选用是否合理', max: 25 },
  ],
}

export function getEvalItemDefinitions(type: EvalType) {
  return EVAL_SCORE_ITEMS[type] || EVAL_SCORE_ITEMS.self
}

export function createEmptyEvalDraft(type: EvalType) {
  return getEvalItemDefinitions(type).map(() => '' as EvalScoreDraftValue)
}

export function scoreFromEvalDraft(defs: EvalScoreItemDef[], draft: EvalScoreDraftValue[]) {
  return draft.reduce<number>((total, value) => total + (typeof value === 'number' ? value : 0), 0)
}

export function evalItemsFromDraft(defs: EvalScoreItemDef[], draft: EvalScoreDraftValue[]): EvalScoreItem[] {
  return defs.map((item, index) => ({
    label: item.label,
    max: item.max,
    score: typeof draft[index] === 'number' ? Number(draft[index]) : 0,
  }))
}

export function totalFromEvalItems(items?: EvalScoreItem[]) {
  if (!items?.length) return null
  const total = items.reduce((sum, item) => sum + Number(item.score || 0), 0)
  return Math.round(total * 10) / 10
}

export function makeEvalItemsForTotal(type: EvalType, totalScore: number): EvalScoreItem[] {
  const defs = getEvalItemDefinitions(type)
  const ratio = Math.min(100, Math.max(0, Number(totalScore) || 0)) / 100
  return defs.map((item) => ({
    label: item.label,
    max: item.max,
    score: Math.round(item.max * ratio * 10) / 10,
  }))
}
