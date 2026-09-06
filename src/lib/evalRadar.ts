import type { Evaluation, EvalScoreItem } from '@/types'

export const EVAL_RADAR_DIMENSIONS = [
  '知识点掌握情况',
  '任务完成情况',
  '信息与资源处理能力',
  '课堂参与协作交流情况',
  '综合素养输出表现',
] as const

const CRITERION_DIMENSION: Record<string, number> = {
  '知识掌握': 0,
  '核心知识点，操作掌握情况': 0,
  '内容正确': 0,
  '课前测试成绩': 0,
  '核心语法，操作，知识点使用是否正确': 0,
  '思维态度': 1,
  '任务成果格式，规范掌握情况': 1,
  '任务要求，技术指标等': 1,
  '准确反映该组完成情况': 1,
  '课前任务完成度': 1,
  '课前任务完成质量': 1,
  '任务完成情况': 1,
  '任务完成质量': 1,
  '课后任务完成度': 1,
  '课后任务完成质量': 1,
  '依据任务要求独立完成对应作业/程序/报告': 1,
  '成果文档/代码格式是否规范': 1,
  '关键参数、方案配置设置是否合理': 1,
  '信息检索': 2,
  '课程资料、任务文档理解能力': 2,
  '工具、组件、素材选用是否合理': 2,
  '感知课堂生活': 3,
  '参与态度': 3,
  '出勤情况': 3,
  '课堂纪律': 3,
  '参与互动情况': 3,
  '自评反馈': 4,
  '表述准确': 4,
  '语言流畅': 4,
  '情绪表达语句修改合理': 4,
}

function itemPercent(item: EvalScoreItem) {
  const max = Number(item.max || 100)
  if (!max) return 0
  return Math.max(0, Math.min(100, (Number(item.score || 0) / max) * 100))
}

export function dimensionPercent(items: EvalScoreItem[], dimension: number) {
  const matches = items.filter((item) => CRITERION_DIMENSION[item.label] === dimension)
  if (matches.length === 0) return null
  return Math.round(matches.reduce((sum, item) => sum + itemPercent(item), 0) / matches.length)
}

export function computeRadarData(evaluations: Evaluation[]) {
  const scores: number[][] = EVAL_RADAR_DIMENSIONS.map(() => [])
  let total = 0

  for (const evaluation of evaluations) {
    const items = evaluation.items || []
    if (items.length === 0) continue
    total += 1
    EVAL_RADAR_DIMENSIONS.forEach((_, dimensionIndex) => {
      const value = dimensionPercent(items, dimensionIndex)
      if (value !== null) scores[dimensionIndex].push(value)
    })
  }

  const values = scores.map((list) =>
    list.length ? Math.round(list.reduce((sum, item) => sum + item, 0) / list.length) : 0
  )
  return { labels: [...EVAL_RADAR_DIMENSIONS], values, count: total }
}
