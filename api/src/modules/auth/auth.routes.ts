import type { CookieOptions, Request, Response } from 'express';
import { Router } from 'express';

import { HttpError } from '../../middlewares/error';
import { rateLimit } from '../../middlewares/rate-limit';
import { validate } from '../../middlewares/validation';
import {
  ACCESS_TOKEN_EXPIRATION_SECONDS,
  REFRESH_TOKEN_EXPIRATION_SECONDS,
  authService,
} from './auth.service';
import { loginSchema, type LoginInput } from './auth.schemas';

const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const ACCESS_TOKEN_COOKIE_ALIASES = [ACCESS_TOKEN_COOKIE_NAME, 'access_token'] as const;
const REFRESH_TOKEN_COOKIE_ALIASES = [REFRESH_TOKEN_COOKIE_NAME, 'refresh_token'] as const;

const isProduction = process.env.NODE_ENV === 'production';

const resolveCookieDomain = (): string | undefined => {
  const domain = process.env.AUTH_COOKIE_DOMAIN ?? process.env.COOKIE_DOMAIN;
  if (domain && domain.trim().length > 0) {
    return domain.trim();
  }
  return undefined;
};

const baseCookieOptions = (): CookieOptions => {
  const options: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };

  const domain = resolveCookieDomain();
  if (domain) {
    options.domain = domain;
  }

  return options;
};

const buildAccessCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions(),
  maxAge: ACCESS_TOKEN_EXPIRATION_SECONDS * 1000,
});

const buildRefreshCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions(),
  maxAge: REFRESH_TOKEN_EXPIRATION_SECONDS * 1000,
});

const getRefreshTokenFromRequest = (req: Request): string | undefined => {
  for (const name of REFRESH_TOKEN_COOKIE_ALIASES) {
    const token = req.cookies?.[name];
    if (typeof token === 'string' && token.trim().length > 0) {
      return token.trim();
    }
  }
  return undefined;
};

const clearAuthCookies = (res: Response) => {
  const options = baseCookieOptions();
  for (const name of ACCESS_TOKEN_COOKIE_ALIASES) {
    res.clearCookie(name, options);
  }
  for (const name of REFRESH_TOKEN_COOKIE_ALIASES) {
    res.clearCookie(name, options);
  }
};

const setAuthCookies = (res: Response, tokens: { accessToken: string; refreshToken: string }) => {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, tokens.accessToken, buildAccessCookieOptions());
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, buildRefreshCookieOptions());
};

const router = Router();

const authRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
});

router.use(authRateLimiter);

router.post('/login', validate(loginSchema), async (req, res, next) => {
  const { email, password } = req.body as LoginInput;

  try {
    const { user, accessToken, refreshToken } = await authService.login(email, password);

    setAuthCookies(res, { accessToken, refreshToken });

    res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    next(new HttpError(401, 'REFRESH_TOKEN_MISSING', 'Refresh token is missing'));
    return;
  }

  try {
    const { user, accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);

    setAuthCookies(res, { accessToken, refreshToken: newRefreshToken });

    res.status(200).json({
      user,
    });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  try {
    await authService.logout(refreshToken);
  } catch (error) {
    next(error);
    return;
  }

  clearAuthCookies(res);
  res.status(204).send();
});

export const authRouter = router;
