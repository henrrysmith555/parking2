import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 计算停车费用
function calculateFee(entryTime: string, exitTime: string): number {
  const entry = new Date(entryTime);
  const exit = new Date(exitTime);
  const durationMs = exit.getTime() - entry.getTime();
  const durationMinutes = Math.ceil(durationMs / (1000 * 60));
  
  // 收费规则：首小时5元，后续每小时3元，每日封顶50元
  const firstHourRate = 5;
  const additionalRate = 3;
  const maxDailyRate = 50;
  const freeMinutes = 15;
  
  // 免费时长内
  if (durationMinutes <= freeMinutes) {
    return 0;
  }
  
  // 计算小时数（向上取整）
  const hours = Math.ceil((durationMinutes - freeMinutes) / 60);
  
  let fee = 0;
  if (hours <= 1) {
    fee = firstHourRate;
  } else {
    fee = firstHourRate + (hours - 1) * additionalRate;
  }
  
  // 每日封顶
  return Math.min(fee, maxDailyRate);
}

// 检查是否逾期（超过24小时）
function isOverdue(entryTime: string): boolean {
  const entry = new Date(entryTime);
  const now = new Date();
  const hoursDiff = (now.getTime() - entry.getTime()) / (1000 * 60 * 60);
  return hoursDiff > 24;
}

interface ProcessResult {
  recordId: string;
  plateNumber: string;
  userName: string | null;
  userId: string | null;
  currentBalance: number;
  fee: number;
  canDeduct: boolean;
  deducted?: boolean;
  newBalance?: number;
}

// 自动扣费处理
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { dryRun = false } = body; // dryRun模式只返回结果不执行扣费

    // 查询所有在场且逾期的车辆
    const { data: parkedVehicles, error } = await client
      .from('vehicle_records')
      .select('*')
      .eq('status', 'parked');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 过滤出逾期车辆
    const overdueVehicles = (parkedVehicles || []).filter((v: { entry_time: string }) => 
      isOverdue(v.entry_time)
    );

    const results: ProcessResult[] = [];

    for (const vehicle of overdueVehicles) {
      const fee = calculateFee(vehicle.entry_time, new Date().toISOString());
      
      // 查询用户信息
      let user = null;
      if (vehicle.user_id) {
        const { data: userData } = await client
          .from('users')
          .select('id, name, balance')
          .eq('id', vehicle.user_id)
          .single();
        user = userData;
      }
      
      const result: ProcessResult = {
        recordId: vehicle.id,
        plateNumber: vehicle.plate_number,
        userName: user?.name || null,
        userId: user?.id || null,
        currentBalance: parseFloat(user?.balance || '0'),
        fee,
        canDeduct: parseFloat(user?.balance || '0') >= fee,
      };

      if (!dryRun && result.canDeduct && user) {
        // 执行扣费
        const newBalance = result.currentBalance - fee;
        
        // 更新用户余额
        await client
          .from('users')
          .update({ balance: newBalance.toString() })
          .eq('id', user.id);
        
        // 更新停车记录
        await client
          .from('vehicle_records')
          .update({
            status: 'completed',
            exit_time: new Date().toISOString(),
            duration: Math.floor((new Date().getTime() - new Date(vehicle.entry_time).getTime()) / (1000 * 60)),
            fee: fee.toString(),
          })
          .eq('id', vehicle.id);
        
        // 创建缴费记录
        await client
          .from('payment_records')
          .insert({
            user_id: user.id,
            record_id: vehicle.id,
            plate_number: vehicle.plate_number,
            amount: fee,
            payment_method: 'balance',
            status: 'completed',
            description: '逾期自动扣费',
          });
        
        result.deducted = true;
        result.newBalance = newBalance;
      }

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      dryRun,
      processedCount: results.length,
      results,
      message: dryRun 
        ? `发现 ${results.length} 辆逾期车辆` 
        : `已处理 ${results.filter((r: ProcessResult) => r.deducted).length} 辆逾期车辆`,
    });
  } catch (error) {
    console.error('Auto deduct error:', error);
    return NextResponse.json(
      { error: 'Failed to process auto deduction' },
      { status: 500 }
    );
  }
}

// 检查逾期状态
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    
    // 查询所有在场车辆
    const { data: parkedVehicles, error } = await client
      .from('vehicle_records')
      .select('*')
      .eq('status', 'parked');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 计算逾期状态和预估费用
    const vehiclesWithStatus = await Promise.all((parkedVehicles || []).map(async (v: { 
      id: string;
      plate_number: string;
      entry_time: string;
      status: string;
      user_id: string | null;
    }) => {
      const overdue = isOverdue(v.entry_time);
      const estimatedFee = calculateFee(v.entry_time, new Date().toISOString());
      
      const entry = new Date(v.entry_time);
      const now = new Date();
      const durationMinutes = Math.floor((now.getTime() - entry.getTime()) / (1000 * 60));

      // 查询用户余额
      let userBalance = 0;
      if (v.user_id) {
        const { data: user } = await client
          .from('users')
          .select('balance')
          .eq('id', v.user_id)
          .single();
        userBalance = parseFloat(user?.balance || '0');
      }

      return {
        id: v.id,
        plateNumber: v.plate_number,
        entryTime: v.entry_time,
        duration: `${Math.floor(durationMinutes / 60)}小时${durationMinutes % 60}分钟`,
        isOverdue: overdue,
        estimatedFee,
        userBalance,
        canAfford: userBalance >= estimatedFee,
      };
    }));

    const overdueCount = vehiclesWithStatus.filter((v: { isOverdue: boolean }) => v.isOverdue).length;

    return NextResponse.json({
      success: true,
      totalParked: vehiclesWithStatus.length,
      overdueCount,
      vehicles: vehiclesWithStatus,
    });
  } catch (error) {
    console.error('Check overdue error:', error);
    return NextResponse.json(
      { error: 'Failed to check overdue status' },
      { status: 500 }
    );
  }
}
