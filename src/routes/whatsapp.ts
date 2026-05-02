import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import https from 'https';
import http from 'http';
import { allData, daysUntil, getTenants, getUnits } from '../utils/data';
import { loadHistory, saveHistory, cleanExpiredConversations } from '../utils/conversation';
import { sendEmail } from '../services/email';
import { calculateRentIncrease } from '../services/rera';
import { importExcelBuffer } from '../utils/excel-import';

const router = Router();

// ─── Config (in-memory, resets on restart) ────────────────────────────────────

let renewalReminderDays = 90;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function twiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xmlEscape(message)}</Message></Response>`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Media download ───────────────────────────────────────────────────────────

function downloadTwilioMedia(mediaUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const parsed = new URL(mediaUrl);
    const lib = parsed.protocol === 'https:' ? https : http;

    const req = lib.get(mediaUrl, { headers: { Authorization: `Basic ${auth}` } }, res => {
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location) {
        downloadTwilioMedia(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} downloading media`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

// ─── Tool implementations ─────────────────────────────────────────────────────

async function toolSendRenewalNotice(tenantName: string, increasePercent: number): Promise<string> {
  const tenants = await getTenants();
  const units = await getUnits();

  const tenant = tenants.find(t => t.full_name.toLowerCase().includes(tenantName.toLowerCase()));
  if (!tenant) return `Tenant "${tenantName}" not found in database.`;
  if (!tenant.email) return `No email address on file for ${tenant.full_name}.`;

  const unit = units.find(u => u.building_name === tenant.building_name && u.unit_number === tenant.unit_number);
  const annualRent = unit?.annual_rent ?? 0;
  const unitLabel = `Unit ${tenant.unit_number} - ${tenant.building_name}`;
  const newRent = Math.round(annualRent * (1 + increasePercent / 100));
  const endDate = formatDate(tenant.contract_end);
  const days = daysUntil(tenant.contract_end);

  const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#1a5276;color:#fff;padding:20px">
    <h2 style="margin:0">Contract Renewal Notice | إشعار تجديد العقد</h2>
    <p style="margin:4px 0 0">${unitLabel} — ${days} days remaining</p>
  </div>
  <div style="padding:24px">
    <p>Dear <b>${tenant.full_name}</b>,</p>
    <p>Your tenancy contract for <b>${unitLabel}</b> will expire in <b>${days} days</b> on <b>${endDate}</b>.</p>
    <p>Current rent: <b>AED ${annualRent.toLocaleString()}</b>/year</p>
    <p>New rent: <b>AED ${newRent.toLocaleString()}</b>/year (${increasePercent}% increase)</p>
    <p>Please contact us to confirm renewal.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p>عزيزي <b>${tenant.full_name}</b>،</p>
    <p>ينتهي عقد إيجارك للوحدة <b>${unitLabel}</b> خلال <b>${days} يوماً</b> بتاريخ <b>${endDate}</b>.</p>
    <p>الإيجار الحالي: <b>AED ${annualRent.toLocaleString()}</b>/سنة</p>
    <p>الإيجار الجديد: <b>AED ${newRent.toLocaleString()}</b>/سنة (زيادة ${increasePercent}%)</p>
    <p>يرجى التواصل معنا لتأكيد التجديد.</p>
  </div>
</div>`;

  try {
    await sendEmail(tenant.email, 'Contract Renewal Notice | إشعار تجديد العقد', html);
  } catch (err: unknown) {
    return `❌ Email failed: ${err instanceof Error ? err.message : String(err)}`;
  }
  return `✅ Renewal notice emailed to ${tenant.full_name} (${tenant.email})`;
}

async function toolSendReminderToTenant(tenantName: string): Promise<string> {
  const tenants = await getTenants();
  const units = await getUnits();

  const tenant = tenants.find(t => t.full_name.toLowerCase().includes(tenantName.toLowerCase()));
  if (!tenant) return `Tenant "${tenantName}" not found in database.`;
  if (!tenant.email) return `No email address on file for ${tenant.full_name}.`;

  const unit = units.find(u => u.building_name === tenant.building_name && u.unit_number === tenant.unit_number);
  const annualRent = unit?.annual_rent ?? 0;
  const unitLabel = `Unit ${tenant.unit_number} - ${tenant.building_name}`;
  const days = daysUntil(tenant.contract_end);
  const endDate = formatDate(tenant.contract_end);
  const urgencyColor = days <= 30 ? '#c0392b' : days <= 60 ? '#e67e22' : '#2980b9';
  const urgencyLabel = days <= 30 ? '🚨 URGENT' : days <= 60 ? '⚠️ Soon' : '📋 Upcoming';

  const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:${urgencyColor};color:#fff;padding:20px">
    <h2 style="margin:0">${urgencyLabel} — Contract Renewal Reminder</h2>
    <p style="margin:4px 0 0">تذكير بتجديد العقد</p>
  </div>
  <div style="padding:24px">
    <p>Dear <b>${tenant.full_name}</b>,</p>
    <p>Your tenancy contract for <b>${unitLabel}</b> ends in <b>${days} days</b> on <b>${endDate}</b>.</p>
    <p>Rent: <b>AED ${annualRent.toLocaleString()}</b>/year</p>
    <p>Please contact your landlord to discuss renewal terms.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p>عزيزي <b>${tenant.full_name}</b>،</p>
    <p>ينتهي عقد إيجارك للوحدة <b>${unitLabel}</b> خلال <b>${days} يوماً</b> بتاريخ <b>${endDate}</b>.</p>
    <p>الإيجار: <b>AED ${annualRent.toLocaleString()}</b>/سنة</p>
    <p>يرجى التواصل مع المالك لمناقشة شروط التجديد.</p>
  </div>
</div>`;

  try {
    await sendEmail(tenant.email, 'Contract Renewal Reminder | تذكير بتجديد العقد', html);
  } catch (err: unknown) {
    return `❌ Email failed: ${err instanceof Error ? err.message : String(err)}`;
  }
  return `✅ Reminder emailed to ${tenant.full_name} (${tenant.email})`;
}

async function toolSendEmailToTenant(tenantName: string, subject: string, bodyHtml: string): Promise<string> {
  const tenants = await getTenants();
  const tenant = tenants.find(t => t.full_name.toLowerCase().includes(tenantName.toLowerCase()));
  if (!tenant) return `Tenant "${tenantName}" not found in database.`;
  if (!tenant.email) return `No email address on file for ${tenant.full_name}.`;

  try {
    await sendEmail(tenant.email, subject, bodyHtml);
  } catch (err: unknown) {
    return `❌ Email failed: ${err instanceof Error ? err.message : String(err)}`;
  }
  return `✅ Email sent to ${tenant.full_name} (${tenant.email})`;
}

function toolUpdateReminderThreshold(days: number): string {
  renewalReminderDays = days;
  return `✅ Reminder threshold set to ${days} days before contract end.`;
}

async function toolSendEmail(to: string, subject: string, body: string): Promise<string> {
  try {
    await sendEmail(to, subject, body);
    return `✅ Email sent to ${to}`;
  } catch (err: unknown) {
    return `❌ Email failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function toolCheckRERA(tenantName: string, marketRent?: number): Promise<string> {
  const tenants = await getTenants();
  const units = await getUnits();

  const tenant = tenants.find(t => t.full_name.toLowerCase().includes(tenantName.toLowerCase()));
  if (!tenant) return `Tenant "${tenantName}" not found in database.`;

  const unit = units.find(u => u.building_name === tenant.building_name && u.unit_number === tenant.unit_number);
  const current = unit?.annual_rent ?? 0;
  const area = tenant.building_name ?? 'Dubai';

  if (!marketRent) {
    return [
      `📊 RERA Rent Increase — ${tenant.full_name}`,
      `🏠 Unit ${tenant.unit_number} | ${area}`,
      `💰 Current rent: AED ${current.toLocaleString()}/year`,
      ``,
      `Dubai Decree 43/2013 — Max increases:`,
      `0–10% below market → No increase`,
      `11–20% below market → Max 5%`,
      `21–30% below market → Max 10%`,
      `31–40% below market → Max 15%`,
      `>40% below market → Max 20%`,
      ``,
      `Reply with the current market rent for ${area} to get an exact calculation.`,
    ].join('\n');
  }

  const result = calculateRentIncrease(current, marketRent);
  return [
    `📊 RERA Rent Increase — ${tenant.full_name}`,
    `🏠 Unit ${tenant.unit_number} | ${area}`,
    `💰 Current rent: AED ${current.toLocaleString()}/year`,
    `💰 Market rent: AED ${marketRent.toLocaleString()}/year`,
    ``,
    result.rule,
    ``,
    `Max allowed increase: ${result.maxIncreasePercent}%`,
    `Max new rent: AED ${result.maxNewRent.toLocaleString()}/year`,
  ].join('\n');
}

// ─── Tool definitions for Claude ──────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'send_renewal_notice',
    description: 'Send a bilingual (English + Arabic) contract renewal email to a tenant, with a specified rent increase percentage.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tenantName: { type: 'string', description: 'Tenant full or partial name' },
        increasePercent: { type: 'number', description: 'Rent increase percentage, e.g. 5 for 5%' },
      },
      required: ['tenantName', 'increasePercent'],
    },
  },
  {
    name: 'send_reminder_to_tenant',
    description: 'Send an immediate contract renewal reminder email to a specific tenant.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tenantName: { type: 'string', description: 'Tenant full or partial name' },
      },
      required: ['tenantName'],
    },
  },
  {
    name: 'send_email_to_tenant',
    description: 'Send a custom professional bilingual email to a tenant. Use this when the landlord asks to email a tenant about any topic. Write the full email subject and HTML body — professional and bilingual (English first, then Arabic after a <hr> divider).',
    input_schema: {
      type: 'object' as const,
      properties: {
        tenantName: { type: 'string', description: 'Tenant full or partial name' },
        subject: { type: 'string', description: 'Email subject line (bilingual if appropriate)' },
        bodyHtml: { type: 'string', description: 'Full HTML email body — professional styling, English section first, then Arabic section after a <hr/> divider' },
      },
      required: ['tenantName', 'subject', 'bodyHtml'],
    },
  },
  {
    name: 'update_reminder_threshold',
    description: 'Update how many days before contract end the landlord wants to receive automatic reminders.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'Number of days before contract end' },
      },
      required: ['days'],
    },
  },
  {
    name: 'check_rera_increase',
    description: 'Show RERA Decree 43/2013 rent increase rules and calculate the maximum allowed increase for a specific tenant.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tenantName: { type: 'string', description: 'Tenant full or partial name' },
        marketRent: { type: 'number', description: 'Current market rent per year in AED (optional)' },
      },
      required: ['tenantName'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email directly to any email address. Prefer send_email_to_tenant when only a tenant name is given.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Full HTML email body' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
];

// ─── Webhook ──────────────────────────────────────────────────────────────────

router.post('/incoming', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/xml');

  const body = req.body as Record<string, string>;
  const userMessage = (body['Body'] ?? '').trim();
  const from = body['From'];
  const mediaUrl = body['MediaUrl0'];
  const mediaType = (body['MediaContentType0'] ?? '').toLowerCase();

  if (!from) {
    res.send(twiml('Sorry, I could not understand your message.'));
    return;
  }

  console.log(`[WHATSAPP INCOMING] From: ${from} | MediaUrl0: ${mediaUrl ?? 'none'} | MediaContentType0: ${mediaType || 'none'}`);

  const isExcel =
    mediaType.includes('spreadsheetml') ||
    mediaType.includes('ms-excel') ||
    mediaType.includes('xlsx') ||
    mediaType.includes('xls') ||
    (!!mediaUrl && /\.xlsx?(\?|$)/i.test(mediaUrl)) ||
    mediaType === 'application/octet-stream';

  // ── Excel file upload ──────────────────────────────────────────────────────
  if (mediaUrl && isExcel) {
    try {
      console.log(`[EXCEL IMPORT] Downloading from ${mediaUrl}`);
      const buffer = await downloadTwilioMedia(mediaUrl);
      const result = await importExcelBuffer(buffer);

      const totalImported = result.buildings + result.units + result.tenants + result.cheques;
      if (totalImported === 0) {
        const errText = result.errors.length > 0 ? result.errors.join('\n') : 'No data found in the file.';
        res.send(twiml(`Could not import data:\n${errText}`));
        return;
      }

      const lines: string[] = ['✅ Data imported successfully!'];
      if (result.buildings > 0) lines.push(`🏢 ${result.buildings} building${result.buildings !== 1 ? 's' : ''} added`);
      if (result.units > 0) lines.push(`🏠 ${result.units} unit${result.units !== 1 ? 's' : ''} added`);
      if (result.tenants > 0) lines.push(`👤 ${result.tenants} tenant${result.tenants !== 1 ? 's' : ''} added`);
      if (result.cheques > 0) lines.push(`🧾 ${result.cheques} cheque${result.cheques !== 1 ? 's' : ''} added`);
      if (result.errors.length > 0) lines.push('', '⚠️ Warnings:', ...result.errors);

      const summary = lines.join('\n');
      console.log(`[EXCEL IMPORT] ${summary.slice(0, 120)}`);
      res.send(twiml(summary));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EXCEL IMPORT ERROR]', msg);
      res.send(twiml(`Failed to process the file. Make sure it is a valid .xlsx file.\n${msg}`));
    }
    return;
  }

  // ── "import data" trigger phrase ───────────────────────────────────────────
  if (userMessage.toLowerCase() === 'import data' || userMessage === 'استيراد البيانات') {
    res.send(twiml(
      'Please send your Excel file (.xlsx) with these sheets:\n' +
      '• 🏢 Buildings\n' +
      '• 🏠 Units\n' +
      '• 👤 Tenants\n' +
      '• 🧾 Cheques\n' +
      '• ⚙️ Your Details\n\n' +
      'I will import the data automatically.'
    ));
    return;
  }

  if (!userMessage) {
    res.send(twiml('Sorry, I could not understand your message.'));
    return;
  }

  try {
    await cleanExpiredConversations();
    const history = await loadHistory(from);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const today = new Date().toISOString().split('T')[0];
    const data = await allData();

    const annotatedTenants = data.tenants.map(t => ({
      ...t,
      daysUntilExpiry: daysUntil(t.contract_end),
      formattedEndDate: formatDate(t.contract_end),
    }));

    const annotatedCheques = data.cheques
      .map(c => ({
        id: c.id,
        tenant_name: c.tenant_name,
        location: `${c.building_name} - ${c.unit_number}`,
        amount: c.amount,
        due_date: c.due_date,
        bank_name: c.bank_name,
        cheque_number: c.cheque_number,
        status: c.status,
        daysUntilDue: daysUntil(c.due_date),
      }))
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    const annotatedUnits = data.units.map(u => ({
      ...u,
      hasServiceCharge: u.service_charge > 0,
    }));

    const systemPrompt = `You are a smart property management assistant for a Dubai landlord. Today is ${today}.
Reminder threshold: ${renewalReminderDays} days before contract end.

DATA ACCESS:

BUILDINGS:
${JSON.stringify(data.buildings, null, 2)}

UNITS (annual_rent = yearly rent, service_charge = annual service charge):
${JSON.stringify(annotatedUnits, null, 2)}

TENANTS (contract info embedded — contract_start, contract_end, daysUntilExpiry):
${JSON.stringify(annotatedTenants, null, 2)}

CHEQUES (sorted by daysUntilDue ascending — soonest first; negative = overdue; "next cheque" = first pending entry with daysUntilDue >= 0):
${JSON.stringify(annotatedCheques, null, 2)}

STRICT FORMATTING RULES:
- NEVER use asterisks (*), markdown bold, bullet points (-), or dashes for lists.
- Use ONLY plain text with emoji icons. One piece of info per line.
- No intro sentences ("Here are your contracts:", "Sure! Here is..."). Go straight to the data.
- No closing sentences ("Let me know if...", "Feel free to ask...").

When showing contracts/tenants use this exact block format (blank line between each):

🏠 Unit [X] - [Building]
👤 [Tenant Name]
📅 Contract ends: [DD Mon YYYY] ([N] days)
💰 Rent: AED [amount]/year
[status emoji + label]

Status rules:
  daysUntilExpiry < 30  → 🚨 Renew URGENT
  daysUntilExpiry < ${renewalReminderDays} → ⚠️ Renew soon
  otherwise             → ✅ All good

When showing cheques use:
🧾 [Tenant Name] - [Unit]
💰 AED [Amount]
📅 Due: [DD Mon YYYY] ([X] days)
[🚨 Overdue | ⚠️ Due soon | ✅ OK]

LANGUAGE: Detect the user's language and reply entirely in that language.
RERA: For rent increase questions cite Dubai Decree 43/2013. Use the check_rera_increase tool.
ACTIONS: Use the provided tools for any send/remind/update commands.
EMAIL: When the landlord asks to send an email to a tenant (in any language), use send_email_to_tenant. Write a professional bilingual email (English + Arabic) as the bodyHtml parameter. Never send WhatsApp to tenants.`;

    const firstResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages: [...history, { role: 'user', content: userMessage }],
    });

    if (firstResponse.stop_reason !== 'tool_use') {
      const textBlock = firstResponse.content.find(b => b.type === 'text');
      const answer = textBlock?.type === 'text' ? textBlock.text : 'Sorry, I could not generate a response.';
      await saveHistory(from, userMessage, answer);
      console.log(`[WHATSAPP BOT] From: ${from} | Q: ${userMessage.slice(0, 60)} | A: ${answer.slice(0, 60)}`);
      res.send(twiml(answer));
      return;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of firstResponse.content) {
      if (block.type !== 'tool_use') continue;
      const input = block.input as Record<string, unknown>;
      let result: string;

      switch (block.name) {
        case 'send_renewal_notice':
          result = await toolSendRenewalNotice(input.tenantName as string, input.increasePercent as number);
          break;
        case 'send_reminder_to_tenant':
          result = await toolSendReminderToTenant(input.tenantName as string);
          break;
        case 'send_email_to_tenant':
          result = await toolSendEmailToTenant(input.tenantName as string, input.subject as string, input.bodyHtml as string);
          break;
        case 'update_reminder_threshold':
          result = toolUpdateReminderThreshold(input.days as number);
          break;
        case 'check_rera_increase':
          result = await toolCheckRERA(input.tenantName as string, input.marketRent as number | undefined);
          break;
        case 'send_email':
          result = await toolSendEmail(input.to as string, input.subject as string, input.body as string);
          break;
        default:
          result = `Unknown tool: ${block.name}`;
      }

      console.log(`[WHATSAPP TOOL] ${block.name}(${JSON.stringify(input).slice(0, 60)}) → ${result.slice(0, 80)}`);
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
    }

    const secondResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      tools: TOOLS,
      messages: [
        ...history,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: firstResponse.content },
        { role: 'user', content: toolResults },
      ],
    });

    const textBlock = secondResponse.content.find(b => b.type === 'text');
    const answer = textBlock?.type === 'text'
      ? textBlock.text
      : toolResults.map(r => r.content).join('\n');

    await saveHistory(from, userMessage, answer);
    console.log(`[WHATSAPP BOT] From: ${from} | Q: ${userMessage.slice(0, 60)} | A: ${answer.slice(0, 60)}`);
    res.send(twiml(answer));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[WhatsApp incoming error]', msg);
    res.send(twiml('Sorry, an error occurred. Please try again.'));
  }
});

// ─── Test email ───────────────────────────────────────────────────────────────

router.get('/test-email', async (_req: Request, res: Response) => {
  const to = process.env.MY_EMAIL;
  if (!to) {
    res.status(500).json({ error: 'MY_EMAIL env var is not set' });
    return;
  }
  try {
    await sendEmail(to, 'Test Email — Dubai Landlord System', '<p>This is a test email from the Dubai Landlord Management System.</p>', 'test');
    res.json({ success: true, to });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    res.status(500).json({ error: msg, stack });
  }
});

export default router;
