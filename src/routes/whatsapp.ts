import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { allData, daysUntil, getTenants, getContracts, getProperties } from '../utils/data';
import { loadHistory, saveHistory, cleanExpiredConversations } from '../utils/conversation';
import { sendToNumber } from '../services/whatsapp';
import { calculateRentIncrease } from '../services/rera';

const router = Router();

// ─── Config (reminder threshold) ─────────────────────────────────────────────

const CONFIG_PATH = path.resolve(process.cwd(), process.env.DATA_DIR || './data', 'config.json');

interface AppConfig {
  renewalReminderDays: number;
}

function getConfig(): AppConfig {
  if (!fs.existsSync(CONFIG_PATH)) return { renewalReminderDays: 90 };
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as AppConfig; }
  catch { return { renewalReminderDays: 90 }; }
}

function saveConfig(cfg: AppConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}

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

function normalizeWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('971')) return `whatsapp:+${digits}`;
  if (digits.startsWith('0')) return `whatsapp:+971${digits.slice(1)}`;
  return `whatsapp:+971${digits}`;
}

// ─── Tool implementations ─────────────────────────────────────────────────────

async function toolSendRenewalNotice(tenantName: string, increasePercent: number): Promise<string> {
  const tenants = getTenants();
  const contracts = getContracts();
  const properties = getProperties();

  const tenant = tenants.find(t => t.name.toLowerCase().includes(tenantName.toLowerCase()));
  if (!tenant) return `Tenant "${tenantName}" not found in database.`;

  const contract = contracts.find(c => c.tenantId === tenant.id && c.status === 'active');
  if (!contract) return `No active contract found for ${tenant.name}.`;

  const property = properties.find(p => p.id === contract.propertyId);
  const unitLabel = property
    ? `Unit ${contract.unit} - ${property.building}`
    : `Unit ${contract.unit}`;

  const newRent = Math.round(contract.rentAmount * (1 + increasePercent / 100));
  const endDate = formatDate(contract.endDate);
  const days = daysUntil(contract.endDate);

  const notice = [
    `🏠 ${unitLabel}`,
    `📋 Contract Renewal Notice`,
    `📅 Contract ends: ${endDate} (${days} days)`,
    `💰 Current rent: AED ${contract.rentAmount.toLocaleString()}`,
    `💰 New rent: AED ${newRent.toLocaleString()} (${increasePercent}% increase)`,
    `📞 Please contact us to confirm renewal.`,
    ``,
    `─────────────────────`,
    ``,
    `عزيزي ${tenant.name}،`,
    `إشعار بتجديد عقد الإيجار`,
    `🏠 الوحدة: ${unitLabel}`,
    `📅 تاريخ انتهاء العقد: ${endDate}`,
    `💰 الإيجار الحالي: ${contract.rentAmount.toLocaleString()} درهم`,
    `💰 الإيجار الجديد: ${newRent.toLocaleString()} درهم (زيادة ${increasePercent}%)`,
    `📞 يرجى التواصل معنا لتأكيد التجديد.`,
  ].join('\n');

  await sendToNumber(normalizeWhatsApp(tenant.phone), notice);
  return `✅ Notice sent to ${tenant.name} at ${tenant.phone}`;
}

async function toolSendReminderToTenant(tenantName: string): Promise<string> {
  const tenants = getTenants();
  const contracts = getContracts();
  const properties = getProperties();

  const tenant = tenants.find(t => t.name.toLowerCase().includes(tenantName.toLowerCase()));
  if (!tenant) return `Tenant "${tenantName}" not found in database.`;

  const contract = contracts.find(c => c.tenantId === tenant.id && c.status === 'active');
  if (!contract) return `No active contract found for ${tenant.name}.`;

  const property = properties.find(p => p.id === contract.propertyId);
  const unitLabel = property
    ? `Unit ${contract.unit} - ${property.building}`
    : `Unit ${contract.unit}`;

  const days = daysUntil(contract.endDate);
  const endDate = formatDate(contract.endDate);
  const urgency = days <= 30 ? '🚨 URGENT' : days <= 60 ? '⚠️' : '📋';

  const reminder = [
    `${urgency} Contract Renewal Reminder`,
    ``,
    `🏠 ${unitLabel}`,
    `📅 Ends: ${endDate} (${days} days)`,
    `💰 Rent: AED ${contract.rentAmount.toLocaleString()}`,
    ``,
    `Please contact your landlord to discuss renewal.`,
  ].join('\n');

  await sendToNumber(normalizeWhatsApp(tenant.phone), reminder);
  return `✅ Reminder sent to ${tenant.name} at ${tenant.phone}`;
}

function toolUpdateReminderThreshold(days: number): string {
  const cfg = getConfig();
  cfg.renewalReminderDays = days;
  saveConfig(cfg);
  return `✅ Reminder threshold set to ${days} days before contract end.`;
}

function toolCheckRERA(tenantName: string, marketRent?: number): string {
  const tenants = getTenants();
  const contracts = getContracts();
  const properties = getProperties();

  const tenant = tenants.find(t => t.name.toLowerCase().includes(tenantName.toLowerCase()));
  if (!tenant) return `Tenant "${tenantName}" not found in database.`;

  const contract = contracts.find(c => c.tenantId === tenant.id && c.status === 'active');
  if (!contract) return `No active contract found for ${tenant.name}.`;

  const property = properties.find(p => p.id === contract.propertyId);
  const area = property?.area ?? 'Dubai';
  const current = contract.rentAmount;

  if (!marketRent) {
    return [
      `📊 RERA Rent Increase — ${tenant.name}`,
      `🏠 Unit ${contract.unit} | ${area}`,
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
    `📊 RERA Rent Increase — ${tenant.name}`,
    `🏠 Unit ${contract.unit} | ${area}`,
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
    description: 'Send a bilingual (English + Arabic) WhatsApp renewal notice directly to a tenant, with a specified rent increase percentage.',
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
    description: 'Send an immediate contract renewal reminder WhatsApp message to a specific tenant.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tenantName: { type: 'string', description: 'Tenant full or partial name' },
      },
      required: ['tenantName'],
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
];

// ─── Webhook ──────────────────────────────────────────────────────────────────

router.post('/incoming', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/xml');

  const body = req.body as Record<string, string>;
  const userMessage = body['Body']?.trim();
  const from = body['From'];

  if (!userMessage || !from) {
    res.send(twiml('Sorry, I could not understand your message.'));
    return;
  }

  try {
    cleanExpiredConversations();
    const history = loadHistory(from);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const today = new Date().toISOString().split('T')[0];
    const data = allData();
    const config = getConfig();

    const annotatedContracts = data.contracts.map(c => ({
      ...c,
      daysUntilExpiry: daysUntil(c.endDate),
      formattedEndDate: formatDate(c.endDate),
    }));
    const annotatedCheques = data.cheques.map(c => ({
      id: c.id,
      tenantName: c.tenantName,
      unit: c.unit,
      amount: c.amount,
      chequeDate: c.chequeDate,
      status: c.status,
      daysUntilDue: daysUntil(c.chequeDate),
    }));
    const annotatedCharges = data.serviceCharges.map(c => ({
      ...c,
      daysUntilDue: daysUntil(c.nextDueDate),
    }));

    const systemPrompt = `You are a smart property management assistant for a Dubai landlord. Today is ${today}.
Reminder threshold: ${config.renewalReminderDays} days before contract end.

DATA ACCESS:

PROPERTIES:
${JSON.stringify(data.properties, null, 2)}

TENANTS:
${JSON.stringify(data.tenants, null, 2)}

CHEQUES (daysUntilDue: negative = overdue):
${JSON.stringify(annotatedCheques, null, 2)}

CONTRACTS (daysUntilExpiry from today):
${JSON.stringify(annotatedContracts, null, 2)}

SERVICE CHARGES (daysUntilDue: negative = overdue):
${JSON.stringify(annotatedCharges, null, 2)}

STRICT FORMATTING RULES:
- NEVER use asterisks (*), markdown bold, bullet points (-), or dashes for lists.
- Use ONLY plain text with emoji icons. One piece of info per line.
- No intro sentences ("Here are your contracts:", "Sure! Here is..."). Go straight to the data.
- No closing sentences ("Let me know if...", "Feel free to ask...").

When showing contracts use this exact block format (blank line between each):

🏠 Unit [X] - [Building]
📅 Ends: [DD Mon YYYY] ([N] days)
💰 Rent: AED [amount]/year
[status emoji + label]

Status rules:
  daysUntilExpiry < 30  → 🚨 Renew URGENT
  daysUntilExpiry < ${config.renewalReminderDays} → ⚠️ Renew soon
  otherwise             → ✅ All good

When showing cheques use:
🧾 [Tenant Name] - [Unit]
💰 AED [Amount]
📅 Due: [DD Mon YYYY] ([X] days)
[🚨 Overdue | ⚠️ Due soon | ✅ OK]

LANGUAGE: Detect the user's language and reply entirely in that language.
RERA: For rent increase questions cite Dubai Decree 43/2013. Use the check_rera_increase tool.
ACTIONS: Use the provided tools for any send/remind/update commands.`;

    // First call — Claude may request tool use
    const firstResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages: [...history, { role: 'user', content: userMessage }],
    });

    // If no tool call, return the text directly
    if (firstResponse.stop_reason !== 'tool_use') {
      const textBlock = firstResponse.content.find(b => b.type === 'text');
      const answer = textBlock?.type === 'text' ? textBlock.text : 'Sorry, I could not generate a response.';
      saveHistory(from, userMessage, answer);
      console.log(`[WHATSAPP BOT] From: ${from} | Q: ${userMessage.slice(0, 60)} | A: ${answer.slice(0, 60)}`);
      res.send(twiml(answer));
      return;
    }

    // Execute tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of firstResponse.content) {
      if (block.type !== 'tool_use') continue;
      const input = block.input as Record<string, unknown>;
      let result: string;

      switch (block.name) {
        case 'send_renewal_notice':
          result = await toolSendRenewalNotice(
            input.tenantName as string,
            input.increasePercent as number,
          );
          break;
        case 'send_reminder_to_tenant':
          result = await toolSendReminderToTenant(input.tenantName as string);
          break;
        case 'update_reminder_threshold':
          result = toolUpdateReminderThreshold(input.days as number);
          break;
        case 'check_rera_increase':
          result = toolCheckRERA(
            input.tenantName as string,
            input.marketRent as number | undefined,
          );
          break;
        default:
          result = `Unknown tool: ${block.name}`;
      }

      console.log(`[WHATSAPP TOOL] ${block.name}(${JSON.stringify(input)}) → ${result.slice(0, 80)}`);
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
    }

    // Second call with tool results for final reply
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

    saveHistory(from, userMessage, answer);
    console.log(`[WHATSAPP BOT] From: ${from} | Q: ${userMessage.slice(0, 60)} | A: ${answer.slice(0, 60)}`);
    res.send(twiml(answer));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[WhatsApp incoming error]', msg);
    res.send(twiml('Sorry, an error occurred. Please try again.'));
  }
});

export default router;
