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

// 车辆出场（管理员使用）
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json({ error: '缺少记录ID' }, { status: 400 });
    }

    // 获取入场记录
    const { data: record, error: recordError } = await client
      .from('vehicle_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (recordError) {
      console.error('Fetch record error:', recordError);
      return NextResponse.json({ error: '未找到入场记录' }, { status: 404 });
    }
    if (!record) {
      return NextResponse.json({ error: '未找到入场记录' }, { status: 404 });
    }

    if (record.status !== 'parked') {
      return NextResponse.json({ error: '该车辆已出场' }, { status: 400 });
    }

    const now = new Date();
    const exitTime = now.toISOString();
    const entryTime = record.entry_time;
    const fee = calculateFee(entryTime, now);
    const durationMinutes = Math.ceil((now.getTime() - new Date(entryTime).getTime()) / 60000);

    let newBalance: number | undefined;

    // 如果有用户ID，扣除余额
    if (record.user_id) {
      const { data: user, error: userError } = await client
        .from('users')
        .select('balance, name')
        .eq('id', record.user_id)
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
        .eq('id', record.user_id);

      if (balanceError) {
        console.error('Update balance error:', balanceError);
        return NextResponse.json({ error: '扣费失败' }, { status: 500 });
      }

      // 创建缴费记录
      await client
        .from('payment_records')
        .insert({
          user_id: record.user_id,
          plate_number: record.plate_number,
          amount: fee,
          payment_method: 'balance',
          status: 'completed',
          description: '管理员出场操作-停车缴费',
        });
    }

    // 1. 更新车辆记录
    const { data: updatedRecord, error: updateError } = await client
      .from('vehicle_records')
      .update({
        exit_time: exitTime,
        duration: durationMinutes,
        fee: fee.toString(),
        status: 'completed',
        notes: '管理员手动出场', // 标记为管理员操作
      })
      .eq('id', recordId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. 更新预约状态
    if (record.reservation_id) {
      await client
        .from('reservations')
        .update({
          status: 'completed',
          end_time: exitTime,
        })
        .eq('id', record.reservation_id);
    }

    // 3. 更新车位状态
    await client
      .from('parking_spots')
      .update({
        status: 'available',
        vehicle_id: null,
        updated_at: exitTime,
      })
      .eq('id', record.spot_id);

    // 4. 记录操作日志
    await client.from('operation_logs').insert({
      user_id: record.user_id || null,
      action: 'exit',
      module: 'vehicle',
      description: `管理员出场操作：${record.plate_number}，费用：${fee}元`,
      details: JSON.stringify({ 
        recordId, 
        reservationId: record.reservation_id,
        fee, 
        duration: durationMinutes,
        entryTime, 
        exitTime,
        userId: record.user_id,
        newBalance,
      }),
    });

    return NextResponse.json({ 
      data: {
        ...updatedRecord,
        calculatedFee: fee,
        duration: durationMinutes,
        newBalance: newBalance?.toFixed(2),
      },
      message: record.user_id 
        ? `出场成功，已从用户余额扣除 ${fee} 元` 
        : '出场成功',
    });
  } catch (error) {
    console.error('Exit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
