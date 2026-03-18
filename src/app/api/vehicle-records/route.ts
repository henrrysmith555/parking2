import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取车辆记录列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const plateNumber = searchParams.get('plateNumber');
    const lotId = searchParams.get('lotId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = client
      .from('vehicle_records')
      .select('*')
      .order('entry_time', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }
    if (plateNumber) {
      query = query.ilike('plate_number', `%${plateNumber}%`);
    }
    if (lotId) {
      query = query.eq('lot_id', lotId);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Vehicle records query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 手动获取关联数据
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))];
      const spotIds = [...new Set(data.map(r => r.spot_id).filter(Boolean))];
      const lotIds = [...new Set(data.map(r => r.lot_id).filter(Boolean))];

      const [usersResult, spotsResult, lotsResult] = await Promise.all([
        userIds.length > 0 ? client.from('users').select('id, name, username, phone').in('id', userIds) : { data: [] },
        spotIds.length > 0 ? client.from('parking_spots').select('id, spot_number, zone, floor').in('id', spotIds) : { data: [] },
        lotIds.length > 0 ? client.from('parking_lots').select('id, name, location').in('id', lotIds) : { data: [] },
      ]);

      const userMap = new Map((usersResult.data || []).map(u => [u.id, u]));
      const spotMap = new Map((spotsResult.data || []).map(s => [s.id, s]));
      const lotMap = new Map((lotsResult.data || []).map(l => [l.id, l]));
      
      // 合并关联信息
      const recordsWithDetails = data.map(record => ({
        ...record,
        users: record.user_id ? userMap.get(record.user_id) || null : null,
        parking_spots: record.spot_id ? spotMap.get(record.spot_id) || null : null,
        parking_lots: record.lot_id ? lotMap.get(record.lot_id) || null : null,
      }));
      
      return NextResponse.json({ data: recordsWithDetails });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error fetching vehicle records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
