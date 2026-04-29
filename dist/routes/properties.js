"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const data_1 = require("../utils/data");
const router = (0, express_1.Router)();
router.get('/', (_req, res) => {
    res.json((0, data_1.getProperties)());
});
router.post('/', (req, res) => {
    const properties = (0, data_1.getProperties)();
    const property = { id: (0, crypto_1.randomUUID)(), ...req.body };
    properties.push(property);
    (0, data_1.saveProperties)(properties);
    res.status(201).json(property);
});
router.delete('/:id', (req, res) => {
    const properties = (0, data_1.getProperties)();
    const idx = properties.findIndex(p => p.id === req.params['id']);
    if (idx === -1) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    const [removed] = properties.splice(idx, 1);
    (0, data_1.saveProperties)(properties);
    res.json(removed);
});
exports.default = router;
//# sourceMappingURL=properties.js.map