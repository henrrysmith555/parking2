import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取总览统计数据
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();

    // 获取所有停车场
    const { data: lots } = await client
      .from('parking_lots')
      .select('id, name, location')
      .eq('is_active', true);

    // 获取所有车位数据，按停车场分组统计
    const { data: allSpots } = await client
      .from('parking_spots')
      .select('id, lot_id, status');

    // 实时计算每个停车场的车位统计
    const lotStats: Record<string, { total: number; available: number; occupied: number; maintenance: number }> = {};
    
    allSpots?.forEach(spot => {
      if (!lotStats[spot.lot_id]) {
        lotStats[spot.lot_id] = { total: 0, available: 0, occupied: 0, maintenance: 0 };
      }
      lotStats[spot.lot_id].total++;
      if (spot.status === 'available') lotStats[spot.lot_id].available++;
      else if (spot.status === 'occupied') lotStats[spot.lot_id].occupied++;
      else if (spot.status === 'maintenance') lotStats[spot.lot_id].maintenance++;
    });

    // 组装停车场列表数据（实时计算）
    const parkingLotsList = lots?.map(lot => ({
      id: lot.id,
      name: lot.name,
      location: lot.location,
      total_spots: lotStats[lot.id]?.total || 0,
      available_spots: lotStats[lot.id]?.available || 0,
      occupied_spots: lotStats[lot.id]?.occupied || 0,
      maintenance_spots: lotStats[lot.id]?.maintenance || 0,
    })) || [];

    // 解析 PostgreSQL numeric 类型
    const parseNumeric = (value: any): number => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseFloat(value) || 0;
      // PostgreSQL numeric 类型可能返回对象 {value, scale, ...}
      if (typeof value === 'object') {
        // 尝试从对象中提取值
        const str = String(value);
        const match = str.match(/\{(\d+)/);
        if (match) {
          return parseInt(match[1]) / 100; // 假设 scale 为 2
        }
      }
      return 0;
    };

    // 获取今日入场车辆数 - 使用本地时区日期
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    // 获取今日入场（entry_time 在今天）
    const { count: todayEntries } = await client
      .from('vehicle_records')
      .select('*', { count: 'exact', head: true })
      .gte('entry_time', todayStr)
      .lt('entry_time', `${todayStr}T23:59:59`);

    // 获取今日出场（exit_time 在今天且不为空）
    const { count: todayExits } = await client
      .from('vehicle_records')
      .select('*', { count: 'exact', head: true })
      .gte('exit_time', todayStr)
      .lt('exit_time', `${todayStr}T23:59:59`)
      .not('exit_time', 'is', null);

    // 获取当前在场车辆数
    const { count: currentParked } = await client
      .from('vehicle_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'parked');

    // 获取今日收入 - 从 payment_records 表获取当天完成的支付记录
    const { data: todayPayments } = await client
      .from('payment_records')
      .select('amount')
      .gte('created_at', todayStr)
      .lt('created_at', `${todayStr}T23:59:59`)
      .eq('status', 'completed');

    const todayRevenue = todayPayments?.reduce((sum, record) => {
      const amount = parseNumeric(record.amount);
      return sum + amount;
    }, 0) || 0;

    // 计算总车位统计
    const totalStats = {
      total: allSpots?.length || 0,
      available: allSpots?.filter(s => s.status === 'available').length || 0,
      occupied: allSpots?.filter(s => s.status === 'occupied').length || 0,
      maintenance: allSpots?.filter(s => s.status === 'maintenance').length || 0,
    };

    const statistics = {
      parkingLots: {
        total: lots?.length || 0,
        list: parkingLotsList,
      },
      parkingSpots: totalStats,
      today: {
        entries: todayEntries || 0,
        exits: todayExits || 0,
        revenue: todayRevenue,
      },
      current: {
        parked: currentParked || 0,
      },
    };

    return NextResponse.json({ data: statistics });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
