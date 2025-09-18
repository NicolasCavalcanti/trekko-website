import { z } from 'zod';

export const ADMIN_ROLE_VALUES = ['ADMIN', 'EDITOR', 'OPERADOR', 'GUIA'] as const;
export type AdminRole = (typeof ADMIN_ROLE_VALUES)[number];

export const createAdminUserSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).optional(),
    role: z.enum(ADMIN_ROLE_VALUES),
  }),
};

export const updateAdminUserSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      name: z.string().min(1).optional(),
      role: z.enum(ADMIN_ROLE_VALUES).optional(),
      password: z.string().min(8).optional(),
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

export const deleteAdminUserSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};
