
import { NextResponse } from 'next/server';

import { sendMessage } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing receiver or message' }, { status: 400 });
    }

    await sendMessage(to, message);

    return NextResponse.json({ ok: true, success: true });

  } catch (e: any) {
    console.error('Send WhatsApp API Error:', e);
    const status = e.status || 500;
    return NextResponse.json({ 
      error: e.message || 'An unexpected error occurred',
      isInvalidNumber: e.isInvalidNumber || false
    }, { status });
  }
}
