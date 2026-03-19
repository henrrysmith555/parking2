'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

interface OperationLog {
  id: string;
  user_id: string | null;
  username: string | null;
  action: string;
  module: string;
  description: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const actionLabels: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  login: '登录',
  logout: '登出',
  entry: '入场',
  exit: '出场',
  recharge: '充值',
  payment: '支付',
};

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-purple-100 text-purple-800',
  logout: 'bg-gray-100 text-gray-800',
  entry: 'bg-cyan-100 text-cyan-800',
  exit: 'bg-orange-100 text-orange-800',
  recharge: 'bg-yellow-100 text-yellow-800',
  payment: 'bg-emerald-100 text-emerald-800',
};

const moduleLabels: Record<string, string> = {
  user: '用户',
  parking_lot: '停车场',
  parking_spot: '车位',
  vehicle: '车辆',
  reservation: '预约',
  payment: '支付',
  auth: '认证',
  system: '系统',
};

// 简化描述显示
const simplifyDescription = (description: string | null): string => {
  if (!description) return '-';
  
  // 提取车牌号：用户预约车位：桂A666 -> 车位xxx
  const plateMatch = description.match(/车牌\s*[:：]?\s*([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳])/);
  if (plateMatch) {
    return plateMatch[1];
  }
  
  // 提取用户名：创建用户：xxx 或 删除用户：xxx
  const userMatch = description.match(/用户\s*[:：]?\s*(\S+)/);
  if (userMatch) {
    return userMatch[1];
  }
  
  // 提取金额：支付 ¥xxx 或 费用 ¥xxx
  const amountMatch = description.match(/¥(\d+\.?\d*)/);
  if (amountMatch) {
    return `¥${amountMatch[1]}`;
  }
  
  return description;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchLogs();
  }, [pagination.page]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchLogs();
    };
    window.addEventListener('admin-refresh', handleRefresh);
    return () => window.removeEventListener('admin-refresh', handleRefresh);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('pageSize', pagination.pageSize.toString());

      const response = await fetch(`/api/logs?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('API 路由不存在 (404)，请检查部署是否包含最新代码');
        }
        throw new Error(`请求失败: ${response.status}`);
      }
      
      const result = await response.json();

      if (response.ok) {
        setLogs(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setError(error instanceof Error ? error.message : '加载日志失败');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('zh-CN');
  };

  const getActionLabel = (action: string) => {
    return actionLabels[action] || action;
  };

  const getActionColor = (action: string) => {
    return actionColors[action] || 'bg-gray-100 text-gray-800';
  };

  const getModuleLabel = (module: string) => {
    return moduleLabels[module] || module;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-900 rounded-lg blur-sm opacity-20"></div>
          <h1 className="relative text-3xl font-bold text-gray-800 px-8 py-3 border-2 border-gray-300 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm">
            操作日志
          </h1>
        </div>
      </div>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            日志记录
            <span className="text-sm font-normal text-gray-500">
              共 {pagination.total} 条
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">{error}</p>
              <p className="text-gray-500 text-sm mb-4">请检查：</p>
              <ul className="text-gray-500 text-sm text-left max-w-md mx-auto mb-4">
                <li>1. Vercel 环境变量是否正确设置</li>
                <li>2. Supabase 数据库是否已初始化</li>
                <li>3. 是否重新部署了最新代码</li>
              </ul>
              <Button onClick={fetchLogs} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                重试
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无日志记录</div>
          ) : (
            <>
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">模块</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">操作</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">描述</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatTime(log.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="outline">
                            {getModuleLabel(log.module)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {simplifyDescription(log.description)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  第 {pagination.page} / {pagination.totalPages || 1} 页
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
