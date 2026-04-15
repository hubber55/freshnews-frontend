import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 });
  }

  try {
    const { data } = await supabase
      .from('comments')
      .select('id, content, created_at, wa_users(name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ comments: data || [] });
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { postId, content } = await req.json();
    if (!postId || !content || content.length > 500) {
      return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
      })
      .select('id, content, created_at, wa_users(name)')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: 'Failed to post comment' }, { status: 500 });
    }

    // Send WhatsApp message
    try {
      await fetch(process.env.WHATSAPP_WEBHOOK_URL || 'https://example.com/whatsapp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: '917907005054',
          message: `New comment on post ${postId}: ${content}`,
        }),
      });
    } catch {
      // Ignore WhatsApp send failure
    }

    return NextResponse.json({ ok: true, comment: data });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}