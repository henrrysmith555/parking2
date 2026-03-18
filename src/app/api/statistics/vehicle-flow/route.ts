import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取今日车流量数据 - 按小时统计
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    // 使用本地时区日期
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    const date = searchParams.get('date') || todayStr;

    // 计算下一天的日期
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextYear = tomorrow.getFullYear();
    const nextMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const nextDay = String(tomorrow.getDate()).padStart(2, '0');
    const nextDayStr = `${nextYear}-${nextMonth}-${nextDay}`;

    const { data: records, error } = await client
      .from('vehicle_records')
      .select('entry_time, exit_time')
      .or(`entry_time.gte.${date},exit_time.gte.${date}`)
      .or(`entry_time.lt.${nextDayStr},exit_time.lt.${nextDayStr}`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 按小时统计入场和出场
    const hourlyData: Record<number, { entries: number; exits: number }> = {};
    
    // 初始化所有小时
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { entries: 0, exits: 0 };
    }

    records?.forEach(record => {
      // 统计入场
      if (record.entry_time) {
        const entryDate = new Date(record.entry_time);
        if (entryDate.toISOString().split('T')[0] === date) {
          const hour = entryDate.getHours();
          hourlyData[hour].entries++;
        }
      }
      
      // 统计出场
      if (record.exit_time) {
        const exitDate = new Date(record.exit_time);
        if (exitDate.toISOString().split('T')[0] === date) {
          const hour = exitDate.getHours();
          hourlyData[hour].exits++;
        }
      }
    });

    // 转换为数组格式，只返回有数据的时间段（6:00 - 22:00）
    const flowData = [];
    for (let i = 6; i <= 22; i += 2) {
      flowData.push({
        time: `${i}:00`,
        entries: hourlyData[i].entries,
        exits: hourlyData[i].exits,
      });
    }

    return NextResponse.json({
      data: {
        date,
        hourly: flowData,
        totalEntries: Object.values(hourlyData).reduce((sum, h) => sum + h.entries, 0),
        totalExits: Object.values(hourlyData).reduce((sum, h) => sum + h.exits, 0),
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
