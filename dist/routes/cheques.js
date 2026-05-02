"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const supabase_1 = require("../supabase");
const data_1 = require("../utils/data");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    const { data, error } = await supabase_1.supabase.from('cheques').select('*').order('due_date', { ascending: true });
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json(data ?? []);
});
// GET /api/cheques/due — cheques due in next 30 days, sorted ascending by due_date
router.get('/due', async (_req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const { data, error } = await supabase_1.supabase
        .from('cheques')
        .select('*')
        .eq('status', 'pending')
        .gte('due_date', today)
        .lte('due_date', future)
        .order('due_date', { ascending: true });
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json((data ?? []).map(c => ({ ...c, daysUntil: (0, data_1.daysUntil)(c.due_date) })));
});
router.post('/', async (req, res) => {
    const cheque = {
        id: (0, crypto_1.randomUUID)(),
        status: 'pending',
        reminder_sent_7: false,
        reminder_sent_1: false,
        ...req.body,
    };
    const { data, error } = await supabase_1.supabase.from('cheques').insert(cheque).select().single();
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.status(201).json(data);
});
router.patch('/:id/status', async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('cheques')
        .update({ status: req.body.status })
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
        .from('cheques')
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
//# sourceMappingURL=cheques.js.map