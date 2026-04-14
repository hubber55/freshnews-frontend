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
  const baseUrl = (process.env.OPEN_WA_BASE_URL || '').replace(/\/+$/, '');
  const path = process.env.OPEN_WA_SENDTEXT_PATH || '/sendText';
  const apiKey = process.env.OPEN_WA_API_KEY || '';

  if (!baseUrl) {
    throw new Error('Missing OPEN_WA_BASE_URL');
  }

  // open-wa commonly expects chatId like "911234567890@c.us"
  const chatId = `${toDigits}@c.us`;
  const message = `Your FreshNews OTP is: ${otp}`;

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ chatId, message }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`open-wa sendText failed: ${res.status} ${text}`);
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

