/**
 * 职业推荐匹配（demand §5.5.2 职业雷达图）
 *
 * §5.5.2 口径：取该生**平时成绩（综合评价成绩）**最高的 6 门课程构成雷达轴，
 * 与《1000职业与要求对照表》比对——「只要有 3 门重合则将其列为推荐职业」；
 * 推荐个数 3~6（教材少则降门槛，多则提门槛）。本模块只负责「给定若干门课的分数 → 推荐职业」，
 * 分数口径由调用方决定（见 Profile.vue：平时成绩，若该课已出期中/期末则用期中/期末替换）。
 *
 * 精确策略（沿用 only 仓库用户拍板 2026-09-08）：
 *  1. 优先查显式映射 COURSE_SUBJECTS[课程 title] → 该课覆盖的 careers 科目名（映射只存
 *     careers.ts 中真实存在的科目，见 src/data/courseCareerMap.ts 维护约定）。
 *  2. 映射表外的未知/新建课程 → 回退收紧版关键词匹配：只用 FALLBACK_SIGNAL_TERMS 里的
 *     明确技术/领域词去撞科目名（整词/包含均可），不再对描述切 2 字 n-gram —— 杜绝「管理/
 *     分析/设计」等泛词在 2111 个科目名里大面积误撞。
 *  3. 候选 = 全部 1000 职业；某职业被 ≥minMatchCourses 门课命中（每课与 career.courses
 *     交集非空即算覆盖 1 门）即进入推荐；无结果时按 demand §5.5.2 自动降门槛(3→2→1)。
 *     按「命中门数×100 + 命中科目数」降序取前 maxResults(默认 6)。
 */

import { CAREERS, type Career } from '@/data/careers'
import { COURSE_SUBJECTS, FALLBACK_SIGNAL_TERMS } from '@/data/courseCareerMap'

export interface CareerMatchItem {
  career: Career
  /** 命中的该生课程（courseId 去重计数） */
  matchedCourseIds: string[]
  /** 命中科目名 */
  matchedSubjects: string[]
  /** 覆盖分数 = 命中课程数×100 + 命中科目数 */
  score: number
}

export interface CareerInputCourse {
  courseId: string
  title: string
  /** 额外关键词来源（课程说明等），未知课程回退时用 */
  description?: string
  /** 参与匹配的分数（平时成绩，或期中/期末替代分；仅用于展示，不计入匹配权重） */
  score: number
}

/** 全 careers 词汇表科目名集合（用于回退时校验命中科目确实存在） */
const VOCAB_SUBJECTS = new Set(CAREERS.flatMap((c) => c.courses.map((s) => String(s).trim())))

/**
 * 未知课程回退：仅当 title/description 含某个强信号词元时，把「词汇表中含该词元的科目名」视为命中。
 * 中文信号词需 ≥3 字（2 字泛词不参与），英文词大小写不敏感。
 */
function fallbackSubjectsFor(title: string, description: string): Set<string> {
  const text = `${title} ${description || ''}`.toLowerCase()
  const matched = new Set<string>()
  for (const term of FALLBACK_SIGNAL_TERMS) {
    const t = term.toLowerCase()
    if (t.length < 3 && !/[a-z]/.test(t)) continue // 中文 2 字信号词忽略（过泛）
    if (!text.includes(t)) continue
    // 词汇表里所有含该信号词的科目（整科目包含词元）
    for (const s of VOCAB_SUBJECTS) {
      if (s.toLowerCase().includes(t)) matched.add(s)
    }
  }
  return matched
}

/** 每门课程的命中科目集合（映射优先，未命中映射则回退关键词） */
function subjectsForCourse(course: CareerInputCourse): Set<string> {
  const explicit = COURSE_SUBJECTS[String(course.title || '').trim()]
  if (explicit && explicit.length > 0) {
    return new Set(explicit)
  }
  return fallbackSubjectsFor(course.title || '', course.description || '')
}

/**
 * 由学生高考分课程（平时成绩最高，或期中/期末替代）产出推荐职业。
 * 候选 = 全部 careers；某职业被 ≥minMatchCourses 门课覆盖即入选；不足自动降门槛；取前 maxResults。
 */
export function recommendCareers(
  inputs: CareerInputCourse[],
  minMatchCourses = 3,
  maxResults = 6,
): CareerMatchItem[] {
  if (inputs.length === 0) return []

  const perCourse = inputs.map((course) => ({
    course,
    subjects: subjectsForCourse(course),
  }))

  // 对每条职业统计命中门数与命中科目
  const matches: { career: Career; matchedCourseIds: string[]; matchedSubjects: string[]; score: number }[] = []
  for (const career of CAREERS) {
    const matchedCourseIds = new Set<string>()
    const matchedSubjects = new Set<string>()
    for (const { course, subjects } of perCourse) {
      const overlap = career.courses.filter((subject) => subjects.has(subject))
      if (overlap.length > 0) {
        matchedCourseIds.add(course.courseId)
        overlap.forEach((s) => matchedSubjects.add(s))
      }
    }
    if (matchedCourseIds.size > 0) {
      matches.push({
        career,
        matchedCourseIds: Array.from(matchedCourseIds),
        matchedSubjects: Array.from(matchedSubjects),
        score: matchedCourseIds.size * 100 + matchedSubjects.size,
      })
    }
  }

  // 门槛递减：先按 minMatchCourses 过滤，空则依次降 1（demand §5.5.2 的「对比课程个数往下调」）
  for (let threshold = minMatchCourses; threshold >= 1; threshold--) {
    const hit = matches
      .filter((m) => m.matchedCourseIds.length >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
    if (hit.length > 0) return hit
  }

  // 极端兜底：仍无任何 ≥1 门覆盖（几乎不可能），返回得分最高的几个
  return matches.slice(0, maxResults)
}
