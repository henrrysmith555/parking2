'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Ban, Plus, Search, Trash2, AlertTriangle } from 'lucide-react';

interface BlacklistItem {
  id: string;
  plate_number: string;
  reason: string;
  reported_by: string | null;
  created_at: string;
}

export default function BlacklistManagement() {
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: '',
    reason: '',
  });

  useEffect(() => {
    fetchBlacklist();

    // 监听全局刷新事件
    const handleRefresh = () => fetchBlacklist();
    window.addEventListener('admin-refresh', handleRefresh);
    return () => window.removeEventListener('admin-refresh', handleRefresh);
  }, []);

  const fetchBlacklist = async () => {
    try {
      const response = await fetch('/api/blacklist');
      const result = await response.json();
      setBlacklist(result.data || []);
    } catch (error) {
      console.error('Failed to fetch blacklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.plateNumber || !formData.reason) {
      alert('请填写完整信息');
      return;
    }

    try {
      const response = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchBlacklist();
        setDialogOpen(false);
        setFormData({ plateNumber: '', reason: '' });
      } else {
        const result = await response.json();
        alert(result.error || '添加失败');
      }
    } catch (error) {
      console.error('Failed to add:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要从黑名单中移除此车辆吗？')) return;

    try {
      const response = await fetch(`/api/blacklist/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchBlacklist();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const filteredList = blacklist.filter(item =>
    item.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题与操作按钮 */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-600 rounded-lg blur-sm opacity-20"></div>
          <h1 className="relative text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent px-8 py-3 border-2 border-red-200 rounded-lg bg-white/50 backdrop-blur-sm">
            黑名单管理
          </h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加黑名单
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加黑名单车辆</DialogTitle>
              <DialogDescription>将逃单或违规车辆加入黑名单，禁止入场</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>车牌号 *</Label>
                <Input
                  value={formData.plateNumber}
                  onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                  placeholder="支持中文车牌，如：京A12345"
                />
              </div>
              <div className="grid gap-2">
                <Label>拉黑原因 *</Label>
                <Input
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="如：逃单、违规停车等"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAdd}>确认添加</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 提示信息 */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <p className="font-medium text-orange-800">黑名单说明</p>
              <p className="text-sm text-orange-700 mt-1">
                被列入黑名单的车辆将被禁止进入停车场。常见原因包括：逃单、多次违规、恶意破坏等。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 搜索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索车牌号或原因..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* 黑名单列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            黑名单列表 ({filteredList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无黑名单记录</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>车牌号</TableHead>
                  <TableHead>拉黑原因</TableHead>
                  <TableHead>添加时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4 text-red-500" />
                        {item.plate_number}
                      </div>
                    </TableCell>
                    <TableCell>{item.reason}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        移除
                      </Button>
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
