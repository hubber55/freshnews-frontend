export async function sendWaMessage(receiverDigits: string, message: string) {
  const ip = (process.env.WA_EC2_IP || '').trim();
  const apiKey = (process.env.WA_API_KEY || '').trim();

  if (!ip) throw new Error('Missing WA_EC2_IP');
  if (!apiKey) throw new Error('Missing WA_API_KEY');

  const res = await fetch(`http://${ip}:8080/message/sendText/VercelBot2`, {
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
