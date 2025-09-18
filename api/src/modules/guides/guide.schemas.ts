import { z } from 'zod';

export const GUIDE_VERIFICATION_STATUS_VALUES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export type GuideVerificationStatusValue = (typeof GUIDE_VERIFICATION_STATUS_VALUES)[number];

const SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'displayName',
  'verificationStatus',
  'verifiedAt',
  'rejectedAt',
  'cadasturNumber',
] as const;

const normalizeSortField = (value: string): string => {
  const sanitized = value.replace(/^[-+]/, '').trim();
  const normalized = sanitized.toLowerCase().replace(/_/g, '');

  const match = SORTABLE_FIELDS.find(
    (field) => field.toLowerCase().replace(/_/g, '') === normalized,
  );

  return match ?? '';
};

export const listAdminGuidesSchema = {
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
      search: z
        .string()
        .trim()
        .min(1)
        .max(255)
        .optional(),
      verification: z.union([z.string(), z.array(z.string())]).optional(),
      sort: z
        .string()
        .trim()
        .refine(
          (value) => {
            if (value.length === 0) {
              return true;
            }

            return normalizeSortField(value).length > 0;
          },
          { message: 'Invalid sort field' },
        )
        .optional(),
    })
    .strict(),
};

export type ListAdminGuidesQuery = z.infer<typeof listAdminGuidesSchema.query>;

export const verifyGuideSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum(['VERIFIED', 'REJECTED']),
    notes: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional(),
  }),
};

export type VerifyGuideParams = z.infer<typeof verifyGuideSchema.params>;
export type VerifyGuideBody = z.infer<typeof verifyGuideSchema.body>;

