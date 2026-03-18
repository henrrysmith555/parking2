'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Phone,
  Mail,
  Car,
  Wallet,
  CalendarCheck,
  BarChart3,
  LogOut,
  Clock,
  MapPin,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logUtils } from '@/lib/log-utils';

interface UserInfo {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  email: string | null;
  balance: string;
  plate_number: string | null;
  created_at: string;
}

interface Reservation {
  id: string;
  plate_number: string;
  spot_id: string | null;
  lot_id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  parking_lots?: {
    id: string;
    name: string;
    location: string;
  };
  parking_spots?: {
    id: string;
    spot_number: string;
    floor: string;
    zone: string;
    status: string;
  };
}

export default function UserCenter() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [currentReservation, setCurrentReservation] = useState<Reservation | null>(null);
  const [parkingDuration, setParkingDuration] = useState<string>('');
  const [estimatedFee, setEstimatedFee] = useState<number>(0);
  const [endingParking, setEndingParking] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    plateNumber: '',
  });

  // 获取用户信息的函数
  const fetchUserInfo = useCallback(async (userId: string) => {
    try {
      // 获取用户信息
      const userRes = await fetch(`/api/users/${userId}`);
      const userResult = await userRes.json();
      
      if (userResult.data) {
        setUser(userResult.data);
        setFormData({
          name: userResult.data.name || '',
          phone: userResult.data.phone || '',
          email: userResult.data.email || '',
          plateNumber: userResult.data.plate_number || '',
        });
        
        // 更新 localStorage
        localStorage.setItem('user', JSON.stringify(userResult.data));
      }
      
      // 获取已确认的预约记录
      const reservationRes = await fetch(`/api/reservations?userId=${userId}`);
      const reservationResult = await reservationRes.json();
      
      console.log('Reservation data:', reservationResult.data);
      
      // 找到已确认的预约
      const confirmedReservation = reservationResult.data?.find(
        (r: { status: string }) => r.status === 'confirmed'
      );
      
      console.log('Confirmed reservation:', confirmedReservation);
      
      if (confirmedReservation) {
        setCurrentReservation(confirmedReservation);
      } else {
        setCurrentReservation(null);
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        fetchUserInfo(userData.id);
      } catch {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
    
    // 监听停车结束事件，刷新用户信息
    const handleParkingEnded = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        fetchUserInfo(userData.id);
      }
    };
    
    window.addEventListener('parkingEnded', handleParkingEnded);
    return () => window.removeEventListener('parkingEnded', handleParkingEnded);
  }, [router, fetchUserInfo]);

  // 实时更新停车时长
  useEffect(() => {
    if (!currentReservation) return;
    
    const updateDuration = () => {
      const entryTime = new Date(currentReservation.start_time);
      const now = new Date();
      const diff = now.getTime() - entryTime.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setParkingDuration(`${hours}小时${minutes}分钟${seconds}秒`);
      
      // 计算预估费用：每小时10元，不足1小时按1小时计算
      const totalHours = Math.ceil(diff / (1000 * 60 * 60));
      const fee = totalHours * 10;
      setEstimatedFee(fee);
    };
    
    updateDuration();
    const timer = setInterval(updateDuration, 1000);
    
    return () => clearInterval(timer);
  }, [currentReservation]);

  const handleUpdate = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchUserInfo(user.id);
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  // 结束停车并扣费
  const handleEndParking = async () => {
    if (!currentReservation || !user) return;
    
    if (!confirm(`确定要结束停车吗？\n\n停车时长：${parkingDuration}\n预估费用：¥${estimatedFee.toFixed(2)}\n当前余额：¥${user.balance}`)) {
      return;
    }
    
    setEndingParking(true);
    
    try {
      // 调用预约API结束停车（API会自动扣费并创建缴费记录）
      const response = await fetch(`/api/reservations/${currentReservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'completed',
          cancelledBy: user.id,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // 更新本地用户信息
        const updatedUser = {
          ...user,
          balance: result.data?.newBalance || user.balance,
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // 触发全局刷新事件，通知其他页面更新
        window.dispatchEvent(new CustomEvent('parkingEnded', { 
          detail: { fee: result.data?.fee, duration: result.data?.duration } 
        }));
        
        // 清除当前预约
        setCurrentReservation(null);
        
        // 显示成功信息
        const confirmView = confirm(
          `🎉 停车结束成功！\n\n` +
          `📍 车位：${currentReservation.parking_spots?.spot_number || '-'}\n` +
          `⏱️ 停车时长：${parkingDuration}\n` +
          `💰 费用：¥${result.data?.fee}\n` +
          `💳 支付方式：余额支付\n` +
          `💵 剩余余额：¥${result.data?.newBalance}\n\n` +
          `是否查看停车记录？`
        );
        
        if (confirmView) {
          router.push('/user/records');
        } else {
          // 刷新用户数据
          fetchUserInfo(user.id);
        }
      } else {
        // 检查是否是余额不足
        if (result.error?.includes('余额不足')) {
          alert(result.error + '\n\n请前往充值页面充值。');
          router.push('/user/payment');
        } else {
          alert(result.error || '结束停车失败');
        }
      }
    } catch (error) {
      console.error('Failed to end parking:', error);
      alert('结束停车失败，请重试');
    } finally {
      setEndingParking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>用户信息加载失败</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">个人中心</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchUserInfo(user.id)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button variant="outline" onClick={() => router.push('/login')}>
            <LogOut className="h-4 w-4 mr-2" />
            退出
          </Button>
        </div>
      </div>

      {/* 当前停车状态 */}
      {currentReservation && (
        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Car className="h-5 w-5" />
              当前停车状态
              <Badge variant="default" className="ml-2 animate-pulse">停车中</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <Car className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-500">车牌号：</span>
                  <span className="font-semibold">{currentReservation.plate_number}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-500">停车场：</span>
                  <span className="font-semibold">{currentReservation.parking_lots?.name || '-'}</span>
                </div>
                {currentReservation.parking_spots && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-500">车位位置：</span>
                    <span className="font-semibold">
                      {currentReservation.parking_spots.floor}层 {currentReservation.parking_spots.zone}区 
                      {currentReservation.parking_spots.spot_number}号
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-500">开始时间：</span>
                  <span className="font-semibold">
                    {new Date(currentReservation.start_time).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-lg border border-orange-200">
                  <div className="text-sm text-gray-500 mb-1">已停时长</div>
                  <div className="text-2xl font-bold text-orange-600">{parkingDuration}</div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-orange-200">
                  <div className="text-sm text-gray-500 mb-1">预估费用</div>
                  <div className="text-2xl font-bold text-orange-600">¥{estimatedFee.toFixed(2)}</div>
                  <div className="text-xs text-gray-400 mt-1">按 ¥10/小时计费</div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between p-3 bg-orange-100 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">结束停车将自动从余额扣除费用</span>
              </div>
              <Button 
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleEndParking}
                disabled={endingParking}
              >
                {endingParking ? '处理中...' : '结束停车'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 未预约时显示提示 */}
      {!currentReservation && (
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">暂无进行中的预约</p>
                  <p className="text-sm text-gray-500">点击右侧按钮预约车位</p>
                </div>
              </div>
              <Button onClick={() => router.push('/user/reservation')}>
                立即预约
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* 用户信息卡片 */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                个人信息
              </span>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  编辑
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>姓名</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>手机号</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>邮箱</Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>车牌号</Label>
                  <Input
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                    placeholder="京A12345"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdate}>保存</Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500">
                    <User className="h-4 w-4" />
                    <span>姓名</span>
                  </div>
                  <span className="font-medium">{user.name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="h-4 w-4">👤</span>
                    <span>用户名</span>
                  </div>
                  <span className="font-medium">{user.username}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone className="h-4 w-4" />
                    <span>手机号</span>
                  </div>
                  <span className="font-medium">{user.phone || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Mail className="h-4 w-4" />
                    <span>邮箱</span>
                  </div>
                  <span className="font-medium">{user.email || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Car className="h-4 w-4" />
                    <span>车牌号</span>
                  </div>
                  <span className="font-medium">{user.plate_number || '-'}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 账户余额卡片 */}
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Wallet className="h-5 w-5" />
              账户余额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-5xl font-bold mb-2">¥{user.balance}</div>
              <p className="text-blue-100 text-sm mb-6">可用余额</p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/user/payment')}
              >
                立即充值
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快捷功能 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-t-4 border-t-blue-500" 
          onClick={() => router.push('/user/reservation')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <CalendarCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">预约停车</p>
                <p className="text-sm text-gray-500">提前预约车位</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-t-4 border-t-green-500" 
          onClick={() => router.push('/user/payment')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Wallet className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium">充值缴费</p>
                <p className="text-sm text-gray-500">余额充值与缴费</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-t-4 border-t-purple-500" 
          onClick={() => router.push('/user/records')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">停车记录</p>
                <p className="text-sm text-gray-500">查看历史记录</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
