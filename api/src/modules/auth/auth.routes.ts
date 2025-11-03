import type { CookieOptions, Request, Response } from 'express';
import { Router } from 'express';

import { authenticate } from '../../middlewares/auth';
import { clearCsrfToken, ensureCsrfToken, rotateCsrfToken } from '../../middlewares/csrf';
import { HttpError } from '../../middlewares/error';
import { rateLimit } from '../../middlewares/rate-limit';
import { validate } from '../../middlewares/validation';
import { audit } from '../audit/audit.service';
import {
  ACCESS_TOKEN_EXPIRATION_SECONDS,
  REFRESH_TOKEN_EXPIRATION_SECONDS,
  authService,
} from './auth.service';
import {
  loginSchema,
  type LoginInput,
  registerSchema,
  type RegisterInput,
  validateCadasturSchema,
  type ValidateCadasturInput,
} from './auth.schemas';
import { cadasturLookupService } from '../../services/cadastur-lookup';
import { buildCookieOptions } from '../../services/cookies';

const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const ACCESS_TOKEN_COOKIE_ALIASES = [ACCESS_TOKEN_COOKIE_NAME, 'access_token'] as const;
const REFRESH_TOKEN_COOKIE_ALIASES = [REFRESH_TOKEN_COOKIE_NAME, 'refresh_token'] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['*'],
  EDITOR: ['CMS', 'TRILHAS', 'EXPEDICOES', 'GUIAS', 'CLIENTES', 'RESERVAS', 'INTEGRACOES', 'CONFIGURACOES'],
  OPERADOR: ['EXPEDICOES', 'RESERVAS', 'CLIENTES', 'GUIAS'],
  GUIA: ['EXPEDICOES', 'RESERVAS'],
};

const normalizeRole = (role: string): string => role.trim().toUpperCase();

const normalizeRoles = (roles: unknown): string[] => {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map((role) => (typeof role === 'string' ? normalizeRole(role) : ''))
    .filter((role) => role.length > 0);
};

const resolveUserRoles = (userRole: string | null | undefined, tokenRoles: unknown): string[] => {
  const normalizedTokenRoles = normalizeRoles(tokenRoles);
  if (normalizedTokenRoles.length > 0) {
    return Array.from(new Set(normalizedTokenRoles));
  }

  if (userRole && userRole.trim().length > 0) {
    return [normalizeRole(userRole)];
  }

  return [];
};

const resolvePermissionsForRoles = (roles: string[]): string[] => {
  if (roles.some((role) => normalizeRole(role) === 'ADMIN')) {
    return ['*'];
  }

  const permissions = new Set<string>();

  for (const role of roles) {
    const normalized = normalizeRole(role);
    const rolePermissions = ROLE_PERMISSIONS[normalized];
    if (!rolePermissions) {
      continue;
    }

    if (rolePermissions.includes('*')) {
      permissions.clear();
      permissions.add('*');
      break;
    }

    if (!permissions.has('*')) {
      rolePermissions.forEach((permission) => permissions.add(permission));
    }
  }

  return permissions.has('*') ? ['*'] : Array.from(permissions);
};

const baseCookieOptions = (): CookieOptions => buildCookieOptions();

const buildAccessCookieOptions = (): CookieOptions =>
  buildCookieOptions({ maxAge: ACCESS_TOKEN_EXPIRATION_SECONDS * 1000 });

const buildRefreshCookieOptions = (): CookieOptions =>
  buildCookieOptions({ maxAge: REFRESH_TOKEN_EXPIRATION_SECONDS * 1000 });

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

router.get('/csrf', (req, res) => {
  const csrfToken = rotateCsrfToken(req, res);
  res.status(200).json({ csrfToken });
});

router.post('/register', validate(registerSchema), async (req, res, next) => {
  const { name, email, password, user_type: userType, cadastur_number: cadasturNumber } =
    req.body as RegisterInput;

  try {
    const { user, accessToken, refreshToken } = await authService.register({
      name,
      email,
      password,
      userType,
      cadasturNumber,
    });

    setAuthCookies(res, { accessToken, refreshToken });
    const csrfToken = rotateCsrfToken(req, res);

    await audit({
      userId: user.id,
      entity: 'user',
      entityId: user.id,
      action: 'REGISTER',
      diff: { email: user.email, role: user.role },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      user,
      access_token: accessToken,
      refresh_token: refreshToken,
      csrfToken,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/validate-cadastur',
  validate(validateCadasturSchema),
  async (req, res, next) => {
    const { name, cadastur_number: cadasturNumber } = req.body as ValidateCadasturInput;
    const trimmedName = name.trim();
    const normalizedNumber = cadasturNumber.replace(/\D/g, '');

    if (normalizedNumber.length !== 11) {
      res.status(400).json({
        valid: false,
        message: 'Número CADASTUR deve conter 11 dígitos',
      });
      return;
    }

    try {
      const isValid = await cadasturLookupService.isValid(trimmedName, normalizedNumber);

      if (!isValid) {
        res.status(404).json({
          valid: false,
          message:
            'Nome ou número CADASTUR não encontrados na base oficial. Verifique seus dados ou entre em contato com suporte@trekko.com.br.',
        });
        return;
      }

      res.status(200).json({ valid: true });
    } catch (error) {
      next(error);
    }
  },
);

router.post('/login', validate(loginSchema), async (req, res, next) => {
  const { email, password } = req.body as LoginInput;

  try {
    const { user, accessToken, refreshToken } = await authService.login(email, password);

    setAuthCookies(res, { accessToken, refreshToken });
    const csrfToken = rotateCsrfToken(req, res);

    await audit({
      userId: user.id,
      entity: 'user',
      entityId: user.id,
      action: 'LOGIN',
      diff: { email: user.email },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      user,
      access_token: accessToken,
      refresh_token: refreshToken,
      csrfToken,
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

    const csrfToken = rotateCsrfToken(req, res);

    res.status(200).json({
      success: true,
      user,
      access_token: accessToken,
      refresh_token: newRefreshToken,
      csrfToken,
    });
  } catch (error) {
    clearAuthCookies(res);
    clearCsrfToken(res);
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
  clearCsrfToken(res);
  res.status(204).send();
});

router.get('/me', authenticate({ optional: true }), async (req, res, next) => {
  const payload = req.user;

  if (!payload?.sub) {
    const csrfToken = ensureCsrfToken(req, res);
    res.status(200).json({ authenticated: false, csrfToken });
    return;
  }

  try {
    const profile = await authService.getUserProfile(payload.sub);

    if (!profile) {
      const csrfToken = ensureCsrfToken(req, res);
      res.status(200).json({ authenticated: false, csrfToken });
      return;
    }

    const roles = resolveUserRoles(profile.role, payload.roles);
    const permissions = resolvePermissionsForRoles(roles);
    const csrfToken = ensureCsrfToken(req, res);

    res.status(200).json({
      authenticated: true,
      user: profile,
      roles,
      permissions,
      csrfToken,
    });
  } catch (error) {
    next(error);
  }
});

export const authRouter = router;
