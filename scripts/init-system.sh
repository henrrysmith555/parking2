#!/bin/bash
# 系统初始化脚本 - 在服务启动后自动初始化数据库

INIT_URL="http://localhost:5000/api/init"
MAX_RETRIES=10
RETRY_INTERVAL=2

echo "Waiting for service to be ready..."

# 等待服务启动
for i in $(seq 1 $MAX_RETRIES); do
    if curl -s -f "$INIT_URL" > /dev/null 2>&1; then
        echo "Service is ready, initializing system..."
        break
    fi
    echo "Attempt $i/$MAX_RETRIES: Service not ready yet, waiting..."
    sleep $RETRY_INTERVAL
done

# 调用初始化 API
echo "Calling initialization API..."
INIT_RESULT=$(curl -s "$INIT_URL")
echo "$INIT_RESULT"

# 检查初始化结果
if echo "$INIT_RESULT" | grep -q '"success":true'; then
    echo "✅ System initialized successfully!"
else
    echo "⚠️ System initialization may have issues, check the result above."
fi
