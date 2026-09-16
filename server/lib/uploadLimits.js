/**
 * 上传体积限制（后端口径）
 *
 * 与前端 `src/lib/uploadLimits.ts` 的 MAX_UPLOAD_BODY_SIZE 必须保持一致：
 *   MAX_UPLOAD_TOTAL_SIZE(12MB) × 4/3(base64) × 1.2(余量) ≈ 19.2MB → 取 20MB
 *
 * 改这里就要同步改前端那个文件，否则会出现「前端以为能传、后端拒收」。
 */
export const MAX_UPLOAD_BODY_SIZE = '20mb';
