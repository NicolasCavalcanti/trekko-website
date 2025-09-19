import { Router } from 'express';

import { validate } from '../../middlewares/validation';
import {
  listPublicCitiesSchema,
  listPublicExpeditionsSchema,
  listPublicTrailsSchema,
  type ListPublicCitiesQuery,
  type ListPublicExpeditionsQuery,
  type ListPublicTrailsQuery,
} from './public.schemas';
import { publicContentService } from './public.service';

const router = Router();

router.get(
  '/cities-with-trails',
  validate(listPublicCitiesSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListPublicCitiesQuery;
      const result = await publicContentService.listCitiesWithTrails(query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/trails',
  validate(listPublicTrailsSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListPublicTrailsQuery;
      const result = await publicContentService.listTrails(query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/expeditions',
  validate(listPublicExpeditionsSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListPublicExpeditionsQuery;
      const result = await publicContentService.listExpeditions(query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

export const publicRouter = router;
