/**
 * 上传体积限制（后端口径）
 *
 * 与前端 `src/lib/uploadLimits.ts` 的 MAX_REQUEST_BODY_SIZE 必须保持一致，
 * 改一处就要改另一处，否则会出现「前端以为能传、后端拒收」。
 *
 * ⚠️ 这两层的关系容易被搞反：
 *
 *   nginx client_max_body_size   ← 整条链路最紧的一环，真正的瓶颈
 *     └─ Express json({ limit }) ← 必须在 nginx 之上，否则会变成隐藏的瓶颈
 *          └─ MAX_REQUEST_BODY_SIZE（前端设计基准）
 *               └─ 反推出文件上限 720KB
 *
 * 线上实测 nginx 未配置 client_max_body_size，用的是默认 1MiB
 * （精确边界 1,048,576 字节）。所以这里**不能**小于 1MiB ——
 * 一旦 Express 比 nginx 更紧，就会出现「请求穿过了网关、却在这里被拒」，
 * 而报错信息还指向「文件太大」，排查时会往错误的方向找。
 *
 * 这里取 2MB：比 nginx 的 1MiB 高约一倍，留出余量，保证当前 nginx 才是
 * 那个说话算数的约束。等运维把 nginx 调大（如 20m）后，这里和前端基准
 * 一起上调即可 —— 那时 Express 自然还是在其之上。
 */
export const MAX_UPLOAD_BODY_SIZE = '2mb';
