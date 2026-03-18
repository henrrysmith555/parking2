# 🔍 管理员登录问题诊断指南

## 问题：管理员登录不了

### 请按以下步骤检查：

---

## ✅ 第 1 步：确认数据库表已初始化

在 Vercel Dashboard 中：

1. 进入你的项目
2. 点击 **Storage** → 你的 Postgres 数据库
3. 点击 **Query** 标签
4. 运行这个查询：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

**应该看到这些表：**
- `users`
- `parking_lots`
- `parking_spots`
- `reservations`
- `vehicle_records`
- `payment_records`
- `blacklist`
- `operation_logs`

**如果没有这些表**：
- 复制 `vercel-postgres-init.sql` 的全部内容
- 粘贴到 Query 输入框
- 点击 **Run Query**

---

## ✅ 第 2 步：确认管理员账户存在

在 Vercel Postgres Query 中运行：

```sql
SELECT id, username, name, role, is_active 
FROM users 
WHERE username = 'admin';
```

**应该返回一条记录：**
- username: `admin`
- password: `admin123`
- role: `admin`
- is_active: `true`

**如果没有记录**，运行这个：

```sql
INSERT INTO users (id, username, password, name, role, balance, is_active)
VALUES ('admin-id-001', 'admin', 'admin123', '系统管理员', 'admin', 0, true)
ON CONFLICT (username) DO NOTHING;
```

---

## ✅ 第 3 步：测试初始化 API

在浏览器访问：

```
https://你的项目名.vercel.app/api/init
```

**应该看到：**
```json
{
  "success": true,
  "message": "系统初始化完成",
  "results": [
    "管理员账户已存在",
    "数据库连接正常",
    "操作日志表正常"
  ]
}
```

---

## ✅ 第 4 步：测试登录 API

在浏览器开发者工具（F12）→ **Console** 中运行：

```javascript
fetch('https://你的项目名.vercel.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin123'
  })
})
.then(res => res.json())
.then(data => console.log('登录结果:', data))
.catch(err => console.error('错误:', err));
```

**应该返回：**
```json
{
  "success": true,
  "user": { ... },
  "message": "登录成功"
}
```

---

## ✅ 第 5 步：检查 Vercel Postgres 是否连接

确认 Vercel 项目中 **Storage** 下有你的 Postgres 数据库，状态是 **Connected**。

---

## 🔧 常见问题

### 问题 1：提示 "用户名或密码错误"

**原因**：数据库中没有 admin 用户，或密码不对

**解决**：
在 Vercel Postgres Query 中运行：
```sql
INSERT INTO users (id, username, password, name, role, balance, is_active)
VALUES ('admin-id-001', 'admin', 'admin123', '系统管理员', 'admin', 0, true)
ON CONFLICT (username) 
DO UPDATE SET password = 'admin123', is_active = true;
```

### 问题 2：提示 "服务器错误"

**原因**：Vercel Postgres 没有正确连接

**解决**：
1. 确认 Vercel 项目 → **Storage** 中有 Postgres 数据库
2. 如果没有，添加一个：**Storage** → **Create Database** → **Postgres**

### 问题 3：提示 "用户不存在"

**原因**：数据库表还没创建

**解决**：
在 Vercel Postgres Query 中执行 `vercel-postgres-init.sql` 的全部内容

---

## 📝 快速修复脚本

如果以上都不行，在 Vercel Postgres Query 中**一次性运行这个**：

```sql
-- 1. 创建用户表（如果不存在）
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user',
  balance NUMERIC(10,2) DEFAULT 0,
  plate_number VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 插入或更新管理员
INSERT INTO users (id, username, password, name, role, balance, is_active)
VALUES ('admin-id-001', 'admin', 'admin123', '系统管理员', 'admin', 0, true)
ON CONFLICT (username) 
DO UPDATE SET password = 'admin123', is_active = true;

-- 3. 验证
SELECT '✅ 管理员账户已准备好了！' AS message;
SELECT '用户名: admin' AS username;
SELECT '密码: admin123' AS password;
```

---

## 🎯 还是不行？

告诉我：
1. 访问 `/api/init` 返回什么？
2. 在 Vercel Postgres 中查询 `SELECT * FROM users` 返回什么？
3. 浏览器控制台（F12）有什么错误？
