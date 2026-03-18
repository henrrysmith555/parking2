'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Search, MapPin, Clock, Car, StopCircle } from 'lucide-react';

interface Reservation {
  id: string;
  plate_number: string;
  lot_id: string;
  spot_id: string | null;
  user_id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  created_at: string;
  parking_lots?: { name: string; location: string };
  parking_spots?: { spot_number: string; floor: string; zone: string };
  users?: { name: string; username: string };
  actual_fee?: number | null; // 实际费用（已完成）
}

interface ParkingLot {
  id: string;
  name: string;
}

// 计算停车费用 - 每小时10元，不足1小时按1小时计算
function calculateFee(entryTime: string): number {
  const entry = new Date(entryTime);
  const now = new Date();
  const duration = now.getTime() - entry.getTime();
  const hours = Math.ceil(duration / (1000 * 60 * 60)); // 向上取整到小时
  
  // 每小时10元，不足1小时按1小时计算
  return hours * 10;
}

export default function ReservationsManagement() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();

    // 监听全局刷新事件
    const handleRefresh = () => fetchData();
    window.addEventListener('admin-refresh', handleRefresh);
    return () => window.removeEventListener('admin-refresh', handleRefresh);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRes, lotsRes] = await Promise.all([
        fetch('/api/reservations'),
        fetch('/api/parking-lots'),
      ]);
      const resResult = await resRes.json();
      const lotsResult = await lotsRes.json();
      setReservations(resResult.data || []);
      setLots(lotsResult.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndParking = async (reservation: Reservation) => {
    const fee = calculateFee(reservation.start_time);
    
    if (!confirm(`确定要为用户 ${reservation.users?.name || reservation.plate_number} 结束停车吗？\n\n预估费用：¥${fee}\n将从用户余额自动扣除。`)) {
      return;
    }
    
    setProcessingId(reservation.id);
    
    try {
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          cancelledBy: 'admin',
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        alert(`停车已结束！\n\n费用：¥${result.data?.fee}\n已从用户余额扣除。`);
        fetchData();
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to end parking:', error);
      alert('操作失败，请重试');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      confirmed: { label: '进行中', variant: 'default' },
      completed: { label: '已完成', variant: 'outline' },
    };
    const config = map[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLotName = (lotId: string) => {
    const lot = lots.find(l => l.id === lotId);
    return lot?.name || lotId;
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return new Date(time).toLocaleString('zh-CN');
  };

  const filteredReservations = reservations.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch = !searchTerm || 
      r.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.users?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // 统计数据
  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    completed: reservations.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg blur-sm opacity-20"></div>
          <h1 className="relative text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent px-8 py-3 border-2 border-orange-200 rounded-lg bg-white/50 backdrop-blur-sm">
            预约管理
          </h1>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">总预约</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
              <div className="text-sm text-gray-500">进行中</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-500">已完成</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="搜索车牌号或用户名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="confirmed">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 预约列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            预约列表 ({filteredReservations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>车牌号</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>停车场</TableHead>
                  <TableHead>车位</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>费用</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-gray-400" />
                        {reservation.plate_number}
                      </div>
                    </TableCell>
                    <TableCell>{reservation.users?.name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {getLotName(reservation.lot_id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {reservation.parking_spots 
                        ? `${reservation.parking_spots.floor}层${reservation.parking_spots.zone}区-${reservation.parking_spots.spot_number}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatTime(reservation.start_time)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {reservation.status === 'confirmed' ? (
                        <span className="text-orange-600 font-medium">
                          ¥{calculateFee(reservation.start_time)}
                          <span className="text-xs text-gray-400 ml-1">(预估)</span>
                        </span>
                      ) : reservation.status === 'completed' ? (
                        <span className="text-green-600 font-medium">
                          ¥{reservation.actual_fee || 0}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                    <TableCell className="text-right">
                      {reservation.status === 'confirmed' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleEndParking(reservation)}
                          disabled={processingId === reservation.id}
                        >
                          <StopCircle className="h-4 w-4 mr-1" />
                          {processingId === reservation.id ? '处理中...' : '结束停车'}
                        </Button>
                      )}
                      {reservation.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => {
                            if (confirm('确定要取消此预约吗？')) {
                              fetch(`/api/reservations/${reservation.id}`, { method: 'DELETE' })
                                .then(() => fetchData());
                            }
                          }}
                        >
                          取消
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
