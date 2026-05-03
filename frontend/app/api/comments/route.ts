import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

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
    const trimmedContent = String(content || '').trim();
    const words = countWords(trimmedContent);
    if (!postId || !trimmedContent || trimmedContent.length > 500 || words > 100) {
      return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: trimmedContent,
      })
      .select('id, content, created_at, wa_users(name)')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: 'Failed to post comment' }, { status: 500 });
    }

    const postUrl = `${req.nextUrl.origin}/posts/${postId}`;

    // Send WhatsApp message
    try {
      await fetch(process.env.WHATSAPP_WEBHOOK_URL || 'https://example.com/whatsapp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: '917907005054',
          message: `New comment posted. Please moderate.\nPost: ${postUrl}\nComment: ${trimmedContent}`,
        }),
      });
    } catch {
      // Ignore WhatsApp send failure
    }

    return NextResponse.json({
      ok: true,
      comment: data,
      message: 'Comments will be moderated and published soon',
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
