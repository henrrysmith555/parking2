# 🚀 Vercel Postgres 最终部署指南

## ✅ 已完成的迁移

我已经帮你迁移了以下核心 API：

| API | 状态 |
|-----|------|
| `/api/init` | ✅ 已迁移 |
| `/api/auth/login` | ✅ 已迁移 |
| `/api/auth/register` | ✅ 已迁移 |
| `/api/logs` | ✅ 已迁移 |

---

## 📋 当前方案

由于 API 数量较多（30+ 个），完全迁移需要更多时间。我给你两个选择：

### 方案 A：混合使用（推荐，马上就能用）

- **核心功能**用 Vercel Postgres（登录、注册、初始化、日志）
- **其他功能**继续用 Supabase（不用改代码）
- 后续可以慢慢迁移其他 API

**优点**：马上就能部署使用！

---

### 方案 B：完全迁移（需要时间）

我继续帮你把所有 API 都改成 Vercel Postgres。

**优点**：完全统一，只用 Vercel Postgres
**缺点**：需要更多时间

---

## 🎯 推荐：先用方案 A 部署！

你现在就可以按以下步骤部署，核心功能能用！

---

## 部署步骤

### 第 1 步：推送到 GitHub

```bash
git add .
git commit -m "Migrate core APIs to Vercel Postgres"
git push
```

### 第 2 步：在 Vercel 导入项目

1. 访问 https://vercel.com
2. 点击 **Add New...** → **Project**
3. 选择你的仓库，点击 **Import**

### 第 3 步：添加 Vercel Postgres 数据库

在项目配置页面：

1. 点击 **Storage** 标签
2. 点击 **Create Database** → **Postgres**
3. 点击 **Continue**，接受默认设置
4. 等待创建完成！

### 第 4 步：初始化数据库表

1. 进入 Vercel 项目 → **Storage** → 你的 Postgres 数据库
2. 点击 **Query** 标签
3. 复制 `vercel-postgres-init.sql` 的全部内容
4. 粘贴到输入框，点击 **Run Query**

### 第 5 步：配置环境变量

在 Vercel 项目 → **Settings** → **Environment Variables** 添加：

| Name | Value |
|------|-------|
| `COZE_SUPABASE_URL` | `https://你的项目ID.supabase.co` |
| `COZE_SUPABASE_ANON_KEY` | `你的anon_key` |

**注意**：因为我们还用着 Supabase 的其他 API，所以这两个环境变量还需要保留！

### 第 6 步：部署！

点击 **Deploy**，等待 2-3 分钟！

---

## 部署后

### 初始化管理员

访问：`https://你的项目名.vercel.app/api/init`

### 登录

- 用户名：`admin`
- 密码：`admin123`

---

## 📝 已迁移的 API 详情

### 1. `/api/init` - 系统初始化
- ✅ 检查并创建管理员账户
- ✅ 数据库连接检查

### 2. `/api/auth/login` - 用户登录
- ✅ 查询用户验证
- ✅ 返回用户信息（不含密码）

### 3. `/api/auth/register` - 用户注册
- ✅ 检查用户名是否存在
- ✅ 创建新用户

### 4. `/api/logs` - 操作日志
- ✅ GET: 获取日志列表（支持筛选）
- ✅ POST: 创建新日志

---

## 🔄 后续完全迁移

如果你想让我继续把所有 API 都改成 Vercel Postgres，告诉我！

还需要迁移的 API：
- `/api/auth/change-password`
- `/api/parking-lots/*`
- `/api/parking-spots/*`
- `/api/reservations/*`
- `/api/vehicle-records/*`
- `/api/payment`
- `/api/recharge`
- `/api/users/*`
- `/api/blacklist/*`
- `/api/statistics/*`
- 等等...

---

## 💡 快速测试

你可以先测试一下已迁移的 API：

```bash
# 测试初始化
curl https://你的项目名.vercel.app/api/init

# 测试登录
curl -X POST https://你的项目名.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

**告诉我你的选择！**
