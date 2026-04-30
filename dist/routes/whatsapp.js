"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const data_1 = require("../utils/data");
const conversation_1 = require("../utils/conversation");
const email_1 = require("../services/email");
const rera_1 = require("../services/rera");
const excel_import_1 = require("../utils/excel-import");
const router = (0, express_1.Router)();
// ─── Config (reminder threshold) ─────────────────────────────────────────────
const CONFIG_PATH = path_1.default.resolve(process.cwd(), process.env.DATA_DIR || './data', 'config.json');
function getConfig() {
    if (!fs_1.default.existsSync(CONFIG_PATH))
        return { renewalReminderDays: 90 };
    try {
        return JSON.parse(fs_1.default.readFileSync(CONFIG_PATH, 'utf-8'));
    }
    catch {
        return { renewalReminderDays: 90 };
    }
}
function saveConfig(cfg) {
    fs_1.default.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function xmlEscape(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function twiml(message) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xmlEscape(message)}</Message></Response>`;
}
function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function normalizeWhatsApp(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('971'))
        return `whatsapp:+${digits}`;
    if (digits.startsWith('0'))
        return `whatsapp:+971${digits.slice(1)}`;
    return `whatsapp:+971${digits}`;
}
// ─── Media download ───────────────────────────────────────────────────────────
function downloadTwilioMedia(mediaUrl) {
    return new Promise((resolve, reject) => {
        const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
        const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const parsed = new URL(mediaUrl);
        const lib = parsed.protocol === 'https:' ? https_1.default : http_1.default;
        const req = lib.get(mediaUrl, { headers: { Authorization: `Basic ${auth}` } }, res => {
            // Follow up to 3 redirects
            if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location) {
                downloadTwilioMedia(res.headers.location).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode && res.statusCode >= 400) {
                reject(new Error(`HTTP ${res.statusCode} downloading media`));
                return;
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        });
        req.on('error', reject);
    });
}
// ─── Tool implementations ─────────────────────────────────────────────────────
async function toolSendRenewalNotice(tenantName, increasePercent) {
    const tenants = (0, data_1.getTenants)();
    const contracts = (0, data_1.getContracts)();
    const properties = (0, data_1.getProperties)();
    const tenant = tenants.find(t => t.name.toLowerCase().includes(tenantName.toLowerCase()));
    if (!tenant)
        return `Tenant "${tenantName}" not found in database.`;
    if (!tenant.email)
        return `No email address on file for ${tenant.name}.`;
    const contract = contracts.find(c => c.tenantId === tenant.id && c.status === 'active');
    if (!contract)
        return `No active contract found for ${tenant.name}.`;
    const property = properties.find(p => p.id === contract.propertyId);
    const unitLabel = property
        ? `Unit ${contract.unit} - ${property.building}`
        : `Unit ${contract.unit}`;
    const newRent = Math.round(contract.rentAmount * (1 + increasePercent / 100));
    const endDate = formatDate(contract.endDate);
    const days = (0, data_1.daysUntil)(contract.endDate);
    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#1a5276;color:#fff;padding:20px">
    <h2 style="margin:0">Contract Renewal Notice | إشعار تجديد العقد</h2>
    <p style="margin:4px 0 0">${unitLabel} — ${days} days remaining</p>
  </div>
  <div style="padding:24px">
    <p>Dear <b>${tenant.name}</b>,</p>
    <p>Your tenancy contract for <b>${unitLabel}</b> will expire in <b>${days} days</b> on <b>${endDate}</b>.</p>
    <p>Current rent: <b>AED ${contract.rentAmount.toLocaleString()}</b>/year</p>
    <p>New rent: <b>AED ${newRent.toLocaleString()}</b>/year (${increasePercent}% increase)</p>
    <p>Please contact us to confirm renewal.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p>عزيزي <b>${tenant.name}</b>،</p>
    <p>ينتهي عقد إيجارك للوحدة <b>${unitLabel}</b> خلال <b>${days} يوماً</b> بتاريخ <b>${endDate}</b>.</p>
    <p>الإيجار الحالي: <b>AED ${contract.rentAmount.toLocaleString()}</b>/سنة</p>
    <p>الإيجار الجديد: <b>AED ${newRent.toLocaleString()}</b>/سنة (زيادة ${increasePercent}%)</p>
    <p>يرجى التواصل معنا لتأكيد التجديد.</p>
  </div>
</div>`;
    try {
        await (0, email_1.sendEmail)(tenant.email, 'Contract Renewal Notice | إشعار تجديد العقد', html);
        console.log(`EMAIL SENT TO: ${tenant.email}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`EMAIL ERROR: ${msg}`);
        return `❌ Email failed: ${msg}`;
    }
    return `✅ Renewal notice emailed to ${tenant.name} (${tenant.email})`;
}
async function toolSendReminderToTenant(tenantName) {
    const tenants = (0, data_1.getTenants)();
    const contracts = (0, data_1.getContracts)();
    const properties = (0, data_1.getProperties)();
    const tenant = tenants.find(t => t.name.toLowerCase().includes(tenantName.toLowerCase()));
    if (!tenant)
        return `Tenant "${tenantName}" not found in database.`;
    if (!tenant.email)
        return `No email address on file for ${tenant.name}.`;
    const contract = contracts.find(c => c.tenantId === tenant.id && c.status === 'active');
    if (!contract)
        return `No active contract found for ${tenant.name}.`;
    const property = properties.find(p => p.id === contract.propertyId);
    const unitLabel = property
        ? `Unit ${contract.unit} - ${property.building}`
        : `Unit ${contract.unit}`;
    const days = (0, data_1.daysUntil)(contract.endDate);
    const endDate = formatDate(contract.endDate);
    const urgencyColor = days <= 30 ? '#c0392b' : days <= 60 ? '#e67e22' : '#2980b9';
    const urgencyLabel = days <= 30 ? '🚨 URGENT' : days <= 60 ? '⚠️ Soon' : '📋 Upcoming';
    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:${urgencyColor};color:#fff;padding:20px">
    <h2 style="margin:0">${urgencyLabel} — Contract Renewal Reminder</h2>
    <p style="margin:4px 0 0">تذكير بتجديد العقد</p>
  </div>
  <div style="padding:24px">
    <p>Dear <b>${tenant.name}</b>,</p>
    <p>Your tenancy contract for <b>${unitLabel}</b> ends in <b>${days} days</b> on <b>${endDate}</b>.</p>
    <p>Rent: <b>AED ${contract.rentAmount.toLocaleString()}</b>/year</p>
    <p>Please contact your landlord to discuss renewal terms.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p>عزيزي <b>${tenant.name}</b>،</p>
    <p>ينتهي عقد إيجارك للوحدة <b>${unitLabel}</b> خلال <b>${days} يوماً</b> بتاريخ <b>${endDate}</b>.</p>
    <p>الإيجار: <b>AED ${contract.rentAmount.toLocaleString()}</b>/سنة</p>
    <p>يرجى التواصل مع المالك لمناقشة شروط التجديد.</p>
  </div>
</div>`;
    try {
        await (0, email_1.sendEmail)(tenant.email, 'Contract Renewal Reminder | تذكير بتجديد العقد', html);
        console.log(`EMAIL SENT TO: ${tenant.email}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`EMAIL ERROR: ${msg}`);
        return `❌ Email failed: ${msg}`;
    }
    return `✅ Reminder emailed to ${tenant.name} (${tenant.email})`;
}
async function toolSendEmailToTenant(tenantName, subject, bodyHtml) {
    const tenants = (0, data_1.getTenants)();
    const tenant = tenants.find(t => t.name.toLowerCase().includes(tenantName.toLowerCase()));
    if (!tenant)
        return `Tenant "${tenantName}" not found in database.`;
    if (!tenant.email)
        return `No email address on file for ${tenant.name}.`;
    try {
        await (0, email_1.sendEmail)(tenant.email, subject, bodyHtml);
        console.log(`EMAIL SENT TO: ${tenant.email}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`EMAIL ERROR: ${msg}`);
        return `❌ Email failed: ${msg}`;
    }
    return `✅ Email sent to ${tenant.name} (${tenant.email})`;
}
function toolUpdateReminderThreshold(days) {
    const cfg = getConfig();
    cfg.renewalReminderDays = days;
    saveConfig(cfg);
    return `✅ Reminder threshold set to ${days} days before contract end.`;
}
async function toolSendEmail(to, subject, body) {
    try {
        await (0, email_1.sendEmail)(to, subject, body);
        console.log(`EMAIL SENT TO: ${to}`);
        return `✅ Email sent to ${to}`;
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`EMAIL ERROR: ${msg}`);
        return `❌ Email failed: ${msg}`;
    }
}
function toolCheckRERA(tenantName, marketRent) {
    const tenants = (0, data_1.getTenants)();
    const contracts = (0, data_1.getContracts)();
    const properties = (0, data_1.getProperties)();
    const tenant = tenants.find(t => t.name.toLowerCase().includes(tenantName.toLowerCase()));
    if (!tenant)
        return `Tenant "${tenantName}" not found in database.`;
    const contract = contracts.find(c => c.tenantId === tenant.id && c.status === 'active');
    if (!contract)
        return `No active contract found for ${tenant.name}.`;
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
    const result = (0, rera_1.calculateRentIncrease)(current, marketRent);
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
const TOOLS = [
    {
        name: 'send_renewal_notice',
        description: 'Send a bilingual (English + Arabic) contract renewal email to a tenant, with a specified rent increase percentage.',
        input_schema: {
            type: 'object',
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
            type: 'object',
            properties: {
                tenantName: { type: 'string', description: 'Tenant full or partial name' },
            },
            required: ['tenantName'],
        },
    },
    {
        name: 'send_email_to_tenant',
        description: 'Send a custom professional bilingual email to a tenant. Use this when the landlord asks to email a tenant about any topic (e.g. "send Ahmed an email about contract renewal", "ابعث ايميل لأحمد"). You must write the full email subject and HTML body — make it professional and bilingual (English first, then Arabic after a <hr> divider).',
        input_schema: {
            type: 'object',
            properties: {
                tenantName: { type: 'string', description: 'Tenant full or partial name' },
                subject: { type: 'string', description: 'Email subject line (bilingual if appropriate, e.g. "Contract Renewal | تجديد العقد")' },
                bodyHtml: { type: 'string', description: 'Full HTML email body — professional styling, English section first, then Arabic section after a <hr/> divider' },
            },
            required: ['tenantName', 'subject', 'bodyHtml'],
        },
    },
    {
        name: 'update_reminder_threshold',
        description: 'Update how many days before contract end the landlord wants to receive automatic reminders.',
        input_schema: {
            type: 'object',
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
            type: 'object',
            properties: {
                tenantName: { type: 'string', description: 'Tenant full or partial name' },
                marketRent: { type: 'number', description: 'Current market rent per year in AED (optional)' },
            },
            required: ['tenantName'],
        },
    },
    {
        name: 'send_email',
        description: 'Send an email directly to any email address. Use this when the landlord provides a specific email address or when the tenant email is already known. Prefer send_email_to_tenant when only a tenant name is given.',
        input_schema: {
            type: 'object',
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
router.post('/incoming', async (req, res) => {
    res.setHeader('Content-Type', 'text/xml');
    const body = req.body;
    const userMessage = (body['Body'] ?? '').trim();
    const from = body['From'];
    const mediaUrl = body['MediaUrl0'];
    const mediaType = (body['MediaContentType0'] ?? '').toLowerCase();
    if (!from) {
        res.send(twiml('Sorry, I could not understand your message.'));
        return;
    }
    // ── Excel file upload ──────────────────────────────────────────────────────
    console.log(`[WHATSAPP INCOMING] From: ${from} | MediaUrl0: ${mediaUrl ?? 'none'} | MediaContentType0: ${mediaType || 'none'}`);
    const isExcel = mediaType.includes('spreadsheetml') ||
        mediaType.includes('ms-excel') ||
        mediaType.includes('xlsx') ||
        mediaType.includes('xls') ||
        (!!mediaUrl && /\.xlsx?(\?|$)/i.test(mediaUrl)) ||
        mediaType === 'application/octet-stream';
    if (mediaUrl && isExcel) {
        try {
            console.log(`[EXCEL IMPORT] Downloading from ${mediaUrl}`);
            const buffer = await downloadTwilioMedia(mediaUrl);
            const result = (0, excel_import_1.importExcelBuffer)(buffer);
            const totalImported = result.landlords + result.properties + result.tenants + result.cheques;
            if (totalImported === 0) {
                const errText = result.errors.length > 0 ? result.errors.join('\n') : 'No data found in the file.';
                res.send(twiml(`Could not import data:\n${errText}`));
                return;
            }
            const lines = ['✅ Data imported successfully!'];
            if (result.landlords > 0)
                lines.push(`👤 ${result.landlords} landlord${result.landlords !== 1 ? 's' : ''} added`);
            if (result.properties > 0)
                lines.push(`🏠 ${result.properties} propert${result.properties !== 1 ? 'ies' : 'y'} added`);
            if (result.tenants > 0)
                lines.push(`👤 ${result.tenants} tenant${result.tenants !== 1 ? 's' : ''} added`);
            if (result.cheques > 0)
                lines.push(`🧾 ${result.cheques} cheque${result.cheques !== 1 ? 's' : ''} added`);
            if (result.errors.length > 0)
                lines.push('', '⚠️ Warnings:', ...result.errors);
            const summary = lines.join('\n');
            console.log(`[EXCEL IMPORT] ${summary.slice(0, 120)}`);
            res.send(twiml(summary));
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[EXCEL IMPORT ERROR]', msg);
            res.send(twiml(`Failed to process the file. Make sure it is a valid .xlsx file.\n${msg}`));
        }
        return;
    }
    // ── "import data" trigger phrase ───────────────────────────────────────────
    if (userMessage.toLowerCase() === 'import data' || userMessage === 'استيراد البيانات') {
        res.send(twiml('Please send your Excel file (.xlsx) with these sheets:\n' +
            '• Landlords\n' +
            '• Properties\n' +
            '• Tenants\n' +
            '• Cheques\n\n' +
            'I will import the data automatically.'));
        return;
    }
    if (!userMessage) {
        res.send(twiml('Sorry, I could not understand your message.'));
        return;
    }
    try {
        (0, conversation_1.cleanExpiredConversations)();
        const history = (0, conversation_1.loadHistory)(from);
        const client = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
        const today = new Date().toISOString().split('T')[0];
        const data = (0, data_1.allData)();
        const config = getConfig();
        const annotatedContracts = data.contracts.map(c => ({
            ...c,
            daysUntilExpiry: (0, data_1.daysUntil)(c.endDate),
            formattedEndDate: formatDate(c.endDate),
        }));
        const annotatedCheques = data.cheques.map(c => {
            // Support both original format (chequeDate/unit) and Excel-imported format (dueDate/property)
            const raw = c;
            const dateField = raw['dueDate'] || c.chequeDate || '';
            return {
                id: c.id,
                tenantName: c.tenantName,
                location: c.unit || raw['property'] || '',
                amount: c.amount,
                dueDate: dateField,
                status: c.status || 'pending',
                daysUntilDue: dateField ? (0, data_1.daysUntil)(dateField) : null,
            };
        });
        const annotatedCharges = data.serviceCharges.map(c => ({
            ...c,
            daysUntilDue: (0, data_1.daysUntil)(c.nextDueDate),
        }));
        const systemPrompt = `You are a smart property management assistant for a Dubai landlord. Today is ${today}.
Reminder threshold: ${config.renewalReminderDays} days before contract end.

DATA ACCESS:

LANDLORDS:
${JSON.stringify(data.landlords, null, 2)}

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
ACTIONS: Use the provided tools for any send/remind/update commands.
EMAIL: When the landlord asks to send an email to a tenant (in any language), use send_email_to_tenant. Write a professional bilingual email (English + Arabic) as the bodyHtml parameter. Never send WhatsApp to tenants.`;
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
            (0, conversation_1.saveHistory)(from, userMessage, answer);
            console.log(`[WHATSAPP BOT] From: ${from} | Q: ${userMessage.slice(0, 60)} | A: ${answer.slice(0, 60)}`);
            res.send(twiml(answer));
            return;
        }
        // Execute tool calls
        const toolResults = [];
        for (const block of firstResponse.content) {
            if (block.type !== 'tool_use')
                continue;
            const input = block.input;
            let result;
            switch (block.name) {
                case 'send_renewal_notice':
                    result = await toolSendRenewalNotice(input.tenantName, input.increasePercent);
                    break;
                case 'send_reminder_to_tenant':
                    result = await toolSendReminderToTenant(input.tenantName);
                    break;
                case 'send_email_to_tenant':
                    result = await toolSendEmailToTenant(input.tenantName, input.subject, input.bodyHtml);
                    break;
                case 'update_reminder_threshold':
                    result = toolUpdateReminderThreshold(input.days);
                    break;
                case 'check_rera_increase':
                    result = toolCheckRERA(input.tenantName, input.marketRent);
                    break;
                case 'send_email':
                    result = await toolSendEmail(input.to, input.subject, input.body);
                    break;
                default:
                    result = `Unknown tool: ${block.name}`;
            }
            console.log(`[WHATSAPP TOOL] ${block.name}(${JSON.stringify(input).slice(0, 60)}) → ${result.slice(0, 80)}`);
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
        (0, conversation_1.saveHistory)(from, userMessage, answer);
        console.log(`[WHATSAPP BOT] From: ${from} | Q: ${userMessage.slice(0, 60)} | A: ${answer.slice(0, 60)}`);
        res.send(twiml(answer));
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[WhatsApp incoming error]', msg);
        res.send(twiml('Sorry, an error occurred. Please try again.'));
    }
});
// ─── Test email ───────────────────────────────────────────────────────────────
router.get('/test-email', async (_req, res) => {
    const to = process.env.MY_EMAIL;
    if (!to) {
        res.status(500).json({ error: 'MY_EMAIL env var is not set' });
        return;
    }
    try {
        await (0, email_1.sendEmail)(to, 'Test Email — Dubai Landlord System', '<p>This is a test email from the Dubai Landlord Management System.</p>', 'test');
        res.json({ success: true, to });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        res.status(500).json({ error: msg, stack });
    }
});
exports.default = router;
//# sourceMappingURL=whatsapp.js.map