import type { Request } from 'express';
import { Router } from 'express';
import multer from 'multer';

import { authenticate } from '../../middlewares/auth';
import { HttpError } from '../../middlewares/error';
import { requireRole } from '../../middlewares/rbac';
import { audit } from '../audit/audit.service';
import { adminGuidesRouter } from '../guides/admin-guides.routes';
import { adminCitiesRouter } from '../geo/admin-cities.routes';
import { adminParksRouter } from '../geo/admin-parks.routes';
import { adminStatesRouter } from '../geo/admin-states.routes';
import { adminUsersRouter } from '../users/admin-users.routes';
import { adminTrailsRouter } from '../trails/admin-trails.routes';
import { adminMediaRouter } from '../media/admin-media.routes';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate());

const parseBooleanFlag = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value === '1' || value.toLowerCase() === 'true';
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return false;
};

router.use('/users', adminUsersRouter);
router.use('/guides', adminGuidesRouter);
router.use('/states', adminStatesRouter);
router.use('/cities', adminCitiesRouter);
router.use('/parks', adminParksRouter);
router.use('/trails', adminTrailsRouter);
router.use('/media', adminMediaRouter);

router.post(
  '/cadastur/import',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  upload.single('file'),
  async (req: Request, res, next) => {
    try {
      const file = req.file;

      if (!file) {
        next(new HttpError(400, 'FILE_REQUIRED', 'Import file is required'));
        return;
      }

      const replaceBase = parseBooleanFlag(req.body?.replaceBase);
      const softDelete = parseBooleanFlag(req.body?.softDelete);

      await audit({
        userId: req.user?.sub,
        entity: 'cadastur',
        entityId: undefined,
        action: 'IMPORT',
        diff: {
          fileName: file.originalname,
          fileSize: file.size,
          replaceBase,
          softDelete,
        },
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(202).json({
        message: 'Importação recebida',
        fileName: file.originalname,
        size: file.size,
      });
    } catch (error) {
      next(error);
    }
  },
);

export const adminRouter = router;
