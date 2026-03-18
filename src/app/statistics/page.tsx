'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Car } from 'lucide-react';

interface OccupancyData {
  overall: {
    totalSpots: number;
    occupiedSpots: number;
    occupancyRate: number;
  };
  byLot: Array<{
    lotId: string;
    lotName: string;
    totalSpots: number;
    occupiedSpots: number;
    occupancyRate: number;
  }>;
}

interface RevenueData {
  total: number;
  daily: Record<string, number>;
}

const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B'];

export default function StatisticsPage() {
  const [occupancyData, setOccupancyData] = useState<OccupancyData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');

  useEffect(() => {
    fetchStatistics();
  }, [dateRange]);

  const fetchStatistics = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      const startDateStr = startDate.toISOString().split('T')[0];

      const [occupancyRes, revenueRes] = await Promise.all([
        fetch('/api/statistics/occupancy'),
        fetch(`/api/statistics/revenue?startDate=${startDateStr}&endDate=${endDate}`),
      ]);

      const occupancyResult = await occupancyRes.json();
      const revenueResult = await revenueRes.json();

      setOccupancyData(occupancyResult.data);
      setRevenueData(revenueResult.data);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    );
  }

  // 准备图表数据
  const occupancyPieData = occupancyData?.overall
    ? [
        { name: '已占用', value: occupancyData.overall.occupiedSpots },
        {
          name: '空闲',
          value: occupancyData.overall.totalSpots - occupancyData.overall.occupiedSpots,
        },
      ]
    : [];

  const occupancyBarData = occupancyData?.byLot.map((lot) => ({
    name: lot.lotName,
    占用率: lot.occupancyRate,
  })) || [];

  const dailyRevenueData = revenueData?.daily
    ? Object.entries(revenueData.daily)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({
          date: date.slice(5), // 只显示月-日
          revenue,
        }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">数据统计</h1>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="选择时间范围" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">近7天</SelectItem>
            <SelectItem value="30">近30天</SelectItem>
            <SelectItem value="90">近90天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 概览卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总车位</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyData?.overall.totalSpots || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当前占用</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyData?.overall.occupiedSpots || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">占用率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyData?.overall.occupancyRate.toFixed(1) || 0}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收入</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{revenueData?.total.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>
      </div>

      {/* 图表 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 占用率饼图 */}
        <Card>
          <CardHeader>
            <CardTitle>车位占用情况</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={occupancyPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {occupancyPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 各停车场占用率 */}
        <Card>
          <CardHeader>
            <CardTitle>各停车场占用率</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={occupancyBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="占用率" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 收入趋势 */}
      <Card>
        <CardHeader>
          <CardTitle>收入趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" name="收入(元)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 停车场详细数据 */}
      <Card>
        <CardHeader>
          <CardTitle>停车场详细数据</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    停车场名称
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">总车位</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">已占用</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">空闲</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">占用率</th>
                </tr>
              </thead>
              <tbody>
                {occupancyData?.byLot.map((lot) => (
                  <tr key={lot.lotId} className="border-b">
                    <td className="px-4 py-3 text-sm font-medium">{lot.lotName}</td>
                    <td className="px-4 py-3 text-sm">{lot.totalSpots}</td>
                    <td className="px-4 py-3 text-sm">{lot.occupiedSpots}</td>
                    <td className="px-4 py-3 text-sm">{lot.totalSpots - lot.occupiedSpots}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${lot.occupancyRate}%` }}
                          />
                        </div>
                        <span>{lot.occupancyRate.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!occupancyData?.byLot || occupancyData.byLot.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
