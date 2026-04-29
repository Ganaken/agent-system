import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getProperties, saveProperties } from '../utils/data';
import type { Property } from '../types';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(getProperties());
});

router.post('/', (req: Request, res: Response) => {
  const properties = getProperties();
  const property: Property = { id: randomUUID(), ...req.body };
  properties.push(property);
  saveProperties(properties);
  res.status(201).json(property);
});

router.delete('/:id', (req: Request, res: Response) => {
  const properties = getProperties();
  const idx = properties.findIndex(p => p.id === req.params['id']);
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
  const [removed] = properties.splice(idx, 1);
  saveProperties(properties);
  res.json(removed);
});

export default router;
