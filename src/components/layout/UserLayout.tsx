'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  User,
  CalendarCheck,
  CreditCard,
  BarChart3,
  LogOut,
  Car,
  Map,
  Lock,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const navigation = [
  { name: '个人中心', href: '/user', icon: User },
  { name: '预约停车', href: '/user/reservation', icon: CalendarCheck },
  { name: '充值缴费', href: '/user/payment', icon: CreditCard },
  { name: '停车记录', href: '/user/records', icon: BarChart3 },
  { name: '酒店地图', href: '/user/map', icon: Map },
  { name: '修改密码', href: '/user/change-password', icon: Lock },
];

export default function UserLayout({
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
        if (userData.role === 'admin') {
          router.push('/admin');
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

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">验证中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - 固定定位 */}
      <div className="fixed left-0 top-0 h-screen w-72 flex flex-col bg-gradient-to-b from-blue-50 to-blue-100 text-slate-800 border-r border-blue-200 z-10">
        <div className="flex h-16 items-center justify-center border-b border-blue-200 bg-white">
          <div className="flex items-center gap-2">
            <Car className="h-7 w-7 text-blue-600" />
            <h1 className="text-xl font-bold text-blue-600">智慧停车</h1>
          </div>
        </div>
        <div className="border-b border-blue-200 p-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{user.name}</p>
              <p className="text-sm text-slate-500">用户</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
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
        <div className="border-t border-blue-200 p-3 bg-white">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            退出登录
          </button>
        </div>
      </div>

      {/* Main content - 左侧留出侧边栏宽度 */}
      <main className="ml-72 min-h-screen overflow-auto">
        <div className="h-full p-6">{children}</div>
      </main>
    </div>
  );
}
