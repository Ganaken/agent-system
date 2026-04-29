"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const data_1 = require("../utils/data");
const router = (0, express_1.Router)();
router.get('/', (_req, res) => {
    res.json((0, data_1.getCheques)());
});
// GET /api/cheques/due — cheques due in next 30 days
router.get('/due', (_req, res) => {
    const cheques = (0, data_1.getCheques)();
    const due = cheques
        .filter(c => c.status === 'pending' && (0, data_1.daysUntil)(c.chequeDate) >= 0 && (0, data_1.daysUntil)(c.chequeDate) <= 30)
        .map(c => ({ ...c, daysUntil: (0, data_1.daysUntil)(c.chequeDate) }))
        .sort((a, b) => a.daysUntil - b.daysUntil);
    res.json(due);
});
router.post('/', (req, res) => {
    const cheques = (0, data_1.getCheques)();
    const cheque = {
        id: (0, crypto_1.randomUUID)(),
        status: 'pending',
        ...req.body,
    };
    cheques.push(cheque);
    (0, data_1.saveCheques)(cheques);
    res.status(201).json(cheque);
});
router.patch('/:id/status', (req, res) => {
    const cheques = (0, data_1.getCheques)();
    const cheque = cheques.find(c => c.id === req.params['id']);
    if (!cheque) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    cheque.status = req.body.status;
    (0, data_1.saveCheques)(cheques);
    res.json(cheque);
});
router.delete('/:id', (req, res) => {
    const cheques = (0, data_1.getCheques)();
    const idx = cheques.findIndex(c => c.id === req.params['id']);
    if (idx === -1) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    const [removed] = cheques.splice(idx, 1);
    (0, data_1.saveCheques)(cheques);
    res.json(removed);
});
exports.default = router;
//# sourceMappingURL=cheques.js.map