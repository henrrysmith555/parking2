import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 计算停车费用 - 每小时10元，不足1小时按1小时计算
function calculateFee(entryTime: string, exitTime: Date = new Date()): number {
  const entry = new Date(entryTime);
  const durationMinutes = Math.ceil((exitTime.getTime() - entry.getTime()) / 60000);
  
  // 不足1小时按1小时计算，每小时10元
  const hours = Math.ceil(durationMinutes / 60);
  return hours * 10;
}

// 管理员手动让车辆出场
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { recordId, reservationId, userId, spotId, plateNumber } = body;

    if (!recordId) {
      return NextResponse.json({ error: '缺少记录ID' }, { status: 400 });
    }

    // 获取车辆记录
    const { data: record, error: recordError } = await client
      .from('vehicle_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (recordError || !record) {
      return NextResponse.json({ error: '未找到车辆记录' }, { status: 404 });
    }

    if (record.status !== 'parked') {
      return NextResponse.json({ error: '该车辆已出场' }, { status: 400 });
    }

    const now = new Date();
    const entryTime = record.entry_time;
    const fee = calculateFee(entryTime, now);
    const durationMinutes = Math.ceil((now.getTime() - new Date(entryTime).getTime()) / 60000);

    let newBalance: number | undefined;

    // 如果有用户ID，扣除余额
    if (userId) {
      const { data: user, error: userError } = await client
        .from('users')
        .select('balance, name')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 400 });
      }

      const currentBalance = parseFloat(user.balance || '0');

      if (currentBalance < fee) {
        return NextResponse.json({ 
          error: `用户余额不足，需要支付 ${fee} 元，当前余额 ${currentBalance.toFixed(2)} 元` 
        }, { status: 400 });
      }

      newBalance = currentBalance - fee;

      // 更新用户余额
      const { error: balanceError } = await client
        .from('users')
        .update({ balance: newBalance.toFixed(2) })
        .eq('id', userId);

      if (balanceError) {
        console.error('Update balance error:', balanceError);
        return NextResponse.json({ error: '扣费失败' }, { status: 500 });
      }

      // 创建缴费记录
      await client
        .from('payment_records')
        .insert({
          user_id: userId,
          plate_number: plateNumber,
          amount: fee,
          payment_method: 'balance',
          status: 'completed',
          description: '管理员手动出场-停车缴费',
        });
    }

    // 更新车辆记录
    const { error: updateRecordError } = await client
      .from('vehicle_records')
      .update({
        exit_time: now.toISOString(),
        duration: durationMinutes,
        fee: fee.toString(),
        status: 'completed',
      })
      .eq('id', recordId);

    if (updateRecordError) {
      console.error('Update vehicle record error:', updateRecordError);
      return NextResponse.json({ error: '更新车辆记录失败' }, { status: 500 });
    }

    // 更新预约状态
    if (reservationId) {
      await client
        .from('reservations')
        .update({
          status: 'completed',
          end_time: now.toISOString(),
        })
        .eq('id', reservationId);
    }

    // 更新车位状态为空闲
    if (spotId) {
      await client
        .from('parking_spots')
        .update({ status: 'available' })
        .eq('id', spotId);
    }

    // 记录操作日志
    await client.from('operation_logs').insert({
      user_id: userId || null,
      action: 'manual_exit',
      module: 'vehicle_records',
      description: `管理员手动出场：${plateNumber}，费用：${fee}元`,
      details: JSON.stringify({ 
        recordId, 
        reservationId,
        fee, 
        duration: durationMinutes,
        entryTime, 
        exitTime: now.toISOString(),
        userId,
      }),
    });

    return NextResponse.json({ 
      success: true,
      data: {
        fee,
        duration: durationMinutes,
        newBalance: newBalance?.toFixed(2),
      }
    });
  } catch (error) {
    console.error('Manual exit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
