// 日志工具函数

interface LogParams {
  userId?: string | null;
  username?: string | null;
  action: string;
  module: string;
  description?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

// 记录操作日志
export async function createLog(params: LogParams): Promise<void> {
  try {
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      console.error('Failed to create log:', await response.text());
    }
  } catch (error) {
    console.error('Failed to create log:', error);
  }
}

// 预约删除日志
export async function reservationDelete(reservationId: string): Promise<void> {
  await createLog({
    action: 'delete',
    module: 'reservation',
    description: `取消预约：${reservationId}`,
  });
}

// 车辆出场日志
export async function vehicleExit(plateNumber: string, fee: number): Promise<void> {
  await createLog({
    action: 'exit',
    module: 'vehicle',
    description: `车辆出场：${plateNumber}，费用：¥${fee}`,
  });
}

// 支付日志
export async function payment(plateNumber: string, amount: number): Promise<void> {
  await createLog({
    action: 'payment',
    module: 'payment',
    description: `停车缴费：${plateNumber}，金额：¥${amount}`,
  });
}

// 登录日志
export async function login(username: string): Promise<void> {
  await createLog({
    action: 'login',
    module: 'auth',
    description: `用户登录：${username}`,
  });
}

// 登出日志
export async function logout(username: string): Promise<void> {
  await createLog({
    action: 'logout',
    module: 'auth',
    description: `用户登出：${username}`,
  });
}

// 创建日志
export async function create(module: string, description: string): Promise<void> {
  await createLog({
    action: 'create',
    module,
    description,
  });
}

// 更新日志
export async function update(module: string, description: string): Promise<void> {
  await createLog({
    action: 'update',
    module,
    description,
  });
}

// 删除日志
export async function deleteLog(module: string, description: string): Promise<void> {
  await createLog({
    action: 'delete',
    module,
    description,
  });
}

// 入场日志
export async function entry(plateNumber: string, spotNumber?: string): Promise<void> {
  await createLog({
    action: 'entry',
    module: 'vehicle',
    description: `车辆入场：${plateNumber}${spotNumber ? `，车位：${spotNumber}` : ''}`,
  });
}

// 充值日志
export async function recharge(amount: number, method: string): Promise<void> {
  await createLog({
    action: 'recharge',
    module: 'payment',
    description: `充值：¥${amount}，方式：${method}`,
  });
}

// 日志工具对象（兼容旧代码）
export const logUtils = {
  createLog,
  reservationDelete,
  vehicleExit,
  payment,
  login,
  logout,
  create,
  update,
  delete: deleteLog,
  entry,
  recharge,
};

export default logUtils;
