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

// 获取用户停车统计数据
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 1. 获取用户的停车记录（从 reservations 表）
    const { data: reservations, error: resError } = await client
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (resError) {
      console.error('Fetch reservations error:', resError);
    }

    // 2. 获取车辆进出记录（包含操作来源信息）
    const reservationIds = (reservations || []).map(r => r.id).filter(Boolean);
    const { data: vehicleRecords } = reservationIds.length > 0 
      ? await client
          .from('vehicle_records')
          .select('reservation_id, notes')
          .in('reservation_id', reservationIds)
      : { data: [] };
    
    // 创建预约ID到车辆记录的映射
    const vehicleRecordMap = new Map(
      (vehicleRecords || []).map(v => [v.reservation_id, v])
    );

    // 手动获取关联数据
    let lotMap = new Map();
    let spotMap = new Map();
    
    if (reservations && reservations.length > 0) {
      const lotIds = [...new Set(reservations.map(r => r.lot_id).filter(Boolean))];
      const spotIds = [...new Set(reservations.map(r => r.spot_id).filter(Boolean))];
      
      const [lotsResult, spotsResult] = await Promise.all([
        lotIds.length > 0 ? client.from('parking_lots').select('id, name, location').in('id', lotIds) : { data: [] },
        spotIds.length > 0 ? client.from('parking_spots').select('id, spot_number, floor, zone').in('id', spotIds) : { data: [] },
      ]);
      
      lotMap = new Map((lotsResult.data || []).map(l => [l.id, l]));
      spotMap = new Map((spotsResult.data || []).map(s => [s.id, s]));
    }

    // 3. 获取用户的缴费记录（从 payment_records 表）
    const { data: payments, error: payError } = await client
      .from('payment_records')
      .select('plate_number, amount, created_at, description')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (payError) {
      console.error('Fetch payments error:', payError);
    }

    // 创建车牌到费用的映射（从 payment_records 获取实际费用）
    const feeMap = new Map<string, number>();
    (payments || []).forEach(p => {
      const amount = parseNumeric(p.amount);
      // 只保留最新的费用记录
      if (!feeMap.has(p.plate_number)) {
        feeMap.set(p.plate_number, amount);
      }
    });

    // 4. 计算统计数据
    const completedReservations = (reservations || []).filter(r => r.status === 'completed');
    
    // 停车次数（已完成的预约）
    const parkingCount = completedReservations.length;
    
    // 累计停车时长（分钟）
    let totalDurationMinutes = 0;
    completedReservations.forEach(r => {
      if (r.start_time && r.end_time) {
        const start = new Date(r.start_time);
        const end = new Date(r.end_time);
        totalDurationMinutes += Math.ceil((end.getTime() - start.getTime()) / (1000 * 60));
      }
    });
    
    // 累计消费（从 payment_records 实际支付金额计算）
    const totalFee = (payments || []).reduce((sum, p) => sum + parseNumeric(p.amount), 0);

    // 5. 格式化停车记录
    const records = (reservations || []).map(r => {
      let duration = null;
      let fee = null;
      let operatorType = 'user'; // 默认用户自助
      
      if (r.start_time && r.end_time) {
        const start = new Date(r.start_time);
        const end = new Date(r.end_time);
        duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60));
        
        // 从 payment_records 获取实际费用（与管理员端一致）
        fee = feeMap.get(r.plate_number) || 0;
      }
      
      // 从车辆记录获取操作来源
      const vehicleRecord = vehicleRecordMap.get(r.id);
      if (vehicleRecord?.notes) {
        operatorType = vehicleRecord.notes.includes('管理员') ? 'admin' : 'user';
      }
      
      return {
        id: r.id,
        plate_number: r.plate_number,
        entry_time: r.start_time,
        exit_time: r.end_time,
        duration,
        fee,
        status: r.status,
        operatorType, // 添加操作来源
        parking_lots: r.lot_id ? lotMap.get(r.lot_id) || null : null,
        parking_spots: r.spot_id ? spotMap.get(r.spot_id) || null : null,
      };
    });

    return NextResponse.json({
      data: {
        stats: {
          parkingCount,
          totalDurationMinutes,
          totalFee,
        },
        records,
      }
    });
  } catch (error) {
    console.error('Error fetching user records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
