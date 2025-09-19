import {
  Prisma,
  type City,
  type Media,
  type State,
  type Trail,
  type TrailDifficulty,
} from '@prisma/client';

import { HttpError } from '../../middlewares/error';
import { prisma, type PrismaClientInstance } from '../../services/prisma';
import { audit } from '../audit/audit.service';
import { toMediaSummary, type MediaSummary } from '../media/media.mappers';
import type { ActorContext, PaginationMeta, RequestContext } from '../users/user.service';
import {
  TRAIL_DIFFICULTY_VALUES,
  type CreateAdminTrailBody,
  type DeleteAdminTrailParams,
  type ListAdminTrailsQuery,
  type UpdateAdminTrailBody,
} from './trail.schemas';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const TRAIL_SORT_FIELD_MAP = new Map<
  string,
  (direction: Prisma.SortOrder) => Prisma.TrailOrderByWithRelationInput
>([
  ['createdat', (direction) => ({ createdAt: direction })],
  ['updatedat', (direction) => ({ updatedAt: direction })],
  ['name', (direction) => ({ name: direction })],
  ['slug', (direction) => ({ slug: direction })],
  ['difficulty', (direction) => ({ difficulty: direction })],
  ['distancekm', (direction) => ({ distanceKm: direction })],
  ['durationminutes', (direction) => ({ durationMinutes: direction })],
  ['entryfeecents', (direction) => ({ entryFeeCents: direction })],
  ['guidefeecents', (direction) => ({ guideFeeCents: direction })],
]);

const TRAIL_DIFFICULTY_SET = new Set(TRAIL_DIFFICULTY_VALUES);

export type TrailListParams = ListAdminTrailsQuery;

export type StateReference = {
  id: number;
  code: string;
  name: string;
  region: State['region'];
};

export type CityReference = {
  id: number;
  stateId: number;
  name: string;
  slug: string;
  state: StateReference;
};

export type TrailSummary = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  difficulty: TrailDifficulty;
  distanceKm: number | null;
  durationMinutes: number | null;
  elevationGain: number | null;
  elevationLoss: number | null;
  maxAltitude: number | null;
  minAltitude: number | null;
  stateId: number | null;
  cityId: number | null;
  state: StateReference | null;
  city: CityReference | null;
  hasWaterPoints: boolean;
  hasCamping: boolean;
  paidEntry: boolean;
  entryFeeCents: number | null;
  guideFeeCents: number | null;
  meetingPoint: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  media: MediaSummary[];
};

export type TrailDetail = TrailSummary & {
  description: string | null;
};

export type TrailListResult = {
  trails: TrailSummary[];
  pagination: PaginationMeta;
};

const decimalToNumber = (value: Prisma.Decimal | null | undefined): number | null => {
  if (!value) {
    return null;
  }

  return value.toNumber();
};

const toStateReference = (state: State): StateReference => ({
  id: state.id,
  code: state.code,
  name: state.name,
  region: state.region,
});

const toCityReference = (city: City & { state: State }): CityReference => ({
  id: city.id,
  stateId: city.stateId,
  name: city.name,
  slug: city.slug,
  state: toStateReference(city.state),
});

const sanitizeOptionalText = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeRoles = (roles: string[]): Set<string> => {
  return new Set(roles.map((role) => role.trim().toUpperCase()).filter((role) => role.length > 0));
};

const slugify = (input: string): string => {
  const normalized = input
    .normalize('NFD')
    .replace(/[^\p{Letter}\p{Number}\s-]+/gu, '')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug;
};

const ensureSlug = (input: string): string => {
  const slug = slugify(input);

  if (slug.length === 0) {
    throw new HttpError(400, 'INVALID_SLUG', 'Unable to derive a valid slug for the trail');
  }

  return slug;
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

const normalizeSort = (input?: string): Prisma.TrailOrderByWithRelationInput => {
  const defaultOrder: Prisma.TrailOrderByWithRelationInput = { createdAt: 'desc' };

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
  const builder = TRAIL_SORT_FIELD_MAP.get(normalizedKey);

  if (!builder) {
    throw new HttpError(400, 'INVALID_SORT', `Cannot sort by "${fieldName}"`);
  }

  return builder(direction);
};

const parseDifficultyFilter = (
  value?: string | string[],
): TrailDifficulty[] | undefined => {
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

  const result: TrailDifficulty[] = [];

  for (const difficulty of normalized) {
    if (!TRAIL_DIFFICULTY_SET.has(difficulty as TrailDifficulty)) {
      throw new HttpError(400, 'INVALID_DIFFICULTY', `Invalid difficulty "${difficulty}"`);
    }

    if (!result.includes(difficulty as TrailDifficulty)) {
      result.push(difficulty as TrailDifficulty);
    }
  }

  return result;
};

const parseNumericId = (value?: string | number): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value <= 0) {
      throw new HttpError(400, 'INVALID_IDENTIFIER', 'Identifier must be a positive integer');
    }

    return value;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (!/^\d+$/.test(trimmed)) {
    throw new HttpError(400, 'INVALID_IDENTIFIER', 'Identifier must be a positive integer');
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, 'INVALID_IDENTIFIER', 'Identifier must be a positive integer');
  }

  return parsed;
};

const toTrailSummary = (
  trail: Trail & { state: State | null; city: (City & { state: State }) | null; medias: Media[] },
): TrailSummary => ({
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
  stateId: trail.stateId ?? null,
  cityId: trail.cityId ?? null,
  state: trail.state ? toStateReference(trail.state) : null,
  city: trail.city ? toCityReference(trail.city) : null,
  hasWaterPoints: trail.hasWaterPoints,
  hasCamping: trail.hasCamping,
  paidEntry: trail.paidEntry,
  entryFeeCents: trail.entryFeeCents ?? null,
  guideFeeCents: trail.guideFeeCents ?? null,
  meetingPoint: trail.meetingPoint ?? null,
  notes: trail.notes ?? null,
  createdAt: trail.createdAt.toISOString(),
  updatedAt: trail.updatedAt.toISOString(),
  media: trail.medias.map(toMediaSummary),
});

const toTrailDetail = (
  trail: Trail & { state: State | null; city: (City & { state: State }) | null; medias: Media[] },
): TrailDetail => ({
  ...toTrailSummary(trail),
  description: trail.description ?? null,
});

const decimalFromNumber = (value: number | null | undefined): Prisma.Decimal | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return new Prisma.Decimal(value);
};

export class AdminTrailService {
  constructor(private readonly prismaClient: PrismaClientInstance = prisma) {}

  private async ensureUniqueSlug(slug: string, excludeId?: string): Promise<void> {
    const existing = await this.prismaClient.trail.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (existing) {
      throw new HttpError(409, 'TRAIL_SLUG_EXISTS', 'Trail with this slug already exists');
    }
  }

  private async resolveState(stateId: number): Promise<State> {
    const state = await this.prismaClient.state.findUnique({ where: { id: stateId } });

    if (!state) {
      throw new HttpError(404, 'STATE_NOT_FOUND', 'State not found');
    }

    return state;
  }

  private async resolveCity(cityId: number): Promise<City & { state: State }> {
    const city = await this.prismaClient.city.findUnique({
      where: { id: cityId },
      include: { state: true },
    });

    if (!city) {
      throw new HttpError(404, 'CITY_NOT_FOUND', 'City not found');
    }

    return city;
  }

  async listTrails(params: TrailListParams): Promise<TrailListResult> {
    const page = Math.max(1, params.page ?? 1);
    const rawPageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const pageSize = Math.max(1, Math.min(rawPageSize, MAX_PAGE_SIZE));
    const skip = (page - 1) * pageSize;

    const where: Prisma.TrailWhereInput = {
      deletedAt: null,
    };

    const stateId = parseNumericId(params.state);
    if (stateId !== undefined) {
      where.stateId = stateId;
    }

    const cityId = parseNumericId(params.city);
    if (cityId !== undefined) {
      where.cityId = cityId;
    }

    const difficulty = parseDifficultyFilter(params.difficulty);
    if (difficulty && difficulty.length > 0) {
      where.difficulty = { in: difficulty };
    }

    const search = params.search?.trim();
    if (search && search.length > 0) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { meetingPoint: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = normalizeSort(params.sort);

    const [totalItems, trails] = await this.prismaClient.$transaction([
      this.prismaClient.trail.count({ where }),
      this.prismaClient.trail.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          state: true,
          city: { include: { state: true } },
          medias: {
            where: { deletedAt: null },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          },
        },
      }),
    ]);

    const pagination = buildPaginationMeta(totalItems, page, pageSize);
    const summaries = trails.map(toTrailSummary);

    return { trails: summaries, pagination };
  }

  async getTrailById(id: string): Promise<TrailDetail | null> {
    const trail = await this.prismaClient.trail.findFirst({
      where: { id, deletedAt: null },
      include: {
        state: true,
        city: { include: { state: true } },
        medias: {
          where: { deletedAt: null },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!trail) {
      return null;
    }

    return toTrailDetail(trail);
  }

  async createTrail(
    actor: ActorContext,
    input: CreateAdminTrailBody,
    context: RequestContext,
  ): Promise<TrailDetail> {
    const roles = normalizeRoles(actor.roles);

    if (!(roles.has('ADMIN') || roles.has('EDITOR'))) {
      throw new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role');
    }

    const name = input.name.trim();
    const slug = ensureSlug(input.slug);

    await this.ensureUniqueSlug(slug);

    let resolvedStateId: number | null | undefined = input.stateId;
    let resolvedCityId: number | null | undefined = input.cityId;
    let resolvedCity: (City & { state: State }) | null = null;

    if (resolvedCityId !== undefined && resolvedCityId !== null) {
      resolvedCity = await this.resolveCity(resolvedCityId);
      resolvedCityId = resolvedCity.id;
      resolvedStateId = resolvedCity.stateId;
    } else if (resolvedCityId === null) {
      resolvedCityId = null;
    }

    if (resolvedStateId !== undefined) {
      if (resolvedStateId === null) {
        if (resolvedCityId) {
          throw new HttpError(
            400,
            'CITY_STATE_MISMATCH',
            'City cannot be associated without a valid state',
          );
        }
      } else {
        const state = await this.resolveState(resolvedStateId);
        resolvedStateId = state.id;

        if (resolvedCity && resolvedCity.stateId !== state.id) {
          throw new HttpError(400, 'CITY_STATE_MISMATCH', 'City does not belong to the specified state');
        }
      }
    } else if (resolvedCity) {
      resolvedStateId = resolvedCity.stateId;
    }

    const createData: Prisma.TrailUncheckedCreateInput = {
      slug,
      name,
      summary: sanitizeOptionalText(input.summary) ?? null,
      description: sanitizeOptionalText(input.description) ?? null,
      difficulty: (input.difficulty ?? 'MODERATE') as TrailDifficulty,
      distanceKm: decimalFromNumber(input.distanceKm),
      durationMinutes: input.durationMinutes ?? null,
      elevationGain: input.elevationGain ?? null,
      elevationLoss: input.elevationLoss ?? null,
      maxAltitude: input.maxAltitude ?? null,
      minAltitude: input.minAltitude ?? null,
      stateId: resolvedStateId ?? null,
      cityId: resolvedCityId ?? null,
      hasWaterPoints: input.hasWaterPoints,
      hasCamping: input.hasCamping,
      paidEntry: input.paidEntry,
      entryFeeCents: input.entryFeeCents ?? null,
      guideFeeCents: input.guideFeeCents ?? null,
      meetingPoint: sanitizeOptionalText(input.meetingPoint) ?? null,
      notes: sanitizeOptionalText(input.notes) ?? null,
    };

    const createdTrail = await this.prismaClient.trail.create({
      data: createData,
      include: {
        state: true,
        city: { include: { state: true } },
        medias: {
          where: { deletedAt: null },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    await audit({
      userId: actor.actorId,
      entity: 'trail',
      entityId: createdTrail.id,
      action: 'TRAIL_CREATE',
      diff: {
        name,
        slug,
        stateId: createdTrail.stateId,
        cityId: createdTrail.cityId,
        difficulty: createdTrail.difficulty,
      },
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return toTrailDetail(createdTrail);
  }

  async updateTrail(
    actor: ActorContext,
    id: string,
    body: UpdateAdminTrailBody,
    context: RequestContext,
  ): Promise<TrailDetail> {
    const roles = normalizeRoles(actor.roles);

    if (!(roles.has('ADMIN') || roles.has('EDITOR'))) {
      throw new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role');
    }

    const existing = await this.prismaClient.trail.findFirst({
      where: { id, deletedAt: null },
      include: {
        state: true,
        city: { include: { state: true } },
        medias: {
          where: { deletedAt: null },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!existing) {
      throw new HttpError(404, 'TRAIL_NOT_FOUND', 'Trail not found');
    }

    const updateData: Prisma.TrailUncheckedUpdateInput = {};
    const diff: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const trimmed = body.name.trim();
      updateData.name = trimmed;
      diff.name = trimmed;
    }

    if (body.slug !== undefined) {
      const newSlug = ensureSlug(body.slug);
      await this.ensureUniqueSlug(newSlug, id);
      updateData.slug = newSlug;
      diff.slug = newSlug;
    }

    const summary = sanitizeOptionalText(body.summary);
    if (summary !== undefined) {
      updateData.summary = summary;
      diff.summary = summary;
    }

    const description = sanitizeOptionalText(body.description);
    if (description !== undefined) {
      updateData.description = description;
      diff.description = description;
    }

    if (body.difficulty !== undefined) {
      updateData.difficulty = body.difficulty as TrailDifficulty;
      diff.difficulty = body.difficulty;
    }

    if (body.distanceKm !== undefined) {
      updateData.distanceKm = decimalFromNumber(body.distanceKm);
      diff.distanceKm = body.distanceKm;
    }

    if (body.durationMinutes !== undefined) {
      updateData.durationMinutes = body.durationMinutes ?? null;
      diff.durationMinutes = body.durationMinutes;
    }

    if (body.elevationGain !== undefined) {
      updateData.elevationGain = body.elevationGain ?? null;
      diff.elevationGain = body.elevationGain;
    }

    if (body.elevationLoss !== undefined) {
      updateData.elevationLoss = body.elevationLoss ?? null;
      diff.elevationLoss = body.elevationLoss;
    }

    if (body.maxAltitude !== undefined) {
      updateData.maxAltitude = body.maxAltitude ?? null;
      diff.maxAltitude = body.maxAltitude;
    }

    if (body.minAltitude !== undefined) {
      updateData.minAltitude = body.minAltitude ?? null;
      diff.minAltitude = body.minAltitude;
    }

    if (body.hasWaterPoints !== undefined) {
      updateData.hasWaterPoints = body.hasWaterPoints;
      diff.hasWaterPoints = body.hasWaterPoints;
    }

    if (body.hasCamping !== undefined) {
      updateData.hasCamping = body.hasCamping;
      diff.hasCamping = body.hasCamping;
    }

    if (body.paidEntry !== undefined) {
      updateData.paidEntry = body.paidEntry;
      diff.paidEntry = body.paidEntry;
    }

    if (body.entryFeeCents !== undefined) {
      updateData.entryFeeCents = body.entryFeeCents ?? null;
      diff.entryFeeCents = body.entryFeeCents;
    }

    if (body.guideFeeCents !== undefined) {
      updateData.guideFeeCents = body.guideFeeCents ?? null;
      diff.guideFeeCents = body.guideFeeCents;
    }

    const meetingPoint = sanitizeOptionalText(body.meetingPoint);
    if (meetingPoint !== undefined) {
      updateData.meetingPoint = meetingPoint;
      diff.meetingPoint = meetingPoint;
    }

    const notes = sanitizeOptionalText(body.notes);
    if (notes !== undefined) {
      updateData.notes = notes;
      diff.notes = notes;
    }

    let resolvedStateId: number | null = existing.stateId ?? null;
    let resolvedCityId: number | null = existing.cityId ?? null;
    let currentCity: (City & { state: State }) | null = existing.city ? existing.city : null;

    const stateProvided = body.stateId !== undefined;
    const cityProvided = body.cityId !== undefined;

    if (cityProvided) {
      if (body.cityId === null) {
        resolvedCityId = null;
        currentCity = null;
      } else if (body.cityId !== undefined) {
        currentCity = await this.resolveCity(body.cityId);
        resolvedCityId = currentCity.id;
      }
    }

    if (stateProvided) {
      if (body.stateId === null) {
        if (resolvedCityId) {
          throw new HttpError(
            400,
            'CITY_STATE_MISMATCH',
            'City cannot be associated without a valid state',
          );
        }

        resolvedStateId = null;
      } else if (body.stateId !== undefined) {
        const state = await this.resolveState(body.stateId);
        resolvedStateId = state.id;
      }
    }

    if (currentCity) {
      if (resolvedStateId === null) {
        throw new HttpError(400, 'CITY_STATE_MISMATCH', 'City cannot be associated without a valid state');
      }

      if (stateProvided) {
        if (resolvedStateId !== currentCity.stateId) {
          throw new HttpError(400, 'CITY_STATE_MISMATCH', 'City does not belong to the specified state');
        }
      } else {
        resolvedStateId = currentCity.stateId;
      }
    }

    if (stateProvided || (cityProvided && currentCity)) {
      updateData.stateId = resolvedStateId ?? null;
      diff.stateId = resolvedStateId ?? null;
    }

    if (cityProvided) {
      updateData.cityId = resolvedCityId ?? null;
      diff.cityId = resolvedCityId ?? null;
    }

    const updatedTrail = await this.prismaClient.trail.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        state: true,
        city: { include: { state: true } },
        medias: {
          where: { deletedAt: null },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    await audit({
      userId: actor.actorId,
      entity: 'trail',
      entityId: updatedTrail.id,
      action: 'TRAIL_UPDATE',
      diff,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return toTrailDetail(updatedTrail);
  }

  async deleteTrail(
    actor: ActorContext,
    params: DeleteAdminTrailParams,
    context: RequestContext,
  ): Promise<void> {
    const roles = normalizeRoles(actor.roles);

    if (!roles.has('ADMIN')) {
      throw new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role');
    }

    const now = new Date();

    await this.prismaClient.$transaction(async (tx) => {
      const existing = await tx.trail.findFirst({
        where: { id: params.id, deletedAt: null },
        include: {
          medias: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
      });

      if (!existing) {
        throw new HttpError(404, 'TRAIL_NOT_FOUND', 'Trail not found');
      }

      await tx.trail.update({
        where: { id: params.id },
        data: { deletedAt: now },
      });

      if (existing.medias.length > 0) {
        await tx.media.updateMany({
          where: { trailId: params.id, deletedAt: null },
          data: { deletedAt: now },
        });
      }

      return existing;
    });

    await audit({
      userId: actor.actorId,
      entity: 'trail',
      entityId: params.id,
      action: 'TRAIL_DELETE',
      diff: { trailId: params.id },
      ip: context.ip,
      userAgent: context.userAgent,
    });
  }
}

export const adminTrailService = new AdminTrailService();
