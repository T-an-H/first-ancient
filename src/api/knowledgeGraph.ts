/**
 * 知识图谱模块专用 API
 * 接口与 GitHub main 保持一致，独立放在这里，避免改动本地 src/api/index.ts。
 */

const API_PROTOCOL = window.location.protocol === 'https:' ? 'https:' : 'http:'
const API_HOST = window.location.hostname || '127.0.0.1'
// The course platform's active backend is Express on port 3002. Keep the
// Java override for deployments that still expose the standalone service.
const API_PORT = (import.meta.env.VITE_API_PORT as string | undefined) ?? '3002'
const JAVA_API_BASE = (import.meta.env.VITE_JAVA_API_BASE as string | undefined) ?? `${API_PROTOCOL}//${API_HOST}:${API_PORT}/api`

type RequestOptions = RequestInit & {
  timeoutMs?: number
}

async function javaRequest(url: string, options: RequestOptions = {}) {
  const { timeoutMs = 5000, ...fetchOptions } = options
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  let token: string | null = null
  try {
    const raw = sessionStorage.getItem('activeSession')
    if (raw) token = (JSON.parse(raw)?.token ?? null) as string | null
  } catch { /* ignore */ }
  if (token) headers.Authorization = `Bearer ${token}`

  const config: RequestInit = {
    ...fetchOptions,
    headers: { ...headers, ...(fetchOptions.headers as Record<string, string> | undefined) },
    signal: controller.signal,
  }

  try {
    const response = await fetch(`${JAVA_API_BASE}${url}`, config)
    const data = await response.json().catch(() => ({}))

    if (!response.ok || data.code !== 200) {
      throw new Error(data.msg || `请求失败 (${response.status})`)
    }
    return data.data
  } finally {
    window.clearTimeout(timeoutId)
  }
}

/** GET /projects?courseId= 项目列表 */
export async function javaListProjects(courseId: string) {
  return javaRequest(`/projects?courseId=${encodeURIComponent(courseId)}`)
}

/** GET /projects/{id} 项目详情 */
export async function javaGetProject(id: string) {
  return javaRequest(`/projects/${encodeURIComponent(id)}`)
}

/** POST /projects 新增项目 */
export async function javaAddProject(project: any) {
  return javaRequest('/projects', { method: 'POST', body: JSON.stringify(project) })
}

/** POST /projects/bulk 批量新增项目（Excel 解析结果，body 为裸数组） */
export async function javaAddProjectsBulk(projects: any[]) {
  return javaRequest('/projects/bulk', { method: 'POST', body: JSON.stringify(projects) })
}

/** PUT /projects/{id} 更新项目 */
export async function javaUpdateProject(id: string, data: any) {
  return javaRequest(`/projects/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) })
}

/** DELETE /projects/{id} 删除项目（级联删除文件与进度） */
export async function javaDeleteProject(id: string) {
  return javaRequest(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** GET /projects/{projectId}/files?fileType= 项目文件列表 */
export async function javaListProjectFiles(projectId: string, fileType?: string) {
  const q = fileType ? `?fileType=${encodeURIComponent(fileType)}` : ''
  return javaRequest(`/projects/${encodeURIComponent(projectId)}/files${q}`)
}

/** POST /projects/files 新增项目文件 */
export async function javaAddProjectFile(file: any) {
  return javaRequest('/projects/files', { method: 'POST', body: JSON.stringify(file) })
}

/** DELETE /projects/files/{id} 删除项目文件 */
export async function javaDeleteProjectFile(id: string) {
  return javaRequest(`/projects/files/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** GET /course-standards?courseId= 课程标准文件列表（教师上传，学生端同步） */
export async function javaListCourseStandards(courseId: string) {
  return javaRequest(`/course-standards?courseId=${encodeURIComponent(courseId)}`)
}

/** POST /course-standards 上传课程标准文件（dataUrl 为文件 base64） */
export async function javaAddCourseStandard(file: { courseId: string; name: string; size: number; dataUrl: string; uploader?: string }) {
  return javaRequest('/course-standards', { method: 'POST', body: JSON.stringify(file) })
}

/** DELETE /course-standards/{id} 删除课程标准文件 */
export async function javaDeleteCourseStandard(id: string) {
  return javaRequest(`/course-standards/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** GET /projects/{projectId}/progress 项目全部学生进度 */
export async function javaListProjectProgress(projectId: string) {
  return javaRequest(`/projects/${encodeURIComponent(projectId)}/progress`)
}

/** POST /projects/{projectId}/progress 学生提交/更新进度（幂等） */
export async function javaUpsertProjectProgress(projectId: string, data: any) {
  return javaRequest(`/projects/${encodeURIComponent(projectId)}/progress`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** PUT /projects/progress/{id} 教师批改（工单/测试评分） */
export async function javaGradeProjectProgress(id: string, data: { score: number; comment?: string }) {
  return javaRequest(`/projects/progress/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/** GET /questionnaire?courseId= 课程评教问卷（无则 null） */
export async function javaGetQuestionnaire(courseId: string) {
  return javaRequest(`/questionnaire?courseId=${encodeURIComponent(courseId)}`)
}

/** POST /questionnaire 创建/更新评教问卷 */
export async function javaSaveQuestionnaire(data: any) {
  return javaRequest('/questionnaire', { method: 'POST', body: JSON.stringify(data) })
}

/** DELETE /questionnaire/{id} 删除评教问卷 */
export async function javaDeleteQuestionnaire(id: string) {
  return javaRequest(`/questionnaire/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** GET /questionnaire/{id}/responses 问卷全部填写记录 */
export async function javaListEvalResponses(questionnaireId: string) {
  return javaRequest(`/questionnaire/${encodeURIComponent(questionnaireId)}/responses`)
}

/** POST /questionnaire/{id}/responses 学生提交/更新评教 */
export async function javaSubmitEvalResponse(questionnaireId: string, data: any) {
  return javaRequest(`/questionnaire/${encodeURIComponent(questionnaireId)}/responses`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
