# 从 Supabase 迁移到 Vercel Postgres 指南

## ✅ 已完成

- ✅ 安装了 `@vercel/postgres` 依赖
- ✅ 创建了 `vercel-postgres-client.ts` 数据库客户端
- ✅ 创建了 `vercel-postgres-init.sql` 数据库初始化脚本

---

## 📋 迁移方案选择

### 方案 A：我帮你完全迁移（推荐）

我帮你把所有 API 都改成 Vercel Postgres，你只需要部署就行。

**优点**：
- 完全自动化，你不需要改代码
- 一步到位

**缺点**：
- 需要一点时间修改所有 API

---

### 方案 B：核心 API 迁移（快速）

我只改几个核心的 API（登录、用户管理等），其他的你可以后续再改。

**优点**：
- 快速，能马上用

**缺点**：
- 部分功能可能还用不了

---

### 方案 C：给你完整的迁移指南，你自己改

我给你详细的步骤和代码示例，你自己修改。

**优点**：
- 你可以控制进度
- 学习如何使用 Vercel Postgres

**缺点**：
- 需要你自己动手

---

## 🚀 快速开始（先用方案 A 或 B）

告诉我你想用哪个方案，我马上开始改！

---

## 附：Vercel Postgres 使用示例

### 示例 1：查询数据

```typescript
// Supabase 版本（旧）
const { data, error } = await client
  .from('users')
  .select('*')
  .eq('username', username)
  .single();

// Vercel Postgres 版本（新）
import { queryOne } from '@/storage/database/vercel-postgres-client';
const user = await queryOne(
  'SELECT * FROM users WHERE username = $1',
  [username]
);
```

### 示例 2：插入数据

```typescript
// Supabase 版本
const { data, error } = await client
  .from('users')
  .insert({
    id: userId,
    username,
    password,
    name,
    role: 'user',
  })
  .select()
  .single();

// Vercel Postgres 版本
import { queryOne } from '@/storage/database/vercel-postgres-client';
const user = await queryOne(
  `INSERT INTO users (id, username, password, name, role) 
   VALUES ($1, $2, $3, $4, $5) 
   RETURNING *`,
  [userId, username, password, name, 'user']
);
```

### 示例 3：更新数据

```typescript
// Supabase 版本
const { data, error } = await client
  .from('users')
  .update({ balance: newBalance })
  .eq('id', userId)
  .select()
  .single();

// Vercel Postgres 版本
import { queryOne } from '@/storage/database/vercel-postgres-client';
const user = await queryOne(
  'UPDATE users SET balance = $1 WHERE id = $2 RETURNING *',
  [newBalance, userId]
);
```

### 示例 4：删除数据

```typescript
// Supabase 版本
const { error } = await client
  .from('blacklist')
  .delete()
  .eq('id', id);

// Vercel Postgres 版本
import { query } from '@/storage/database/vercel-postgres-client';
await query('DELETE FROM blacklist WHERE id = $1', [id]);
```

---

## 📝 主要差异

| Supabase | Vercel Postgres |
|----------|-----------------|
| `.from('table')` | `FROM table` (SQL) |
| `.select('*')` | `SELECT *` |
| `.eq('column', value)` | `WHERE column = $1` |
| `.order('column', { ascending: false })` | `ORDER BY column DESC` |
| `.limit(n)` | `LIMIT n` |
| `.single()` | 手动取 `.rows[0]` |

---

## 🎯 告诉我你的选择！

你想用哪个方案？
- A：我帮你完全迁移
- B：只改核心 API
- C：给你指南自己改

选一个，我马上开始！
