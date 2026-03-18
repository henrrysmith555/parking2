# 🚀 如何在 Vercel 上添加 Postgres 数据库

## ✅ 不需要自己准备数据库！

Vercel 可以直接帮你创建 Postgres 数据库，**一键操作**！

---

## 📋 详细步骤（5 步）

### 第 1 步：进入 Vercel 项目

1. 访问 https://vercel.com/dashboard
2. 找到你的项目，点击进入

### 第 2 步：找到 Storage 标签

在项目页面，看顶部的标签栏：

- **Overview**
- **Deployments**
- **Settings**
- **Storage** ← 点击这个！

**如果没有看到 Storage 标签**：
- 说明你用的是旧版 Vercel
- 点击 **Settings** → 找到 **Storage** 部分

### 第 3 步：创建数据库

1. 点击 **Storage** 标签
2. 点击 **Create Database** 按钮
3. 选择 **Postgres**（应该是默认选中的）
4. 点击 **Continue** 或 **Create** 按钮

### 第 4 步：等待创建完成

- 等待约 10-30 秒
- 看到 **Connected** 状态就成功了！

### 第 5 步：初始化数据库表

1. 在 Storage 页面，点击你的 Postgres 数据库
2. 点击 **Query** 标签
3. 复制 `vercel-postgres-init.sql` 的**全部内容**
4. 粘贴到输入框
5. 点击 **Run Query**

---

## 🎯 完成！

现在就可以登录了！

- 用户名：`admin`
- 密码：`admin123`

---

## 📸 图示说明

```
Vercel 项目页面
├── Overview
├── Deployments
├── Settings
└── Storage ← 点击这里！
    └── Create Database ← 点击这个！
        └── Postgres ← 选这个
            └── Continue ← 点击继续
                └── 等待...
                    └── Connected ✅
                        └── Query ← 点击这里
                            └── 粘贴 SQL ← 粘贴 vercel-postgres-init.sql
                                └── Run Query ← 点击运行
```

---

## ❓ 还是找不到 Storage？

### 检查 1：确认是在项目页面，不是个人主页

- 先点击你的项目名称进入项目详情页
- 再找 Storage 标签

### 检查 2：刷新页面

- 按 F5 或 Cmd+R 刷新
- 再看看有没有 Storage

### 检查 3：Vercel 版本

- 如果还是没有，可能是 Vercel 界面更新了
- 找 **"Add Storage"** 或 **"Database"** 按钮

---

## 🎉 成功后

**Storage** 页面应该显示：
- 一个 Postgres 数据库
- 状态是 **Connected**
- 有 **Query** 标签可以点击

---

**有问题随时问我！**
