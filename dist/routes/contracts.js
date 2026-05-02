"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const supabase_1 = require("../supabase");
const data_1 = require("../utils/data");
const router = (0, express_1.Router)();
// Contracts are stored as fields on tenants (contract_start, contract_end, etc.)
router.get('/', async (_req, res) => {
    const { data, error } = await supabase_1.supabase.from('tenants').select('*').order('contract_end', { ascending: true });
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json(data ?? []);
});
// GET /api/contracts/expiring — tenants whose contract ends within 120 days
router.get('/expiring', async (_req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0];
    const { data, error } = await supabase_1.supabase
        .from('tenants')
        .select('*')
        .eq('status', 'active')
        .gte('contract_end', today)
        .lte('contract_end', future)
        .order('contract_end', { ascending: true });
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json((data ?? []).map(t => ({ ...t, daysUntil: (0, data_1.daysUntil)(t.contract_end) })));
});
router.post('/', async (req, res) => {
    const tenant = { id: (0, crypto_1.randomUUID)(), status: 'active', ...req.body };
    const { data, error } = await supabase_1.supabase.from('tenants').insert(tenant).select().single();
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.status(201).json(data);
});
router.patch('/:id', async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('tenants')
        .update(req.body)
        .eq('id', req.params['id'])
        .select()
        .single();
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    if (!data) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    res.json(data);
});
router.delete('/:id', async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('tenants')
        .delete()
        .eq('id', req.params['id'])
        .select()
        .single();
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    if (!data) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    res.json(data);
});
exports.default = router;
//# sourceMappingURL=contracts.js.map