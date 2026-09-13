/**
 * 成绩权重默认值（与前端 src/types/index.ts 的 getDefaultGradeConfig 保持一致）
 *
 * 服务端与前端共用同一套默认，避免「前端显示 40/0/60、后端落库另一套」的分裂。
 */
export function getDefaultGradeConfig(courseId = '') {
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
