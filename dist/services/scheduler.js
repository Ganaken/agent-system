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
const supabase_1 = require("../supabase");
const data_1 = require("../utils/data");
const email_1 = require("./email");
const whatsapp_1 = require("./whatsapp");
const rera_1 = require("./rera");
const MY_EMAIL = () => process.env.MY_EMAIL || '';
// ─── Cheque reminders ────────────────────────────────────────────────────────
async function checkChequeReminders() {
    const cheques = await (0, data_1.getCheques)();
    for (const cheque of cheques) {
        if (cheque.status !== 'pending')
            continue;
        const days = (0, data_1.daysUntil)(cheque.due_date);
        if (days < 0)
            continue;
        if (days <= 1 && !cheque.reminder_sent_1) {
            const subject = `🚨 URGENT: Cheque due ${days === 0 ? 'TODAY' : 'TOMORROW'} — ${cheque.tenant_name} ${cheque.unit_number}`;
            try {
                await (0, email_1.sendEmail)(MY_EMAIL(), subject, (0, email_1.chequeEmail)(cheque, days));
            }
            catch (err) {
                await (0, whatsapp_1.sendAlert)(`❌ Email failed (cheque reminder):\n${err instanceof Error ? err.message : String(err)}`);
            }
            await (0, whatsapp_1.sendAlert)(`🚨 URGENT: Cheque due in ${days} day${days === 1 ? '' : 's'}\nTenant: ${cheque.tenant_name} | Unit: ${cheque.building_name} - ${cheque.unit_number}\nAmount: AED ${cheque.amount.toLocaleString()} | Due: ${cheque.due_date}`);
            await supabase_1.supabase.from('cheques').update({ reminder_sent_1: true, reminder_sent_7: true }).eq('id', cheque.id);
        }
        else if (days <= 7 && !cheque.reminder_sent_7) {
            const subject = `⚠️ Cheque due in ${days} days — ${cheque.tenant_name} ${cheque.unit_number}`;
            try {
                await (0, email_1.sendEmail)(MY_EMAIL(), subject, (0, email_1.chequeEmail)(cheque, days));
            }
            catch (err) {
                await (0, whatsapp_1.sendAlert)(`❌ Email failed (cheque reminder):\n${err instanceof Error ? err.message : String(err)}`);
            }
            await (0, whatsapp_1.sendAlert)(`⚠️ Cheque due in ${days} days\nTenant: ${cheque.tenant_name} | Unit: ${cheque.building_name} - ${cheque.unit_number}\nAmount: AED ${cheque.amount.toLocaleString()} | Due: ${cheque.due_date}`);
            await supabase_1.supabase.from('cheques').update({ reminder_sent_7: true }).eq('id', cheque.id);
        }
    }
    console.log(`[Scheduler] Cheque check done. ${new Date().toISOString()}`);
}
// ─── Contract renewals ───────────────────────────────────────────────────────
async function checkContractRenewals() {
    const tenants = await (0, data_1.getTenants)();
    const units = await (0, data_1.getUnits)();
    for (const tenant of tenants) {
        if (tenant.status !== 'active')
            continue;
        const days = (0, data_1.daysUntil)(tenant.contract_end);
        if (days < 0 || days > 30)
            continue;
        const unit = units.find(u => u.building_name === tenant.building_name && u.unit_number === tenant.unit_number);
        const annualRent = unit?.annual_rent ?? 0;
        if (tenant.email) {
            try {
                await (0, email_1.sendEmail)(tenant.email, `Contract Renewal Notice — Unit ${tenant.unit_number} | إشعار تجديد العقد`, (0, email_1.tenantRenewalEmail)(tenant, days));
            }
            catch (err) {
                await (0, whatsapp_1.sendAlert)(`❌ Email failed (tenant renewal — ${tenant.full_name}):\n${err instanceof Error ? err.message : String(err)}`);
            }
        }
        const reraInfo = await (0, rera_1.getRERAInfo)(tenant.building_name, annualRent);
        try {
            await (0, email_1.sendEmail)(MY_EMAIL(), `📋 Contract expiring in ${days} days — ${tenant.full_name} Unit ${tenant.unit_number}`, (0, email_1.landlordContractEmail)(tenant, days, annualRent, reraInfo));
        }
        catch (err) {
            await (0, whatsapp_1.sendAlert)(`❌ Email failed (landlord contract summary):\n${err instanceof Error ? err.message : String(err)}`);
        }
        await (0, whatsapp_1.sendAlert)(`📋 Contract expiring in ${days} day${days === 1 ? '' : 's'}\nTenant: ${tenant.full_name} | Unit: ${tenant.unit_number}\nBuilding: ${tenant.building_name}\nEnd Date: ${tenant.contract_end}\nRent: AED ${annualRent.toLocaleString()}/year`);
    }
    console.log(`[Scheduler] Contract check done. ${new Date().toISOString()}`);
}
// ─── Service charge reminders ─────────────────────────────────────────────────
async function checkServiceCharges() {
    const units = await (0, data_1.getUnits)();
    const dueUnits = units.filter(u => u.service_charge > 0);
    for (const unit of dueUnits) {
        try {
            await (0, email_1.sendEmail)(MY_EMAIL(), `🏢 Service charge due — ${unit.building_name} Unit ${unit.unit_number}`, (0, email_1.serviceChargeEmail)(unit));
        }
        catch (err) {
            await (0, whatsapp_1.sendAlert)(`❌ Email failed (service charge — ${unit.building_name} Unit ${unit.unit_number}):\n${err instanceof Error ? err.message : String(err)}`);
        }
        await (0, whatsapp_1.sendAlert)(`🏢 Service charge due\nBuilding: ${unit.building_name} | Unit: ${unit.unit_number}\nAnnual Amount: AED ${unit.service_charge.toLocaleString()}`);
    }
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