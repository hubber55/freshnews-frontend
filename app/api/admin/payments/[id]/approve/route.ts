import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { addDays } from 'date-fns';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const adminSupabase = createAdminClient();

    // 1. Get the request details
    const { data: request, error: fetchError } = await adminSupabase
      .from('payment_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Request already processed');

    // 2. Perform actions based on type
    if (request.type === 'lock_news') {
      const lockedUntil = addDays(new Date(), request.days).toISOString();
      
      const { error: updatePostError } = await adminSupabase
        .from('posts')
        .update({
          is_locked: true,
          locked_position: request.position,
          locked_until: lockedUntil
        })
        .eq('id', request.target_id);

      if (updatePostError) throw updatePostError;
    } 
    // Handle 'ad' type here later

    // 3. Update request status
    const { error: updateRequestError } = await adminSupabase
      .from('payment_requests')
      .update({ status: 'approved' })
      .eq('id', id);

    if (updateRequestError) throw updateRequestError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Approve payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
