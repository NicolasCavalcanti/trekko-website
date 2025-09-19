import type { Request } from 'express';
import { Router } from 'express';

import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import type { ActorContext } from '../users/user.service';
import {
  deleteAdminReviewSchema,
  listAdminReviewsSchema,
  type DeleteAdminReviewParams,
  type ListAdminReviewsQuery,
} from './review.schemas';
import { adminReviewService } from './review.service';

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
  validate(listAdminReviewsSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListAdminReviewsQuery;
      const result = await adminReviewService.listReviews(query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/:id',
  requireRole('ADMIN', 'EDITOR'),
  validate(deleteAdminReviewSchema),
  async (req: Request, res, next) => {
    try {
      const params = req.params as unknown as DeleteAdminReviewParams;
      const actorRoles = extractRoles(req.user?.roles);
      const actor: ActorContext = { actorId: req.user?.sub, roles: actorRoles };

      await adminReviewService.deleteReview(actor, params.id, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export const adminReviewsRouter = router;
