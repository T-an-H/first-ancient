/**
 * JWT 密钥统一来源
 *
 * 生产环境必须通过环境变量 JWT_SECRET 提供强随机串；
 * 缺省值仅用于本地开发，启动时会打印警告。
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret';

if (!process.env.JWT_SECRET) {
  console.warn('[jwt-secret] 未设置 JWT_SECRET 环境变量，使用开发缺省值，生产环境必须配置！');
}

export const JWT_EXPIRES = '7d';
export default JWT_SECRET;
