import { Router } from 'express';

import { HttpError } from '../../middlewares/error';
import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import { adminMediaService } from '../media/media.service';
import {
  createTrailMediaSchema,
  type CreateTrailMediaBody,
  type CreateTrailMediaParams,
} from '../media/media.schemas';
import {
  createAdminTrailSchema,
  deleteAdminTrailSchema,
  getAdminTrailSchema,
  listAdminTrailsSchema,
  updateAdminTrailSchema,
  type CreateAdminTrailBody,
  type DeleteAdminTrailParams,
  type GetAdminTrailParams,
  type ListAdminTrailsQuery,
  type UpdateAdminTrailBody,
  type UpdateAdminTrailParams,
} from './trail.schemas';
import { adminTrailService } from './trail.service';

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
  validate(listAdminTrailsSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListAdminTrailsQuery;
      const result = await adminTrailService.listTrails(query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/',
  requireRole('ADMIN', 'EDITOR'),
  validate(createAdminTrailSchema),
  async (req, res, next) => {
    try {
      const body = req.body as CreateAdminTrailBody;
      const actorRoles = extractRoles(req.user?.roles);
      const trail = await adminTrailService.createTrail(
        { actorId: req.user?.sub, roles: actorRoles },
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(201).json({ trail });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/:id',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  validate(getAdminTrailSchema),
  async (req, res, next) => {
    try {
      const params = req.params as unknown as GetAdminTrailParams;
      const trail = await adminTrailService.getTrailById(params.id);

      if (!trail) {
        throw new HttpError(404, 'TRAIL_NOT_FOUND', 'Trail not found');
      }

      res.status(200).json({ trail });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'EDITOR'),
  validate(updateAdminTrailSchema),
  async (req, res, next) => {
    try {
      const params = req.params as unknown as UpdateAdminTrailParams;
      const body = req.body as UpdateAdminTrailBody;
      const actorRoles = extractRoles(req.user?.roles);
      const trail = await adminTrailService.updateTrail(
        { actorId: req.user?.sub, roles: actorRoles },
        params.id,
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(200).json({ trail });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/:id',
  requireRole('ADMIN'),
  validate(deleteAdminTrailSchema),
  async (req, res, next) => {
    try {
      const params = req.params as unknown as DeleteAdminTrailParams;
      const actorRoles = extractRoles(req.user?.roles);

      await adminTrailService.deleteTrail(
        { actorId: req.user?.sub, roles: actorRoles },
        params,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:id/media',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  validate(createTrailMediaSchema),
  async (req, res, next) => {
    try {
      const params = req.params as unknown as CreateTrailMediaParams;
      const body = req.body as CreateTrailMediaBody;
      const actorRoles = extractRoles(req.user?.roles);

      const upload = await adminMediaService.createTrailMediaUpload(
        { actorId: req.user?.sub, roles: actorRoles },
        params.id,
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(201).json(upload);
    } catch (error) {
      next(error);
    }
  },
);

export const adminTrailsRouter = router;
