import { Router } from 'express';

import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import { adminGeoService } from './geo.service';
import { createStateSchema, listStatesSchema, type CreateStateBody, type ListStatesQuery } from './geo.schemas';

const router = Router();

const getActorRoles = (roles: unknown): string[] => {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map((role) => (typeof role === 'string' ? role.trim() : ''))
    .filter((role) => role.length > 0);
};

router.get(
  '/',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  validate(listStatesSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListStatesQuery;
      const states = await adminGeoService.listStates(query);

      res.status(200).json({ states });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/',
  requireRole('ADMIN', 'EDITOR'),
  validate(createStateSchema),
  async (req, res, next) => {
    try {
      const body = req.body as CreateStateBody;
      const actorRoles = getActorRoles(req.user?.roles);
      const state = await adminGeoService.createState(
        { actorId: req.user?.sub, roles: actorRoles },
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(201).json({ state });
    } catch (error) {
      next(error);
    }
  },
);

export const adminStatesRouter = router;
