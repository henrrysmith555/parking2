import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取缴费记录
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = client
      .from('payment_records')
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

// 创建缴费记录（从余额支付）
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { userId, recordId, plateNumber, amount, paymentMethod } = body;

    if (!userId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 如果是余额支付，检查余额
    if (paymentMethod === 'balance') {
      const { data: user, error: userError } = await client
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 });
      }

      const currentBalance = parseFloat(user.balance || '0');
      const payAmount = parseFloat(amount);

      if (currentBalance < payAmount) {
        return NextResponse.json(
          { error: '余额不足，请先充值' },
          { status: 400 }
        );
      }

      // 扣除余额
      const newBalance = currentBalance - payAmount;
      await client
        .from('users')
        .update({ balance: newBalance.toString() })
        .eq('id', userId);
    }

    // 创建缴费记录
    const { data: record, error } = await client
      .from('payment_records')
      .insert({
        user_id: userId,
        record_id: recordId,
        plate_number: plateNumber,
        amount: amount,
        payment_method: paymentMethod,
        status: 'completed',
        description: '停车缴费',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: record,
      message: '支付成功',
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { error: '支付失败，请稍后重试' },
      { status: 500 }
    );
  }
}
