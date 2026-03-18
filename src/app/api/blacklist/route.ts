import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const plateNumber = searchParams.get('plateNumber');

    // 如果指定了车牌号，检查是否在黑名单中
    if (plateNumber) {
      const { data, error } = await client
        .from('blacklists')
        .select('id, reason')
        .ilike('plate_number', plateNumber.trim())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = 未找到数据
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ 
        data: data ? { isBlacklisted: true, reason: data.reason } : { isBlacklisted: false } 
      });
    }

    // 否则返回所有黑名单
    const { data, error } = await client
      .from('blacklists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    return NextResponse.json({ error: 'Failed to fetch blacklist' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { plateNumber, reason } = body;

    if (!plateNumber || !reason) {
      return NextResponse.json({ error: '车牌号和原因不能为空' }, { status: 400 });
    }

    // 检查是否已存在（不区分大小写）
    const { data: existing } = await client
      .from('blacklists')
      .select('id')
      .ilike('plate_number', plateNumber.trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: '该车牌已在黑名单中' }, { status: 400 });
    }

    const { data, error } = await client
      .from('blacklists')
      .insert({
        plate_number: plateNumber.trim(),
        reason,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error adding to blacklist:', error);
    return NextResponse.json({ error: 'Failed to add to blacklist' }, { status: 500 });
  }
}
