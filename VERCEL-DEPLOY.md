# Vercel 部署完整指南

## 一、准备工作

### 1.1 注册账号

1. 访问 https://vercel.com
2. 点击 **Sign Up** 注册账号
3. 推荐使用 **GitHub 账号**登录（方便后续部署）

### 1.2 准备 GitHub 仓库

如果你的项目还没有推送到 GitHub，按以下步骤操作：

#### 步骤 1：初始化 Git（如果还没有）

在 VSCode 终端中：

```bash
# 检查是否已有 git
git status

# 如果没有，初始化 git
git init
```

#### 步骤 2：创建 .gitignore 文件

确认项目根目录有 `.gitignore` 文件，内容应包含：

```
node_modules
.next
.env
.env.local
.env.*.local
*.log
.DS_Store
```

#### 步骤 3：提交代码

```bash
# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"
```

#### 步骤 4：创建 GitHub 仓库

1. 访问 https://github.com/new
2. 填写仓库名称（如 `parking-system`）
3. 选择 **Public** 或 **Private**
4. **不要**勾选 "Initialize this repository with..."
5. 点击 **Create repository**

#### 步骤 5：推送到 GitHub

按照 GitHub 页面上的提示操作：

```bash
# 添加远程仓库（替换为你的用户名和仓库名）
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送代码
git branch -M main
git push -u origin main
```

---

## 二、在 Vercel 上部署

### 2.1 导入项目

1. 登录 Vercel 后，点击 **Add New...** → **Project**
2. 在 **Import Git Repository** 部分，找到你的仓库
3. 点击 **Import** 按钮

### 2.2 配置项目

进入项目配置页面：

#### 1. Project Name（项目名称）
- 可以自定义，如 `parking-system`
- 这个名称会成为你的访问 URL：`https://parking-system.vercel.app`

#### 2. Framework Preset（框架预设）
- Vercel 会自动识别为 **Next.js**
- 保持默认即可

#### 3. Root Directory（根目录）
- 保持默认 `./`

#### 4. Build and Output Settings（构建和输出设置）
- 保持默认即可，Vercel 会自动配置

#### 5. Environment Variables（环境变量）⚠️ **最重要的一步！**

点击 **Environment Variables** 展开，添加以下变量：

| Name | Value |
|------|-------|
| `COZE_SUPABASE_URL` | `https://你的项目ID.supabase.co` |
| `COZE_SUPABASE_ANON_KEY` | `你的anon_public_key` |

**如何获取这些值：**
1. 打开 https://supabase.com/dashboard
2. 选择你的项目
3. 点击左侧 **Settings** → **API**
4. 复制 **Project URL** 和 **anon public**  key

**添加方式：**
1. 在 Name 输入框输入：`COZE_SUPABASE_URL`
2. 在 Value 输入框粘贴你的 URL
3. 点击 **Add** 按钮
4. 重复以上步骤添加 `COZE_SUPABASE_ANON_KEY`

### 2.3 开始部署

确认所有配置都正确后，点击 **Deploy** 按钮！

---

## 三、等待部署完成

部署过程需要 2-5 分钟，你会看到：

1. **Building** - 正在构建
2. **Deploying** - 正在部署
3. **Congratulations!** - 部署成功！

### 查看部署日志

如果部署失败，点击 **View Build Logs** 查看详细错误信息。

---

## 四、部署后配置

### 4.1 访问你的网站

部署成功后，会显示你的网站 URL，类似：
```
https://你的项目名.vercel.app
```

点击这个链接就能访问你的网站了！

### 4.2 初始化数据库

第一次访问网站后，需要初始化管理员账户：

1. 访问你的网站
2. 尝试登录可能会失败（因为还没有管理员账户）
3. 手动访问一次这个 URL（替换为你的域名）：
   ```
   https://你的项目名.vercel.app/api/init
   ```
4. 这会自动创建管理员账户：
   - 用户名：`admin`
   - 密码：`admin123`

### 4.3 修改默认密码（重要！）

1. 使用 admin/admin123 登录
2. 进入"用户管理"
3. 找到 admin 用户，修改密码为安全的密码

---

## 五、自定义域名（可选）

### 5.1 添加自定义域名

1. 在 Vercel 项目页面，点击 **Settings** → **Domains**
2. 输入你的域名，如 `parking.yourdomain.com`
3. 点击 **Add**

### 5.2 配置 DNS

Vercel 会告诉你需要配置的 DNS 记录：

1. 登录你的域名服务商（如阿里云、腾讯云、Cloudflare 等）
2. 找到 DNS 管理
3. 添加 Vercel 提供的 DNS 记录
4. 等待 DNS 生效（可能需要几小时）

---

## 六、自动部署（推荐）

### 6.1 开启自动部署

Vercel 默认已开启自动部署：

- 当你推送到 `main` 分支时，Vercel 会自动重新部署
- 当你创建 Pull Request 时，Vercel 会创建预览部署

### 6.2 如何推送更新

以后修改代码后，只需：

```bash
# 1. 提交修改
git add .
git commit -m "描述你的修改"

# 2. 推送到 GitHub
git push
```

Vercel 会自动检测到更新并重新部署！

---

## 七、常见问题解决

### 问题 1：部署成功但访问时提示数据库连接错误

**原因**：环境变量没配置或配置错误

**解决**：
1. 进入 Vercel 项目 → **Settings** → **Environment Variables**
2. 确认 `COZE_SUPABASE_URL` 和 `COZE_SUPABASE_ANON_KEY` 都已添加
3. 确认值没有多余的空格或引号
4. 修改环境变量后需要**重新部署**才能生效

### 问题 2：部署构建失败

**查看日志**：
1. 在 Vercel 项目页面点击 **Deployments**
2. 点击失败的部署
3. 点击 **View Build Logs** 查看详细错误

**常见原因**：
- 代码有 TypeScript 错误
- 缺少依赖
- 环境变量问题

### 问题 3：管理员账户无法登录

**解决**：
1. 先访问 `https://你的项目名.vercel.app/api/init`
2. 等待几秒钟，看到 "Init complete" 说明初始化成功
3. 然后使用 admin/admin123 登录

### 问题 4：页面显示 404

**解决**：
1. 确认你访问的 URL 正确
2. 确认代码已推送到 GitHub
3. 确认 Vercel 部署成功

### 问题 5：Supabase 允许 Vercel 访问

**原因**：Supabase 的 Row Level Security (RLS) 可能阻止访问

**解决**：
1. 打开 Supabase Dashboard
2. 选择你的项目
3. 点击左侧 **Authentication** → **Providers**
4. 确认配置正确
5. 如果使用 RLS，需要配置正确的策略（本项目暂时禁用 RLS）

---

## 八、部署检查清单

部署完成后，检查以下项目：

- [ ] 能正常访问首页
- [ ] 能访问 `/api/init` 初始化管理员
- [ ] 能用 admin/admin123 登录
- [ ] 能进入管理员后台
- [ ] 能访问操作日志页面
- [ ] 用户能注册账户
- [ ] 数据库能正常读写

---

## 九、查看部署状态

在 Vercel 项目页面可以看到：

- **Overview**：项目概览
- **Deployments**：部署历史
- **Settings**：项目设置（环境变量、域名等）
- **Analytics**：访问统计（如果开启）

---

## 十、删除部署（如果需要）

1. 进入 Vercel 项目页面
2. 点击 **Settings**
3. 滚动到最底部
4. 点击 **Delete Project**
5. 确认删除

---

## 快速参考

| 项目 | 链接 |
|------|------|
| Vercel 控制台 | https://vercel.com/dashboard |
| Supabase 控制台 | https://supabase.com/dashboard |
| GitHub | https://github.com |

祝你部署顺利！🎉
