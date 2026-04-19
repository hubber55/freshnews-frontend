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

async function sendOtpViaWhatspie(receiverDigits: string, otp: string) {
  const token = (process.env.WHATSPIE_API_TOKEN || '').trim();
  const device = (process.env.WHATSPIE_DEVICE || '').trim();

  if (!token) throw new Error('Missing WHATSPIE_API_TOKEN');
  if (!device) throw new Error('Missing WHATSPIE_DEVICE');

  const message = `Freshnews OTP: ${otp}`;

  const res = await fetch('https://api.whatspie.com/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      device,
      receiver: receiverDigits,
      type: 'chat',
      params: { text: message },
      simulate_typing: 1,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Whatspie send failed: ${res.status} ${JSON.stringify(json)}`);
  }
}

export async function POST(req: Request) {
  try {
    const { name, whatsappNumber } = (await req.json()) as { name?: string; whatsappNumber?: string };
    const digits = normalizeWhatsAppNumber(whatsappNumber || '');
    if (!digits) {
      return NextResponse.json({ ok: false, error: 'Invalid WhatsApp number' }, { status: 400 });
    }
    
    // Validate name length (max 15 characters)
    if (name && name.length > 15) {
      return NextResponse.json({ ok: false, error: 'Name must be 15 characters or less' }, { status: 400 });
    }

    // Initialize Supabase client early for user lookup
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, key);

    // Check if user already exists (for signup flow - when name is provided)
    if (name) {
      const { data: existingUser } = await supabase
        .from('wa_users')
        .select('whatsapp_number')
        .eq('whatsapp_number', digits)
        .single();
      
      if (existingUser) {
        return NextResponse.json({ ok: false, error: 'Already registered. Please login' }, { status: 400 });
      }
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from('wa_otps').insert({
      name: (name || '').slice(0, 15) || null,
      whatsapp_number: digits,
      otp_hash: otpHash,
      expires_at: expiresAt,
      consumed_at: null,
    });

    await sendOtpViaWhatspie(digits, otp);

    return NextResponse.json({ ok: true, masked: maskNumber(digits) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}
