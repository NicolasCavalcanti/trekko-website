import type { CookieOptions } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

export const resolveCookieDomain = (): string | undefined => {
  const domain = process.env.AUTH_COOKIE_DOMAIN ?? process.env.COOKIE_DOMAIN;
  if (domain && domain.trim().length > 0) {
    return domain.trim();
  }
  return undefined;
};

export const buildCookieOptions = (overrides: CookieOptions = {}): CookieOptions => {
  const baseOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };

  const domain = resolveCookieDomain();
  if (domain) {
    baseOptions.domain = domain;
  }

  return { ...baseOptions, ...overrides };
};
