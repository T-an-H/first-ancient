import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getNow, getTodayStart, parseLocalDate } from '@/lib/date'
import { buildCourseScheduleOccurrences } from '@/lib/schedule'
import {
  API_BASE,
  fetchCourseEvaluationState,
  fetchCourseGroups,
  fetchCourseQualityEvaluations,
  fetchEvalConfig,
  saveEvaluation as apiSaveEval,
  deleteEvaluation as apiDeleteEval,
  submitTeacherEval as apiSubmitEval,
  saveEvalConfig as apiSaveConfig,
  saveCourseGroups as apiSaveCourseGroups,
  saveEvalReminders as apiSaveReminders,
  updateEvalReminder as apiUpdateReminder,
  deleteCourse as apiDeleteCourse,
  submitQualityEvaluation as apiSubmitQualityEvaluation,
  scoreQualityEvaluation as apiScoreQualityEvaluation,
} from '@/api'
import type {
  Course, Category, Student, Schedule, Enrollment, Teacher, Grade,
  CloudFile, TodoItem, OnlineDoc, Note, Evaluation, EvaluationConfig,
  StudentGroup, EvalAnomaly, EvalReminder, GradeWeightConfig, DetailedGrade,
  Mentor, Leader, AITierQuestion, StudentTierRecord, EvalType,
  Homework, HomeworkSubmission, Department, QualityEvaluation, QualityEvalFile, QualityEvalSubmission
} from '@/types'
import { getDefaultGradeConfig, TEMPLATE_EVAL_TYPES } from '@/types'
import {
  courses as mockCourses,
  categories as mockCategories,
  students as mockStudents,
  schedules as mockSchedules,
  enrollments as mockEnrollments,
  teachers as mockTeachers,
  grades as mockGrades,
  evaluationConfigs as mockEvalConfigs,
  evaluations as mockEvaluations,
  studentGroups as mockStudentGroups,
  detailedGrades as mockDetailedGrades,
  mentors as mockMentors,
  leaders as mockLeaders,
  onlineDocs as mockOnlineDocs,
  notes as mockNotes,
  todoItems as mockTodos,
  cloudFiles as mockCloudFiles,
  homework as mockHomework,
  homeworkSubmissions as mockHomeworkSubmissions,
  examScores as mockExamScores,
  studentTiers as mockStudentTiers,
  supplementaryGrades as mockSupplementaryGrades,
  supplementaryAll,
  departments as mockDepartments,
  departmentClasses as mockDepartmentClasses,
  MOCK_VERSION,
} from '@/data/mockData'

type UserRole = 'admin' | 'teacher' | 'student' | 'mentor' | 'leader' | null

const normalizeCloudFile = (file: CloudFile): CloudFile => ({
  ...file,
  visibilityScope: file.visibilityScope ?? (file.visibleToClassNames?.length ? 'students' : 'private'),
})

const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return fallback
    const parsed = JSON.parse(stored)
    // 类型校验：如果 fallback 是数组，确保 parsed 也是数组（防止脏数据污染）
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback
    // 数组类型：如果 localStorage 存的是空数组，也用 fallback（防止 stale 空数组覆盖 mock 数据）
    if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(fallback)) return fallback
    return parsed
  } catch {
    return fallback
  }
}

const saveToStorage = (key: string, data: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    // 存储空间不足（如大文件 base64 撑爆配额）时降级为内存态，避免应用崩溃
    console.warn(`[store] 保存 ${key} 失败（可能超出 localStorage 配额）:`, e)
  }
}

type StudentHomeworkSummary = {
  id: string
  courseId: string
  title: string
  description?: string
  chapterTitle?: string
  dueDate?: string
  createdAt?: string
  publishedAt?: string
  submission: {
    id: string
    status: string
    totalScore?: number
    submittedAt?: string
  } | null
}

const normalizeStudentHomeworkSummary = (courseId: string, item: any): StudentHomeworkSummary => ({
  id: item.id,
  courseId: item.courseId || courseId,
  title: item.title,
  description: item.description,
  chapterTitle: item.chapterTitle,
  dueDate: item.dueDate,
  createdAt: item.createdAt ?? item.publishedAt,
  publishedAt: item.publishedAt,
  submission: item.submission
    ? {
        id: item.submission.id,
        status: item.submission.status,
        totalScore: item.submission.totalScore,
        submittedAt: item.submission.submittedAt,
      }
    : null,
})

const isPendingStudentHomework = (item: StudentHomeworkSummary) =>
  !item.submission || item.submission.status === 'submitted'

// ====== Mock 数据版本检查：版本变化时清除旧 localStorage ======
const MOCK_VERSION_KEY = 'mockDataVersion'
try {
  const savedVersion = localStorage.getItem(MOCK_VERSION_KEY)
  if (savedVersion !== MOCK_VERSION) {
    // 版本变化，清除所有可重置的旧数据，让下次加载走 mock fallback
    const resetKeys = [
      'departments', 'departmentClasses', 'categories', 'courses',
      'schedules', 'students', 'enrollments', 'teachers', 'grades',
      'cloudFiles', 'todos', 'onlineDocs', 'notes',
      'evaluations', 'evalConfigs', 'studentGroups', 'evalReminders',
      'gradeConfigs', 'detailedGrades', 'homework', 'homeworkSubmissions',
      'examScores', 'examWeights', 'teacherSubmittedEvals', 'lockedSessions',
      'studentTiers', 'qualityEvaluations', 'projectWeightLocks',
    ]
    resetKeys.forEach((k) => localStorage.removeItem(k))
    localStorage.setItem(MOCK_VERSION_KEY, MOCK_VERSION)
  }
} catch { /* ignore */ }

export const useAppStore = defineStore('app', () => {
  // ====== State ======
  const courses = ref<Course[]>(loadFromStorage('courses', mockCourses))
  const categories = ref<Category[]>(loadFromStorage('categories', mockCategories))
  const students = ref<Student[]>(loadFromStorage('students', mockStudents))
  const schedules = ref<Schedule[]>(loadFromStorage('schedules', [...mockSchedules, ...supplementaryAll.supplementarySchedules, ...supplementaryAll.adminDemoSchedules]))
  const enrollments = ref<Enrollment[]>(loadFromStorage('enrollments', [...mockEnrollments, ...supplementaryAll.supplementaryEnrollments]))
  const teachers = ref<Teacher[]>(loadFromStorage('teachers', mockTeachers))
  const grades = ref<Grade[]>(loadFromStorage('grades', [...mockGrades, ...mockSupplementaryGrades]))
  const loadedCloudFiles = loadFromStorage<CloudFile[]>('cloudFiles', [...mockCloudFiles, ...supplementaryAll.supplementaryCloudFiles])
  const hasLegacyCloudFiles = loadedCloudFiles.some((file) => !file.visibilityScope)
  const cloudFiles = ref<CloudFile[]>(loadedCloudFiles.map(normalizeCloudFile))
  const todos = ref<TodoItem[]>(loadFromStorage<TodoItem[]>('todos', [...mockTodos, ...supplementaryAll.supplementaryTodos]))
  const onlineDocs = ref<OnlineDoc[]>(loadFromStorage<OnlineDoc[]>('onlineDocs', [...mockOnlineDocs, ...supplementaryAll.supplementaryOnlineDocs]))
  const notes = ref<Note[]>(loadFromStorage<Note[]>('notes', [...mockNotes, ...supplementaryAll.supplementaryNotes]))
  const evaluations = ref<Evaluation[]>(loadFromStorage<Evaluation[]>('evaluations', [...mockEvaluations, ...supplementaryAll.supplementaryEvaluations]))
  const evalConfigs = ref<EvaluationConfig[]>(loadFromStorage<EvaluationConfig[]>('evalConfigs', mockEvalConfigs))
  const studentGroups = ref<StudentGroup[]>(loadFromStorage<StudentGroup[]>('studentGroups', [...mockStudentGroups, ...supplementaryAll.supplementaryStudentGroups]))
  const evalReminders = ref<EvalReminder[]>(loadFromStorage<EvalReminder[]>('evalReminders', supplementaryAll.supplementaryEvalReminders))

  // 素质评价提交（学生上传文件，教师打分）
  const qualityEvaluations = ref<import('@/types').QualityEvaluation[]>(
    loadFromStorage<import('@/types').QualityEvaluation[]>('qualityEvaluations', [])
  )
  // 迁移旧格式（单次提交，顶层直接存放文件/评分）→ 新格式（submissions 数组支持多次提交）
  qualityEvaluations.value = qualityEvaluations.value.map((q) => {
    if ((q as any).submissions) return q
    const old = q as any
    return {
      id: old.id,
      courseId: old.courseId,
      studentId: old.studentId,
      submissions: old.files ? [{
        id: old.id,
        description: old.description,
        files: old.files,
        submittedAt: old.submittedAt,
        score: old.score,
        teacherComment: old.teacherComment,
        gradedAt: old.gradedAt,
      }] : [],
    }
  })
  const gradeConfigs = ref<Record<string, GradeWeightConfig>>(
    Object.fromEntries(
      Object.entries(loadFromStorage<Record<string, GradeWeightConfig>>('gradeConfigs', {})).map(([courseId, config]) => [
        courseId,
        { ...getDefaultGradeConfig(courseId), ...config },
      ]),
    ),
  )
  const detailedGrades = ref<DetailedGrade[]>(loadFromStorage<DetailedGrade[]>('detailedGrades', [...mockDetailedGrades, ...supplementaryAll.supplementaryDetailedGrades]))
  const homework = ref<Homework[]>(loadFromStorage<Homework[]>('homework', [...mockHomework, ...supplementaryAll.supplementaryHomework]))
  const homeworkSubmissions = ref<HomeworkSubmission[]>(loadFromStorage<HomeworkSubmission[]>('homeworkSubmissions', [...mockHomeworkSubmissions, ...supplementaryAll.supplementaryHomeworkSubmissions]))
  const studentHomeworkSummaries = ref<Record<string, StudentHomeworkSummary[]>>({})
  const syncedStudentHomeworkCourses = ref<Record<string, boolean>>({})
  const isLoggedIn = ref<boolean>(loadFromStorage<boolean>('isLoggedIn', false))
  const currentUser = ref<string | null>(loadFromStorage<string | null>('currentUser', null))
  const currentRole = ref<UserRole>(loadFromStorage<UserRole>('currentRole', null))

  // 临时预览解锁：测试评价填写/查看流程时忽略锁定、时间与已提交限制
  const EVAL_PREVIEW_UNLOCKED = true
  const hasEvalReminders = ref<boolean>(false)

  // 企业导师数据
  const mentors = ref<Mentor[]>(loadFromStorage<Mentor[]>('mentors', mockMentors))
  // 学院领导数据（只读演示数据，不从 localStorage 缓存，确保新数据及时生效）
  const leaders = ref<Leader[]>([...mockLeaders])
  // 次要角色（用于 leader+teacher/mentor 双重身份）
  const secondaryRoles = ref<UserRole[]>(loadFromStorage<UserRole[]>('secondaryRoles', []))

  // ====== 学院系统 ======
  const departments = ref<Department[]>(loadFromStorage<Department[]>('departments', mockDepartments))
  const departmentClasses = ref<Record<string, string[]>>(
    loadFromStorage<Record<string, string[]>>('departmentClasses', mockDepartmentClasses)
  )
  const selectedDepartmentId = ref<string | null>(
    loadFromStorage<string | null>('selectedDepartmentId', null)
  )

  // 教师已提交的评价记录（string[]，key: `${courseId}||${studentId}||${session}||${type}`）
  const teacherSubmittedEvals = ref<string[]>(
    loadFromStorage<string[]>('teacherSubmittedEvals', [])
  )

  // 考试/项目成绩
  const examScores = ref<import('@/types').ExamScore[]>(
    loadFromStorage<import('@/types').ExamScore[]>('examScores', mockExamScores)
  )

  // 考试/项目权重配置 (courseId → examName → weight)
  const examWeights = ref<Record<string, Record<string, number>>>(
    loadFromStorage<Record<string, Record<string, number>>>('examWeights', {})
  )

  // 期中/期末项目占比锁定状态 (courseId → { midterm, final })，持久化，刷新/重进不丢失
  const projectWeightLocks = ref<Record<string, { midterm: boolean; final: boolean }>>(
    loadFromStorage<Record<string, { midterm: boolean; final: boolean }>>('projectWeightLocks', {})
  )
  const courseGroupSyncInFlight = new Map<string, Promise<void>>()
  const dirtyCourseGroupSyncs = new Set<string>()

  // 配置完成标记（权重配置 / 评价方案配置）
  const configCompleted = ref<Record<string, { weights: boolean; evalConfig: boolean }>>(
    loadFromStorage<Record<string, { weights: boolean; evalConfig: boolean }>>('configCompleted', {})
  )

  // 已锁定的评价轮次（key: `${courseId}||${sessionNumber}`）
  // 锁定后该轮次无法再修改评价
  const lockedSessions = ref<string[]>(
    loadFromStorage<string[]>('lockedSessions', [])
  )

  if (hasLegacyCloudFiles) {
    saveToStorage('cloudFiles', cloudFiles.value)
  }

  // AI 分层记录（key: `${courseId}||${studentId}`）
  const studentTiers = ref<Record<string, StudentTierRecord>>(
    loadFromStorage<Record<string, StudentTierRecord>>('studentTiers', mockStudentTiers)
  )

  // ====== Actions ======

  function login(username: string, role: UserRole, isTeacherFromDb?: boolean, isMentorFromDb?: boolean) {
    localStorage.setItem('isLoggedIn', JSON.stringify(true))
    localStorage.setItem('currentUser', JSON.stringify(username))
    localStorage.setItem('currentRole', JSON.stringify(role))
    isLoggedIn.value = true
    currentUser.value = username
    currentRole.value = role

    // 检测双重身份：如果以 mentor/leader 登录，检测是否同时有其他角色
    const detected: UserRole[] = []
    if (role === 'leader') {
      if (isTeacherFromDb) detected.push('teacher')
      if (isMentorFromDb) detected.push('mentor')
    }
    if (role === 'mentor' && isTeacherFromDb) {
      detected.push('teacher')
    }
    if (role === 'teacher' && isMentorFromDb) {
      detected.push('mentor')
    }
    secondaryRoles.value = detected
    localStorage.setItem('secondaryRoles', JSON.stringify(detected))
    // 登录后立即生成自动待办
    generateAutoTodos()
  }

  function logout() {
    localStorage.setItem('isLoggedIn', JSON.stringify(false))
    localStorage.setItem('currentUser', JSON.stringify(null))
    localStorage.setItem('currentRole', JSON.stringify(null))
    localStorage.setItem('secondaryRoles', JSON.stringify([]))
    isLoggedIn.value = false
    currentUser.value = null
    currentRole.value = null
    secondaryRoles.value = []
  }

  // ====== 学院操作 ======

  function setSelectedDepartment(id: string | null) {
    selectedDepartmentId.value = id
    saveToStorage('selectedDepartmentId', id)
  }

  function getSelectedDepartment(): Department | null {
    if (!selectedDepartmentId.value) return null
    return departments.value.find((d) => d.id === selectedDepartmentId.value) || null
  }

  function addDepartment(dept: Department) {
    departments.value = [...departments.value, dept]
    departmentClasses.value = { ...departmentClasses.value, [dept.id]: [] }
    saveToStorage('departments', departments.value)
    saveToStorage('departmentClasses', departmentClasses.value)
  }

  function updateDepartment(id: string, data: Partial<Department>) {
    departments.value = departments.value.map((d) => (d.id === id ? { ...d, ...data } : d))
    saveToStorage('departments', departments.value)
  }

  function deleteDepartment(id: string) {
    departments.value = departments.value.filter((d) => d.id !== id)
    // 同时清理关联的分类和班级映射
    categories.value = categories.value.filter((c) => c.departmentId !== id)
    const classes = { ...departmentClasses.value }
    delete classes[id]
    departmentClasses.value = classes
    saveToStorage('departments', departments.value)
    saveToStorage('categories', categories.value)
    saveToStorage('departmentClasses', departmentClasses.value)
    if (selectedDepartmentId.value === id) {
      selectedDepartmentId.value = null
      saveToStorage('selectedDepartmentId', null)
    }
  }

  /** 获取某学院的课程分类 */
  function getDepartmentCategories(deptId: string): Category[] {
    return categories.value.filter((c) => c.departmentId === deptId)
  }

  /** 获取某学院的班级列表 */
  function getDepartmentClasses(deptId: string): string[] {
    return departmentClasses.value[deptId] || []
  }

  /** 为某学院添加班级 */
  function addDepartmentClass(deptId: string, className: string) {
    const current = departmentClasses.value[deptId] || []
    if (!current.includes(className)) {
      departmentClasses.value = { ...departmentClasses.value, [deptId]: [...current, className] }
      saveToStorage('departmentClasses', departmentClasses.value)
    }
  }

  /** 为某学院移除班级 */
  function removeDepartmentClass(deptId: string, className: string) {
    const current = departmentClasses.value[deptId] || []
    departmentClasses.value = {
      ...departmentClasses.value,
      [deptId]: current.filter((c) => c !== className),
    }
    saveToStorage('departmentClasses', departmentClasses.value)
  }

  function addCourse(course: Course) {
    courses.value = [...courses.value, course]
    saveToStorage('courses', courses.value)
    // 同步分类课程数量
    categories.value = categories.value.map((cat) =>
      cat.id === course.categoryId ? { ...cat, courseCount: cat.courseCount + 1 } : cat
    )
    saveToStorage('categories', categories.value)
    // 同步教师 courseIds
    teachers.value = teachers.value.map((t) =>
      t.name === course.teacher && !t.courseIds.includes(course.id)
        ? { ...t, courseIds: [...t.courseIds, course.id] }
        : t
    )
    saveToStorage('teachers', teachers.value)
  }

  function updateCourse(id: string, data: Partial<Course>) {
    const old = courses.value.find((c) => c.id === id)
    courses.value = courses.value.map((c) => (c.id === id ? { ...c, ...data } : c))
    saveToStorage('courses', courses.value)
    // 如果分类发生变化，同步分类课程数量
    if (old && data.categoryId && data.categoryId !== old.categoryId) {
      categories.value = categories.value.map((cat) => {
        if (cat.id === old.categoryId) return { ...cat, courseCount: Math.max(0, cat.courseCount - 1) }
        if (cat.id === data.categoryId) return { ...cat, courseCount: cat.courseCount + 1 }
        return cat
      })
      saveToStorage('categories', categories.value)
    }
    // 如果教师发生变化，同步教师 courseIds
    if (old && data.teacher && data.teacher !== old.teacher) {
      // 从旧教师中移除
      teachers.value = teachers.value.map((t) =>
        t.name === old.teacher ? { ...t, courseIds: t.courseIds.filter((cid) => cid !== id) } : t
      )
      // 添加到新教师
      teachers.value = teachers.value.map((t) =>
        t.name === data.teacher && !t.courseIds.includes(id)
          ? { ...t, courseIds: [...t.courseIds, id] }
          : t
      )
      saveToStorage('teachers', teachers.value)
    }
  }

  /** 为课程分配企业导师：更新课程 mentor 字段，并同步导师记录的 courseIds */
  function assignMentorToCourse(courseId: string, mentorName: string) {
    if (!mentorName) return
    const course = courses.value.find((c) => c.id === courseId)
    if (course && course.mentor !== mentorName) {
      courses.value = courses.value.map((c) =>
        c.id === courseId ? { ...c, mentor: mentorName } : c
      )
      saveToStorage('courses', courses.value)
    }
    // 同步导师记录 courseIds（与 addCourse 的教师同步逻辑一致）
    const mentor = mentors.value.find((m) => m.name === mentorName)
    if (mentor && !mentor.courseIds.includes(courseId)) {
      mentors.value = mentors.value.map((m) =>
        m.name === mentorName ? { ...m, courseIds: [...m.courseIds, courseId] } : m
      )
      saveToStorage('mentors', mentors.value)
    }
  }

  function deleteCourse(id: string) {
    const old = courses.value.find((c) => c.id === id)
    courses.value = courses.value.filter((c) => c.id !== id)
    saveToStorage('courses', courses.value)
    if (old) {
      // 同步分类课程数量
      categories.value = categories.value.map((cat) =>
        cat.id === old.categoryId ? { ...cat, courseCount: Math.max(0, cat.courseCount - 1) } : cat
      )
      saveToStorage('categories', categories.value)
      // 同步教师 courseIds
      teachers.value = teachers.value.map((t) =>
        t.name === old.teacher ? { ...t, courseIds: t.courseIds.filter((cid) => cid !== id) } : t
      )
      saveToStorage('teachers', teachers.value)
    }
    // 同步到数据库
    apiDeleteCourse(id).catch(() => {})
  }

  function addCategory(category: Category) {
    categories.value = [...categories.value, category]
    saveToStorage('categories', categories.value)
  }

  function updateCategory(id: string, data: Partial<Category>) {
    categories.value = categories.value.map((c) => (c.id === id ? { ...c, ...data } : c))
    saveToStorage('categories', categories.value)
  }

  function deleteCategory(id: string) {
    categories.value = categories.value.filter((c) => c.id !== id)
    saveToStorage('categories', categories.value)
  }

  function addSchedule(schedule: Schedule) {
    schedules.value = [...schedules.value, schedule]
    saveToStorage('schedules', schedules.value)
    recalculateProgress(schedule.courseId)
  }

  function updateSchedule(id: string, data: Partial<Schedule>) {
    const old = schedules.value.find((s) => s.id === id)
    schedules.value = schedules.value.map((s) => (s.id === id ? { ...s, ...data } : s))
    saveToStorage('schedules', schedules.value)
    if (old) recalculateProgress(old.courseId)
  }

  function deleteSchedule(id: string) {
    const old = schedules.value.find((s) => s.id === id)
    schedules.value = schedules.value.filter((s) => s.id !== id)
    saveToStorage('schedules', schedules.value)
    if (old) recalculateProgress(old.courseId)
  }

  function addEnrollment(enrollment: Enrollment) {
    enrollments.value = [...enrollments.value, enrollment]
    saveToStorage('enrollments', enrollments.value)
  }

  function updateEnrollment(id: string, data: Partial<Enrollment>) {
    enrollments.value = enrollments.value.map((e) => (e.id === id ? { ...e, ...data } : e))
    saveToStorage('enrollments', enrollments.value)
  }

  function deleteEnrollment(id: string) {
    enrollments.value = enrollments.value.filter((e) => e.id !== id)
    saveToStorage('enrollments', enrollments.value)
  }

  function addGrade(grade: Grade) {
    const course = courses.value.find(c => c.id === grade.courseId)
    if (course && course.status === 'inactive') {
      console.warn('Cannot modify ended course')
      return
    }
    grades.value = [...grades.value, grade]
    saveToStorage('grades', grades.value)
  }

  function updateGrade(id: string, data: Partial<Grade>) {
    const grade = grades.value.find(g => g.id === id)
    if (grade) {
      const course = courses.value.find(c => c.id === grade.courseId)
      if (course && course.status === 'inactive') {
        console.warn('Cannot modify ended course')
        return
      }
    }
    grades.value = grades.value.map((g) => (g.id === id ? { ...g, ...data } : g))
    saveToStorage('grades', grades.value)
  }

  function deleteGrade(id: string) {
    grades.value = grades.value.filter((g) => g.id !== id)
    saveToStorage('grades', grades.value)
  }

  function addCloudFile(file: CloudFile) {
    cloudFiles.value = [...cloudFiles.value, normalizeCloudFile(file)]
    saveToStorage('cloudFiles', cloudFiles.value)
  }

  /** 更新云盘文件（用于编辑可见课程/班级范围） */
  function updateCloudFile(id: string, data: Partial<CloudFile>) {
    cloudFiles.value = cloudFiles.value.map((f) =>
      f.id === id ? normalizeCloudFile({ ...f, ...data }) : f
    )
    saveToStorage('cloudFiles', cloudFiles.value)
  }

  function deleteCloudFile(id: string) {
    cloudFiles.value = cloudFiles.value.filter((f) => f.id !== id)
    saveToStorage('cloudFiles', cloudFiles.value)
  }

  function addTodo(todo: TodoItem) {
    todos.value = [...todos.value, { ...todo, createdBy: currentUser.value || '未知' }]
    saveToStorage('todos', todos.value)
  }

  function updateTodo(id: string, data: Partial<TodoItem>) {
    todos.value = todos.value.map((t) => (t.id === id ? { ...t, ...data } : t))
    saveToStorage('todos', todos.value)
    generateAutoTodos()
  }

  function deleteTodo(id: string) {
    todos.value = todos.value.filter((t) => t.id !== id)
    saveToStorage('todos', todos.value)
  }

  function addOnlineDoc(doc: OnlineDoc) {
    onlineDocs.value = [...onlineDocs.value, doc]
    saveToStorage('onlineDocs', onlineDocs.value)
  }

  function updateOnlineDoc(id: string, data: Partial<OnlineDoc>) {
    onlineDocs.value = onlineDocs.value.map((d) => (d.id === id ? { ...d, ...data } : d))
    saveToStorage('onlineDocs', onlineDocs.value)
  }

  function deleteOnlineDoc(id: string) {
    onlineDocs.value = onlineDocs.value.filter((d) => d.id !== id)
    saveToStorage('onlineDocs', onlineDocs.value)
  }

  function addNote(note: Note) {
    notes.value = [...notes.value, { ...note, createdBy: currentUser.value || '未知' }]
    saveToStorage('notes', notes.value)
  }

  function updateNote(id: string, data: Partial<Note>) {
    notes.value = notes.value.map((n) => (n.id === id ? { ...n, ...data } : n))
    saveToStorage('notes', notes.value)
  }

  function deleteNote(id: string) {
    notes.value = notes.value.filter((n) => n.id !== id)
    saveToStorage('notes', notes.value)
  }

  // ====== 作业系统 ======

  function addHomework(hw: Homework) {
    homework.value = [...homework.value, hw]
    saveToStorage('homework', homework.value)
  }

  function updateHomework(id: string, data: Partial<Homework>) {
    homework.value = homework.value.map((h) => (h.id === id ? { ...h, ...data } : h))
    saveToStorage('homework', homework.value)
  }

  function deleteHomework(id: string) {
    homework.value = homework.value.filter((h) => h.id !== id)
    saveToStorage('homework', homework.value)
  }

  function getCourseHomework(courseId: string): Homework[] {
    return homework.value.filter((h) => h.courseId === courseId)
  }

  function getCourseCloudFiles(courseId: string): CloudFile[] {
    // 当前学生身份（仅学生端调用，需结合班级可见性过滤）
    const student = students.value.find((s) => s.name === currentUser.value)
    const myClassName = student?.className

    return cloudFiles.value.filter((f) => {
      // 课程匹配（优先新字段 courseIds，兼容旧字段 courseId）
      const courseMatched = f.courseIds
        ? f.courseIds.includes(courseId)
        : f.courseId === courseId
      if (!courseMatched) return false

      // 未限制班级：该课程学生全部可见（含旧数据与公开给学生）
      if (!f.visibleToClassNames?.length) return true
      // 按班级可见：需当前学生所在班级在可见班级列表中
      return Boolean(myClassName && f.visibleToClassNames.includes(myClassName))
    })
  }

  function submitHomework(submission: HomeworkSubmission) {
    homeworkSubmissions.value = [...homeworkSubmissions.value, submission]
    saveToStorage('homeworkSubmissions', homeworkSubmissions.value)
    generateAutoTodos()
  }

  function getHomeworkSubmission(homeworkId: string, studentId: string): HomeworkSubmission | undefined {
    return homeworkSubmissions.value.find(
      (s) => s.homeworkId === homeworkId && s.studentId === studentId
    )
  }

  function setStudentHomeworkSummaries(courseId: string, items: any[]) {
    studentHomeworkSummaries.value = {
      ...studentHomeworkSummaries.value,
      [courseId]: items.map((item) => normalizeStudentHomeworkSummary(courseId, item)),
    }
    syncedStudentHomeworkCourses.value = {
      ...syncedStudentHomeworkCourses.value,
      [courseId]: true,
    }
  }

  function getStudentHomeworkSummaries(courseId?: string): StudentHomeworkSummary[] {
    if (courseId) return studentHomeworkSummaries.value[courseId] || []
    return Object.values(studentHomeworkSummaries.value).reduce(
      (all, items) => all.concat(items),
      [] as StudentHomeworkSummary[],
    )
  }

  function findStudentHomeworkSummary(homeworkId: string): StudentHomeworkSummary | null {
    for (const items of Object.values(studentHomeworkSummaries.value)) {
      const matched = items.find((item) => item.id === homeworkId)
      if (matched) return matched
    }
    return null
  }

  function getPendingStudentHomeworkSummaries(courseId?: string): StudentHomeworkSummary[] {
    return getStudentHomeworkSummaries(courseId).filter(isPendingStudentHomework)
  }

  function getPendingStudentHomeworkTasks(courseId?: string) {
    return getPendingStudentHomeworkSummaries(courseId).map((item) => ({
      id: item.id,
      courseId: item.courseId,
      title: item.title,
      dueDate: item.dueDate,
      chapterTitle: item.chapterTitle,
      publishedAt: item.publishedAt,
      completed: false,
    }))
  }

  async function syncStudentHomeworkTodos(courseId?: string, studentId?: string) {
    const resolvedStudentId = studentId || (
      currentRole.value === 'student' && currentUser.value
        ? students.value.find((s) => s.name === currentUser.value)?.id
        : null
    )
    if (!resolvedStudentId) return []

    const courseIds = courseId
      ? [courseId]
      : Array.from(new Set(
          enrollments.value
            .filter((e) => e.studentId === resolvedStudentId && e.status !== 'dropped')
            .map((e) => e.courseId),
        ))

    await Promise.all(courseIds.map(async (cid) => {
      try {
        const response = await fetch(
          `${API_BASE}/homeworks/student/${cid}?studentId=${encodeURIComponent(resolvedStudentId)}`,
        )
        const data = await response.json().catch(() => null)
        if (data?.success && Array.isArray(data.homeworks)) {
          setStudentHomeworkSummaries(cid, data.homeworks)
        }
      } catch (error) {
        console.error('加载学生作业失败:', error)
      }
    }))

    generateAutoTodos()
    return courseId ? getStudentHomeworkSummaries(courseId) : getStudentHomeworkSummaries()
  }

  // ====== 评价系统 ======

  async function syncCourseEvaluationState(courseId: string) {
    if (!courseId) return

    const [evaluationResult, configResult, groupsResult] = await Promise.allSettled([
      fetchCourseEvaluationState(courseId),
      fetchEvalConfig(courseId),
      fetchCourseGroups(courseId),
    ])

    if (evaluationResult.status === 'fulfilled') {
      const remoteEvaluations = Array.isArray(evaluationResult.value.evaluations)
        ? evaluationResult.value.evaluations as Evaluation[]
        : []
      const remoteSubmittedKeys = Array.isArray(evaluationResult.value.teacherSubmittedEvals)
        ? evaluationResult.value.teacherSubmittedEvals as string[]
        : []

      evaluations.value = [
        ...evaluations.value.filter((evaluation) => evaluation.courseId !== courseId),
        ...remoteEvaluations,
      ]
      teacherSubmittedEvals.value = [
        ...teacherSubmittedEvals.value.filter((key) => !key.startsWith(`${courseId}||`)),
        ...remoteSubmittedKeys,
      ]

      saveToStorage('evaluations', evaluations.value)
      saveToStorage('teacherSubmittedEvals', teacherSubmittedEvals.value)
    } else {
      console.warn('同步课程评价失败，继续使用当前缓存:', evaluationResult.reason)
    }

    if (configResult.status === 'fulfilled') {
      const remoteConfig = configResult.value.config as EvaluationConfig | null
      evalConfigs.value = evalConfigs.value.filter((config) => config.courseId !== courseId)
      if (remoteConfig) {
        evalConfigs.value = [...evalConfigs.value, remoteConfig]
      }
      saveToStorage('evalConfigs', evalConfigs.value)
    } else {
      console.warn('同步课程评价配置失败，继续使用当前缓存:', configResult.reason)
    }

    if (groupsResult.status === 'fulfilled') {
      const remoteGroups = Array.isArray(groupsResult.value.groups)
        ? groupsResult.value.groups as StudentGroup[]
        : []
      replaceCourseGroups(courseId, remoteGroups)
    } else {
      console.warn('同步课程分组失败，继续使用当前缓存:', groupsResult.reason)
    }
  }

  async function syncQualityEvaluationState(courseId: string) {
    if (!courseId) return

    try {
      const result = await fetchCourseQualityEvaluations(courseId)
      const remoteEvaluations = Array.isArray(result.evaluations)
        ? result.evaluations as QualityEvaluation[]
        : []

      qualityEvaluations.value = [
        ...qualityEvaluations.value.filter((evaluation) => evaluation.courseId !== courseId),
        ...remoteEvaluations,
      ]
      saveToStorage('qualityEvaluations', qualityEvaluations.value)
    } catch (error) {
      console.warn('同步素质评价失败，继续使用当前缓存:', error)
    }
  }

  function addEvaluation(ev: Evaluation) {
    const course = courses.value.find(c => c.id === ev.courseId)
    if (course && course.status === 'inactive') {
      console.warn('Cannot modify ended course')
      return
    }
    evaluations.value = [...evaluations.value, ev]
    saveToStorage('evaluations', evaluations.value)
    apiSaveEval(ev).catch(() => {})
  }

  function updateEvaluation(id: string, data: Partial<Evaluation>) {
    const ev = evaluations.value.find(e => e.id === id)
    if (ev) {
      const course = courses.value.find(c => c.id === ev.courseId)
      if (course && course.status === 'inactive') {
        console.warn('Cannot modify ended course')
        return
      }
    }
    evaluations.value = evaluations.value.map((e) => (e.id === id ? { ...e, ...data } : e))
    saveToStorage('evaluations', evaluations.value)
    if (ev) apiSaveEval({ ...ev, ...data } as Evaluation).catch(() => {})
  }

  function deleteEvaluation(id: string) {
    evaluations.value = evaluations.value.filter((e) => e.id !== id)
    saveToStorage('evaluations', evaluations.value)
    apiDeleteEval(id).catch(() => {})
  }

  function setEvalConfig(config: EvaluationConfig) {
    const existing = evalConfigs.value.findIndex((c) => c.courseId === config.courseId)
    if (existing >= 0) {
      evalConfigs.value = evalConfigs.value.map((c) => (c.courseId === config.courseId ? config : c))
    } else {
      evalConfigs.value = [...evalConfigs.value, config]
    }
    saveToStorage('evalConfigs', evalConfigs.value)
    apiSaveConfig(config).catch(() => {})
  }

  function normalizeStudentGroup(
    group: Partial<StudentGroup>,
    fallbackCourseId?: string,
    fallbackId?: string,
  ): StudentGroup {
    return {
      id: String(group.id || fallbackId || `grp-${fallbackCourseId || 'course'}-${Date.now()}`),
      courseId: String(group.courseId || fallbackCourseId || ''),
      name: String(group.name || '').trim(),
      memberIds: Array.from(new Set(
        Array.isArray(group.memberIds)
          ? group.memberIds.map((memberId) => String(memberId)).filter(Boolean)
          : [],
      )),
    }
  }

  function replaceCourseGroups(
    courseId: string,
    groups: Array<Partial<StudentGroup> & Pick<StudentGroup, 'name' | 'memberIds'>>,
  ) {
    const normalizedGroups = groups
      .map((group, index) => normalizeStudentGroup(group, courseId, `grp-${courseId}-${Date.now()}-${index}`))
      .filter((group) => !!group.courseId && !!group.name)

    studentGroups.value = [
      ...studentGroups.value.filter((group) => group.courseId !== courseId),
      ...normalizedGroups,
    ]
    saveToStorage('studentGroups', studentGroups.value)
    return normalizedGroups
  }

  function getCourseGroupPayload(courseId: string) {
    return studentGroups.value
      .filter((group) => group.courseId === courseId)
      .map((group) => normalizeStudentGroup(group, courseId, group.id))
      .filter((group) => !!group.name)
      .map((group) => ({
        id: group.id,
        name: group.name,
        memberIds: group.memberIds,
      }))
  }

  async function syncCourseGroupsToDatabase(courseId: string) {
    if (!courseId) return

    const runningTask = courseGroupSyncInFlight.get(courseId)
    if (runningTask) {
      dirtyCourseGroupSyncs.add(courseId)
      return runningTask
    }

    const task = (async () => {
      try {
        do {
          dirtyCourseGroupSyncs.delete(courseId)
          const payload = getCourseGroupPayload(courseId)
          const result = await apiSaveCourseGroups(courseId, payload)

          if (!dirtyCourseGroupSyncs.has(courseId)) {
            const remoteGroups = Array.isArray(result.groups)
              ? result.groups as StudentGroup[]
              : payload.map((group) => ({ ...group, courseId }))
            replaceCourseGroups(courseId, remoteGroups)
          }
        } while (dirtyCourseGroupSyncs.has(courseId))
      } catch (error) {
        console.warn('同步课程分组失败，继续保留当前本地分组:', error)
      } finally {
        courseGroupSyncInFlight.delete(courseId)
      }
    })()

    courseGroupSyncInFlight.set(courseId, task)
    return task
  }

  function addStudentGroup(group: StudentGroup) {
    const normalizedGroup = normalizeStudentGroup(group, group.courseId, group.id)
    studentGroups.value = [...studentGroups.value, normalizedGroup]
    saveToStorage('studentGroups', studentGroups.value)
    void syncCourseGroupsToDatabase(normalizedGroup.courseId)
  }

  function addStudent(student: Student) {
    students.value = [...students.value, student]
    saveToStorage('students', students.value)
  }

  function addTeacher(teacher: Teacher) {
    teachers.value = [...teachers.value, teacher]
    saveToStorage('teachers', teachers.value)
  }

  function updateTeacher(id: string, data: Partial<Teacher>) {
    const oldTeacher = teachers.value.find((teacher) => teacher.id === id)
    teachers.value = teachers.value.map((teacher) => (teacher.id === id ? { ...teacher, ...data } : teacher))
    saveToStorage('teachers', teachers.value)

    if (oldTeacher && data.name && data.name !== oldTeacher.name) {
      courses.value = courses.value.map((course) =>
        course.teacher === oldTeacher.name ? { ...course, teacher: data.name as string } : course
      )
      schedules.value = schedules.value.map((schedule) =>
        schedule.teacher === oldTeacher.name ? { ...schedule, teacher: data.name as string } : schedule
      )
      saveToStorage('courses', courses.value)
      saveToStorage('schedules', schedules.value)

      if (
        currentUser.value === oldTeacher.name &&
        (currentRole.value === 'teacher' || secondaryRoles.value.includes('teacher'))
      ) {
        currentUser.value = data.name
        saveToStorage('currentUser', data.name)
      }
    }
  }

  function deleteTeacher(id: string) {
    teachers.value = teachers.value.filter((teacher) => teacher.id !== id)
    saveToStorage('teachers', teachers.value)
  }

  function updateStudent(id: string, data: Partial<Student>) {
    students.value = students.value.map((s) => (s.id === id ? { ...s, ...data } : s))
    saveToStorage('students', students.value)
  }

  function deleteStudent(id: string) {
    students.value = students.value.filter((s) => s.id !== id)
    saveToStorage('students', students.value)
  }

  function updateStudentGroup(id: string, data: Partial<StudentGroup>) {
    const existingGroup = studentGroups.value.find((group) => group.id === id)
    if (!existingGroup) return

    const normalizedGroup = normalizeStudentGroup(
      { ...existingGroup, ...data, id },
      existingGroup.courseId,
      id,
    )

    studentGroups.value = studentGroups.value.map((group) => (
      group.id === id ? normalizedGroup : group
    ))
    saveToStorage('studentGroups', studentGroups.value)
    void syncCourseGroupsToDatabase(normalizedGroup.courseId)
  }

  function deleteStudentGroup(id: string) {
    const existingGroup = studentGroups.value.find((group) => group.id === id)
    if (!existingGroup) return

    studentGroups.value = studentGroups.value.filter((group) => group.id !== id)
    saveToStorage('studentGroups', studentGroups.value)
    void syncCourseGroupsToDatabase(existingGroup.courseId)
  }

  /** 获取某课程的分组列表 */
  function getCourseGroups(courseId: string): StudentGroup[] {
    return studentGroups.value.filter((g) => g.courseId === courseId)
  }

  /** 清空某课程所有分组 */
  function clearCourseGroups(courseId: string) {
    studentGroups.value = studentGroups.value.filter((group) => group.courseId !== courseId)
    saveToStorage('studentGroups', studentGroups.value)
    void syncCourseGroupsToDatabase(courseId)
  }

  /** 批量设置某课程的分组 */
  function setCourseGroups(courseId: string, groups: { name: string; memberIds: string[] }[]) {
    replaceCourseGroups(courseId, groups)
    void syncCourseGroupsToDatabase(courseId)
  }

  /** 随机分组：将某课程的学生随机分成 n 组 */
  function randomGroup(courseId: string, groupCount: number) {
    // 获取该课程所有未退课学生
    const members = enrollments.value
      .filter((e) => e.courseId === courseId && e.status !== 'dropped')
      .map((e) => e.studentId)
    // 洗牌算法
    const shuffled = [...members]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    // 均分到各组
    const groups: { name: string; memberIds: string[] }[] = []
    const perGroup = Math.ceil(shuffled.length / groupCount)
    for (let g = 0; g < groupCount; g++) {
      const start = g * perGroup
      const end = start + perGroup
      if (start >= shuffled.length) break
      groups.push({
        name: `第${'一二三四五六七八九十'[g] || g + 1}组`,
        memberIds: shuffled.slice(start, end),
      })
    }
    setCourseGroups(courseId, groups)
    return groups
  }

  function detectAnomalies(courseId: string, sessionNumber: number): EvalAnomaly[] {
    const course = courses.value.find((c) => c.id === courseId)
    if (!course) return []
    const anomalies: EvalAnomaly[] = []
    // 找出该课程此轮的所有自评
    const selfEvals = evaluations.value.filter(
      (e) => e.courseId === courseId && e.sessionNumber === sessionNumber && e.type === 'self'
    )
    // 找出所有非自评的评价
    const otherEvals = evaluations.value.filter(
      (e) => e.courseId === courseId && e.sessionNumber === sessionNumber && e.type !== 'self'
    )
    for (const self of selfEvals) {
      // 计算其他评价的平均分
      const related = otherEvals.filter((e) => e.studentId === self.studentId)
      if (related.length === 0) continue
      const avgScore = Math.round(related.reduce((s, e) => s + e.score, 0) / related.length)
      const diff = Math.abs(self.score - avgScore)
      if (diff > 20) {
        const student = students.value.find((s) => s.id === self.studentId)
        anomalies.push({
          id: `anomaly-${courseId}-${self.studentId}-${sessionNumber}`,
          courseId,
          studentId: self.studentId,
          studentName: student?.name || '未知',
          sessionNumber,
          type: 'self',
          selfScore: self.score,
          avgScore,
          diff,
          warning: `个人自评(${self.score}分)与其他评价平均分(${avgScore}分)相差${diff}分，差异过大！`,
        })
      }
    }
    return anomalies
  }

  /** 教师提交评价（提交后锁定，学生端可见） */
  function submitTeacherEval(courseId: string, studentId: string, session: number, type: string) {
    const key = `${courseId}||${studentId}||${session}||${type}`
    if (!teacherSubmittedEvals.value.includes(key)) {
      teacherSubmittedEvals.value = [...teacherSubmittedEvals.value, key]
      saveToStorage('teacherSubmittedEvals', teacherSubmittedEvals.value)
    }
    apiSubmitEval({ courseId, studentId, sessionNumber: session, type }).catch(() => {})
  }

  /** 检查某条教师评价是否已提交 */
  function isTeacherEvalSubmitted(courseId: string, studentId: string, session: number, type: string): boolean {
    if (EVAL_PREVIEW_UNLOCKED) return false
    const key = `${courseId}||${studentId}||${session}||${type}`
    return teacherSubmittedEvals.value.includes(key)
  }

  /** 获取某学生当前可查看的教师最终评分 */
  function getSubmittedTeacherScore(courseId: string, studentId: string, session: number, type: string): number | null {
    if (!isTeacherEvalSubmitted(courseId, studentId, session, type)) return null
    const ev = evaluations.value.find(
      (e) => e.courseId === courseId && e.studentId === studentId && e.sessionNumber === session && e.type === type
    )
    return ev?.score ?? null
  }

  /** 考试/项目成绩操作 */
  function addExamScore(score: import('@/types').ExamScore) {
    examScores.value.push(score)
    saveToStorage('examScores', examScores.value)
  }

  function updateExamScore(id: string, updates: Partial<import('@/types').ExamScore>) {
    const idx = examScores.value.findIndex((s) => s.id === id)
    if (idx !== -1) {
      examScores.value[idx] = { ...examScores.value[idx], ...updates }
      saveToStorage('examScores', examScores.value)
    }
  }

  function submitExamScores(courseId: string, examName: string, studentIds?: string[]) {
    examScores.value = examScores.value.map((s) => {
      if (s.courseId === courseId && s.examName === examName && s.status === 'draft'
          && (!studentIds || studentIds.includes(s.studentId))) {
        return { ...s, status: 'submitted' as const, gradedAt: getNow().toISOString().split('T')[0] }
      }
      return s
    })
    saveToStorage('examScores', examScores.value)
  }

  function getExamScoresForCourse(courseId: string, examName?: string): import('@/types').ExamScore[] {
    let result = examScores.value.filter((s) => s.courseId === courseId)
    if (examName) result = result.filter((s) => s.examName === examName)
    return result
  }

  /** 清理指定课程中同 studentId+同 examName+同 type 的重复成绩记录，仅保留第一条 */
  function deduplicateExamScores(courseId: string) {
    const courseScores = examScores.value.filter((s) => s.courseId === courseId)
    const seen = new Set<string>()
    const deduped: import('@/types').ExamScore[] = []
    for (const s of courseScores) {
      // 使用 学生+考试名+类型 作为唯一键，避免误删跨类型同名（如期中项目/期末项目同名）记录
      const key = `${s.studentId}|${s.examName}|${s.type}`
      if (!seen.has(key)) {
        seen.add(key)
        deduped.push(s)
      }
    }
    if (deduped.length < courseScores.length) {
      const otherScores = examScores.value.filter((s) => s.courseId !== courseId)
      examScores.value = [...otherScores, ...deduped]
      saveToStorage('examScores', examScores.value)
    }
  }

  /** 将指定课程中非标准名称的笔试成绩统一为标准名称（期末测试→期末考试等） */
  function normalizeWrittenExamNames(courseId: string) {
    const nameMap: Record<string, string | undefined> = {
      '期末测试': '期末考试',
      '期末笔试': '期末考试',
      '期中笔试': '期中考试',
    }
    let changed = false
    examScores.value = examScores.value.map((s) => {
      if (s.courseId === courseId) {
        const targetName = nameMap[s.examName]
        if (targetName && s.examName !== targetName) {
          changed = true
          return { ...s, examName: targetName }
        }
      }
      return s
    })
    if (changed) saveToStorage('examScores', examScores.value)
  }

  /** 获取课程已定义的考试/项目名称列表 */
  function getExamNames(courseId: string): string[] {
    const names = new Set(examScores.value.filter((s) => s.courseId === courseId).map((s) => s.examName))
    return Array.from(names).sort()
  }

  // ====== 考试/项目权重配置 ======

  /** 设置某个考试/项目的权重（type 可选，传入后按 类型::名称 复合键存储，避免跨类型同名冲突） */
  function setExamWeight(courseId: string, examName: string, weight: number, type?: string) {
    const courseWeights = { ...(examWeights.value[courseId] || {}) }
    const key = type ? `${type}::${examName}` : examName
    courseWeights[key] = Math.min(100, Math.max(0, weight))
    examWeights.value = { ...examWeights.value, [courseId]: courseWeights }
    saveToStorage('examWeights', examWeights.value)
  }

  /** 获取某个考试/项目的权重（type 可选，优先读取 类型::名称 复合键，回退到旧版纯名称键以兼容历史数据） */
  function getExamWeight(courseId: string, examName: string, type?: string): number {
    const courseWeights = examWeights.value[courseId]
    if (!courseWeights) return 0
    if (type) {
      const compositeKey = `${type}::${examName}`
      if (compositeKey in courseWeights) return courseWeights[compositeKey]
    }
    return courseWeights[examName] ?? 0
  }

  /** 获取课程所有考试/项目的权重配置 */
  function getExamWeightsForCourse(courseId: string): Record<string, number> {
    return examWeights.value[courseId] || {}
  }

  /** 获取某课程期中/期末项目占比的锁定状态 */
  type ScheduleOccurrence = {
    schedule: Schedule
    start: Date
    end: Date
  }

  const scheduleWeekdayMap: Record<string, number> = {
    周日: 0,
    星期日: 0,
    周天: 0,
    星期天: 0,
    周一: 1,
    星期一: 1,
    周二: 2,
    星期二: 2,
    周三: 3,
    星期三: 3,
    周四: 4,
    星期四: 4,
    周五: 5,
    星期五: 5,
    周六: 6,
    星期六: 6,
  }

  function parseClockTime(value: string): { hours: number; minutes: number } | null {
    const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null

    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null
    }

    return { hours, minutes }
  }

  function applyClockTime(date: Date, value: string): Date | null {
    const parsed = parseClockTime(value)
    if (!parsed) return null

    const result = new Date(date)
    result.setHours(parsed.hours, parsed.minutes, 0, 0)
    return result
  }

  function getWeekdayInSameWeek(anchor: Date, weekday: number): Date {
    const result = new Date(anchor)
    result.setHours(0, 0, 0, 0)

    const mondayOffset = (result.getDay() + 6) % 7
    result.setDate(result.getDate() - mondayOffset)

    const targetOffset = weekday === 0 ? 6 : weekday - 1
    result.setDate(result.getDate() + targetOffset)
    return result
  }

  function normalizeDateOnly(date: Date): Date {
    const result = new Date(date)
    result.setHours(0, 0, 0, 0)
    return result
  }

  function getFirstWeekdayOnOrAfter(anchor: Date, weekday: number): Date {
    const result = getWeekdayInSameWeek(anchor, weekday)
    if (result.getTime() < normalizeDateOnly(anchor).getTime()) {
      result.setDate(result.getDate() + 7)
    }
    return result
  }

  function getLastWeekdayOnOrBefore(anchor: Date, weekday: number): Date {
    const result = getWeekdayInSameWeek(anchor, weekday)
    if (result.getTime() > normalizeDateOnly(anchor).getTime()) {
      result.setDate(result.getDate() - 7)
    }
    return result
  }

  function getScheduleWeekday(schedule: Schedule): number | null {
    const label = String(schedule.day ?? '').trim()
    if (label && label in scheduleWeekdayMap) {
      return scheduleWeekdayMap[label]
    }

    const startDate = parseLocalDate(schedule.startDate)
    return startDate ? startDate.getDay() : null
  }

  function buildScheduleOccurrences(schedule: Schedule): ScheduleOccurrence[] {
    const startBoundary = parseLocalDate(schedule.startDate)
    const endBoundary = parseLocalDate(schedule.endDate) ?? startBoundary
    const [startTime = '', endTime = ''] = String(schedule.timeSlot ?? '')
      .split('-')
      .map((part) => part.trim())

    if (!startBoundary || !endBoundary || !startTime || !endTime) return []

    const hasExplicitWeekday = Boolean(String(schedule.day ?? '').trim())
    const weekday = getScheduleWeekday(schedule)
    const dates: Date[] = []

    if (hasExplicitWeekday && weekday !== null) {
      const firstDate = getFirstWeekdayOnOrAfter(startBoundary, weekday)
      const lastDate = getLastWeekdayOnOrBefore(endBoundary, weekday)
      if (firstDate.getTime() > lastDate.getTime()) return []

      for (
        const cursor = new Date(firstDate);
        cursor.getTime() <= lastDate.getTime();
        cursor.setDate(cursor.getDate() + 7)
      ) {
        dates.push(new Date(cursor))
      }
    } else {
      dates.push(new Date(startBoundary))
    }

    const occurrences: ScheduleOccurrence[] = []
    for (const date of dates) {
      const start = applyClockTime(date, startTime)
      const end = applyClockTime(date, endTime)
      if (!start || !end) continue

      if (end.getTime() < start.getTime()) {
        end.setDate(end.getDate() + 1)
      }

      occurrences.push({ schedule, start, end })
    }

    return occurrences
  }

  function getCourseScheduleOccurrences(courseId: string, className = ''): ScheduleOccurrence[] {
    return buildCourseScheduleOccurrences(schedules.value, courseId, className)
  }

  function resolveStudentClassName(studentId: string, fallbackClassName = ''): string {
    const normalizedFallback = String(fallbackClassName).trim()
    if (normalizedFallback) return normalizedFallback

    return String(
      students.value.find((student) => student.id === studentId)?.className ?? '',
    ).trim()
  }

  function formatDateOnly(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')
  }

  function getProjectWeightLock(courseId: string, section: 'midterm' | 'final'): boolean {
    return projectWeightLocks.value[courseId]?.[section] ?? false
  }

  /** 持久化某课程期中/期末项目占比的锁定状态 */
  function setProjectWeightLock(courseId: string, section: 'midterm' | 'final', locked: boolean) {
    projectWeightLocks.value = {
      ...projectWeightLocks.value,
      [courseId]: { midterm: false, final: false, ...(projectWeightLocks.value[courseId] || {}), [section]: locked },
    }
    saveToStorage('projectWeightLocks', projectWeightLocks.value)
  }

  /** 检查课程是否有已提交的期末考试成绩（期末考试/期末项目） */
  function hasFinalExamSubmitted(courseId: string): boolean {
    return examScores.value.some(
      (s) => s.courseId === courseId &&
        (s.type === 'final_exam' || s.type === 'final_project') &&
        s.status === 'submitted'
    )
  }

  /** 评价方案是否可编辑（第一节课开始前可编辑，开始后锁定） */
  function isEvalConfigEditable(courseId: string): boolean {
    if (EVAL_PREVIEW_UNLOCKED) return true
    return !isFirstClassStarted(courseId)
  }

  /** 成绩权重是否可编辑（期末考试成绩录入前可编辑，录入后锁定） */
  function isWeightConfigEditable(courseId: string): boolean {
    return !hasFinalExamSubmitted(courseId)
  }

  // ====== 评价轮次锁定与时机 ======

  /** 锁定某评价轮次（锁定后不可再修改评价） */
  function buildSessionKey(courseId: string, sessionNumber: number, className = ''): string {
    const normalizedClassName = String(className).trim()
    return normalizedClassName
      ? `${courseId}||${normalizedClassName}||${sessionNumber}`
      : `${courseId}||${sessionNumber}`
  }

  function lockSession(courseId: string, sessionNumber: number, className = '') {
    const key = buildSessionKey(courseId, sessionNumber, className)
    if (!lockedSessions.value.includes(key)) {
      lockedSessions.value = [...lockedSessions.value, key]
      saveToStorage('lockedSessions', lockedSessions.value)
    }
  }

  /** 检查某评价轮次是否已锁定 */
  function isSessionLocked(courseId: string, sessionNumber: number, className = ''): boolean {
    if (EVAL_PREVIEW_UNLOCKED) return false
    return lockedSessions.value.includes(buildSessionKey(courseId, sessionNumber, className))
  }

  /**
   * 获取某评价轮次对应的课次索引范围
   * 将课程所有课次按总评价次数均分
   */
  function getSessionScheduleRangeIndex(
    courseId: string,
    sessionNumber: number,
    totalSessions: number,
    className = '',
  ): { startIdx: number; endIdx: number } | null {
    const occurrences = getCourseScheduleOccurrences(courseId, className)
    if (occurrences.length === 0 || totalSessions <= 0) return null

    const perSession = Math.ceil(occurrences.length / totalSessions)
    const startIdx = (sessionNumber - 1) * perSession
    const endIdx = Math.min(sessionNumber * perSession - 1, occurrences.length - 1)

    if (startIdx >= occurrences.length) return null

    return { startIdx, endIdx }
  }

  /**
   * 获取某评价轮次对应的课次结束日期
   * 将课程的所有课次按总评价次数均分后，取对应轮次的最后一节课结束时间
   */
  function getSessionEndDate(courseId: string, sessionNumber: number, className = ''): Date | null {
    const totalSessions = getEvalSessions(courseId, className)
    const range = getSessionScheduleRangeIndex(courseId, sessionNumber, totalSessions, className)
    if (!range) return null

    const occurrences = getCourseScheduleOccurrences(courseId, className)
    return occurrences[range.endIdx]?.end ?? null
  }

  function getCourseEndDate(courseId: string, className = ''): Date | null {
    const occurrences = getCourseScheduleOccurrences(courseId, className)
    if (occurrences.length > 0) {
      return occurrences[occurrences.length - 1].end
    }

    const course = courses.value.find((item) => item.id === courseId)
    return parseLocalDate(course?.endDate)
  }

  function isCourseEnded(courseId: string, className = ''): boolean {
    const endDate = getCourseEndDate(courseId, className)
    if (!endDate) return false
    return getNow().getTime() >= endDate.getTime()
  }

  /**
   * 判断某评价轮次是否已到开启时间
   * 第1次评价从第一节课上课就开启
   * 第k次评价从该轮次对应第一节课上课时开启
   */
  function isSessionTime(courseId: string, sessionNumber: number, className = ''): boolean {
    if (EVAL_PREVIEW_UNLOCKED) return true
    const totalSessions = getEvalSessions(courseId, className)
    const occurrences = getCourseScheduleOccurrences(courseId, className)

    if (occurrences.length === 0) return true

    // 第1次评价从第一节课上课就开启
    if (sessionNumber === 1) {
      return getNow() >= occurrences[0].start
    }

    // 其他轮次：从对应轮次第一节课上课开始
    const range = getSessionScheduleRangeIndex(courseId, sessionNumber, totalSessions, className)
    // 无对应排课（幻影场次）→ 永不开启，避免提前锁定真实场次
    if (!range) return false
    return getNow() >= occurrences[range.startIdx].start
  }

  /**
   * 判断最终评价轮次是否已过截止期
   * 最终评价截止时间为该轮次开启后第三天
   */
  function isFinalSessionDeadlinePassed(courseId: string, totalSessions: number, className = ''): boolean {
    if (EVAL_PREVIEW_UNLOCKED) return false
    const occurrences = getCourseScheduleOccurrences(courseId, className)
    if (occurrences.length === 0) return false

    // 最终评价轮次的第一节课开始时间
    const range = getSessionScheduleRangeIndex(courseId, totalSessions, totalSessions, className)
    if (!range) return false

    // 最终评价截止时间：评价开启时间 + 3天
    const deadline = new Date(occurrences[range.startIdx].start)
    deadline.setDate(deadline.getDate() + 3)
    return getNow() > deadline
  }

  /**
   * 自动锁定所有历史轮次并处理逾期
   * 当第 N 次评价开启时，第 1 ~ N-1 次及之前的评价自动锁定
   */
  function autoLockPreviousSession(courseId: string, currentSession: number, className = '') {
    for (let s = 1; s < currentSession; s++) {
      if (!isSessionLocked(courseId, s, className)) {
        processSessionOverdue(courseId, s, className)
        markSessionEvalRemindersCompleted(courseId, s)
        lockSession(courseId, s, className)
      }
    }
  }

  /**
   * 自动锁定所有已到期的评价轮次
   * 当第 N+1 轮次已到开启时间时，锁定第 N 轮次
   * 当课程结束时，锁定最终轮次
   * 按课程逐一检查
   */
  function autoLockExpiredSessions() {
    const activeCourses = courses.value.filter((c) => c.status === 'active')
    for (const course of activeCourses) {
      const total = getEvalSessions(course.id)
      // 检查各轮次：如果下一轮已到开启时间，锁定当前轮
      for (let s = 1; s < total; s++) {
        if (isSessionTime(course.id, s + 1) && !isSessionLocked(course.id, s)) {
          processSessionOverdue(course.id, s)
          markSessionEvalRemindersCompleted(course.id, s)
          lockSession(course.id, s)
        }
      }
      // 课程已结束，锁定最终轮次
      if (isFinalSessionDeadlinePassed(course.id, total) && !isSessionLocked(course.id, total)) {
        processSessionOverdue(course.id, total)
        markSessionEvalRemindersCompleted(course.id, total)
        lockSession(course.id, total)
      }
    }
  }

  // ====== 评价待办提醒生成 ======

  /**
   * 计算某评价轮次的截止日期
   * - 最终轮次：最后一节课结束时间
   * - 非最终轮次：该轮次对应最后一节课结束时间
   */
  function getSessionDeadline(courseId: string, sessionNumber: number, totalSessions: number, className = ''): string {
    const courseSchedules = schedules.value
      .filter((s) => s.courseId === courseId)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

    const occurrences = getCourseScheduleOccurrences(courseId, className)
    if (occurrences.length === 0) return ''

    if (sessionNumber >= totalSessions) {
      // 最终轮次：最后一节课结束时间后第三天
      const lastEnd = new Date(occurrences[occurrences.length - 1].end)
      lastEnd.setDate(lastEnd.getDate() + 3)
      return lastEnd.toISOString().split('T')[0]
    }
    // 非最终轮次：该轮次最后一节课结束时间
    const end = getSessionEndDate(courseId, sessionNumber, className)
    if (end) return end.toISOString().split('T')[0]
    return ''
  }

  /** 
   * 当某评价轮次可开始评价时，生成待办提醒（教师端和学生端）
   * 含截止日期计算
   */
  function generateSessionReminders(courseId: string, sessionNumber: number, className = '') {
    const course = courses.value.find((c) => c.id === courseId)
    const config = evalConfigs.value.find((c) => c.courseId === courseId)
    if (!course || !config) return

    const totalSessions = getEvalSessions(courseId, className)
    const deadline = getSessionDeadline(courseId, sessionNumber, totalSessions, className)
    const enabledTypes = TEMPLATE_EVAL_TYPES[config.template] || ['self', 'teacher']
    const courseEnrollments = enrollments.value.filter(
      (e) => e.courseId === courseId && e.status !== 'dropped'
    )
    let newEvalReminders: EvalReminder[] = []

    for (const enr of courseEnrollments) {
      for (const type of enabledTypes) {
        // 教师评价 → 课程教师 + 作为教师的领导；导师评价 → 课程导师 + 作为导师的领导；自评/互评 → 学生
        const targetIds = type === 'teacher'
          ? getCourseTeacherTargets(courseId)
          : type === 'mentor'
            ? getCourseMentorTargets(courseId)
            : [enr.studentId]

        for (const targetId of targetIds) {
          const reminderId = `session-reminder-${courseId}-${targetId}-${type}-${sessionNumber}`

          // 已存在提醒则跳过
          if (evalReminders.value.some((r) => r.id === reminderId)) continue

          newEvalReminders.push({
            id: reminderId,
            courseId,
            courseTitle: course.title,
            studentId: targetId,
            sessionNumber,
            deadline,
            status: 'pending',
          })
        }
      }
    }

    if (newEvalReminders.length > 0) {
      evalReminders.value = [...evalReminders.value, ...newEvalReminders]
      saveToStorage('evalReminders', evalReminders.value)
    }
  }

  /**
   * 检查并自动标记逾期的评价提醒
   * 当截止日期已过且仍为 pending 状态时，标记为 overdue
   */
  function checkAndMarkOverdueReminders() {
    const now = getNow()
    let changed = false
    evalReminders.value = evalReminders.value.map((r) => {
      if (r.status !== 'pending') return r
      if (!r.deadline) return r
      const deadline = new Date(r.deadline)
      if (now > deadline) {
        changed = true
        return { ...r, status: 'overdue' as const }
      }
      return r
    })
    if (changed) {
      saveToStorage('evalReminders', evalReminders.value)
    }
    generateAutoTodos()
  }

  /**
   * 扫描所有活跃课程，为已到上课时间的轮次生成待办提醒
   * 同时自动锁定已到期的轮次，并检查逾期
   */
  function checkAndGenerateSessionReminders() {
    // 先处理自动锁定
    autoLockExpiredSessions()

    const activeCourses = courses.value.filter((c) => c.status === 'active')
    for (const course of activeCourses) {
      const totalSessions = getEvalSessions(course.id)
      for (let s = 1; s <= totalSessions; s++) {
        if (isSessionTime(course.id, s) && !isSessionLocked(course.id, s)) {
          generateSessionReminders(course.id, s)
        }
      }
    }
    // 同步检查逾期提醒
    checkAndMarkOverdueReminders()
    // 触发自动待办生成
    generateAutoTodos()
  }

  /**
   * 获取某课程的评价次数 — 基于实际排课数量计算
   * 每 2 节课对应 1 次评价，确保不会产生无对应排课的幻影场次
   */
  function getEvalSessions(courseId: string): number {
    const course = courses.value.find((c) => c.id === courseId)
    if (!course) return 1

    const scheduleCount = schedules.value
      .filter((s) => s.courseId === courseId)
      .length

    // 无排课 → 1 次默认评价
    if (scheduleCount === 0) return 1

    // 每 2 节课对应 1 次评价轮次
    const sessionsBySchedule = Math.max(1, Math.ceil(scheduleCount / 2))

    const config = evalConfigs.value.find((c) => c.courseId === courseId)
    if (!config) return sessionsBySchedule

    switch (config.frequency) {
      case 'biweekly':
        return sessionsBySchedule
      case 'per_unit':
        return Math.min(sessionsBySchedule, 3)
      case 'project_milestone':
        return Math.min(sessionsBySchedule, 3)
      case 'custom':
        return Math.min(config.customSessions || 3, scheduleCount, sessionsBySchedule)
      default:
        return sessionsBySchedule
    }
  }

  function hasGroups(courseId: string): boolean {
    return studentGroups.value.some((g) => g.courseId === courseId)
  }

  function generateEvalReminders(courseId: string) {
    const course = courses.value.find((c) => c.id === courseId)
    const config = evalConfigs.value.find((c) => c.courseId === courseId)
    if (!course || !config) return
    const totalSessions = getEvalSessions(courseId)
    const courseEnrollments = enrollments.value.filter(
      (e) => e.courseId === courseId && e.status !== 'dropped'
    )
    const startDate = new Date(course.createdAt || getNow())
    const reminders: EvalReminder[] = []

    const enabledTypes = TEMPLATE_EVAL_TYPES[config.template] || ['self', 'teacher']

    for (const enr of courseEnrollments) {
      for (let s = 1; s <= totalSessions; s++) {
        for (const type of enabledTypes) {
          // 教师评价 → 课程教师 + 作为教师的领导；导师评价 → 课程导师 + 作为导师的领导；自评/互评 → 学生
          const targetIds = type === 'teacher'
            ? getCourseTeacherTargets(courseId)
            : type === 'mentor'
              ? getCourseMentorTargets(courseId)
              : [enr.studentId]

          const hasEval = evaluations.value.some(
            (e) => e.courseId === courseId && e.studentId === enr.studentId && e.sessionNumber === s && e.type === type
          )
          if (hasEval) continue

          const weekOffset = s * 2
          const deadline = new Date(startDate)
          deadline.setDate(deadline.getDate() + weekOffset * 7)
          const deadlineStr = deadline.toISOString().split('T')[0]

          for (const targetId of targetIds) {
            const reminderId = `reminder-${courseId}-${targetId}-${type}-${s}`
            const exists = evalReminders.value.some((r) => r.id === reminderId)
            if (exists) continue

            reminders.push({
              id: reminderId,
              courseId,
              courseTitle: course.title,
              studentId: targetId,
              sessionNumber: s,
              deadline: deadlineStr,
              status: new Date(deadlineStr) < getNow() ? 'overdue' : 'pending',
            })
          }
        }
      }
    }
    if (reminders.length > 0) {
      evalReminders.value = [...evalReminders.value, ...reminders]
      saveToStorage('evalReminders', evalReminders.value)
    }
  }

  function pushNearDeadlineEvalReminders() {
    const now = getNow()
    const oneWeekLater = new Date(now)
    oneWeekLater.setDate(oneWeekLater.getDate() + 7)

    const isTeacher = currentRole.value === 'teacher'
    const isStudent = currentRole.value === 'student'

    const pendingReminders = evalReminders.value.filter((r) => {
      if (r.status === 'completed') return false
      if (isTeacher && r.studentId === currentUser.value) {
        const deadline = new Date(r.deadline)
        return deadline >= now && deadline <= oneWeekLater
      }
      if (isStudent) {
        const student = students.value.find((s) => s.name === currentUser.value)
        if (student && r.studentId === student.id) {
          const deadline = new Date(r.deadline)
          return deadline >= now && deadline <= oneWeekLater
        }
      }
      return false
    })

    const existingTodoKeys = new Set(todos.value.map((t) => t.title))
    let newCount = 0

    for (const r of pendingReminders) {
      const todoTitle = `📋 评价提醒：${r.courseTitle} 第${r.sessionNumber}次评价即将截止（${r.deadline}）`
      if (existingTodoKeys.has(todoTitle)) continue
      todos.value.push({
        id: `todo-eval-${Date.now()}-${r.id}`,
        title: todoTitle,
        completed: false,
        createdAt: now.toISOString().split('T')[0],
        dueDate: r.deadline,
        createdBy: currentUser.value || 'system',
      })
      existingTodoKeys.add(todoTitle)
      newCount++
    }

    if (newCount > 0) {
      saveToStorage('todos', todos.value)
      todos.value = [...todos.value]
    }
  }

  /**
   * 逾期处理：对某课程某轮次中未提交的评价，按配置规则自动处理
   * 适用于所有评价类型（自评/教师评/导师评/组内互评/组间互评）
   * 规则：
   *   average - 默认记 60 分
   *   zero    - 记 0 分
   *   full    - 记 100 分
   *   none    - 不处理，跳过
   */
  function processSessionOverdue(courseId: string, sessionNumber: number) {
    const config = evalConfigs.value.find((c) => c.courseId === courseId)
    if (!config || config.overdueRule === 'none') return

    const course = courses.value.find((c) => c.id === courseId)
    if (!course) return

    const enabledTypes = TEMPLATE_EVAL_TYPES[config.template] || ['self', 'teacher']
    const courseEnrollments = enrollments.value.filter(
      (e) => e.courseId === courseId && e.status !== 'dropped'
    )
    const newEvals: Evaluation[] = []

    for (const enr of courseEnrollments) {
      for (const type of enabledTypes) {
        // 已有该类型评价则跳过
        if (evaluations.value.some(
          (e) => e.courseId === courseId && e.studentId === enr.studentId && e.sessionNumber === sessionNumber && e.type === type
        )) continue

        let score: number | null = null
        let comment = ''

        switch (config.overdueRule) {
          case 'average': {
            score = 60
            comment = '逾期未评，默认60分'
            break
          }
          case 'zero':
            score = 0
            comment = '逾期未评，记0分'
            break
          case 'full':
            score = 100
            comment = '逾期未评，记满分'
            break
        }

        if (score === null) continue

        // 确定评价人和评价名
        const targetIsTeacher = type === 'teacher' || type === 'mentor'
        const evaluatorId = targetIsTeacher ? course.teacher : enr.studentId
        const evaluatorName = targetIsTeacher
          ? course.teacher
          : (students.value.find((s) => s.id === enr.studentId)?.name || '未知')

        newEvals.push({
          id: `auto-${courseId}-${enr.studentId}-${sessionNumber}-${type}-${Date.now()}`,
          courseId,
          studentId: enr.studentId,
          sessionNumber,
          type: type as EvalType,
          score,
          evaluatorId,
          evaluatorName,
          comment,
          createdAt: getNow().toISOString().split('T')[0],
        })
      }
    }

    if (newEvals.length > 0) {
      evaluations.value = [...evaluations.value, ...newEvals]
      saveToStorage('evaluations', evaluations.value)
    }
  }

  function markEvalReminderCompleted(courseId: string, studentId: string, sessionNumber: number) {
    evalReminders.value = evalReminders.value.map((r) => {
      if (r.courseId === courseId && r.studentId === studentId && r.sessionNumber === sessionNumber) {
        return { ...r, status: 'completed' as const }
      }
      return r
    })
    saveToStorage('evalReminders', evalReminders.value)
    // 触发自动待办清理
    generateAutoTodos()
    apiUpdateReminder(`${courseId}||${studentId}||${sessionNumber}`, 'completed').catch(() => {})
  }

  /** 标记某课程某轮次所有评价提醒为已完成 */
  function markSessionEvalRemindersCompleted(courseId: string, sessionNumber: number) {
    evalReminders.value = evalReminders.value.map((r) => {
      if (r.courseId === courseId && r.sessionNumber === sessionNumber && r.status !== 'completed') {
        return { ...r, status: 'completed' as const }
      }
      return r
    })
    saveToStorage('evalReminders', evalReminders.value)
    generateAutoTodos()
  }

  function checkEvalReminders() {
    const now = getNow()
    const hasUpcoming = evalReminders.value.some((r) => {
      if (r.status === 'completed') return false
      const deadline = new Date(r.deadline)
      return deadline >= now
    })
    hasEvalReminders.value = hasUpcoming
  }

  function recalculateProgress(courseId: string) {
    const courseSchedules = schedules.value
      .filter((s) => s.courseId === courseId)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    const now = getNow()
    const totalSchedules = courseSchedules.length
    if (totalSchedules === 0) return

    // 已开始的课程数（startDate < now）
    const startedSchedules = courseSchedules.filter((s) => new Date(s.startDate) < now).length
    // 进度 = 已上课数 / 总课数（百分比）
    const newProgress = Math.round((startedSchedules / totalSchedules) * 100)

    // 统一更新该课程所有学生的进度
    enrollments.value = enrollments.value.map((e) => {
      if (e.courseId === courseId) {
        return { ...e, progress: newProgress }
      }
      return e
    })
    saveToStorage('enrollments', enrollments.value)
  }

  // ====== 成绩权重配置 ======

  function saveGradeConfig(config: GradeWeightConfig) {
    gradeConfigs.value = { ...gradeConfigs.value, [config.courseId]: config }
    saveToStorage('gradeConfigs', gradeConfigs.value)
  }

  function getGradeConfig(courseId: string): GradeWeightConfig {
    return { ...getDefaultGradeConfig(courseId), ...(gradeConfigs.value[courseId] || {}) }
  }

  function addDetailedGrade(dg: DetailedGrade) {
    detailedGrades.value = [...detailedGrades.value, dg]
    saveToStorage('detailedGrades', detailedGrades.value)
  }

  function updateDetailedGrade(id: string, data: Partial<DetailedGrade>) {
    detailedGrades.value = detailedGrades.value.map((d) => (d.id === id ? { ...d, ...data } : d))
    saveToStorage('detailedGrades', detailedGrades.value)
  }

  /** 将教师评价同步到详细成绩表，实现实时成绩更新 */
  function syncEvalToDetailedGrade(courseId: string) {
    const typeMap: Record<string, keyof DetailedGrade> = { teacher: 'teacherScore', mentor: 'mentorScore' }
    for (const [evalType, gradeField] of Object.entries(typeMap)) {
      const studentScores = new Map<string, number[]>()
      for (const ev of evaluations.value) {
        if (ev.courseId !== courseId || ev.type !== evalType) continue
        if (!studentScores.has(ev.studentId)) studentScores.set(ev.studentId, [])
        studentScores.get(ev.studentId)!.push(ev.score)
      }
      detailedGrades.value = detailedGrades.value.map((dg) => {
        if (dg.courseId !== courseId) return dg
        const scores = studentScores.get(dg.studentId)
        if (!scores || scores.length === 0) return dg
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        return { ...dg, [gradeField]: avg }
      })
    }
    saveToStorage('detailedGrades', detailedGrades.value)
  }

  function getDetailedGrades(courseId: string): DetailedGrade[] {
    return detailedGrades.value.filter((d) => d.courseId === courseId)
  }

  function calcTotalScore(courseId: string, dg: DetailedGrade): number {
    const cfg = gradeConfigs.value[courseId] || getDefaultGradeConfig(courseId)
    const regular =
      (dg.selfEvalScore ?? 0) * cfg.selfEvalWeight / 100 +
      (dg.peerReviewScore ?? 0) * cfg.peerReviewWeight / 100 +
      (dg.interGroupScore ?? 0) * cfg.interGroupEvalWeight / 100 +
      (dg.teacherScore ?? 0) * cfg.teacherScoreWeight / 100 +
      (dg.mentorScore ?? 0) * cfg.mentorScoreWeight / 100
    const midterm = ((dg.midtermExamScore ?? 0) * cfg.midtermExamWeight + (dg.midtermProjectScore ?? 0) * cfg.midtermProjectWeight) / 100
    const final = ((dg.finalExamScore ?? 0) * cfg.finalExamWeight + (dg.finalProjectScore ?? 0) * cfg.finalProjectWeight) / 100
    const base = regular * cfg.regularWeight / 100 + midterm * cfg.midtermWeight / 100 + final * cfg.finalWeight / 100
    // 素质评价分数直接加在总成绩上（满分100，封顶 +10）
    const qualityScore = getStudentQualityScore(courseId, dg.studentId)
    return Math.round(Math.min(100, base + qualityScore))
  }

  // ====== 素质评价操作 ======

  /** 学生提交素质评价（追加一条提交记录，保留历史提交） */
  async function submitQualityEvaluation(data: {
    courseId: string
    studentId: string
    files: QualityEvalFile[]
    description?: string
  }) {
    const result = await apiSubmitQualityEvaluation(data)
    const remoteEvaluation = result.evaluation as QualityEvaluation | null
    if (!remoteEvaluation) {
      throw new Error('服务器未返回素质评价提交记录')
    }

    qualityEvaluations.value = [
      ...qualityEvaluations.value.filter(
        (evaluation) => evaluation.id !== remoteEvaluation.id,
      ),
      remoteEvaluation,
    ]
    saveToStorage('qualityEvaluations', qualityEvaluations.value)
    return remoteEvaluation
  }

  /** 教师对某次提交评分 */
  async function scoreQualityEvaluation(id: string, submissionId: string, score: number, comment?: string) {
    const result = await apiScoreQualityEvaluation({
      evaluationId: id,
      submissionId,
      score,
      teacherComment: comment,
    })
    const remoteEvaluation = result.evaluation as QualityEvaluation | null
    if (!remoteEvaluation) {
      throw new Error('服务器未返回评分结果')
    }

    qualityEvaluations.value = [
      ...qualityEvaluations.value.filter(
        (evaluation) => evaluation.id !== remoteEvaluation.id,
      ),
      remoteEvaluation,
    ]
    saveToStorage('qualityEvaluations', qualityEvaluations.value)
    return remoteEvaluation
  }

  /** 获取某课程所有素质评价 */
  function getQualityEvaluationsForCourse(courseId: string): QualityEvaluation[] {
    return qualityEvaluations.value.filter((q) => q.courseId === courseId)
  }

  /** 获取某学生在某课程的素质评价记录 */
  function getStudentQualityEvaluation(courseId: string, studentId: string): QualityEvaluation | undefined {
    return qualityEvaluations.value.find((q) => q.courseId === courseId && q.studentId === studentId)
  }

  /** 统计某课程中「最新一次提交尚未批改」的学生人数（用于教师端待批改提示） */
  function countPendingQualitySubmissions(courseId: string): number {
    return qualityEvaluations.value.filter((q) => {
      if (q.courseId !== courseId || q.submissions.length === 0) return false
      const latest = q.submissions[q.submissions.length - 1]
      return latest.score === undefined
    }).length
  }

  /** 获取某学生素质评价加成分数（取最新一次被评分的提交分数，封顶为配置的加成上限） */
  function getStudentQualityScore(courseId: string, studentId: string): number {
    const qe = getStudentQualityEvaluation(courseId, studentId)
    if (!qe) return 0
    const graded = qe.submissions.filter((s) => s.score !== undefined)
    if (graded.length === 0) return 0
    const latest = graded[graded.length - 1]
    // 加成上限可配置（成绩配置-素质评价），默认10分
    const cfg = getGradeConfig(courseId)
    if ((cfg.qualityEvalWeight ?? 0) > 0) {
      return (latest.score ?? 0) * (cfg.qualityEvalWeight ?? 0) / 100
    }
    const maxBonus = cfg.qualityEvalMaxBonus ?? 10
    return Math.min(latest.score ?? 0, maxBonus)
  }

  // ====== 配置提醒 ======

  /** 第一节课是否已经开始（配置锁定期） */
  function isFirstClassStarted(courseId: string, className = ''): boolean {
    const occurrences = getCourseScheduleOccurrences(courseId, className)
    if (occurrences.length === 0) return false
    return getNow().getTime() >= occurrences[0].end.getTime()
  }

  /** 第二节课是否已经开始（AI 分层测试截止点） */
  function isSecondClassStarted(courseId: string, className = ''): boolean {
    const occurrences = getCourseScheduleOccurrences(courseId, className)
    if (occurrences.length < 2) return false
    return getNow().getTime() >= occurrences[1].start.getTime()
  }

  /** 获取某学生所有未完成的 AI 分层测试（测试窗口已开但未超时） */
  function getPendingAITierTests(studentId: string): { courseId: string; courseTitle: string; deadline: string }[] {
    const result: { courseId: string; courseTitle: string; deadline: string }[] = []
    const myEnrollments = enrollments.value.filter((e) => e.studentId === studentId)
    const className = resolveStudentClassName(studentId)
    const now = getNow().getTime()

    for (const enr of myEnrollments) {
      const course = courses.value.find((c) => c.id === enr.courseId)
      if (!course || course.status !== 'active') continue

      const tierKey = `${enr.courseId}||${studentId}`
      if (studentTiers.value[tierKey]) continue

      const occurrences = getCourseScheduleOccurrences(enr.courseId, className)
      if (occurrences.length < 2) continue
      if (now < occurrences[0].end.getTime()) continue
      if (now >= occurrences[1].start.getTime()) continue

      result.push({
        courseId: enr.courseId,
        courseTitle: course.title,
        deadline: formatDateOnly(occurrences[1].start),
      })
    }

    return result
  }

  /** 间隔到第二节课后自动分配基础层 */
  function autoAssignOverdueBasicTier(courseId: string, studentId: string, fallbackClassName = '') {
    const key = `${courseId}||${studentId}`
    const className = resolveStudentClassName(studentId, fallbackClassName)
    if (studentTiers.value[key]) return

    const occurrences = getCourseScheduleOccurrences(courseId, className)
    if (occurrences.length < 2) return

    const now = getNow().getTime()
    if (now < occurrences[0].end.getTime()) return
    if (now < occurrences[1].start.getTime()) return

    const record: StudentTierRecord = {
      courseId,
      studentId,
      tier: 'basic',
      score: 0,
      createdAt: getNow().toISOString().split('T')[0],
    }
    studentTiers.value = { ...studentTiers.value, [key]: record }
    saveToStorage('studentTiers', studentTiers.value)
  }
  function markConfigCompleted(courseId: string, type: 'weights' | 'evalConfig') {
    configCompleted.value = {
      ...configCompleted.value,
      [courseId]: {
        ...(configCompleted.value[courseId] || { weights: false, evalConfig: false }),
        [type]: true,
      },
    }
    saveToStorage('configCompleted', configCompleted.value)
    generateAutoTodos()
  }

  /** 获取当前用户的授课课程（普通教师=自己教的课；领导 asTeacher=专属授课课程，与教师端"我的课程"一致） */
  function getTeacherCoursesForUser(user: string): Course[] {
    const leader = leaders.value.find((l) => l.name === user)
    if (leader?.asTeacher) {
      return courses.value.filter((c) => leader.teacherCourseIds?.includes(c.id) || c.teacher === user)
    }
    return courses.value.filter((c) => c.teacher === user)
  }

  /** 获取有未完成配置的课程列表（排除已锁定课程，仅当前教师自己的课程） */
  function getPendingConfigCourses(): { courseId: string; courseTitle: string; missing: string[] }[] {
    const activeCourses = getTeacherCoursesForUser(currentUser.value || '').filter(
      (c) => c.status === 'active'
    )
    const result: { courseId: string; courseTitle: string; missing: string[] }[] = []
    for (const course of activeCourses) {
      if (isFirstClassStarted(course.id)) continue // 已锁定，不需要提醒
      const done = configCompleted.value[course.id]
      const missing: string[] = []
      if (!done?.weights) missing.push('成绩权重')
      if (!done?.evalConfig) missing.push('评价方案')
      if (missing.length > 0) {
        result.push({ courseId: course.id, courseTitle: course.title, missing })
      }
    }
    return result
  }

  // ====== 企业导师相关 ======

  /**
   * 某课程教师评价的提醒对象：课程教师 + 教师记录 courseIds 归属的教师 + 将该课程作为专属授课课程的学院领导（asTeacher）
   * 使"领导-教师部分"与普通教师一样能收到评价待办
   */
  function getCourseTeacherTargets(courseId: string): string[] {
    const course = courses.value.find((c) => c.id === courseId)
    if (!course) return []
    const targets = new Set<string>()
    if (course.teacher) targets.add(course.teacher)
    teachers.value.forEach((t) => {
      if (t.courseIds.includes(courseId)) targets.add(t.name)
    })
    leaders.value.forEach((l) => {
      if (l.asTeacher && l.teacherCourseIds?.includes(courseId)) targets.add(l.name)
    })
    return [...targets]
  }

  /**
   * 某课程导师评价的提醒对象：课程导师 + 导师记录 courseIds 归属的导师 + 将该课程作为专属导师课程的学院领导（asMentor）
   * 使"领导-导师部分"与普通导师一样能收到评价待办
   */
  function getCourseMentorTargets(courseId: string): string[] {
    const course = courses.value.find((c) => c.id === courseId)
    if (!course) return []
    const targets = new Set<string>()
    if (course.mentor) targets.add(course.mentor)
    mentors.value.forEach((m) => {
      if (m.courseIds.includes(courseId)) targets.add(m.name)
    })
    leaders.value.forEach((l) => {
      if (l.asMentor && l.mentorCourseIds?.includes(courseId)) targets.add(l.name)
    })
    return [...targets]
  }

  /** 获取某导师负责的所有课程ID */
  function getMentorCourseIds(mentorName: string): string[] {
    const mentor = mentors.value.find((m) => m.name === mentorName)
    if (mentor) return mentor.courseIds
    // 也检查课程 mentor 字段
    const byMentorField = courses.value.filter((c) => c.mentor === mentorName).map((c) => c.id)
    if (byMentorField.length > 0) return byMentorField
    // 领导以 asMentor 身份访问：优先用其专属导师课程（与普通导师一致），未配置时退回按管辖分类
    const leader = leaders.value.find((l) => l.name === mentorName)
    if (leader?.asMentor) {
      if (leader.mentorCourseIds?.length) return leader.mentorCourseIds
      return courses.value.filter((c) => leader.categoryIds.includes(c.categoryId)).map((c) => c.id)
    }
    return []
  }

  // ====== 学院领导相关 ======

  /** 获取某领导管辖的所有课程 */
  function getLeaderCourses(leaderName: string): Course[] {
    const leader = leaders.value.find((l) => l.name === leaderName)
    if (!leader) return []
    return courses.value.filter((c) => leader.categoryIds.includes(c.categoryId))
  }

  /** 获取某领导作为教师授课的专属课程（与教师端"我的课程"逻辑一致） */
  function getLeaderTeacherCourses(leaderName: string): Course[] {
    const leader = leaders.value.find((l) => l.name === leaderName)
    if (!leader?.asTeacher) return []
    return courses.value.filter(
      (c) => leader.teacherCourseIds?.includes(c.id) || c.teacher === leaderName
    )
  }

  /** 判断某课程是否为该领导作为教师的授课课程（可完整管理） */
  function isLeaderTeacherCourse(leaderName: string, courseId: string): boolean {
    return getLeaderTeacherCourses(leaderName).some((c) => c.id === courseId)
  }

  // ====== 待处理事务统计（用于侧边栏红点提醒与一路溯源） ======

  /** 当前用户在该课程是否有待完成的评价（按当前用户自身的提醒判断） */
  function hasPendingEvalForCourse(courseId: string): boolean {
    const user = currentUser.value
    if (!user) return false
    const myTargetId = currentRole.value === 'student'
      ? (students.value.find((s) => s.name === user)?.id ?? '')
      : user
    return evalReminders.value.some(
      (r) => r.courseId === courseId && r.studentId === myTargetId && r.status !== 'completed'
    )
  }

  /** 该课程是否仍有未完成的配置（成绩权重/评价方案） */
  function isCourseConfigPending(courseId: string): boolean {
    if (isFirstClassStarted(courseId)) return false // 第一节课已结束，配置已锁定，不再提醒
    const done = configCompleted.value[courseId]
    return !(done?.weights && done?.evalConfig)
  }

  /**
   * 获取当前用户在某范围内有未处理事务的课程 ID
   * scope: 'teacher'（教师端我的课程）/ 'mentor'（导师端我的课程）/ 'student'（学生端我的课程）/ 'leader'（领导端课程总览）
   */
  function getMyPendingCourseIds(scope: 'teacher' | 'mentor' | 'student' | 'leader'): string[] {
    const user = currentUser.value
    if (!user) return []
    const result = new Set<string>()

    if (scope === 'teacher') {
      for (const c of getTeacherCoursesForUser(user)) {
        if (hasPendingEvalForCourse(c.id) || isCourseConfigPending(c.id) || countPendingQualitySubmissions(c.id) > 0) {
          result.add(c.id)
        }
      }
    } else if (scope === 'mentor') {
      for (const courseId of getMentorCourseIds(user)) {
        const hasPending = evalReminders.value.some(
          (r) => r.courseId === courseId && r.studentId === user && r.status !== 'completed'
        )
        if (hasPending) result.add(courseId)
      }
    } else if (scope === 'student') {
      const student = students.value.find((s) => s.name === user)
      if (student) {
        const enrolled = enrollments.value.filter((e) => e.studentId === student.id && e.status !== 'dropped')
        const aiTierPending = new Set(getPendingAITierTests(student.id).map((t) => t.courseId))
        for (const enr of enrolled) {
          const courseId = enr.courseId
          const hasEval = evalReminders.value.some(
            (r) => r.courseId === courseId && r.studentId === student.id && r.status !== 'completed'
          )
          const hasHomework = syncedStudentHomeworkCourses.value[courseId]
            ? getPendingStudentHomeworkSummaries(courseId).length > 0
            : false
          if (hasEval || aiTierPending.has(courseId) || hasHomework) result.add(courseId)
        }
      }
    } else if (scope === 'leader') {
      // 领导段：仅统计教师/导师类待评（非学生自评），避免因学生自评未交导致的常亮红点
      const studentIds = new Set(students.value.map((s) => s.id))
      for (const c of getLeaderCourses(user)) {
        const hasPendingEval = evalReminders.value.some(
          (r) => r.courseId === c.id && r.status !== 'completed' && !studentIds.has(r.studentId)
        )
        if (hasPendingEval || countPendingQualitySubmissions(c.id) > 0) result.add(c.id)
      }
    }
    return [...result]
  }

  /** 获取某领导管辖的所有学生（去重） */
  function getLeaderStudents(leaderName: string): Student[] {
    const leader = leaders.value.find((l) => l.name === leaderName)
    if (!leader) return []
    const courseIds = courses.value
      .filter((c) => leader.categoryIds.includes(c.categoryId))
      .map((c) => c.id)
    const studentIds = new Set(
      enrollments.value
        .filter((e) => courseIds.includes(e.courseId))
        .map((e) => e.studentId)
    )
    return students.value.filter((s) => studentIds.has(s.id))
  }

  // ====== AI 分层 ======

  /** 获取某学生某课程的 AI 分层记录 */
  function getStudentTier(courseId: string, studentId: string): StudentTierRecord | null {
    const key = `${courseId}||${studentId}`
    return studentTiers.value[key] ?? null
  }

  /** 根据分数判定层级 */
  function determineTier(score: number): 'basic' | 'advanced' | 'excellent' {
    if (score >= 80) return 'excellent'
    if (score >= 60) return 'advanced'
    return 'basic'
  }

  /** 提交 AI 分层测试结果 */
  function submitAITierTest(courseId: string, studentId: string, score: number) {
    const resultKey = `${courseId}||${studentId}`
    const tier = determineTier(score)
    const record: StudentTierRecord = {
      courseId,
      studentId,
      tier,
      score,
      createdAt: getNow().toISOString().split('T')[0],
    }
    studentTiers.value = { ...studentTiers.value, [resultKey]: record }
    saveToStorage('studentTiers', studentTiers.value)
    generateAutoTodos()
    return record
  }

  /**
   * 全自动待办生成：扫描所有源（评价提醒/配置任务/素质评价/AI分层测试/作业），
   * 自动创建或清理对应的待办事项；底层源完成后待办自动消失。
   * 教师端/领导教师部分：评价待办 + 配置待办 + 素质评价批改待办
   * 学生端：评价待办 + AI分层测试待办 + 作业待办
   * 企业导师端/领导导师部分：评价待办
   */
  function generateAutoTodos() {
    const now = getNow()
    const currentStudentId = (() => {
      if (currentRole.value !== 'student' || !currentUser.value) return null
      return students.value.find((s) => s.name === currentUser.value)?.id ?? null
    })()
    // 当前用户在评价提醒中的目标 id：学生用学生 id，其余角色用姓名（领导教师/导师的提醒直接指向其姓名）
    const myTargetId = currentStudentId || currentUser.value || ''
    // 是否教师身份（普通教师 或 领导 asTeacher 在教师部分有专属授课课程）
    const isTeacherLike = !!currentUser.value && (
      currentRole.value === 'teacher' ||
      (currentRole.value === 'leader' && getTeacherCoursesForUser(currentUser.value).length > 0)
    )
    // 收集当前所有的 auto- 前缀待办 ID（用于去重）
    const autoTodoIds = new Set(todos.value.map((t) => t.id))
    const newTodos: TodoItem[] = []
    let changed = false

    // ── 辅助函数：检查 auto 待办是否已存在 ──
    const hasAutoTodo = (id: string) => autoTodoIds.has(id) || newTodos.some((t) => t.id === id)

    // ── 1. 评价待办（教师/领导教师、导师/领导导师、学生） ──
    const myPendingEvalReminders = evalReminders.value.filter((r) => {
      if (r.status === 'completed' || r.status === 'overdue') return false
      return r.studentId === myTargetId
    })
    for (const r of myPendingEvalReminders) {
      const todoId = `auto-eval-${r.courseId}-${r.sessionNumber}`
      if (hasAutoTodo(todoId)) continue
      // 从提醒 id 判断类型：session-reminder-{courseId}-{targetId}-{type}-{session}
      const roleType = r.id.includes('-teacher-') ? '教师评' : r.id.includes('-mentor-') ? '导师评' : ''
      const title = currentRole.value === 'student'
        ? `[评价] ${r.courseTitle} 第${r.sessionNumber}次评价`
        : `[评价] ${r.courseTitle} 第${r.sessionNumber}次评价 (${roleType})`
      newTodos.push({
        id: todoId,
        title,
        completed: false,
        createdAt: now.toISOString().split('T')[0],
        dueDate: r.deadline || undefined,
        createdBy: currentUser.value || 'system',
      })
      changed = true
    }

    // ── 2. 配置待办（教师/领导教师） ──
    if (isTeacherLike) {
      const pendingConfigs = getPendingConfigCourses()
      for (const cfg of pendingConfigs) {
        const todoId = `auto-config-${cfg.courseId}`
        if (hasAutoTodo(todoId)) continue
        newTodos.push({
          id: todoId,
          title: `[配置] ${cfg.courseTitle} - 未配置：${cfg.missing.join('、')}`,
          completed: false,
          createdAt: now.toISOString().split('T')[0],
          createdBy: currentUser.value || 'system',
        })
        changed = true
      }
    }

    // ── 2.5 素质评价批改待办（教师/领导教师） ──
    if (isTeacherLike) {
      for (const c of getTeacherCoursesForUser(currentUser.value || '')) {
        const pending = countPendingQualitySubmissions(c.id)
        if (pending <= 0) continue
        const todoId = `auto-quality-${c.id}`
        if (hasAutoTodo(todoId)) continue
        newTodos.push({
          id: todoId,
          title: `[素质评价] ${c.title} - ${pending}份待批改`,
          completed: false,
          createdAt: now.toISOString().split('T')[0],
          createdBy: currentUser.value || 'system',
        })
        changed = true
      }
    }

    // ── 3. AI 分层测试待办（仅学生） ──
    if (currentRole.value === 'student' && currentStudentId) {
      const pendingAITests = getPendingAITierTests(currentStudentId)
      for (const test of pendingAITests) {
        const todoId = `auto-ai-tier-${test.courseId}-${currentStudentId}`
        if (hasAutoTodo(todoId)) continue
        newTodos.push({
          id: todoId,
          title: `[AI分层] ${test.courseTitle} - 请在第二节课前完成分层测试`,
          completed: false,
          createdAt: now.toISOString().split('T')[0],
          dueDate: test.deadline,
          createdBy: currentUser.value || 'system',
        })
        changed = true
      }
    }

    // ── 4. 作业待办（仅学生） ──
    if (currentRole.value === 'student' && currentStudentId) {
      const pendingHomework = getPendingStudentHomeworkSummaries()
      for (const hw of pendingHomework) {
        const todoId = `auto-homework-${hw.id}-${currentStudentId}`
        if (hasAutoTodo(todoId)) continue
        newTodos.push({
          id: todoId,
          title: `[作业] ${hw.title}`,
          completed: false,
          createdAt: hw.createdAt || hw.publishedAt || now.toISOString().split('T')[0],
          dueDate: hw.dueDate,
          createdBy: currentUser.value || 'system',
        })
        changed = true
      }
    }

    // ── 5. 清理：当底层源已完成时，标记对应 auto-todo 为已完成（自动消失） ──
    todos.value = todos.value.map((t) => {
      if (t.completed) return t

      // 评价待办清理（课程 ID 可能含连字符，用 lastIndexOf 解析；按当前用户自身提醒判断）
      if (t.id.startsWith('auto-eval-')) {
        const rest = t.id.replace('auto-eval-', '')
        const sepIdx = rest.lastIndexOf('-')
        if (sepIdx > 0) {
          const courseId = rest.substring(0, sepIdx)
          const sessionNum = parseInt(rest.substring(sepIdx + 1))
          const related = evalReminders.value.filter(
            (r) => r.courseId === courseId && r.sessionNumber === sessionNum && r.studentId === myTargetId
          )
          if (related.length > 0 && related.every((r) => r.status === 'completed')) {
            changed = true
            return { ...t, completed: true }
          }
        }
      }

      // 配置待办清理
      if (t.id.startsWith('auto-config-')) {
        const courseId = t.id.replace('auto-config-', '')
        const pending = getPendingConfigCourses()
        if (!pending.some((c) => c.courseId === courseId)) {
          changed = true
          return { ...t, completed: true }
        }
      }

      // 素质评价待办清理
      if (t.id.startsWith('auto-quality-')) {
        const courseId = t.id.replace('auto-quality-', '')
        if (countPendingQualitySubmissions(courseId) === 0) {
          changed = true
          return { ...t, completed: true }
        }
      }

      // AI 分层待办清理
      if (t.id.startsWith('auto-ai-tier-')) {
        const key = t.id.replace('auto-ai-tier-', '')
        if (studentTiers.value[key]) {
          changed = true
          return { ...t, completed: true }
        }
      }

      // 作业待办清理
      if (t.id.startsWith('auto-homework-')) {
        const key = t.id.replace('auto-homework-', '') // homeworkId-studentId
        const sepIdx = key.lastIndexOf('-')
        if (sepIdx > 0) {
          const hwId = key.substring(0, sepIdx)
          const summary = findStudentHomeworkSummary(hwId)
          const localHomework = homework.value.find((item) => item.id === hwId)
          const syncedCourseId = summary?.courseId || localHomework?.courseId
          if (summary && !isPendingStudentHomework(summary)) {
            changed = true
            return { ...t, completed: true }
          }
          if (!summary && syncedCourseId && syncedStudentHomeworkCourses.value[syncedCourseId]) {
            changed = true
            return { ...t, completed: true }
          }
        }
      }

      return t
    })

    // ── 写入新待办并保存 ──
    if (newTodos.length > 0) {
      todos.value = [...todos.value, ...newTodos]
      changed = true
    }
    if (changed) {
      saveToStorage('todos', todos.value)
    }
  }

  // 初始化：根据排课自动重算所有课程的进度
  const courseIds = [...new Set(schedules.value.map((s) => s.courseId))]
  courseIds.forEach((cid) => recalculateProgress(cid))

  return {
    // state
    courses, categories, students, schedules, enrollments, teachers, grades,
    cloudFiles, todos, onlineDocs, notes,
    evaluations, evalConfigs, studentGroups, evalReminders,
    gradeConfigs, detailedGrades,
    homework, homeworkSubmissions,
    isLoggedIn, currentUser, currentRole,
    hasEvalReminders,
    mentors, leaders, secondaryRoles,
    departments, departmentClasses, selectedDepartmentId,
    examScores,
    examWeights,
    lockedSessions,
    studentTiers,
    // actions
    login, logout,
    addCourse, updateCourse, deleteCourse, assignMentorToCourse,
    addCategory, updateCategory, deleteCategory,
    addSchedule, updateSchedule, deleteSchedule,
    addEnrollment, updateEnrollment, deleteEnrollment,
    addGrade, updateGrade, deleteGrade,
    addCloudFile, updateCloudFile, deleteCloudFile,
    addTodo, updateTodo, deleteTodo,
    addOnlineDoc, updateOnlineDoc, deleteOnlineDoc,
    addNote, updateNote, deleteNote,
    addHomework, updateHomework, deleteHomework,
    getCourseHomework, getCourseCloudFiles,
    submitHomework, getHomeworkSubmission,
    setStudentHomeworkSummaries, getStudentHomeworkSummaries, getPendingStudentHomeworkTasks,
    findStudentHomeworkSummary, syncStudentHomeworkTodos,
    syncCourseEvaluationState, syncQualityEvaluationState, addEvaluation, updateEvaluation, deleteEvaluation,
    setEvalConfig, addStudentGroup, addStudent, addTeacher, updateTeacher, deleteTeacher, updateStudent, deleteStudent, updateStudentGroup, deleteStudentGroup,
    getCourseGroups, clearCourseGroups, setCourseGroups, randomGroup,
    detectAnomalies, getEvalSessions, hasGroups,
    submitTeacherEval, isTeacherEvalSubmitted, getSubmittedTeacherScore,
    addExamScore, updateExamScore, submitExamScores, getExamScoresForCourse, getExamNames, deduplicateExamScores, normalizeWrittenExamNames,
    setExamWeight, getExamWeight, getExamWeightsForCourse,
    getProjectWeightLock, setProjectWeightLock,
    hasFinalExamSubmitted, isEvalConfigEditable, isWeightConfigEditable,
    lockSession, isSessionLocked, getSessionScheduleRangeIndex, getSessionEndDate, isCourseEnded, isSessionTime, isFinalSessionDeadlinePassed, autoLockPreviousSession, autoLockExpiredSessions,
    generateSessionReminders, checkAndGenerateSessionReminders, getSessionDeadline, checkAndMarkOverdueReminders,
    generateAutoTodos, generateEvalReminders, pushNearDeadlineEvalReminders, processSessionOverdue,
    markEvalReminderCompleted, markSessionEvalRemindersCompleted,
    isFirstClassStarted, markConfigCompleted, getPendingConfigCourses,
    checkEvalReminders,
    recalculateProgress,
    saveGradeConfig, getGradeConfig,
    addDetailedGrade, updateDetailedGrade, getDetailedGrades, syncEvalToDetailedGrade,
    calcTotalScore,
    // 素质评价
    qualityEvaluations, submitQualityEvaluation, scoreQualityEvaluation,
    getQualityEvaluationsForCourse, getStudentQualityEvaluation, getStudentQualityScore, countPendingQualitySubmissions,
    getMentorCourseIds, getLeaderCourses, getLeaderStudents,
    getLeaderTeacherCourses, isLeaderTeacherCourse,
    getTeacherCoursesForUser, getCourseTeacherTargets, getCourseMentorTargets,
    // 待处理事务统计（红点提醒）
    hasPendingEvalForCourse, isCourseConfigPending, getMyPendingCourseIds,
    getStudentTier, determineTier, submitAITierTest,
    isSecondClassStarted, getPendingAITierTests, autoAssignOverdueBasicTier,
    // department actions
    setSelectedDepartment, getSelectedDepartment,
    addDepartment, updateDepartment, deleteDepartment,
    getDepartmentCategories, getDepartmentClasses,
    addDepartmentClass, removeDepartmentClass,
  }
})
