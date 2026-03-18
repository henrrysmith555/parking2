# 🔴 登录失败：500 错误修复指南

## 问题：提示"登录失败，请稍后重试"

从截图看到登录页面提示**"登录失败，请稍后重试"**，这说明后端返回了 500 错误。

---

## 🔍 原因分析（最可能的原因）

### 原因 1：Vercel Postgres 还没有添加！⚠️ 最常见

**检查方法**：
1. 进入 Vercel 项目
2. 看左侧菜单有没有 **Storage** 选项
3. 如果没有 **Storage**，或者里面没有 Postgres 数据库 → **这就是问题！**

**解决方法**：
1. Vercel 项目 → **Storage** 标签
2. 点击 **Create Database**
3. 选择 **Postgres**
4. 点击 **Continue**
5. 等待创建完成（约 10 秒）

---

### 原因 2：数据库表还没有创建

**检查方法**：
在 Vercel Postgres → Query 中运行：
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

**如果没有 `users` 表** → 需要初始化数据库

**解决方法**：
1. 复制 `vercel-postgres-init.sql` 的**全部内容**
2. 粘贴到 Vercel Postgres → Query 输入框
3. 点击 **Run Query**

---

### 原因 3：管理员账户不存在

**检查方法**：
在 Vercel Postgres → Query 中运行：
```sql
SELECT * FROM users WHERE username = 'admin';
```

**如果没有记录** → 需要插入管理员

**解决方法**：
在 Vercel Postgres → Query 中运行：
```sql
INSERT INTO users (id, username, password, name, role, balance, is_active)
VALUES ('admin-id-001', 'admin', 'admin123', '系统管理员', 'admin', 0, true)
ON CONFLICT (username) DO UPDATE SET password = 'admin123', is_active = true;
```

---

## 🛠️ 快速修复（按顺序执行）

### 第 1 步：确认 Vercel Postgres 已添加

✅ 检查 Vercel 项目 → **Storage** → 有没有 Postgres 数据库？
- 如果没有 → 添加一个！

### 第 2 步：初始化数据库表

在 Vercel Postgres → Query 中**一次性运行这个**：

```sql
-- 创建用户表
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

-- 插入管理员
INSERT INTO users (id, username, password, name, role, balance, is_active)
VALUES ('admin-id-001', 'admin', 'admin123', '系统管理员', 'admin', 0, true)
ON CONFLICT (username) DO UPDATE SET password = 'admin123', is_active = true;

-- 验证
SELECT '✅ 数据库和管理员已准备好了！' AS message;
SELECT '现在可以登录了！' AS info;
```

### 第 3 步：重新部署

在 Vercel 项目 → **Deployments** → 点击最新的部署 → **Redeploy**

---

## 📋 验证步骤

完成以上步骤后：

1. 访问 `https://你的项目名.vercel.app/api/init`
   - 应该返回 `{"success": true, ...}`

2. 尝试登录：
   - 用户名：`admin`
   - 密码：`admin123`

---

## 🚨 还是不行？

告诉我：
1. Vercel 项目 → **Storage** 里有 Postgres 数据库吗？
2. 在 Vercel Postgres → Query 中运行 `SELECT * FROM users` 返回什么？
3. 访问 `/api/init` 返回什么？
