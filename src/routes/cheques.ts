import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getCheques, saveCheques, daysUntil } from '../utils/data';
import type { Cheque } from '../types';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(getCheques());
});

// GET /api/cheques/due — cheques due in next 30 days
router.get('/due', (_req: Request, res: Response) => {
  const cheques = getCheques();
  const due = cheques
    .filter(c => c.status === 'pending' && daysUntil(c.chequeDate) >= 0 && daysUntil(c.chequeDate) <= 30)
    .map(c => ({ ...c, daysUntil: daysUntil(c.chequeDate) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);
  res.json(due);
});

router.post('/', (req: Request, res: Response) => {
  const cheques = getCheques();
  const cheque: Cheque = {
    id: randomUUID(),
    status: 'pending',
    ...req.body,
  };
  cheques.push(cheque);
  saveCheques(cheques);
  res.status(201).json(cheque);
});

router.patch('/:id/status', (req: Request, res: Response) => {
  const cheques = getCheques();
  const cheque = cheques.find(c => c.id === req.params['id']);
  if (!cheque) { res.status(404).json({ error: 'Not found' }); return; }
  cheque.status = req.body.status;
  saveCheques(cheques);
  res.json(cheque);
});

router.delete('/:id', (req: Request, res: Response) => {
  const cheques = getCheques();
  const idx = cheques.findIndex(c => c.id === req.params['id']);
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
  const [removed] = cheques.splice(idx, 1);
  saveCheques(cheques);
  res.json(removed);
});

export default router;
