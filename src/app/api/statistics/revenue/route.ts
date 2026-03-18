import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 解析 PostgreSQL numeric 类型
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

// 获取收入统计 - 从 payment_records 表获取
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 从 payment_records 表获取已完成的支付记录
    let query = client
      .from('payment_records')
      .select('amount, created_at')
      .eq('status', 'completed');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 按日期分组统计
    const dailyRevenue: Record<string, number> = {};
    data?.forEach(record => {
      const date = new Date(record.created_at).toISOString().split('T')[0];
      const amount = parseNumeric(record.amount);
      dailyRevenue[date] = (dailyRevenue[date] || 0) + amount;
    });

    const totalRevenue = Object.values(dailyRevenue).reduce((sum, val) => sum + val, 0);

    return NextResponse.json({
      data: {
        total: totalRevenue,
        daily: dailyRevenue,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
