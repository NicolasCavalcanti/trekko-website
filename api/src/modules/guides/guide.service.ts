import { Prisma, type GuideProfile, type User, GuideVerificationStatus } from '@prisma/client';

import type { ActorContext, PaginationMeta, RequestContext, UserSummary } from '../users/user.service';
import { HttpError } from '../../middlewares/error';
import { prisma, type PrismaClientInstance } from '../../services/prisma';
import { audit } from '../audit/audit.service';
import { GUIDE_VERIFICATION_STATUS_VALUES } from './guide.schemas';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const GUIDE_SORT_FIELD_MAP = new Map<
  string,
  (direction: Prisma.SortOrder) => Prisma.GuideProfileOrderByWithRelationInput
>([
  ['createdat', (direction) => ({ createdAt: direction })],
  ['updatedat', (direction) => ({ updatedAt: direction })],
  ['displayname', (direction) => ({ displayName: direction })],
  ['verificationstatus', (direction) => ({ verificationStatus: direction })],
  ['verifiedat', (direction) => ({ verifiedAt: direction })],
  ['rejectedat', (direction) => ({ rejectedAt: direction })],
  ['cadasturnumber', (direction) => ({ cadasturNumber: direction })],
]);

const GUIDE_STATUS_SET = new Set(GUIDE_VERIFICATION_STATUS_VALUES);

export type GuideListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  verification?: string | string[];
  sort?: string;
};

export type GuideListItem = {
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
  user: UserSummary;
};

export type GuideListResult = {
  guides: GuideListItem[];
  pagination: PaginationMeta;
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

const normalizeSort = (input?: string): Prisma.GuideProfileOrderByWithRelationInput => {
  const defaultOrder: Prisma.GuideProfileOrderByWithRelationInput = { createdAt: 'desc' };

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
  const builder = GUIDE_SORT_FIELD_MAP.get(normalizedKey);

  if (!builder) {
    throw new HttpError(400, 'INVALID_SORT', `Cannot sort by "${fieldName}"`);
  }

  return builder(direction);
};

const parseVerificationFilter = (
  value?: string | string[],
): GuideVerificationStatus[] | undefined => {
  if (!value) {
    return undefined;
  }

  const values = Array.isArray(value) ? value : value.split(',');
  const normalized = values
    .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
    .filter((item) => item.length > 0);

  if (normalized.length === 0) {
    return undefined;
  }

  const result: GuideVerificationStatus[] = [];

  for (const status of normalized) {
    if (!GUIDE_STATUS_SET.has(status as GuideVerificationStatus)) {
      throw new HttpError(400, 'INVALID_VERIFICATION_STATUS', `Invalid verification status "${status}"`);
    }

    if (!result.includes(status as GuideVerificationStatus)) {
      result.push(status as GuideVerificationStatus);
    }
  }

  return result;
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

const toGuideListItem = (guide: GuideProfile & { user: User }): GuideListItem => ({
  id: guide.id,
  displayName: guide.displayName ?? null,
  bio: guide.bio ?? null,
  experienceYears: guide.experienceYears ?? null,
  languages: guide.languages ?? [],
  serviceAreas: guide.serviceAreas ?? [],
  cadasturNumber: guide.cadasturNumber ?? null,
  verificationStatus: guide.verificationStatus,
  verificationNotes: guide.verificationNotes ?? null,
  verificationReviewedAt: guide.verificationReviewedAt
    ? guide.verificationReviewedAt.toISOString()
    : null,
  verificationReviewedById: guide.verificationReviewedById ?? null,
  verifiedAt: guide.verifiedAt ? guide.verifiedAt.toISOString() : null,
  rejectedAt: guide.rejectedAt ? guide.rejectedAt.toISOString() : null,
  createdAt: guide.createdAt.toISOString(),
  updatedAt: guide.updatedAt.toISOString(),
  user: toUserSummary(guide.user),
});

export class AdminGuideService {
  constructor(private readonly prismaClient: PrismaClientInstance = prisma) {}

  async listGuides(params: GuideListParams): Promise<GuideListResult> {
    const page = Math.max(1, params.page ?? 1);
    const rawPageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const pageSize = Math.max(1, Math.min(rawPageSize, MAX_PAGE_SIZE));
    const skip = (page - 1) * pageSize;

    const where: Prisma.GuideProfileWhereInput = {
      deletedAt: null,
      user: { deletedAt: null },
    };

    const verificationStatuses = parseVerificationFilter(params.verification);
    if (verificationStatuses && verificationStatuses.length > 0) {
      where.verificationStatus = { in: verificationStatuses };
    }

    const search = params.search?.trim();
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
        { cadasturNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy = normalizeSort(params.sort);

    const [totalItems, guides] = await Promise.all([
      this.prismaClient.guideProfile.count({ where }),
      this.prismaClient.guideProfile.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: { user: true },
      }),
    ]);

    return {
      guides: guides.map(toGuideListItem),
      pagination: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  async verifyGuide(
    actor: ActorContext,
    guideId: string,
    status: GuideVerificationStatus,
    notes: string | undefined,
    context: RequestContext,
  ): Promise<GuideListItem> {
    const existingGuide = await this.prismaClient.guideProfile.findUnique({
      where: { id: guideId },
      include: { user: true },
    });

    if (!existingGuide || existingGuide.deletedAt || existingGuide.user.deletedAt) {
      throw new HttpError(404, 'GUIDE_NOT_FOUND', 'Guide profile not found');
    }

    const now = new Date();

    const data: Prisma.GuideProfileUpdateInput = {
      verificationStatus: status,
      verificationReviewedAt: now,
      verificationReviewedById: actor.actorId ?? existingGuide.verificationReviewedById ?? null,
      verificationNotes: notes ?? existingGuide.verificationNotes ?? null,
    };

    if (status === GuideVerificationStatus.VERIFIED) {
      data.verifiedAt = now;
      data.rejectedAt = null;
      data.deletedAt = null;
    }

    if (status === GuideVerificationStatus.REJECTED) {
      data.rejectedAt = now;
      data.verifiedAt = null;
    }

    const updatedGuide = await this.prismaClient.guideProfile.update({
      where: { id: guideId },
      data,
      include: { user: true },
    });

    await audit({
      userId: actor.actorId,
      entity: 'guideProfile',
      entityId: guideId,
      action: 'VERIFY',
      diff: {
        before: toGuideListItem(existingGuide),
        after: toGuideListItem(updatedGuide),
      },
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return toGuideListItem(updatedGuide);
  }
}

export const adminGuideService = new AdminGuideService();

