'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ParkingSquare, Plus, Edit, Trash2, Search, Building2, Car, CheckCircle, XCircle, Wrench } from 'lucide-react';

interface ParkingLot {
  id: string;
  name: string;
  location: string;
  total_spots: number;
  available_spots: number;
  description: string | null;
  is_active: boolean;
}

interface ParkingSpot {
  id: string;
  lot_id: string;
  spot_number: string;
  floor: string;
  zone: string;
  type: string;
  status: string;
}

export default function ParkingManagement() {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLot, setSelectedLot] = useState<string>('');
  
  // 停车场对话框
  const [lotDialogOpen, setLotDialogOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<ParkingLot | null>(null);
  const [lotForm, setLotForm] = useState({
    name: '',
    location: '',
    description: '',
    isActive: true,
  });

  // 车位对话框
  const [spotDialogOpen, setSpotDialogOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<ParkingSpot | null>(null);
  const [spotForm, setSpotForm] = useState({
    spotNumber: '',
    floor: 'B1',
    zone: 'A',
    type: 'regular',
    status: 'available',
  });

  // 搜索
  const [lotSearch, setLotSearch] = useState('');
  const [spotSearch, setSpotSearch] = useState('');

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

  const fetchLots = async () => {
    try {
      const response = await fetch('/api/parking-lots');
      const result = await response.json();
      setLots(result.data || []);
      if (result.data?.length > 0 && !selectedLot) {
        setSelectedLot(result.data[0].id);
        fetchSpots(result.data[0].id);
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

  useEffect(() => {
    if (selectedLot) {
      fetchSpots(selectedLot);
    }
  }, [selectedLot]);

  // 停车场操作
  const openLotDialog = (lot?: ParkingLot) => {
    if (lot) {
      setEditingLot(lot);
      setLotForm({
        name: lot.name,
        location: lot.location,
        description: lot.description || '',
        isActive: lot.is_active,
      });
    } else {
      setEditingLot(null);
      setLotForm({ name: '', location: '', description: '', isActive: true });
    }
    setLotDialogOpen(true);
  };

  const handleSaveLot = async () => {
    if (!lotForm.name || !lotForm.location) {
      alert('请填写完整信息');
      return;
    }

    try {
      if (editingLot) {
        await fetch(`/api/parking-lots/${editingLot.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lotForm),
        });
      } else {
        await fetch('/api/parking-lots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lotForm),
        });
      }
      fetchLots();
      setLotDialogOpen(false);
    } catch (error) {
      console.error('Failed to save lot:', error);
    }
  };

  const handleDeleteLot = async (id: string) => {
    if (!confirm('确定要删除此停车场吗？相关车位也会被删除。')) return;
    try {
      await fetch(`/api/parking-lots/${id}`, { method: 'DELETE' });
      fetchLots();
    } catch (error) {
      console.error('Failed to delete lot:', error);
    }
  };

  // 车位操作
  const openSpotDialog = (spot?: ParkingSpot) => {
    if (spot) {
      setEditingSpot(spot);
      setSpotForm({
        spotNumber: spot.spot_number,
        floor: spot.floor,
        zone: spot.zone,
        type: spot.type,
        status: spot.status,
      });
    } else {
      setEditingSpot(null);
      setSpotForm({ spotNumber: '', floor: 'B1', zone: 'A', type: 'regular', status: 'available' });
    }
    setSpotDialogOpen(true);
  };

  const handleSaveSpot = async () => {
    if (!spotForm.spotNumber) {
      alert('请填写车位编号');
      return;
    }

    try {
      if (editingSpot) {
        await fetch(`/api/parking-spots/${editingSpot.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(spotForm),
        });
      } else {
        await fetch('/api/parking-spots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...spotForm, lotId: selectedLot }),
        });
      }
      fetchSpots(selectedLot);
      setSpotDialogOpen(false);
    } catch (error) {
      console.error('Failed to save spot:', error);
    }
  };

  const handleDeleteSpot = async (id: string) => {
    if (!confirm('确定要删除此车位吗？')) return;
    try {
      await fetch(`/api/parking-spots/${id}`, { method: 'DELETE' });
      fetchSpots(selectedLot);
    } catch (error) {
      console.error('Failed to delete spot:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      available: { label: '空闲', variant: 'default' },
      occupied: { label: '占用', variant: 'destructive' },
      maintenance: { label: '维护', variant: 'outline' },
    };
    const config = map[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeText = (type: string) => {
    const map: Record<string, string> = {
      regular: '普通',
      charging: '充电',
      disabled: '无障碍',
    };
    return map[type] || type;
  };

  const filteredLots = lots.filter(l =>
    l.name.toLowerCase().includes(lotSearch.toLowerCase()) ||
    l.location.toLowerCase().includes(lotSearch.toLowerCase())
  );

  const filteredSpots = spots.filter(s =>
    s.spot_number.toLowerCase().includes(spotSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    );
  }

  // 统计数据
  const totalSpots = lots.reduce((sum, lot) => sum + lot.total_spots, 0);
  const totalAvailable = lots.reduce((sum, lot) => sum + lot.available_spots, 0);
  const totalOccupied = totalSpots - totalAvailable;
  
  // 当前选中停车场的车位统计
  const currentLotSpots = spots.length;
  const availableSpots = spots.filter(s => s.status === 'available').length;
  const occupiedSpots = spots.filter(s => s.status === 'occupied').length;
  const maintenanceSpots = spots.filter(s => s.status === 'maintenance').length;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur-sm opacity-20"></div>
          <h1 className="relative text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent px-8 py-3 border-2 border-blue-200 rounded-lg bg-white/50 backdrop-blur-sm">
            车位管理
          </h1>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{lots.length}</div>
                <div className="text-sm text-gray-500">停车场总数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <ParkingSquare className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalSpots}</div>
                <div className="text-sm text-gray-500">总车位数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
                <div className="text-sm text-gray-500">空闲车位</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{totalOccupied}</div>
                <div className="text-sm text-gray-500">占用车位</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Wrench className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{maintenanceSpots}</div>
                <div className="text-sm text-gray-500">维护中</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lots" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lots" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            停车场管理
          </TabsTrigger>
          <TabsTrigger value="spots" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            车位管理
          </TabsTrigger>
        </TabsList>

        {/* 停车场管理 */}
        <TabsContent value="lots">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>停车场列表 ({filteredLots.length})</CardTitle>
                <Button onClick={() => openLotDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加停车场
                </Button>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索停车场..."
                  value={lotSearch}
                  onChange={(e) => setLotSearch(e.target.value)}
                  className="pl-9 max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>位置</TableHead>
                    <TableHead>总车位</TableHead>
                    <TableHead>空闲车位</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-medium">{lot.name}</TableCell>
                      <TableCell>{lot.location}</TableCell>
                      <TableCell>{lot.total_spots}</TableCell>
                      <TableCell>
                        <span className={lot.available_spots === 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                          {lot.available_spots}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lot.is_active ? 'default' : 'secondary'}>
                          {lot.is_active ? '运营中' : '已关闭'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openLotDialog(lot)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteLot(lot.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 车位管理 */}
        <TabsContent value="spots">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>车位列表</CardTitle>
                <Button onClick={() => openSpotDialog()} disabled={!selectedLot}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加车位
                </Button>
              </div>
              <div className="flex gap-4 mt-4">
                <Select value={selectedLot} onValueChange={setSelectedLot}>
                  <SelectTrigger className="w-48">
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
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索车位编号..."
                    value={spotSearch}
                    onChange={(e) => setSpotSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>车位编号</TableHead>
                    <TableHead>楼层</TableHead>
                    <TableHead>区域</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSpots.map((spot) => (
                    <TableRow key={spot.id}>
                      <TableCell className="font-medium">{spot.spot_number}</TableCell>
                      <TableCell>{spot.floor}层</TableCell>
                      <TableCell>{spot.zone}区</TableCell>
                      <TableCell>{getTypeText(spot.type)}</TableCell>
                      <TableCell>{getStatusBadge(spot.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openSpotDialog(spot)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteSpot(spot.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 停车场对话框 */}
      <Dialog open={lotDialogOpen} onOpenChange={setLotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLot ? '编辑停车场' : '添加停车场'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>名称 *</Label>
              <Input value={lotForm.name} onChange={(e) => setLotForm({ ...lotForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>位置 *</Label>
              <Input value={lotForm.location} onChange={(e) => setLotForm({ ...lotForm, location: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>描述</Label>
              <Input value={lotForm.description} onChange={(e) => setLotForm({ ...lotForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLotDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveLot}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 车位对话框 */}
      <Dialog open={spotDialogOpen} onOpenChange={setSpotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSpot ? '编辑车位' : '添加车位'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>车位编号 *</Label>
              <Input value={spotForm.spotNumber} onChange={(e) => setSpotForm({ ...spotForm, spotNumber: e.target.value.toUpperCase() })} placeholder="A-001" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>楼层</Label>
                <Select value={spotForm.floor} onValueChange={(v) => setSpotForm({ ...spotForm, floor: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B1">B1层</SelectItem>
                    <SelectItem value="B2">B2层</SelectItem>
                    <SelectItem value="B3">B3层</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>区域</Label>
                <Select value={spotForm.zone} onValueChange={(v) => setSpotForm({ ...spotForm, zone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A区</SelectItem>
                    <SelectItem value="B">B区</SelectItem>
                    <SelectItem value="C">C区</SelectItem>
                    <SelectItem value="D">D区</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>类型</Label>
                <Select value={spotForm.type} onValueChange={(v) => setSpotForm({ ...spotForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">普通车位</SelectItem>
                    <SelectItem value="charging">充电车位</SelectItem>
                    <SelectItem value="disabled">无障碍车位</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>状态</Label>
                <Select value={spotForm.status} onValueChange={(v) => setSpotForm({ ...spotForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">空闲</SelectItem>
                    <SelectItem value="occupied">占用</SelectItem>
                    <SelectItem value="maintenance">维护</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSpotDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveSpot}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
