import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取停车场列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const client = getSupabaseClient();

    let query = client
      .from('parking_lots')
      .select('*')
      .order('created_at', { ascending: false });

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: lots, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 统计每个停车场的实际车位数量
    const lotsWithStats = await Promise.all(
      (lots || []).map(async (lot) => {
        // 统计该停车场的总车位数
        const { count: totalSpots } = await client
          .from('parking_spots')
          .select('*', { count: 'exact', head: true })
          .eq('lot_id', lot.id);

        // 统计该停车场的空闲车位数
        const { count: availableSpots } = await client
          .from('parking_spots')
          .select('*', { count: 'exact', head: true })
          .eq('lot_id', lot.id)
          .eq('status', 'available');

        return {
          ...lot,
          total_spots: totalSpots || 0,
          available_spots: availableSpots || 0,
        };
      })
    );

    return NextResponse.json({ data: lotsWithStats });
  } catch (error) {
    console.error('Get parking lots error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 创建停车场
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('parking_lots')
      .insert({
        name: body.name,
        location: body.location,
        description: body.description,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Create parking lot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
