import type { AssistantAgentRequest, AssistantAgentResponse } from '@/lib/assistantAgent'

const API_PROTOCOL = window.location.protocol === 'https:' ? 'https:' : 'http:'
const API_HOST = window.location.hostname || '127.0.0.1'
const API_PORT = (import.meta.env.VITE_API_PORT as string | undefined) ?? '3002'
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? `${API_PROTOCOL}//${API_HOST}:${API_PORT}/api`

type RequestOptions = RequestInit & {
  timeoutMs?: number
}

type RequestError = Error & {
  code?: string
  status?: number
}

function buildQuery(params: Record<string, any> = {}) {
  return new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (value == null ? [] : [[key, String(value)]])),
  ).toString()
}

async function request(url: string, options: RequestOptions = {}) {
  const { timeoutMs = 3000, ...fetchOptions } = options
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  const config: RequestInit = {
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    ...fetchOptions,
  }

  // 自动注入 JWT token（从每标签独立的 sessionStorage 读取，支持多窗口互不干扰）
  let token: string | null = null
  try {
    const raw = sessionStorage.getItem('activeSession')
    if (raw) token = (JSON.parse(raw)?.token ?? null) as string | null
  } catch { /* ignore */ }
  if (token) {
    const headers = new Headers(config.headers)
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers
  }

  try {
    const response = await fetch(`${API_BASE}${url}`, config)
    const data = await response.json().catch(() => ({}))

    if (!response.ok || data.success === false) {
      if (typeof data.code === 'string') {
        const error = new Error(data.message || `Request failed (${response.status})`) as RequestError
        error.code = data.code
        error.status = response.status
        throw error
      }
      throw new Error(data.message || `请求失败 (${response.status})`)
    }

    return data
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function unifiedLogin(account: string, password: string) {
  return request('/user/login', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  })
}

export async function studentLogin(studentId: string, password: string) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ studentId, password }),
  })
}

export async function verifyToken(token: string) {
  return request('/auth/verify', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function fetchStudents(params: Record<string, any> = {}) {
  const query = buildQuery(params)
  return request(`/students${query ? `?${query}` : ''}`)
}

export async function fetchStudentCourses(studentId: string) {
  return request(`/students/${encodeURIComponent(studentId)}/courses`)
}

export async function createAdminStudent(data: any) {
  return request('/students', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAdminStudent(id: string, data: any) {
  return request(`/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAdminStudent(id: string) {
  return request(`/students/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchDepartments(params: Record<string, any> = {}) {
  const query = buildQuery(params)
  return request(`/departments${query ? `?${query}` : ''}`)
}

export async function createDepartment(data: any) {
  return request('/departments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDepartment(id: string, data: any) {
  return request(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteDepartment(id: string) {
  return request(`/departments/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchClasses(params: Record<string, any> = {}) {
  const query = buildQuery(params)
  return request(`/classes${query ? `?${query}` : ''}`)
}

export async function createClass(data: any) {
  return request('/classes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateClass(id: string, data: any) {
  return request(`/classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteClass(id: string) {
  return request(`/classes/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchTeachers(params: Record<string, any> = {}) {
  const query = buildQuery(params)
  return request(`/teachers${query ? `?${query}` : ''}`)
}

export async function updateTeacher(id: string, data: any) {
  return request(`/teachers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteTeacher(id: string) {
  return request(`/teachers/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchCategories(params: Record<string, any> = {}) {
  const query = buildQuery(params)
  return request(`/categories${query ? `?${query}` : ''}`)
}

export async function createCategory(data: any) {
  return request('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCategory(id: string, data: any) {
  return request(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteCategory(id: string) {
  return request(`/categories/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchCourses(params: Record<string, any> = {}) {
  const query = buildQuery(params)
  return request(`/courses${query ? `?${query}` : ''}`)
}

export async function createCourse(data: any) {
  return request('/courses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function syncCategoriesFromSchedules() {
  return request('/categories/sync', { method: 'POST' })
}

export async function bulkImportSchedules(schedules: any) {
  return request('/schedules/bulk', {
    method: 'POST',
    body: JSON.stringify({ schedules }),
  })
}

export async function fetchSchedules(params: Record<string, any> = {}) {
  const query = buildQuery(params)
  return request(`/schedules${query ? `?${query}` : ''}`)
}

export async function fetchTeacherCourses(teacherName: string) {
  return request(`/courses/teacher/${encodeURIComponent(teacherName)}`)
}

export async function bulkImportEnrollments(enrollments: any) {
  return request('/teaching/enrollments/bulk', {
    method: 'POST',
    body: JSON.stringify({ enrollments }),
  })
}

export async function updateStudent(studentId: string, data: any) {
  return request(`/teaching/students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function bulkImportScores(scores: any) {
  return request('/teaching/scores/bulk', {
    method: 'POST',
    body: JSON.stringify({ scores }),
  })
}

export async function bulkImportGroups(groups: any) {
  return request('/teaching/groups/bulk', {
    method: 'POST',
    body: JSON.stringify({ groups }),
  })
}

export async function saveCourseGroups(courseId: string, groups: any[]) {
  return request('/teaching/groups/sync', {
    method: 'POST',
    keepalive: true,
    body: JSON.stringify({ courseId, groups }),
  })
}

export async function fetchEvalConfig(courseId: string) {
  return request(`/eval/config/${courseId}`)
}

export async function fetchCourseEvaluationState(courseId: string) {
  return request(`/eval/course/${encodeURIComponent(courseId)}`)
}

export async function fetchCourseGroups(courseId: string) {
  return request(`/teaching/groups/${encodeURIComponent(courseId)}`)
}

export async function saveEvalConfig(config: any) {
  return request('/eval/config', {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

export async function saveEvaluation(ev: any) {
  return request('/eval/save', {
    method: 'POST',
    body: JSON.stringify(ev),
  })
}

export async function batchSaveEvaluations(evaluations: any) {
  return request('/eval/batch', {
    method: 'POST',
    body: JSON.stringify({ evaluations }),
  })
}

export async function deleteEvaluation(id: string) {
  return request(`/eval/${id}`, { method: 'DELETE' })
}

export async function submitTeacherEval(data: any) {
  return request('/eval/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function saveEvalReminders(reminders: any) {
  return request('/eval/reminders', {
    method: 'POST',
    body: JSON.stringify({ reminders }),
  })
}

export async function updateEvalReminder(id: string, status: string) {
  return request(`/eval/reminders/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export async function fetchCourseScores(courseId: string) {
  return request(`/teaching/scores/${courseId}`)
}

export async function fetchStudentScores(studentId: string) {
  return request(`/teaching/scores/student/${studentId}`)
}

/** 取某生的成绩明细（平时五类 + 期中/期末分项），平时成绩与职业画像的后端权威源 */
export async function fetchStudentDetailedGrades(studentId: string) {
  return request(`/detailed-grades/student/${encodeURIComponent(studentId)}`)
}

export async function fetchCourseQualityEvaluations(courseId: string) {
  return request(`/quality-evaluations/course/${encodeURIComponent(courseId)}`)
}

export async function fetchStudentQualityEvaluation(courseId: string, studentId: string) {
  return request(
    `/quality-evaluations/student/${encodeURIComponent(courseId)}/${encodeURIComponent(studentId)}`,
  )
}

export async function submitQualityEvaluation(data: any) {
  return request('/quality-evaluations/submit', {
    method: 'POST',
    body: JSON.stringify(data),
    timeoutMs: 30000,
  })
}

export async function scoreQualityEvaluation(data: any) {
  return request(
    `/quality-evaluations/${encodeURIComponent(data.evaluationId)}/submissions/${encodeURIComponent(data.submissionId)}/score`,
    {
      method: 'PUT',
      body: JSON.stringify({
        score: data.score,
        teacherComment: data.teacherComment,
      }),
    },
  )
}

export async function fetchDepartmentCourses(department: string) {
  return request(`/courses/department/${encodeURIComponent(department)}`)
}

export async function fetchDepartmentStudents(department: string) {
  return request(`/students/department/${encodeURIComponent(department)}`)
}

export async function fetchCourseStudents(courseId: string) {
  return request(`/courses/${courseId}/students`)
}

export async function updateCourse(id: string, data: any) {
  return request(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteCourse(id: string) {
  return request(`/courses/${id}`, {
    method: 'DELETE',
  })
}

export async function updateSchedule(id: string, data: any) {
  return request(`/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteSchedule(id: string) {
  return request(`/schedules/${id}`, {
    method: 'DELETE',
  })
}

export async function invokeAssistant(payload: AssistantAgentRequest): Promise<AssistantAgentResponse> {
  return request('/assistant/navigate', {
    method: 'POST',
    body: JSON.stringify(payload),
    timeoutMs: 30000,
  })
}

// ====== 账号管理（管理员入库） ======

export async function createAccountStudent(data: {
  name: string
  phone: string
  idCard: string
  department?: string
  className?: string
}) {
  return request('/accounts/students', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function createAccountTeacher(data: {
  name: string
  phone: string
  idCard: string
  subRole?: string
  department?: string
}) {
  return request('/accounts/teachers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchAccounts(params: Record<string, any> = {}) {
  const query = buildQuery(params)
  return request(`/accounts${query ? `?${query}` : ''}`)
}

export async function fetchStudentsPool(keyword: string) {
  const query = buildQuery({ keyword })
  return request(`/teaching/students-pool${query ? `?${query}` : ''}`)
}

/**
 * 把「唯一标识」解析为学生真实主键：学号/工号、手机号、身份证号。
 * ⚠️ 姓名不作判定依据（会重名）——传姓名会返回 reason='no-identity'。
 * 选课必须以真实主键写入，否则学生端按自己身份查不到该课。
 */
export async function resolveStudent(
  identities: { studentNo?: string; phone?: string; idCard?: string } | string,
) {
  const params =
    typeof identities === 'string'
      ? { keyword: identities }
      : {
          studentNo: identities.studentNo || '',
          phone: identities.phone || '',
          idCard: identities.idCard || '',
        }
  const query = buildQuery(params)
  return request(`/teaching/students-resolve${query ? `?${query}` : ''}`)
}

export async function fetchCourseClasses(courseId: string) {
  const query = buildQuery({ courseId })
  return request(`/teaching/course-classes${query ? `?${query}` : ''}`)
}

export async function createCourseClass(courseId: string, className: string) {
  return request('/teaching/course-classes', { method: 'POST', body: JSON.stringify({ courseId, className }) })
}

export async function deleteCourseClass(courseId: string, className: string) {
  const query = buildQuery({ courseId, className })
  return request(`/teaching/course-classes${query ? `?${query}` : ''}`, { method: 'DELETE' })
}

export async function updateAccountStatus(id: string, status: 'active' | 'inactive') {
  return request(`/accounts/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export async function resetAccountPassword(id: string) {
  return request(`/accounts/${id}/password`, {
    method: 'PUT',
  })
}

export async function deleteAccount(id: string) {
  return request(`/accounts/${id}`, {
    method: 'DELETE',
  })
}

export async function assignAccount(id: string, data: { department?: string; className?: string }) {
  return request(`/accounts/${id}/assign`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function changePassword(newPassword: string, oldPassword?: string) {
  return request('/user/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword, oldPassword }),
  })
}

export async function fetchUserProfile() {
  return request('/user/profile', {
    timeoutMs: 10000,
  })
}

export async function changePhone(newPhone: string, password: string) {
  return request('/user/change-phone', {
    method: 'POST',
    body: JSON.stringify({ newPhone, password }),
  })
}

export async function uploadAvatar(avatar: string) {
  return request('/user/avatar', {
    method: 'POST',
    body: JSON.stringify({ avatar }),
    timeoutMs: 15000,
  })
}

export async function importAccounts(rows: any[]) {
  return request('/accounts/import', {
    method: 'POST',
    body: JSON.stringify({ rows }),
    timeoutMs: 30000,
  })
}

export async function exportAccounts() {
  return request('/accounts/export', {
    timeoutMs: 30000,
  })
}

export async function exportStudents() {
  return request('/accounts/export-students', {
    timeoutMs: 30000,
  })
}

export async function exportTeachers() {
  return request('/accounts/export-teachers', {
    timeoutMs: 30000,
  })
}

// ==================== AI 分层测试 ====================

/** 后端返回的分层题目（不含正确答案） */
export interface TierTestQuestionDTO {
  id: string
  questionType: 'single_choice' | 'true_false'
  questionText: string
  options: string[]
  score: number
  orderIndex: number
}

export interface TierTestSubmitResult {
  score: number
  tier: 'basic' | 'advanced' | 'excellent'
  tierLabel: string
  alreadySubmitted?: boolean
}

/** 获取某课程的分层测试题（首次调用会触发生成，耗时较长） */
export async function fetchTierTestQuestions(courseId: string): Promise<TierTestQuestionDTO[]> {
  const res = await request(`/tier-test/${encodeURIComponent(courseId)}/questions`, {
    timeoutMs: 60000,
  })
  return (res.questions ?? []) as TierTestQuestionDTO[]
}

/**
 * 提交分层测试答案
 *
 * 注意：answerText 必须传「选项原文」，后端按文本比对判分。
 */
export async function submitTierTest(
  courseId: string,
  studentId: string,
  answers: { questionId: string; answerText: string }[],
): Promise<TierTestSubmitResult> {
  return request(`/tier-test/${encodeURIComponent(courseId)}/submit`, {
    method: 'POST',
    timeoutMs: 20000,
    body: JSON.stringify({ studentId, answers }),
  }) as Promise<TierTestSubmitResult>
}
