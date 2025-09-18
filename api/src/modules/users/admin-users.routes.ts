import { UserStatus } from '@prisma/client';
import { Router } from 'express';

import { HttpError } from '../../middlewares/error';
import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import {
  createAdminUserSchema,
  deleteAdminUserSchema,
  getAdminUserSchema,
  listAdminUsersSchema,
  type CreateAdminUserBody,
  type DeleteAdminUserParams,
  type GetAdminUserParams,
  type ListAdminUsersQuery,
  type UpdateAdminUserBody,
  type UpdateAdminUserParams,
  updateAdminUserSchema,
} from './user.schemas';
import { adminUserService } from './user.service';

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
  validate(listAdminUsersSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListAdminUsersQuery;
      const result = await adminUserService.listUsers({
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        role: query.role,
        status: query.status ? (query.status as UserStatus) : undefined,
        sort: query.sort,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/',
  requireRole('ADMIN'),
  validate(createAdminUserSchema),
  async (req, res, next) => {
    try {
      const body = req.body as CreateAdminUserBody;
      const actorRoles = getActorRoles(req.user?.roles);
      const user = await adminUserService.createUser(
        { actorId: req.user?.sub, roles: actorRoles },
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/:id',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR', 'GUIA'),
  validate(getAdminUserSchema),
  async (req, res, next) => {
    try {
      const params = req.params as GetAdminUserParams;
      const actorRoles = getActorRoles(req.user?.roles);
      const normalizedRoles = new Set(actorRoles.map((role) => role.toUpperCase()));
      const isPrivileged =
        normalizedRoles.has('ADMIN') ||
        normalizedRoles.has('EDITOR') ||
        normalizedRoles.has('OPERADOR');
      const isSelf = req.user?.sub === params.id;

      if (!isPrivileged && !isSelf) {
        throw new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role');
      }

      const user = await adminUserService.getUserById(params.id);

      if (!user) {
        throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
      }

      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'EDITOR', 'GUIA'),
  validate(updateAdminUserSchema),
  async (req, res, next) => {
    try {
      const params = req.params as UpdateAdminUserParams;
      const body = req.body as UpdateAdminUserBody;
      const actorRoles = getActorRoles(req.user?.roles);
      const updateData = {
        ...body,
        status: body.status ? (body.status as UserStatus) : undefined,
      } satisfies UpdateAdminUserBody & { status?: UserStatus };

      const user = await adminUserService.updateUser(
        { actorId: req.user?.sub, roles: actorRoles },
        params.id,
        updateData,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/:id',
  requireRole('ADMIN'),
  validate(deleteAdminUserSchema),
  async (req, res, next) => {
    try {
      const params = req.params as DeleteAdminUserParams;
      const actorRoles = getActorRoles(req.user?.roles);

      await adminUserService.softDeleteUser(
        { actorId: req.user?.sub, roles: actorRoles },
        params.id,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export const adminUsersRouter = router;

