"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../supabase");
const data_1 = require("../utils/data");
const whatsapp_1 = require("../services/whatsapp");
const router = (0, express_1.Router)();
// POST /api/notify/cheques — alert for cheques due today or in next 7 days
router.post('/cheques', async (_req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const future7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const { data: cheques } = await supabase_1.supabase
        .from('cheques')
        .select('*')
        .eq('status', 'pending')
        .gte('due_date', today)
        .lte('due_date', future7)
        .order('due_date', { ascending: true });
    const sent = [];
    for (const cheque of cheques ?? []) {
        const days = (0, data_1.daysUntil)(cheque.due_date);
        const location = `${cheque.building_name} - ${cheque.unit_number}`;
        if (days === 0) {
            await (0, whatsapp_1.sendAlert)(`🚨 Deposit today: ${cheque.tenant_name} - ${location} - AED ${cheque.amount.toLocaleString()}`);
            sent.push(`TODAY: ${cheque.tenant_name} ${location}`);
        }
        else if (days >= 1 && days <= 7) {
            await (0, whatsapp_1.sendAlert)(`⏰ Cheque due in ${days} day${days === 1 ? '' : 's'}\nTenant: ${cheque.tenant_name} | Unit: ${location}\nAmount: AED ${cheque.amount.toLocaleString()} | Due: ${cheque.due_date}`);
            sent.push(`${days}d: ${cheque.tenant_name} ${location}`);
        }
    }
    res.json({ sent: sent.length, details: sent });
});
// POST /api/notify/contracts — alert for contracts expiring within 120 days
router.post('/contracts', async (_req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const future120 = new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0];
    const { data: tenants } = await supabase_1.supabase
        .from('tenants')
        .select('*')
        .eq('status', 'active')
        .gte('contract_end', today)
        .lte('contract_end', future120)
        .order('contract_end', { ascending: true });
    const sent = [];
    for (const tenant of tenants ?? []) {
        const days = (0, data_1.daysUntil)(tenant.contract_end);
        await (0, whatsapp_1.sendAlert)(`📋 Contract expiring in ${days} day${days === 1 ? '' : 's'}\nTenant: ${tenant.full_name} | Unit: ${tenant.building_name} - ${tenant.unit_number}\nExpiry: ${tenant.contract_end}`);
        sent.push(`${days}d: ${tenant.full_name} ${tenant.unit_number}`);
    }
    res.json({ sent: sent.length, details: sent });
});
// POST /api/notify/service-charges — alert for all units with service charges
router.post('/service-charges', async (_req, res) => {
    const { data: units } = await supabase_1.supabase
        .from('units')
        .select('*')
        .gt('service_charge', 0)
        .order('building_name', { ascending: true });
    const sent = [];
    for (const unit of units ?? []) {
        await (0, whatsapp_1.sendAlert)(`🏢 Service charge due\nBuilding: ${unit.building_name} | Unit: ${unit.unit_number}\nAnnual Amount: AED ${unit.service_charge.toLocaleString()}`);
        sent.push(`${unit.building_name} ${unit.unit_number}`);
    }
    res.json({ sent: sent.length, details: sent });
});
exports.default = router;
//# sourceMappingURL=notify.js.map