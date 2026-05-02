import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../supabase';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from('buildings').select('*').order('name', { ascending: true });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

router.post('/', async (req: Request, res: Response) => {
  const building = { id: randomUUID(), ...req.body };
  const { data, error } = await supabase.from('buildings').insert(building).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('buildings')
    .delete()
    .eq('id', req.params['id'])
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(data);
});

export default router;
