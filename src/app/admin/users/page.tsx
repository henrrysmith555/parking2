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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus,
  RefreshCw,
  Phone,
  Mail,
  Car,
  Shield,
  User,
  Key,
} from 'lucide-react';

interface UserInfo {
  id: string;
  username: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  balance: string | number;
  plate_number: string | null;
  is_active: boolean;
  created_at: string;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'user',
    phone: '',
    email: '',
    plateNumber: '',
  });

  useEffect(() => {
    fetchUsers();

    // 监听全局刷新事件
    const handleRefresh = () => fetchUsers();
    window.addEventListener('admin-refresh', handleRefresh);
    return () => window.removeEventListener('admin-refresh', handleRefresh);
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      setUsers(result.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'user',
      phone: '',
      email: '',
      plateNumber: '',
    });
    setEditingUser(null);
  };

  const handleOpenDialog = (user?: UserInfo) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        name: user.name,
        role: user.role,
        phone: user.phone || '',
        email: user.email || '',
        plateNumber: user.plate_number || '',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.username || !formData.name) {
      alert('用户名和姓名不能为空');
      return;
    }

    if (!editingUser && !formData.password) {
      alert('新用户必须设置密码');
      return;
    }

    setSubmitting(true);
    
    try {
      if (editingUser) {
        // 更新用户
        const updateData: Record<string, string> = {
          username: formData.username,
          name: formData.name,
          role: formData.role,
          phone: formData.phone || '',
          email: formData.email || '',
          plate_number: formData.plateNumber || '',
        };
        if (formData.password) {
          updateData.password = formData.password;
        }

        const response = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
          fetchUsers();
          setDialogOpen(false);
          resetForm();
          alert('用户信息更新成功');
        } else {
          alert(result.error || '更新失败');
        }
      } else {
        // 创建用户
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            name: formData.name,
            role: formData.role,
            phone: formData.phone || null,
            email: formData.email || null,
            plateNumber: formData.plateNumber || null,
          }),
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
          fetchUsers();
          setDialogOpen(false);
          resetForm();
          alert('用户创建成功');
        } else {
          alert(result.error || '创建失败');
        }
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      alert('操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此用户吗？此操作不可恢复。')) return;

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        fetchUsers();
        alert('用户已删除');
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('删除失败，请重试');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm)) ||
      (user.plate_number && user.plate_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const formatBalance = (balance: string | number) => {
    const num = typeof balance === 'string' ? parseFloat(balance) : balance;
    return num.toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题与操作按钮 */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg blur-sm opacity-20"></div>
          <div className="relative text-center px-8 py-3 border-2 border-green-200 rounded-lg bg-white/50 backdrop-blur-sm">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">用户管理</h1>
            <p className="text-gray-500 mt-1 text-sm">管理系统用户账户和信息</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <UserPlus className="mr-2 h-4 w-4" />
          添加用户
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm text-gray-500">总用户数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{users.filter(u => u.role === 'user').length}</div>
                <div className="text-sm text-gray-500">普通用户</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</div>
                <div className="text-sm text-gray-500">管理员</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索用户名、姓名、手机号、车牌号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
                <SelectItem value="user">普通用户</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            用户列表 ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              加载中...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>暂无用户数据</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">用户名</TableHead>
                    <TableHead className="font-semibold">姓名</TableHead>
                    <TableHead className="font-semibold">角色</TableHead>
                    <TableHead className="font-semibold">联系方式</TableHead>
                    <TableHead className="font-semibold">车牌号</TableHead>
                    <TableHead className="font-semibold">余额</TableHead>
                    <TableHead className="font-semibold">状态</TableHead>
                    <TableHead className="font-semibold text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium text-gray-900">{user.username}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                            {user.name.charAt(0)}
                          </div>
                          <span>{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className={user.role === 'admin' ? 'bg-purple-500 hover:bg-purple-600' : ''}
                        >
                          {user.role === 'admin' ? '管理员' : '用户'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {user.phone && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                          {user.email && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          )}
                          {!user.phone && !user.email && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <span className="text-gray-400">-</span>
                        ) : user.plate_number ? (
                          <Badge variant="outline" className="font-mono">
                            <Car className="h-3 w-3 mr-1" />
                            {user.plate_number}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <span className="font-medium text-green-600">¥{formatBalance(user.balance)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <Badge 
                            variant={user.is_active ? 'default' : 'destructive'}
                            className={user.is_active ? 'bg-green-500 hover:bg-green-600' : ''}
                          >
                            {user.is_active ? '正常' : '禁用'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(user)}
                            className="h-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(user.id)}
                            disabled={user.role === 'admin'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑/添加对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingUser ? (
                <>
                  <Edit className="h-5 w-5 text-blue-500" />
                  编辑用户
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 text-green-500" />
                  添加用户
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? `修改用户 "${editingUser.username}" 的信息` : '创建新的用户账户'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 基本信息 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="h-4 w-4" />
                基本信息
              </div>
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">用户名 *</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="登录用户名"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">姓名 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="用户姓名"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* 账户设置 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Key className="h-4 w-4" />
                账户设置
              </div>
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">
                    {editingUser ? '新密码' : '密码 *'}
                  </Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '留空不修改' : '请输入密码'}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">角色</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">普通用户</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 联系方式 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Phone className="h-4 w-4" />
                联系方式
              </div>
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">手机号</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="手机号"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">邮箱</Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="邮箱"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* 车辆信息 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Car className="h-4 w-4" />
                车辆信息
              </div>
              <div className="pl-6">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">车牌号</Label>
                  <Input
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                    placeholder="京A12345"
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setDialogOpen(false); resetForm(); }}
              disabled={submitting}
            >
              取消
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={submitting}
              className="min-w-[80px]"
            >
              {submitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : editingUser ? (
                '保存修改'
              ) : (
                '创建用户'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
