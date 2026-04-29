import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getContracts, saveContracts, daysUntil } from '../utils/data';
import type { Contract } from '../types';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(getContracts());
});

// GET /api/contracts/expiring — contracts expiring in next 120 days
router.get('/expiring', (_req: Request, res: Response) => {
  const contracts = getContracts();
  const expiring = contracts
    .filter(c => c.status === 'active' && daysUntil(c.endDate) >= 0 && daysUntil(c.endDate) <= 120)
    .map(c => ({ ...c, daysUntil: daysUntil(c.endDate) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);
  res.json(expiring);
});

router.post('/', (req: Request, res: Response) => {
  const contracts = getContracts();
  const contract: Contract = {
    id: randomUUID(),
    status: 'active',
    renewalEmailSent: false,
    ...req.body,
  };
  contracts.push(contract);
  saveContracts(contracts);
  res.status(201).json(contract);
});

router.patch('/:id', (req: Request, res: Response) => {
  const contracts = getContracts();
  const contract = contracts.find(c => c.id === req.params['id']);
  if (!contract) { res.status(404).json({ error: 'Not found' }); return; }
  Object.assign(contract, req.body);
  saveContracts(contracts);
  res.json(contract);
});

router.delete('/:id', (req: Request, res: Response) => {
  const contracts = getContracts();
  const idx = contracts.findIndex(c => c.id === req.params['id']);
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
  const [removed] = contracts.splice(idx, 1);
  saveContracts(contracts);
  res.json(removed);
});

export default router;
