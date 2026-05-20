export async function sendWaMessage(receiverDigits: string, message: string) {
  const ip = (process.env.WA_EC2_IP || '').trim();
  const apiKey = (process.env.WA_API_KEY || '').trim();
  const baseUrl = (process.env.WA_API_URL || `http://${ip}:8080`).trim();

  if (!baseUrl && !ip) throw new Error('Missing WhatsApp URL or IP configuration');
  if (!apiKey) throw new Error('Missing WA_API_KEY');

  const res = await fetch(`${baseUrl}/message/sendText/VercelBot2`, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: receiverDigits,
      textMessage: {
        text: message
      }
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Evolution API send failed: ${res.status} ${JSON.stringify(json)}`);
  }
}
