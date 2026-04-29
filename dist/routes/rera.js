"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rera_1 = require("../services/rera");
const router = (0, express_1.Router)();
// POST /api/rera/check — calculate max allowed rent increase
router.post('/check', async (req, res) => {
    try {
        const { currentRent, marketRent, area } = req.body;
        if (!currentRent) {
            res.status(400).json({ error: 'currentRent is required' });
            return;
        }
        if (marketRent) {
            const result = (0, rera_1.calculateRentIncrease)(currentRent, marketRent);
            res.json(result);
            return;
        }
        // No market rent provided — return rules + RERA links
        const info = await (0, rera_1.getRERAInfo)(area ?? 'Dubai', currentRent);
        res.json({ currentRent, area: area ?? 'Dubai', info });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});
exports.default = router;
//# sourceMappingURL=rera.js.map