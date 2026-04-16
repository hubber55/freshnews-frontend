
import { NextResponse } from 'next/server';

async function sendMessage(receiver: string, message: string) {
  const token = (process.env.WHATSPIE_API_TOKEN || '').trim();
  const device = (process.env.WHATSPIE_DEVICE || '').trim();

  if (!token || !device) {
    throw new Error('WhatsApp API credentials are not configured.');
  }

  const res = await fetch('https://api.whatspie.com/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      device,
      receiver,
      type: 'chat',
      params: { text: message },
      simulate_typing: 1,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`Whatspie send failed: ${res.status} ${JSON.stringify(errorBody)}`);
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
