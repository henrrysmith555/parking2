# 🚀 一键部署到 Vercel（超简单！）

## 准备工作（5分钟）

### 1. 把代码推送到 GitHub

在 VSCode 终端运行：

```bash
# 1. 提交代码
git add .
git commit -m "Ready for deploy"

# 2. 如果还没有 GitHub 仓库，去 https://github.com/new 创建一个
# 3. 推送到 GitHub
git remote add origin https://github.com/你的用户名/你的仓库名.git
git branch -M main
git push -u origin main
```

---

## 开始部署（只需 3 步！）

### 第 1 步：导入项目到 Vercel

1. 访问 https://vercel.com
2. 登录（用 GitHub 账号登录）
3. 点击 **Add New...** → **Project**
4. 找到你刚才推送的仓库，点击 **Import**

### 第 2 步：添加数据库（最重要！）

在项目配置页面：

1. 点击 **Storage** 标签（如果没看到，部署后再添加也行）
2. 点击 **Create Database** → **Postgres**
3. 点击 **Continue**，接受默认设置
4. 等待几秒钟，数据库就创建好了！

### 第 3 步：初始化数据库

1. 部署成功后，进入 Vercel 项目页面
2. 点击 **Storage** → 你的 Postgres 数据库
3. 点击 **Query** 标签
4. 复制 `vercel-postgres-init.sql` 文件的全部内容
5. 粘贴到输入框，点击 **Run Query**
6. 看到 "✅ 数据库初始化完成！" 就成功了！

### 第 4 步：配置环境变量（用 Supabase 或 Vercel Postgres）

#### 方案 A：继续用你现有的 Supabase（推荐，不用改代码）

在 Vercel 项目 → **Settings** → **Environment Variables** 添加：

| Name | Value |
|------|-------|
| `COZE_SUPABASE_URL` | `https://你的项目ID.supabase.co` |
| `COZE_SUPABASE_ANON_KEY` | `你的anon_key` |

#### 方案 B：改用 Vercel Postgres（需要改代码）

如果你想改用 Vercel Postgres，告诉我，我来帮你改代码！

### 第 5 步：点击 Deploy！

确认配置无误后，点击 **Deploy** 按钮！

---

## 部署完成后

### 1. 访问你的网站

部署成功后，Vercel 会给你一个链接，类似：
```
https://你的项目名.vercel.app
```

### 2. 初始化管理员账户

访问一次这个链接：
```
https://你的项目名.vercel.app/api/init
```

这会创建管理员账户：
- 用户名：`admin`
- 密码：`admin123`

### 3. 开始使用！

用 admin/admin123 登录，开始使用吧！

---

## 就这么简单！ 🎉

有问题随时问我！
