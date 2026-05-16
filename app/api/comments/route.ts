process.env.TZ = 'Asia/Kolkata';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';


function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

const commentsCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 });
  }

  // Check cache
  const cached = commentsCache.get(postId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ comments: cached.data });
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
    if (rawComments.length === 0) {
      commentsCache.set(postId, { data: [], timestamp: Date.now() });
      return NextResponse.json({ comments: [] });
    }

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

    commentsCache.set(postId, { data: comments, timestamp: Date.now() });
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

    // 1. Basic validation
    if (!postId || !trimmedContent || trimmedContent.length > 500 || words > 100) {
      return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
    }

    // Check if user is blocked
    const { data: userData } = await supabase
      .from('wa_users')
      .select('is_blocked')
      .eq('id', user.id)
      .single();

    if (userData?.is_blocked) {
      return NextResponse.json({ ok: false, error: 'Your privileges are suspended.' }, { status: 403 });
    }

    // 2. Check for 3-minute cooldown
    const { data: lastComment } = await supabase
      .from('comments')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastComment) {
      const waitTime = 3 * 60 * 1000; // 3 minutes
      const diff = Date.now() - new Date(lastComment.created_at).getTime();
      if (diff < waitTime) {
        const remaining = Math.ceil((waitTime - diff) / 1000);
        return NextResponse.json({ 
          ok: false, 
          error: `Slow down! Please wait ${Math.floor(remaining / 60)}m ${remaining % 60}s before posting again.` 
        }, { status: 429 });
      }
    }

    // 3. Check for exact duplicate on any post
    const { count: dupCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('content', trimmedContent)
      .limit(1);

    if (dupCount && dupCount > 0) {
      return NextResponse.json({ ok: false, error: 'You have already posted this comment elsewhere.' }, { status: 400 });
    }

    // 4. Check for violation attempts limit
    const { data: violationData } = await supabase
      .from('comment_violations')
      .select('attempts')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

    const attempts = violationData?.attempts || 0;
    if (attempts >= 5) {
      return NextResponse.json({ ok: false, error: 'You have exceeded the comment attempts for this post.' }, { status: 403 });
    }

    // 5. Fast Link Check
    const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\.[a-z]{2,}\/)/i;
    if (linkRegex.test(trimmedContent)) {
      return await handleViolation(user.id, postId, attempts, 'external link');
    }

    // 6. Mistral AI Moderation & Auto-Correction
    const scanResult = await scanWithMistral(trimmedContent);
    
    if (scanResult.startsWith('REJECT:')) {
      const reason = scanResult.split('REJECT:')[1];
      return await handleViolation(user.id, postId, attempts, reason);
    }

    const finalContent = scanResult.startsWith('SAFE:') 
      ? scanResult.split('SAFE:')[1].trim() 
      : trimmedContent;

    // 7. Insert the comment
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: finalContent,
        is_approved: true
      })
      .select('id, content, created_at, wa_users(name)')
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      comment: data,
      message: 'Comment posted successfully!',
    });
  } catch (err: any) {
    console.error('Comment error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

async function handleViolation(userId: number, postId: number, currentAttempts: number, reason: string) {
  const newAttempts = currentAttempts + 1;
  await supabase
    .from('comment_violations')
    .upsert({ 
      user_id: userId, 
      post_id: postId, 
      attempts: newAttempts,
      last_attempt_at: new Date().toISOString()
    });

  const remaining = Math.max(0, 5 - newAttempts);
  return NextResponse.json({ 
    ok: false, 
    error: `Please re-edit. Your comment contains ${reason}. (${remaining} attempts left)`,
    remainingAttempts: remaining
  }, { status: 400 });
}

async function scanWithMistral(text: string): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return 'SAFE:' + text; 

  try {
    const prompt = `You are a lenient and helpful comment moderator.
Analyze this comment for a news site.

RULES:
1. If the comment is safe and in English, Malayalam, or Manglish:
   - Fix any minor spelling or grammar mistakes.
   - Respond ONLY with "SAFE:" followed by the corrected version.
2. If the comment is definitely HATE SPEECH, OBSCENE, SPAM, or TOTAL GIBBERISH (random letters like "asdfgh"):
   - Respond with "REJECT:reason" (choose one: "hate speech", "obscene content", "spam", "nonsensical content").
3. Be friendly and allow informal conversation.

Comment: "${text}"`;

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistral-tiny',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });

    const data = await res.json();
    const result = data.choices[0].message.content.trim();
    
    if (result.toUpperCase().startsWith('SAFE:')) return result;
    if (result.toUpperCase().startsWith('REJECT:')) return result;
    
    return 'SAFE:' + text;
  } catch (e) {
    console.error('Mistral scan error:', e);
    return 'SAFE:' + text;
  }
}



