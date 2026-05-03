import { NextResponse } from 'next/server';
import crypto from 'crypto';

function normalizeWhatsAppNumber(input: string) {
  const digits = (input || '').replace(/[^\d]/g, '');
  if (digits.length < 10) return null;
  return digits;
}

function hashOtp(otp: string) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function signToken(payload: object, secret: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export async function POST(req: Request) {
  try {
    const { whatsappNumber, otp, name } = (await req.json()) as { whatsappNumber?: string; otp?: string; name?: string };
    const digits = normalizeWhatsAppNumber(whatsappNumber || '');
    const otpStr = String(otp || '').trim();
    if (!digits || otpStr.length !== 4) {
      return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, key);

    const otpHash = hashOtp(otpStr);
    const nowIso = new Date().toISOString();

    // Find latest unconsumed OTP for this number
    const { data: rows } = await supabase
      .from('wa_otps')
      .select('id, otp_hash, expires_at, consumed_at')
      .eq('whatsapp_number', digits)
      .is('consumed_at', null)
      .order('id', { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) return NextResponse.json({ ok: false, error: 'OTP not found' }, { status: 400 });
    if (row.otp_hash !== otpHash) return NextResponse.json({ ok: false, error: 'Wrong OTP' }, { status: 400 });
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ ok: false, error: 'OTP expired' }, { status: 400 });
    }

    await supabase.from('wa_otps').update({ consumed_at: nowIso }).eq('id', row.id);

    // Upsert user (table expected: wa_users)
    const displayName = (name || '').slice(0, 15) || null;
    const { data: existing } = await supabase
      .from('wa_users')
      .select('id, name')
      .eq('whatsapp_number', digits)
      .limit(1);

    let userId: number | null = existing?.[0]?.id ?? null;
    if (!userId) {
      const { data: inserted } = await supabase
        .from('wa_users')
        .insert({ whatsapp_number: digits, name: displayName })
        .select('id')
        .single();
      userId = inserted?.id ?? null;
    } else if (displayName && !existing?.[0]?.name) {
      await supabase.from('wa_users').update({ name: displayName }).eq('id', userId);
    }

    const secret = process.env.WA_AUTH_SECRET || '';
    if (!secret) {
      return NextResponse.json({ ok: false, error: 'Missing WA_AUTH_SECRET' }, { status: 500 });
    }

    const token = signToken(
      { sub: userId, wa: digits, iat: Math.floor(Date.now() / 1000) },
      secret
    );

    const res = NextResponse.json({ ok: true });
    res.cookies.set('fn_user', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}
