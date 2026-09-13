/**
 * 数据库连接配置
 *
 * 用 mysql2 连接池连接 MySQL
 * 如果以后要改数据库密码或连接信息，只需改这里
 */
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',      // 数据库地址
  port: Number(process.env.DB_PORT) || 3306,     // MySQL 端口
  user: process.env.DB_USER || 'root',           // 数据库用户名
  password: process.env.DB_PASSWORD || '147258369Aa.', // 数据库密码 ← 修改密码时改这里
  database: process.env.DB_NAME || 'course_platform', // 数据库名（本地测试可用 DB_NAME 指向临时库）
  waitForConnections: true,
  connectionLimit: 10,    // 最大连接数
  queueLimit: 0,
});

export default pool;
