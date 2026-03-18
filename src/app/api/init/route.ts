import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 系统初始化 - Supabase 版本
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const results: string[] = [];

    // 1. 检查并创建管理员账户（仅在不存在时创建）
    const { data: existingAdmin, error: checkError } = await client
      .from('users')
      .select('id, username, name, role')
      .eq('username', 'admin')
      .single();

    if (!existingAdmin && !checkError) {
      const { error: insertError } = await client
        .from('users')
        .insert({
          id: 'admin-id-001',
          username: 'admin',
          password: 'admin123',
          name: '系统管理员',
          role: 'admin',
          balance: 0,
          is_active: true,
        });

      if (insertError) {
        console.error('Create admin error:', insertError);
        results.push('管理员账户创建失败: ' + insertError.message);
      } else {
        results.push('管理员账户创建成功');
      }
    } else if (existingAdmin) {
      results.push('管理员账户已存在');
    } else {
      results.push('检查管理员账户时出错');
    }

    // 2. 检查数据库连接状态
    const { data: parkingLotsCheck, error: dbError } = await client
      .from('parking_lots')
      .select('id')
      .limit(1);

    if (dbError) {
      results.push('数据库连接检查: ' + dbError.message);
    } else {
      results.push('数据库连接正常');
    }

    // 3. 检查 operation_logs 表
    const { data: logsCheck, error: logsError } = await client
      .from('operation_logs')
      .select('id')
      .limit(1);

    if (logsError) {
      results.push('操作日志表检查: ' + logsError.message);
    } else {
      results.push('操作日志表正常');
    }

    return NextResponse.json({
      success: true,
      message: '系统初始化完成',
      results,
      login: {
        admin: { username: 'admin', password: 'admin123' },
        url: '/login'
      },
    });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '初始化失败',
    }, { status: 500 });
  }
}
