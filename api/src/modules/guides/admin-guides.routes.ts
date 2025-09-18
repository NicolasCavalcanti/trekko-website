import { GuideVerificationStatus } from '@prisma/client';
import { Router } from 'express';

import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import { adminGuideService } from './guide.service';
import {
  listAdminGuidesSchema,
  type ListAdminGuidesQuery,
  type VerifyGuideBody,
  type VerifyGuideParams,
  verifyGuideSchema,
} from './guide.schemas';

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
  validate(listAdminGuidesSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListAdminGuidesQuery;
      const result = await adminGuideService.listGuides({
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        verification: query.verification,
        sort: query.sort,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/:id/verify',
  requireRole('ADMIN', 'EDITOR'),
  validate(verifyGuideSchema),
  async (req, res, next) => {
    try {
      const params = req.params as VerifyGuideParams;
      const body = req.body as VerifyGuideBody;
      const actorRoles = getActorRoles(req.user?.roles);
      const guide = await adminGuideService.verifyGuide(
        { actorId: req.user?.sub, roles: actorRoles },
        params.id,
        body.status as GuideVerificationStatus,
        body.notes,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(200).json({ guide });
    } catch (error) {
      next(error);
    }
  },
);

export const adminGuidesRouter = router;

