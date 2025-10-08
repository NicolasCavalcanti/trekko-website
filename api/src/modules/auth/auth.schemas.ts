import { z } from 'zod';

export const loginSchema = {
  body: z.object({
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'A senha deve conter pelo menos 8 caracteres').max(72),
  }),
};

export type LoginInput = z.infer<(typeof loginSchema)['body']>;

export const validateCadasturSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Nome é obrigatório'),
    cadastur_number: z.string().trim().min(1, 'Número CADASTUR é obrigatório'),
  }),
};

export type ValidateCadasturInput = z.infer<(typeof validateCadasturSchema)['body']>;
