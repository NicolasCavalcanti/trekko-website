import { Router } from 'express';

import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import { adminMediaService } from './media.service';
import { deleteMediaSchema, type DeleteMediaParams } from './media.schemas';

const router = Router();

const extractRoles = (roles: unknown): string[] => {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map((role) => (typeof role === 'string' ? role.trim() : ''))
    .filter((role) => role.length > 0);
};

router.delete(
  '/:mediaId',
  requireRole('ADMIN', 'EDITOR'),
  validate(deleteMediaSchema),
  async (req, res, next) => {
    try {
      const params = req.params as unknown as DeleteMediaParams;
      const actorRoles = extractRoles(req.user?.roles);

      await adminMediaService.deleteMedia(
        { actorId: req.user?.sub, roles: actorRoles },
        params.mediaId,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export const adminMediaRouter = router;
