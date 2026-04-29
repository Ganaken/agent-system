"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const data_1 = require("../utils/data");
const router = (0, express_1.Router)();
router.get('/', (_req, res) => {
    res.json((0, data_1.getContracts)());
});
// GET /api/contracts/expiring — contracts expiring in next 120 days
router.get('/expiring', (_req, res) => {
    const contracts = (0, data_1.getContracts)();
    const expiring = contracts
        .filter(c => c.status === 'active' && (0, data_1.daysUntil)(c.endDate) >= 0 && (0, data_1.daysUntil)(c.endDate) <= 120)
        .map(c => ({ ...c, daysUntil: (0, data_1.daysUntil)(c.endDate) }))
        .sort((a, b) => a.daysUntil - b.daysUntil);
    res.json(expiring);
});
router.post('/', (req, res) => {
    const contracts = (0, data_1.getContracts)();
    const contract = {
        id: (0, crypto_1.randomUUID)(),
        status: 'active',
        renewalEmailSent: false,
        ...req.body,
    };
    contracts.push(contract);
    (0, data_1.saveContracts)(contracts);
    res.status(201).json(contract);
});
router.patch('/:id', (req, res) => {
    const contracts = (0, data_1.getContracts)();
    const contract = contracts.find(c => c.id === req.params['id']);
    if (!contract) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    Object.assign(contract, req.body);
    (0, data_1.saveContracts)(contracts);
    res.json(contract);
});
router.delete('/:id', (req, res) => {
    const contracts = (0, data_1.getContracts)();
    const idx = contracts.findIndex(c => c.id === req.params['id']);
    if (idx === -1) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    const [removed] = contracts.splice(idx, 1);
    (0, data_1.saveContracts)(contracts);
    res.json(removed);
});
exports.default = router;
//# sourceMappingURL=contracts.js.map