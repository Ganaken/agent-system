import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getProperties, saveProperties } from '../utils/data';
import type { Property } from '../types';

const router = Router();

router.get('/', (_req, res) => {
  res.json(getProperties());
});

router.post('/', (req, res) => {
  const properties = getProperties();
  const property: Property = { id: randomUUID(), ...req.body };
  properties.push(property);
  saveProperties(properties);
  res.status(201).json(property);
});

router.delete('/:id', (req, res) => {
  const properties = getProperties();
  const idx = properties.findIndex(p => p.id === req.params['id']);
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
  const [removed] = properties.splice(idx, 1);
  saveProperties(properties);
  res.json(removed);
});

export default router;
