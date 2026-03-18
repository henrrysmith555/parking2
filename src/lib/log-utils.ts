/**
 * 操作日志工具函数
 */

export type LogAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'entry' | 'exit' | 'recharge' | 'payment';
export type LogModule = 'user' | 'parking_lot' | 'parking_spot' | 'vehicle' | 'reservation' | 'payment' | 'auth' | 'system';

interface LogData {
  action: LogAction;
  module: LogModule;
  description: string;
  details?: Record<string, unknown>;
  userId?: string | null;
  username?: string;
  ipAddress?: string;
}

/**
 * 记录操作日志
 */
export async function logOperation(logData: LogData): Promise<void> {
  try {
    // 获取当前用户信息
    let userId = logData.userId;
    let username = logData.username;

    if (typeof window !== 'undefined') {
      const sessionStr = localStorage.getItem('session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (!userId) userId = session.id;
        if (!username) username = session.username;
      }
    }

    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        username,
        action: logData.action,
        module: logData.module,
        description: logData.description,
        details: logData.details,
        ipAddress: logData.ipAddress,
      }),
    });
  } catch (error) {
    console.error('Failed to log operation:', error);
  }
}

/**
 * 预定义的日志记录函数
 */
export const logUtils = {
  // 用户登录
  login: (username: string) => logOperation({
    action: 'login',
    module: 'auth',
    description: `用户 ${username} 登录系统`,
    username,
  }),

  // 用户登出
  logout: (username: string) => logOperation({
    action: 'logout',
    module: 'auth',
    description: `用户 ${username} 退出系统`,
    username,
  }),

  // 预约创建
  reservationCreate: (spotId: string, plateNumber: string) => logOperation({
    action: 'create',
    module: 'reservation',
    description: `创建车位预约：车位 ${spotId}，车牌 ${plateNumber}`,
    details: { spotId, plateNumber },
  }),

  // 预约取消
  reservationDelete: (reservationId: string) => logOperation({
    action: 'delete',
    module: 'reservation',
    description: `取消预约：${reservationId}`,
    details: { reservationId },
  }),

  // 车辆入场
  vehicleEntry: (plateNumber: string, spotId: string) => logOperation({
    action: 'entry',
    module: 'vehicle',
    description: `车辆入场：${plateNumber} 进入车位 ${spotId}`,
    details: { plateNumber, spotId },
  }),

  // 车辆出场
  vehicleExit: (plateNumber: string, fee: number) => logOperation({
    action: 'exit',
    module: 'vehicle',
    description: `车辆出场：${plateNumber}，费用 ¥${fee.toFixed(2)}`,
    details: { plateNumber, fee },
  }),

  // 缴费
  payment: (plateNumber: string, amount: number) => logOperation({
    action: 'payment',
    module: 'payment',
    description: `车辆缴费：${plateNumber} 支付 ¥${amount.toFixed(2)}`,
    details: { plateNumber, amount },
  }),

  // 用户创建
  userCreate: (username: string) => logOperation({
    action: 'create',
    module: 'user',
    description: `创建用户：${username}`,
    details: { username },
  }),

  // 用户删除
  userDelete: (userId: string) => logOperation({
    action: 'delete',
    module: 'user',
    description: `删除用户：${userId}`,
    details: { userId },
  }),

  // 车位更新
  spotUpdate: (spotId: string, status: string) => logOperation({
    action: 'update',
    module: 'parking_spot',
    description: `更新车位状态：${spotId} → ${status}`,
    details: { spotId, status },
  }),
};
