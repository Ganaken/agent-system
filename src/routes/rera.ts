import { Router, Request, Response } from 'express';
import { calculateRentIncrease, getRERAInfo } from '../services/rera';

const router = Router();

// POST /api/rera/check — calculate max allowed rent increase
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { currentRent, marketRent, area } = req.body as {
      currentRent?: number;
      marketRent?: number;
      area?: string;
    };

    if (!currentRent) {
      res.status(400).json({ error: 'currentRent is required' });
      return;
    }

    if (marketRent) {
      const result = calculateRentIncrease(currentRent, marketRent);
      res.json(result);
      return;
    }

    // No market rent provided — return rules + RERA links
    const info = await getRERAInfo(area ?? 'Dubai', currentRent);
    res.json({ currentRent, area: area ?? 'Dubai', info });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;
