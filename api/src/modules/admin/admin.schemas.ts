export const ADMIN_ROLE_VALUES = ['ADMIN', 'EDITOR', 'OPERADOR', 'GUIA'] as const;
export type AdminRole = (typeof ADMIN_ROLE_VALUES)[number];
