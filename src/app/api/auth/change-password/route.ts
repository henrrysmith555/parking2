import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { userId, oldPassword, newPassword } = body;

    if (!userId || !oldPassword || !newPassword) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 验证旧密码
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, password')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (user.password !== oldPassword) {
      return NextResponse.json({ error: '当前密码错误' }, { status: 400 });
    }

    // 更新密码
    const { error: updateError } = await client
      .from('users')
      .update({ password: newPassword, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
