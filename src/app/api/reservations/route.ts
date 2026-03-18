import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 解析 numeric 类型
function parseNumeric(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (typeof value === 'object') {
    const str = String(value);
    const match = str.match(/\{(\d+)/);
    if (match) {
      return parseInt(match[1]) / 100;
    }
  }
  return 0;
}

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    
    let query = client
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Fetch reservations error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 手动获取关联数据
    if (data && data.length > 0) {
      // 获取用户信息
      const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))];
      const lotIds = [...new Set(data.map(r => r.lot_id).filter(Boolean))];
      const spotIds = [...new Set(data.map(r => r.spot_id).filter(Boolean))];

      const [usersResult, lotsResult, spotsResult] = await Promise.all([
        userIds.length > 0 ? client.from('users').select('id, name, username, phone').in('id', userIds) : { data: [] },
        lotIds.length > 0 ? client.from('parking_lots').select('id, name, location').in('id', lotIds) : { data: [] },
        spotIds.length > 0 ? client.from('parking_spots').select('id, spot_number, floor, zone, status').in('id', spotIds) : { data: [] },
      ]);

      const userMap = new Map((usersResult.data || []).map(u => [u.id, u]));
      const lotMap = new Map((lotsResult.data || []).map(l => [l.id, l]));
      const spotMap = new Map((spotsResult.data || []).map(s => [s.id, s]));

      // 获取已完成预约的费用信息
      const completedReservationIds = data.filter(r => r.status === 'completed').map(r => r.id);
      const plateNumbers = [...new Set(data.map(r => r.plate_number))];
      
      // 从 payment_records 获取费用
      const { data: paymentRecords } = await client
        .from('payment_records')
        .select('plate_number, amount, created_at')
        .in('plate_number', plateNumbers)
        .eq('status', 'completed');

      // 创建费用映射（按车牌和时间匹配）
      const feeMap: Record<string, number> = {};
      paymentRecords?.forEach(record => {
        feeMap[record.plate_number] = parseNumeric(record.amount);
      });

      const reservationsWithDetails = data.map(res => ({
        ...res,
        users: res.user_id ? userMap.get(res.user_id) || null : null,
        parking_lots: res.lot_id ? lotMap.get(res.lot_id) || null : null,
        parking_spots: res.spot_id ? spotMap.get(res.spot_id) || null : null,
        // 已完成的预约显示实际费用
        actual_fee: res.status === 'completed' ? (feeMap[res.plate_number] || 0) : null,
      }));

      return NextResponse.json({ data: reservationsWithDetails });
    }
    
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { userId, plateNumber, lotId, spotId, startTime } = body;

    if (!userId || !plateNumber || !lotId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, plateNumber, lotId are required' },
        { status: 400 }
      );
    }

    // 检查黑名单
    const { data: blacklisted } = await client
      .from('blacklists')
      .select('id, reason')
      .ilike('plate_number', plateNumber.trim())
      .single();

    if (blacklisted) {
      return NextResponse.json(
        { error: '您已被酒店拉黑，无法预约停车，请联系管理员', blacklisted: true },
        { status: 403 }
      );
    }

    // 检查是否已有未完成的预约（该用户）
    const { data: existingUser } = await client
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'confirmed']);

    if (existingUser && existingUser.length > 0) {
      return NextResponse.json(
        { error: '您已有未完成的预约，请先结束当前停车' },
        { status: 400 }
      );
    }

    // 检查该车牌是否有未完成的预约
    const { data: existingPlate } = await client
      .from('reservations')
      .select('*')
      .eq('plate_number', plateNumber)
      .in('status', ['pending', 'confirmed']);

    if (existingPlate && existingPlate.length > 0) {
      return NextResponse.json(
        { error: '该车牌已有未完成的预约' },
        { status: 400 }
      );
    }

    // 如果选择了车位，检查车位状态
    if (spotId) {
      const { data: spot } = await client
        .from('parking_spots')
        .select('*')
        .eq('id', spotId)
        .single();
      
      if (!spot) {
        return NextResponse.json(
          { error: '车位不存在' },
          { status: 400 }
        );
      }
      
      if (spot.status !== 'available') {
        return NextResponse.json(
          { error: '该车位已被占用或正在维护' },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const entryTime = startTime || now.toISOString();
    
    // 创建预约 - 直接确认为 confirmed 状态
    const { data: reservation, error: resError } = await client
      .from('reservations')
      .insert({
        user_id: userId,
        plate_number: plateNumber,
        lot_id: lotId,
        spot_id: spotId || null,
        reservation_time: now.toISOString(),
        start_time: entryTime,
        status: 'confirmed',
      })
      .select()
      .single();

    if (resError) {
      console.error('Reservation error:', resError);
      return NextResponse.json({ error: resError.message }, { status: 500 });
    }

    // 如果选择了车位，更新车位状态为占用并创建车辆入场记录
    if (spotId) {
      // 更新车位状态
      await client
        .from('parking_spots')
        .update({ status: 'occupied', updated_at: new Date().toISOString() })
        .eq('id', spotId);

      // 创建车辆入场记录
      await client
        .from('vehicle_records')
        .insert({
          user_id: userId,
          plate_number: plateNumber,
          spot_id: spotId,
          lot_id: lotId,
          vehicle_type: 'sedan',
          entry_time: entryTime,
          status: 'parked',
          reservation_id: reservation.id,
        });
    }

    // 更新停车场可用车位
    const { data: lot } = await client
      .from('parking_lots')
      .select('available_spots')
      .eq('id', lotId)
      .single();

    if (lot && lot.available_spots > 0) {
      await client
        .from('parking_lots')
        .update({ available_spots: lot.available_spots - 1 })
        .eq('id', lotId);
    }

    // 记录操作日志
    await client.from('operation_logs').insert({
      user_id: userId,
      action: 'create',
      module: 'reservation',
      description: `用户预约车位：${plateNumber} -> 车位${spotId || '未指定'}`,
      details: JSON.stringify({ reservationId: reservation.id, plateNumber, lotId, spotId }),
    });

    // 返回完整信息
    const [userResult, lotResult, spotResult] = await Promise.all([
      client.from('users').select('id, name, username, phone').eq('id', userId).single(),
      client.from('parking_lots').select('id, name, location').eq('id', lotId).single(),
      spotId ? client.from('parking_spots').select('id, spot_number, floor, zone, status').eq('id', spotId).single() : { data: null },
    ]);

    return NextResponse.json({ 
      data: {
        ...reservation,
        users: userResult.data,
        parking_lots: lotResult.data,
        parking_spots: spotResult.data,
      }, 
      success: true 
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    );
  }
}
