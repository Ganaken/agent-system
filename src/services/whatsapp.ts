import twilio from 'twilio';

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export async function sendToNumber(to: string, message: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from) {
    console.log(`[WHATSAPP SKIPPED — no credentials] To: ${to} | ${message.slice(0, 80)}`);
    return;
  }

  try {
    const client = getClient();
    await client.messages.create({ from, to, body: message });
    console.log(`[WHATSAPP SENT] To: ${to} | ${message.slice(0, 80)}`);
  } catch (err) {
    console.error('[WHATSAPP ERROR]', err instanceof Error ? err.message : err);
  }
}

export async function sendAlert(message: string): Promise<void> {
  const to = process.env.MY_WHATSAPP;
  if (!to) {
    console.log(`[WHATSAPP SKIPPED — no MY_WHATSAPP] | ${message.slice(0, 80)}`);
    return;
  }
  await sendToNumber(to, message);
}
