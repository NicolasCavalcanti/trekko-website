import { z } from 'zod';

export const RESERVATION_STATUS_VALUES = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'WAITLISTED',
  'EXPIRED',
] as const;

const statusSchema = z
  .union([
    z.enum(RESERVATION_STATUS_VALUES),
    z
      .string()
      .trim()
      .transform((value, ctx) => {
        const upper = value.toUpperCase();
        if (!RESERVATION_STATUS_VALUES.includes(upper as (typeof RESERVATION_STATUS_VALUES)[number])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid reservation status: ${value}`,
          });
          return z.NEVER;
        }

        return upper as (typeof RESERVATION_STATUS_VALUES)[number];
      }),
  ])
  .optional();

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(null)])
    .optional();

export const listAdminReservationsSchema = {
  query: z.object({
    status: z.union([z.string(), z.array(z.string())]).optional(),
    expeditionId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  }),
};

export const createAdminReservationSchema = {
  body: z.object({
    expeditionId: z.string().uuid(),
    userId: z.string().uuid(),
    headcount: z.coerce.number().int().min(1).max(100).default(1),
    status: statusSchema,
    notes: optionalText(5000),
    internalNotes: optionalText(5000),
    emergencyContactName: optionalText(200),
    emergencyContactPhone: optionalText(50),
    feeCents: z.coerce.number().int().min(0).optional(),
    discountCents: z.coerce.number().int().min(0).optional(),
  }),
};

export const updateAdminReservationSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      headcount: z.coerce.number().int().min(1).max(100).optional(),
      status: statusSchema,
      notes: optionalText(5000),
      internalNotes: optionalText(5000),
      emergencyContactName: optionalText(200),
      emergencyContactPhone: optionalText(50),
      cancellationReason: optionalText(2000),
    })
    .refine((data) => {
      return (
        data.headcount !== undefined ||
        data.status !== undefined ||
        data.notes !== undefined ||
        data.internalNotes !== undefined ||
        data.emergencyContactName !== undefined ||
        data.emergencyContactPhone !== undefined ||
        data.cancellationReason !== undefined
      );
    }, {
      message: 'At least one field must be provided to update the reservation',
    }),
};

export type ListAdminReservationsQuery = z.infer<typeof listAdminReservationsSchema.query>;
export type CreateAdminReservationBody = z.infer<typeof createAdminReservationSchema.body>;
export type UpdateAdminReservationParams = z.infer<typeof updateAdminReservationSchema.params>;
export type UpdateAdminReservationBody = z.infer<typeof updateAdminReservationSchema.body>;
