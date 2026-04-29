"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const data_1 = require("../utils/data");
const router = (0, express_1.Router)();
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
// POST /api/whatsapp/incoming — Twilio webhook for inbound WhatsApp messages
router.post('/incoming', async (req, res) => {
    res.setHeader('Content-Type', 'text/xml');
    const body = req.body;
    const message = body['Body']?.trim();
    const from = body['From'];
    if (!message || !from) {
        res.send(twiml('Sorry, I could not understand your message.'));
        return;
    }
    try {
        const client = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
        const today = new Date().toISOString().split('T')[0];
        const data = (0, data_1.allData)();
        const annotatedCheques = data.cheques.map(c => ({ ...c, daysUntilDue: (0, data_1.daysUntil)(c.chequeDate) }));
        const annotatedContracts = data.contracts.map(c => ({ ...c, daysUntilExpiry: (0, data_1.daysUntil)(c.endDate) }));
        const annotatedCharges = data.serviceCharges.map(c => ({ ...c, daysUntilDue: (0, data_1.daysUntil)(c.nextDueDate) }));
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
- Keep responses brief and clear — this is a WhatsApp message, not an email.
- Format currency as AED.
- Reference tenant names, unit numbers, and dates clearly.
- For rent increase questions, cite Dubai RERA Decree 43/2013 rules.
- Today is ${today}.`;
        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }],
        });
        const answer = response.content[0].type === 'text'
            ? response.content[0].text
            : 'Sorry, I could not generate a response.';
        console.log(`[WHATSAPP BOT] From: ${from} | Q: ${message.slice(0, 60)} | A: ${answer.slice(0, 60)}`);
        res.send(twiml(answer));
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[WhatsApp incoming error]', msg);
        res.send(twiml('Sorry, an error occurred. Please try again.'));
    }
});
exports.default = router;
//# sourceMappingURL=whatsapp.js.map