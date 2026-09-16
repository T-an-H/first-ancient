/**
 * 知识图谱模块专用 API
 * 接口与 GitHub main 保持一致，独立放在这里，避免改动本地 src/api/index.ts。
 */
import { UPLOAD_TIMEOUT_MS, BULK_TIMEOUT_MS, formatLimit, MAX_UPLOAD_BODY_SIZE } from '@/lib/uploadLimits'

// 与主 API（src/api/index.ts）一致：默认使用相对路径 /api，由 nginx 代理到后端；如需独立服务地址可用 VITE_JAVA_API_BASE 覆盖
const JAVA_API_BASE = (import.meta.env.VITE_JAVA_API_BASE as string | undefined) ?? '/api'

type RequestOptions = RequestInit & {
  timeoutMs?: number
}

async function javaRequest(url: string, options: RequestOptions = {}) {
  // 默认 10s：读接口够用，写接口另有更宽的值（见下方各函数）。
  // 上传类必须显式传 UPLOAD_TIMEOUT_MS —— 5s 的旧默认值会让稍大的文件必然超时。
  const { timeoutMs = 10000, ...fetchOptions } = options
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
      // 网关（nginx）与 Express 的体积限制都会在到达业务代码前拒收，
      // 且 nginx 回的是 HTML、`response.json()` 解析失败只剩 {}。
      // 这里按状态码给可读文案，否则用户只会看到「请求失败 (413)」。
      if (response.status === 413) {
        throw new Error(`文件过大，超过服务端接收上限（${MAX_UPLOAD_BODY_SIZE}），请压缩或分批上传`)
      }
      if (response.status === 504 || response.status === 502) {
        throw new Error(`服务端响应超时或不可用（${response.status}），请稍后重试；若持续失败请压缩文件后重试`)
      }
      throw new Error(data.msg || `请求失败 (${response.status})`)
    }
    return data.data
  } catch (error: any) {
    // fetch 在超时/断网时抛 AbortError / TypeError，原始文案是英文且没有指向性
    if (error?.name === 'AbortError') {
      throw new Error(`请求超时（超过 ${Math.round(timeoutMs / 1000)} 秒），请检查网络或压缩文件后重试`)
    }
    throw error
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
  return javaRequest('/projects/bulk', { method: 'POST', body: JSON.stringify(projects), timeoutMs: BULK_TIMEOUT_MS })
}

/** PUT /projects/{id} 更新项目 */
export async function javaUpdateProject(id: string, data: any) {
  return javaRequest(`/projects/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) })
}

/** DELETE /projects/{id} 删除项目（级联删除文件与进度） */
export async function javaDeleteProject(id: string) {
  return javaRequest(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** PATCH /projects/{id}/lock 锁定/解锁任务（锁定后不可再修改） */
export async function javaSetProjectLocked(id: string, locked: boolean) {
  return javaRequest(`/projects/${encodeURIComponent(id)}/lock`, {
    method: 'PATCH',
    body: JSON.stringify({ locked }),
  })
}

/** PATCH /projects/{id}/close-at 设置任务关闭时间（空字符串=清除，不自动关闭） */
export async function javaSetProjectCloseAt(id: string, closeAt: string) {
  return javaRequest(`/projects/${encodeURIComponent(id)}/close-at`, {
    method: 'PATCH',
    body: JSON.stringify({ closeAt }),
  })
}

/** GET /projects/{projectId}/files?fileType= 项目文件列表 */
export async function javaListProjectFiles(projectId: string, fileType?: string) {
  const q = fileType ? `?fileType=${encodeURIComponent(fileType)}` : ''
  return javaRequest(`/projects/${encodeURIComponent(projectId)}/files${q}`)
}

/** POST /projects/files 新增项目文件（携带 base64，大文件需放宽超时） */
export async function javaAddProjectFile(file: any) {
  return javaRequest('/projects/files', { method: 'POST', body: JSON.stringify(file), timeoutMs: UPLOAD_TIMEOUT_MS })
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
  return javaRequest('/course-standards', { method: 'POST', body: JSON.stringify(file), timeoutMs: UPLOAD_TIMEOUT_MS })
}

/** DELETE /course-standards/{id} 删除课程标准文件 */
export async function javaDeleteCourseStandard(id: string) {
  return javaRequest(`/course-standards/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** GET /projects/{projectId}/progress 项目全部学生进度 */
export async function javaListProjectProgress(projectId: string) {
  return javaRequest(`/projects/${encodeURIComponent(projectId)}/progress`)
}

/** POST /projects/{projectId}/progress 学生提交/更新进度（attachments 含 base64，走上传超时） */
export async function javaUpsertProjectProgress(projectId: string, data: any) {
  return javaRequest(`/projects/${encodeURIComponent(projectId)}/progress`, {
    method: 'POST',
    body: JSON.stringify(data),
    timeoutMs: UPLOAD_TIMEOUT_MS,
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
    timeoutMs: BULK_TIMEOUT_MS,
  })
}
