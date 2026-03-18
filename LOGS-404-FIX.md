# 操作日志 404 问题排查指南

## 问题诊断

首先确认你遇到的是哪种情况：

### 情况 1：访问 /admin/logs URL 时页面显示 404

**原因**：路由问题或文件位置不对

**解决方法**：

1. 确认文件位置正确：
   ```
   src/app/admin/logs/page.tsx  ← 必须在这里
   ```

2. 检查 Next.js 路由：
   - 文件必须命名为 `page.tsx`
   - 不能有其他扩展名

3. 重启开发服务器：
   ```bash
   # 停止服务 (Ctrl+C)
   rm -rf .next
   pnpm dev
   ```

---

### 情况 2：页面能打开，但控制台有 404 错误

**原因**：API 调用失败

**解决方法**：

1. 打开浏览器开发者工具 (F12)
2. 查看 Console（控制台）和 Network（网络）标签
3. 找到失败的请求，看具体错误信息

---

### 情况 3：页面能打开，但显示"暂无操作记录"且 API 返回 404

**原因**：API 路由问题

**检查步骤**：

1. 确认 API 文件存在：
   ```
   src/app/api/logs/route.ts  ← 必须在这里
   ```

2. 直接测试 API：
   ```bash
   curl http://localhost:5000/api/logs
   ```
   
   应该返回 JSON 数据，而不是 404。

---

## 本地部署完整检查清单

### 1. 检查项目文件结构

在 VSCode 中确认以下文件都存在：

```
你的项目/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── logs/
│   │   │   │   └── page.tsx        ← 必须有
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── api/
│   │       └── logs/
│   │           └── route.ts         ← 必须有
│   └── components/
│       └── layout/
│           └── AdminLayout.tsx
└── .env                              ← 必须有
```

### 2. 检查 .env 配置

确认 `.env` 文件存在且配置正确：

```env
COZE_SUPABASE_URL=https://你的项目ID.supabase.co
COZE_SUPABASE_ANON_KEY=你的anon_key
```

### 3. 确认 Supabase 数据库表存在

在 Supabase Dashboard → Table Editor 中检查是否有：
- `operation_logs` 表

如果没有，重新执行 `database-init.sql`。

### 4. 重启开发服务器

```bash
# 1. 停止当前服务 (Ctrl+C)

# 2. 清除缓存
rm -rf .next

# 3. 重新启动
pnpm dev
```

---

## 快速测试脚本

在项目根目录创建 `test-logs.js`：

```javascript
// test-logs.js
const fs = require('fs');
const path = require('path');

console.log('🔍 检查操作日志相关文件...\n');

// 检查 logs 页面
const logsPage = path.join(__dirname, 'src/app/admin/logs/page.tsx');
if (fs.existsSync(logsPage)) {
  console.log('✅ src/app/admin/logs/page.tsx 存在');
} else {
  console.error('❌ src/app/admin/logs/page.tsx 不存在！');
}

// 检查 logs API
const logsApi = path.join(__dirname, 'src/app/api/logs/route.ts');
if (fs.existsSync(logsApi)) {
  console.log('✅ src/app/api/logs/route.ts 存在');
} else {
  console.error('❌ src/app/api/logs/route.ts 不存在！');
}

// 检查 .env
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  console.log('✅ .env 文件存在');
  const content = fs.readFileSync(envFile, 'utf-8');
  if (content.includes('你的项目ID') || content.includes('你的anon_key')) {
    console.warn('⚠️  .env 文件中可能还有占位符，请替换为真实配置');
  }
} else {
  console.error('❌ .env 文件不存在！');
}

console.log('\n📋 检查完成！');
```

运行：
```bash
node test-logs.js
```

---

## 常见问题解决

### 问题："文件都在，但还是 404"

**解决**：
1. 确认你访问的是 `http://localhost:5000/admin/logs`（端口是 5000！）
2. 确认你已经用管理员账户登录了
3. 检查浏览器 URL 是否正确

### 问题："API 返回 500 错误"

**原因**：数据库连接问题

**解决**：
1. 检查 `.env` 配置是否正确
2. 确认 Supabase 项目是否正常运行
3. 查看服务器终端的错误日志

### 问题："其他页面都正常，只有操作日志 404"

**解决**：
1. 检查 `src/app/admin/logs/page.tsx` 文件名是否正确（是 `logs` 不是 `log`）
2. 检查是否有拼写错误

---

## 如果以上都不行

请提供以下信息，我来帮你进一步排查：

1. 你访问的完整 URL 是什么？
2. 浏览器控制台 (F12) 有什么错误信息？
3. 终端 (Terminal) 有什么错误日志？
4. 截图（如果方便的话）
