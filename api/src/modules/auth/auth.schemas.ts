import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'A senha deve conter pelo menos 8 caracteres').max(72),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
