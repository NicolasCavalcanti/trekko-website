import { z } from 'zod';

export const PAYMENT_STATUS_VALUES = [
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'REFUNDED',
  'FAILED',
  'CANCELLED',
  'CHARGEBACK',
] as const;

export const PAYMENT_PROVIDER_VALUES = ['MERCADO_PAGO', 'STRIPE', 'MANUAL'] as const;

export const PAYMENT_METHOD_VALUES = [
  'PIX',
  'CREDIT_CARD',
  'BOLETO',
  'BANK_TRANSFER',
  'CASH',
  'OTHER',
] as const;

type PaymentStatusValue = (typeof PAYMENT_STATUS_VALUES)[number];
type PaymentProviderValue = (typeof PAYMENT_PROVIDER_VALUES)[number];
type PaymentMethodValue = (typeof PAYMENT_METHOD_VALUES)[number];

const normalizeStatus = (value: string, ctx: z.RefinementCtx): PaymentStatusValue => {
  const upper = value.trim().toUpperCase();

  if (!PAYMENT_STATUS_VALUES.includes(upper as PaymentStatusValue)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid payment status: ${value}`,
    });
    return z.NEVER;
  }

  return upper as PaymentStatusValue;
};

const parseStatusFilter = (value: string | string[], ctx: z.RefinementCtx): PaymentStatusValue[] => {
  const values = Array.isArray(value) ? value : value.split(',');
  const normalized: PaymentStatusValue[] = [];

  for (const entry of values) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      continue;
    }

    normalized.push(normalizeStatus(trimmed, ctx));
  }

  return normalized;
};

const providerSchema = z
  .union([
    z.enum(PAYMENT_PROVIDER_VALUES),
    z
      .string()
      .trim()
      .transform((value, ctx) => {
        const upper = value.toUpperCase();
        if (!PAYMENT_PROVIDER_VALUES.includes(upper as PaymentProviderValue)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid payment provider: ${value}`,
          });
          return z.NEVER;
        }

        return upper as PaymentProviderValue;
      }),
  ])
  .optional();

const methodSchema = z
  .union([
    z.enum(PAYMENT_METHOD_VALUES),
    z
      .string()
      .trim()
      .transform((value, ctx) => {
        const upper = value.toUpperCase();
        if (!PAYMENT_METHOD_VALUES.includes(upper as PaymentMethodValue)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid payment method: ${value}`,
          });
          return z.NEVER;
        }

        return upper as PaymentMethodValue;
      }),
  ])
  .optional();

export const listAdminPaymentsSchema = {
  query: z
    .object({
      status: z
        .union([z.string(), z.array(z.string())])
        .transform((value, ctx) => parseStatusFilter(value, ctx))
        .optional(),
    })
    .transform((value) => {
      return {
        status: value.status && value.status.length > 0 ? value.status : undefined,
      } satisfies { status?: PaymentStatusValue[] };
    }),
};

export const captureAdminPaymentSchema = {
  params: z.object({
    reservationId: z.string().uuid(),
  }),
  body: z.object({
    provider: providerSchema,
    method: methodSchema,
    metadata: z.record(z.unknown()).optional(),
  }),
};

export const refundAdminPaymentSchema = {
  params: z.object({
    reservationId: z.string().uuid(),
  }),
  body: z.object({
    amountCents: z.coerce.number().int().min(1).optional(),
    reason: z
      .union([z.string().trim().max(500), z.literal(null)])
      .optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
};

export type ListAdminPaymentsQuery = z.infer<typeof listAdminPaymentsSchema.query>;
export type CapturePaymentParams = z.infer<typeof captureAdminPaymentSchema.params>;
export type CapturePaymentBody = z.infer<typeof captureAdminPaymentSchema.body>;
export type RefundPaymentParams = z.infer<typeof refundAdminPaymentSchema.params>;
export type RefundPaymentBody = z.infer<typeof refundAdminPaymentSchema.body>;

