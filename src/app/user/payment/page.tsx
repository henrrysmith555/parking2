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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Wallet, Plus, CreditCard, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  balance: string;
  plate_number: string | null;
}

interface RechargeRecord {
  id: string;
  amount: string;
  payment_method: string;
  status: string;
  balance_after: string;
  created_at: string;
}

interface PaymentRecord {
  id: string;
  plate_number: string;
  amount: string;
  payment_method: string;
  status: string;
  description: string | null;
  created_at: string;
}

const PAGE_SIZE = 5;

export default function UserPayment() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rechargeRecords, setRechargeRecords] = useState<RechargeRecord[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('100');
  const [paymentMethod, setPaymentMethod] = useState('alipay');
  
  // 分页状态
  const [rechargePage, setRechargePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        fetchRecords(userData.id);
      } catch {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const fetchRecords = async (userId: string) => {
    try {
      const [rechargeRes, paymentRes, userRes] = await Promise.all([
        fetch(`/api/recharge?userId=${userId}`),
        fetch(`/api/payment?userId=${userId}`),
        fetch(`/api/users/${userId}`),
      ]);
      
      const rechargeResult = await rechargeRes.json();
      const paymentResult = await paymentRes.json();
      const userResult = await userRes.json();
      
      setRechargeRecords(rechargeResult.data || []);
      setPaymentRecords(paymentResult.data || []);
      
      // 更新用户余额
      if (userResult.data) {
        setUser(userResult.data);
        localStorage.setItem('user', JSON.stringify(userResult.data));
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: rechargeAmount,
          paymentMethod,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // 更新用户余额
        const updatedUser = { ...user, balance: result.data.newBalance };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        fetchRecords(user.id);
        setRechargeDialogOpen(false);
        alert('充值成功！');
      }
    } catch (error) {
      console.error('Failed to recharge:', error);
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'alipay': return '支付宝';
      case 'wechat': return '微信';
      case 'card': return '银行卡';
      case 'balance': return '余额';
      default: return method;
    }
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('zh-CN');
  };

  // 准备图表数据 - 近7天充值统计
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const rechargeChartData = last7Days.map(date => {
    const dayRecharge = rechargeRecords
      .filter(r => r.created_at.startsWith(date))
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);
    
    const dayPayment = paymentRecords
      .filter(r => r.created_at.startsWith(date))
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);

    return {
      date: date.slice(5),
      充值: dayRecharge,
      消费: dayPayment,
    };
  });

  // 分页计算
  const rechargeTotalPages = Math.ceil(rechargeRecords.length / PAGE_SIZE);
  const paymentTotalPages = Math.ceil(paymentRecords.length / PAGE_SIZE);
  
  const paginatedRechargeRecords = rechargeRecords.slice(
    (rechargePage - 1) * PAGE_SIZE,
    rechargePage * PAGE_SIZE
  );
  
  const paginatedPaymentRecords = paymentRecords.slice(
    (paymentPage - 1) * PAGE_SIZE,
    paymentPage * PAGE_SIZE
  );

  // 渲染分页
  const renderPagination = (
    currentPage: number,
    totalPages: number,
    onPageChange: (page: number) => void
  ) => {
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, 'ellipsis', currentPage, 'ellipsis', totalPages);
      }
    }

    return (
      <div className="flex items-center justify-center gap-1 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 px-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {pages.map((page, index) => (
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          )
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 px-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">充值缴费</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => user && fetchRecords(user.id)}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                充值
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>账户充值</DialogTitle>
              <DialogDescription>选择充值金额和支付方式</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>充值金额</Label>
                <div className="grid grid-cols-4 gap-2">
                  {['50', '100', '200', '500'].map((amount) => (
                    <Button
                      key={amount}
                      variant={rechargeAmount === amount ? 'default' : 'outline'}
                      onClick={() => setRechargeAmount(amount)}
                    >
                      ¥{amount}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder="自定义金额"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="grid gap-2">
                <Label>支付方式</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alipay">支付宝</SelectItem>
                    <SelectItem value="wechat">微信支付</SelectItem>
                    <SelectItem value="card">银行卡</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRechargeDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleRecharge}>
                确认充值 ¥{rechargeAmount}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* 余额卡片 */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">账户余额</p>
              <p className="text-4xl font-bold mt-2">¥{user?.balance || '0.00'}</p>
            </div>
            <Wallet className="h-16 w-16 text-blue-200" />
          </div>
        </CardContent>
      </Card>

      {/* 消费统计图表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            近7天充值消费统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={rechargeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="充值" fill="#10B981" />
              <Bar dataKey="消费" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 记录列表 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 充值记录 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              充值记录 ({rechargeRecords.length}条)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paginatedRechargeRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-green-600">+¥{record.amount}</p>
                    <p className="text-xs text-gray-500">{getPaymentMethodText(record.payment_method)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatTime(record.created_at)}</p>
                    <Badge variant="outline" className="text-xs">
                      {record.status === 'completed' ? '已完成' : record.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {rechargeRecords.length === 0 && (
                <p className="text-center text-gray-500 py-4">暂无充值记录</p>
              )}
            </div>
            {renderPagination(rechargePage, rechargeTotalPages, setRechargePage)}
          </CardContent>
        </Card>

        {/* 缴费记录 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              缴费记录 ({paymentRecords.length}条)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paginatedPaymentRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-red-600">-¥{record.amount}</p>
                    <p className="text-xs text-gray-500">{record.plate_number} - {record.description || '停车缴费'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatTime(record.created_at)}</p>
                    <Badge variant="outline" className="text-xs">
                      {record.status === 'completed' ? '已完成' : record.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {paymentRecords.length === 0 && (
                <p className="text-center text-gray-500 py-4">暂无缴费记录</p>
              )}
            </div>
            {renderPagination(paymentPage, paymentTotalPages, setPaymentPage)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
