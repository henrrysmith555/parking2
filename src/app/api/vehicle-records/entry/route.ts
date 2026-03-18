import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 车辆入场
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { 
      plateNumber, 
      spotId, 
      lotId, 
      vehicleType, 
      driverName, 
      driverPhone, 
      userId: providedUserId,
      videoUrl, 
      notes 
    } = body;

    // 检查黑名单
    const { data: blacklisted } = await client
      .from('blacklists')
      .select('id, reason')
      .eq('plate_number', plateNumber.toUpperCase())
      .single();

    if (blacklisted) {
      return NextResponse.json(
        { error: `禁止入场：该车辆已被列入黑名单（原因：${blacklisted.reason}）` },
        { status: 403 }
      );
    }

    // 检查车牌是否已在场内
    const { data: existingRecord } = await client
      .from('vehicle_records')
      .select('id')
      .eq('plate_number', plateNumber.toUpperCase())
      .eq('status', 'parked')
      .single();

    if (existingRecord) {
      return NextResponse.json(
        { error: '该车辆已在停车场内' },
        { status: 400 }
      );
    }

    // 检查车位是否可用
    const { data: spot } = await client
      .from('parking_spots')
      .select('*')
      .eq('id', spotId)
      .single();

    if (!spot || spot.status !== 'available') {
      return NextResponse.json(
        { error: '车位不可用' },
        { status: 400 }
      );
    }

    // 确定用户ID（优先使用传入的userId，否则通过车牌号查找）
    let userId = providedUserId || null;
    if (!userId) {
      const { data: user } = await client
        .from('users')
        .select('id')
        .eq('plate_number', plateNumber.toUpperCase())
        .single();
      
      if (user) {
        userId = user.id;
      }
    }

    const now = new Date().toISOString();

    // 1. 创建入场记录
    const { data: record, error: recordError } = await client
      .from('vehicle_records')
      .insert({
        user_id: userId,
        plate_number: plateNumber.toUpperCase(),
        spot_id: spotId,
        lot_id: lotId,
        vehicle_type: vehicleType || 'sedan',
        driver_name: driverName,
        driver_phone: driverPhone,
        video_url: videoUrl || null,
        notes: notes,
        status: 'parked',
      })
      .select()
      .single();

    if (recordError) {
      return NextResponse.json({ error: recordError.message }, { status: 500 });
    }

    // 2. 创建预约记录（用于预约管理显示，仅当有用户时创建）
    let reservation = null;
    if (userId) {
      const { data: reservationData, error: reservationError } = await client
        .from('reservations')
        .insert({
          user_id: userId,
          plate_number: plateNumber.toUpperCase(),
          lot_id: lotId,
          spot_id: spotId,
          status: 'confirmed',
          reservation_time: now,
          start_time: now,
          driver_name: driverName,
          driver_phone: driverPhone,
        })
        .select()
        .single();

      if (reservationError) {
        console.error('Create reservation error:', reservationError);
        // 不影响入场流程
      } else {
        reservation = reservationData;
      }
    }

    // 3. 更新车辆记录关联预约ID
    if (reservation) {
      await client
        .from('vehicle_records')
        .update({ reservation_id: reservation.id })
        .eq('id', record.id);
    }

    // 4. 更新车位状态
    await client
      .from('parking_spots')
      .update({
        status: 'occupied',
        vehicle_id: record.id,
        updated_at: now,
      })
      .eq('id', spotId);

    // 5. 记录操作日志
    await client.from('operation_logs').insert({
      user_id: userId,
      action: 'entry',
      module: 'vehicle',
      description: `管理员手动入场：${plateNumber.toUpperCase()}，车位：${spot.spot_number}`,
      details: JSON.stringify({ 
        recordId: record.id,
        reservationId: reservation?.id,
        plateNumber: plateNumber.toUpperCase(),
        spotId,
        lotId,
        userId,
      }),
    });

    return NextResponse.json({ 
      data: record,
      reservation: reservation,
      message: userId ? '入场成功，已关联用户账户' : '入场成功'
    });
  } catch (error) {
    console.error('Entry error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
