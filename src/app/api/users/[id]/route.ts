import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取用户信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    const { data: user, error } = await client
      .from('users')
      .select('id, username, name, role, phone, email, balance, plate_number, is_active, created_at')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 更新用户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // 支持所有字段更新
    if (body.username !== undefined) updateData.username = body.username;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.plateNumber !== undefined) updateData.plate_number = body.plateNumber || null;
    if (body.plate_number !== undefined) updateData.plate_number = body.plate_number || null;
    if (body.role !== undefined) updateData.role = body.role;

    // 处理密码更新
    if (body.password) {
      updateData.password = body.password;
    }

    const { data, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, name, role, phone, email, balance, plate_number, is_active, created_at')
      .single();

    if (error) {
      console.error('Update user error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true, message: '用户信息更新成功' });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    // 检查是否是管理员
    const { data: user } = await client
      .from('users')
      .select('role')
      .eq('id', id)
      .single();

    if (user?.role === 'admin') {
      return NextResponse.json({ error: '不能删除管理员账户' }, { status: 400 });
    }

    const { error } = await client
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '用户已删除' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
