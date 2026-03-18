# Vercel 部署指南

本文档详细说明如何将酒店停车场车位远程监测与管理系统部署到 Vercel 平台。

## 目录

- [前置准备](#前置准备)
- [第一步：创建 Supabase 项目](#第一步创建-supabase-项目)
- [第二步：初始化数据库](#第二步初始化数据库)
- [第三步：部署到 Vercel](#第三步部署到-vercel)
- [第四步：配置环境变量](#第四步配置环境变量)
- [验证部署](#验证部署)
- [常见问题](#常见问题)

---

## 前置准备

在开始部署之前，请确保您已准备好：

1. **GitHub 账号** - 用于代码托管
2. **Vercel 账号** - 用于部署（可用 GitHub 账号登录）
3. **Supabase 账号** - 用于数据库（免费版即可）

---

## 第一步：创建 Supabase 项目

### 1.1 登录 Supabase

访问 [https://supabase.com](https://supabase.com) 并登录您的账号。

### 1.2 创建新项目

1. 点击 **New Project**
2. 填写项目信息：
   - **Name**: `parking-management` (或您喜欢的名称)
   - **Database Password**: 设置一个强密码并保存
   - **Region**: 选择离您最近的区域（如 `Northeast Asia (Tokyo)`）
3. 点击 **Create new project**
4. 等待项目创建完成（约 1-2 分钟）

### 1.3 获取项目凭据

1. 进入项目后，点击左侧 **Settings** (齿轮图标)
2. 点击 **API**
3. 记录以下信息：
   - **Project URL** → 这是您的 `COZE_SUPABASE_URL`
   - **anon public** key → 这是您的 `COZE_SUPABASE_ANON_KEY`

---

## 第二步：初始化数据库

### 2.1 打开 SQL Editor

1. 在 Supabase 项目中，点击左侧 **SQL Editor**
2. 点击 **New query**

### 2.2 执行建表脚本

1. 打开项目中的 `database/init.sql` 文件
2. 复制全部内容
3. 粘贴到 SQL Editor 中
4. 点击 **Run** 执行

### 2.3 验证表创建

执行成功后，在左侧点击 **Table Editor**，确认以下表已创建：

| 表名 | 说明 |
|------|------|
| users | 用户信息 |
| parking_lots | 停车场 |
| parking_spots | 车位 |
| vehicle_records | 车辆进出记录 |
| reservations | 预约记录 |
| recharge_records | 充值记录 |
| payment_records | 缴费记录 |
| fee_rules | 收费规则 |
| blacklists | 黑名单 |
| operation_logs | 操作日志 |

---

## 第三步：部署到 Vercel

### 方式一：通过 Vercel CLI（推荐）

#### 3.1 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 3.2 登录 Vercel

```bash
vercel login
```

#### 3.3 部署项目

在项目根目录执行：

```bash
vercel
```

按提示操作：
1. **Link to existing project?** → No
2. **Project name** → 输入项目名称
3. **In which directory is your code located?** → ./
4. **Want to override the settings?** → No

#### 3.4 部署到生产环境

```bash
vercel --prod
```

### 方式二：通过 GitHub 集成

#### 3.1 推送代码到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库.git
git push -u origin main
```

#### 3.2 在 Vercel 导入项目

1. 访问 [https://vercel.com](https://vercel.com)
2. 点击 **Add New...** → **Project**
3. 选择您的 GitHub 仓库
4. 点击 **Import**
5. 保持默认配置，点击 **Deploy**

---

## 第四步：配置环境变量

### 4.1 在 Vercel Dashboard 配置

1. 进入您的 Vercel 项目
2. 点击 **Settings** → **Environment Variables**
3. 添加以下环境变量：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `COZE_SUPABASE_URL` | 您的 Supabase Project URL | Production, Preview, Development |
| `COZE_SUPABASE_ANON_KEY` | 您的 Supabase anon public key | Production, Preview, Development |

### 4.2 重新部署

配置完成后，需要重新部署使环境变量生效：

```bash
vercel --prod
```

或在 Vercel Dashboard 中点击 **Redeploy**。

---

## 验证部署

### 1. 访问应用

部署完成后，Vercel 会提供一个访问地址，格式如：
```
https://your-project-name.vercel.app
```

### 2. 测试登录

使用以下账户测试：

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | `admin` | `admin123` |
| 用户 | `zhangsan` | `123456` |

### 3. 检查功能

- [ ] 登录/登出功能
- [ ] 管理员：停车场管理
- [ ] 管理员：车位管理
- [ ] 管理员：用户管理
- [ ] 用户：预约车位
- [ ] 用户：充值功能
- [ ] 车辆进出记录

---

## 常见问题

### Q1: 部署失败，提示找不到模块

**解决方案**：确保 `package.json` 中的依赖版本正确，然后重新执行：

```bash
pnpm install
vercel --prod
```

### Q2: 数据库连接失败

**解决方案**：
1. 检查环境变量是否正确配置
2. 确认 Supabase 项目是否正常运行
3. 检查 RLS 策略是否正确设置

### Q3: 登录后显示空白页面

**解决方案**：
1. 检查浏览器控制台是否有错误
2. 确认数据库表是否已正确创建
3. 检查初始数据是否已插入

### Q4: API 请求返回 500 错误

**解决方案**：
1. 在 Vercel Dashboard 查看 Function Logs
2. 检查 Supabase 连接是否正常
3. 确认环境变量配置

### Q5: 如何更新部署

**解决方案**：
```bash
git add .
git commit -m "Update"
git push
```

Vercel 会自动检测 GitHub 推送并重新部署。

---

## 项目结构

```
├── database/
│   ├── init.sql          # 一键初始化脚本（推荐）
│   ├── schema.sql        # 纯建表脚本
│   └── seed.sql          # 纯初始数据脚本
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API 路由
│   │   ├── admin/        # 管理员页面
│   │   └── user/         # 用户页面
│   ├── components/       # React 组件
│   └── storage/          # 数据库配置
├── docs/
│   └── VERCEL_DEPLOYMENT.md
└── package.json
```

---

## 技术栈

- **框架**: Next.js 16.1.1 (App Router)
- **前端**: React 19, TypeScript, Tailwind CSS 4
- **UI 组件**: shadcn/ui
- **数据库**: PostgreSQL (Supabase)
- **部署**: Vercel

---

## 支持

如有问题，请检查：
1. Vercel 部署日志
2. Supabase 日志
3. 浏览器控制台错误

---

**祝您部署顺利！**
