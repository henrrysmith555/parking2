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
import { Plus, ParkingSquare, Search, Edit, Trash2 } from 'lucide-react';

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
  created_at: string;
  updated_at: string | null;
}

interface SpotRecord {
  entry_time: string;
  exit_time: string | null;
}

export default function ParkingSpotsPage() {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [spotRecords, setSpotRecords] = useState<Record<string, SpotRecord>>({});
  const [selectedLot, setSelectedLot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<ParkingSpot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newSpot, setNewSpot] = useState({
    lotId: '',
    spotNumber: '',
    floor: 'B1',
    zone: 'A',
    type: 'regular',
    status: 'available',
  });

  useEffect(() => {
    fetchLots();

    // 监听全局刷新事件
    const handleRefresh = () => {
      fetchLots();
      if (selectedLot) {
        fetchSpots(selectedLot);
      }
    };
    window.addEventListener('admin-refresh', handleRefresh);
    return () => window.removeEventListener('admin-refresh', handleRefresh);
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
      const spotsData = result.data || [];
      setSpots(spotsData);
      
      // 获取每个车位的进出时间
      const recordsMap: Record<string, SpotRecord> = {};
      for (const spot of spotsData) {
        if (spot.vehicle_id) {
          const recordRes = await fetch(`/api/vehicle-records?limit=100`);
          const recordResult = await recordRes.json();
          const record = recordResult.data?.find((r: SpotRecord & { spot_id: string }) => r.spot_id === spot.id && !r.exit_time);
          if (record) {
            recordsMap[spot.id] = {
              entry_time: record.entry_time,
              exit_time: record.exit_time,
            };
          }
        }
      }
      setSpotRecords(recordsMap);
    } catch (error) {
      console.error('Failed to fetch spots:', error);
    }
  };

  const handleCreateSpot = async () => {
    try {
      const response = await fetch('/api/parking-spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSpot, lotId: selectedLot }),
      });

      if (response.ok) {
        fetchSpots(selectedLot);
        setDialogOpen(false);
        setNewSpot({
          lotId: '',
          spotNumber: '',
          floor: 'B1',
          zone: 'A',
          type: 'regular',
          status: 'available',
        });
      }
    } catch (error) {
      console.error('Failed to create spot:', error);
    }
  };

  const handleUpdateSpot = async () => {
    if (!editingSpot) return;
    
    try {
      const response = await fetch(`/api/parking-spots/${editingSpot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotNumber: editingSpot.spot_number,
          floor: editingSpot.floor,
          zone: editingSpot.zone,
          type: editingSpot.type,
          status: editingSpot.status,
        }),
      });

      if (response.ok) {
        fetchSpots(selectedLot);
        setEditDialogOpen(false);
        setEditingSpot(null);
      }
    } catch (error) {
      console.error('Failed to update spot:', error);
    }
  };

  const handleDeleteSpot = async (id: string) => {
    if (!confirm('确定要删除这个车位吗？')) return;
    
    try {
      const response = await fetch(`/api/parking-spots/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchSpots(selectedLot);
      }
    } catch (error) {
      console.error('Failed to delete spot:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'occupied':
        return 'bg-red-500';
      case 'maintenance':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return '空闲';
      case 'occupied':
        return '占用';
      case 'maintenance':
        return '维护';
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

  const formatTime = (time: string | null | undefined) => {
    if (!time) return '-';
    return new Date(time).toLocaleString('zh-CN');
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

  // 搜索过滤
  const filteredSpots = spots.filter(spot => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      spot.spot_number.toLowerCase().includes(query) ||
      spot.floor.toLowerCase().includes(query) ||
      spot.zone.toLowerCase().includes(query) ||
      getStatusText(spot.status).includes(query) ||
      getTypeText(spot.type).includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题与操作按钮 */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur-sm opacity-20"></div>
          <h1 className="relative text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent px-8 py-3 border-2 border-blue-200 rounded-lg bg-white/50 backdrop-blur-sm">
            车位管理
          </h1>
        </div>
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
              <div className="grid gap-2">
                <Label htmlFor="status">初始状态</Label>
                <Select
                  value={newSpot.status}
                  onValueChange={(value) => setNewSpot({ ...newSpot, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">空闲</SelectItem>
                    <SelectItem value="occupied">占用</SelectItem>
                    <SelectItem value="maintenance">维护</SelectItem>
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

      {/* 停车场选择和搜索 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label>停车场:</Label>
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
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索车位编号、楼层、区域、状态..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 车位统计 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{filteredSpots.length}</div>
              <div className="text-xs text-gray-500">总车位</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredSpots.filter((s) => s.status === 'available').length}
              </div>
              <div className="text-xs text-gray-500">空闲</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {filteredSpots.filter((s) => s.status === 'occupied').length}
              </div>
              <div className="text-xs text-gray-500">占用</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {filteredSpots.filter((s) => s.status === 'maintenance').length}
              </div>
              <div className="text-xs text-gray-500">维护</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图例 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-500"></div>
              <span className="text-sm">空闲</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-red-500"></div>
              <span className="text-sm">占用</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-gray-500"></div>
              <span className="text-sm">维护</span>
            </div>
            <div className="mx-4 border-l border-gray-300 h-4"></div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-500"></div>
              <span className="text-sm">普通车位</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-400 border-2 border-yellow-400"></div>
              <span className="text-sm">充电车位</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-blue-400 border-2 border-blue-500"></div>
              <span className="text-sm">无障碍车位</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 车位列表（表格形式，显示进出时间） */}
      <Card>
        <CardHeader>
          <CardTitle>车位详情列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">车位编号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">楼层/区域</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">驶入时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">驶出时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredSpots.map((spot) => (
                  <tr key={spot.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{spot.spot_number}</td>
                    <td className="px-4 py-3 text-sm">{spot.floor} / {spot.zone}区</td>
                    <td className="px-4 py-3 text-sm">{getTypeText(spot.type)}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className={`${getStatusColor(spot.status)} text-white`}>
                        {getStatusText(spot.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {spotRecords[spot.id]?.entry_time ? formatTime(spotRecords[spot.id].entry_time) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {spotRecords[spot.id]?.exit_time ? formatTime(spotRecords[spot.id].exit_time) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingSpot(spot);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => handleDeleteSpot(spot.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSpots.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      暂无车位数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 编辑车位对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑车位</DialogTitle>
          </DialogHeader>
          {editingSpot && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>车位编号</Label>
                <Input
                  value={editingSpot.spot_number}
                  onChange={(e) => setEditingSpot({ ...editingSpot, spot_number: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>楼层</Label>
                  <Input
                    value={editingSpot.floor}
                    onChange={(e) => setEditingSpot({ ...editingSpot, floor: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>区域</Label>
                  <Input
                    value={editingSpot.zone}
                    onChange={(e) => setEditingSpot({ ...editingSpot, zone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>车位类型</Label>
                <Select
                  value={editingSpot.type}
                  onValueChange={(value) => setEditingSpot({ ...editingSpot, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">普通车位</SelectItem>
                    <SelectItem value="charging">充电车位</SelectItem>
                    <SelectItem value="disabled">无障碍车位</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>状态</Label>
                <Select
                  value={editingSpot.status}
                  onValueChange={(value) => setEditingSpot({ ...editingSpot, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">空闲</SelectItem>
                    <SelectItem value="occupied">占用</SelectItem>
                    <SelectItem value="maintenance">维护</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateSpot}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
