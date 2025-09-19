import { z } from 'zod';

const optionalInteger = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === undefined) {
      return undefined as number | null | undefined;
    }

    if (value === null) {
      return null as number | null;
    }

    const parseNumeric = (input: number | string): number => {
      if (typeof input === 'number') {
        return input;
      }

      const trimmed = input.trim();
      if (trimmed.length === 0) {
        return Number.NaN;
      }

      if (!/^[-+]?\d+$/.test(trimmed)) {
        return Number.NaN;
      }

      return Number.parseInt(trimmed, 10);
    };

    const numeric = parseNumeric(value);

    if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Value must be an integer' });
      return z.NEVER;
    }

    if (numeric < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Value must be greater than or equal to zero' });
      return z.NEVER;
    }

    return numeric;
  });

export const createTrailMediaSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      contentType: z.string().trim().min(1),
      fileName: z.string().trim().min(1).max(255).optional(),
      size: optionalInteger.optional(),
      title: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().min(1).max(2000).optional(),
    })
    .strict(),
};

export const deleteMediaSchema = {
  params: z.object({
    mediaId: z.string().uuid(),
  }),
};

export type CreateTrailMediaParams = z.infer<typeof createTrailMediaSchema.params>;
export type CreateTrailMediaBody = z.infer<typeof createTrailMediaSchema.body> & {
  size?: number | null;
};
export type DeleteMediaParams = z.infer<typeof deleteMediaSchema.params>;
