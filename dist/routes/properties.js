"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const supabase_1 = require("../supabase");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    const { data, error } = await supabase_1.supabase.from('buildings').select('*').order('name', { ascending: true });
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json(data ?? []);
});
router.post('/', async (req, res) => {
    const building = { id: (0, crypto_1.randomUUID)(), ...req.body };
    const { data, error } = await supabase_1.supabase.from('buildings').insert(building).select().single();
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.status(201).json(data);
});
router.delete('/:id', async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('buildings')
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
//# sourceMappingURL=properties.js.map