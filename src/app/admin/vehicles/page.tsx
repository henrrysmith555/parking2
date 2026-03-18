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
import { Car, Plus, LogIn, LogOut, Search, Video, AlertTriangle, Edit2, ArrowDownToLine, ArrowUpFromLine, Clock } from 'lucide-react';

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

interface User {
  id: string;
  name: string;
  username: string;
  plate_number: string;
  balance: string;
}

interface VehicleRecord {
  id: string;
  user_id: string | null;
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
  video_url: string | null;
  reservation_id?: string | null;
  parking_spots?: {
    spot_number: string;
    zone: string;
    floor: string;
  };
  users?: {
    id: string;
    name: string;
    username: string;
    phone: string;
  };
}

interface Statistics {
  today: {
    entries: number;
    exits: number;
  };
  current: {
    parked: number;
  };
}

export default function VehiclesPage() {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [availableSpots, setAvailableSpots] = useState<ParkingSpot[]>([]);
  const [records, setRecords] = useState<VehicleRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Statistics>({ today: { entries: 0, exits: 0 }, current: { parked: 0 } });
  const [loading, setLoading] = useState(true);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingVideoUrl, setEditingVideoUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState('parked');
  const [searchPlate, setSearchPlate] = useState('');
  const [searchUser, setSearchUser] = useState('');

  const [entryForm, setEntryForm] = useState({
    plateNumber: '',
    lotId: '',
    spotId: '',
    vehicleType: 'sedan',
    driverName: '',
    driverPhone: '',
    userId: '',
    videoUrl: '', // 预设视频URL
  });

  const [exitForm, setExitForm] = useState({
    recordId: '',
  });

  useEffect(() => {
    fetchLots();
    fetchRecords();
    fetchUsers();
    fetchStatistics();

    // 监听全局刷新事件
    const handleRefresh = () => {
      fetchLots();
      fetchRecords();
      fetchUsers();
      fetchStatistics();
    };
    window.addEventListener('admin-refresh', handleRefresh);
    return () => window.removeEventListener('admin-refresh', handleRefresh);
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

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?role=user');
      const result = await response.json();
      setUsers(result.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/statistics/overview');
      const result = await response.json();
      if (result.data) {
        setStats({
          today: {
            entries: result.data.today?.entries || 0,
            exits: result.data.today?.exits || 0,
          },
          current: {
            parked: result.data.current?.parked || 0,
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const handleEntry = async () => {
    try {
      const response = await fetch('/api/vehicle-records/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entryForm,
          videoUrl: entryForm.videoUrl || `https://example.com/video/${Date.now()}.mp4`, // 使用预设或生成模拟URL
        }),
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
          userId: '',
          videoUrl: '',
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
        fetchStatistics();
        setExitDialogOpen(false);
        setExitForm({ recordId: '' });
        
        // 显示出场结果
        const hours = Math.floor(result.data.duration / 60);
        const mins = result.data.duration % 60;
        let message = `出场成功！\n\n停车时长：${hours}小时${mins}分钟\n费用：¥${result.data.calculatedFee}`;
        if (result.data.newBalance !== undefined) {
          message += `\n\n用户余额：¥${result.data.newBalance}`;
        }
        alert(message);
      } else {
        alert(result.error || '出场失败');
      }
    } catch (error) {
      console.error('Failed to process exit:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchPlate && !searchUser) {
      fetchRecords();
      return;
    }
    try {
      let url = '/api/vehicle-records?';
      if (searchPlate) {
        url += `plateNumber=${searchPlate}`;
      }
      const response = await fetch(url);
      const result = await response.json();
      
      // 如果有用户名搜索，进一步过滤
      let filteredData = result.data || [];
      if (searchUser) {
        filteredData = filteredData.filter((record: VehicleRecord) => 
          record.users?.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
          record.users?.username?.toLowerCase().includes(searchUser.toLowerCase()) ||
          record.driver_name?.toLowerCase().includes(searchUser.toLowerCase())
        );
      }
      
      setRecords(filteredData);
    } catch (error) {
      console.error('Failed to search:', error);
    }
  };

  const handleVideoClick = (videoUrl: string | null) => {
    // 使用模拟视频URL进行演示
    const demoVideoUrl = videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4';
    setSelectedVideo(demoVideoUrl);
    setVideoDialogOpen(true);
  };

  // 打开视频编辑
  const handleEditVideo = (recordId: string, currentVideoUrl: string | null) => {
    setEditingRecordId(recordId);
    setEditingVideoUrl(currentVideoUrl || '');
  };

  // 保存视频URL
  const handleSaveVideo = async (recordId: string) => {
    try {
      const response = await fetch(`/api/vehicle-records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: editingVideoUrl }),
      });

      if (response.ok) {
        fetchRecords(activeTab);
        setEditingRecordId(null);
        setEditingVideoUrl('');
      } else {
        alert('保存失败');
      }
    } catch (error) {
      console.error('Failed to save video:', error);
      alert('保存失败');
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

  // 检查是否逾期（超过24小时）
  const isOverdue = (entryTime: string) => {
    const entry = new Date(entryTime);
    const now = new Date();
    const hours = (now.getTime() - entry.getTime()) / (1000 * 60 * 60);
    return hours > 24;
  };

  // 计算停车费用
  const calculateFee = (entryTime: string): number => {
    const entry = new Date(entryTime);
    const now = new Date();
    const durationMinutes = Math.ceil((now.getTime() - entry.getTime()) / 60000);
    
    // 前15分钟免费
    if (durationMinutes <= 15) return 0;
    
    // 首小时5元
    if (durationMinutes <= 60) return 5;
    
    // 后续每小时3元，每日封顶50元
    const hours = Math.ceil(durationMinutes / 60);
    const fee = 5 + (hours - 1) * 3;
    return Math.min(fee, 50);
  };

  // 管理员手动让车辆出场
  const handleManualExit = async (record: VehicleRecord) => {
    const fee = calculateFee(record.entry_time);
    const duration = Math.ceil((new Date().getTime() - new Date(record.entry_time).getTime()) / 60000);
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    
    const confirmed = confirm(
      `确认让车辆出场？\n\n` +
      `车牌号：${record.plate_number}\n` +
      `用户：${record.users?.name || '未注册用户'}\n` +
      `停车时长：${hours}小时${mins}分钟\n` +
      `费用：¥${fee}\n\n` +
      `${record.user_id ? '费用将从用户余额扣除' : '请现场收取费用'}`
    );
    
    if (!confirmed) return;
    
    try {
      const response = await fetch('/api/vehicle-records/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        const exitHours = Math.floor(result.data.duration / 60);
        const exitMins = result.data.duration % 60;
        let message = `车辆出场成功！\n\n停车时长：${exitHours}小时${exitMins}分钟\n费用：¥${result.data.calculatedFee}`;
        if (result.data.newBalance !== undefined) {
          message += `\n用户余额：¥${result.data.newBalance}`;
        }
        alert(message);
        fetchRecords(activeTab);
        fetchStatistics();
      } else {
        alert(result.error || '出场失败');
      }
    } catch (error) {
      console.error('Manual exit error:', error);
      alert('出场失败，请重试');
    }
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
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur-sm opacity-20"></div>
          <h1 className="relative text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent px-8 py-3 border-2 border-purple-200 rounded-lg bg-white/50 backdrop-blur-sm">
            车辆进出管理
          </h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <LogIn className="mr-2 h-4 w-4" />
                车辆入场
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>车辆入场</DialogTitle>
                <DialogDescription>录入车辆入场信息</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>关联用户（可选）</Label>
                  <Select
                    value={entryForm.userId}
                    onValueChange={(value) => {
                      const user = users.find(u => u.id === value);
                      setEntryForm({ 
                        ...entryForm, 
                        userId: value,
                        plateNumber: user?.plate_number || entryForm.plateNumber,
                        driverName: user?.name || entryForm.driverName,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择用户（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.plate_number || '未绑定车牌'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="grid gap-2">
                  <Label htmlFor="videoUrl">入场视频URL（可选）</Label>
                  <Input
                    id="videoUrl"
                    placeholder="例如: https://example.com/video.mp4"
                    value={entryForm.videoUrl}
                    onChange={(e) => setEntryForm({ ...entryForm, videoUrl: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">可预先添加入场监控视频链接，留空则使用模拟视频</p>
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
                            {record.plate_number} - {formatTime(record.entry_time)}
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

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">今日入场</p>
                <p className="text-2xl font-bold text-gray-900">{stats.today.entries}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ArrowDownToLine className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">今日出场</p>
                <p className="text-2xl font-bold text-gray-900">{stats.today.exits}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <ArrowUpFromLine className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">在场车辆</p>
                <p className="text-2xl font-bold text-gray-900">{stats.current.parked}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Car className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Input
                placeholder="车牌号..."
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value)}
                className="max-w-xs"
              />
              <Input
                placeholder="用户名..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                搜索
              </Button>
            </div>
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
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">用户名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">区域/车位</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">驶入时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">状态</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">视频</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records
                      .filter((r) => r.status === 'parked')
                      .map((record) => (
                        <tr key={record.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">
                            {record.plate_number}
                            {isOverdue(record.entry_time) && (
                              <span title="已逾期">
                                <AlertTriangle className="inline-block ml-2 h-4 w-4 text-red-500" />
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {record.users?.name || record.driver_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {record.parking_spots?.floor || '-'}层 {record.parking_spots?.zone || '-'}区 / {record.parking_spots?.spot_number || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">{formatTime(record.entry_time)}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={isOverdue(record.entry_time) ? 'destructive' : 'default'}>
                              {isOverdue(record.entry_time) ? '已逾期' : '在场'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVideoClick(record.video_url)}
                              >
                                <Video className="h-3 w-3 mr-1" />
                                查看
                              </Button>
                              {editingRecordId === record.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    className="h-8 w-40 text-xs"
                                    placeholder="视频URL"
                                    value={editingVideoUrl}
                                    onChange={(e) => setEditingVideoUrl(e.target.value)}
                                  />
                                  <Button
                                    size="sm"
                                    className="h-8"
                                    onClick={() => handleSaveVideo(record.id)}
                                  >
                                    保存
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8"
                                    onClick={() => setEditingRecordId(null)}
                                  >
                                    取消
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditVideo(record.id, record.video_url)}
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  编辑
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleManualExit(record)}
                            >
                              <LogOut className="h-3 w-3 mr-1" />
                              出场
                            </Button>
                          </td>
                        </tr>
                      ))}
                    {records.filter((r) => r.status === 'parked').length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
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
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">用户名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">区域/车位</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">驶入时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">驶出时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">停车时长</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">费用</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">视频</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records
                      .filter((r) => r.status === 'completed')
                      .map((record) => (
                        <tr key={record.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{record.plate_number}</td>
                          <td className="px-4 py-3 text-sm">
                            {record.users?.name || record.driver_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {record.parking_spots?.floor || '-'}层 {record.parking_spots?.zone || '-'}区 / {record.parking_spots?.spot_number || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">{formatTime(record.entry_time)}</td>
                          <td className="px-4 py-3 text-sm">{formatTime(record.exit_time)}</td>
                          <td className="px-4 py-3 text-sm">{formatDuration(record.duration)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-green-600">
                            ¥{record.fee || '0.00'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVideoClick(record.video_url)}
                              >
                                <Video className="h-3 w-3 mr-1" />
                                查看
                              </Button>
                              {editingRecordId === record.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    className="h-8 w-40 text-xs"
                                    placeholder="视频URL"
                                    value={editingVideoUrl}
                                    onChange={(e) => setEditingVideoUrl(e.target.value)}
                                  />
                                  <Button
                                    size="sm"
                                    className="h-8"
                                    onClick={() => handleSaveVideo(record.id)}
                                  >
                                    保存
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8"
                                    onClick={() => setEditingRecordId(null)}
                                  >
                                    取消
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditVideo(record.id, record.video_url)}
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  编辑
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    {records.filter((r) => r.status === 'completed').length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
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

      {/* 视频播放对话框 */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>入场视频</DialogTitle>
            <DialogDescription>车辆入场监控视频（模拟演示）</DialogDescription>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={selectedVideo}
              className="w-full h-full"
              controls
              autoPlay
            >
              您的浏览器不支持视频播放
            </video>
          </div>
          <DialogFooter>
            <Button onClick={() => setVideoDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
