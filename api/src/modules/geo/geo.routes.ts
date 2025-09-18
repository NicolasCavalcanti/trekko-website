import { Router } from 'express';
import { Prisma, type City, type Park, type State } from '@prisma/client';

import { HttpError } from '../../middlewares/error';
import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import { prisma } from '../../services/prisma';
import { audit } from '../audit/audit.service';
import {
  createCitySchema,
  createParkSchema,
  createStateSchema,
  type CreateCityInput,
  type CreateParkInput,
  type CreateStateInput,
  listCitiesSchema,
  type ListCitiesQuery,
  listParksSchema,
  type ListParksQuery,
} from './geo.schemas';

type StateModel = State;
type CityWithState = City & { state: StateModel };
type ParkWithRelations = Park & { city: City & { state: StateModel } };

const toStateResponse = (state: StateModel) => ({
  id: state.id,
  name: state.name,
  code: state.code,
  createdAt: state.createdAt,
  updatedAt: state.updatedAt,
});

const toCityResponse = (city: CityWithState) => ({
  id: city.id,
  name: city.name,
  createdAt: city.createdAt,
  updatedAt: city.updatedAt,
  state: toStateResponse(city.state),
});

const toParkResponse = (park: ParkWithRelations) => ({
  id: park.id,
  name: park.name,
  createdAt: park.createdAt,
  updatedAt: park.updatedAt,
  city: {
    id: park.city.id,
    name: park.city.name,
    createdAt: park.city.createdAt,
    updatedAt: park.city.updatedAt,
    state: toStateResponse(park.city.state),
  },
});

const geoRouter = Router();

geoRouter.get(
  '/states',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR', 'GUIA'),
  async (_req, res, next) => {
    try {
      const states = await prisma.state.findMany({
        orderBy: { name: 'asc' },
      });

      res.status(200).json({ states: states.map(toStateResponse) });
    } catch (error) {
      next(error);
    }
  },
);

geoRouter.post(
  '/states',
  requireRole('ADMIN', 'EDITOR'),
  validate(createStateSchema),
  async (req, res, next) => {
    const { name, code } = req.body as CreateStateInput;

    try {
      const createdState = await prisma.state.create({
        data: { name, code },
      });

      await audit({
        userId: req.user?.sub,
        entity: 'state',
        entityId: createdState.id,
        action: 'CREATE',
        diff: { created: toStateResponse(createdState) },
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({ state: toStateResponse(createdState) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        next(new HttpError(409, 'STATE_ALREADY_EXISTS', 'State with this name or code already exists'));
        return;
      }

      next(error);
    }
  },
);

geoRouter.get(
  '/cities',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR', 'GUIA'),
  validate(listCitiesSchema),
  async (req, res, next) => {
    const { state } = req.query as ListCitiesQuery;

    try {
      const cities = await prisma.city.findMany({
        where: state
          ? {
              state: {
                code: state,
              },
            }
          : undefined,
        include: {
          state: true,
        },
        orderBy: [
          { state: { name: 'asc' } },
          { name: 'asc' },
        ],
      });

      res.status(200).json({ cities: cities.map(toCityResponse) });
    } catch (error) {
      next(error);
    }
  },
);

geoRouter.post(
  '/cities',
  requireRole('ADMIN', 'EDITOR'),
  validate(createCitySchema),
  async (req, res, next) => {
    const { name, stateId } = req.body as CreateCityInput;

    try {
      const createdCity = await prisma.city.create({
        data: { name, stateId },
        include: { state: true },
      });

      await audit({
        userId: req.user?.sub,
        entity: 'city',
        entityId: createdCity.id,
        action: 'CREATE',
        diff: { created: toCityResponse(createdCity) },
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({ city: toCityResponse(createdCity) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          next(new HttpError(409, 'CITY_ALREADY_EXISTS', 'City already exists in this state'));
          return;
        }

        if (error.code === 'P2003') {
          next(new HttpError(404, 'STATE_NOT_FOUND', 'State not found'));
          return;
        }
      }

      next(error);
    }
  },
);

geoRouter.get(
  '/parks',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR', 'GUIA'),
  validate(listParksSchema),
  async (req, res, next) => {
    const { cityId } = req.query as ListParksQuery;

    try {
      const parks = await prisma.park.findMany({
        where: cityId ? { cityId } : undefined,
        include: {
          city: {
            include: {
              state: true,
            },
          },
        },
        orderBy: [
          { city: { state: { name: 'asc' } } },
          { city: { name: 'asc' } },
          { name: 'asc' },
        ],
      });

      res.status(200).json({ parks: parks.map(toParkResponse) });
    } catch (error) {
      next(error);
    }
  },
);

geoRouter.post(
  '/parks',
  requireRole('ADMIN', 'EDITOR'),
  validate(createParkSchema),
  async (req, res, next) => {
    const { name, cityId } = req.body as CreateParkInput;

    try {
      const createdPark = await prisma.park.create({
        data: { name, cityId },
        include: {
          city: {
            include: {
              state: true,
            },
          },
        },
      });

      await audit({
        userId: req.user?.sub,
        entity: 'park',
        entityId: createdPark.id,
        action: 'CREATE',
        diff: { created: toParkResponse(createdPark) },
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({ park: toParkResponse(createdPark) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          next(new HttpError(409, 'PARK_ALREADY_EXISTS', 'Park already exists in this city'));
          return;
        }

        if (error.code === 'P2003') {
          next(new HttpError(404, 'CITY_NOT_FOUND', 'City not found'));
          return;
        }
      }

      next(error);
    }
  },
);

export const geoAdminRouter = geoRouter;
