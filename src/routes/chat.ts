import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { allData, daysUntil } from '../utils/data';

const router = Router();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/', async (req, res) => {
  try {
    const { message } = req.body as { message?: string };
    if (!message?.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const data = allData();

    // Annotate cheques and contracts with daysUntil for easier reasoning
    const annotatedCheques = data.cheques.map(c => ({
      ...c,
      daysUntilDue: daysUntil(c.chequeDate),
    }));
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
- Today is ${today}.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });

    const answer = response.content[0].type === 'text' ? response.content[0].text : '';
    res.json({ answer, model: response.model, usage: response.usage });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Chat error]', msg);
    res.status(500).json({ error: 'Chat failed', details: msg });
  }
});

export default router;
