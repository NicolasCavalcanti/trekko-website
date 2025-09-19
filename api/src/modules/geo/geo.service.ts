import { Prisma, type City, type Park, type State } from '@prisma/client';

import { HttpError } from '../../middlewares/error';
import { prisma, type PrismaClientInstance } from '../../services/prisma';
import { audit } from '../audit/audit.service';
import type {
  CreateCityBody,
  CreateParkBody,
  CreateStateBody,
  ListCitiesQuery,
  ListParksQuery,
  ListStatesQuery,
} from './geo.schemas';

export type ActorContext = {
  actorId?: string | null;
  roles: string[];
};

export type RequestContext = {
  ip?: string | null;
  userAgent?: string | null;
};

export type StateSummary = {
  id: number;
  code: string;
  name: string;
  region: State['region'];
  createdAt: string;
  updatedAt: string;
};

export type StateReference = Pick<StateSummary, 'id' | 'code' | 'name' | 'region'>;

export type CitySummary = {
  id: number;
  stateId: number;
  name: string;
  slug: string;
  isCapital: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  state: StateReference;
};

export type CityReference = Pick<CitySummary, 'id' | 'name' | 'slug' | 'isCapital' | 'state' | 'stateId'>;

export type ParkSummary = {
  id: number;
  cityId: number;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  city: CityReference;
};

const decimalToNumber = (value: Prisma.Decimal | null | undefined): number | null => {
  if (!value) {
    return null;
  }

  return value.toNumber();
};

const toStateSummary = (state: State): StateSummary => ({
  id: state.id,
  code: state.code,
  name: state.name,
  region: state.region,
  createdAt: state.createdAt.toISOString(),
  updatedAt: state.updatedAt.toISOString(),
});

const toStateReference = (state: State): StateReference => ({
  id: state.id,
  code: state.code,
  name: state.name,
  region: state.region,
});

const toCitySummary = (city: City & { state: State }): CitySummary => ({
  id: city.id,
  stateId: city.stateId,
  name: city.name,
  slug: city.slug,
  isCapital: city.isCapital,
  latitude: decimalToNumber(city.latitude),
  longitude: decimalToNumber(city.longitude),
  createdAt: city.createdAt.toISOString(),
  updatedAt: city.updatedAt.toISOString(),
  state: toStateReference(city.state),
});

const toCityReference = (city: City & { state: State }): CityReference => ({
  id: city.id,
  stateId: city.stateId,
  name: city.name,
  slug: city.slug,
  isCapital: city.isCapital,
  state: toStateReference(city.state),
});

const toParkSummary = (park: Park & { city: City & { state: State } }): ParkSummary => ({
  id: park.id,
  cityId: park.cityId,
  name: park.name,
  slug: park.slug,
  description: park.description ?? null,
  createdAt: park.createdAt.toISOString(),
  updatedAt: park.updatedAt.toISOString(),
  city: toCityReference(park.city),
});

const normalizeSearch = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

const ensureSlug = (input: string, entity: 'city' | 'park'): string => {
  const slug = slugify(input);

  if (slug.length === 0) {
    throw new HttpError(400, 'INVALID_SLUG', `Unable to derive a valid slug for the ${entity}`);
  }

  return slug;
};

const normalizeRoles = (roles: string[]): Set<string> => {
  return new Set(roles.map((role) => role.trim().toUpperCase()).filter((role) => role.length > 0));
};

export class AdminGeoService {
  constructor(private readonly prismaClient: PrismaClientInstance = prisma) {}

  async listStates(params: ListStatesQuery): Promise<StateSummary[]> {
    const where: Prisma.StateWhereInput = {};
    const search = normalizeSearch(params.search);

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (params.region) {
      where.region = params.region;
    }

    const states = await this.prismaClient.state.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    return states.map(toStateSummary);
  }

  async createState(actor: ActorContext, input: CreateStateBody, context: RequestContext): Promise<StateSummary> {
    const roles = normalizeRoles(actor.roles);

    if (!(roles.has('ADMIN') || roles.has('EDITOR'))) {
      throw new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role');
    }

    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();

    const existingByCode = await this.prismaClient.state.findUnique({ where: { code } });
    if (existingByCode) {
      throw new HttpError(409, 'STATE_ALREADY_EXISTS', 'State with this code already exists');
    }

    const existingByName = await this.prismaClient.state.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (existingByName) {
      throw new HttpError(409, 'STATE_ALREADY_EXISTS', 'State with this name already exists');
    }

    const createdState = await this.prismaClient.state.create({
      data: {
        code,
        name,
        region: input.region,
      },
    });

    const summary = toStateSummary(createdState);

    await audit({
      userId: actor.actorId,
      entity: 'state',
      entityId: String(createdState.id),
      action: 'CREATE',
      diff: { created: summary },
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return summary;
  }

  async listCities(params: ListCitiesQuery): Promise<CitySummary[]> {
    const where: Prisma.CityWhereInput = {};
    const search = normalizeSearch(params.search);

    if (params.state) {
      where.state = { code: params.state };
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const cities = await this.prismaClient.city.findMany({
      where,
      include: { state: true },
      orderBy: [{ name: 'asc' }],
    });

    return cities.map(toCitySummary);
  }

  async createCity(actor: ActorContext, input: CreateCityBody, context: RequestContext): Promise<CitySummary> {
    const roles = normalizeRoles(actor.roles);

    if (!(roles.has('ADMIN') || roles.has('EDITOR'))) {
      throw new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role');
    }

    const state = await this.prismaClient.state.findUnique({ where: { id: input.stateId } });

    if (!state) {
      throw new HttpError(404, 'STATE_NOT_FOUND', 'State not found');
    }

    const name = input.name.trim();
    const slugSource = input.slug?.trim().length ? input.slug : name;
    const slug = ensureSlug(slugSource, 'city');

    const existingCityByName = await this.prismaClient.city.findFirst({
      where: {
        stateId: state.id,
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (existingCityByName) {
      throw new HttpError(409, 'CITY_ALREADY_EXISTS', 'City with this name already exists in the selected state');
    }

    try {
      const createdCity = await this.prismaClient.city.create({
        data: {
          stateId: state.id,
          name,
          slug,
          isCapital: input.isCapital ?? false,
          latitude: input.latitude !== undefined ? new Prisma.Decimal(input.latitude) : undefined,
          longitude: input.longitude !== undefined ? new Prisma.Decimal(input.longitude) : undefined,
        },
        include: { state: true },
      });

      const summary = toCitySummary(createdCity);

      await audit({
        userId: actor.actorId,
        entity: 'city',
        entityId: String(createdCity.id),
        action: 'CREATE',
        diff: { created: summary },
        ip: context.ip,
        userAgent: context.userAgent,
      });

      return summary;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'CITY_ALREADY_EXISTS', 'City with this slug already exists in the selected state');
      }

      throw error;
    }
  }

  async listParks(params: ListParksQuery): Promise<ParkSummary[]> {
    const where: Prisma.ParkWhereInput = {};
    const search = normalizeSearch(params.search);

    if (params.cityId) {
      where.cityId = params.cityId;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const parks = await this.prismaClient.park.findMany({
      where,
      include: { city: { include: { state: true } } },
      orderBy: [{ name: 'asc' }],
    });

    return parks.map(toParkSummary);
  }

  async createPark(actor: ActorContext, input: CreateParkBody, context: RequestContext): Promise<ParkSummary> {
    const roles = normalizeRoles(actor.roles);

    if (!(roles.has('ADMIN') || roles.has('EDITOR'))) {
      throw new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role');
    }

    const city = await this.prismaClient.city.findUnique({
      where: { id: input.cityId },
      include: { state: true },
    });

    if (!city) {
      throw new HttpError(404, 'CITY_NOT_FOUND', 'City not found');
    }

    const name = input.name.trim();
    const slugSource = input.slug?.trim().length ? input.slug : name;
    const slug = ensureSlug(slugSource, 'park');

    const existingParkByName = await this.prismaClient.park.findFirst({
      where: {
        cityId: city.id,
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (existingParkByName) {
      throw new HttpError(409, 'PARK_ALREADY_EXISTS', 'Park with this name already exists in the selected city');
    }

    try {
      const createdPark = await this.prismaClient.park.create({
        data: {
          cityId: city.id,
          name,
          slug,
          description: input.description?.trim() ?? null,
        },
        include: { city: { include: { state: true } } },
      });

      const summary = toParkSummary(createdPark);

      await audit({
        userId: actor.actorId,
        entity: 'park',
        entityId: String(createdPark.id),
        action: 'CREATE',
        diff: { created: summary },
        ip: context.ip,
        userAgent: context.userAgent,
      });

      return summary;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'PARK_ALREADY_EXISTS', 'Park with this slug already exists in the selected city');
      }

      throw error;
    }
  }
}

export const adminGeoService = new AdminGeoService();
