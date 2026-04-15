import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  // Whatspie calls this endpoint via POST. A GET helps quick browser checks.
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);

  // Always respond quickly so Whatspie doesn't retry aggressively.
  const res = NextResponse.json({ ok: true });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, key);

    // Optional table for debugging inbound webhook payloads:
    // whatspie_webhooks(id, payload, created_at)
    await supabase.from('whatspie_webhooks').insert({ payload });
  } catch {
    // ignore logging failures
  }

  return res;
}
