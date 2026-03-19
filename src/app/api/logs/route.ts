import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取操作日志列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const module = searchParams.get('module');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    let client;
    try {
      client = getSupabaseClient();
    } catch (envError) {
      console.error('Supabase client error:', envError);
      return NextResponse.json({ 
        error: '数据库连接失败，请检查环境变量配置',
        details: 'COZE_SUPABASE_URL 和 COZE_SUPABASE_ANON_KEY 是否正确设置'
      }, { status: 500 });
    }

    // 计算分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 构建查询
    let query = client
      .from('operation_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // 添加过滤条件
    if (module) {
      query = query.eq('module', module);
    }
    if (action) {
      query = query.eq('action', action);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Get logs error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Get logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 创建操作日志
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, username, action, module, description, details, ip_address } = body;

    const client = getSupabaseClient();

    const { data, error } = await client
      .from('operation_logs')
      .insert({
        user_id,
        username,
        action,
        module,
        description,
        details,
        ip_address,
      })
      .select()
      .single();

    if (error) {
      console.error('Create log error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Create log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
