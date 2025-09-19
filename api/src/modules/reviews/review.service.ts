import {
  Prisma,
  ReviewStatus,
  type Expedition,
  type GuideProfile,
  type Reservation,
  type Review,
  type Trail,
  type User,
} from '@prisma/client';

import { HttpError } from '../../middlewares/error';
import { prisma, type PrismaClientInstance } from '../../services/prisma';
import { audit } from '../audit/audit.service';
import type { ActorContext, PaginationMeta, RequestContext } from '../users/user.service';
import { reviewStatusValues, type ListAdminReviewsQuery } from './review.schemas';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const REVIEW_SORT_FIELD_MAP = new Map<
  string,
  (direction: Prisma.SortOrder) => Prisma.ReviewOrderByWithRelationInput
>([
  ['createdat', (direction) => ({ createdAt: direction })],
  ['updatedat', (direction) => ({ updatedAt: direction })],
  ['rating', (direction) => ({ rating: direction })],
  ['publishedat', (direction) => ({ publishedAt: direction })],
]);

const VALID_REVIEW_STATUSES = new Set<ReviewStatus>(reviewStatusValues as ReviewStatus[]);

type ReviewListRecord = Review & {
  user: Pick<User, 'id' | 'name' | 'email'>;
  guide: Pick<GuideProfile, 'id' | 'displayName'> | null;
  trail: Pick<Trail, 'id' | 'name'> | null;
  expedition: Pick<Expedition, 'id' | 'title' | 'startDate' | 'endDate'> | null;
  reservation: Pick<Reservation, 'id' | 'code'> | null;
  responseBy: Pick<User, 'id' | 'name' | 'email'> | null;
};

export type ReviewSummary = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: ReviewStatus;
  response: string | null;
  respondedAt: string | null;
  responseBy: { id: string; name: string | null; email: string | null } | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reservation: { id: string; code: string | null } | null;
  expedition:
    | { id: string; title: string; startDate: string; endDate: string }
    | null;
  trail: { id: string; name: string } | null;
  guide: { id: string; displayName: string | null } | null;
  author: { id: string; name: string | null; email: string };
};

export type ReviewListResult = {
  reviews: ReviewSummary[];
  pagination: PaginationMeta;
};

const buildPaginationMeta = (
  totalItems: number,
  page: number,
  pageSize: number,
): PaginationMeta => {
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

const normalizeSort = (input?: string): Prisma.ReviewOrderByWithRelationInput[] => {
  const defaultOrder: Prisma.ReviewOrderByWithRelationInput = { createdAt: 'desc' };

  if (!input || input.trim().length === 0) {
    return [defaultOrder, { id: 'asc' }];
  }

  const segments = input
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  const orders: Prisma.ReviewOrderByWithRelationInput[] = [];

  for (const segment of segments) {
    let direction: Prisma.SortOrder = 'asc';
    let key = segment;

    if (segment.startsWith('-')) {
      direction = 'desc';
      key = segment.slice(1);
    } else if (segment.startsWith('+')) {
      key = segment.slice(1);
    }

    const normalizedKey = key.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    const builder = REVIEW_SORT_FIELD_MAP.get(normalizedKey);

    if (builder) {
      orders.push(builder(direction));
    }
  }

  if (orders.length === 0) {
    return [defaultOrder, { id: 'asc' }];
  }

  const hasCreatedAt = orders.some((order) => 'createdAt' in order);

  if (!hasCreatedAt) {
    orders.push(defaultOrder);
  }

  orders.push({ id: 'asc' });

  return orders;
};

const normalizeStatusFilter = (
  status: string[] | undefined,
): ReviewStatus[] | undefined => {
  if (!status || status.length === 0) {
    return undefined;
  }

  const normalized: ReviewStatus[] = [];

  for (const raw of status) {
    const upper = raw.trim().toUpperCase();
    if (!upper) {
      continue;
    }

    const candidate = upper as ReviewStatus;

    if (!VALID_REVIEW_STATUSES.has(candidate)) {
      throw new HttpError(400, 'INVALID_STATUS', `Invalid review status: ${raw}`);
    }

    normalized.push(candidate);
  }

  return normalized.length > 0 ? normalized : undefined;
};

const normalizeSearch = (input?: string): string | undefined => {
  if (!input) {
    return undefined;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeRoles = (roles: string[]): Set<string> => {
  return new Set(roles.map((role) => role.trim().toUpperCase()).filter((role) => role.length > 0));
};

const toReviewSummary = (review: ReviewListRecord): ReviewSummary => {
  return {
    id: review.id,
    rating: review.rating,
    title: review.title ?? null,
    comment: review.comment ?? null,
    status: review.status,
    response: review.response ?? null,
    respondedAt: review.respondedAt ? review.respondedAt.toISOString() : null,
    responseBy: review.responseBy
      ? {
          id: review.responseBy.id,
          name: review.responseBy.name ?? null,
          email: review.responseBy.email ?? null,
        }
      : null,
    publishedAt: review.publishedAt ? review.publishedAt.toISOString() : null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    reservation: review.reservation
      ? { id: review.reservation.id, code: review.reservation.code ?? null }
      : null,
    expedition: review.expedition
      ? {
          id: review.expedition.id,
          title: review.expedition.title,
          startDate: review.expedition.startDate.toISOString(),
          endDate: review.expedition.endDate.toISOString(),
        }
      : null,
    trail: review.trail ? { id: review.trail.id, name: review.trail.name } : null,
    guide: review.guide ? { id: review.guide.id, displayName: review.guide.displayName ?? null } : null,
    author: {
      id: review.user.id,
      name: review.user.name ?? null,
      email: review.user.email,
    },
  };
};

class AdminReviewService {
  constructor(private readonly prismaClient: PrismaClientInstance = prisma) {}

  async listReviews(query: ListAdminReviewsQuery): Promise<ReviewListResult> {
    const page = query.page && Number.isFinite(query.page) ? query.page : 1;
    const pageSize = query.pageSize
      ? Math.min(Math.max(query.pageSize, 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    const statusFilter = normalizeStatusFilter(query.status);
    const search = normalizeSearch(query.search);
    const orderBy = normalizeSort(query.sort);

    const andConditions: Prisma.ReviewWhereInput[] = [{ deletedAt: null }];

    if (query.guideId) {
      andConditions.push({ guideId: query.guideId });
    }

    if (query.trailId) {
      andConditions.push({ trailId: query.trailId });
    }

    if (query.expeditionId) {
      andConditions.push({ expeditionId: query.expeditionId });
    }

    if (query.reservationId) {
      andConditions.push({ reservationId: query.reservationId });
    }

    if (typeof query.rating === 'number') {
      andConditions.push({ rating: query.rating });
    }

    if (statusFilter) {
      andConditions.push({ status: { in: statusFilter } });
    }

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { comment: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const where: Prisma.ReviewWhereInput = andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    const [reviews, totalItems] = await Promise.all([
      this.prismaClient.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          guide: { select: { id: true, displayName: true } },
          trail: { select: { id: true, name: true } },
          expedition: { select: { id: true, title: true, startDate: true, endDate: true } },
          reservation: { select: { id: true, code: true } },
          responseBy: { select: { id: true, name: true, email: true } },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prismaClient.review.count({ where }),
    ]);

    const summaries = reviews.map(toReviewSummary);
    const pagination = buildPaginationMeta(totalItems, page, pageSize);

    return { reviews: summaries, pagination };
  }

  async deleteReview(actor: ActorContext, reviewId: string, context: RequestContext): Promise<void> {
    const roles = normalizeRoles(actor.roles);

    if (!(roles.has('ADMIN') || roles.has('EDITOR'))) {
      throw new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role');
    }

    const now = new Date();

    const existing = await this.prismaClient.review.findFirst({
      where: { id: reviewId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new HttpError(404, 'REVIEW_NOT_FOUND', 'Review not found');
    }

    await this.prismaClient.review.update({
      where: { id: reviewId },
      data: { deletedAt: now, status: ReviewStatus.REJECTED },
    });

    await audit({
      userId: actor.actorId,
      entity: 'review',
      entityId: reviewId,
      action: 'REVIEW_DELETE',
      diff: { reviewId, previousStatus: existing.status },
      ip: context.ip,
      userAgent: context.userAgent,
    });
  }
}

export const adminReviewService = new AdminReviewService();
