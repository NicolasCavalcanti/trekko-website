import { Router } from 'express';

import { requireRole } from '../../middlewares/rbac';
import { adminDashboardService } from './dashboard.service';

const router = Router();

const parseLimit = (value: unknown, fallback: number): number => {
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  if (Array.isArray(value) && value.length > 0) {
    return parseLimit(value[0], fallback);
  }

  return fallback;
};

router.get(
  '/metrics',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  async (_req, res, next) => {
    try {
      const metrics = await adminDashboardService.getMetrics();
      res.status(200).json({ metrics });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/events',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  async (req, res, next) => {
    try {
      const limit = parseLimit(req.query.limit, 20);
      const events = await adminDashboardService.getRecentEvents(limit);

      res.status(200).json({ events });
    } catch (error) {
      next(error);
    }
  },
);

export const adminDashboardRouter = router;

