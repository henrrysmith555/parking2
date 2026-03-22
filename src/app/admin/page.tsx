'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Car,
  ParkingSquare,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Users,
  Clock,
  BarChart3,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';

interface Statistics {
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

interface RevenueData {
  date: string;
  revenue: number;
  entries: number;
}

interface VehicleFlowData {
  time: string;
  entries: number;
  exits: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCount, setUserCount] = useState(0);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [vehicleFlowData, setVehicleFlowData] = useState<VehicleFlowData[]>([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    
    // 监听全局刷新事件
    const handleRefresh = () => fetchData();
    window.addEventListener('admin-refresh', handleRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('admin-refresh', handleRefresh);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, revenueRes, flowRes] = await Promise.all([
        fetch('/api/statistics/overview'),
        fetch('/api/users?role=user'),
        fetch('/api/statistics/revenue'),
        fetch('/api/statistics/vehicle-flow'),
      ]);
      
      const statsResult = await statsRes.json();
      const usersResult = await usersRes.json();
      const revenueResult = await revenueRes.json();
      const flowResult = await flowRes.json();
      
      setStats(statsResult.data);
      setUserCount(usersResult.data?.length || 0);
      
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
          if (i === 0 && statsResult.data?.today?.revenue) {
            last7Days.push({
              date: displayDate,
              revenue: statsResult.data.today.revenue,
              entries: statsResult.data.today.entries || 0,
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
      if (flowResult.data?.hourly) {
        setVehicleFlowData(flowResult.data.hourly);
      } else {
        setVehicleFlowData(generateMockFlowData());
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setRevenueData(generateMockRevenueData());
      setVehicleFlowData(generateMockFlowData());
    } finally {
      setLoading(false);
    }
  };

  // 生成模拟收入数据（动态计算近七天日期）
  const generateMockRevenueData = () => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      // 最后一天使用今天的实际数据
      if (i === 6) {
        return {
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          revenue: stats?.today.revenue || 50,
          entries: stats?.today.entries || 5,
        };
      }
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
      { time: '8:00', entries: 5, exits: 2 },
      { time: '10:00', entries: 12, exits: 8 },
      { time: '12:00', entries: 8, exits: 15 },
      { time: '14:00', entries: 6, exits: 4 },
      { time: '16:00', entries: 15, exits: 10 },
      { time: '18:00', entries: 20, exits: 12 },
      { time: '20:00', entries: 8, exits: 18 },
      { time: '22:00', entries: 3, exits: 10 },
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    );
  }

  const occupancyRate =
    stats?.parkingSpots.total && stats.parkingSpots.total > 0
      ? ((stats.parkingSpots.occupied / stats.parkingSpots.total) * 100).toFixed(1)
      : '0';

  // 车位状态饼图数据
  const spotPieData = [
    { name: '空闲', value: stats?.parkingSpots.available || 0, color: '#10B981' },
    { name: '占用', value: stats?.parkingSpots.occupied || 0, color: '#EF4444' },
    { name: '维护', value: stats?.parkingSpots.maintenance || 0, color: '#6B7280' },
  ];

  // 占用率环形图数据
  const occupancyBarData = [
    {
      name: '占用率',
      value: parseFloat(occupancyRate),
      fill: parseFloat(occupancyRate) > 80 ? '#EF4444' : parseFloat(occupancyRate) > 50 ? '#F59E0B' : '#10B981',
    },
  ];

  // 今日流量条形图数据
  const todayFlowData = [
    { name: '入场', value: stats?.today.entries || 0, color: '#3B82F6' },
    { name: '出场', value: stats?.today.exits || 0, color: '#10B981' },
  ];

  return (
    <div className="space-y-6 p-1">
      {/* 标题区域 */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur-sm opacity-20"></div>
          <div className="relative text-center px-8 py-3 border-2 border-blue-200 rounded-lg bg-white/50 backdrop-blur-sm">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              管理员仪表盘
            </h1>
            <p className="text-sm text-gray-500 mt-1">酒店停车场实时监控与管理</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm text-green-700 font-medium">实时更新</span>
          </div>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 总车位 */}
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">总车位</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <ParkingSquare className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.parkingSpots.total || 0}</div>
            <div className="mt-2 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                可用 {stats?.parkingSpots.available || 0}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                占用 {stats?.parkingSpots.occupied || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 当前在场 */}
        <Card className="border-l-4 border-l-indigo-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">当前在场车辆</CardTitle>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Car className="h-5 w-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.current.parked || 0}</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(parseFloat(occupancyRate), 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{occupancyRate}%</span>
            </div>
          </CardContent>
        </Card>

        {/* 今日入场 */}
        <Card className="border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">今日入场</CardTitle>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.today.entries || 0}</div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-gray-500">出场</span>
              <span className="font-medium text-emerald-600">{stats?.today.exits || 0}</span>
              <span className="text-gray-400">辆</span>
            </div>
          </CardContent>
        </Card>

        {/* 今日收入 */}
        <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">今日收入</CardTitle>
            <div className="p-2 bg-amber-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              ¥{(stats?.today.revenue || 0).toFixed(2)}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              今日已完成停车费用总和
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 第二行统计 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">注册用户</CardTitle>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{userCount}</div>
            <p className="text-xs text-gray-500 mt-1">已注册用户数量</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">停车场数量</CardTitle>
            <div className="p-2 bg-rose-50 rounded-lg">
              <ParkingSquare className="h-5 w-5 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.parkingLots.total || 0}</div>
            <p className="text-xs text-gray-500 mt-1">已启用停车场</p>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 收入趋势图 */}
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              近7日收入趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 车流量趋势图 */}
        <Card className="border-t-4 border-t-indigo-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              今日车流量趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
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
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="exits" 
                  name="出场"
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 第三行图表 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 车位状态饼图 */}
        <Card className="border-t-4 border-t-emerald-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ParkingSquare className="h-5 w-5 text-emerald-600" />
              车位状态分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={spotPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {spotPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {spotPieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
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

        {/* 占用率环形图 */}
        <Card className="border-t-4 border-t-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-600" />
              车位占用率
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="60%" 
                outerRadius="100%" 
                data={occupancyBarData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  background={{ fill: '#E5E7EB' }}
                  dataKey="value"
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center -mt-24">
              <div className="text-3xl font-bold text-gray-900">{occupancyRate}%</div>
              <div className="text-xs text-gray-500">当前占用率</div>
            </div>
          </CardContent>
        </Card>

        {/* 今日流量对比 */}
        <Card className="border-t-4 border-t-cyan-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-600" />
              今日流量对比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={todayFlowData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" stroke="#6B7280" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={12} width={50} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {todayFlowData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 停车场列表 */}
      <Card className="border-t-4 border-t-rose-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ParkingSquare className="h-5 w-5 text-rose-600" />
            停车场列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">停车场名称</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">总车位</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">可用车位</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">占用率</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">状态</th>
                </tr>
              </thead>
              <tbody>
                {stats?.parkingLots.list.map((lot, index) => {
                  const occupancy = lot.total_spots > 0
                    ? ((1 - lot.available_spots / lot.total_spots) * 100).toFixed(1)
                    : '0';
                  const statusColor = parseFloat(occupancy) > 80 
                    ? 'text-red-600 bg-red-50' 
                    : parseFloat(occupancy) > 50 
                    ? 'text-amber-600 bg-amber-50' 
                    : 'text-green-600 bg-green-50';
                  
                  return (
                    <tr key={lot.id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{lot.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lot.total_spots}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lot.available_spots}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                parseFloat(occupancy) > 80 ? 'bg-red-500' : 
                                parseFloat(occupancy) > 50 ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(parseFloat(occupancy), 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{occupancy}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                          {parseFloat(occupancy) > 80 ? '繁忙' : parseFloat(occupancy) > 50 ? '正常' : '空闲'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(!stats?.parkingLots.list || stats.parkingLots.list.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                      暂无停车场数据
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
