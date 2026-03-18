import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取车位状态统计
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const lotId = searchParams.get('lotId');

    let query = client.from('parking_spots').select('status, type');

    if (lotId) {
      query = query.eq('lot_id', lotId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const statistics = {
      total: data?.length || 0,
      available: data?.filter(s => s.status === 'available').length || 0,
      occupied: data?.filter(s => s.status === 'occupied').length || 0,
      reserved: data?.filter(s => s.status === 'reserved').length || 0,
      maintenance: data?.filter(s => s.status === 'maintenance').length || 0,
      byType: {
        regular: data?.filter(s => s.type === 'regular').length || 0,
        charging: data?.filter(s => s.type === 'charging').length || 0,
        disabled: data?.filter(s => s.type === 'disabled').length || 0,
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
