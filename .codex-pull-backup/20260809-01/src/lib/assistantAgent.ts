import type { Course, Student } from '@/types'

export type AssistantRole = 'admin' | 'teacher' | 'student' | 'mentor' | 'leader' | 'login'

export interface AssistantActionTarget {
  path: string
  query?: Record<string, string>
}

export interface AssistantPageAction {
  id: string
  label: string
  description: string
  keywords: string[]
  target: AssistantActionTarget
}

export interface AssistantContextPayload {
  role: AssistantRole
  roleLabel: string
  currentPath: string
  currentUser: string | null
  selectedDepartmentId?: string | null
  selectedDepartmentName?: string
  recentMessages: Array<{
    role: 'user' | 'assistant'
    text: string
  }>
  availableActions: AssistantPageAction[]
}

export interface AssistantAgentRequest {
  userMessage: string
  context: AssistantContextPayload
}

export interface AssistantAgentOption {
  id: string
  label: string
  description: string
}

export interface AssistantAgentNavigateAction {
  id: string
  label: string
  description: string
  target: AssistantActionTarget
}

export interface AssistantAgentResponse {
  success: boolean
  type: 'navigate' | 'ask' | 'answer'
  source?: 'llm' | 'fallback'
  reply: string
  thought?: string[]
  action?: AssistantAgentNavigateAction
  options?: AssistantAgentOption[]
  code?: string
  message?: string
}

export interface BuildAssistantActionsArgs {
  pageContext: AssistantRole
  studentCourses?: Course[]
  teacherCourses?: Course[]
  adminStudents?: Student[]
  adminClassNames?: string[]
  selectedDepartmentId?: string | null
  selectedDepartmentName?: string
}

export const AGENT_ACTION_PREFIX = '__agent-action__:'

function createAction(
  id: string,
  label: string,
  description: string,
  target: AssistantActionTarget,
  keywords: string[],
): AssistantPageAction {
  return {
    id,
    label,
    description,
    target,
    keywords: Array.from(new Set(keywords.filter(Boolean))),
  }
}

function uniqueActions(actions: AssistantPageAction[]): AssistantPageAction[] {
  const seen = new Set<string>()
  return actions.filter((action) => {
    if (seen.has(action.id)) return false
    seen.add(action.id)
    return true
  })
}

function buildStudentActions(studentCourses: Course[]): AssistantPageAction[] {
  const baseActions: AssistantPageAction[] = [
    createAction(
      'student.courses',
      '打开我的课程',
      '进入学生端的我的课程页',
      { path: '/student/courses' },
      ['我的课程', '课程列表', '选课', '课程中心'],
    ),
    createAction(
      'student.grades.all',
      '查看成绩',
      '进入学生端成绩查询页',
      { path: '/student/grades' },
      ['成绩', '分数', '总评', '绩点'],
    ),
    createAction(
      'student.schedule',
      '查看课表',
      '进入学生端课表页',
      { path: '/student/schedule' },
      ['课表', '课程表', '上课时间', '排课'],
    ),
    createAction(
      'student.progress',
      '查看学习进度',
      '进入学生端学习进度页',
      { path: '/student/progress' },
      ['进度', '学习进度', '学习情况', '掌握情况'],
    ),
    createAction(
      'student.profile',
      '查看个人画像',
      '进入学生端个人画像页',
      { path: '/student/profile' },
      ['画像', '个人信息', '能力分析', '我的信息'],
    ),
    createAction(
      'student.extra',
      '打开额外功能',
      '进入学生端额外功能页',
      { path: '/student/extra' },
      ['额外功能', '待办', '云盘', '文件', '文档', '笔记'],
    ),
  ]

  const courseActions = studentCourses.flatMap((course) => {
    const coursePath = `/student/courses/${course.id}`
    const courseKeywords = [course.title, '这门课', '当前课程', '本课程']

    return [
      createAction(
        `student.course.${course.id}.tasks`,
        `进入《${course.title}》课程`,
        `打开课程《${course.title}》的任务页`,
        { path: coursePath, query: { tab: 'tasks' } },
        [...courseKeywords, '进入课程', '打开课程', '学习课程', '任务'],
      ),
      createAction(
        `student.course.${course.id}.grade`,
        `查看《${course.title}》成绩`,
        `打开《${course.title}》的成绩详情`,
        { path: '/student/grades', query: { courseId: course.id } },
        [...courseKeywords, '成绩', '分数', '总评', '查看成绩'],
      ),
      createAction(
        `student.course.${course.id}.homework`,
        `打开《${course.title}》作业`,
        `进入《${course.title}》的作业页`,
        { path: coursePath, query: { tab: 'homework' } },
        [...courseKeywords, '作业', '提交作业'],
      ),
      createAction(
        `student.course.${course.id}.ai_tier`,
        `打开《${course.title}》AI分层`,
        `进入《${course.title}》的 AI 分层测试页`,
        { path: coursePath, query: { tab: 'ai_tier' } },
        [...courseKeywords, 'AI分层', '分层测试', '分层测评', '分层'],
      ),
      createAction(
        `student.course.${course.id}.knowledge_graph`,
        `打开《${course.title}》知识图谱`,
        `进入《${course.title}》的知识图谱页`,
        { path: coursePath, query: { tab: 'knowledge_graph' } },
        [...courseKeywords, '知识图谱', '知识点图', '知识图'],
      ),
      createAction(
        `student.course.${course.id}.resources`,
        `打开《${course.title}》课程资源`,
        `进入《${course.title}》的资源页`,
        { path: coursePath, query: { tab: 'resources' } },
        [...courseKeywords, '资源', '资料', '课件'],
      ),
      createAction(
        `student.course.${course.id}.evaluations`,
        `打开《${course.title}》评价填写`,
        `进入《${course.title}》的评价填写页`,
        { path: coursePath, query: { tab: 'evaluations' } },
        [...courseKeywords, '评价', '互评', '自评', '老师评价'],
      ),
      createAction(
        `student.course.${course.id}.eval_overview`,
        `查看《${course.title}》综合评价`,
        `进入《${course.title}》的综合评价页`,
        { path: coursePath, query: { tab: 'eval_overview' } },
        [...courseKeywords, '综合评价', '评价结果', '评价记录'],
      ),
    ]
  })

  return uniqueActions([...baseActions, ...courseActions])
}

function buildTeacherActions(teacherCourses: Course[]): AssistantPageAction[] {
  const baseActions: AssistantPageAction[] = [
    createAction(
      'teacher.courses',
      '打开我的授课课程',
      '进入教师端课程列表页',
      { path: '/teacher/courses' },
      ['我的课程', '课程列表', '授课课程', '我教的课'],
    ),
    createAction(
      'teacher.schedule',
      '查看教师课表',
      '进入教师端课表页',
      { path: '/teacher/schedule' },
      ['课表', '课程表', '上课时间', '排课'],
    ),
    createAction(
      'teacher.students',
      '查看学生进度',
      '进入教师端学生进度页',
      { path: '/teacher/students' },
      ['学生进度', '学员进度', '学习进度', '学生情况', '学生管理'],
    ),
    createAction(
      'teacher.evaluation',
      '打开评价管理',
      '进入教师端评价管理页',
      { path: '/teacher/evaluation' },
      ['评价管理', '评价', '评教', '评语', '评论'],
    ),
    createAction(
      'teacher.extra',
      '打开教师额外功能',
      '进入教师端额外功能页',
      { path: '/teacher/extra' },
      ['额外功能', '待办', '云盘', '文件', '文档', '笔记'],
    ),
  ]

  const courseActions = teacherCourses.flatMap((course) => {
    const coursePath = `/teacher/courses/${course.id}`
    const courseKeywords = [course.title, '这门课', '当前课程', '本课程']

    return [
      createAction(
        `teacher.course.${course.id}.course`,
        `进入《${course.title}》课程详情`,
        `打开教师端《${course.title}》课程详情页`,
        { path: coursePath },
        [...courseKeywords, '进入课程', '打开课程', '课程详情'],
      ),
      createAction(
        `teacher.course.${course.id}.comments`,
        `打开《${course.title}》评价管理`,
        `进入《${course.title}》的评价管理标签页`,
        { path: coursePath, query: { tab: 'comments' } },
        [...courseKeywords, '评价管理', '评价', '评论', '评教'],
      ),
      createAction(
        `teacher.course.${course.id}.grade-config`,
        `打开《${course.title}》成绩配置`,
        `进入《${course.title}》的成绩配置标签页`,
        { path: coursePath, query: { tab: 'grade-config' } },
        [...courseKeywords, '成绩配置', '评分配置', '权重配置', '成绩权重'],
      ),
      createAction(
        `teacher.course.${course.id}.grade-entry`,
        `打开《${course.title}》成绩管理`,
        `进入《${course.title}》的成绩录入标签页`,
        { path: coursePath, query: { tab: 'grade-entry' } },
        [...courseKeywords, '成绩管理', '成绩录入', '录入成绩', '提交成绩'],
      ),
      createAction(
        `teacher.course.${course.id}.homework`,
        `打开《${course.title}》作业管理`,
        `进入《${course.title}》的作业管理标签页`,
        { path: coursePath, query: { tab: 'homework' } },
        [...courseKeywords, '作业管理', '布置作业', '作业'],
      ),
      createAction(
        `teacher.course.${course.id}.students`,
        `打开《${course.title}》学生管理`,
        `进入《${course.title}》的学生管理标签页`,
        { path: coursePath, query: { tab: 'students' } },
        [...courseKeywords, '学生管理', '学员管理', '学生名单', '班级学生'],
      ),
    ]
  })

  return uniqueActions([...baseActions, ...courseActions])
}

function buildAdminActions(args: BuildAssistantActionsArgs): AssistantPageAction[] {
  const {
    adminStudents = [],
    adminClassNames = [],
    selectedDepartmentId,
    selectedDepartmentName,
  } = args

  const baseActions: AssistantPageAction[] = [
    createAction(
      'admin.department.select',
      '切换学院',
      '进入管理员端学院选择页',
      { path: '/admin' },
      ['切换学院', '选择学院', '学院', '部门'],
    ),
    createAction(
      'admin.students',
      '打开班级与学生管理',
      '进入管理员端班级与学生管理页',
      { path: '/admin/students' },
      ['班级管理', '学生管理', '班级列表', '学生列表'],
    ),
  ]

  if (selectedDepartmentId) {
    baseActions.push(
      createAction(
        'admin.categories',
        `打开${selectedDepartmentName || '当前学院'}课程管理`,
        '进入管理员端课程分类与排课管理页',
        { path: '/admin/categories' },
        ['课程管理', '课程分类', '分类管理', '排课', '排课管理'],
      ),
    )
  }

  const classActions = adminClassNames.map((className) =>
    createAction(
      `admin.class.${encodeURIComponent(className)}`,
      `打开${className}`,
      `查看 ${className} 的学生列表`,
      { path: '/admin/students', query: { className } },
      [className, '班级', '查看班级', '打开班级'],
    ),
  )

  const studentActions = adminStudents.map((student) =>
    createAction(
      `admin.student.${student.id}`,
      `查看学生 ${student.name}`,
      `查看 ${student.name} 的学生详情`,
      { path: `/admin/students/${student.id}` },
      [
        student.name,
        student.studentId ?? '',
        student.className ?? '',
        '学生详情',
        '学生档案',
        '学生资料',
      ],
    ),
  )

  return uniqueActions([...baseActions, ...classActions, ...studentActions])
}

function buildMentorActions(): AssistantPageAction[] {
  return [
    createAction(
      'mentor.courses',
      '打开导师课程',
      '进入企业导师端课程页',
      { path: '/mentor/courses' },
      ['课程', '我的课程'],
    ),
    createAction(
      'mentor.schedule',
      '查看导师课表',
      '进入企业导师端课表页',
      { path: '/mentor/schedule' },
      ['课表', '课程表'],
    ),
    createAction(
      'mentor.extra',
      '打开导师额外功能',
      '进入企业导师端额外功能页',
      { path: '/mentor/extra' },
      ['额外功能', '待办', '云盘', '文件'],
    ),
  ]
}

function buildLeaderActions(): AssistantPageAction[] {
  return [
    createAction(
      'leader.courses',
      '打开学院课程',
      '进入学院领导端课程页',
      { path: '/leader/courses' },
      ['课程', '课程列表'],
    ),
    createAction(
      'leader.students',
      '打开学院学生',
      '进入学院领导端学生页',
      { path: '/leader/students' },
      ['学生', '学生列表', '学生情况'],
    ),
  ]
}

export function buildAvailableActions(args: BuildAssistantActionsArgs): AssistantPageAction[] {
  if (args.pageContext === 'student') {
    return buildStudentActions(args.studentCourses ?? [])
  }

  if (args.pageContext === 'teacher') {
    return buildTeacherActions(args.teacherCourses ?? [])
  }

  if (args.pageContext === 'admin') {
    return buildAdminActions(args)
  }

  if (args.pageContext === 'mentor') {
    return buildMentorActions()
  }

  if (args.pageContext === 'leader') {
    return buildLeaderActions()
  }

  return []
}

export function encodeAgentAction(actionId: string): string {
  return `${AGENT_ACTION_PREFIX}${actionId}`
}

export function decodeAgentAction(value: string): string | null {
  if (!value.startsWith(AGENT_ACTION_PREFIX)) {
    return null
  }

  return value.slice(AGENT_ACTION_PREFIX.length)
}
