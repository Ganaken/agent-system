import cron from 'node-cron';
import { getCheques, saveCheques, getContracts, saveContracts, getServiceCharges, saveServiceCharges, daysUntil, addMonths } from '../utils/data';
import { sendEmail, chequeEmail, tenantRenewalEmail, landlordContractEmail, serviceChargeEmail } from './email';
import { sendAlert } from './whatsapp';
import { getRERAInfo } from './rera';
import { getProperties } from '../utils/data';

const MY_EMAIL = () => process.env.MY_EMAIL || '';

// ─── Cheque reminders ────────────────────────────────────────────────────────

export async function checkChequeReminders(): Promise<void> {
  const cheques = getCheques();
  let changed = false;

  for (const cheque of cheques) {
    if (cheque.status !== 'pending') continue;
    const days = daysUntil(cheque.chequeDate);
    if (days < 0) continue;

    if (days <= 7 && !cheque.reminderSent7) {
      const subject = `🚨 URGENT: Cheque due in ${days} days — ${cheque.tenantName} Unit ${cheque.unit}`;
      await sendEmail(MY_EMAIL(), subject, chequeEmail(cheque, days));
      await sendAlert(
        `🚨 URGENT: Cheque due in ${days} days\nTenant: ${cheque.tenantName} | Unit: ${cheque.unit}\nAmount: AED ${cheque.amount.toLocaleString()} | Date: ${cheque.chequeDate}`
      );
      cheque.reminderSent7 = true;
      cheque.reminderSent14 = true;
      cheque.reminderSent30 = true;
      changed = true;
    } else if (days <= 14 && !cheque.reminderSent14) {
      const subject = `⚠️ Cheque due in ${days} days — ${cheque.tenantName} Unit ${cheque.unit}`;
      await sendEmail(MY_EMAIL(), subject, chequeEmail(cheque, days));
      await sendAlert(
        `⚠️ Cheque due in ${days} days\nTenant: ${cheque.tenantName} | Unit: ${cheque.unit}\nAmount: AED ${cheque.amount.toLocaleString()} | Date: ${cheque.chequeDate}`
      );
      cheque.reminderSent14 = true;
      cheque.reminderSent30 = true;
      changed = true;
    } else if (days <= 30 && !cheque.reminderSent30) {
      const subject = `📅 Cheque due in ${days} days — ${cheque.tenantName} Unit ${cheque.unit}`;
      await sendEmail(MY_EMAIL(), subject, chequeEmail(cheque, days));
      await sendAlert(
        `📅 Cheque due in ${days} days\nTenant: ${cheque.tenantName} | Unit: ${cheque.unit}\nAmount: AED ${cheque.amount.toLocaleString()} | Date: ${cheque.chequeDate}`
      );
      cheque.reminderSent30 = true;
      changed = true;
    }
  }

  if (changed) saveCheques(cheques);
  console.log(`[Scheduler] Cheque check done. ${new Date().toISOString()}`);
}

// ─── Contract renewals ───────────────────────────────────────────────────────

export async function checkContractRenewals(): Promise<void> {
  const contracts = getContracts();
  const properties = getProperties();
  let changed = false;

  for (const contract of contracts) {
    if (contract.status !== 'active') continue;
    const days = daysUntil(contract.endDate);
    if (days < 0 || days > 120 || contract.renewalEmailSent) continue;

    const prop = properties.find(p => p.id === contract.propertyId);
    const area = prop?.area ?? 'Dubai';
    const reraInfo = await getRERAInfo(area, contract.rentAmount);

    await sendEmail(
      contract.tenantEmail,
      `Contract Renewal Notice — Unit ${contract.unit} | إشعار تجديد العقد`,
      tenantRenewalEmail(contract, days)
    );

    await sendEmail(
      MY_EMAIL(),
      `📋 Contract expiring in ${days} days — ${contract.tenantName} Unit ${contract.unit}`,
      landlordContractEmail(contract, days, reraInfo)
    );

    await sendAlert(
      `📋 Contract expiring in ${days} days\nTenant: ${contract.tenantName} | Unit: ${contract.unit}\nEnd Date: ${contract.endDate}\nRent: AED ${contract.rentAmount.toLocaleString()}/year\n✅ Renewal notice sent to ${contract.tenantEmail}`
    );

    contract.renewalEmailSent = true;
    changed = true;
  }

  if (changed) saveContracts(contracts);
  console.log(`[Scheduler] Contract check done. ${new Date().toISOString()}`);
}

// ─── Service charge reminders ─────────────────────────────────────────────────

export async function checkServiceCharges(): Promise<void> {
  const charges = getServiceCharges();
  let changed = false;

  for (const charge of charges) {
    const days = daysUntil(charge.nextDueDate);
    if (days > 0) continue;

    await sendEmail(MY_EMAIL(), `🏢 Service charge due — ${charge.propertyName} Unit ${charge.unit}`, serviceChargeEmail(charge));

    await sendAlert(
      `🏢 Service charge due\nProperty: ${charge.propertyName} | Unit: ${charge.unit}\nAmount: AED ${charge.amount.toLocaleString()} | Due: ${charge.nextDueDate}\nPay to Dubai Land Department to avoid late fees.`
    );

    charge.lastPaymentDate = charge.nextDueDate;
    charge.nextDueDate = addMonths(charge.nextDueDate, 3);
    changed = true;
  }

  if (changed) saveServiceCharges(charges);
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
