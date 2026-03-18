import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/storage/database/vercel-postgres-client';

// 用户登录 - Vercel Postgres 版本
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 查询用户
    const user = await queryOne(
      'SELECT * FROM users WHERE username = $1 AND password = $2 AND is_active = true',
      [username, password]
    );

    if (!user) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 不返回密码
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: '登录成功',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
