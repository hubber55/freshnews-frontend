export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const { postId, position, days } = await req.json();

    if (!postId || !position) {
      return NextResponse.json({ error: 'postId and position are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Calculate locked_until
    const lockedUntil = new Date();
    lockedUntil.setDate(lockedUntil.getDate() + (days || 1));

    const { data, error } = await supabase
      .from('posts')
      .update({
        is_locked: true,
        locked_position: position,
        locked_until: lockedUntil.toISOString()
      })
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      console.error('Locking error:', error);
      return NextResponse.json({ error: 'Failed to lock post' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, post: data });
  } catch (error: any) {
    console.error('Lock API Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
