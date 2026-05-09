'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, CalendarCheck, Clock, Car, CheckCircle, AlertCircle, StopCircle, ChevronLeft, ChevronRight, Calendar, Timer, Minus, Plus, X, ChevronUp } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface User {
  id: string;
  name: string;
  plate_number: string | null;
}

interface ParkingLot {
  id: string;
  name: string;
  location: string;
  available_spots: number;
}

interface ParkingSpot {
  id: string;
  spot_number: string;
  floor: string;
  zone: string;
  type: string;
  status: string;
}

interface Reservation {
  id: string;
  plate_number: string;
  lot_id: string;
  spot_id: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  reservation_time?: string;
  parking_lots?: { name: string; location: string };
  parking_spots?: { spot_number: string; floor: string; zone: string };
}

interface BlacklistInfo {
  reason: string;
}

// 自由选择器组件
function FreePicker({
  value,
  onChange,
  options,
  renderValue,
  minWidth = "w-20",
}: {
  value: string | number;
  onChange: (val: number) => void;
  options: { value: string | number; label: string }[];
  renderValue: (val: string | number) => string;
  minWidth?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`${minWidth} px-3 py-2 border border-gray-200 rounded-lg bg-white text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-300 transition-colors`}
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export default function UserReservation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [currentReservation, setCurrentReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [parkingDuration, setParkingDuration] = useState(0);
  const [estimatedFee, setEstimatedFee] = useState(0);
  const [isBlacklisted, setIsBlacklisted] = useState<BlacklistInfo | null>(null);

  // 预约流程状态
  const [step, setStep] = useState(1); // 1: 选择方式 2: 选择停车场 3: 选择时间 4: 选择车位 5: 确认
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [parkingMode, setParkingMode] = useState<'immediate' | 'scheduled' | null>(null);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  });
  const [scheduledHour, setScheduledHour] = useState<number>(new Date().getHours() + 2);
  const [scheduledMinute, setScheduledMinute] = useState<number>(0);
  const [duration, setDuration] = useState(1); // 停车时长（小时）

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        fetchLots();
        checkCurrentReservation(userData.id);
        if (userData.plate_number) {
          checkBlacklist(userData.plate_number);
        }
      } catch {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const spotId = searchParams.get('spotId');
    const lotId = searchParams.get('lotId');
    if (spotId && lotId) {
      const lot = lots.find(l => l.id === lotId);
      if (lot) {
        setSelectedLot(lot);
        fetchSpots(lotId);
        setStep(4);
      }
    }
  }, [searchParams, lots]);

  useEffect(() => {
    if (!currentReservation) return;

    const updateDuration = () => {
      const startTime = new Date(currentReservation.start_time || currentReservation.reservation_time || new Date());
      const now = new Date();
      const dur = Math.ceil((now.getTime() - startTime.getTime()) / (1000 * 60 * 60));
      setParkingDuration(dur);
      setEstimatedFee(dur * 10);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 60000);
    return () => clearInterval(interval);
  }, [currentReservation]);

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

  const fetchSpots = async (lotId: string) => {
    try {
      const response = await fetch(`/api/parking-spots?lotId=${lotId}`);
      const result = await response.json();
      setSpots(result.data || []);
    } catch (error) {
      console.error('Failed to fetch spots:', error);
    }
  };

  const checkCurrentReservation = async (userId: string) => {
    try {
      const response = await fetch(`/api/reservations?userId=${userId}`);
      const result = await response.json();
      const confirmed = result.data?.find((r: { status: string }) => r.status === 'confirmed');
      if (confirmed) {
        setCurrentReservation(confirmed);
      }
    } catch (error) {
      console.error('Failed to check reservation:', error);
    }
  };

  const checkBlacklist = async (plateNumber: string) => {
    try {
      const response = await fetch(`/api/blacklist?plateNumber=${encodeURIComponent(plateNumber)}`);
      const result = await response.json();
      if (result.data && result.data.isBlacklisted) {
        setIsBlacklisted({ reason: result.data.reason });
      } else {
        setIsBlacklisted(null);
      }
    } catch (error) {
      console.error('Failed to check blacklist:', error);
    }
  };

  // 步骤1: 选择停车方式
  const handleSelectMode = (mode: 'immediate' | 'scheduled') => {
    setParkingMode(mode);
    setStep(2);
  };

  // 步骤2: 选择停车场
  const handleSelectLot = (lot: ParkingLot) => {
    setSelectedLot(lot);
    fetchSpots(lot.id);
    if (parkingMode === 'scheduled') {
      // 预约停车：设置最小时间为当前时间+2小时
      const minTime = new Date();
      minTime.setHours(minTime.getHours() + 2);
      minTime.setMinutes(0);
      minTime.setSeconds(0);
      setScheduledTime(minTime);
      setStep(3);
    } else {
      // 立即停车：直接进入选择车位
      setStep(4);
    }
  };

  // 步骤3: 确认预约时间
  const handleConfirmTime = () => {
    // 根据选择的日期和时间构建预约时间
    const selectedDateTime = new Date(scheduledDate);
    selectedDateTime.setHours(scheduledHour, scheduledMinute, 0, 0);
    
    // 验证：最早可选30分钟后
    const minTime = new Date();
    minTime.setMinutes(minTime.getMinutes() + 30);
    
    if (selectedDateTime < minTime) {
      alert('预约时间必须至少在30分钟后');
      return;
    }
    
    setScheduledTime(selectedDateTime);
    setStep(4);
  };

  // 步骤4: 选择车位
  const handleSelectSpot = (spot: ParkingSpot) => {
    if (spot.status !== 'available') return;
    setSelectedSpot(spot);
    setStep(5);
  };

  // 步骤5: 确认预约
  const handleConfirmReservation = async () => {
    if (!user || !selectedLot || !selectedSpot) return;

    if (!user.plate_number) {
      alert('请先在个人中心绑定车牌号');
      router.push('/user');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          plateNumber: user.plate_number,
          lotId: selectedLot.id,
          spotId: selectedSpot.id,
          scheduledTime: parkingMode === 'scheduled' && scheduledTime 
            ? scheduledTime.toISOString() 
            : null,
          startTime: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('预约成功！');
        // 通知地图页面刷新车位状态
        window.dispatchEvent(new Event('spots-updated'));
        // 通知管理员端刷新预约列表
        window.dispatchEvent(new Event('admin-refresh'));
        router.push('/user');
      } else if (result.blacklisted) {
        alert('您已被酒店拉黑，无法预约停车');
        setIsBlacklisted({ reason: result.error || '请联系管理员' });
      } else {
        alert(result.error || '预约失败');
      }
    } catch (error) {
      console.error('Failed to create reservation:', error);
      alert('预约失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndParking = async () => {
    if (!currentReservation || !user) return;

    if (!confirm(`确定要结束停车吗？预估费用：${estimatedFee}元`)) return;
    setSubmitting(true);

    try {
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
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          userData.balance = result.data?.newBalance;
          localStorage.setItem('user', JSON.stringify(userData));
        }

        window.dispatchEvent(new CustomEvent('parkingEnded', {
          detail: { fee: result.data?.fee, duration: result.data?.duration }
        }));

        alert(`停车已结束！费用：¥${result.data?.fee}`);
        // 通知地图页面刷新车位状态
        window.dispatchEvent(new Event('spots-updated'));
        setCurrentReservation(null);
        router.push('/user');
      } else {
        alert(result.error || '结束停车失败');
      }
    } catch (error) {
      console.error('Failed to end parking:', error);
      alert('操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">待确认</Badge>;
      case 'confirmed': return <Badge variant="default">进行中</Badge>;
      case 'completed': return <Badge variant="outline">已完成</Badge>;
      case 'cancelled': return <Badge variant="destructive">已取消</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSpotTypeColor = (type: string, status: string) => {
    if (status === 'maintenance') return 'bg-gray-500 cursor-not-allowed';
    if (status === 'occupied') return 'bg-red-500 cursor-not-allowed';
    switch (type) {
      case 'charging': return 'bg-green-400 hover:bg-green-500 cursor-pointer';
      case 'disabled': return 'bg-blue-400 hover:bg-blue-500 cursor-pointer';
      default: return 'bg-green-500 hover:bg-green-600 cursor-pointer';
    }
  };

  const getSpotBorderColor = (type: string) => {
    switch (type) {
      case 'charging': return 'border-2 border-yellow-400';
      case 'disabled': return 'border-2 border-blue-500';
      default: return '';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'charging': return '⚡';
      case 'disabled': return '♿';
      default: return '';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'charging': return '充电车位';
      case 'disabled': return '无障碍车位';
      default: return '普通车位';
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return new Date(time).toLocaleString('zh-CN');
  };

  const groupedSpots = spots.reduce((acc, spot) => {
    const key = `${spot.floor}-${spot.zone}`;
    if (!acc[key]) {
      acc[key] = { floor: spot.floor, zone: spot.zone, spots: [] };
    }
    acc[key].spots.push(spot);
    return acc;
  }, {} as Record<string, { floor: string; zone: string; spots: ParkingSpot[] }>);

  // 计算最小可选时间（当前时间+2小时）
  const getMinScheduledTime = () => {
    const minTime = new Date();
    minTime.setHours(minTime.getHours() + 2);
    minTime.setMinutes(0);
    minTime.setSeconds(0);
    return minTime;
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
      <h1 className="text-3xl font-bold text-gray-900">预约停车</h1>

      {/* 当前进行中停车 */}
      {currentReservation && (
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Car className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">您正在停车中</p>
                  <p className="text-sm text-gray-600 mt-1">
                    车牌：<span className="font-medium">{currentReservation.plate_number}</span> | 
                    车位：<span className="font-medium">{currentReservation.parking_spots?.spot_number || '未指定'}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    停车场：<span className="font-medium">{currentReservation.parking_lots?.name}</span> | 
                    入场时间：<span className="font-medium">{formatTime(currentReservation.start_time)}</span>
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-orange-600 font-medium">
                      已停 {parkingDuration} 小时
                    </span>
                    <span className="text-red-600 font-medium">
                      预估费用：{estimatedFee} 元
                    </span>
                  </div>
                </div>
              </div>
              <Button 
                className="bg-red-500 hover:bg-red-600"
                onClick={handleEndParking}
                disabled={submitting}
              >
                <StopCircle className="h-4 w-4 mr-2" />
                结束停车
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 提示 */}
      {!user?.plate_number && !currentReservation && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <p className="text-yellow-700">
              请先在<a href="/user" className="underline font-medium">个人中心</a>绑定车牌号后再进行预约
            </p>
          </CardContent>
        </Card>
      )}

      {/* 黑名单提示 */}
      {isBlacklisted && !currentReservation && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 text-lg">您已被酒店拉黑，无法预约停车</p>
                <p className="text-red-600 mt-1">拉黑原因：{isBlacklisted.reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 预约流程 */}
      {!currentReservation && (
        <>
          {/* 步骤指示器 */}
          <div className="flex items-center justify-center space-x-2 md:space-x-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center ${step >= s ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    {s}
                  </div>
                  <span className="ml-1 md:ml-2 text-xs md:text-sm font-medium hidden sm:inline">
                    {s === 1 ? '停车方式' : s === 2 ? '停车场' : s === 3 ? '预约时间' : s === 4 ? '选择车位' : '确认'}
                  </span>
                </div>
                {s < 5 && <div className="h-0.5 w-6 md:w-8 bg-gray-300 mx-1" />}
              </div>
            ))}
          </div>

          {/* 步骤1: 选择停车方式 */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>请选择停车方式</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <button
                    onClick={() => handleSelectMode('immediate')}
                    disabled={isBlacklisted !== null}
                    className="p-6 border-2 border-blue-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Car className="h-7 w-7 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">立即停车</h3>
                        <p className="text-sm text-green-600">到场即停，无需等待</p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">
                      选择此方式后，您将直接选择车位并开始停车。系统会立即锁定车位并开始计费。
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectMode('scheduled')}
                    disabled={isBlacklisted !== null}
                    className="p-6 border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <CalendarCheck className="h-7 w-7 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">预约停车</h3>
                        <p className="text-sm text-purple-600">提前预约，锁定车位</p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">
                      选择此方式后，您需要选择预约开始时间。预约成功后，预约时间前2小时内不可取消。
                    </p>
                  </button>
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">温馨提示</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>预约停车可提前锁定车位，避免到场后无位可停</li>
                        <li>预约成功后，预约时间前30分钟内不可取消</li>
                        <li>预约时间到达后，车位将为您保留</li>
                        <li>超时未到场将按标准计费规则自动扣费</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 步骤2: 选择停车场 */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>选择停车场</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                    返回
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {lots.map((lot) => (
                    <Card 
                      key={lot.id} 
                      className={`cursor-pointer hover:shadow-lg transition-shadow ${!lot.available_spots || isBlacklisted ? 'opacity-50 pointer-events-none' : ''}`}
                      onClick={() => lot.available_spots > 0 && !isBlacklisted && handleSelectLot(lot)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                            <MapPin className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{lot.name}</p>
                            <p className="text-sm text-gray-500">{lot.location}</p>
                            <p className="text-sm text-green-600 mt-1">
                              空闲车位: {lot.available_spots}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {lots.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    暂无可预约的停车场
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 步骤3: 选择预约时间 */}
          {step === 3 && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">选择预约时间</CardTitle>
                      <p className="text-blue-100 text-xs mt-1">当前2小时后至24小时内可选</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-white hover:bg-white/20">
                    返回
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* 日期选择 - 按钮式选择 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-slate-600">选择日期</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((daysLater) => {
                      const date = new Date();
                      date.setDate(date.getDate() + daysLater);
                      const isSelected = scheduledDate.getTime() === date.setHours(0, 0, 0, 0);
                      const label = daysLater === 0 ? '今天' : daysLater === 1 ? '明天' : `${date.getMonth() + 1}/${date.getDate()}`;
                      return (
                        <button
                          key={daysLater}
                          onClick={() => {
                            const newDate = new Date();
                            newDate.setDate(newDate.getDate() + daysLater);
                            setScheduledDate(newDate);
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            scheduledDate.toDateString() === date.toDateString()
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-200'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 时间选择 - 使用之前精美UI */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 border border-blue-100">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-slate-600">选择时间</span>
                  </div>
                  <div className="flex justify-center gap-8">
                    {/* 小时选择 */}
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-2">时</div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setScheduledHour(Math.max(0, scheduledHour - 1))}
                          className="w-10 h-10 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-4 h-4 text-blue-600" />
                        </button>
                        <div className="w-16 h-16 bg-white rounded-xl border-2 border-blue-200 flex items-center justify-center shadow-sm">
                          <span className="text-2xl font-bold text-blue-600">{String(scheduledHour).padStart(2, '0')}</span>
                        </div>
                        <button 
                          onClick={() => setScheduledHour(Math.min(23, scheduledHour + 1))}
                          className="w-10 h-10 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                    </div>
                    {/* 分钟选择 */}
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-2">分</div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setScheduledMinute(Math.max(0, scheduledMinute - 5))}
                          className="w-10 h-10 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-4 h-4 text-blue-600" />
                        </button>
                        <div className="w-16 h-16 bg-white rounded-xl border-2 border-blue-200 flex items-center justify-center shadow-sm">
                          <span className="text-2xl font-bold text-blue-600">{String(scheduledMinute).padStart(2, '0')}</span>
                        </div>
                        <button 
                          onClick={() => setScheduledMinute(Math.min(55, scheduledMinute + 5))}
                          className="w-10 h-10 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-sm text-slate-500 mt-4">
                    最早可选30分钟后
                  </p>
                </div>

                {/* 时长选择 - 精美按钮组 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-600">选择停车时长</span>
                  </div>
                  
                  {/* 快捷时长选项 */}
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 4, 8].map((hours) => (
                      <button
                        key={hours}
                        onClick={() => setDuration(hours)}
                        className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                          duration === hours
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 transform scale-105'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {hours}小时
                      </button>
                    ))}
                  </div>
                  
                  {/* 精细调节 */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <button 
                      onClick={() => setDuration(Math.max(1, duration - 1))}
                      disabled={duration <= 1}
                      className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={duration}
                        onChange={(e) => setDuration(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
                        className="w-12 text-center text-xl font-bold bg-transparent outline-none text-blue-600"
                      />
                      <span className="text-slate-500 text-sm">小时</span>
                    </div>
                    <button 
                      onClick={() => setDuration(Math.min(24, duration + 1))}
                      disabled={duration >= 24}
                      className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 费用预览卡片 */}
                <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <span className="text-2xl font-bold">{duration}</span>
                      </div>
                      <div>
                        <p className="text-blue-100 text-xs">预计停车时长</p>
                        <p className="text-white font-semibold">{duration} 小时</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-100 text-xs">预计费用</p>
                      <p className="text-3xl font-bold">¥{duration * 10}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-blue-100 text-xs text-center">
                      按10元/小时计费 · 实际费用以出场时为准
                    </p>
                  </div>
                </div>

                <Button 
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-200 transition-all"
                  size="lg"
                  onClick={handleConfirmTime}
                >
                  <span>下一步：选择车位</span>
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 步骤4: 选择车位 */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>选择车位</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => step > 2 ? setStep(step - 1) : setStep(2)}>
                    返回
                  </Button>
                </div>
                {selectedLot && (
                  <p className="text-sm text-gray-500">
                    停车场：{selectedLot.name} | 空闲车位：{spots.filter(s => s.status === 'available').length}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {/* 图例 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {/* 状态图标列 */}
                    <div>
                      <div className="text-gray-500 font-medium mb-2 text-xs">状态图标</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-500 rounded" />
                          <span>空闲</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-red-500 rounded" />
                          <span>已占用</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gray-500 rounded" />
                          <span>维护中</span>
                        </div>
                      </div>
                    </div>
                    {/* 类型图标列 */}
                    <div>
                      <div className="text-gray-500 font-medium mb-2 text-xs">类型图标</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span>⚡</span>
                          <span>充电车位</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>♿</span>
                          <span>无障碍车位</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🔋</span>
                          <span>油车专用</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 车位示意图 */}
                <div className="space-y-6">
                  {Object.values(groupedSpots).map((group) => (
                    <div key={`${group.floor}-${group.zone}`} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-3">
                        {group.floor} - {group.zone}
                      </h4>
                      <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
                        {group.spots.map((spot) => (
                          <button
                            key={spot.id}
                            onClick={() => handleSelectSpot(spot)}
                            disabled={spot.status !== 'available'}
                            className={`
                              relative aspect-square rounded-lg flex flex-col items-center justify-center text-white text-xs font-medium
                              ${getSpotTypeColor(spot.type, spot.status)}
                              ${getSpotBorderColor(spot.type)}
                              ${selectedSpot?.id === spot.id ? 'ring-4 ring-blue-400 ring-offset-2' : ''}
                              transition-all
                            `}
                          >
                            <span className="text-sm">{getTypeIcon(spot.type)}</span>
                            <span>{spot.spot_number}</span>
                            {selectedSpot?.id === spot.id && (
                              <CheckCircle className="absolute top-1 right-1 w-4 h-4 text-blue-600 bg-white rounded-full" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {spots.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    暂无可用车位
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 步骤5: 确认 */}
          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>确认预约信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">停车方式</span>
                    <span className="font-medium">
                      {parkingMode === 'scheduled' ? '预约停车' : '立即停车'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">停车场</span>
                    <span className="font-medium">{selectedLot?.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">车位</span>
                    <span className="font-medium">{selectedSpot?.spot_number}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">车牌号</span>
                    <span className="font-medium">{user?.plate_number}</span>
                  </div>
                  {parkingMode === 'scheduled' && scheduledTime && (
                    <>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-600">预约时间</span>
                        <span className="font-medium">
                          {scheduledTime.toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-600">预计时长</span>
                        <span className="font-medium">{duration} 小时</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600">预计费用</span>
                    <span className="font-bold text-xl text-blue-600">
                      ¥{parkingMode === 'scheduled' ? duration * 10 : '-'}
                    </span>
                  </div>
                </div>

                {parkingMode === 'scheduled' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <p>预约成功后，如需取消请至少在预约时间前半小时取消。超时将无法取消。</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setStep(4)}
                  >
                    返回修改
                  </Button>
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleConfirmReservation}
                    disabled={submitting}
                  >
                    {submitting ? '提交中...' : '确认预约'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
