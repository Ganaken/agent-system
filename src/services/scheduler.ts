import cron from 'node-cron';
import { supabase } from '../supabase';
import { getCheques, getTenants, getUnits, daysUntil } from '../utils/data';
import { sendEmail, chequeEmail, tenantRenewalEmail, landlordContractEmail, serviceChargeEmail } from './email';
import { sendAlert } from './whatsapp';
import { getRERAInfo } from './rera';

const MY_EMAIL = () => process.env.MY_EMAIL || '';

// ─── Cheque reminders ────────────────────────────────────────────────────────

export async function checkChequeReminders(): Promise<void> {
  const cheques = await getCheques();

  for (const cheque of cheques) {
    if (cheque.status !== 'pending') continue;
    const days = daysUntil(cheque.due_date);
    if (days < 0) continue;

    if (days <= 1 && !cheque.reminder_sent_1) {
      const subject = `🚨 URGENT: Cheque due ${days === 0 ? 'TODAY' : 'TOMORROW'} — ${cheque.tenant_name} ${cheque.unit_number}`;
      try {
        await sendEmail(MY_EMAIL(), subject, chequeEmail(cheque, days));
      } catch (err: unknown) {
        await sendAlert(`❌ Email failed (cheque reminder):\n${err instanceof Error ? err.message : String(err)}`);
      }
      await sendAlert(
        `🚨 URGENT: Cheque due in ${days} day${days === 1 ? '' : 's'}\nTenant: ${cheque.tenant_name} | Unit: ${cheque.building_name} - ${cheque.unit_number}\nAmount: AED ${cheque.amount.toLocaleString()} | Due: ${cheque.due_date}`
      );
      await supabase.from('cheques').update({ reminder_sent_1: true, reminder_sent_7: true }).eq('id', cheque.id);

    } else if (days <= 7 && !cheque.reminder_sent_7) {
      const subject = `⚠️ Cheque due in ${days} days — ${cheque.tenant_name} ${cheque.unit_number}`;
      try {
        await sendEmail(MY_EMAIL(), subject, chequeEmail(cheque, days));
      } catch (err: unknown) {
        await sendAlert(`❌ Email failed (cheque reminder):\n${err instanceof Error ? err.message : String(err)}`);
      }
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

    if (tenant.email) {
      try {
        await sendEmail(
          tenant.email,
          `Contract Renewal Notice — Unit ${tenant.unit_number} | إشعار تجديد العقد`,
          tenantRenewalEmail(tenant, days)
        );
      } catch (err: unknown) {
        await sendAlert(`❌ Email failed (tenant renewal — ${tenant.full_name}):\n${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const reraInfo = await getRERAInfo(tenant.building_name, annualRent);
    try {
      await sendEmail(
        MY_EMAIL(),
        `📋 Contract expiring in ${days} days — ${tenant.full_name} Unit ${tenant.unit_number}`,
        landlordContractEmail(tenant, days, annualRent, reraInfo)
      );
    } catch (err: unknown) {
      await sendAlert(`❌ Email failed (landlord contract summary):\n${err instanceof Error ? err.message : String(err)}`);
    }

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
    try {
      await sendEmail(MY_EMAIL(), `🏢 Service charge due — ${unit.building_name} Unit ${unit.unit_number}`, serviceChargeEmail(unit));
    } catch (err: unknown) {
      await sendAlert(`❌ Email failed (service charge — ${unit.building_name} Unit ${unit.unit_number}):\n${err instanceof Error ? err.message : String(err)}`);
    }
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
