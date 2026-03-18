# 用户端与管理员端数据不一致故障排查指南

## 问题现象

- 用户端预约车位，管理员端看不到
- 管理员端添加停车场，用户端看不到
- 两边数据完全不同步

## 🔴 核心原因：环境变量未配置正确

### 快速诊断步骤

#### 步骤 1：检查环境变量是否存在

在 VSCode 项目根目录下，检查是否有 `.env` 文件：

```bash
# 在 VSCode 终端运行
ls -la .env
```

**如果没有 `.env` 文件**，必须创建！

#### 步骤 2：获取正确的 Supabase 配置

1. 打开你的 Supabase Dashboard: https://supabase.com/dashboard
2. 选择你的项目
3. 点击左侧菜单 **Settings** → **API**
4. 找到并复制以下两个值：
   - **Project URL** (类似 `https://xxxxx.supabase.co`)
   - **anon public** (很长的一串 key)

#### 步骤 3：创建并配置 `.env` 文件

在项目根目录创建 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env
```

然后编辑 `.env` 文件，填入你的真实配置：

```env
# .env 文件内容
COZE_SUPABASE_URL=https://你的真实项目ID.supabase.co
COZE_SUPABASE_ANON_KEY=你的真实anon_key
```

⚠️ **重要**：
- 不要有引号
- 不要有多余空格
- 保存后需要**重启开发服务器**

#### 步骤 4：重启开发服务器

```bash
# 在 VSCode 终端停止当前服务 (Ctrl+C)
# 然后重新启动
pnpm dev
```

---

## 📋 完整部署检查清单

### 1. 数据库层面检查

#### 1.1 确认 Supabase 中已执行数据库脚本

在 Supabase SQL Editor 中，检查是否有以下表：

```sql
-- 查询所有表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

应该看到以下表：
- `users`
- `parking_lots`
- `parking_spots`
- `reservations`
- `vehicle_records`
- `payment_records`
- `blacklist`
- `operation_logs`

**如果没有这些表**，重新执行 `database-init.sql`。

#### 1.2 确认管理员账户存在

```sql
SELECT id, username, role, is_active 
FROM users 
WHERE username = 'admin';
```

应该返回一条记录，role 为 `admin`。

### 2. 前端 VSCode 部署检查

#### 2.1 确认项目结构正确

```
你的项目/
├── .env                    ← 必须有这个文件！
├── .env.example
├── src/
│   ├── app/
│   └── storage/database/
├── package.json
└── database-init.sql
```

#### 2.2 确认依赖已安装

```bash
pnpm install
```

#### 2.3 确认开发服务器正常运行

```bash
pnpm dev
```

访问 http://localhost:5000，应该看到登录页面。

### 3. 数据一致性验证

#### 3.1 测试数据是否写入同一个数据库

**测试步骤：**

1. 用管理员账户登录前端
2. 在"停车场管理"中添加一个测试停车场
3. 打开 Supabase Dashboard → **Table Editor**
4. 查看 `parking_lots` 表，确认刚才添加的停车场是否存在

**如果存在** → 说明前端已正确连接到 Supabase ✅

**如果不存在** → 环境变量配置错误 ❌

---

## 🔧 常见问题解决

### 问题 1："环境变量已配置，但还是连接不上"

**解决方法：**

1. 确认 `.env` 文件在**项目根目录**，不是在 `src/` 目录下
2. 确认变量名完全正确：`COZE_SUPABASE_URL` 和 `COZE_SUPABASE_ANON_KEY`
3. 重启开发服务器（必须！）

### 问题 2："两边都能登录，但数据不一样"

**原因**：前端和管理员端连接的是不同的数据库（例如一个用本地数据库，一个用 Supabase）

**解决方法：**

1. 确保**所有地方**都用相同的 Supabase 配置
2. 检查是否有其他 `.env` 文件覆盖了配置

### 问题 3："修改了 .env 但没生效"

**解决方法：**

```bash
# 1. 停止开发服务器 (Ctrl+C)
# 2. 删除 .next 缓存
rm -rf .next
# 3. 重新启动
pnpm dev
```

### 问题 4："Supabase URL 在哪里找？"

**详细步骤：**

1. 登录 https://supabase.com
2. 点击你的项目
3. 左侧菜单找到 **Settings**（齿轮图标）
4. 点击 **API**
5. 在 **Project URL** 部分，复制 URL
6. 在 **Project API keys** 部分，复制 `anon public`  key

---

## 📝 一键验证脚本

创建 `test-connection.js` 文件来快速测试：

```javascript
// test-connection.js
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env 文件不存在！');
  console.log('请复制 .env.example 为 .env 并填入配置');
  process.exit(1);
}

console.log('✅ .env 文件存在');

const envContent = fs.readFileSync(envPath, 'utf-8');
console.log('\n.env 文件内容:');
console.log(envContent);

if (envContent.includes('你的项目ID') || envContent.includes('你的anon_key')) {
  console.error('\n❌ 请用真实的 Supabase 配置替换占位符！');
  process.exit(1);
}

console.log('\n✅ 配置看起来没问题，请重启开发服务器');
```

运行：

```bash
node test-connection.js
```

---

## 🎯 部署成功标准

部署完成后，验证以下项目：

- [ ] `.env` 文件存在且配置正确
- [ ] Supabase 中已执行 `database-init.sql`
- [ ] 用户端注册账户，管理员端能在"用户管理"中看到
- [ ] 用户端预约车位，管理员端能在"预约管理"中看到
- [ ] 管理员端添加停车场，用户端能在预约时选择

如果以上都满足，说明部署成功！
