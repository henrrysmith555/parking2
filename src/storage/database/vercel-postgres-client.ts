import { sql } from '@vercel/postgres';

// Vercel Postgres 客户端
// 使用方法：
// import { query } from '@/storage/database/vercel-postgres-client';
// const result = await query('SELECT * FROM users WHERE username = $1', ['admin']);

export async function query(text: string, params?: any[]) {
  try {
    if (params && params.length > 0) {
      const result = await sql.query(text, params);
      return result;
    } else {
      const result = await sql.query(text);
      return result;
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// 辅助函数：获取单行
export async function queryOne(text: string, params?: any[]) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// 辅助函数：获取所有行
export async function queryAll(text: string, params?: any[]) {
  const result = await query(text, params);
  return result.rows;
}

export { sql };
