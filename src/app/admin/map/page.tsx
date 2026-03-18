'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Layers, ZoomIn, ZoomOut } from 'lucide-react';

interface ParkingSpot {
  id: string;
  spot_number: string;
  floor: string;
  zone: string;
  status: string;
  type: string;
}

interface ParkingLot {
  id: string;
  name: string;
  location: string;
  total_spots: number;
  available_spots: number;
}

export default function HotelMap() {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedLot, setSelectedLot] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('B1');
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapScale, setMapScale] = useState(1);

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
      const response = await fetch('/api/parking-lots?isActive=true');
      const result = await response.json();
      setLots(result.data || []);
      if (result.data?.length > 0) {
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

  const filteredSpots = spots.filter(s => s.floor === selectedFloor);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600';
      case 'occupied': return 'bg-red-500 hover:bg-red-600';
      case 'maintenance': return 'bg-gray-500 hover:bg-gray-600';
      default: return 'bg-gray-400';
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return '空闲';
      case 'occupied': return '占用';
      case 'maintenance': return '维护';
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'charging': return '充电车位';
      case 'disabled': return '无障碍车位';
      default: return '普通车位';
    }
  };

  // 根据车位类型获取颜色
  const getSpotTypeColor = (type: string, status: string) => {
    if (status === 'maintenance') return 'bg-gray-500';
    if (status === 'occupied') return 'bg-red-500';
    
    // 空闲状态下，根据类型显示不同颜色
    switch (type) {
      case 'charging': return 'bg-green-400';  // 充电位 - 浅绿色
      case 'disabled': return 'bg-blue-400';   // 无障碍 - 蓝色
      default: return 'bg-green-500';          // 普通 - 深绿色
    }
  };

  // 获取车位边框颜色（根据类型）
  const getSpotBorderColor = (type: string) => {
    switch (type) {
      case 'charging': return 'border-2 border-yellow-400';  // 充电位黄色边框
      case 'disabled': return 'border-2 border-blue-500';    // 无障碍蓝色边框
      default: return '';                                     // 普通无边框
    }
  };

  // 生成模拟的酒店楼层布局
  const zones = ['A', 'B', 'C', 'D'];
  const floors = ['B1', 'B2', 'B3'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg blur-sm opacity-20"></div>
          <h1 className="relative text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent px-8 py-3 border-2 border-emerald-200 rounded-lg bg-white/50 backdrop-blur-sm">
            酒店地图
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：停车场选择和图例 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                选择停车场
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lots.map((lot) => (
                  <button
                    key={lot.id}
                    onClick={() => setSelectedLot(lot.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                      selectedLot === lot.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{lot.name}</span>
                      <Badge variant="outline">{lot.available_spots}空闲</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{lot.location}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                选择楼层
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {floors.map((floor) => (
                  <Button
                    key={floor}
                    variant={selectedFloor === floor ? 'default' : 'outline'}
                    onClick={() => setSelectedFloor(floor)}
                  >
                    {floor}层
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 选中车位信息 */}
          {selectedSpot && (
            <Card className="border-blue-500">
              <CardHeader>
                <CardTitle>车位详情</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">车位编号</span>
                    <span className="font-medium">{selectedSpot.spot_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">位置</span>
                    <span className="font-medium">{selectedSpot.floor}层 {selectedSpot.zone}区</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">状态</span>
                    <Badge>{getStatusText(selectedSpot.status)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">类型</span>
                    <span className="font-medium">{getTypeText(selectedSpot.type)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：地图视图 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  {selectedFloor}层平面图
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMapScale(Math.min(mapScale + 0.1, 1.5))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMapScale(Math.max(mapScale - 0.1, 0.7))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 图例说明 - 平面图上方 */}
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

              <div 
                className="relative bg-gray-100 rounded-lg p-6 overflow-auto"
                style={{ minHeight: '500px' }}
              >
                {/* 酒店建筑轮廓 */}
                <div 
                  className="relative mx-auto border-2 border-gray-300 bg-gray-50 rounded-lg"
                  style={{ 
                    width: `${600 * mapScale}px`, 
                    height: `${450 * mapScale}px`,
                  }}
                >
                  {/* 入口标识 */}
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ fontSize: `${12 * mapScale}px` }}
                  >
                    🚗 入口
                  </div>

                  {/* 出口标识 */}
                  <div 
                    className="absolute bottom-0 right-4 translate-y-1/2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ fontSize: `${12 * mapScale}px` }}
                  >
                    🚙 出口
                  </div>

                  {/* 电梯标识 */}
                  <div 
                    className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-2 rounded text-xs"
                    style={{ fontSize: `${10 * mapScale}px` }}
                  >
                    🛗 电梯
                  </div>

                  {/* 区域划分 */}
                  {zones.map((zone, zoneIndex) => {
                    const zoneSpots = filteredSpots.filter(s => s.zone === zone);
                    const startX = 20 + zoneIndex * 140;

                    return (
                      <div 
                        key={zone}
                        className="absolute"
                        style={{ 
                          left: `${startX * mapScale}px`, 
                          top: `${40 * mapScale}px`,
                        }}
                      >
                        {/* 区域标题 */}
                        <div 
                          className="text-center font-bold text-gray-600 mb-2"
                          style={{ fontSize: `${14 * mapScale}px` }}
                        >
                          {zone}区
                        </div>

                        {/* 车位网格 */}
                        <div 
                          className="grid gap-1"
                          style={{ 
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            width: `${120 * mapScale}px`,
                          }}
                        >
                          {zoneSpots.map((spot) => (
                            <button
                              key={spot.id}
                              onClick={() => setSelectedSpot(spot)}
                              className={`relative flex flex-col items-center justify-center rounded-md transition-all ${
                                getSpotTypeColor(spot.type, spot.status)
                              } ${getSpotBorderColor(spot.type)} ${
                                selectedSpot?.id === spot.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                              }`}
                              style={{ 
                                width: `${55 * mapScale}px`, 
                                height: `${45 * mapScale}px`,
                              }}
                              title={`${spot.spot_number} - ${getTypeText(spot.type)} - ${getStatusText(spot.status)}`}
                            >
                              {/* 状态图标 - 左上角 */}
                              <span 
                                className="absolute top-0 left-1"
                                style={{ fontSize: `${10 * mapScale}px` }}
                              >
                                {getStatusIcon(spot.status)}
                              </span>
                              {/* 类型图标 - 右上角 */}
                              <span 
                                className="absolute top-0 right-1"
                                style={{ fontSize: `${10 * mapScale}px` }}
                              >
                                {getTypeIcon(spot.type)}
                              </span>
                              {/* 车位编号 - 中间 */}
                              <span 
                                className="text-white font-bold"
                                style={{ fontSize: `${11 * mapScale}px` }}
                              >
                                {spot.spot_number}
                              </span>
                            </button>
                          ))}

                          {/* 如果该区域没有车位，显示占位 */}
                          {zoneSpots.length === 0 && (
                            <div 
                              className="col-span-2 text-center text-gray-400 py-4"
                              style={{ fontSize: `${12 * mapScale}px` }}
                            >
                              暂无车位
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* 行车道标识 */}
                  <div 
                    className="absolute left-0 right-0 h-8 flex items-center justify-center"
                    style={{ top: `${380 * mapScale}px` }}
                  >
                    <div 
                      className="flex-1 border-t-2 border-dashed border-gray-300"
                    ></div>
                    <span 
                      className="px-4 text-gray-400"
                      style={{ fontSize: `${10 * mapScale}px` }}
                    >
                      ← 行车道 →
                    </span>
                    <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
