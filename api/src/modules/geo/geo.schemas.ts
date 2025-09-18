import { z } from 'zod';

const nameSchema = z.string().trim().min(1, 'Name is required');

const ufSchema = z
  .string()
  .trim()
  .min(2, 'UF must be 2 characters')
  .max(2, 'UF must be 2 characters')
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z]{2}$/.test(value), {
    message: 'UF must contain only letters',
  });

const uuidSchema = z.string().uuid();

const createStateBodySchema = z.object({
  name: nameSchema,
  code: ufSchema,
});

export const createStateSchema = {
  body: createStateBodySchema,
};

export type CreateStateInput = z.infer<typeof createStateBodySchema>;

export const listCitiesSchema = {
  query: z.object({
    state: ufSchema.optional(),
  }),
};

export type ListCitiesQuery = z.infer<typeof listCitiesSchema.query>;

const createCityBodySchema = z.object({
  name: nameSchema,
  stateId: uuidSchema,
});

export const createCitySchema = {
  body: createCityBodySchema,
};

export type CreateCityInput = z.infer<typeof createCityBodySchema>;

export const listParksSchema = {
  query: z.object({
    cityId: uuidSchema.optional(),
  }),
};

export type ListParksQuery = z.infer<typeof listParksSchema.query>;

const createParkBodySchema = z.object({
  name: nameSchema,
  cityId: uuidSchema,
});

export const createParkSchema = {
  body: createParkBodySchema,
};

export type CreateParkInput = z.infer<typeof createParkBodySchema>;
