import { Router } from 'express';

import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import { adminGeoService } from './geo.service';
import { createCitySchema, listCitiesSchema, type CreateCityBody, type ListCitiesQuery } from './geo.schemas';

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
  validate(listCitiesSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListCitiesQuery;
      const cities = await adminGeoService.listCities(query);

      res.status(200).json({ cities });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/',
  requireRole('ADMIN', 'EDITOR'),
  validate(createCitySchema),
  async (req, res, next) => {
    try {
      const body = req.body as CreateCityBody;
      const actorRoles = getActorRoles(req.user?.roles);
      const city = await adminGeoService.createCity(
        { actorId: req.user?.sub, roles: actorRoles },
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(201).json({ city });
    } catch (error) {
      next(error);
    }
  },
);

export const adminCitiesRouter = router;
