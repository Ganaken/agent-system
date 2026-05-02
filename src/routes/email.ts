import { Router, Request, Response } from 'express';
import { sendEmail } from '../services/email';

const router = Router();

// POST /api/email/send — explicit user-triggered email sending
router.post('/send', async (req: Request, res: Response) => {
  const { to, subject, body, tenant_id, type } = req.body as {
    to?: string;
    subject?: string;
    body?: string;
    tenant_id?: string;
    type?: string;
  };

  if (!to || !subject || !body) {
    res.status(400).json({ error: 'to, subject, and body are required' });
    return;
  }

  try {
    await sendEmail(to, subject, body, type ?? 'general');
    res.json({ success: true, to, subject, tenant_id: tenant_id ?? null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Email send error]', msg);
    res.status(500).json({ error: 'Email failed', details: msg });
  }
});

export default router;
