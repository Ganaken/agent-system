"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const data_1 = require("../utils/data");
const router = (0, express_1.Router)();
router.get('/', (_req, res) => {
    res.json((0, data_1.getServiceCharges)());
});
// GET /api/service-charges/due — service charges due within 30 days (or overdue)
router.get('/due', (_req, res) => {
    const charges = (0, data_1.getServiceCharges)();
    const due = charges
        .filter(c => (0, data_1.daysUntil)(c.nextDueDate) <= 30)
        .map(c => ({ ...c, daysUntil: (0, data_1.daysUntil)(c.nextDueDate) }))
        .sort((a, b) => a.daysUntil - b.daysUntil);
    res.json(due);
});
router.post('/', (req, res) => {
    const charges = (0, data_1.getServiceCharges)();
    const charge = {
        id: (0, crypto_1.randomUUID)(),
        frequency: 'quarterly',
        ...req.body,
    };
    charges.push(charge);
    (0, data_1.saveServiceCharges)(charges);
    res.status(201).json(charge);
});
router.patch('/:id', (req, res) => {
    const charges = (0, data_1.getServiceCharges)();
    const charge = charges.find(c => c.id === req.params['id']);
    if (!charge) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    Object.assign(charge, req.body);
    (0, data_1.saveServiceCharges)(charges);
    res.json(charge);
});
router.delete('/:id', (req, res) => {
    const charges = (0, data_1.getServiceCharges)();
    const idx = charges.findIndex(c => c.id === req.params['id']);
    if (idx === -1) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    const [removed] = charges.splice(idx, 1);
    (0, data_1.saveServiceCharges)(charges);
    res.json(removed);
});
exports.default = router;
//# sourceMappingURL=service-charges.js.map