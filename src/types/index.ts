/** 学院/院系 */
export interface Department {
  id: string;
  name: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  courseCount: number;
  departmentId: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  /** 所属学院（学院即课程分类时使用） */
  departmentId?: string;
  cover: string;
  /** 课程开始日期 */
  startDate?: string;
  /** 课程结束日期 */
  endDate?: string;
  credits: number;
  duration: number;
  status: 'active' | 'inactive' | 'draft';
  /** 学期，如 2026秋季学期 */
  semester?: string;
  createdAt: string;
  teacher: string;
  /** 企业导师名称 */
  mentor?: string;
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  courseIds: string[];
  departmentId?: string;
}

/** 企业导师 */
export interface Mentor {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  courseIds: string[];
}

/** 学院领导 */
export interface Leader {
  id: string;
  name: string;
  phone: string;
  email: string;
  /** 管辖学院/分类ID列表 */
  categoryIds: string[];
  /** 同时是授课导师（可选） */
  asTeacher?: boolean;
  /** 同时是企业导师（可选） */
  asMentor?: boolean;
  /** 作为教师授课的专属课程ID（教师端部分显示，与普通教师一致） */
  teacherCourseIds?: string[];
  /** 作为企业导师负责的课程ID（导师端部分显示，与普通导师一致） */
  mentorCourseIds?: string[];
}

export interface Grade {
  id: string;
  studentId: string;
  courseId: string;
  score: number;
  semester?: string;
  comment: string;
  gradedAt: string;
  /** 综合总成绩（可能不同于 score） */
  totalScore?: number;
}

/** 学习层级 */
export type LearningTier = 'basic' | 'advanced' | 'excellent';

export const TierLabels: Record<LearningTier, string> = {
  basic: '基础层',
  advanced: '进阶层',
  excellent: '卓越层',
};

export interface Student {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  joinDate: string;
  status: 'active' | 'inactive';
  /** 学号 */
  studentId?: string;
  /** 班级 */
  className?: string;
  /** 高考成绩或入学成绩（用于无上学期成绩时判定层级） */
  enrollmentScore?: number;
}

/** 学生 Excel 导入行 */
export interface StudentImportRow {
  name: string;
  studentId?: string;
  className?: string;
  phone?: string;
  email?: string;
  enrollmentScore?: number;
  joinDate?: string;
  status?: string;
}

export interface Schedule {
  id: string;
  courseId: string;
  title: string;
  /** 学期，如 2026秋季学期 */
  semester?: string;
  /** 周几（如 周一），未设置时由 startDate 推导 */
  day?: string;
  /** 上课班级 */
  className?: string;
  startDate: string;
  endDate: string;
  timeSlot: string;
  room: string;
  teacher: string;
  /** 企业导师 */
  mentor?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  scheduleId: string;
  enrollDate: string;
  progress: number;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
}

export interface DashboardStats {
  totalCourses: number;
  totalStudents: number;
  activeCourses: number;
  recentEnrollments: number;
}

export interface GradeWeightConfig {
  courseId: string;
  regularWeight: number;
  midtermWeight: number;
  finalWeight: number;
  /** 素质评价在总成绩中的占比（0-100，默认 0） */
  qualityEvalWeight: number;
  /** 素质评价加成上限（兼容远端前端配置，默认 10） */
  qualityEvalMaxBonus?: number;
  selfEvalWeight: number;
  peerReviewWeight: number;
  interGroupEvalWeight: number;
  teacherScoreWeight: number;
  mentorScoreWeight: number;
  midtermExamWeight: number;
  midtermProjectWeight: number;
  finalExamWeight: number;
  finalProjectWeight: number;
}

export function getDefaultGradeConfig(courseId: string): GradeWeightConfig {
  return {
    courseId,
    regularWeight: 40,
    midtermWeight: 0,
    finalWeight: 60,
    qualityEvalWeight: 0,
    qualityEvalMaxBonus: 10,
    selfEvalWeight: 10,
    peerReviewWeight: 20,
    interGroupEvalWeight: 10,
    teacherScoreWeight: 30,
    mentorScoreWeight: 30,
    midtermExamWeight: 50,
    midtermProjectWeight: 50,
    finalExamWeight: 50,
    finalProjectWeight: 50,
  };
}

export interface DetailedGrade {
  id: string;
  studentId: string;
  courseId: string;
  selfEvalScore?: number;
  peerReviewScore?: number;
  interGroupScore?: number;
  teacherScore?: number;
  mentorScore?: number;
  midtermExamScore?: number;
  midtermProjectScore?: number;
  finalExamScore?: number;
  finalProjectScore?: number;
  gradedAt: string;
}

/** 考试/项目成绩 */
export interface ExamScore {
  id: string;
  courseId: string;
  studentId: string;
  /** 考试/项目名称，如"期中考试"、"项目一" */
  examName: string;
  score: number;
  /** 满分 */
  fullScore: number;
  /** 权重（百分比，如 50 表示 50%） */
  weight: number;
  type: 'midterm_exam' | 'midterm_project' | 'final_exam' | 'final_project' | 'quiz' | 'assignment';
  status: 'draft' | 'submitted';
  createdAt: string;
  gradedAt: string;
}

export interface CloudFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  courseId?: string;
  /** 可见课程列表（兼容新前端多课程可见范围） */
  courseIds?: string[];
  /** 文件可见范围 */
  visibilityScope?: 'private' | 'students';
  /** 可见班级列表（为空则仅自己可见） */
  visibleToClassNames?: string[];
}

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  dueDate?: string;
  createdBy: string;
}

export interface OnlineDoc {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  lastEditedAt: string;
  lastEditedBy: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  attachments?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    dataUrl: string;
  }[];
}

export interface Homework {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate: string;
  createdAt: string;
  createdBy: string;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  courseId: string;
  studentId: string;
  submittedAt: string;
  fileName: string;
  fileDataUrl: string;
  fileSize: number;
  fileType: string;
}

// ========== 评价系统 ==========

/** 评价类型 */
export type EvalType = 'self' | 'intra_group' | 'inter_group' | 'teacher' | 'mentor';

export const EvalTypeLabels: Record<EvalType, string> = {
  self: '个人自评',
  intra_group: '小组内互评',
  inter_group: '小组间互评',
  teacher: '教师评价',
  mentor: '企业导师评价',
};

export const EvalTypeColors: Record<EvalType, string> = {
  self: 'text-blue-600 bg-blue-50 border-blue-200',
  intra_group: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  inter_group: 'text-purple-600 bg-purple-50 border-purple-200',
  teacher: 'text-brand-700 bg-brand-50 border-brand-200',
  mentor: 'text-rose-600 bg-rose-50 border-rose-200',
};

/** 评价方案模板 */
export type EvalTemplate = 'all' | 'standard' | 'simple' | 'project';

export const EvalTemplateLabels: Record<EvalTemplate, string> = {
  all: '全评价',
  standard: '标准评价',
  simple: '简易评价',
  project: '项目制评价',
};

export const EvalTemplateDescs: Record<EvalTemplate, string> = {
  all: '5种评价全部启用：个人自评+小组内互评+小组间互评+教师评价+企业导师评价',
  standard: '个人自评+教师评价+小组间互评',
  simple: '教师评价+个人自评',
  project: '个人自评+小组内互评+小组间互评+教师评价+企业导师评价',
};

/** 模板→评价类型映射 */
export const TEMPLATE_EVAL_TYPES: Record<EvalTemplate, EvalType[]> = {
  all: ['self', 'intra_group', 'inter_group', 'teacher', 'mentor'],
  standard: ['self', 'teacher', 'inter_group'],
  simple: ['self', 'teacher'],
  project: ['self', 'intra_group', 'teacher', 'mentor', 'inter_group'],
};

/** 评价频率 */
export type EvalFrequency = 'biweekly' | 'per_unit' | 'project_milestone' | 'custom';

export const EvalFrequencyLabels: Record<EvalFrequency, string> = {
  biweekly: '每2周一次',
  per_unit: '每个知识单元',
  project_milestone: '仅项目节点',
  custom: '自定义次数',
};

export const EvalFrequencyDescs: Record<EvalFrequency, string> = {
  biweekly: '约每2周进行一次评价',
  per_unit: '每个知识单元学习完成后进行评价',
  project_milestone: '仅在项目关键节点进行评价',
  custom: '手动设置评价总次数',
};

/** 逾期处理规则 */
export type OverdueRule = 'average' | 'none' | 'zero' | 'full';

export const OverdueRuleLabels: Record<OverdueRule, string> = {
  average: '默认60分',
  none: '不处理',
  zero: '记0分',
  full: '记满分',
};

/** 课程评价配置 */
export interface EvaluationConfig {
  courseId: string;
  template: EvalTemplate;
  frequency: EvalFrequency;
  /** 自定义评价次数（仅 custom 时有效） */
  customSessions?: number;
  /** 是否有企业导师参与 */
  hasMentor: boolean;
  /** 逾期处理规则 */
  overdueRule: OverdueRule;
}

/** 评价记录 */
export interface EvalScoreItem {
  label: string;
  score: number;
  /** 单项满分，旧数据可能没有 */
  max?: number;
}

export interface Evaluation {
  id: string;
  courseId: string;
  studentId: string;
  sessionNumber: number;   // 第N次评价
  type: EvalType;
  score: number;
  items?: EvalScoreItem[];
  evaluatorId: string;
  evaluatorName: string;
  comment?: string;
  createdAt: string;
}

/** 评价待办提醒 */
export interface EvalReminder {
  id: string;
  courseId: string;
  courseTitle: string;
  studentId: string;
  sessionNumber: number;
  deadline: string;
  status: 'pending' | 'completed' | 'overdue';
}

/** 学生分组 */
export interface StudentGroup {
  id: string;
  courseId: string;
  name: string;
  memberIds: string[];
}

/** 异常预警记录 */
export interface EvalAnomaly {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  sessionNumber: number;
  type: EvalType;
  selfScore: number;
  avgScore: number;
  diff: number;
  warning: string;
}

/** 素质评价提交（学生上传图片/文档，教师打分后按课程权重计入总成绩） */
export interface QualityEvalFile {
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string;
}

/** 单次素质评价提交记录（学生可多次提交，教师可对任意一次评分） */
export interface QualityEvalSubmission {
  id: string;
  description?: string;
  files: QualityEvalFile[];
  /** 学生提交时间 */
  submittedAt: string;
  /** 教师打分（0-100），为空表示未批改 */
  score?: number;
  /** 教师评语 */
  teacherComment?: string;
  /** 批改时间 */
  gradedAt?: string;
}

export interface QualityEvaluation {
  id: string;
  courseId: string;
  studentId: string;
  /** 多次提交记录，按提交时间先后排列 */
  submissions: QualityEvalSubmission[];
}

// ========== AI 分层 ==========

/** AI 分层测试题目 */
export interface AITierQuestion {
  id: string;
  /** 题目内容 */
  question: string;
  /** 题目类型 */
  type: 'single_choice' | 'true_false';
  /** 选项（单选题用） */
  options?: string[];
  /** 正确答案索引（单选题）或布尔值（判断题） */
  answer: number | boolean;
  /** 分值 */
  score: number;
}

/** 学生分层记录 */
export interface StudentTierRecord {
  courseId: string;
  studentId: string;
  tier: LearningTier;
  score: number;
  /** 分层时间 */
  createdAt: string;
}
