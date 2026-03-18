import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    // 先获取记录信息，用于释放车位
    const { data: record } = await client
      .from('vehicle_records')
      .select('spot_id')
      .eq('id', id)
      .single();

    // 删除记录
    const { error } = await client
      .from('vehicle_records')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 释放车位状态
    if (record?.spot_id) {
      await client
        .from('parking_spots')
        .update({ status: 'available' })
        .eq('id', record.spot_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle record:', error);
    return NextResponse.json({ error: 'Failed to delete vehicle record' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    const { video_url } = body;

    const { data, error } = await client
      .from('vehicle_records')
      .update({ video_url })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating vehicle record:', error);
    return NextResponse.json({ error: 'Failed to update vehicle record' }, { status: 500 });
  }
}
