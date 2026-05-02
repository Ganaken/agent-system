import 'dotenv/config';
import express, { Request, Response } from 'express';
import { startScheduler } from './services/scheduler';
import tenantsRouter from './routes/tenants';
import propertiesRouter from './routes/properties';
import chequesRouter from './routes/cheques';
import contractsRouter from './routes/contracts';
import serviceChargesRouter from './routes/service-charges';
import chatRouter from './routes/chat';
import reraRouter from './routes/rera';
import whatsappRouter from './routes/whatsapp';
import notifyRouter from './routes/notify';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/tenants', tenantsRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/cheques', chequesRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/service-charges', serviceChargesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/rera', reraRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/notify', notifyRouter);

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
      'POST /api/notify/cheques',
      'POST /api/notify/contracts',
      'POST /api/notify/service-charges',
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
  console.log('  Storage: Supabase (permanent)');
  console.log('  API endpoints:');
  console.log('  GET  /api/cheques/due         — cheques due in 30 days');
  console.log('  GET  /api/contracts/expiring  — contracts expiring in 120 days');
  console.log('  GET  /api/service-charges/due — service charges due');
  console.log('  POST /api/chat                — ask in Arabic or English');
  console.log('  POST /api/rera/check          — RERA rent increase calculator');
  console.log('  POST /api/whatsapp/incoming   — Twilio WhatsApp chatbot webhook');
  console.log('  GET  /api/whatsapp/test-email — send a test email');
  console.log('  POST /api/notify/cheques      — WhatsApp alert: cheques due today / in 7 days');
  console.log('  POST /api/notify/contracts    — WhatsApp alert: contracts expiring in 120 days');
  console.log('  POST /api/notify/service-charges — WhatsApp alert: service charges due');
  console.log('  GET  /health                  — all routes');
  console.log('');
  console.log('  Env vars:');
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓ set' : '✗ NOT SET'}`);
  console.log(`  SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✓ set' : '✗ NOT SET'}`);
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ NOT SET'}`);
  console.log('');
  startScheduler();
});
