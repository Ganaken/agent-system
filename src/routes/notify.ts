import { Router, Request, Response } from 'express';
import { getCheques, getContracts, getServiceCharges, daysUntil } from '../utils/data';
import { sendAlert } from '../services/whatsapp';

const router = Router();

// POST /api/notify/cheques
// Sends urgent alert for cheques due today, reminder for due in 1-7 days.
router.post('/cheques', async (_req: Request, res: Response) => {
  const cheques = getCheques();
  const sent: string[] = [];

  for (const cheque of cheques) {
    if (cheque.status !== 'pending') continue;
    const raw = cheque as unknown as Record<string, unknown>;
    const dateField = cheque.chequeDate || (raw['dueDate'] as string) || '';
    if (!dateField) continue;
    const days = daysUntil(dateField);
    const location = cheque.unit || (raw['property'] as string) || '';

    if (days === 0) {
      await sendAlert(
        `🚨 Deposit today: ${cheque.tenantName} - ${location} - AED ${cheque.amount.toLocaleString()}. Cheque due today!`
      );
      sent.push(`TODAY: ${cheque.tenantName} ${location}`);
    } else if (days >= 1 && days <= 7) {
      await sendAlert(
        `⏰ Cheque due in ${days} day${days === 1 ? '' : 's'}\nTenant: ${cheque.tenantName} | Property: ${location}\nAmount: AED ${cheque.amount.toLocaleString()} | Due: ${dateField}`
      );
      sent.push(`${days}d: ${cheque.tenantName} ${location}`);
    }
  }

  res.json({ sent: sent.length, details: sent });
});

// POST /api/notify/contracts
// Sends WhatsApp alert for each active contract expiring within 120 days.
router.post('/contracts', async (_req: Request, res: Response) => {
  const contracts = getContracts();
  const sent: string[] = [];

  for (const contract of contracts) {
    if (contract.status !== 'active') continue;
    const days = daysUntil(contract.endDate);
    if (days < 0 || days > 120) continue;

    await sendAlert(
      `📋 Contract expiring in ${days} day${days === 1 ? '' : 's'}\nTenant: ${contract.tenantName} | Unit: ${contract.unit}\nExpiry: ${contract.endDate}`
    );
    sent.push(`${days}d: ${contract.tenantName} ${contract.unit}`);
  }

  res.json({ sent: sent.length, details: sent });
});

// POST /api/notify/service-charges
// Sends WhatsApp alert for each service charge that is due (daysUntil <= 0).
router.post('/service-charges', async (_req: Request, res: Response) => {
  const charges = getServiceCharges();
  const sent: string[] = [];

  for (const charge of charges) {
    const days = daysUntil(charge.nextDueDate);
    if (days > 0) continue;

    await sendAlert(
      `🏢 Service charge due\nProperty: ${charge.propertyName} | Unit: ${charge.unit}\nAmount: AED ${charge.amount.toLocaleString()} | Due: ${charge.nextDueDate}`
    );
    sent.push(`${charge.propertyName} ${charge.unit}`);
  }

  res.json({ sent: sent.length, details: sent });
});

export default router;
