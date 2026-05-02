import cron from 'node-cron';
import { supabase } from '../supabase';
import { getCheques, getTenants, getUnits, daysUntil } from '../utils/data';
import { sendAlert } from './whatsapp';

// ─── Cheque reminders ────────────────────────────────────────────────────────

export async function checkChequeReminders(): Promise<void> {
  const cheques = await getCheques();

  for (const cheque of cheques) {
    if (cheque.status !== 'pending') continue;
    const days = daysUntil(cheque.due_date);
    if (days < 0) continue;

    if (days <= 1 && !cheque.reminder_sent_1) {
      await sendAlert(
        `🚨 URGENT: Cheque due in ${days} day${days === 1 ? '' : 's'}\nTenant: ${cheque.tenant_name} | Unit: ${cheque.building_name} - ${cheque.unit_number}\nAmount: AED ${cheque.amount.toLocaleString()} | Due: ${cheque.due_date}`
      );
      await supabase.from('cheques').update({ reminder_sent_1: true, reminder_sent_7: true }).eq('id', cheque.id);

    } else if (days <= 7 && !cheque.reminder_sent_7) {
      await sendAlert(
        `⚠️ Cheque due in ${days} days\nTenant: ${cheque.tenant_name} | Unit: ${cheque.building_name} - ${cheque.unit_number}\nAmount: AED ${cheque.amount.toLocaleString()} | Due: ${cheque.due_date}`
      );
      await supabase.from('cheques').update({ reminder_sent_7: true }).eq('id', cheque.id);
    }
  }

  console.log(`[Scheduler] Cheque check done. ${new Date().toISOString()}`);
}

// ─── Contract renewals ───────────────────────────────────────────────────────

export async function checkContractRenewals(): Promise<void> {
  const tenants = await getTenants();
  const units = await getUnits();

  for (const tenant of tenants) {
    if (tenant.status !== 'active') continue;
    const days = daysUntil(tenant.contract_end);
    if (days < 0 || days > 30) continue;

    const unit = units.find(u => u.building_name === tenant.building_name && u.unit_number === tenant.unit_number);
    const annualRent = unit?.annual_rent ?? 0;

    await sendAlert(
      `📋 Contract expiring in ${days} day${days === 1 ? '' : 's'}\nTenant: ${tenant.full_name} | Unit: ${tenant.unit_number}\nBuilding: ${tenant.building_name}\nEnd Date: ${tenant.contract_end}\nRent: AED ${annualRent.toLocaleString()}/year`
    );
  }

  console.log(`[Scheduler] Contract check done. ${new Date().toISOString()}`);
}

// ─── Service charge reminders ─────────────────────────────────────────────────

export async function checkServiceCharges(): Promise<void> {
  const units = await getUnits();
  const dueUnits = units.filter(u => u.service_charge > 0);

  for (const unit of dueUnits) {
    await sendAlert(
      `🏢 Service charge due\nBuilding: ${unit.building_name} | Unit: ${unit.unit_number}\nAnnual Amount: AED ${unit.service_charge.toLocaleString()}`
    );
  }

  console.log(`[Scheduler] Service charge check done. ${new Date().toISOString()}`);
}

// ─── Start all cron jobs ──────────────────────────────────────────────────────

export function startScheduler(): void {
  // Daily at 08:00 — cheques and contracts
  cron.schedule('0 8 * * *', () => {
    checkChequeReminders().catch(console.error);
    checkContractRenewals().catch(console.error);
  });

  // 1st of every month at 09:00 — service charges
  cron.schedule('0 9 1 * *', () => {
    checkServiceCharges().catch(console.error);
  });

  console.log('[Scheduler] Started — cheques/contracts: daily 08:00 | service charges: 1st of month 09:00');
}
