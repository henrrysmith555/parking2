import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取车位列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lotId = searchParams.get('lotId');
    const status = searchParams.get('status');
    const floor = searchParams.get('floor');

    const client = getSupabaseClient();

    let query = client
      .from('parking_spots')
      .select('*')
      .order('spot_number', { ascending: true });

    if (lotId) {
      query = query.eq('lot_id', lotId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (floor) {
      query = query.eq('floor', floor);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Get parking spots error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 创建车位
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('parking_spots')
      .insert({
        lot_id: body.lotId,
        spot_number: body.spotNumber,
        status: body.status || 'available',
        floor: body.floor || '1',
        zone: body.zone || 'A',
        type: body.type || 'regular',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Create parking spot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
