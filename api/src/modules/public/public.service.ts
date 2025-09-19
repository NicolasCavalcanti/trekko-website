import {
  Prisma,
  ReviewStatus,
  ReservationStatus,
  ExpeditionStatus,
  type City,
  type Expedition,
  type GuideProfile,
  type State,
  type Trail,
} from '@prisma/client';

import { prisma, type PrismaClientInstance } from '../../services/prisma';
import type { PaginationMeta } from '../users/user.service';
import {
  type ListPublicCitiesQuery,
  type ListPublicExpeditionsQuery,
  type ListPublicTrailsQuery,
} from './public.schemas';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

const CITY_SORT_FIELD_MAP = new Map<
  string,
  (direction: Prisma.SortOrder) => Prisma.CityOrderByWithRelationInput
>([
  ['name', (direction) => ({ name: direction })],
  ['createdat', (direction) => ({ createdAt: direction })],
  ['updatedat', (direction) => ({ updatedAt: direction })],
]);

const TRAIL_SORT_FIELD_MAP = new Map<
  string,
  (direction: Prisma.SortOrder) => Prisma.TrailOrderByWithRelationInput
>([
  ['name', (direction) => ({ name: direction })],
  ['createdat', (direction) => ({ createdAt: direction })],
  ['updatedat', (direction) => ({ updatedAt: direction })],
  ['difficulty', (direction) => ({ difficulty: direction })],
  ['distancekm', (direction) => ({ distanceKm: direction })],
  ['durationminutes', (direction) => ({ durationMinutes: direction })],
]);

const EXPEDITION_SORT_FIELD_MAP = new Map<
  string,
  (direction: Prisma.SortOrder) => Prisma.ExpeditionOrderByWithRelationInput
>([
  ['startdate', (direction) => ({ startDate: direction })],
  ['createdat', (direction) => ({ createdAt: direction })],
  ['updatedat', (direction) => ({ updatedAt: direction })],
  ['pricecents', (direction) => ({ priceCents: direction })],
]);

const ACTIVE_EXPEDITION_STATUSES: ExpeditionStatus[] = [
  ExpeditionStatus.PUBLISHED,
  ExpeditionStatus.SCHEDULED,
  ExpeditionStatus.IN_PROGRESS,
];

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.CONFIRMED,
];

type StateReference = Pick<State, 'id' | 'code' | 'name' | 'region'>;

type CityRecord = City & {
  state: State;
  _count: { trails: number };
};

type TrailRecord = Trail & {
  state: State | null;
  city: (City & { state: State }) | null;
};

type ExpeditionRecord = Expedition & {
  trail: (Trail & { state: State | null; city: City | null }) | null;
  leadGuide: (GuideProfile & { user: { id: string; name: string | null } }) | null;
};


export type PublicCitySummary = {
  id: number;
  name: string;
  slug: string;
  isCapital: boolean;
  state: StateReference;
  trailsCount: number;
};

export type PublicCityListResult = {
  cities: PublicCitySummary[];
  pagination: PaginationMeta;
};

export type PublicTrailSummary = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  difficulty: Trail['difficulty'];
  distanceKm: number | null;
  durationMinutes: number | null;
  elevationGain: number | null;
  elevationLoss: number | null;
  maxAltitude: number | null;
  minAltitude: number | null;
  hasWaterPoints: boolean;
  hasCamping: boolean;
  paidEntry: boolean;
  entryFeeCents: number | null;
  guideFeeCents: number | null;
  state: StateReference | null;
  city: (Pick<City, 'id' | 'name' | 'slug'> & { state: StateReference }) | null;
  reviewSummary: { averageRating: number | null; totalReviews: number };
  updatedAt: string;
};

export type PublicTrailListResult = {
  trails: PublicTrailSummary[];
  pagination: PaginationMeta;
};

export type PublicExpeditionSummary = {
  id: string;
  title: string;
  description: string | null;
  status: ExpeditionStatus;
  startDate: string;
  endDate: string;
  priceCents: number;
  currency: string;
  maxParticipants: number;
  availableSpots: number | null;
  bookedHeadcount: number;
  trail: { id: string; name: string } | null;
  leadGuide: { id: string; displayName: string | null; name: string | null } | null;
  reviewSummary: { averageRating: number | null; totalReviews: number };
  updatedAt: string;
};

export type PublicExpeditionListResult = {
  expeditions: PublicExpeditionSummary[];
  pagination: PaginationMeta;
};

const decimalToNumber = (value: Prisma.Decimal | number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  return value.toNumber();
};

const normalizeSearch = (input?: string): string | undefined => {
  if (!input) {
    return undefined;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeOrder = <T>(
  input: string | undefined,
  map: Map<string, (direction: Prisma.SortOrder) => T>,
  defaultOrder: T,
  fallbacks: T[] = [],
): T[] => {
  if (!input || input.trim().length === 0) {
    return [defaultOrder, ...fallbacks];
  }

  const segments = input
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  const orders: T[] = [];

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
    const builder = map.get(normalizedKey);

    if (builder) {
      orders.push(builder(direction));
    }
  }

  if (orders.length === 0) {
    return [defaultOrder, ...fallbacks];
  }

  orders.push(...fallbacks);

  return orders;
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

const normalizeStateFilter = (
  value?: string,
): ({ type: 'id'; value: number } | { type: 'code'; value: string }) | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    const numeric = Number.parseInt(trimmed, 10);

    if (Number.isFinite(numeric) && numeric > 0) {
      return { type: 'id', value: numeric };
    }
  }

  return { type: 'code', value: trimmed.toUpperCase() };
};

const normalizeCityFilter = (
  value?: string,
): ({ type: 'id'; value: number } | { type: 'slug'; value: string }) | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    const numeric = Number.parseInt(trimmed, 10);

    if (Number.isFinite(numeric) && numeric > 0) {
      return { type: 'id', value: numeric };
    }
  }

  return { type: 'slug', value: trimmed.toLowerCase() };
};

const startOfDayUtc = (input: Date): Date => {
  const date = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  return date;
};

const endOfDayUtc = (input: Date): Date => {
  const date = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 23, 59, 59, 999));
  return date;
};

const toStateReference = (state: State): StateReference => ({
  id: state.id,
  code: state.code,
  name: state.name,
  region: state.region,
});

const toCitySummary = (city: CityRecord): PublicCitySummary => ({
  id: city.id,
  name: city.name,
  slug: city.slug,
  isCapital: city.isCapital,
  state: toStateReference(city.state),
  trailsCount: city._count.trails,
});

const toTrailSummary = (
  trail: TrailRecord,
  reviewStats: Map<string, { averageRating: number | null; totalReviews: number }>,
): PublicTrailSummary => {
  const reviewSummary = reviewStats.get(trail.id) ?? { averageRating: null, totalReviews: 0 };

  return {
    id: trail.id,
    slug: trail.slug,
    name: trail.name,
    summary: trail.summary ?? null,
    difficulty: trail.difficulty,
    distanceKm: decimalToNumber(trail.distanceKm),
    durationMinutes: trail.durationMinutes ?? null,
    elevationGain: trail.elevationGain ?? null,
    elevationLoss: trail.elevationLoss ?? null,
    maxAltitude: trail.maxAltitude ?? null,
    minAltitude: trail.minAltitude ?? null,
    hasWaterPoints: trail.hasWaterPoints,
    hasCamping: trail.hasCamping,
    paidEntry: trail.paidEntry,
    entryFeeCents: trail.entryFeeCents ?? null,
    guideFeeCents: trail.guideFeeCents ?? null,
    state: trail.state ? toStateReference(trail.state) : null,
    city: trail.city
      ? {
          id: trail.city.id,
          name: trail.city.name,
          slug: trail.city.slug,
          state: toStateReference(trail.city.state),
        }
      : null,
    reviewSummary,
    updatedAt: trail.updatedAt.toISOString(),
  };
};

const toExpeditionSummary = (
  expedition: ExpeditionRecord,
  reviewStats: Map<string, { averageRating: number | null; totalReviews: number }>,
  reservationTotals: Map<string, number>,
): PublicExpeditionSummary => {
  const reviewSummary = reviewStats.get(expedition.id) ?? { averageRating: null, totalReviews: 0 };
  const bookedHeadcount = reservationTotals.get(expedition.id) ?? 0;

  return {
    id: expedition.id,
    title: expedition.title,
    description: expedition.description ?? null,
    status: expedition.status,
    startDate: expedition.startDate.toISOString(),
    endDate: expedition.endDate.toISOString(),
    priceCents: expedition.priceCents,
    currency: expedition.currency,
    maxParticipants: expedition.maxParticipants,
    availableSpots: expedition.availableSpots ?? null,
    bookedHeadcount,
    trail: expedition.trail ? { id: expedition.trail.id, name: expedition.trail.name } : null,
    leadGuide: expedition.leadGuide
      ? {
          id: expedition.leadGuide.id,
          displayName: expedition.leadGuide.displayName ?? null,
          name: expedition.leadGuide.user.name ?? null,
        }
      : null,
    reviewSummary,
    updatedAt: expedition.updatedAt.toISOString(),
  };
};

class PublicContentService {
  constructor(private readonly prismaClient: PrismaClientInstance = prisma) {}

  async listCitiesWithTrails(params: ListPublicCitiesQuery): Promise<PublicCityListResult> {
    const page = params.page && Number.isFinite(params.page) ? params.page : 1;
    const pageSize = params.pageSize
      ? Math.min(Math.max(params.pageSize, 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    const search = normalizeSearch(params.search);
    const stateFilter = normalizeStateFilter(params.state);
    const orderBy = normalizeOrder(params.sort, CITY_SORT_FIELD_MAP, { name: 'asc' }, [{ id: 'asc' }]);

    const whereConditions: Prisma.CityWhereInput[] = [
      {
        trails: {
          some: { deletedAt: null },
        },
      },
    ];

    if (search) {
      whereConditions.push({ name: { contains: search, mode: 'insensitive' } });
    }

    if (stateFilter) {
      if (stateFilter.type === 'id') {
        whereConditions.push({ stateId: stateFilter.value });
      } else {
        whereConditions.push({ state: { code: stateFilter.value } });
      }
    }

    const where: Prisma.CityWhereInput =
      whereConditions.length === 1 ? whereConditions[0] : { AND: whereConditions };

    const [cities, totalItems] = await Promise.all([
      this.prismaClient.city.findMany({
        where,
        include: {
          state: true,
          _count: {
            select: {
              trails: {
                where: { deletedAt: null },
              },
            },
          },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prismaClient.city.count({ where }),
    ]);

    const summaries = (cities as CityRecord[]).map(toCitySummary);
    const pagination = buildPaginationMeta(totalItems, page, pageSize);

    return { cities: summaries, pagination };
  }

  async listTrails(params: ListPublicTrailsQuery): Promise<PublicTrailListResult> {
    const page = params.page && Number.isFinite(params.page) ? params.page : 1;
    const pageSize = params.pageSize
      ? Math.min(Math.max(params.pageSize, 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    const search = normalizeSearch(params.search);
    const stateFilter = normalizeStateFilter(params.state);
    const cityFilter = normalizeCityFilter(params.city);
    const orderBy = normalizeOrder(params.sort, TRAIL_SORT_FIELD_MAP, { createdAt: 'desc' }, [
      { updatedAt: 'desc' },
      { id: 'asc' },
    ]);

    const whereConditions: Prisma.TrailWhereInput[] = [{ deletedAt: null }];

    if (stateFilter) {
      if (stateFilter.type === 'id') {
        whereConditions.push({ stateId: stateFilter.value });
      } else {
        whereConditions.push({ state: { code: stateFilter.value } });
      }
    }

    if (cityFilter) {
      if (cityFilter.type === 'id') {
        whereConditions.push({ cityId: cityFilter.value });
      } else {
        whereConditions.push({ city: { slug: cityFilter.value } });
      }
    }

    if (search) {
      whereConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.TrailWhereInput =
      whereConditions.length === 1 ? whereConditions[0] : { AND: whereConditions };

    const [trails, totalItems] = await Promise.all([
      this.prismaClient.trail.findMany({
        where,
        include: {
          state: true,
          city: { include: { state: true } },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prismaClient.trail.count({ where }),
    ]);

    const trailIds = trails.map((trail) => trail.id);

    const reviewStatsList = trailIds.length
      ? await this.prismaClient.review.groupBy({
          by: ['trailId'],
          where: {
            trailId: { in: trailIds },
            deletedAt: null,
            status: ReviewStatus.PUBLISHED,
          },
          _avg: { rating: true },
          _count: { rating: true },
        })
      : ([] as Array<{ trailId: string | null; _avg: { rating: Prisma.Decimal | null }; _count: { rating: number } }>);

    const reviewMap = new Map<string, { averageRating: number | null; totalReviews: number }>();

    for (const stat of reviewStatsList) {
      const averageRating = decimalToNumber(stat._avg.rating);
      if (stat.trailId) {
        reviewMap.set(stat.trailId, {
          averageRating,
          totalReviews: stat._count.rating,
        });
      }
    }

    const summaries = (trails as TrailRecord[]).map((trail) => toTrailSummary(trail, reviewMap));
    const pagination = buildPaginationMeta(totalItems, page, pageSize);

    return { trails: summaries, pagination };
  }

  async listExpeditions(params: ListPublicExpeditionsQuery): Promise<PublicExpeditionListResult> {
    const page = params.page && Number.isFinite(params.page) ? params.page : 1;
    const pageSize = params.pageSize
      ? Math.min(Math.max(params.pageSize, 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    const search = normalizeSearch(params.search);
    const orderBy = normalizeOrder(params.sort, EXPEDITION_SORT_FIELD_MAP, { startDate: 'asc' }, [
      { createdAt: 'desc' },
      { id: 'asc' },
    ]);

    const whereConditions: Prisma.ExpeditionWhereInput[] = [
      { deletedAt: null },
      { status: { in: ACTIVE_EXPEDITION_STATUSES } },
    ];

    if (params.trailId) {
      whereConditions.push({ trailId: params.trailId });
    }

    if (params.dateFrom || params.dateTo) {
      const startDateFilter: Prisma.DateTimeFilter = {};

      if (params.dateFrom) {
        startDateFilter.gte = startOfDayUtc(params.dateFrom);
      }

      if (params.dateTo) {
        startDateFilter.lte = endOfDayUtc(params.dateTo);
      }

      whereConditions.push({ startDate: startDateFilter });
    }

    if (search) {
      whereConditions.push({ title: { contains: search, mode: 'insensitive' } });
    }

    const where: Prisma.ExpeditionWhereInput = { AND: whereConditions };

    const [expeditions, totalItems] = await Promise.all([
      this.prismaClient.expedition.findMany({
        where,
        include: {
          trail: { select: { id: true, name: true, state: true, city: true } },
          leadGuide: { select: { id: true, displayName: true, user: { select: { id: true, name: true } } } },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prismaClient.expedition.count({ where }),
    ]);

    const expeditionIds = expeditions.map((expedition) => expedition.id);

    const reviewStatsList = expeditionIds.length
      ? await this.prismaClient.review.groupBy({
          by: ['expeditionId'],
          where: {
            expeditionId: { in: expeditionIds },
            deletedAt: null,
            status: ReviewStatus.PUBLISHED,
          },
          _avg: { rating: true },
          _count: { rating: true },
        })
      : ([] as Array<{ expeditionId: string | null; _avg: { rating: Prisma.Decimal | null }; _count: { rating: number } }>);

    const reservationTotalsList = expeditionIds.length
      ? await this.prismaClient.reservation.groupBy({
          by: ['expeditionId'],
          where: {
            expeditionId: { in: expeditionIds },
            status: { in: ACTIVE_RESERVATION_STATUSES },
            deletedAt: null,
          },
          _sum: { headcount: true },
        })
      : ([] as Array<{ expeditionId: string; _sum: { headcount: number | null } }>);

    const reviewMap = new Map<string, { averageRating: number | null; totalReviews: number }>();
    const reservationTotals = new Map<string, number>();

    for (const stat of reviewStatsList) {
      const averageRating = decimalToNumber(stat._avg.rating);
      if (stat.expeditionId) {
        reviewMap.set(stat.expeditionId, {
          averageRating,
          totalReviews: stat._count.rating,
        });
      }
    }

    for (const total of reservationTotalsList) {
      reservationTotals.set(total.expeditionId, total._sum.headcount ?? 0);
    }

    const summaries = (expeditions as ExpeditionRecord[]).map((expedition) =>
      toExpeditionSummary(expedition, reviewMap, reservationTotals),
    );
    const pagination = buildPaginationMeta(totalItems, page, pageSize);

    return { expeditions: summaries, pagination };
  }
}

export const publicContentService = new PublicContentService();
