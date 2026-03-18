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
import { Textarea } from '@/components/ui/textarea';
import { Plus, ParkingSquare } from 'lucide-react';

interface ParkingLot {
  id: string;
  name: string;
  total_spots: number;
  available_spots: number;
}

interface ParkingSpot {
  id: string;
  lot_id: string;
  spot_number: string;
  floor: string;
  zone: string;
  type: string;
  status: string;
  vehicle_id: string | null;
}

export default function ParkingSpotsPage() {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedLot, setSelectedLot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSpot, setNewSpot] = useState({
    lotId: '',
    spotNumber: '',
    floor: '1',
    zone: 'A',
    type: 'regular',
  });

  useEffect(() => {
    fetchLots();
  }, []);

  useEffect(() => {
    if (selectedLot) {
      fetchSpots(selectedLot);
    }
  }, [selectedLot]);

  const fetchLots = async () => {
    try {
      const response = await fetch('/api/parking-lots?isActive=true');
      const result = await response.json();
      setLots(result.data || []);
      if (result.data && result.data.length > 0) {
        setSelectedLot(result.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch lots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpots = async (lotId: string) => {
    try {
      const response = await fetch(`/api/parking-spots?lotId=${lotId}`);
      const result = await response.json();
      setSpots(result.data || []);
    } catch (error) {
      console.error('Failed to fetch spots:', error);
    }
  };

  const handleCreateSpot = async () => {
    try {
      const response = await fetch('/api/parking-spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSpot),
      });

      if (response.ok) {
        fetchSpots(newSpot.lotId);
        setDialogOpen(false);
        setNewSpot({
          lotId: '',
          spotNumber: '',
          floor: '1',
          zone: 'A',
          type: 'regular',
        });
      }
    } catch (error) {
      console.error('Failed to create spot:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'occupied':
        return 'bg-red-500';
      case 'reserved':
        return 'bg-blue-500';
      case 'maintenance':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return '可用';
      case 'occupied':
        return '已占用';
      case 'reserved':
        return '已预约';
      case 'maintenance':
        return '维护中';
      default:
        return '未知';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'regular':
        return '普通';
      case 'charging':
        return '充电';
      case 'disabled':
        return '无障碍';
      default:
        return '未知';
    }
  };

  // 按楼层和区域分组车位
  const groupedSpots = spots.reduce((acc, spot) => {
    const key = `${spot.floor}层-${spot.zone}区`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(spot);
    return acc;
  }, {} as Record<string, ParkingSpot[]>);

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
        <h1 className="text-3xl font-bold text-gray-900">车位管理</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加车位
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新车位</DialogTitle>
              <DialogDescription>填写车位信息以创建新车位</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="lotId">停车场</Label>
                <Select
                  value={newSpot.lotId}
                  onValueChange={(value) => setNewSpot({ ...newSpot, lotId: value })}
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
                <Label htmlFor="spotNumber">车位编号</Label>
                <Input
                  id="spotNumber"
                  placeholder="例如: A-001"
                  value={newSpot.spotNumber}
                  onChange={(e) => setNewSpot({ ...newSpot, spotNumber: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="floor">楼层</Label>
                  <Input
                    id="floor"
                    value={newSpot.floor}
                    onChange={(e) => setNewSpot({ ...newSpot, floor: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="zone">区域</Label>
                  <Input
                    id="zone"
                    value={newSpot.zone}
                    onChange={(e) => setNewSpot({ ...newSpot, zone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">车位类型</Label>
                <Select
                  value={newSpot.type}
                  onValueChange={(value) => setNewSpot({ ...newSpot, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">普通车位</SelectItem>
                    <SelectItem value="charging">充电车位</SelectItem>
                    <SelectItem value="disabled">无障碍车位</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateSpot}>确定</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 停车场选择器 */}
      <div className="flex items-center gap-4">
        <Label>选择停车场:</Label>
        <Select value={selectedLot} onValueChange={setSelectedLot}>
          <SelectTrigger className="w-64">
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

      {/* 车位可视化 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>车位状态图例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-green-500"></div>
                <span className="text-sm">可用</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-red-500"></div>
                <span className="text-sm">已占用</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-blue-500"></div>
                <span className="text-sm">已预约</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-yellow-500"></div>
                <span className="text-sm">维护中</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>车位统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {spots.filter((s) => s.status === 'available').length}
                </div>
                <div className="text-xs text-gray-500">可用</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {spots.filter((s) => s.status === 'occupied').length}
                </div>
                <div className="text-xs text-gray-500">已占用</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {spots.filter((s) => s.status === 'reserved').length}
                </div>
                <div className="text-xs text-gray-500">已预约</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {spots.filter((s) => s.status === 'maintenance').length}
                </div>
                <div className="text-xs text-gray-500">维护中</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 车位平面图 */}
      {Object.keys(groupedSpots).map((key) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-lg">{key}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {groupedSpots[key].map((spot) => (
                <div
                  key={spot.id}
                  className={`flex h-20 w-20 flex-col items-center justify-center rounded-lg text-white ${getStatusColor(
                    spot.status
                  )} cursor-pointer transition-transform hover:scale-105`}
                  title={`${spot.spot_number} - ${getStatusText(spot.status)} - ${getTypeText(spot.type)}`}
                >
                  <ParkingSquare className="h-6 w-6" />
                  <div className="mt-1 text-xs font-medium">{spot.spot_number}</div>
                  <div className="text-xs opacity-80">{getTypeText(spot.type)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {spots.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ParkingSquare className="h-16 w-16 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">暂无车位数据</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              添加车位
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
