import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 预约超时检查 - 保留30分钟后自动释放
export async function GET() {
  try {
    const client = getSupabaseClient();
    const now = new Date();

    // 1. 处理pending状态的预约：预约时间到了自动转为confirmed并占用车位
    const { data: pendingReservations, error: pendingError } = await client
      .from('reservations')
      .select('*')
      .eq('status', 'pending');

    if (pendingError) {
      console.error('Check pending error:', pendingError);
      return NextResponse.json({ error: pendingError.message }, { status: 500 });
    }

    let activatedCount = 0;
    const activatedReservations: string[] = [];

    for (const reservation of pendingReservations || []) {
      if (!reservation.start_time || !reservation.spot_id) continue;

      const startTime = new Date(reservation.start_time);

      // 如果预约开始时间 <= 当前时间，自动激活预约
      if (startTime.getTime() <= now.getTime()) {
        // 1. 更新预约状态为confirmed
        await client
          .from('reservations')
          .update({ status: 'confirmed' })
          .eq('id', reservation.id);

        // 2. 更新车位状态为occupied
        await client
          .from('parking_spots')
          .update({ status: 'occupied', updated_at: now.toISOString() })
          .eq('id', reservation.spot_id);

        // 3. 创建车辆入场记录
        await client.from('vehicle_records').insert({
          user_id: reservation.user_id,
          plate_number: reservation.plate_number,
          spot_id: reservation.spot_id,
          lot_id: reservation.lot_id,
          vehicle_type: 'sedan',
          entry_time: now.toISOString(),
          status: 'parked',
          reservation_id: reservation.id,
        });

        // 4. 更新停车场可用车位
        const { data: lot } = await client
          .from('parking_lots')
          .select('available_spots')
          .eq('id', reservation.lot_id)
          .single();

        if (lot && lot.available_spots > 0) {
          await client
            .from('parking_lots')
            .update({ available_spots: lot.available_spots - 1 })
            .eq('id', reservation.lot_id);
        }

        // 5. 记录操作日志
        await client.from('operation_logs').insert({
          user_id: reservation.user_id || 'system',
          action: 'activate',
          module: 'reservation',
          description: `预约时间到达，车位自动激活，车牌${reservation.plate_number}`,
          details: JSON.stringify({
            reservationId: reservation.id,
            spotId: reservation.spot_id,
            startTime: reservation.start_time,
          }),
        });

        activatedCount++;
        activatedReservations.push(reservation.id);
      }
    }

    // 2. 处理confirmed状态的预约：检查是否超时30分钟未到场
    const { data: reservations, error } = await client
      .from('reservations')
      .select('*')
      .eq('status', 'confirmed');

    if (error) {
      console.error('Check timeout error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let releasedCount = 0;
    const releasedReservations: string[] = [];

    // 遍历所有预约，检查是否超时
    for (const reservation of reservations || []) {
      if (!reservation.reservation_time || !reservation.spot_id) continue;

      const reservationTime = new Date(reservation.reservation_time);
      const thirtyMinutesLater = new Date(reservationTime.getTime() + 30 * 60 * 1000);

      // 如果预约时间+30分钟 < 当前时间，则释放车位
      if (thirtyMinutesLater.getTime() < now.getTime()) {
        // 1. 更新车位状态为空闲
        await client
          .from('parking_spots')
          .update({ status: 'available' })
          .eq('id', reservation.spot_id);

        // 2. 更新预约状态为超时未到
        await client
          .from('reservations')
          .update({ status: 'timeout' })
          .eq('id', reservation.id);

        // 3. 创建车辆记录（按标准计费规则扣费）
        if (reservation.user_id) {
          // 计算费用：按预约时间到当前时间计算
          const hours = Math.ceil((now.getTime() - reservationTime.getTime()) / (1000 * 60 * 60));
          const fee = hours * 10;

          // 获取用户余额
          const { data: user } = await client
            .from('users')
            .select('balance')
            .eq('id', reservation.user_id)
            .single();

          if (user) {
            let balance = typeof user.balance === 'string' ? parseFloat(user.balance) : (user.balance || 0);
            
            // 如果余额足够则扣费
            if (balance >= fee) {
              balance -= fee;
              await client
                .from('users')
                .update({ balance })
                .eq('id', reservation.user_id);

              // 创建支付记录
              await client.from('payment_records').insert({
                user_id: reservation.user_id,
                plate_number: reservation.plate_number,
                amount: fee,
                payment_method: 'balance',
                status: 'completed',
                description: `预约超时未到场自动扣费，车牌${reservation.plate_number}，费用${fee}元`,
              });
            }
          }
        }

        // 4. 记录操作日志
        await client.from('operation_logs').insert({
          user_id: reservation.user_id || 'system',
          action: 'timeout',
          module: 'reservation',
          description: `预约超时未到场，车位自动释放，车牌${reservation.plate_number}`,
          details: JSON.stringify({
            reservationId: reservation.id,
            spotId: reservation.spot_id,
            reservationTime: reservation.reservation_time,
          }),
        });

        releasedCount++;
        releasedReservations.push(reservation.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `检查完成，激活了 ${activatedCount} 个预约，释放了 ${releasedCount} 个超时车位`,
      activated: activatedReservations,
      released: releasedReservations,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Check timeout error:', error);
    return NextResponse.json(
      { error: 'Failed to check timeout reservations' },
      { status: 500 }
    );
  }
}
