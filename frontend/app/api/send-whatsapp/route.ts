
import { NextResponse } from 'next/server';

async function sendMessage(receiver: string, message: string) {
  const ip = (process.env.WA_EC2_IP || '').trim();
  const apiKey = (process.env.WA_API_KEY || '').trim();

  if (!ip || !apiKey) {
    throw new Error('WhatsApp API credentials are not configured.');
  }

  const res = await fetch(`http://${ip}:8080/message/sendText/VercelBot2`, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: receiver,
      textMessage: {
        text: message
      }
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`Evolution API send failed: ${res.status} ${JSON.stringify(errorBody)}`);
  }
}

export async function POST(req: Request) {
  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing receiver or message' }, { status: 400 });
    }

    await sendMessage(to, message);

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    console.error('Send WhatsApp API Error:', e);
    return NextResponse.json({ error: e.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
