"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const data_1 = require("../utils/data");
const router = (0, express_1.Router)();
router.get('/', (_req, res) => {
    res.json((0, data_1.getTenants)());
});
router.post('/', (req, res) => {
    const tenants = (0, data_1.getTenants)();
    const tenant = { id: (0, crypto_1.randomUUID)(), ...req.body };
    tenants.push(tenant);
    (0, data_1.saveTenants)(tenants);
    res.status(201).json(tenant);
});
router.delete('/:id', (req, res) => {
    const tenants = (0, data_1.getTenants)();
    const idx = tenants.findIndex(t => t.id === req.params['id']);
    if (idx === -1) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    const [removed] = tenants.splice(idx, 1);
    (0, data_1.saveTenants)(tenants);
    res.json(removed);
});
exports.default = router;
//# sourceMappingURL=tenants.js.map