'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Car, Clock, MapPin, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  plate_number: string | null;
}

interface Stats {
  parkingCount: number;
  totalDurationMinutes: number;
  totalFee: number;
}

interface Record {
  id: string;
  plate_number: string;
  entry_time: string;
  exit_time: string | null;
  duration: number | null;
  fee: number | null;
  status: string;
  operatorType?: 'admin' | 'user'; // 操作来源
  parking_lots?: {
    name: string;
    location: string;
  };
  parking_spots?: {
    spot_number: string;
    floor: string;
    zone: string;
  };
}

const PAGE_SIZE = 5;

export default function UserRecords() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({
    parkingCount: 0,
    totalDurationMinutes: 0,
    totalFee: 0,
  });
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRecords = useCallback(async (userId: string, showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const response = await fetch(`/api/user-records?userId=${userId}`);
      const result = await response.json();
      
      if (result.data) {
        setStats(result.data.stats);
        setRecords(result.data.records);
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        fetchRecords(userData.id);
      } catch {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router, fetchRecords]);

  // 监听 storage 事件，当其他页面更新用户信息时刷新数据
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && user) {
        fetchRecords(user.id);
      }
    };

    // 监听停车结束事件
    const handleParkingEnded = () => {
      if (user) {
        fetchRecords(user.id, true);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('parkingEnded', handleParkingEnded);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('parkingEnded', handleParkingEnded);
    };
  }, [user, fetchRecords]);

  const handleRefresh = () => {
    if (user) {
      fetchRecords(user.id, true);
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return new Date(time).toLocaleString('zh-CN');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-blue-500">停车中</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-600">已完成</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">已取消</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOperatorBadge = (operatorType?: 'admin' | 'user') => {
    if (operatorType === 'admin') {
      return (
        <Badge variant="outline" className="border-orange-400 text-orange-500 bg-orange-50">
          管理员手动出场
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-blue-400 text-blue-500 bg-blue-50">
        用户自助出场
      </Badge>
    );
  };

  // 分页计算
  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const paginatedRecords = records.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // 渲染分页
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, 'ellipsis', currentPage, 'ellipsis', totalPages);
      }
    }

    return (
      <div className="flex items-center justify-center gap-1 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 px-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {pages.map((page, index) => (
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          )
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 px-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">停车记录</h1>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '刷新中...' : '刷新'}
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{stats.parkingCount}</div>
              <div className="text-sm text-gray-500 mt-1">停车次数</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">
                {Math.floor(stats.totalDurationMinutes / 60)}h{stats.totalDurationMinutes % 60}m
              </div>
              <div className="text-sm text-gray-500 mt-1">累计停车时长</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">¥{stats.totalFee.toFixed(2)}</div>
              <div className="text-sm text-gray-500 mt-1">累计消费</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            停车历史 ({records.length}条记录)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paginatedRecords.map((record) => (
              <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">{record.plate_number}</span>
                    {getStatusBadge(record.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    {record.status === 'completed' && getOperatorBadge(record.operatorType)}
                    {record.fee !== null && (
                      <span className="font-medium text-red-600">¥{record.fee}</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {record.parking_lots?.name || '停车场'} - 
                      {record.parking_spots?.floor}层{record.parking_spots?.zone}区 
                      {record.parking_spots?.spot_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>时长: {formatDuration(record.duration)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                  <div className="text-gray-500">
                    入场: {formatTime(record.entry_time)}
                  </div>
                  <div className="text-gray-500">
                    出场: {formatTime(record.exit_time)}
                  </div>
                </div>
              </div>
            ))}

            {records.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p>暂无停车记录</p>
                <p className="text-sm mt-2">预约停车后，您的停车记录将在这里显示</p>
              </div>
            )}
          </div>
          {renderPagination()}
        </CardContent>
      </Card>
    </div>
  );
}
