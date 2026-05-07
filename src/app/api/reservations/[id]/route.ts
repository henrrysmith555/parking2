import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

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

    // 检查是否为预约停车（有时间限制的）
    // 预约开始时间前30分钟内不可取消
    if (reservation.status === 'pending' && reservation.start_time) {
      const now = new Date();
      const startTime = new Date(reservation.start_time);
      const minutesUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60);

      // 如果距离预约开始时间不足30分钟，不允许取消
      if (minutesUntilStart <= 30) {
        return NextResponse.json({ 
          error: `距离预约开始时间不足30分钟，无法取消预约` 
        }, { status: 400 });
      }
    }

    // 如果预约已确认（已开始停车），需要检查余额并扣费
    if (reservation.status === 'confirmed' && reservation.spot_id) {
      // 获取用户余额
      const { data: user } = await client
        .from('users')
        .select('balance, id')
        .eq('id', reservation.user_id)
        .single();
      
      if (user) {
        // 计算费用
        const entryTime = new Date(reservation.start_time);
        const exitTime = new Date();
        const hours = Math.ceil((exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60));
        const fee = hours * 10;
        
        // 检查余额是否足够
        const balance = typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance;
        if (balance < fee) {
          return NextResponse.json({ 
            error: `余额不足，当前余额${balance}元，停车费用${fee}元，请先充值` 
          }, { status: 400 });
        }
        
        // 扣除费用
        await client
          .from('users')
          .update({ balance: balance - fee })
          .eq('id', user.id);
        
        // 创建缴费记录
        await client
          .from('payment_records')
          .insert({
            user_id: reservation.user_id,
            plate_number: reservation.plate_number,
            amount: fee,
            payment_method: 'balance',
            status: 'completed',
          });
      }
      
      // 释放车位（从occupied改为available）
      await client
        .from('parking_spots')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('id', reservation.spot_id);
      
      // 更新停车场可用车位（+1）
      const { data: lot } = await client
        .from('parking_lots')
        .select('available_spots')
        .eq('id', reservation.lot_id)
        .single();
      
      if (lot) {
        await client
          .from('parking_lots')
          .update({ available_spots: lot.available_spots + 1 })
          .eq('id', reservation.lot_id);
      }
      
      // 删除车辆入场记录（已入场的车辆记录）
      await client
        .from('vehicle_records')
        .delete()
        .eq('reservation_id', id);
    }

    // 如果预约状态是pending（预约中但未入场），直接释放车位，不产生任何费用
    if (reservation.status === 'pending' && reservation.spot_id) {
      // 车位从reserved改为available
      await client
        .from('parking_spots')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('id', reservation.spot_id);
    }

    // 更新预约状态为已取消（不设置end_time，因为只是取消预约，没有实际停车）
    const { error } = await client
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '预约已取消' });
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

      // 如果是pending状态（预约中但未入场），直接取消，不扣费
      if (reservation.status === 'pending') {
        // 直接释放车位
        if (reservation.spot_id) {
          await client
            .from('parking_spots')
            .update({ status: 'available', updated_at: now.toISOString() })
            .eq('id', reservation.spot_id);
        }

        // 更新预约状态为已取消
        const { error: updateError } = await client
          .from('reservations')
          .update({ status: 'cancelled' })
          .eq('id', id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          message: '预约已取消',
          data: { status: 'cancelled' }
        });
      }

      // 如果是confirmed状态（已入场），结束停车但不自动扣费
      const entryTime = reservation.start_time || reservation.reservation_time;
      const exitTime = now;
      const durationMinutes = Math.ceil((exitTime.getTime() - new Date(entryTime).getTime()) / (1000 * 60));
      const totalHours = Math.ceil(durationMinutes / 60);
      const fee = totalHours * 10; // 每小时10元，不足1小时按1小时计算（与个人中心预估费用一致）

      // 1. 更新预约状态为未缴费（不自动扣费）
      const { error: updateError } = await client
        .from('reservations')
        .update({
          status: 'unpaid',  // 未缴费状态
          end_time: exitTime.toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error('Update reservation error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // 2. 更新车辆记录（不扣除费用，状态设为unpaid）
      if (reservation.spot_id) {
        await client
          .from('parking_spots')
          .update({ status: 'available' })
          .eq('id', reservation.spot_id);

        // 更新车辆记录为未缴费状态
        await client
          .from('vehicle_records')
          .update({
            exit_time: exitTime.toISOString(),
            duration: durationMinutes,
            status: 'unpaid',  // 未缴费状态
            fee: fee.toString(),
            notes: '待缴费',
          })
          .eq('reservation_id', id);
      }

      // 3. 记录操作日志
      await client.from('operation_logs').insert({
        user_id: cancelledBy || reservation.user_id,
        action: 'parking_end',
        module: 'parking',
        description: `${cancelledBy === 'admin' ? '管理员' : '用户'}结束停车：${reservation.plate_number}，待缴费：${fee}元`,
        details: JSON.stringify({
          reservationId: id,
          fee,
          duration: durationMinutes,
          durationHours: totalHours,
          entryTime,
          exitTime: exitTime.toISOString(),
        }),
      });

      return NextResponse.json({
        success: true,
        data: {
          fee,
          duration: durationMinutes,
          durationHours: totalHours,
          status: 'unpaid',
          message: '停车已结束，请前往充值缴费',
        },
        message: `停车已结束，费用 ${fee} 元待缴纳`
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
