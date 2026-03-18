'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, CalendarCheck, Clock, Car, CheckCircle, AlertCircle, StopCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

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
  
  // 选择状态
  const [step, setStep] = useState(1); // 1: 选择停车场 2: 选择车位 3: 确认
  const [selectedLot, setSelectedLot] = useState<string>('');
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        fetchLots();
        checkCurrentReservation(userData.id);
        // 检查黑名单
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

  // 从URL参数获取预选车位
  useEffect(() => {
    const spotId = searchParams.get('spotId');
    const lotId = searchParams.get('lotId');
    if (spotId && lotId) {
      setSelectedLot(lotId);
      fetchSpots(lotId);
      setStep(2);
    }
  }, [searchParams]);

  // 实时更新停车时长和费用
  useEffect(() => {
    if (!currentReservation) return;

    const updateDuration = () => {
      const startTime = new Date(currentReservation.start_time || currentReservation.reservation_time || new Date());
      const now = new Date();
      const duration = Math.ceil((now.getTime() - startTime.getTime()) / (1000 * 60 * 60)); // 小时
      setParkingDuration(duration);
      
      // 计算预估费用 - 每小时10元
      const fee = duration * 10;
      setEstimatedFee(fee);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 60000); // 每分钟更新

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
      
      // 检查是否有进行中的预约
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

  const handleSelectLot = (lotId: string) => {
    setSelectedLot(lotId);
    setSelectedSpot(null);
    fetchSpots(lotId);
    setStep(2);
  };

  const handleSelectSpot = (spot: ParkingSpot) => {
    if (spot.status !== 'available') return;
    setSelectedSpot(spot);
    setStep(3);
  };

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
          lotId: selectedLot,
          spotId: selectedSpot.id,
          startTime: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        alert('预约成功！车位已为您锁定，点击结束停车时将自动计费');
        router.push('/user');
      } else if (result.blacklisted) {
        alert('您已被酒店拉黑，无法预约停车，请联系管理员');
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
    
    if (!confirm(`确定要结束停车吗？预估费用：${estimatedFee}元，将从您的余额扣除。`)) return;
    
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
        // 更新本地用户信息
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          userData.balance = result.data?.newBalance;
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        // 触发全局刷新事件，通知其他页面更新
        window.dispatchEvent(new CustomEvent('parkingEnded', { 
          detail: { fee: result.data?.fee, duration: result.data?.duration } 
        }));
        
        const confirmView = confirm(
          `🎉 停车已结束！\n\n` +
          `💰 费用：¥${result.data?.fee}\n` +
          `💳 支付方式：余额支付\n` +
          `💵 剩余余额：¥${result.data?.newBalance}\n\n` +
          `是否查看停车记录？`
        );
        
        if (confirmView) {
          router.push('/user/records');
        } else {
          setCurrentReservation(null);
          router.push('/user');
        }
      } else {
        if (result.error?.includes('余额不足')) {
          alert(result.error + '\n\n请前往充值页面充值。');
          router.push('/user/payment');
        } else {
          alert(result.error || '结束停车失败');
        }
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

  // 根据车位类型获取颜色
  const getSpotTypeColor = (type: string, status: string) => {
    if (status === 'maintenance') return 'bg-gray-500 cursor-not-allowed';
    if (status === 'occupied') return 'bg-red-500 cursor-not-allowed';
    
    // 空闲状态下，根据类型显示不同颜色
    switch (type) {
      case 'charging': return 'bg-green-400 hover:bg-green-500 cursor-pointer';
      case 'disabled': return 'bg-blue-400 hover:bg-blue-500 cursor-pointer';
      default: return 'bg-green-500 hover:bg-green-600 cursor-pointer';
    }
  };

  // 获取车位边框颜色（根据类型）
  const getSpotBorderColor = (type: string) => {
    switch (type) {
      case 'charging': return 'border-2 border-yellow-400';
      case 'disabled': return 'border-2 border-blue-500';
      default: return '';
    }
  };

  // 获取车位状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return '✓';  // 空闲
      case 'occupied': return '🚗';   // 占用
      case 'maintenance': return '🔧'; // 维护
      default: return '';
    }
  };

  // 获取车位类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'charging': return '⚡';   // 充电
      case 'disabled': return '♿';    // 无障碍
      default: return '';              // 普通无图标
    }
  };

  // 获取车位类型文本
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

  // 按楼层和区域分组车位
  const groupedSpots = spots.reduce((acc, spot) => {
    const key = `${spot.floor}-${spot.zone}`;
    if (!acc[key]) {
      acc[key] = { floor: spot.floor, zone: spot.zone, spots: [] };
    }
    acc[key].spots.push(spot);
    return acc;
  }, {} as Record<string, { floor: string; zone: string; spots: ParkingSpot[] }>);

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

      {/* 当前已有预约提示 - 显示结束停车按钮 */}
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
                <p className="text-red-600 mt-2">如有疑问，请联系管理员处理。</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 如果有进行中的预约，不显示预约流程 */}
      {!currentReservation && (
        <>
          {/* 步骤指示器 */}
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
              <span className="ml-2 font-medium">选择停车场</span>
            </div>
            <div className="h-0.5 w-12 bg-gray-300" />
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
              <span className="ml-2 font-medium">选择车位</span>
            </div>
            <div className="h-0.5 w-12 bg-gray-300" />
            <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
              <span className="ml-2 font-medium">确认预约</span>
            </div>
          </div>

          {/* 步骤内容 */}
          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lots.map((lot) => (
                <Card 
                  key={lot.id} 
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${!lot.available_spots || isBlacklisted ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => lot.available_spots > 0 && !isBlacklisted && handleSelectLot(lot.id)}
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

              {lots.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  暂无可预约的停车场，请联系管理员添加
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>选择车位</CardTitle>
                  <Button variant="outline" onClick={() => setStep(1)}>返回</Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* 图例说明 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {/* 状态图标列 */}
                    <div>
                      <div className="text-gray-500 font-medium mb-2 text-xs">状态图标</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center text-white text-xs">✓</div>
                          <span>空闲</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-red-500 flex items-center justify-center text-white text-xs">🚗</div>
                          <span>占用</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-gray-500 flex items-center justify-center text-white text-xs">🔧</div>
                          <span>维护</span>
                        </div>
                      </div>
                    </div>
                    {/* 类型图标列 */}
                    <div>
                      <div className="text-gray-500 font-medium mb-2 text-xs">类型图标</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-green-500"></div>
                          <span>普通车位</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-green-400 border-2 border-yellow-400 flex items-center justify-center text-white text-xs">⚡</div>
                          <span>充电车位</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-blue-400 border-2 border-blue-500 flex items-center justify-center text-white text-xs">♿</div>
                          <span>无障碍车位</span>
                        </div>
                      </div>
                    </div>
                    {/* 说明列 */}
                    <div className="text-gray-500 text-xs">
                      <div className="font-medium mb-2">说明</div>
                      <p>状态图标显示在车位左上角</p>
                      <p>类型图标显示在车位右上角</p>
                    </div>
                  </div>
                </div>

                {/* 车位展示 */}
                <div className="space-y-6">
                  {Object.values(groupedSpots).map((group) => (
                    <div key={`${group.floor}-${group.zone}`}>
                      <h3 className="font-medium text-gray-700 mb-2">
                        {group.floor}层 {group.zone}区
                      </h3>
                      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {group.spots.map((spot) => (
                          <button
                            key={spot.id}
                            disabled={spot.status !== 'available'}
                            onClick={() => handleSelectSpot(spot)}
                            className={`relative h-16 rounded-lg flex flex-col items-center justify-center text-white text-xs font-medium transition-all ${
                              getSpotTypeColor(spot.type, spot.status)
                            } ${getSpotBorderColor(spot.type)} ${selectedSpot?.id === spot.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                            title={`${spot.spot_number} - ${spot.status === 'available' ? '空闲' : spot.status === 'occupied' ? '占用' : '维护'} - ${getTypeText(spot.type)}`}
                          >
                            {/* 状态图标 - 左上角 */}
                            <span className="absolute top-0 left-1 text-xs">
                              {getStatusIcon(spot.status)}
                            </span>
                            {/* 类型图标 - 右上角 */}
                            <span className="absolute top-0 right-1 text-xs">
                              {getTypeIcon(spot.type)}
                            </span>
                            {/* 车位编号 - 中间 */}
                            <span className="text-white font-bold text-sm">
                              {spot.spot_number}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {spots.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    该停车场暂无车位
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === 3 && selectedSpot && (
            <Card>
              <CardHeader>
                <CardTitle>确认预约</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">停车场</p>
                    <p className="font-medium">{lots.find(l => l.id === selectedLot)?.name}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">车位编号</p>
                    <p className="font-medium">{selectedSpot.spot_number}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">位置</p>
                    <p className="font-medium">{selectedSpot.floor}层 {selectedSpot.zone}区</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">车位类型</p>
                    <p className="font-medium flex items-center gap-2">
                      {getTypeIcon(selectedSpot.type) && <span>{getTypeIcon(selectedSpot.type)}</span>}
                      {getTypeText(selectedSpot.type)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">车牌号</p>
                    <p className="font-medium">{user?.plate_number}</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>计费说明：</strong>每小时10元，不足1小时按1小时计算。
                    结束停车时将自动从您的余额扣除费用。
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    返回修改
                  </Button>
                  <Button 
                    onClick={handleConfirmReservation} 
                    disabled={submitting || !!isBlacklisted}
                    className={isBlacklisted ? 'bg-gray-400 cursor-not-allowed' : ''}
                  >
                    {submitting ? '预约中...' : isBlacklisted ? '已被拉黑，无法预约' : '确认预约'}
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
