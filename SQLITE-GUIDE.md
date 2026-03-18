# SQLite 版本使用指南

## 🎉 为什么用 SQLite？

- ✅ **零配置** - 不需要注册任何账号
- ✅ **单文件** - 数据库就是一个文件，想拷去哪就拷去哪
- ✅ **本地运行** - 不需要网络，离线也能用
- ✅ **部署简单** - Vercel、本地都能用

---

## 🚀 快速开始（本地开发）

### 1. 初始化数据库

在项目根目录运行：

```bash
# 创建 data 目录（如果没有）
mkdir -p data

# 初始化数据库
node -r esbuild-register scripts/init-sqlite.ts
```

或者用我们提供的脚本：

```bash
pnpm db:init
```

### 2. 开始使用

就这么简单！现在你的数据库已经准备好了：

- 📁 数据库文件位置：`data/parking.db`
- 🔑 默认管理员：`admin` / `admin123`

---

## 📝 切换到 SQLite（完整方案）

由于项目原本是用 Supabase 写的，要完全切换到 SQLite 需要修改所有 API 路由。

我为你准备了两个方案：

### 方案 A：使用我创建的 SQLite 客户端（推荐）

我已经创建了 `src/storage/database/sqlite-client.ts`，包含：

- ✅ 完整的数据库表结构
- ✅ 自动初始化管理员账户
- ✅ 和 Supabase 类似的 API

### 方案 B：只用本地 SQLite 文件，保留现有代码

如果你想快速部署，不想改太多代码，可以：

1. 继续用现有的 Supabase 代码
2. 只在本地开发时用 SQLite（需要写适配层）

---

## 🔧 我来帮你把主要 API 改成 SQLite

让我先修改几个核心的 API，看看效果：

### 1. 先修改 package.json，添加脚本

在 `package.json` 的 `scripts` 部分添加：

```json
{
  "scripts": {
    "db:init": "node -r esbuild-register scripts/init-sqlite.ts"
  }
}
```

### 2. 修改登录 API

修改 `src/app/api/auth/login/route.ts` 以支持 SQLite。

---

## 💡 最简单的方案（推荐）

**你现在就可以用的方案：**

1. 继续使用现有的 Supabase 版本（代码不用改）
2. 本地开发时，用我给你的 SQLite 作为备选
3. 部署时，可以用 Vercel Postgres 或 SQLite

---

## 📚 查看 SQLite 数据库

如果你想看数据库里有什么，可以用这些工具：

### 1. DB Browser for SQLite（推荐，图形界面）

下载：https://sqlitebrowser.org/dl/

- 打开 `data/parking.db` 文件
- 就能看到所有表和数据了

### 2. 命令行查看

```bash
# 进入数据库
sqlite3 data/parking.db

# 查看所有表
.tables

# 查询用户
SELECT * FROM users;

# 退出
.quit
```

---

## 🚀 部署到 Vercel 用 SQLite

Vercel 也支持 SQLite！

### 方法 1：使用 Vercel Postgres（最简单）

1. 在 Vercel 项目中添加 Vercel Postgres
2. 改动很小，大部分代码不用改

### 方法 2：SQLite + Vercel KV（需要改代码）

1. 用 Vercel KV 存储 SQLite 文件
2. 每次读写都同步

---

## 🤔 我的建议

既然你觉得 Supabase 难用，我建议：

**方案 1：用 Vercel Postgres（最推荐）**
- 也是 PostgreSQL，但和 Vercel 集成超好
- 一点都不难用，点击几下就搞定
- 不需要改太多代码

**方案 2：完全用 SQLite（我帮你改）**
- 我可以帮你把所有 API 都改成 SQLite
- 但工作量有点大，需要时间
- 改完后就完全独立了，不需要任何云服务

你想用哪个方案？告诉我，我来帮你实现！
