import type { Student } from '@/types'

type StoredStudentSession = {
  id: string
  studentId: string
  name: string
  className: string
  account: string
}

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim()
}

export function getStoredStudentSession(): StoredStudentSession {
  try {
    let user: any = null
    // 优先从每标签独立的 sessionStorage 读取（多窗口隔离）
    const rawSession = sessionStorage.getItem('activeSession')
    if (rawSession) {
      user = JSON.parse(rawSession)?.userInfo ?? null
    }
    // 兼容首登临时中转（localStorage.userInfo）
    if (!user) {
      const raw = localStorage.getItem('userInfo')
      if (raw) user = JSON.parse(raw) ?? {}
    }
    if (!user) {
      return { id: '', studentId: '', name: '', className: '', account: '' }
    }

    const account = readText(user.account)
    // 学号/工号才是总库 students.id 与选课表里的学生标识；
    // users.account 往往是手机号（登录用），不能当学生主键，否则查不到课程。
    // 取值优先级：userNo(学号) > studentId/student_id > id > account
    const userNo = readText(user.userNo ?? user.user_no)
    const studentNo = readText(user.studentId ?? user.student_id)
    const primaryId = userNo || studentNo || readText(user.id) || account
    return {
      id: primaryId,
      studentId: studentNo || userNo || primaryId,
      name: readText(user.name),
      className: readText(user.className ?? user.class_name),
      account,
    }
  } catch {
    return { id: '', studentId: '', name: '', className: '', account: '' }
  }
}

export function matchStudentFromSession(
  students: Student[],
  currentUser: string | null = null,
  session: StoredStudentSession = getStoredStudentSession(),
): Student | null {
  if (students.length === 0) return null

  return (
    students.find((student) => session.id && String(student.id) === session.id) ||
    students.find((student) => session.studentId && String(student.studentId ?? '') === session.studentId) ||
    students.find((student) => session.name && student.name === session.name) ||
    students.find((student) => currentUser && student.name === currentUser) ||
    null
  )
}

export function getStudentLookupKeyword(
  currentUser: string | null = null,
  session: StoredStudentSession = getStoredStudentSession(),
): string {
  return session.studentId || session.name || currentUser || session.account || ''
}
