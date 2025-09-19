import { z } from 'zod';

import { ReviewStatus } from '@prisma/client';

const optionalTrimmedString = z
  .union([z.string(), z.undefined()])
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

const ratingSchema = z
  .union([z.string(), z.number(), z.undefined()])
  .transform((value, ctx) => {
    if (value === undefined) {
      return undefined as number | undefined;
    }

    const numeric = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rating must be an integer between 1 and 5',
      });
      return z.NEVER;
    }

    if (numeric < 1 || numeric > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rating must be between 1 and 5',
      });
      return z.NEVER;
    }

    return numeric;
  });

const statusSchema = z
  .union([z.string(), z.array(z.string()), z.undefined()])
  .transform((value) => {
    if (value === undefined) {
      return undefined as string[] | undefined;
    }

    const toStatus = (input: string): string => input.trim().toUpperCase();

    if (Array.isArray(value)) {
      const result = value
        .map((item) => toStatus(item))
        .filter((item) => item.length > 0);

      return result.length > 0 ? result : undefined;
    }

    const single = toStatus(value);
    return single.length > 0 ? [single] : undefined;
  });

export const listAdminReviewsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    guideId: optionalTrimmedString,
    trailId: optionalTrimmedString,
    expeditionId: optionalTrimmedString,
    reservationId: optionalTrimmedString,
    rating: ratingSchema,
    status: statusSchema,
    search: optionalTrimmedString,
    sort: optionalTrimmedString,
  }),
};

export const deleteAdminReviewSchema = {
  params: z.object({
    id: z.string().trim().min(1),
  }),
};

export type ListAdminReviewsQuery = z.infer<typeof listAdminReviewsSchema.query> & {
  status?: string[];
};

export type DeleteAdminReviewParams = z.infer<typeof deleteAdminReviewSchema.params>;

export const reviewStatusValues = Object.values(ReviewStatus);
