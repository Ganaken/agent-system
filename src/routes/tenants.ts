import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getTenants, saveTenants } from '../utils/data';
import type { Tenant } from '../types';

const router = Router();

router.get('/', (_req, res) => {
  res.json(getTenants());
});

router.post('/', (req, res) => {
  const tenants = getTenants();
  const tenant: Tenant = { id: randomUUID(), ...req.body };
  tenants.push(tenant);
  saveTenants(tenants);
  res.status(201).json(tenant);
});

router.delete('/:id', (req, res) => {
  const tenants = getTenants();
  const idx = tenants.findIndex(t => t.id === req.params['id']);
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
  const [removed] = tenants.splice(idx, 1);
  saveTenants(tenants);
  res.json(removed);
});

export default router;
