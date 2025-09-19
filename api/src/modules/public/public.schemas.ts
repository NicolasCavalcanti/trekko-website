import { z } from 'zod';

const optionalTrimmedString = z
  .union([z.string(), z.undefined()])
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

const optionalDate = z
  .union([z.string(), z.date(), z.undefined()])
  .transform((value, ctx) => {
    if (value === undefined) {
      return undefined as Date | undefined;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date format' });
        return z.NEVER;
      }

      return value;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return undefined;
    }

    const parsed = new Date(trimmed);

    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date format' });
      return z.NEVER;
    }

    return parsed;
  });

export const listPublicCitiesSchema = {
  query: z.object({
    state: optionalTrimmedString,
    search: optionalTrimmedString,
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    sort: optionalTrimmedString,
  }),
};

export const listPublicTrailsSchema = {
  query: z.object({
    state: optionalTrimmedString,
    city: optionalTrimmedString,
    search: optionalTrimmedString,
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    sort: optionalTrimmedString,
  }),
};

export const listPublicExpeditionsSchema = {
  query: z.object({
    trailId: optionalTrimmedString,
    dateFrom: optionalDate,
    dateTo: optionalDate,
    search: optionalTrimmedString,
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    sort: optionalTrimmedString,
  }),
};

export type ListPublicCitiesQuery = z.infer<typeof listPublicCitiesSchema.query>;
export type ListPublicTrailsQuery = z.infer<typeof listPublicTrailsSchema.query>;
export type ListPublicExpeditionsQuery = z.infer<typeof listPublicExpeditionsSchema.query>;
