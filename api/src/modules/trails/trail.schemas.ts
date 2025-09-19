import { z } from 'zod';

export const TRAIL_DIFFICULTY_VALUES = ['EASY', 'MODERATE', 'HARD', 'EXTREME'] as const;

const trailDifficultyEnum = z.enum(TRAIL_DIFFICULTY_VALUES);

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(null)])
    .optional();

const createOptionalNumberSchema = (options: {
  fieldName: string;
  allowDecimal: boolean;
  min?: number;
  max?: number;
}) =>
  z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (value === undefined) {
        return undefined as number | null | undefined;
      }

      if (value === null) {
        return null as number | null;
      }

      let numeric: number;
      if (typeof value === 'number') {
        numeric = value;
      } else {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return null;
        }

        numeric = Number(trimmed);
      }

      if (!Number.isFinite(numeric)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${options.fieldName} must be a valid number`,
        });
        return z.NEVER;
      }

      if (!options.allowDecimal && !Number.isInteger(numeric)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${options.fieldName} must be an integer`,
        });
        return z.NEVER;
      }

      if (options.min !== undefined && numeric < options.min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${options.fieldName} must be greater than or equal to ${options.min}`,
        });
        return z.NEVER;
      }

      if (options.max !== undefined && numeric > options.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${options.fieldName} must be less than or equal to ${options.max}`,
        });
        return z.NEVER;
      }

      return numeric;
    });

const optionalPositiveIntId = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === undefined) {
      return undefined as number | null | undefined;
    }

    if (value === null) {
      return null as number | null;
    }

    const toInteger = (input: number | string): number => {
      if (typeof input === 'number') {
        return input;
      }

      const trimmed = input.trim();
      if (trimmed.length === 0) {
        return Number.NaN;
      }

      if (!/^\d+$/.test(trimmed)) {
        return Number.NaN;
      }

      return Number.parseInt(trimmed, 10);
    };

    const numeric = toInteger(value);

    if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Identifier must be an integer' });
      return z.NEVER;
    }

    if (numeric <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Identifier must be greater than zero' });
      return z.NEVER;
    }

    return numeric;
  });

const distanceKmSchema = createOptionalNumberSchema({
  fieldName: 'distanceKm',
  allowDecimal: true,
  min: 0,
});

const durationMinutesSchema = createOptionalNumberSchema({
  fieldName: 'durationMinutes',
  allowDecimal: false,
  min: 0,
});

const elevationSchema = createOptionalNumberSchema({
  fieldName: 'elevation',
  allowDecimal: false,
});

const altitudeSchema = createOptionalNumberSchema({
  fieldName: 'altitude',
  allowDecimal: false,
});

const centsSchema = createOptionalNumberSchema({
  fieldName: 'value',
  allowDecimal: false,
  min: 0,
});

const booleanWithDefault = (defaultValue: boolean) => z.boolean().optional().default(defaultValue);

export const listAdminTrailsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    state: z.union([z.string().trim(), z.number()]).optional(),
    city: z.union([z.string().trim(), z.number()]).optional(),
    difficulty: z.union([z.string(), z.array(z.string())]).optional(),
    search: z.string().trim().optional(),
    sort: z.string().trim().optional(),
  }),
};

export const createAdminTrailSchema = {
  body: z
    .object({
      name: z.string().trim().min(1).max(200),
      slug: z
        .string()
        .trim()
        .min(1)
        .max(150)
        .regex(slugPattern, 'Slug must contain only lowercase letters, numbers, and hyphens'),
      summary: optionalText(500),
      description: optionalText(5000),
      difficulty: trailDifficultyEnum.optional().default('MODERATE'),
      distanceKm: distanceKmSchema.optional(),
      durationMinutes: durationMinutesSchema.optional(),
      elevationGain: elevationSchema.optional(),
      elevationLoss: elevationSchema.optional(),
      maxAltitude: altitudeSchema.optional(),
      minAltitude: altitudeSchema.optional(),
      stateId: optionalPositiveIntId.optional(),
      cityId: optionalPositiveIntId.optional(),
      hasWaterPoints: booleanWithDefault(false),
      hasCamping: booleanWithDefault(false),
      paidEntry: booleanWithDefault(false),
      entryFeeCents: centsSchema.optional(),
      guideFeeCents: centsSchema.optional(),
      meetingPoint: optionalText(500),
      notes: optionalText(5000),
    })
    .strict(),
};

export const getAdminTrailSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export const updateAdminTrailSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      name: z.string().trim().min(1).max(200).optional(),
      slug: z
        .string()
        .trim()
        .min(1)
        .max(150)
        .regex(slugPattern, 'Slug must contain only lowercase letters, numbers, and hyphens')
        .optional(),
      summary: optionalText(500),
      description: optionalText(5000),
      difficulty: trailDifficultyEnum.optional(),
      distanceKm: distanceKmSchema.optional(),
      durationMinutes: durationMinutesSchema.optional(),
      elevationGain: elevationSchema.optional(),
      elevationLoss: elevationSchema.optional(),
      maxAltitude: altitudeSchema.optional(),
      minAltitude: altitudeSchema.optional(),
      stateId: optionalPositiveIntId.optional(),
      cityId: optionalPositiveIntId.optional(),
      hasWaterPoints: z.boolean().optional(),
      hasCamping: z.boolean().optional(),
      paidEntry: z.boolean().optional(),
      entryFeeCents: centsSchema.optional(),
      guideFeeCents: centsSchema.optional(),
      meetingPoint: optionalText(500),
      notes: optionalText(5000),
    })
    .strict(),
};

export const deleteAdminTrailSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export type ListAdminTrailsQuery = z.infer<typeof listAdminTrailsSchema.query>;
export type CreateAdminTrailBody = z.infer<typeof createAdminTrailSchema.body>;
export type GetAdminTrailParams = z.infer<typeof getAdminTrailSchema.params>;
export type UpdateAdminTrailParams = z.infer<typeof updateAdminTrailSchema.params>;
export type UpdateAdminTrailBody = z.infer<typeof updateAdminTrailSchema.body>;
export type DeleteAdminTrailParams = z.infer<typeof deleteAdminTrailSchema.params>;
