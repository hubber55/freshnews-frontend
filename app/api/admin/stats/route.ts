export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Pending submissions count
    const { count: pendingSubmissions } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Ending posts count (expiring in next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const { count: endingPosts } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .not('expires_at', 'is', null)
      .lte('expires_at', sevenDaysFromNow.toISOString())
      .gt('expires_at', new Date().toISOString());

    // Total users count
    const { count: totalUsers } = await supabase
      .from('wa_users')
      .select('*', { count: 'exact', head: true });

    // Push subscribers count
    const { count: pushSubscribers } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });

    // Pending payments count
    const { count: pendingPayments } = await supabase
      .from('payment_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return NextResponse.json({
      pendingSubmissions: pendingSubmissions || 0,
      endingPosts: endingPosts || 0,
      totalUsers: totalUsers || 0,
      pushSubscribers: pushSubscribers || 0,
      pendingPayments: pendingPayments || 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
