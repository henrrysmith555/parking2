import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 计算停车费用 - 每小时10元，不足1小时按1小时计算
function calculateFee(entryTime: string, exitTime: Date = new Date()): number {
  const entry = new Date(entryTime);
  const duration = exitTime.getTime() - entry.getTime();
  const hours = Math.ceil(duration / (1000 * 60 * 60)); // 向上取整到小时
  
  // 每小时10元，不足1小时按1小时计算
  return hours * 10;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    
    // 先获取预约基本信息
    const { data: reservation, error } = await client
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Fetch reservation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }
    
    // 手动获取关联数据
    let users = null;
    let parking_lots = null;
    let parking_spots = null;
    
    if (reservation.user_id) {
      const { data: userData } = await client
        .from('users')
        .select('id, name, username, phone')
        .eq('id', reservation.user_id)
        .single();
      users = userData;
    }
    
    if (reservation.lot_id) {
      const { data: lotData } = await client
        .from('parking_lots')
        .select('id, name, location')
        .eq('id', reservation.lot_id)
        .single();
      parking_lots = lotData;
    }
    
    if (reservation.spot_id) {
      const { data: spotData } = await client
        .from('parking_spots')
        .select('id, spot_number, floor, zone, status')
        .eq('id', reservation.spot_id)
        .single();
      parking_spots = spotData;
    }
    
    const data = {
      ...reservation,
      users,
      parking_lots,
      parking_spots,
    };
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    // 获取预约信息
    const { data: reservation, error: fetchError } = await client
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json({ error: '预约不存在' }, { status: 404 });
    }

    // 删除关联的车辆记录
    await client
      .from('vehicle_records')
      .delete()
      .eq('reservation_id', id);

    // 删除预约记录
    const { error } = await client
      .from('reservations')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 如果预约状态是confirmed，释放车位
    if (reservation.status === 'confirmed' && reservation.spot_id) {
      await client
        .from('parking_spots')
        .update({ status: 'available' })
        .eq('id', reservation.spot_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json(
      { error: 'Failed to delete reservation' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    const { status, cancelledBy } = body;

    // 获取预约信息
    const { data: reservation, error: fetchError } = await client
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json({ error: '预约不存在' }, { status: 404 });
    }

    // 如果是取消预约（结束停车）
    if (status === 'cancelled' || status === 'completed') {
      const now = new Date();
      const entryTime = reservation.start_time || reservation.reservation_time;
      const fee = calculateFee(entryTime, now);

      // 获取用户余额
      const { data: user, error: userError } = await client
        .from('users')
        .select('balance, name')
        .eq('id', reservation.user_id)
        .single();

      if (userError || !user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 400 });
      }

      // 处理 decimal 类型 - 可能是字符串或数字
      let currentBalance: number;
      if (typeof user.balance === 'string') {
        currentBalance = parseFloat(user.balance);
      } else if (typeof user.balance === 'number') {
        currentBalance = user.balance;
      } else {
        currentBalance = 0;
      }

      // 余额检查
      if (currentBalance < fee) {
        return NextResponse.json({ 
          error: `余额不足，需要支付 ${fee} 元，当前余额 ${currentBalance.toFixed(2)} 元` 
        }, { status: 400 });
      }

      // 计算新余额
      const newBalance = currentBalance - fee;

      // 1. 扣除余额
      const { error: balanceError } = await client
        .from('users')
        .update({ balance: newBalance.toFixed(2) })
        .eq('id', reservation.user_id);

      if (balanceError) {
        console.error('Update balance error:', balanceError);
        return NextResponse.json({ error: '扣费失败' }, { status: 500 });
      }

      // 2. 更新预约状态（不使用 actual_fee 字段）
      const { error: updateError } = await client
        .from('reservations')
        .update({
          status: 'completed',
          end_time: now.toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error('Update reservation error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // 3. 创建缴费记录 - 根据操作者区分描述
      const isAdmin = cancelledBy === 'admin';
      const paymentDescription = isAdmin ? '管理员手动出场' : '用户自助出场';
      
      const { error: paymentError } = await client
        .from('payment_records')
        .insert({
          user_id: reservation.user_id,
          plate_number: reservation.plate_number,
          amount: fee,
          payment_method: 'balance',
          status: 'completed',
          description: `${paymentDescription}，车牌${reservation.plate_number}，费用${fee}元`,
        });

      if (paymentError) {
        console.error('Create payment record error:', paymentError);
        // 不影响主流程，仅记录错误
      }

      // 4. 更新车位状态为空闲
      if (reservation.spot_id) {
        await client
          .from('parking_spots')
          .update({ status: 'available' })
          .eq('id', reservation.spot_id);

        // 5. 更新车辆出场记录
        await client
          .from('vehicle_records')
          .update({
            exit_time: now.toISOString(),
            duration: Math.ceil((now.getTime() - new Date(entryTime).getTime()) / 60000),
            status: 'completed',
            fee: fee.toString(),
            notes: isAdmin ? '管理员手动出场' : '用户自助出场',
          })
          .eq('reservation_id', id);
      }

      // 6. 记录操作日志
      await client.from('operation_logs').insert({
        user_id: cancelledBy || reservation.user_id,
        action: 'payment',
        module: 'payment',
        description: `${isAdmin ? '管理员' : '用户'}结束停车：${reservation.plate_number}，费用：${fee}元`,
        details: JSON.stringify({ 
          reservationId: id, 
          fee, 
          entryTime, 
          exitTime: now.toISOString(),
          paymentMethod: 'balance',
          operator: isAdmin ? 'admin' : 'user',
        }),
      });

      // 计算停车时长
      const duration = Math.ceil((now.getTime() - new Date(entryTime).getTime()) / (1000 * 60 * 60));

      return NextResponse.json({ 
        data: { 
          fee, 
          duration,
          status: 'completed',
          newBalance: newBalance.toFixed(2),
          paymentMethod: 'balance',
        },
        success: true,
        message: `停车已结束，费用 ${fee} 元已从余额扣除`
      });
    }

    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  } catch (error) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to update reservation' },
      { status: 500 }
    );
  }
}
