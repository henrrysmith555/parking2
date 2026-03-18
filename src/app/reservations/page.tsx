'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarCheck, Plus, Check, X, Car } from 'lucide-react';
import { logUtils } from '@/lib/log-utils';

interface ParkingLot {
  id: string;
  name: string;
}

interface Reservation {
  id: string;
  plate_number: string;
  lot_id: string;
  spot_id: string | null;
  user_id: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  driver_name: string | null;
  driver_phone: string | null;
  created_at: string;
}

export default function ReservationsPage() {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const [newReservation, setNewReservation] = useState({
    plateNumber: '',
    lotId: '',
    startTime: '',
    endTime: '',
    driverName: '',
    driverPhone: '',
  });

  useEffect(() => {
    fetchLots();
    fetchReservations();
  }, []);

  useEffect(() => {
    fetchReservations(statusFilter === 'all' ? undefined : statusFilter);
  }, [statusFilter]);

  const fetchLots = async () => {
    try {
      const response = await fetch('/api/parking-lots?isActive=true');
      const result = await response.json();
      setLots(result.data || []);
    } catch (error) {
      console.error('Failed to fetch lots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async (status?: string) => {
    try {
      let url = '/api/reservations';
      if (status) {
        url += `?status=${status}`;
      }
      const response = await fetch(url);
      const result = await response.json();
      setReservations(result.data || []);
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    }
  };

  const handleCreateReservation = async () => {
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReservation),
      });

      if (response.ok) {
        fetchReservations();
        setDialogOpen(false);
        setNewReservation({
          plateNumber: '',
          lotId: '',
          startTime: '',
          endTime: '',
          driverName: '',
          driverPhone: '',
        });
      }
    } catch (error) {
      console.error('Failed to create reservation:', error);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchReservations(statusFilter === 'all' ? undefined : statusFilter);
      }
    } catch (error) {
      console.error('Failed to update reservation:', error);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('确定要取消这个预约吗？')) return;
    
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await logUtils.reservationDelete(id);
        fetchReservations(statusFilter === 'all' ? undefined : statusFilter);
      }
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
    }
  };

  // 驶出车辆并扣费
  const handleExitVehicle = async (reservation: Reservation) => {
    if (!confirm(`确定要驶出车辆 ${reservation.plate_number} 吗？将自动计算停车费用。`)) return;

    try {
      // 1. 获取用户信息
      const sessionStr = localStorage.getItem('session');
      if (!sessionStr) {
        alert('请先登录');
        return;
      }
      const session = JSON.parse(sessionStr);
      
      // 2. 获取用户余额
      const userRes = await fetch(`/api/users/${session.id}`);
      const userData = await userRes.json();
      const currentBalance = userData.data?.balance || 0;

      // 3. 计算停车费用 (每小时10元，不足1小时按1小时计)
      const startTime = new Date(reservation.start_time);
      const endTime = new Date();
      const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
      const fee = hours * 10;

      // 4. 检查余额
      if (currentBalance < fee) {
        alert(`余额不足！需要 ¥${fee.toFixed(2)}，当前余额 ¥${currentBalance.toFixed(2)}`);
        return;
      }

      // 5. 扣费
      const newBalance = currentBalance - fee;
      await fetch(`/api/users/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBalance }),
      });

      // 6. 更新预约状态
      await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', end_time: endTime.toISOString() }),
      });

      // 7. 更新车位状态为空闲
      if (reservation.spot_id) {
        await fetch(`/api/parking-spots/${reservation.spot_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'available' }),
        });
      }

      // 8. 记录日志
      await logUtils.vehicleExit(reservation.plate_number, fee);
      await logUtils.payment(reservation.plate_number, fee);

      alert(`驶出成功！停车 ${hours} 小时，费用 ¥${fee.toFixed(2)}，剩余余额 ¥${newBalance.toFixed(2)}`);
      fetchReservations(statusFilter === 'all' ? undefined : statusFilter);
    } catch (error) {
      console.error('Failed to exit vehicle:', error);
      alert('驶出失败，请重试');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">待确认</Badge>;
      case 'confirmed':
        return <Badge variant="default">已确认</Badge>;
      case 'completed':
        return <Badge variant="outline">已完成</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">已取消</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return new Date(time).toLocaleString('zh-CN');
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
        <h1 className="text-3xl font-bold text-gray-900">预约管理</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新建预约
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建预约</DialogTitle>
              <DialogDescription>填写预约信息</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="plateNumber">车牌号</Label>
                <Input
                  id="plateNumber"
                  placeholder="例如: 京A12345"
                  value={newReservation.plateNumber}
                  onChange={(e) =>
                    setNewReservation({ ...newReservation, plateNumber: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lotId">停车场</Label>
                <Select
                  value={newReservation.lotId}
                  onValueChange={(value) =>
                    setNewReservation({ ...newReservation, lotId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择停车场" />
                  </SelectTrigger>
                  <SelectContent>
                    {lots.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id}>
                        {lot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startTime">预计到达时间</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={newReservation.startTime}
                    onChange={(e) =>
                      setNewReservation({ ...newReservation, startTime: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endTime">预计离开时间</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={newReservation.endTime}
                    onChange={(e) =>
                      setNewReservation({ ...newReservation, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="driverName">驾驶员姓名</Label>
                  <Input
                    id="driverName"
                    value={newReservation.driverName}
                    onChange={(e) =>
                      setNewReservation({ ...newReservation, driverName: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="driverPhone">联系电话</Label>
                  <Input
                    id="driverPhone"
                    value={newReservation.driverPhone}
                    onChange={(e) =>
                      setNewReservation({ ...newReservation, driverPhone: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateReservation}>确定预约</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 筛选器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>状态筛选:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待确认</SelectItem>
                <SelectItem value="confirmed">已确认</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 预约列表 */}
      <Card>
        <CardHeader>
          <CardTitle>预约列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">车牌号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    预计到达时间
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    预计离开时间
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">驾驶员</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">联系电话</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">操作</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="border-b">
                    <td className="px-4 py-3 text-sm font-medium">{reservation.plate_number}</td>
                    <td className="px-4 py-3 text-sm">{formatTime(reservation.start_time)}</td>
                    <td className="px-4 py-3 text-sm">{formatTime(reservation.end_time)}</td>
                    <td className="px-4 py-3 text-sm">{reservation.driver_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{reservation.driver_phone || '-'}</td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(reservation.status)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {reservation.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(reservation.id, 'confirmed')}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancel(reservation.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {reservation.status === 'confirmed' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-orange-500 hover:bg-orange-600 text-white"
                              onClick={() => handleExitVehicle(reservation)}
                            >
                              <Car className="h-3 w-3 mr-1" />
                              驶出
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(reservation.id, 'completed')}
                            >
                              完成
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {reservations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      暂无预约数据
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
