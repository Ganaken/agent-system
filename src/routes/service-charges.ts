import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../supabase';

const router = Router();

// Service charges are stored as service_charge field on units

router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .gt('service_charge', 0)
    .order('building_name', { ascending: true });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// GET /api/service-charges/due — all units with service charges
router.get('/due', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .gt('service_charge', 0)
    .order('service_charge', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

router.post('/', async (req: Request, res: Response) => {
  const unit = { id: randomUUID(), ...req.body };
  const { data, error } = await supabase.from('units').insert(unit).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.patch('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('units')
    .update(req.body)
    .eq('id', req.params['id'])
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(data);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('units')
    .delete()
    .eq('id', req.params['id'])
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(data);
});

export default router;
