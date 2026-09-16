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
 * 因此：文件上限 × 4/3 < 请求体上限 < 网关/MySQL 上限。
 * 取「文件上限」为基准值，请求体上限由它换算，保证三者不会互相打架。
 */

/** 单文件上限：5MB（比原来的 8MB 保守，8MB 折成请求体已逼近 12MB 的天花板） */
export const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024;

/** 一次请求携带的文件总体积上限（多附件场景，如学生一次交多个证明材料） */
export const MAX_UPLOAD_TOTAL_SIZE = 12 * 1024 * 1024;

/** base64 相对原始二进制的膨胀系数，向上取整留转义余量 */
export const BASE64_OVERHEAD = 4 / 3;

/** 请求体上限 = 总体积折 base64 后再留 20% 余量（给 JSON 结构、转义、字段名） */
export const MAX_UPLOAD_BODY_SIZE = Math.ceil((MAX_UPLOAD_TOTAL_SIZE * BASE64_OVERHEAD) * 1.2);

/** 上传请求的超时（毫秒）。大文件 + 慢网络下 3~5 秒必然超时，必须放宽 */
export const UPLOAD_TIMEOUT_MS = 180000;

/** 批量导入/导出这类「体积大但没有单个文件」的请求超时 */
export const BULK_TIMEOUT_MS = 60000;

/** 人类可读的体积文案，用于报错信息与界面提示 */
export function formatLimit(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

/**
 * 校验一批待上传文件的总大小。
 *
 * 返回 null 表示通过；返回字符串表示不通过，字符串即给用户看的原因。
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
