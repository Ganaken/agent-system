import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getTenants, saveTenants } from '../utils/data';
import type { Tenant } from '../types';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(getTenants());
});

router.post('/', (req: Request, res: Response) => {
  const tenants = getTenants();
  const tenant: Tenant = { id: randomUUID(), ...req.body };
  tenants.push(tenant);
  saveTenants(tenants);
  res.status(201).json(tenant);
});

router.delete('/:id', (req: Request, res: Response) => {
  const tenants = getTenants();
  const idx = tenants.findIndex(t => t.id === req.params['id']);
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
  const [removed] = tenants.splice(idx, 1);
  saveTenants(tenants);
  res.json(removed);
});

export default router;
