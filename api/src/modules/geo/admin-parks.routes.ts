import { Router } from 'express';

import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import { adminGeoService } from './geo.service';
import { createParkSchema, listParksSchema, type CreateParkBody, type ListParksQuery } from './geo.schemas';

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
  validate(listParksSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListParksQuery;
      const parks = await adminGeoService.listParks(query);

      res.status(200).json({ parks });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/',
  requireRole('ADMIN', 'EDITOR'),
  validate(createParkSchema),
  async (req, res, next) => {
    try {
      const body = req.body as CreateParkBody;
      const actorRoles = getActorRoles(req.user?.roles);
      const park = await adminGeoService.createPark(
        { actorId: req.user?.sub, roles: actorRoles },
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(201).json({ park });
    } catch (error) {
      next(error);
    }
  },
);

export const adminParksRouter = router;
