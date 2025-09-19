import { z } from 'zod';

export const EXPEDITION_STATUS_VALUES = [
  'DRAFT',
  'PUBLISHED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

const priceValueSchema = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'pricePerPerson must be a finite number',
        });
        return z.NEVER;
      }

      return value;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pricePerPerson cannot be empty',
      });
      return z.NEVER;
    }

    const normalized = trimmed.replace(',', '.');
    const numeric = Number.parseFloat(normalized);
    if (!Number.isFinite(numeric)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pricePerPerson must be a valid number',
      });
      return z.NEVER;
    }

    return numeric;
  })
  .refine((value) => value >= 0, {
    message: 'pricePerPerson must be greater than or equal to zero',
  });

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(null)])
    .optional();

const optionalGuideId = z.union([z.string().uuid(), z.literal(null)]).optional();

export const listAdminExpeditionsSchema = {
  query: z.object({
    status: z.union([z.string(), z.array(z.string())]).optional(),
    guideId: z.string().uuid().optional(),
    trailId: z.string().uuid().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  }),
};

export const createAdminExpeditionSchema = {
  body: z
    .object({
      trailId: z.string().uuid(),
      guideId: optionalGuideId,
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      pricePerPerson: priceValueSchema.optional(),
      priceCents: z.coerce.number().int().min(0).optional(),
      maxPeople: z.coerce.number().int().min(1).max(1000),
      description: z.string().trim().min(1).max(5000),
    })
    .superRefine((data, ctx) => {
      if (data.priceCents === undefined && data.pricePerPerson === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'pricePerPerson or priceCents must be provided',
          path: ['pricePerPerson'],
        });
      }
    }),
};

export const getAdminExpeditionSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export const updateAdminExpeditionSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      trailId: z.string().uuid().optional(),
      guideId: optionalGuideId,
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      pricePerPerson: priceValueSchema.optional(),
      priceCents: z.coerce.number().int().min(0).optional(),
      maxPeople: z.coerce.number().int().min(1).max(1000).optional(),
      description: optionalText(5000),
    })
    .refine((data) => {
      if (data.pricePerPerson === undefined && data.priceCents === undefined) {
        return true;
      }

      if (data.priceCents !== undefined) {
        return true;
      }

      return data.pricePerPerson !== undefined;
    }, {
      message: 'pricePerPerson or priceCents must be provided when updating price',
      path: ['pricePerPerson'],
    }),
};

export const updateAdminExpeditionStatusSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(EXPEDITION_STATUS_VALUES),
    reason: z.string().trim().max(2000).optional(),
  }),
};

export type ListAdminExpeditionsQuery = z.infer<typeof listAdminExpeditionsSchema.query>;
export type CreateAdminExpeditionBody = z.infer<typeof createAdminExpeditionSchema.body>;
export type GetAdminExpeditionParams = z.infer<typeof getAdminExpeditionSchema.params>;
export type UpdateAdminExpeditionParams = z.infer<typeof updateAdminExpeditionSchema.params>;
export type UpdateAdminExpeditionBody = z.infer<typeof updateAdminExpeditionSchema.body>;
export type UpdateAdminExpeditionStatusParams = z.infer<typeof updateAdminExpeditionStatusSchema.params>;
export type UpdateAdminExpeditionStatusBody = z.infer<typeof updateAdminExpeditionStatusSchema.body>;
