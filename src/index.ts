import 'dotenv/config';
import express, { Request, Response } from 'express';
import { ensureDataDir } from './utils/data';
import { startScheduler } from './services/scheduler';
import tenantsRouter from './routes/tenants';
import propertiesRouter from './routes/properties';
import chequesRouter from './routes/cheques';
import contractsRouter from './routes/contracts';
import serviceChargesRouter from './routes/service-charges';
import chatRouter from './routes/chat';
import reraRouter from './routes/rera';

ensureDataDir();

const app = express();
app.use(express.json());

// API routes
app.use('/api/tenants', tenantsRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/cheques', chequesRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/service-charges', serviceChargesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/rera', reraRouter);

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
  console.log('  GET  /health                  — all routes');
  console.log('');
  startScheduler();
});
