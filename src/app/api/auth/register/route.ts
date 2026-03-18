import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 用户注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, name, phone, email, plateNumber, role } = body;

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: '用户名、密码和姓名不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 检查用户名是否已存在
    const { data: existingUser } = await client
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 400 }
      );
    }

    // 创建用户
    const { data: user, error } = await client
      .from('users')
      .insert({
        username,
        password,
        name,
        phone,
        email,
        plate_number: plateNumber,
        role: role || 'user',
        balance: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 不返回密码
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: '注册成功',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
