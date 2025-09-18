import { Prisma, type GuideProfile, type User, UserStatus, GuideVerificationStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

import { HttpError } from '../../middlewares/error';
import { prisma, type PrismaClientInstance } from '../../services/prisma';
import { audit } from '../audit/audit.service';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const SORT_FIELD_MAP = new Map<string, keyof User>([
  ['createdat', 'createdAt'],
  ['updatedat', 'updatedAt'],
  ['name', 'name'],
  ['email', 'email'],
  ['role', 'role'],
  ['status', 'status'],
]);

export type ActorContext = {
  actorId?: string | null;
  roles: string[];
};

export type RequestContext = {
  ip?: string | null;
  userAgent?: string | null;
};

export type ListUsersParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  status?: UserStatus;
  sort?: string;
};

export type CreateUserInput = {
  email: string;
  password: string;
  name?: string | null;
  role: string;
};

export type UpdateUserInput = {
  name?: string;
  role?: string;
  password?: string;
  status?: UserStatus;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type UserSummary = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type GuideProfileSummary = {
  id: string;
  displayName: string | null;
  bio: string | null;
  experienceYears: number | null;
  languages: string[];
  serviceAreas: string[];
  cadasturNumber: string | null;
  verificationStatus: GuideVerificationStatus;
  verificationNotes: string | null;
  verificationReviewedAt: string | null;
  verificationReviewedById: string | null;
  verifiedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserDetail = UserSummary & {
  guideProfile: GuideProfileSummary | null;
};

const normalizeSort = (input?: string): Prisma.UserOrderByWithRelationInput => {
  const defaultOrder: Prisma.UserOrderByWithRelationInput = { createdAt: 'desc' };

  if (!input || input.trim().length === 0) {
    return defaultOrder;
  }

  const [first] = input.split(',');
  const trimmed = first.trim();

  if (trimmed.length === 0) {
    return defaultOrder;
  }

  let direction: Prisma.SortOrder = 'asc';
  let fieldName = trimmed;

  if (fieldName.startsWith('-')) {
    direction = 'desc';
    fieldName = fieldName.slice(1);
  } else if (fieldName.startsWith('+')) {
    fieldName = fieldName.slice(1);
  }

  const normalizedKey = fieldName.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
  const mappedField = SORT_FIELD_MAP.get(normalizedKey);

  if (!mappedField) {
    throw new HttpError(400, 'INVALID_SORT', `Cannot sort by "${fieldName}"`);
  }

  return { [mappedField]: direction } as Prisma.UserOrderByWithRelationInput;
};

const buildPaginationMeta = (totalItems: number, page: number, pageSize: number): PaginationMeta => {
  const totalPages = pageSize === 0 ? 0 : Math.ceil(totalItems / pageSize);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

const toUserSummary = (user: User): UserSummary => ({
  id: user.id,
  email: user.email,
  name: user.name ?? null,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
  deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
});

const toGuideProfileSummary = (profile: GuideProfile): GuideProfileSummary => ({
  id: profile.id,
  displayName: profile.displayName ?? null,
  bio: profile.bio ?? null,
  experienceYears: profile.experienceYears ?? null,
  languages: profile.languages ?? [],
  serviceAreas: profile.serviceAreas ?? [],
  cadasturNumber: profile.cadasturNumber ?? null,
  verificationStatus: profile.verificationStatus,
  verificationNotes: profile.verificationNotes ?? null,
  verificationReviewedAt: profile.verificationReviewedAt
    ? profile.verificationReviewedAt.toISOString()
    : null,
  verificationReviewedById: profile.verificationReviewedById ?? null,
  verifiedAt: profile.verifiedAt ? profile.verifiedAt.toISOString() : null,
  rejectedAt: profile.rejectedAt ? profile.rejectedAt.toISOString() : null,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
});

const toUserDetail = (user: User & { guideProfile: GuideProfile | null }): UserDetail => ({
  ...toUserSummary(user),
  guideProfile: user.guideProfile ? toGuideProfileSummary(user.guideProfile) : null,
});

const hashPassword = (password: string) => bcrypt.hash(password, 10);

const normalizeRoles = (roles: string[]): Set<string> => {
  return new Set(roles.map((role) => role.trim().toUpperCase()).filter((role) => role.length > 0));
};

export class AdminUserService {
  constructor(private readonly prismaClient: PrismaClientInstance = prisma) {}

  async listUsers(params: ListUsersParams): Promise<{ users: UserSummary[]; pagination: PaginationMeta }> {
    const page = Math.max(1, params.page ?? 1);
    const rawPageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const pageSize = Math.max(1, Math.min(rawPageSize, MAX_PAGE_SIZE));
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {};

    if (params.status) {
      where.status = params.status;
      if (params.status !== UserStatus.INACTIVE) {
        where.deletedAt = null;
      }
    } else {
      where.deletedAt = null;
    }

    if (params.role) {
      where.role = params.role;
    }

    const search = params.search?.trim();

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = normalizeSort(params.sort);

    const [totalItems, users] = await Promise.all([
      this.prismaClient.user.count({ where }),
      this.prismaClient.user.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);

    return {
      users: users.map(toUserSummary),
      pagination: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  async getUserById(id: string): Promise<UserDetail | null> {
    const user = await this.prismaClient.user.findUnique({
      where: { id },
      include: { guideProfile: true },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    return toUserDetail(user);
  }

  async createUser(
    actor: ActorContext,
    input: CreateUserInput,
    context: RequestContext,
  ): Promise<UserSummary> {
    try {
      const passwordHash = await hashPassword(input.password);

      const createdUser = await this.prismaClient.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name ?? null,
          role: input.role,
        },
      });

      await audit({
        userId: actor.actorId,
        entity: 'user',
        entityId: createdUser.id,
        action: 'CREATE',
        diff: {
          created: toUserSummary(createdUser),
        },
        ip: context.ip,
        userAgent: context.userAgent,
      });

      return toUserSummary(createdUser);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new HttpError(409, 'USER_ALREADY_EXISTS', 'User with this email already exists');
      }

      throw error;
    }
  }

  async updateUser(
    actor: ActorContext,
    id: string,
    input: UpdateUserInput,
    context: RequestContext,
  ): Promise<UserSummary> {
    const existingUser = await this.prismaClient.user.findUnique({
      where: { id },
      include: { guideProfile: true },
    });

    if (!existingUser || existingUser.deletedAt) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const actorRoles = normalizeRoles(actor.roles);
    const isAdminOrEditor = actorRoles.has('ADMIN') || actorRoles.has('EDITOR');
    const isGuide = actorRoles.has('GUIA');
    const isSelfUpdate = actor.actorId && actor.actorId === existingUser.id;

    if (!isAdminOrEditor && !isSelfUpdate) {
      throw new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role');
    }

    if (input.role && !isAdminOrEditor) {
      throw new HttpError(403, 'ROLE_CHANGE_NOT_ALLOWED', 'Role updates require elevated permissions');
    }

    if (input.status && !isAdminOrEditor) {
      throw new HttpError(403, 'STATUS_CHANGE_NOT_ALLOWED', 'Status updates require elevated permissions');
    }

    if (input.password && !isAdminOrEditor && !(isGuide && isSelfUpdate)) {
      throw new HttpError(403, 'PASSWORD_CHANGE_NOT_ALLOWED', 'Password updates require elevated permissions');
    }

    const data: Prisma.UserUpdateInput = {};
    let passwordChanged = false;
    let statusChanged = false;

    if (typeof input.name === 'string') {
      data.name = input.name;
    }

    if (typeof input.role === 'string') {
      data.role = input.role;
    }

    if (input.password) {
      data.passwordHash = await hashPassword(input.password);
      passwordChanged = true;
    }

    if (input.status) {
      data.status = input.status;
      statusChanged = input.status !== existingUser.status;

      if (input.status === UserStatus.INACTIVE) {
        data.deletedAt = existingUser.deletedAt ?? new Date();
      }

      if (input.status === UserStatus.ACTIVE) {
        data.deletedAt = null;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new HttpError(400, 'NO_UPDATES_PROVIDED', 'No updates provided');
    }

    const updatedUser = await this.prismaClient.user.update({
      where: { id },
      data,
    });

    if (statusChanged && existingUser.guideProfile) {
      const now = new Date();
      if (input.status === UserStatus.INACTIVE) {
        await this.prismaClient.guideProfile.update({
          where: { id: existingUser.guideProfile.id },
          data: {
            deletedAt: existingUser.guideProfile.deletedAt ?? now,
            verificationStatus: GuideVerificationStatus.REJECTED,
            verificationNotes:
              existingUser.guideProfile.verificationNotes ??
              'Perfil de guia desativado juntamente com o usuário.',
            verificationReviewedAt: now,
            verificationReviewedById: actor.actorId ?? null,
            rejectedAt: now,
            verifiedAt: null,
          },
        });
      }

      if (input.status === UserStatus.ACTIVE) {
        await this.prismaClient.guideProfile.update({
          where: { id: existingUser.guideProfile.id },
          data: {
            deletedAt: null,
            verificationStatus: GuideVerificationStatus.PENDING,
            verificationNotes: 'Perfil reativado e aguardando nova verificação.',
            verificationReviewedAt: now,
            verificationReviewedById: actor.actorId ?? null,
            rejectedAt: null,
            verifiedAt: null,
          },
        });
      }
    }

    await audit({
      userId: actor.actorId,
      entity: 'user',
      entityId: id,
      action: 'UPDATE',
      diff: {
        before: toUserSummary(existingUser),
        after: toUserSummary(updatedUser),
        ...(passwordChanged ? { passwordChanged: true } : {}),
      },
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return toUserSummary(updatedUser);
  }

  async softDeleteUser(actor: ActorContext, id: string, context: RequestContext): Promise<void> {
    const existingUser = await this.prismaClient.user.findUnique({
      where: { id },
      include: { guideProfile: true },
    });

    if (!existingUser || existingUser.deletedAt) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (actor.actorId && actor.actorId === id) {
      throw new HttpError(400, 'CANNOT_DEACTIVATE_SELF', 'Users cannot deactivate themselves');
    }

    const now = new Date();

    await this.prismaClient.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          status: UserStatus.INACTIVE,
          deletedAt: now,
        },
      });

      if (existingUser.guideProfile) {
        await tx.guideProfile.update({
          where: { id: existingUser.guideProfile.id },
          data: {
            deletedAt: existingUser.guideProfile.deletedAt ?? now,
            verificationStatus: GuideVerificationStatus.REJECTED,
            verificationNotes: 'Perfil de guia desativado juntamente com o usuário.',
            verificationReviewedAt: now,
            verificationReviewedById: actor.actorId ?? null,
            rejectedAt: now,
            verifiedAt: null,
          },
        });
      }
    });

    const deletedSummary: UserSummary = {
      ...toUserSummary(existingUser),
      status: UserStatus.INACTIVE,
      deletedAt: now.toISOString(),
    };

    await audit({
      userId: actor.actorId,
      entity: 'user',
      entityId: id,
      action: 'DELETE',
      diff: {
        deleted: deletedSummary,
      },
      ip: context.ip,
      userAgent: context.userAgent,
    });
  }
}

export const adminUserService = new AdminUserService();

