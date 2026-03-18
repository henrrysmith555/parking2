# 酒店停车场车位远程监测与管理系统 - 部署指南

## 一、项目打包

### 1. 环境要求
- Node.js >= 20.x
- pnpm >= 9.0.0

### 2. 安装依赖
```bash
npm install -g pnpm
pnpm install
```

### 3. 构建项目
```bash
pnpm build
```

构建完成后，产物在 `.next` 目录中。

### 4. 运行生产版本
```bash
pnpm start
```

默认运行在 http://localhost:5000

---

## 二、数据库配置

### 1. 创建 Supabase 项目

1. 访问 https://supabase.com
2. 注册并创建新项目
3. 记录以下信息：
   - Project URL
   - anon public key

### 2. 执行数据库脚本

1. 进入 Supabase Dashboard
2. 点击左侧 **SQL Editor**
3. 点击 **New query**
4. 复制粘贴 `database-init.sql` 文件内容
5. 点击 **Run** 执行

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
COZE_SUPABASE_URL=https://你的项目ID.supabase.co
COZE_SUPABASE_ANON_KEY=你的anon_key
```

---

## 三、部署步骤

### 方式一：本地部署

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
# 创建 .env 文件，填入 Supabase 配置

# 3. 构建项目
pnpm build

# 4. 运行
pnpm start

# 5. 访问
# http://localhost:5000
```

### 方式二：Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制项目文件
COPY package.json pnpm-lock.yaml ./
COPY . .

# 安装依赖
RUN pnpm install --frozen-lockfile

# 构建
RUN pnpm build

# 暴露端口
EXPOSE 5000

# 设置环境变量
ENV PORT=5000
ENV NODE_ENV=production

# 启动
CMD ["pnpm", "start"]
```

构建并运行：

```bash
# 构建镜像
docker build -t parking-system .

# 运行容器
docker run -d \
  -p 5000:5000 \
  -e COZE_SUPABASE_URL=你的URL \
  -e COZE_SUPABASE_ANON_KEY=你的KEY \
  --name parking-system \
  parking-system
```

### 方式三：Vercel 部署

1. 将项目推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量：
   - `COZE_SUPABASE_URL`
   - `COZE_SUPABASE_ANON_KEY`
4. 部署

---

## 四、项目结构

```
.
├── .env                    # 环境变量配置（需创建）
├── .next/                  # 构建产物目录
├── public/                 # 静态资源
├── src/
│   ├── app/
│   │   ├── admin/          # 管理员端页面
│   │   ├── user/           # 用户端页面
│   │   ├── login/          # 登录页面
│   │   └── api/            # API 接口
│   ├── components/         # UI 组件
│   └── storage/            # 数据库配置
├── scripts/                # 脚本文件
├── package.json
├── database-init.sql       # 数据库初始化脚本
└── README.md
```

---

## 五、默认账户

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

---

## 六、功能模块

### 管理员端
- 仪表盘：数据概览、实时监控
- 停车场管理：添加/编辑停车场
- 车位管理：管理车位状态
- 预约管理：查看和处理预约
- 车辆进出：手动入场/出场
- 用户管理：管理用户账户
- 黑名单：管理黑名单车辆
- 数据统计：收入统计、车流量分析
- 操作日志：系统操作记录
- 地图可视化：车位分布展示

### 用户端
- 预约车位：自主预约停车位
- 车辆管理：绑定车牌
- 账户充值：在线充值
- 缴费记录：查看缴费历史
- 个人中心：个人信息管理

---

## 七、计费规则

- 统一收费标准：**每小时 10 元**
- 不足 1 小时按 1 小时计算
- 无免费时长

---

## 八、常见问题

### 1. 端口被占用
```bash
# 查看占用端口的进程
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000

# 使用其他端口
PORT=3000 pnpm start
```

### 2. 数据库连接失败
- 检查 `.env` 文件是否存在
- 检查 URL 和 Key 是否正确
- 检查 Supabase 项目是否正常运行

### 3. 登录失败
- 访问 `/api/init` 重新初始化管理员账户
- 确认数据库中存在 admin 用户

---

## 九、技术栈

- **前端**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **UI 组件**: shadcn/ui
- **图表**: Recharts
- **数据库**: Supabase (PostgreSQL)
- **包管理**: pnpm
