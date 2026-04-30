import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { allData, daysUntil } from '../utils/data';
import { sendEmail } from '../services/email';

const router = Router();

// ─── Tool: send_email ─────────────────────────────────────────────────────────

async function toolSendEmail(to: string, subject: string, body: string): Promise<string> {
  try {
    await sendEmail(to, subject, body);
    console.log(`EMAIL SENT TO: ${to}`);
    return `✅ Email sent to ${to}`;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`EMAIL ERROR: ${msg}`);
    return `❌ Email failed: ${msg}`;
  }
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'send_email',
    description: 'Send an email to a recipient. Use this when the landlord asks to send an email to a tenant or any person. Write a professional bilingual (English + Arabic) HTML body.',
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

// ─── Route ────────────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { message } = req.body as { message?: string };
    if (!message?.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const data = allData();

    const annotatedCheques = data.cheques
      .map(c => ({
        ...c,
        daysUntilDue: daysUntil(c.chequeDate),
      }))
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    const nextCheque = annotatedCheques.find(
      c => c.status === 'pending' && c.daysUntilDue >= 0,
    ) ?? null;
    const annotatedContracts = data.contracts.map(c => ({
      ...c,
      daysUntilExpiry: daysUntil(c.endDate),
    }));
    const annotatedCharges = data.serviceCharges.map(c => ({
      ...c,
      daysUntilDue: daysUntil(c.nextDueDate),
    }));

    const systemPrompt = `You are a smart property management assistant for a Dubai landlord. Today is ${today}.

You have full access to the landlord's data:

PROPERTIES:
${JSON.stringify(data.properties, null, 2)}

TENANTS:
${JSON.stringify(data.tenants, null, 2)}

NEXT CHEQUE DUE (pending, soonest from today):
${nextCheque ? JSON.stringify(nextCheque, null, 2) : 'None'}

ALL CHEQUES (sorted by daysUntilDue ascending — soonest first; negative = overdue):
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
- NEXT CHEQUE: When asked for "the next cheque" or "next due cheque", always use the NEXT CHEQUE DUE field above — never infer from the full list.
- EMAIL: When asked to send an email, you MUST call the send_email tool with the recipient's actual email address from the tenant data. Never just say you will send it — call the tool.`;

    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: message }];

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
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of firstResponse.content) {
      if (block.type !== 'tool_use') continue;
      const input = block.input as Record<string, unknown>;
      let result: string;

      if (block.name === 'send_email') {
        result = await toolSendEmail(
          input.to as string,
          input.subject as string,
          input.body as string,
        );
      } else {
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Chat error]', msg);
    res.status(500).json({ error: 'Chat failed', details: msg });
  }
});

export default router;
