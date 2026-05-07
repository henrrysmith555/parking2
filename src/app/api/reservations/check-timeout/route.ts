import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 预约超时检查 - 保留30分钟后自动释放
export async function GET() {
  try {
    const client = getSupabaseClient();
    const now = new Date();

    // 查询所有confirmed状态的预约
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
      message: `检查完成，释放了 ${releasedCount} 个超时车位`,
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
