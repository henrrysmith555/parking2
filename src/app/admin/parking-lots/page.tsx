'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ParkingSquare, MapPin } from 'lucide-react';

interface ParkingLot {
  id: string;
  name: string;
  location: string;
  total_spots: number;
  available_spots: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export default function ParkingLotsPage() {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<ParkingLot | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
  });

  useEffect(() => {
    fetchLots();

    // 监听全局刷新事件
    const handleRefresh = () => fetchLots();
    window.addEventListener('admin-refresh', handleRefresh);
    return () => window.removeEventListener('admin-refresh', handleRefresh);
  }, []);

  const fetchLots = async () => {
    try {
      const response = await fetch('/api/parking-lots');
      const result = await response.json();
      setLots(result.data || []);
    } catch (error) {
      console.error('Failed to fetch lots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editingLot
        ? `/api/parking-lots/${editingLot.id}`
        : '/api/parking-lots';
      const method = editingLot ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchLots();
        setDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save lot:', error);
    }
  };

  const handleEdit = (lot: ParkingLot) => {
    setEditingLot(lot);
    setFormData({
      name: lot.name,
      location: lot.location,
      description: lot.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个停车场吗？')) return;

    try {
      const response = await fetch(`/api/parking-lots/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchLots();
      }
    } catch (error) {
      console.error('Failed to delete lot:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      description: '',
    });
    setEditingLot(null);
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
      {/* 页面标题与操作按钮 */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg blur-sm opacity-20"></div>
          <h1 className="relative text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent px-8 py-3 border-2 border-indigo-200 rounded-lg bg-white/50 backdrop-blur-sm">
            停车场管理
          </h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加停车场
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLot ? '编辑停车场' : '添加停车场'}</DialogTitle>
              <DialogDescription>填写停车场信息</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">停车场名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如: 酒店地下停车场A区"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">位置 *</Label>
                <Input
                  id="location"
                  placeholder="例如: 酒店地下1层"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  placeholder="停车场描述信息"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingLot ? '保存' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 停车场统计 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">停车场总数</CardTitle>
            <ParkingSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lots.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总车位</CardTitle>
            <ParkingSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lots.reduce((sum, lot) => sum + lot.total_spots, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">可用车位</CardTitle>
            <ParkingSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lots.reduce((sum, lot) => sum + lot.available_spots, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 停车场列表 */}
      <div className="grid gap-4 md:grid-cols-2">
        {lots.map((lot) => (
          <Card key={lot.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg">{lot.name}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <MapPin className="h-4 w-4" />
                  {lot.location}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={lot.is_active ? 'default' : 'secondary'}>
                  {lot.is_active ? '启用' : '禁用'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">总车位</span>
                  <span className="font-medium">{lot.total_spots}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">可用车位</span>
                  <span className="font-medium text-green-600">{lot.available_spots}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">占用率</span>
                  <span className="font-medium">
                    {lot.total_spots > 0
                      ? ((1 - lot.available_spots / lot.total_spots) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${lot.total_spots > 0
                        ? ((1 - lot.available_spots / lot.total_spots) * 100)
                        : 0}%`,
                    }}
                  />
                </div>
                {lot.description && (
                  <p className="text-sm text-gray-500 mt-2">{lot.description}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(lot)}>
                    <Edit className="mr-1 h-3 w-3" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(lot.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    删除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {lots.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ParkingSquare className="h-16 w-16 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">暂无停车场数据</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              添加停车场
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
