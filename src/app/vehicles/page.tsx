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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, Plus, LogIn, LogOut, Search } from 'lucide-react';

interface ParkingLot {
  id: string;
  name: string;
}

interface ParkingSpot {
  id: string;
  spot_number: string;
  zone: string;
  floor: string;
}

interface VehicleRecord {
  id: string;
  plate_number: string;
  spot_id: string;
  lot_id: string;
  vehicle_type: string;
  entry_time: string;
  exit_time: string | null;
  duration: number | null;
  fee: string | null;
  status: string;
  driver_name: string | null;
  driver_phone: string | null;
}

export default function VehiclesPage() {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [availableSpots, setAvailableSpots] = useState<ParkingSpot[]>([]);
  const [records, setRecords] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('parked');

  const [entryForm, setEntryForm] = useState({
    plateNumber: '',
    lotId: '',
    spotId: '',
    vehicleType: 'sedan',
    driverName: '',
    driverPhone: '',
  });

  const [exitForm, setExitForm] = useState({
    recordId: '',
    plateNumber: '',
  });

  const [searchPlate, setSearchPlate] = useState('');

  useEffect(() => {
    fetchLots();
    fetchRecords();
  }, []);

  useEffect(() => {
    if (entryForm.lotId) {
      fetchAvailableSpots(entryForm.lotId);
    }
  }, [entryForm.lotId]);

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

  const fetchAvailableSpots = async (lotId: string) => {
    try {
      const response = await fetch(`/api/parking-spots?lotId=${lotId}&status=available`);
      const result = await response.json();
      setAvailableSpots(result.data || []);
    } catch (error) {
      console.error('Failed to fetch spots:', error);
    }
  };

  const fetchRecords = async (status?: string) => {
    try {
      const statusParam = status || activeTab;
      const response = await fetch(`/api/vehicle-records?status=${statusParam}`);
      const result = await response.json();
      setRecords(result.data || []);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    }
  };

  const handleEntry = async () => {
    try {
      const response = await fetch('/api/vehicle-records/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryForm),
      });

      const result = await response.json();
      if (response.ok) {
        fetchRecords();
        setEntryDialogOpen(false);
        setEntryForm({
          plateNumber: '',
          lotId: '',
          spotId: '',
          vehicleType: 'sedan',
          driverName: '',
          driverPhone: '',
        });
      } else {
        alert(result.error || '入场失败');
      }
    } catch (error) {
      console.error('Failed to create entry:', error);
    }
  };

  const handleExit = async () => {
    try {
      const response = await fetch('/api/vehicle-records/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: exitForm.recordId }),
      });

      const result = await response.json();
      if (response.ok) {
        fetchRecords();
        setExitDialogOpen(false);
        setExitForm({ recordId: '', plateNumber: '' });
        
        // 显示费用信息
        alert(`出场成功！停车时长: ${result.data.duration}分钟，费用: ¥${result.data.calculatedFee}`);
      } else {
        alert(result.error || '出场失败');
      }
    } catch (error) {
      console.error('Failed to process exit:', error);
    }
  };

  const handleSearchByPlate = async () => {
    if (!searchPlate) {
      fetchRecords();
      return;
    }
    try {
      const response = await fetch(`/api/vehicle-records?plateNumber=${searchPlate}`);
      const result = await response.json();
      setRecords(result.data || []);
    } catch (error) {
      console.error('Failed to search:', error);
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins}分钟`;
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
        <h1 className="text-3xl font-bold text-gray-900">车辆进出管理</h1>
        <div className="flex gap-2">
          <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <LogIn className="mr-2 h-4 w-4" />
                车辆入场
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>车辆入场</DialogTitle>
                <DialogDescription>录入车辆入场信息</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="plateNumber">车牌号</Label>
                  <Input
                    id="plateNumber"
                    placeholder="例如: 京A12345"
                    value={entryForm.plateNumber}
                    onChange={(e) => setEntryForm({ ...entryForm, plateNumber: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lotId">停车场</Label>
                  <Select
                    value={entryForm.lotId}
                    onValueChange={(value) => setEntryForm({ ...entryForm, lotId: value, spotId: '' })}
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
                <div className="grid gap-2">
                  <Label htmlFor="spotId">车位</Label>
                  <Select
                    value={entryForm.spotId}
                    onValueChange={(value) => setEntryForm({ ...entryForm, spotId: value })}
                    disabled={!entryForm.lotId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择车位" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSpots.map((spot) => (
                        <SelectItem key={spot.id} value={spot.id}>
                          {spot.spot_number} ({spot.floor}层-{spot.zone}区)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vehicleType">车辆类型</Label>
                  <Select
                    value={entryForm.vehicleType}
                    onValueChange={(value) => setEntryForm({ ...entryForm, vehicleType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedan">轿车</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="truck">货车</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="driverName">驾驶员姓名</Label>
                    <Input
                      id="driverName"
                      value={entryForm.driverName}
                      onChange={(e) => setEntryForm({ ...entryForm, driverName: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="driverPhone">联系电话</Label>
                    <Input
                      id="driverPhone"
                      value={entryForm.driverPhone}
                      onChange={(e) => setEntryForm({ ...entryForm, driverPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleEntry}>确定入场</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                车辆出场
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>车辆出场</DialogTitle>
                <DialogDescription>处理车辆出场结算</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>选择在场车辆</Label>
                  <Select
                    value={exitForm.recordId}
                    onValueChange={(value) => setExitForm({ ...exitForm, recordId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择车辆" />
                    </SelectTrigger>
                    <SelectContent>
                      {records
                        .filter((r) => r.status === 'parked')
                        .map((record) => (
                          <SelectItem key={record.id} value={record.id}>
                            {record.plate_number} - 入场时间: {formatTime(record.entry_time)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExitDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleExit} disabled={!exitForm.recordId}>
                  确认出场
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Input
              placeholder="输入车牌号搜索..."
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleSearchByPlate}>
              <Search className="mr-2 h-4 w-4" />
              搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 车辆记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle>车辆记录</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            fetchRecords(value);
          }}>
            <TabsList>
              <TabsTrigger value="parked">在场车辆</TabsTrigger>
              <TabsTrigger value="completed">历史记录</TabsTrigger>
            </TabsList>
            <TabsContent value="parked" className="mt-4">
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">车牌号</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">入场时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">车辆类型</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">驾驶员</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">联系电话</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records
                      .filter((r) => r.status === 'parked')
                      .map((record) => (
                        <tr key={record.id} className="border-b">
                          <td className="px-4 py-3 text-sm font-medium">{record.plate_number}</td>
                          <td className="px-4 py-3 text-sm">{formatTime(record.entry_time)}</td>
                          <td className="px-4 py-3 text-sm">{record.vehicle_type}</td>
                          <td className="px-4 py-3 text-sm">{record.driver_name || '-'}</td>
                          <td className="px-4 py-3 text-sm">{record.driver_phone || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant="default">在场</Badge>
                          </td>
                        </tr>
                      ))}
                    {records.filter((r) => r.status === 'parked').length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                          暂无在场车辆
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="completed" className="mt-4">
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">车牌号</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">入场时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">出场时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">停车时长</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">费用</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records
                      .filter((r) => r.status === 'completed')
                      .map((record) => (
                        <tr key={record.id} className="border-b">
                          <td className="px-4 py-3 text-sm font-medium">{record.plate_number}</td>
                          <td className="px-4 py-3 text-sm">{formatTime(record.entry_time)}</td>
                          <td className="px-4 py-3 text-sm">{formatTime(record.exit_time)}</td>
                          <td className="px-4 py-3 text-sm">{formatDuration(record.duration)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-green-600">
                            ¥{record.fee || '0.00'}
                          </td>
                        </tr>
                      ))}
                    {records.filter((r) => r.status === 'completed').length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                          暂无历史记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
