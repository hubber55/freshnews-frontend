export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, targetId, position, days, amount } = body;

    const adminSupabase = createAdminClient();
    
    // Get current user if possible (from headers or session if available)
    // For now we'll store as anonymous or try to get user_id from context
    // In a real app, you'd use supabase.auth.getUser() from the cookie

    const { data, error } = await adminSupabase
      .from('payment_requests')
      .insert({
        type,
        target_id: targetId,
        position,
        days,
        amount,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, request: data });
  } catch (error: any) {
    console.error('Payment request error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ requests: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
