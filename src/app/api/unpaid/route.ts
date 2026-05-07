import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取用户的未缴费停车记录
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 获取用户信息（包含车牌号）
    const { data: user, error: userError } = await client
      .from('users')
      .select('plate_number')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 获取该用户所有未缴费的预约（status = unpaid）
    const { data: unpaidReservations, error: reservationError } = await client
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'unpaid')
      .order('end_time', { ascending: false });

    if (reservationError) {
      return NextResponse.json({ error: reservationError.message }, { status: 500 });
    }

    // 获取停车场信息
    const { data: lots } = await client
      .from('parking_lots')
      .select('id, name');

    const lotMap = new Map(lots?.map(lot => [lot.id, lot.name]) || []);

    // 获取车位信息
    const { data: spots } = await client
      .from('parking_spots')
      .select('id, spot_number, floor, zone');

    const spotMap = new Map(spots?.map(spot => [spot.id, spot]) || []);

    // 组合数据
    const unpaidRecords = unpaidReservations?.map(res => {
      const lot = lotMap.get(res.lot_id);
      const spot = spotMap.get(res.spot_id);

      // 计算停车时长
      const entryTime = new Date(res.start_time);
      const exitTime = res.end_time ? new Date(res.end_time) : new Date();
      const durationMinutes = Math.ceil((exitTime.getTime() - entryTime.getTime()) / 60000);
      const hours = Math.ceil(durationMinutes / 60);
      // 计算费用：每小时10元，不足1小时按1小时计算（与个人中心一致）
      const fee = hours * 10;

      return {
        id: res.id,
        plate_number: res.plate_number,
        lot_name: lot || '未知停车场',
        spot_info: spot ? `${spot.floor}楼${spot.zone}区${spot.spot_number}号` : '未知车位',
        entry_time: res.start_time,
        exit_time: res.end_time,
        duration: durationMinutes,
        duration_text: `${hours}小时`,
        fee: fee,
        created_at: res.created_at,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: unpaidRecords,
      total: unpaidRecords.length,
      total_fee: unpaidRecords.reduce((sum, r) => sum + r.fee, 0),
    });
  } catch (error) {
    console.error('Get unpaid records error:', error);
    return NextResponse.json(
      { error: '获取未缴费记录失败' },
      { status: 500 }
    );
  }
}
