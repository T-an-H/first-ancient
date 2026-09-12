/**
 * 数据库连接配置
 *
 * 用 mysql2 连接池连接 MySQL
 * 如果以后要改数据库密码或连接信息，只需改这里
 */
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',      // 数据库地址
  port: 3306,             // MySQL 端口
  user: 'root',           // 数据库用户名
  password: process.env.DB_PASSWORD || '147258369Aa.', // 数据库密码 ← 修改密码时改这里
  database: 'course_platform', // 数据库名
  waitForConnections: true,
  connectionLimit: 10,    // 最大连接数
  queueLimit: 0,
});

export default pool;
