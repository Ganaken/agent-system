import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../supabase';
import { daysUntil } from '../utils/data';

const router = Router();

// Contracts are stored as fields on tenants (contract_start, contract_end, etc.)

router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from('tenants').select('*').order('contract_end', { ascending: true });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// GET /api/contracts/expiring — tenants whose contract ends within 120 days
router.get('/expiring', async (_req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 120 * 86_400_000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('status', 'active')
    .gte('contract_end', today)
    .lte('contract_end', future)
    .order('contract_end', { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json((data ?? []).map(t => ({ ...t, daysUntil: daysUntil(t.contract_end) })));
});

router.post('/', async (req: Request, res: Response) => {
  const tenant = { id: randomUUID(), status: 'active', ...req.body };
  const { data, error } = await supabase.from('tenants').insert(tenant).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.patch('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('tenants')
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
    .from('tenants')
    .delete()
    .eq('id', req.params['id'])
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(data);
});

export default router;
