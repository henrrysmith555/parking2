import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取占用率统计
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const lotId = searchParams.get('lotId');

    // 获取停车场列表
    let lotsQuery = client
      .from('parking_lots')
      .select('id, name, total_spots')
      .eq('is_active', true);

    if (lotId) {
      lotsQuery = lotsQuery.eq('id', lotId);
    }

    const { data: lots } = await lotsQuery;

    // 获取车位统计
    let spotsQuery = client.from('parking_spots').select('lot_id, status');

    if (lotId) {
      spotsQuery = spotsQuery.eq('lot_id', lotId);
    }

    const { data: spots } = await spotsQuery;

    // 计算各停车场占用率
    const occupancyData = lots?.map(lot => {
      const lotSpots = spots?.filter(s => s.lot_id === lot.id) || [];
      const occupied = lotSpots.filter(s => s.status === 'occupied').length;
      const total = lotSpots.length;
      const occupancyRate = total > 0 ? (occupied / total * 100).toFixed(2) : '0';

      return {
        lotId: lot.id,
        lotName: lot.name,
        totalSpots: total,
        occupiedSpots: occupied,
        availableSpots: total - occupied,
        occupancyRate: parseFloat(occupancyRate),
      };
    }) || [];

    const overallOccupancyRate = occupancyData.length > 0
      ? (occupancyData.reduce((sum, lot) => sum + lot.occupiedSpots, 0) /
         occupancyData.reduce((sum, lot) => sum + lot.totalSpots, 0) * 100).toFixed(2)
      : '0';

    return NextResponse.json({
      data: {
        overall: {
          totalSpots: occupancyData.reduce((sum, lot) => sum + lot.totalSpots, 0),
          occupiedSpots: occupancyData.reduce((sum, lot) => sum + lot.occupiedSpots, 0),
          occupancyRate: parseFloat(overallOccupancyRate),
        },
        byLot: occupancyData,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
