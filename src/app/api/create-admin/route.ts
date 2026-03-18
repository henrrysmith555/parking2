import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 创建管理员账户
export async function GET() {
  try {
    const client = getSupabaseClient();

    // 先检查管理员是否存在
    const { data: existingAdmin, error: checkError } = await client
      .from('users')
      .select('id, username')
      .eq('username', 'admin')
      .single();

    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: '管理员账户已存在',
        user: existingAdmin,
      });
    }

    // 创建管理员
    const { data, error } = await client
      .from('users')
      .insert({
        username: 'admin',
        password: 'admin123',
        name: '系统管理员',
        role: 'admin',
        balance: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '管理员账户创建成功',
      user: data,
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '创建失败',
    }, { status: 500 });
  }
}
