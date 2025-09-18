import bcrypt from 'bcrypt';
import type { Request } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';

import { authenticate } from '../../middlewares/auth';
import { HttpError } from '../../middlewares/error';
import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import { prisma } from '../../services/prisma';
import { audit } from '../audit/audit.service';
import { geoAdminRouter } from '../geo/geo.routes';
import { type AdminRole, createAdminUserSchema, deleteAdminUserSchema, updateAdminUserSchema } from './admin.schemas';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate());
router.use(geoAdminRouter);

const toUserSummary = (user: { id: string; email: string; name: string | null; role: string }) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

const hashPassword = (password: string) => bcrypt.hash(password, 10);

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

router.post(
  '/users',
  requireRole('ADMIN'),
  validate(createAdminUserSchema),
  async (req, res, next) => {
    const { email, password, name, role } = req.body as {
      email: string;
      password: string;
      name?: string;
      role: AdminRole;
    };

    try {
      const passwordHash = await hashPassword(password);

      const createdUser = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: name ?? null,
          role,
        },
      });

      await audit({
        userId: req.user?.sub,
        entity: 'user',
        entityId: createdUser.id,
        action: 'CREATE',
        diff: {
          created: {
            id: createdUser.id,
            email: createdUser.email,
            name: createdUser.name,
            role: createdUser.role,
          },
        },
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({ user: toUserSummary(createdUser) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        next(new HttpError(409, 'USER_ALREADY_EXISTS', 'User with this email already exists'));
        return;
      }

      next(error);
    }
  },
);

router.put(
  '/users/:id',
  requireRole('ADMIN', 'EDITOR', 'GUIA'),
  validate(updateAdminUserSchema),
  async (req, res, next) => {
    const { id } = req.params as { id: string };
    const { name, role, password } = req.body as {
      name?: string;
      role?: AdminRole;
      password?: string;
    };

    try {
      const existingUser = await prisma.user.findUnique({ where: { id } });

      if (!existingUser) {
        next(new HttpError(404, 'USER_NOT_FOUND', 'User not found'));
        return;
      }

      const actorId = req.user?.sub;
      const actorRoles = new Set((req.user?.roles ?? []).map((value) => value.toUpperCase()));
      const isAdminOrEditor = actorRoles.has('ADMIN') || actorRoles.has('EDITOR');
      const isGuide = actorRoles.has('GUIA');
      const isSelfUpdate = actorId === existingUser.id;

      if (!isAdminOrEditor && !isSelfUpdate) {
        next(new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role'));
        return;
      }

      if (role && !isAdminOrEditor) {
        next(new HttpError(403, 'ROLE_CHANGE_NOT_ALLOWED', 'Role updates require elevated permissions'));
        return;
      }

      if (password && !isAdminOrEditor && !isGuide) {
        next(new HttpError(403, 'PASSWORD_CHANGE_NOT_ALLOWED', 'Password updates require elevated permissions'));
        return;
      }

      const data: Record<string, unknown> = {};

      if (typeof name === 'string') {
        data.name = name;
      }
      if (typeof role === 'string') {
        data.role = role;
      }
      let passwordChanged = false;

      if (typeof password === 'string') {
        data.passwordHash = await hashPassword(password);
        passwordChanged = true;
      }

      if (Object.keys(data).length === 0) {
        next(new HttpError(400, 'NO_UPDATES_PROVIDED', 'No updates provided'));
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data,
      });

      await audit({
        userId: req.user?.sub,
        entity: 'user',
        entityId: id,
        action: 'UPDATE',
        diff: {
          before: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            role: existingUser.role,
          },
          after: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
          },
          ...(passwordChanged ? { passwordChanged: true } : {}),
        },
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json({ user: toUserSummary(updatedUser) });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/users/:id',
  requireRole('ADMIN'),
  validate(deleteAdminUserSchema),
  async (req, res, next) => {
    const { id } = req.params as { id: string };

    try {
      const existingUser = await prisma.user.findUnique({ where: { id } });

      if (!existingUser) {
        next(new HttpError(404, 'USER_NOT_FOUND', 'User not found'));
        return;
      }

      await prisma.user.delete({ where: { id } });

      await audit({
        userId: req.user?.sub,
        entity: 'user',
        entityId: id,
        action: 'DELETE',
        diff: {
          deleted: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            role: existingUser.role,
          },
        },
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

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
