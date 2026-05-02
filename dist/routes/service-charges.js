"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const supabase_1 = require("../supabase");
const router = (0, express_1.Router)();
// Service charges are stored as service_charge field on units
router.get('/', async (_req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('units')
        .select('*')
        .gt('service_charge', 0)
        .order('building_name', { ascending: true });
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json(data ?? []);
});
// GET /api/service-charges/due — all units with service charges
router.get('/due', async (_req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('units')
        .select('*')
        .gt('service_charge', 0)
        .order('service_charge', { ascending: false });
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json(data ?? []);
});
router.post('/', async (req, res) => {
    const unit = { id: (0, crypto_1.randomUUID)(), ...req.body };
    const { data, error } = await supabase_1.supabase.from('units').insert(unit).select().single();
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.status(201).json(data);
});
router.patch('/:id', async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('units')
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
        .from('units')
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
//# sourceMappingURL=service-charges.js.map