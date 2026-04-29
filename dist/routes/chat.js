"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const data_1 = require("../utils/data");
const email_1 = require("../services/email");
const router = (0, express_1.Router)();
// ─── Tool: send_email ─────────────────────────────────────────────────────────
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
const TOOLS = [
    {
        name: 'send_email',
        description: 'Send an email to a recipient. Use this when the landlord asks to send an email to a tenant or any person. Write a professional bilingual (English + Arabic) HTML body.',
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
// ─── Route ────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const client = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
        const { message } = req.body;
        if (!message?.trim()) {
            res.status(400).json({ error: 'message is required' });
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        const data = (0, data_1.allData)();
        const annotatedCheques = data.cheques.map(c => ({
            ...c,
            daysUntilDue: (0, data_1.daysUntil)(c.chequeDate),
        }));
        const annotatedContracts = data.contracts.map(c => ({
            ...c,
            daysUntilExpiry: (0, data_1.daysUntil)(c.endDate),
        }));
        const annotatedCharges = data.serviceCharges.map(c => ({
            ...c,
            daysUntilDue: (0, data_1.daysUntil)(c.nextDueDate),
        }));
        const systemPrompt = `You are a smart property management assistant for a Dubai landlord. Today is ${today}.

You have full access to the landlord's data:

PROPERTIES:
${JSON.stringify(data.properties, null, 2)}

TENANTS:
${JSON.stringify(data.tenants, null, 2)}

CHEQUES (daysUntilDue = days from today; negative = overdue):
${JSON.stringify(annotatedCheques, null, 2)}

CONTRACTS (daysUntilExpiry = days from today):
${JSON.stringify(annotatedContracts, null, 2)}

SERVICE CHARGES (daysUntilDue = days from today; negative = overdue):
${JSON.stringify(annotatedCharges, null, 2)}

RULES:
- Detect the language of the user's question and reply in the SAME language.
- If the question is in Arabic, reply entirely in Arabic.
- If the question is in English, reply entirely in English.
- Be concise, accurate, and helpful.
- Format currency as AED.
- Reference tenant names, unit numbers, and dates clearly.
- For rent increase questions, cite Dubai RERA Decree 43/2013 rules.
- Today is ${today}.
- EMAIL: When asked to send an email, you MUST call the send_email tool with the recipient's actual email address from the tenant data. Never just say you will send it — call the tool.`;
        const messages = [{ role: 'user', content: message }];
        // First call — Claude may request tool use
        const firstResponse = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: systemPrompt,
            tools: TOOLS,
            messages,
        });
        // No tool call — return text directly
        if (firstResponse.stop_reason !== 'tool_use') {
            const answer = firstResponse.content[0].type === 'text' ? firstResponse.content[0].text : '';
            res.json({ answer, model: firstResponse.model, usage: firstResponse.usage });
            return;
        }
        // Execute tool calls
        const toolResults = [];
        for (const block of firstResponse.content) {
            if (block.type !== 'tool_use')
                continue;
            const input = block.input;
            let result;
            if (block.name === 'send_email') {
                result = await toolSendEmail(input.to, input.subject, input.body);
            }
            else {
                result = `Unknown tool: ${block.name}`;
            }
            console.log(`[CHAT TOOL] ${block.name}(to=${input.to ?? ''}) → ${result}`);
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        }
        // Second call with tool results — Claude confirms the outcome
        const secondResponse = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 512,
            system: systemPrompt,
            tools: TOOLS,
            messages: [
                ...messages,
                { role: 'assistant', content: firstResponse.content },
                { role: 'user', content: toolResults },
            ],
        });
        const textBlock = secondResponse.content.find(b => b.type === 'text');
        const answer = textBlock?.type === 'text'
            ? textBlock.text
            : toolResults.map(r => r.content).join('\n');
        res.json({ answer, model: secondResponse.model, usage: secondResponse.usage });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Chat error]', msg);
        res.status(500).json({ error: 'Chat failed', details: msg });
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map