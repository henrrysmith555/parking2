'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">系统设置</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>收费规则设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="firstHourRate">首小时费率（元）</Label>
            <Input id="firstHourRate" type="number" defaultValue="5" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="additionalRate">后续每小时费率（元）</Label>
            <Input id="additionalRate" type="number" defaultValue="3" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="maxDailyRate">每日封顶费用（元）</Label>
            <Input id="maxDailyRate" type="number" defaultValue="50" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="freeMinutes">免费时长（分钟）</Label>
            <Input id="freeMinutes" type="number" defaultValue="15" />
          </div>
          <Button>保存设置</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>系统信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">系统版本</span>
            <span className="text-sm text-gray-600">v1.0.0</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">开发框架</span>
            <span className="text-sm text-gray-600">Next.js 16 + Supabase</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">毕业设计</span>
            <span className="text-sm text-gray-600">酒店停车场车位远程监测与管理系统</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
