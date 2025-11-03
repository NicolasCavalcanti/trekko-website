import { z } from 'zod';

const sanitizeEmail = (email: string): string => email.trim().toLowerCase();

const sanitizeName = (name: string): string => name.trim();

const sanitizeCadastur = (cadastur: string | undefined): string | undefined => {
  if (!cadastur) {
    return undefined;
  }

  const digitsOnly = cadastur.replace(/\D/g, '');
  return digitsOnly.length > 0 ? digitsOnly : undefined;
};

export const loginSchema = {
  body: z.object({
    email: z.string().email('E-mail inválido').transform(sanitizeEmail),
    password: z.string().min(8, 'A senha deve conter pelo menos 8 caracteres').max(72),
  }),
};

export type LoginInput = z.infer<(typeof loginSchema)['body']>;

const registerBodySchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').transform(sanitizeName),
    email: z.string().email('E-mail inválido').transform(sanitizeEmail),
    password: z.string().min(8, 'A senha deve conter pelo menos 8 caracteres').max(72),
    user_type: z.enum(['trekker', 'guia']).default('trekker'),
    cadastur_number: z
      .string()
      .trim()
      .optional()
      .transform((value) => sanitizeCadastur(value ?? undefined)),
  })
  .superRefine((data, ctx) => {
    if (data.user_type === 'guia') {
      if (!data.cadastur_number) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cadastur_number'],
          message: 'Número CADASTUR é obrigatório para guias',
        });
        return;
      }

      if (!/^\d{11}$/.test(data.cadastur_number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cadastur_number'],
          message: 'Número CADASTUR deve conter 11 dígitos',
        });
      }
    }
  });

export const registerSchema = {
  body: registerBodySchema,
};

export type RegisterInput = z.infer<typeof registerBodySchema>;

export const validateCadasturSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Nome é obrigatório'),
    cadastur_number: z.string().trim().min(1, 'Número CADASTUR é obrigatório'),
  }),
};

export type ValidateCadasturInput = z.infer<(typeof validateCadasturSchema)['body']>;
