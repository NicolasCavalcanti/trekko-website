import { Router } from 'express';

import { HttpError } from '../../middlewares/error';
import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import { adminExpeditionService } from './expedition.service';
import {
  createAdminExpeditionSchema,
  getAdminExpeditionSchema,
  listAdminExpeditionsSchema,
  updateAdminExpeditionSchema,
  updateAdminExpeditionStatusSchema,
  type CreateAdminExpeditionBody,
  type GetAdminExpeditionParams,
  type ListAdminExpeditionsQuery,
  type UpdateAdminExpeditionBody,
  type UpdateAdminExpeditionParams,
  type UpdateAdminExpeditionStatusBody,
  type UpdateAdminExpeditionStatusParams,
} from './expedition.schemas';

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
  requireRole('ADMIN', 'EDITOR', 'OPERADOR', 'GUIA'),
  validate(listAdminExpeditionsSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListAdminExpeditionsQuery;
      const result = await adminExpeditionService.listExpeditions(query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR', 'GUIA'),
  validate(createAdminExpeditionSchema),
  async (req, res, next) => {
    try {
      const body = req.body as CreateAdminExpeditionBody;
      const actorRoles = extractRoles(req.user?.roles);
      const expedition = await adminExpeditionService.createExpedition(
        { actorId: req.user?.sub, roles: actorRoles },
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(201).json({ expedition });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/:id',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR', 'GUIA'),
  validate(getAdminExpeditionSchema),
  async (req, res, next) => {
    try {
      const params = req.params as unknown as GetAdminExpeditionParams;
      const expedition = await adminExpeditionService.getExpeditionById(params.id);

      if (!expedition) {
        throw new HttpError(404, 'EXPEDITION_NOT_FOUND', 'Expedition not found');
      }

      res.status(200).json({ expedition });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR', 'GUIA'),
  validate(updateAdminExpeditionSchema),
  async (req, res, next) => {
    try {
      const params = req.params as unknown as UpdateAdminExpeditionParams;
      const body = req.body as UpdateAdminExpeditionBody;
      const actorRoles = extractRoles(req.user?.roles);
      const expedition = await adminExpeditionService.updateExpedition(
        { actorId: req.user?.sub, roles: actorRoles },
        params.id,
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(200).json({ expedition });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/:id/status',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  validate(updateAdminExpeditionStatusSchema),
  async (req, res, next) => {
    try {
      const params = req.params as unknown as UpdateAdminExpeditionStatusParams;
      const body = req.body as UpdateAdminExpeditionStatusBody;
      const actorRoles = extractRoles(req.user?.roles);
      const expedition = await adminExpeditionService.updateExpeditionStatus(
        { actorId: req.user?.sub, roles: actorRoles },
        params.id,
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(200).json({ expedition });
    } catch (error) {
      next(error);
    }
  },
);

export const adminExpeditionsRouter = router;
