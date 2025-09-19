import { GuideVerificationStatus } from '@prisma/client';
import { Router } from 'express';
import multer from 'multer';

import { HttpError } from '../../middlewares/error';
import { rateLimit } from '../../middlewares/rate-limit';
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
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const importCadasturRateLimiter = rateLimit({ windowMs: 5 * 60_000, max: 5 });

const getActorRoles = (roles: unknown): string[] => {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map((role) => (typeof role === 'string' ? role.trim() : ''))
    .filter((role) => role.length > 0);
};

const parseBooleanFlag = (value: unknown): boolean => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return false;
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

router.post(
  '/import-cadastur',
  importCadasturRateLimiter,
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const file = req.file;

      if (!file) {
        throw new HttpError(400, 'FILE_REQUIRED', 'Arquivo CSV é obrigatório');
      }

      const confirm = parseBooleanFlag(req.body?.confirm);

      if (confirm) {
        const actorRoles = getActorRoles(req.user?.roles);
        const result = await adminGuideService.importCadasturFromCsv(
          { actorId: req.user?.sub, roles: actorRoles },
          file.buffer,
          file.originalname,
          { ip: req.ip, userAgent: req.get('user-agent') },
        );

        res.status(200).json(result);
        return;
      }

      const preview = await adminGuideService.previewCadasturImport(file.buffer);

      res.status(200).json(preview);
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

