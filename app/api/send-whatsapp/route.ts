
import { NextResponse } from 'next/server';

async function sendMessage(receiver: string, message: string) {
  const ip = (process.env.WA_EC2_IP || '').trim();
  const apiKey = (process.env.WA_API_KEY || '').trim();
  const baseUrl = (process.env.WA_API_URL || `http://${ip}:8080`).trim();

  if ((!baseUrl && !ip) || !apiKey) {
    throw new Error('WhatsApp API credentials are not configured.');
  }

  // Add human-like behavior: typing indicator
  await fetch(`${baseUrl}/chat/setPresence/VercelBot2`, {
    method: 'POST',
    headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: receiver, presence: 'composing' })
  }).catch(() => {});
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  const res = await fetch(`${baseUrl}/message/sendText/VercelBot2`, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: receiver,
      options: { delay: 1000 },
      text: message
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const errorStr = JSON.stringify(errorBody);
    
    // Check if it's a "number does not exist on WhatsApp" error
    if (res.status === 400 && errorStr.includes('"exists":false')) {
      const err = new Error('Number does not exist on WhatsApp');
      (err as any).status = 400;
      (err as any).isInvalidNumber = true;
      throw err;
    }

    throw new Error(`Evolution API send failed: ${res.status} ${errorStr}`);
  }
}

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
