import { Router } from 'express';

import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import { adminReservationService } from './reservation.service';
import {
  createAdminReservationSchema,
  listAdminReservationsSchema,
  updateAdminReservationSchema,
  type CreateAdminReservationBody,
  type ListAdminReservationsQuery,
  type UpdateAdminReservationBody,
  type UpdateAdminReservationParams,
} from './reservation.schemas';

const router = Router();

const extractRoles = (roles: unknown): string[] => {
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
  validate(listAdminReservationsSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListAdminReservationsQuery;
      const result = await adminReservationService.listReservations(query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  validate(createAdminReservationSchema),
  async (req, res, next) => {
    try {
      const body = req.body as CreateAdminReservationBody;
      const actorRoles = extractRoles(req.user?.roles);
      const reservation = await adminReservationService.createReservation(
        { actorId: req.user?.sub, roles: actorRoles },
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(201).json({ reservation });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  validate(updateAdminReservationSchema),
  async (req, res, next) => {
    try {
      const params = req.params as unknown as UpdateAdminReservationParams;
      const body = req.body as UpdateAdminReservationBody;
      const actorRoles = extractRoles(req.user?.roles);
      const reservation = await adminReservationService.updateReservation(
        { actorId: req.user?.sub, roles: actorRoles },
        params.id,
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(200).json({ reservation });
    } catch (error) {
      next(error);
    }
  },
);

export const adminReservationsRouter = router;
