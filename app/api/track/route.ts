export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type TrackPayload = {
  postId: number;
  sessionId: string;
  eventType: 'click' | 'share';
  network?: 'facebook' | 'x' | 'telegram' | 'whatsapp' | 'native';
};

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Prefer service role (bypasses RLS) for writes. If not available, fall back to anon.
  const key = serviceRoleKey || anonKey;
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Partial<TrackPayload>;
    const postId = Number(payload.postId);
    const sessionId = String(payload.sessionId ?? '').trim();
    const eventType = payload.eventType;
    const network = payload.network ?? null;

    if (!Number.isFinite(postId) || postId <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid postId' }, { status: 400 });
    }
    if (!sessionId || sessionId.length < 8) {
      return NextResponse.json({ ok: false, error: 'Invalid sessionId' }, { status: 400 });
    }
    if (eventType !== 'click' && eventType !== 'share') {
      return NextResponse.json({ ok: false, error: 'Invalid eventType' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // Table expected in Supabase:
    // post_events(id, post_id, session_id, event_type, network, created_at)
    const { error } = await supabase.from('post_events').insert({
      post_id: postId,
      session_id: sessionId,
      event_type: eventType,
      network,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

