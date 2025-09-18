import { z } from 'zod';

import { ADMIN_ROLE_VALUES } from '../admin/admin.schemas';

export const USER_STATUS_VALUES = ['ACTIVE', 'INACTIVE'] as const;
export type AdminUserStatus = (typeof USER_STATUS_VALUES)[number];

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'name', 'email', 'role', 'status'] as const;

const normalizeSortField = (value: string): string => {
  const sanitized = value.replace(/^[-+]/, '').trim();
  const normalized = sanitized.toLowerCase().replace(/_/g, '');

  const match = SORTABLE_FIELDS.find(
    (field) => field.toLowerCase().replace(/_/g, '') === normalized,
  );

  return match ?? '';
};

export const listAdminUsersSchema = {
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
      role: z
        .preprocess(
          (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
          z.enum(ADMIN_ROLE_VALUES).optional(),
        ),
      status: z
        .preprocess(
          (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
          z.enum(USER_STATUS_VALUES).optional(),
        ),
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

export type ListAdminUsersQuery = z.infer<typeof listAdminUsersSchema.query>;

export const createAdminUserSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).optional(),
    role: z.enum(ADMIN_ROLE_VALUES),
  }),
};

export type CreateAdminUserBody = z.infer<typeof createAdminUserSchema.body>;

export const getAdminUserSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export type GetAdminUserParams = z.infer<typeof getAdminUserSchema.params>;

export const updateAdminUserSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      name: z.string().min(1).optional(),
      role: z.enum(ADMIN_ROLE_VALUES).optional(),
      password: z.string().min(8).optional(),
      status: z.enum(USER_STATUS_VALUES).optional(),
    })
    .superRefine((data, ctx) => {
      if (Object.keys(data).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one field must be provided',
        });
      }
    }),
};

export type UpdateAdminUserParams = z.infer<typeof updateAdminUserSchema.params>;
export type UpdateAdminUserBody = z.infer<typeof updateAdminUserSchema.body>;

export const deleteAdminUserSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export type DeleteAdminUserParams = z.infer<typeof deleteAdminUserSchema.params>;

