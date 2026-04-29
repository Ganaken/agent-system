import 'dotenv/config';
import express, { Request, Response } from 'express';
import { ensureDataDir } from './utils/data';
import { startScheduler } from './services/scheduler';
import { sendEmail } from './services/email';
import tenantsRouter from './routes/tenants';
import propertiesRouter from './routes/properties';
import chequesRouter from './routes/cheques';
import contractsRouter from './routes/contracts';
import serviceChargesRouter from './routes/service-charges';
import chatRouter from './routes/chat';
import reraRouter from './routes/rera';
import whatsappRouter from './routes/whatsapp';

ensureDataDir();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API routes
app.use('/api/tenants', tenantsRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/cheques', chequesRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/service-charges', serviceChargesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/rera', reraRouter);
app.use('/api/whatsapp', whatsappRouter);

// Debug: test email
app.get('/api/test-email', async (_req: Request, res: Response) => {
  const to = process.env.GMAIL_USER;
  if (!to) {
    res.status(500).send('GMAIL_USER env var is not set');
    return;
  }
  try {
    await sendEmail(to, 'Test Email', '<p>This is a test email from the Dubai Landlord Management System.</p>');
    res.send('Email sent successfully');
  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    res.status(500).send(msg);
  }
});

// Health check + route listing
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    routes: [
      'GET  /api/tenants',
      'POST /api/tenants',
      'GET  /api/properties',
      'POST /api/properties',
      'GET  /api/cheques',
      'GET  /api/cheques/due',
      'POST /api/cheques',
      'PATCH /api/cheques/:id/status',
      'GET  /api/contracts',
      'GET  /api/contracts/expiring',
      'POST /api/contracts',
      'GET  /api/service-charges',
      'GET  /api/service-charges/due',
      'POST /api/service-charges',
      'POST /api/chat',
      'POST /api/rera/check',
      'POST /api/whatsapp/incoming',
    ],
  });
});

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Dubai Landlord Management System  🏙️     ║');
  console.log(`║   Running on http://localhost:${PORT}          ║`);
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log('  API endpoints:');
  console.log('  GET  /api/cheques/due         — cheques due in 30 days');
  console.log('  GET  /api/contracts/expiring  — contracts expiring in 120 days');
  console.log('  GET  /api/service-charges/due — service charges due');
  console.log('  POST /api/chat                — ask in Arabic or English');
  console.log('  POST /api/rera/check          — RERA rent increase calculator');
  console.log('  POST /api/whatsapp/incoming   — Twilio WhatsApp chatbot webhook');
  console.log('  GET  /health                  — all routes');
  console.log('');
  startScheduler();
});
