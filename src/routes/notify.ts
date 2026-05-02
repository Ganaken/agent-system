import { Router, Request, Response } from 'express';
import { supabase } from '../supabase';
import { daysUntil } from '../utils/data';
import { sendAlert } from '../services/whatsapp';

const router = Router();

// POST /api/notify/cheques — alert for cheques due today or in next 7 days
router.post('/cheques', async (_req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const future7 = new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0];

  const { data: cheques } = await supabase
    .from('cheques')
    .select('*')
    .eq('status', 'pending')
    .gte('due_date', today)
    .lte('due_date', future7)
    .order('due_date', { ascending: true });

  const sent: string[] = [];

  for (const cheque of cheques ?? []) {
    const days = daysUntil(cheque.due_date);
    const location = `${cheque.building_name} - ${cheque.unit_number}`;

    if (days === 0) {
      await sendAlert(`🚨 Deposit today: ${cheque.tenant_name} - ${location} - AED ${cheque.amount.toLocaleString()}`);
      sent.push(`TODAY: ${cheque.tenant_name} ${location}`);
    } else if (days >= 1 && days <= 7) {
      await sendAlert(
        `⏰ Cheque due in ${days} day${days === 1 ? '' : 's'}\nTenant: ${cheque.tenant_name} | Unit: ${location}\nAmount: AED ${cheque.amount.toLocaleString()} | Due: ${cheque.due_date}`
      );
      sent.push(`${days}d: ${cheque.tenant_name} ${location}`);
    }
  }

  res.json({ sent: sent.length, details: sent });
});

// POST /api/notify/contracts — alert for contracts expiring within 120 days
router.post('/contracts', async (_req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const future120 = new Date(Date.now() + 120 * 86_400_000).toISOString().split('T')[0];

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .eq('status', 'active')
    .gte('contract_end', today)
    .lte('contract_end', future120)
    .order('contract_end', { ascending: true });

  const sent: string[] = [];

  for (const tenant of tenants ?? []) {
    const days = daysUntil(tenant.contract_end);
    await sendAlert(
      `📋 Contract expiring in ${days} day${days === 1 ? '' : 's'}\nTenant: ${tenant.full_name} | Unit: ${tenant.building_name} - ${tenant.unit_number}\nExpiry: ${tenant.contract_end}`
    );
    sent.push(`${days}d: ${tenant.full_name} ${tenant.unit_number}`);
  }

  res.json({ sent: sent.length, details: sent });
});

// POST /api/notify/service-charges — alert for all units with service charges
router.post('/service-charges', async (_req: Request, res: Response) => {
  const { data: units } = await supabase
    .from('units')
    .select('*')
    .gt('service_charge', 0)
    .order('building_name', { ascending: true });

  const sent: string[] = [];

  for (const unit of units ?? []) {
    await sendAlert(
      `🏢 Service charge due\nBuilding: ${unit.building_name} | Unit: ${unit.unit_number}\nAnnual Amount: AED ${unit.service_charge.toLocaleString()}`
    );
    sent.push(`${unit.building_name} ${unit.unit_number}`);
  }

  res.json({ sent: sent.length, details: sent });
});

export default router;
