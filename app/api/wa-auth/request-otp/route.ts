import { NextResponse } from 'next/server';
import crypto from 'crypto';

function normalizeWhatsAppNumber(input: string) {
  const digits = (input || '').replace(/[^\d]/g, '');
  // Basic: require country code + number, min 10 digits
  if (digits.length < 10) return null;
  return digits;
}

function maskNumber(digits: string) {
  if (digits.length <= 4) return 'xxxx';
  const last4 = digits.slice(-4);
  return `${'x'.repeat(Math.max(0, digits.length - 4))}${last4}`;
}

function hashOtp(otp: string) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

async function sendOtpViaOpenWa(toDigits: string, otp: string) {
  const baseUrlRaw = (process.env.OPEN_WA_BASE_URL || '').trim();
  const baseUrl = baseUrlRaw.replace(/\/+$/, '');
  // wa-automate / open-wa easy API commonly exposes:
  //   POST /api/messages/send-text
  // and sometimes:
  //   POST /api/default/messages/send-text
  const rawPath = process.env.OPEN_WA_SENDTEXT_PATH || '/api/messages/send-text';
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const apiKey = process.env.OPEN_WA_API_KEY || '';

  if (!baseUrl) {
    throw new Error('Missing OPEN_WA_BASE_URL');
  }

  // Swagger for this instance shows:
  // POST /sendText with JSON { args: { to: "xxxxxxxx@c.us", content: "..." } }
  const to = `${toDigits}@c.us`;
  const text = `Your FreshNews OTP is: ${otp}`;

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;

  const body = JSON.stringify({ args: { to, content: text } });

  const resolveUrl = (p: string) => {
    // Safe join even if baseUrl includes a path segment.
    const u = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    return new URL(p.replace(/^\//, ''), u).toString();
  };

  const doPost = async (p: string) =>
    fetch(resolveUrl(p), {
      method: 'POST',
      headers,
      body,
    });

  const candidates = Array.from(
    new Set([
      path,
      path.startsWith('/api/') && !path.startsWith('/api/default/') ? path.replace(/^\/api\//, '/api/default/') : null,
      path.startsWith('/api/default/') ? path.replace(/^\/api\/default\//, '/api/') : null,
      '/api/messages/send-text',
      '/api/default/messages/send-text',
    ].filter(Boolean) as string[])
  );

  let res: Response | null = null;
  let lastBody = '';
  const tried: string[] = [];

  for (const p of candidates) {
    const url = resolveUrl(p);
    tried.push(url);
    res = await doPost(p);
    if (res.ok) return;
    lastBody = await res.text().catch(() => '');
    if (res.status !== 404) break;
  }

  if (!res) {
    throw new Error(`open-wa sendText failed: no response (tried: ${tried.join(', ')})`);
  }
  if (!res.ok) {
    throw new Error(`open-wa sendText failed: ${res.status} ${lastBody} (tried: ${tried.join(', ')})`);
  }
}

export async function POST(req: Request) {
  try {
    const { name, whatsappNumber } = (await req.json()) as { name?: string; whatsappNumber?: string };
    const digits = normalizeWhatsAppNumber(whatsappNumber || '');
    if (!digits) {
      return NextResponse.json({ ok: false, error: 'Invalid WhatsApp number' }, { status: 400 });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store in Supabase (table expected: wa_otps)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, key);

    await supabase.from('wa_otps').insert({
      name: (name || '').slice(0, 80) || null,
      whatsapp_number: digits,
      otp_hash: otpHash,
      expires_at: expiresAt,
      consumed_at: null,
    });

    await sendOtpViaOpenWa(digits, otp);

    return NextResponse.json({ ok: true, masked: maskNumber(digits) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}
