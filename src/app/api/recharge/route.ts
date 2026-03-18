import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 充值
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { userId, amount, paymentMethod } = body;

    if (!userId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取用户当前余额
    const { data: user, error: userError } = await client
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const currentBalance = parseFloat(user.balance || '0');
    const rechargeAmount = parseFloat(amount);
    const newBalance = currentBalance + rechargeAmount;

    // 创建充值记录
    const { data: record, error: recordError } = await client
      .from('recharge_records')
      .insert({
        user_id: userId,
        amount: amount,
        payment_method: paymentMethod,
        status: 'completed',
        balance_after: newBalance.toString(),
      })
      .select()
      .single();

    if (recordError) {
      return NextResponse.json({ error: recordError.message }, { status: 500 });
    }

    // 更新用户余额
    const { error: updateError } = await client
      .from('users')
      .update({ balance: newBalance.toString() })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        record,
        newBalance,
      },
      message: '充值成功',
    });
  } catch (error) {
    console.error('Recharge error:', error);
    return NextResponse.json(
      { error: '充值失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 获取充值记录
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = client
      .from('recharge_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
