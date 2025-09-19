import { z } from 'zod';

export const REGION_VALUES = ['NORTH', 'NORTHEAST', 'CENTRAL_WEST', 'SOUTHEAST', 'SOUTH'] as const;

const nameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Name is required' })
  .max(255, { message: 'Name must be at most 255 characters long' });

const searchSchema = z
  .string()
  .trim()
  .min(1, { message: 'Search term must contain at least 1 character' })
  .max(255, { message: 'Search term must be at most 255 characters long' });

const slugInputSchema = z
  .string()
  .trim()
  .min(1, { message: 'Slug is required when provided' })
  .max(255, { message: 'Slug must be at most 255 characters long' });

const ufSchema = z
  .string()
  .trim()
  .length(2, { message: 'State code must have exactly 2 characters' })
  .regex(/^[a-zA-Z]{2}$/u, { message: 'State code must contain only letters' })
  .transform((value) => value.toUpperCase());

const latitudeSchema = z.coerce
  .number()
  .min(-90, { message: 'Latitude must be greater than or equal to -90' })
  .max(90, { message: 'Latitude must be less than or equal to 90' });

const longitudeSchema = z.coerce
  .number()
  .min(-180, { message: 'Longitude must be greater than or equal to -180' })
  .max(180, { message: 'Longitude must be less than or equal to 180' });

export const listStatesSchema = {
  query: z
    .object({
      search: searchSchema.optional(),
      region: z.enum(REGION_VALUES).optional(),
    })
    .strict(),
};

export type ListStatesQuery = z.infer<typeof listStatesSchema.query>;

export const createStateSchema = {
  body: z
    .object({
      code: ufSchema,
      name: nameSchema,
      region: z.enum(REGION_VALUES),
    })
    .strict(),
};

export type CreateStateBody = z.infer<typeof createStateSchema.body>;

export const listCitiesSchema = {
  query: z
    .object({
      state: ufSchema.optional(),
      search: searchSchema.optional(),
    })
    .strict(),
};

export type ListCitiesQuery = z.infer<typeof listCitiesSchema.query>;

export const createCitySchema = {
  body: z
    .object({
      stateId: z.coerce.number().int().positive(),
      name: nameSchema,
      slug: slugInputSchema.optional(),
      isCapital: z.boolean().optional(),
      latitude: latitudeSchema.optional(),
      longitude: longitudeSchema.optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if ((data.latitude !== undefined && data.longitude === undefined) || (data.latitude === undefined && data.longitude !== undefined)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Latitude and longitude must be provided together',
          path: data.latitude === undefined ? ['latitude'] : ['longitude'],
        });
      }
    }),
};

export type CreateCityBody = z.infer<typeof createCitySchema.body>;

export const listParksSchema = {
  query: z
    .object({
      cityId: z.coerce.number().int().positive().optional(),
      search: searchSchema.optional(),
    })
    .strict(),
};

export type ListParksQuery = z.infer<typeof listParksSchema.query>;

export const createParkSchema = {
  body: z
    .object({
      cityId: z.coerce.number().int().positive(),
      name: nameSchema,
      slug: slugInputSchema.optional(),
      description: z
        .string()
        .trim()
        .min(1, { message: 'Description must not be empty when provided' })
        .max(1000, { message: 'Description must be at most 1000 characters long' })
        .optional(),
    })
    .strict(),
};

export type CreateParkBody = z.infer<typeof createParkSchema.body>;
