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
      .select('id, content, created_at, user_id, wa_users(name, username)')
      .eq('post_id', postId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(50);

    const rawComments = data || [];
    if (rawComments.length === 0) return NextResponse.json({ comments: [] });

    const userIds = [...new Set(rawComments.map((c) => c.user_id).filter(Boolean))];

    const { data: usersData } = await supabase
      .from('wa_users')
      .select('id, name, username')
      .in('id', userIds);

    const userMap: Record<string, { name?: string; username?: string }> = {};
    (usersData || []).forEach((u) => {
      userMap[u.id.toString()] = {
        ...u,
        username: u.username || u.name || '',
      };
    });

    const comments = rawComments.map((c) => {
      const user = Array.isArray(c.wa_users) ? c.wa_users[0] : c.wa_users;
      return {
        ...c,
        wa_users: user
          ? {
              ...user,
              username: user.username || user.name || '',
            }
          : (userMap[c.user_id?.toString()] || null),
      };
    });

    return NextResponse.json({ comments });
  } catch (error: unknown) {
    console.error('Fetch comments error:', error);
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

    const { data: userData } = await supabase
      .from('wa_users')
      .select('is_blocked')
      .eq('id', user.id)
      .single();

    if (userData?.is_blocked) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Your commenting privileges have been suspended. Please contact support.',
        },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: trimmedContent,
        is_approved: false
      })
      .select('id, content, created_at, wa_users(name)')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: 'Failed to post comment' }, { status: 500 });
    }

    const postUrl = `${req.nextUrl.origin}/posts/${postId}`;

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

