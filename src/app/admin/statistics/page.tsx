'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Car, Users, CalendarCheck, ParkingSquare } from 'lucide-react';

interface OverviewStats {
  parkingLots: {
    total: number;
    list: Array<{
      id: string;
      name: string;
      total_spots: number;
      available_spots: number;
    }>;
  };
  parkingSpots: {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
    maintenance: number;
  };
  today: {
    entries: number;
    exits: number;
    revenue: number;
  };
  current: {
    parked: number;
  };
}

interface RevenueRecord {
  date: string;
  revenue: number;
  entries: number;
}

export default function StatisticsPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number; entries: number }[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reservationStats, setReservationStats] = useState({
    confirmed: 0,
    completed: 0,
  });
  const [vehicleFlowData, setVehicleFlowData] = useState<{ time: string; entries: number; exits: number }[]>([]);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // 设置当前日期
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    setCurrentDate(dateStr);
    
    fetchStatistics();

    // 监听全局刷新事件
    const handleRefresh = () => fetchStatistics();
    window.addEventListener('admin-refresh', handleRefresh);
    return () => window.removeEventListener('admin-refresh', handleRefresh);
  }, []);

  const fetchStatistics = async () => {
    try {
      const [overviewRes, revenueRes, usersRes, reservationsRes, flowRes] = await Promise.all([
        fetch('/api/statistics/overview'),
        fetch('/api/statistics/revenue'),
        fetch('/api/users?role=user'),
        fetch('/api/reservations'),
        fetch('/api/statistics/vehicle-flow'),
      ]);

      const overviewData = await overviewRes.json();
      const revenueResult = await revenueRes.json();
      const usersResult = await usersRes.json();

      if (overviewData.data) {
        setOverview(overviewData.data);
      }

      if (usersResult.data) {
        setUserCount(usersResult.data.length);
      }

      // 处理预约统计数据
      if (reservationsRes.ok) {
        const reservationsResult = await reservationsRes.json();
        const reservations = reservationsResult.data || [];
        setReservationStats({
          confirmed: reservations.filter((r: any) => r.status === 'confirmed').length,
          completed: reservations.filter((r: any) => r.status === 'completed').length,
        });
      }

      // 处理收入数据 - 确保始终显示完整的近七天日期
      const processRevenueData = () => {
        const today = new Date();
        const last7Days: { date: string; revenue: number; entries: number }[] = [];
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const displayDate = `${date.getMonth() + 1}/${date.getDate()}`;
          
          // 如果API有数据，使用实际数据，否则为0
          const dailyRevenue = revenueResult.data?.daily?.[dateStr] || 0;
          
          // 最后一天（今天）使用统计数据的当日收入
          if (i === 0 && overviewData.data?.today?.revenue) {
            last7Days.push({
              date: displayDate,
              revenue: overviewData.data.today.revenue,
              entries: overviewData.data.today.entries || 0,
            });
          } else {
            last7Days.push({
              date: displayDate,
              revenue: dailyRevenue,
              entries: 0,
            });
          }
        }
        return last7Days;
      };
      
      setRevenueData(processRevenueData());

      // 处理车流量数据
      if (flowRes.ok) {
        const flowResult = await flowRes.json();
        if (flowResult.data?.hourly) {
          setVehicleFlowData(flowResult.data.hourly);
        } else {
          setVehicleFlowData(generateMockFlowData());
        }
      } else {
        setVehicleFlowData(generateMockFlowData());
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      setRevenueData(generateMockRevenueData());
      setVehicleFlowData(generateMockFlowData());
    } finally {
      setLoading(false);
    }
  };

  // 生成模拟收入数据
  const generateMockRevenueData = () => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        revenue: Math.floor(Math.random() * 200) + 50,
        entries: Math.floor(Math.random() * 20) + 5,
      };
    });
  };

  // 生成模拟车流量数据
  const generateMockFlowData = () => {
    return [
      { time: '6:00', entries: 2, exits: 0 },
      { time: '8:00', entries: 8, exits: 3 },
      { time: '10:00', entries: 12, exits: 7 },
      { time: '12:00', entries: 6, exits: 10 },
      { time: '14:00', entries: 4, exits: 5 },
      { time: '16:00', entries: 10, exits: 8 },
      { time: '18:00', entries: 15, exits: 12 },
      { time: '20:00', entries: 5, exits: 10 },
      { time: '22:00', entries: 2, exits: 6 },
    ];
  };

  const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    );
  }

  // 车位分布数据
  const spotDistribution = [
    { name: '空闲', value: overview?.parkingSpots.available || 0, color: '#10B981' },
    { name: '占用', value: overview?.parkingSpots.occupied || 0, color: '#EF4444' },
    { name: '维护', value: overview?.parkingSpots.maintenance || 0, color: '#6B7280' },
  ];

  // 计算总收入
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <div className="space-y-6">
      {/* 标题 */}
      {/* 页面标题 */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg blur-sm opacity-20"></div>
          <div className="relative text-center px-8 py-3 border-2 border-indigo-200 rounded-lg bg-white/50 backdrop-blur-sm">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              数据统计
            </h1>
            <p className="text-sm text-gray-500 mt-1">停车场运营数据可视化分析</p>
          </div>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">今日车辆 <span className="text-xs">({currentDate})</span></p>
                <p className="text-3xl font-bold text-gray-900">{overview?.today.entries || 0}</p>
                <p className="text-xs text-gray-400 mt-1">出场 {overview?.today.exits || 0} 辆</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Car className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">今日收入 <span className="text-xs">({currentDate})</span></p>
                <p className="text-3xl font-bold text-gray-900">¥{overview?.today.revenue || 0}</p>
                <p className="text-xs text-gray-400 mt-1">每日零点自动重置</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">注册用户</p>
                <p className="text-3xl font-bold text-gray-900">{userCount}</p>
                <p className="text-xs text-gray-400 mt-1">平台用户数</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">当前在场</p>
                <p className="text-3xl font-bold text-gray-900">{overview?.current.parked || 0}</p>
                <p className="text-xs text-gray-400 mt-1">在场车辆</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <ParkingSquare className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 第一行图表 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 收入趋势图 */}
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              近7日收入趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }}
                  formatter={(value: number) => [`¥${value}`, '收入']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue2)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 车位状态分布 */}
        <Card className="border-t-4 border-t-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ParkingSquare className="h-5 w-5 text-green-600" />
              车位状态分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={spotDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {spotDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {spotDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 第二行图表 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 车流量趋势 */}
        <Card className="border-t-4 border-t-indigo-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              今日车流量趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={vehicleFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="time" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="entries" 
                  name="入场"
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="exits" 
                  name="出场"
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 停车场概览 */}
        <Card className="border-t-4 border-t-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-amber-600" />
              停车场概览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 总览统计 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <p className="text-sm text-gray-600">停车场数量</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {overview?.parkingLots.total || 0}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <p className="text-sm text-gray-600">总车位数</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {overview?.parkingSpots.total || 0}
                  </p>
                </div>
              </div>

              {/* 停车场列表 */}
              <div className="space-y-2">
                {overview?.parkingLots.list.map((lot) => {
                  const occupancy = lot.total_spots > 0
                    ? ((1 - lot.available_spots / lot.total_spots) * 100).toFixed(1)
                    : '0';
                  
                  return (
                    <div key={lot.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{lot.name}</p>
                        <p className="text-sm text-gray-500">
                          可用 {lot.available_spots} / 总数 {lot.total_spots}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          parseFloat(occupancy) > 80 ? 'text-red-600' : 
                          parseFloat(occupancy) > 50 ? 'text-amber-600' : 'text-green-600'
                        }`}>
                          {occupancy}% 占用
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!overview?.parkingLots.list || overview.parkingLots.list.length === 0) && (
                  <div className="text-center py-4 text-gray-500">暂无停车场数据</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 预约统计 */}
      <Card className="border-t-4 border-t-cyan-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-cyan-600" />
            预约状态概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-blue-50 rounded-xl text-center">
              <p className="text-3xl font-bold text-blue-600">{reservationStats.confirmed}</p>
              <p className="text-sm text-gray-600 mt-1">进行中</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <p className="text-3xl font-bold text-gray-600">{reservationStats.completed}</p>
              <p className="text-sm text-gray-600 mt-1">已完成</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
