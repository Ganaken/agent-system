"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkChequeReminders = checkChequeReminders;
exports.checkContractRenewals = checkContractRenewals;
exports.checkServiceCharges = checkServiceCharges;
exports.startScheduler = startScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const data_1 = require("../utils/data");
const email_1 = require("./email");
const whatsapp_1 = require("./whatsapp");
const rera_1 = require("./rera");
const data_2 = require("../utils/data");
const MY_EMAIL = () => process.env.MY_EMAIL || '';
// ─── Cheque reminders ────────────────────────────────────────────────────────
async function checkChequeReminders() {
    const cheques = (0, data_1.getCheques)();
    let changed = false;
    for (const cheque of cheques) {
        if (cheque.status !== 'pending')
            continue;
        const days = (0, data_1.daysUntil)(cheque.chequeDate);
        if (days < 0)
            continue;
        if (days <= 7 && !cheque.reminderSent7) {
            const subject = `🚨 URGENT: Cheque due in ${days} days — ${cheque.tenantName} Unit ${cheque.unit}`;
            try {
                await (0, email_1.sendEmail)(MY_EMAIL(), subject, (0, email_1.chequeEmail)(cheque, days));
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                await (0, whatsapp_1.sendAlert)(`❌ Email failed (cheque reminder):\n${msg}`);
            }
            await (0, whatsapp_1.sendAlert)(`🚨 URGENT: Cheque due in ${days} days\nTenant: ${cheque.tenantName} | Unit: ${cheque.unit}\nAmount: AED ${cheque.amount.toLocaleString()} | Date: ${cheque.chequeDate}`);
            cheque.reminderSent7 = true;
            cheque.reminderSent14 = true;
            cheque.reminderSent30 = true;
            changed = true;
        }
        else if (days <= 14 && !cheque.reminderSent14) {
            const subject = `⚠️ Cheque due in ${days} days — ${cheque.tenantName} Unit ${cheque.unit}`;
            try {
                await (0, email_1.sendEmail)(MY_EMAIL(), subject, (0, email_1.chequeEmail)(cheque, days));
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                await (0, whatsapp_1.sendAlert)(`❌ Email failed (cheque reminder):\n${msg}`);
            }
            await (0, whatsapp_1.sendAlert)(`⚠️ Cheque due in ${days} days\nTenant: ${cheque.tenantName} | Unit: ${cheque.unit}\nAmount: AED ${cheque.amount.toLocaleString()} | Date: ${cheque.chequeDate}`);
            cheque.reminderSent14 = true;
            cheque.reminderSent30 = true;
            changed = true;
        }
        else if (days <= 30 && !cheque.reminderSent30) {
            const subject = `📅 Cheque due in ${days} days — ${cheque.tenantName} Unit ${cheque.unit}`;
            try {
                await (0, email_1.sendEmail)(MY_EMAIL(), subject, (0, email_1.chequeEmail)(cheque, days));
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                await (0, whatsapp_1.sendAlert)(`❌ Email failed (cheque reminder):\n${msg}`);
            }
            await (0, whatsapp_1.sendAlert)(`📅 Cheque due in ${days} days\nTenant: ${cheque.tenantName} | Unit: ${cheque.unit}\nAmount: AED ${cheque.amount.toLocaleString()} | Date: ${cheque.chequeDate}`);
            cheque.reminderSent30 = true;
            changed = true;
        }
    }
    if (changed)
        (0, data_1.saveCheques)(cheques);
    console.log(`[Scheduler] Cheque check done. ${new Date().toISOString()}`);
}
// ─── Contract renewals ───────────────────────────────────────────────────────
async function checkContractRenewals() {
    const contracts = (0, data_1.getContracts)();
    const properties = (0, data_2.getProperties)();
    let changed = false;
    for (const contract of contracts) {
        if (contract.status !== 'active')
            continue;
        const days = (0, data_1.daysUntil)(contract.endDate);
        if (days < 0 || days > 120 || contract.renewalEmailSent)
            continue;
        const prop = properties.find(p => p.id === contract.propertyId);
        const area = prop?.area ?? 'Dubai';
        const reraInfo = await (0, rera_1.getRERAInfo)(area, contract.rentAmount);
        let tenantEmailOk = true;
        try {
            await (0, email_1.sendEmail)(contract.tenantEmail, `Contract Renewal Notice — Unit ${contract.unit} | إشعار تجديد العقد`, (0, email_1.tenantRenewalEmail)(contract, days));
        }
        catch (err) {
            tenantEmailOk = false;
            const msg = err instanceof Error ? err.message : String(err);
            await (0, whatsapp_1.sendAlert)(`❌ Email failed (tenant renewal notice — ${contract.tenantName}):\n${msg}`);
        }
        try {
            await (0, email_1.sendEmail)(MY_EMAIL(), `📋 Contract expiring in ${days} days — ${contract.tenantName} Unit ${contract.unit}`, (0, email_1.landlordContractEmail)(contract, days, reraInfo));
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await (0, whatsapp_1.sendAlert)(`❌ Email failed (landlord contract summary):\n${msg}`);
        }
        await (0, whatsapp_1.sendAlert)(`📋 Contract expiring in ${days} days\nTenant: ${contract.tenantName} | Unit: ${contract.unit}\nEnd Date: ${contract.endDate}\nRent: AED ${contract.rentAmount.toLocaleString()}/year\n${tenantEmailOk ? `✅ Renewal notice sent to ${contract.tenantEmail}` : `⚠️ Email to tenant failed`}`);
        contract.renewalEmailSent = true;
        changed = true;
    }
    if (changed)
        (0, data_1.saveContracts)(contracts);
    console.log(`[Scheduler] Contract check done. ${new Date().toISOString()}`);
}
// ─── Service charge reminders ─────────────────────────────────────────────────
async function checkServiceCharges() {
    const charges = (0, data_1.getServiceCharges)();
    let changed = false;
    for (const charge of charges) {
        const days = (0, data_1.daysUntil)(charge.nextDueDate);
        if (days > 0)
            continue;
        try {
            await (0, email_1.sendEmail)(MY_EMAIL(), `🏢 Service charge due — ${charge.propertyName} Unit ${charge.unit}`, (0, email_1.serviceChargeEmail)(charge));
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await (0, whatsapp_1.sendAlert)(`❌ Email failed (service charge — ${charge.propertyName} Unit ${charge.unit}):\n${msg}`);
        }
        await (0, whatsapp_1.sendAlert)(`🏢 Service charge due\nProperty: ${charge.propertyName} | Unit: ${charge.unit}\nAmount: AED ${charge.amount.toLocaleString()} | Due: ${charge.nextDueDate}\nPay to Dubai Land Department to avoid late fees.`);
        charge.lastPaymentDate = charge.nextDueDate;
        charge.nextDueDate = (0, data_1.addMonths)(charge.nextDueDate, 3);
        changed = true;
    }
    if (changed)
        (0, data_1.saveServiceCharges)(charges);
    console.log(`[Scheduler] Service charge check done. ${new Date().toISOString()}`);
}
// ─── Start all cron jobs ──────────────────────────────────────────────────────
function startScheduler() {
    // Daily at 08:00 — cheques and contracts
    node_cron_1.default.schedule('0 8 * * *', () => {
        checkChequeReminders().catch(console.error);
        checkContractRenewals().catch(console.error);
    });
    // 1st of every month at 09:00 — service charges
    node_cron_1.default.schedule('0 9 1 * *', () => {
        checkServiceCharges().catch(console.error);
    });
    console.log('[Scheduler] Started — cheques/contracts: daily 08:00 | service charges: 1st of month 09:00');
}
//# sourceMappingURL=scheduler.js.map