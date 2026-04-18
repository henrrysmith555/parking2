'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Car,
  ParkingSquare,
  CalendarCheck,
  BarChart3,
  Settings,
  LogOut,
  User,
  Map,
  Ban,
  Users,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: '仪表盘', href: '/admin', icon: LayoutDashboard },
  { name: '车位管理', href: '/admin/parking-management', icon: ParkingSquare },
  { name: '车辆进出', href: '/admin/vehicles', icon: Car },
  { name: '用户管理', href: '/admin/users', icon: Users },
  { name: '黑名单管理', href: '/admin/blacklist', icon: Ban },
  { name: '预约管理', href: '/admin/reservations', icon: CalendarCheck },
  { name: '数据统计', href: '/admin/statistics', icon: BarChart3 },
  { name: '操作日志', href: '/admin/logs', icon: FileText },
  { name: '酒店地图', href: '/admin/map', icon: Map },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; username: string } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData.role !== 'admin') {
          router.push('/login');
        } else {
          setUser(userData);
        }
      } catch {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleRefresh = () => {
    // 触发自定义刷新事件，各页面可监听此事件
    window.dispatchEvent(new CustomEvent('admin-refresh'));
    // 同时刷新路由
    router.refresh();
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">验证中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="flex w-72 flex-col bg-slate-100 text-slate-800 border-r border-slate-200">
        <div className="flex h-16 items-center justify-center border-b border-slate-200 px-3 bg-white">
          <h1 className="text-base font-semibold text-blue-600 tracking-wide leading-tight text-center">
            酒店停车场车位管理系统
          </h1>
        </div>
        <div className="border-b border-slate-200 p-4 bg-white">
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{user.name}</p>
              <p className="text-sm text-slate-500">管理员</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3 bg-white">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            退出登录
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-4 border-b bg-white px-6 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        </div>
        {/* Page content */}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}
