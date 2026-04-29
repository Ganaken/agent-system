import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getServiceCharges, saveServiceCharges, daysUntil } from '../utils/data';
import type { ServiceCharge } from '../types';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(getServiceCharges());
});

// GET /api/service-charges/due — service charges due within 30 days (or overdue)
router.get('/due', (_req: Request, res: Response) => {
  const charges = getServiceCharges();
  const due = charges
    .filter(c => daysUntil(c.nextDueDate) <= 30)
    .map(c => ({ ...c, daysUntil: daysUntil(c.nextDueDate) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);
  res.json(due);
});

router.post('/', (req: Request, res: Response) => {
  const charges = getServiceCharges();
  const charge: ServiceCharge = {
    id: randomUUID(),
    frequency: 'quarterly',
    ...req.body,
  };
  charges.push(charge);
  saveServiceCharges(charges);
  res.status(201).json(charge);
});

router.patch('/:id', (req: Request, res: Response) => {
  const charges = getServiceCharges();
  const charge = charges.find(c => c.id === req.params['id']);
  if (!charge) { res.status(404).json({ error: 'Not found' }); return; }
  Object.assign(charge, req.body);
  saveServiceCharges(charges);
  res.json(charge);
});

router.delete('/:id', (req: Request, res: Response) => {
  const charges = getServiceCharges();
  const idx = charges.findIndex(c => c.id === req.params['id']);
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
  const [removed] = charges.splice(idx, 1);
  saveServiceCharges(charges);
  res.json(removed);
});

export default router;
