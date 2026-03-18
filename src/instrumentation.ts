// Next.js instrumentation - 服务启动时自动执行
// 用于初始化系统数据

export async function register() {
  // 只在服务器端执行
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Init] Server starting, will initialize system...');
    
    // 延迟执行初始化，等待服务完全启动
    setTimeout(async () => {
      try {
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : `http://localhost:${process.env.PORT || 5000}`;
        
        const response = await fetch(`${baseUrl}/api/init`);
        const result = await response.json();
        
        if (result.success) {
          console.log('[Init] ✅ System initialized:', result.results?.join(', '));
        } else {
          console.log('[Init] ⚠️ Initialization result:', result);
        }
      } catch (error) {
        console.log('[Init] ⚠️ Could not auto-initialize:', error);
      }
    }, 3000);
  }
}
