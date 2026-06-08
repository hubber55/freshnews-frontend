import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth';

async function hashOtp(otp: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeWhatsAppNumber(input: string) {
  const digits = (input || '').replace(/[^\d]/g, '');
  return digits.length >= 10 ? digits : null;
}

function maskNumber(digits: string) {
  if (digits.length <= 4) return 'xxxx';
  return `${'x'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

async function sendOtpViaEvolution(receiverDigits: string, otp: string) {
  const ip = (process.env.WA_EC2_IP || '').trim();
  const apiKey = (process.env.WA_API_KEY || '').trim();
  const baseUrl = (process.env.WA_API_URL || `http://${ip}:8080`).trim();

  if ((!baseUrl && !ip) || !apiKey) {
    throw new Error('WhatsApp API credentials are not configured.');
  }

  const message = `FreshNews delete account OTP: ${otp}`;
  const res = await fetch(`${baseUrl}/message/sendText/VercelBot2`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: receiverDigits,
      text: message,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    console.error('Evolution API send failed:', res.status, json);
    if (res.status === 500 || res.status === 502 || res.status === 503) {
      throw new Error('WhatsApp service is currently offline. Please try again later.');
    }
    throw new Error('Failed to send delete account OTP');
  }
}

async function deleteUserData(supabase: any, userId: number, whatsappNumber: string) {
  await supabase.from('submissions').delete().eq('user_id', userId);
  await supabase.from('posts').delete().eq('user_id', userId);
  await supabase.from('comments').delete().eq('user_id', userId);
  await supabase.from('wa_otps').delete().eq('whatsapp_number', whatsappNumber);
  await supabase.from('whatsapp_marketing').delete().eq('phone_number', whatsappNumber);
  await supabase.from('wa_users').delete().eq('id', userId);
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'request').toLowerCase();
    const supabase = createAdminClient();

    if (action === 'request') {
      const { data: userRow, error: userError } = await supabase
        .from('wa_users')
        .select('whatsapp_number')
        .eq('id', user.id)
        .single();

      if (userError || !userRow?.whatsapp_number) {
        return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
      }

      const digits = normalizeWhatsAppNumber(userRow.whatsapp_number);
      if (!digits) {
        return NextResponse.json({ ok: false, error: 'Invalid WhatsApp number' }, { status: 400 });
      }

      const otp = String(Math.floor(1000 + Math.random() * 9000));
      const otpHash = await hashOtp(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase.from('wa_otps').insert({
        whatsapp_number: digits,
        otp_hash: otpHash,
        expires_at: expiresAt,
        consumed_at: null,
      });
      if (insertError) throw insertError;

      await sendOtpViaEvolution(digits, otp);

      return NextResponse.json({ ok: true, masked: maskNumber(digits) });
    }

    if (action === 'confirm') {
      const otp = String(body?.otp || '').trim();
      if (otp.length < 4) {
        return NextResponse.json({ ok: false, error: 'Invalid OTP' }, { status: 400 });
      }

      const { data: userRow, error: userError } = await supabase
        .from('wa_users')
        .select('id, whatsapp_number')
        .eq('id', user.id)
        .single();

      if (userError || !userRow?.whatsapp_number) {
        return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
      }

      const digits = normalizeWhatsAppNumber(userRow.whatsapp_number);
      if (!digits) {
        return NextResponse.json({ ok: false, error: 'Invalid WhatsApp number' }, { status: 400 });
      }

      const otpHash = await hashOtp(otp);
      const { data: rows, error: otpError } = await supabase
        .from('wa_otps')
        .select('id, otp_hash, expires_at, consumed_at')
        .eq('whatsapp_number', digits)
        .is('consumed_at', null)
        .order('id', { ascending: false })
        .limit(1);

      if (otpError) throw otpError;

      const row = rows?.[0];
      if (!row) return NextResponse.json({ ok: false, error: 'OTP not found' }, { status: 400 });
      if (row.otp_hash !== otpHash) return NextResponse.json({ ok: false, error: 'Wrong OTP' }, { status: 400 });
      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ ok: false, error: 'OTP expired' }, { status: 400 });
      }

      await supabase.from('wa_otps').update({ consumed_at: new Date().toISOString() }).eq('id', row.id);
      await deleteUserData(supabase, user.id, digits);

      const res = NextResponse.json({ ok: true });
      res.cookies.set('fn_user', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
      return res;
    }

    return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Failed' }, { status: 500 });
  }
}
