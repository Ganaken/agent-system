import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../supabase';
import { daysUntil } from '../utils/data';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from('cheques').select('*').order('due_date', { ascending: true });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// GET /api/cheques/due — cheques due in next 30 days, sorted ascending by due_date
router.get('/due', async (_req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('cheques')
    .select('*')
    .eq('status', 'pending')
    .gte('due_date', today)
    .lte('due_date', future)
    .order('due_date', { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json((data ?? []).map(c => ({ ...c, daysUntil: daysUntil(c.due_date) })));
});

router.post('/', async (req: Request, res: Response) => {
  const cheque = {
    id: randomUUID(),
    status: 'pending',
    reminder_sent_7: false,
    reminder_sent_1: false,
    ...req.body,
  };
  const { data, error } = await supabase.from('cheques').insert(cheque).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('cheques')
    .update({ status: req.body.status })
    .eq('id', req.params['id'])
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(data);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('cheques')
    .delete()
    .eq('id', req.params['id'])
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(data);
});

export default router;
