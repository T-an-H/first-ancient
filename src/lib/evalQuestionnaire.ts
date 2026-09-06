export const EVAL_QUESTIONNAIRE_ITEMS = [
  '教学准备充分，教学内容契合课程目标',
  '授课逻辑清晰，重难点突出，易于理解',
  '教学节奏适宜，课程难度设置合理',
  '教学方法恰当，注重启发学生独立思考',
  '注重师生互动，课堂氛围良好',
  '教学态度端正，对待学生友善，答疑耐心',
  '课程学习任务布置科学合理',
  '对学习任务能够给出反馈讲解',
  '课堂管理到位，维持良好课堂秩序',
  '课程学习能够带来知识或能力提升',
]

export function createBuiltinEvalQuestionnaire(courseId: string) {
  return {
    id: `qnr-builtin-${courseId}`,
    title: '课程评教指标',
    questions: EVAL_QUESTIONNAIRE_ITEMS.map((text) => ({ type: 'rating', text })),
    builtin: true,
  }
}
