/**
 * 上传体积限制（前后端唯一口径）
 *
 * 为什么单独抽出来：这些数字互相咬合，散落在各处很容易改一处漏一处，
 * 之前的症状就是「前端说 8MB、后端收 12MB、网关只放 1MB」。
 *
 * 数据流（教师上传课程标准为例）：
 *   FileReader 读出 dataUrl，大小是文件本身的约 4/3（base64 膨胀）
 *   → JSON.stringify 整体作为请求体（还会再加一点转义开销）
 *   → nginx client_max_body_size 放行
 *   → Express json({ limit }) 解析
 *   → MySQL max_allowed_packet 写入 LONGTEXT 列
 *
 * ⚠️ 基准值的方向：以「单次请求体上限」为基准，反推文件上限。
 *
 * 反过来推是错的 —— 曾经就是先拍一个文件上限（8MB→5MB），再乘 4/3 算出
 * 请求体上限，结果算出来比网关实际上限还大，文案承诺 5MB 而实际约 760KB
 * 才传得上去。真正的硬约束在最外层（网关），必须从它出发算。
 *
 * 因此：文件上限 = f(请求体上限)，而不是请求体上限 = f(文件上限)。
 */

/**
 * 单次请求体上限 —— **整条链路上最紧的一环**，其它值都由它反推。
 *
 * 线上实测：nginx 默认 client_max_body_size = 1MiB，且未配置覆盖。
 * 精确边界 1,048,576 字节（1048570 放行 / 1049993 拒绝）。
 *
 * 运维在 nginx 侧放开了 client_max_body_size 之后，把这里同步改大，
 * 并把 server/lib/uploadLimits.js 的 Express 上限一起改 —— 两处必须一致。
 */
export const MAX_REQUEST_BODY_SIZE = 1 * 1024 * 1024;

/** 请求体里除文件外还要装的东西：courseId/name/size 等字段名、JSON 结构、转义、中文文件名 */
const BODY_RESERVE = 64 * 1024;

/**
 * 单次上传的文件总体积上限（多附件时是所有文件之和）。
 *
 * 反推：base64 编码长度 = ceil(n/3)×4 ≈ n×4/3，要求
 *   ceil(TOTAL/3)×4 + BODY_RESERVE ≤ MAX_REQUEST_BODY_SIZE
 * 解得 TOTAL ≤ (MAX_REQUEST_BODY_SIZE - BODY_RESERVE) ÷ 4 × 3
 */
export const MAX_UPLOAD_TOTAL_SIZE =
  Math.floor(((MAX_REQUEST_BODY_SIZE - BODY_RESERVE) / 4 * 3) / 1024) * 1024;

/**
 * 单文件上限。
 *
 * 与总体积上限同值：单文件也不可能超过「一次请求能装下的总量」，
 * 另立一个更小的数字只会让口径又多一处。
 */
export const MAX_UPLOAD_FILE_SIZE = MAX_UPLOAD_TOTAL_SIZE;

/** 上传请求的超时（毫秒）。大文件 + 慢网络下 3~5 秒必然超时，必须放宽 */
export const UPLOAD_TIMEOUT_MS = 180000;

/** 批量导入/导出这类「体积大但没有单个文件」的请求超时 */
export const BULK_TIMEOUT_MS = 60000;

/**
 * 人类可读的体积文案，用于报错信息与界面提示。
 *
 * 小于 1MB 时必须显示 KB —— 否则 720KB 会被四舍五入成「1MB」，
 * 又变成一句比实际能力更大的承诺。
 */
export function formatLimit(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.floor(bytes / 1024)}KB`;
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

/**
 * 校验一批待上传文件的总大小。
 *
 * 返回 null 表示通过；返回字符串表示不通过，字符串即给用户看的原因。
 *
 * 这里校验的是**文件的原始字节数**，而真正的约束是编码后的请求体大小 ——
 * 因为 MAX_UPLOAD_TOTAL_SIZE 本身就是从请求体上限反推出来的，两者等价。
 */
export function checkUploadSize(
  files: Array<{ name: string; size: number }>,
): string | null {
  let total = 0;
  for (const file of files) {
    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      return `「${file.name}」超过单文件上限 ${formatLimit(MAX_UPLOAD_FILE_SIZE)}，请压缩后再上传`;
    }
    total += file.size;
  }
  if (total > MAX_UPLOAD_TOTAL_SIZE) {
    return `本次共 ${formatLimit(total)}，超过单次上传上限 ${formatLimit(MAX_UPLOAD_TOTAL_SIZE)}，请分批上传`;
  }
  return null;
}
