import type { User } from '@prisma/client';
import { GuideVerificationStatus, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

import { HttpError } from '../../middlewares/error';
import { prisma, type PrismaClientInstance } from '../../services/prisma';

export const ACCESS_TOKEN_EXPIRATION_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_EXPIRATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type BasicUserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

type RefreshTokenPayload = jwt.JwtPayload & {
  sub: string;
  sid: string;
  type: 'refresh';
};

type LoginResult = {
  user: BasicUserProfile;
  accessToken: string;
  refreshToken: string;
};

export type RegisterParams = {
  name: string;
  email: string;
  password: string;
  userType: 'trekker' | 'guia';
  cadasturNumber?: string;
};

const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

const toBasicProfile = (user: User): BasicUserProfile => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

const getAccessSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new HttpError(500, 'JWT_SECRET_NOT_CONFIGURED', 'JWT secret is not configured');
  }
  return secret;
};

const getRefreshSecret = (): string => {
  const secret = process.env.REFRESH_SECRET ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new HttpError(500, 'REFRESH_SECRET_NOT_CONFIGURED', 'Refresh token secret is not configured');
  }
  return secret;
};

export class AuthService {
  constructor(private readonly prismaClient: PrismaClientInstance = prisma) {}

  private signAccessToken(user: User): string {
    const payload: jwt.JwtPayload & {
      sub: string;
      email: string;
      name?: string;
      roles: string[];
      type: 'access';
    } = {
      sub: user.id,
      email: user.email,
      name: user.name ?? undefined,
      roles: [user.role],
      type: 'access',
    };

    return jwt.sign(payload, getAccessSecret(), {
      expiresIn: ACCESS_TOKEN_EXPIRATION_SECONDS,
    });
  }

  private async createSession(userId: string): Promise<string> {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_SECONDS * 1000);
    const tokenHash = hashToken(sessionId);

    await this.prismaClient.authSession.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      sid: sessionId,
      type: 'refresh',
    };

    const refreshToken = jwt.sign(refreshPayload, getRefreshSecret(), {
      expiresIn: REFRESH_TOKEN_EXPIRATION_SECONDS,
    });

    return refreshToken;
  }

  private verifyRefreshToken(refreshToken: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(refreshToken, getRefreshSecret()) as RefreshTokenPayload;

      if (typeof decoded.sub !== 'string' || typeof decoded.sid !== 'string' || decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token payload');
      }

      return decoded;
    } catch (error) {
      throw new HttpError(
        401,
        'INVALID_REFRESH_TOKEN',
        'Invalid refresh token',
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.prismaClient.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.createSession(user.id);

    return {
      user: toBasicProfile(user),
      accessToken,
      refreshToken,
    };
  }

  async register(params: RegisterParams): Promise<LoginResult> {
    const normalizedEmail = params.email.trim().toLowerCase();

    const existingUser = await this.prismaClient.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new HttpError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'Já existe um usuário cadastrado com este e-mail',
      );
    }

    if (params.userType === 'guia' && params.cadasturNumber) {
      const existingGuideProfile = await this.prismaClient.guideProfile.findUnique({
        where: { cadasturNumber: params.cadasturNumber },
      });

      if (existingGuideProfile) {
        throw new HttpError(
          409,
          'CADASTUR_ALREADY_REGISTERED',
          'Este número CADASTUR já está vinculado a outra conta',
        );
      }
    }

    const passwordHash = await bcrypt.hash(params.password, 12);
    const trimmedName = params.name.trim();
    const role = params.userType === 'guia' ? 'GUIA' : 'MEMBER';

    const user = await this.prismaClient.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: trimmedName.length > 0 ? trimmedName : null,
        role,
        status: UserStatus.ACTIVE,
        guideProfile:
          params.userType === 'guia'
            ? {
                create: {
                  displayName: trimmedName.length > 0 ? trimmedName : null,
                  cadasturNumber: params.cadasturNumber ?? null,
                  verificationStatus: GuideVerificationStatus.PENDING,
                },
              }
            : undefined,
      },
    });

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.createSession(user.id);

    return {
      user: toBasicProfile(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<LoginResult> {
    const payload = this.verifyRefreshToken(refreshToken);
    const now = new Date();
    const hashedToken = hashToken(payload.sid);

    const session = await this.prismaClient.authSession.findUnique({
      where: { tokenHash: hashedToken },
      include: { user: true },
    });

    if (!session || !session.user || session.userId !== payload.sub) {
      throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }

    if (session.revokedAt) {
      throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token has been revoked');
    }

    if (session.expiresAt.getTime() <= now.getTime()) {
      await this.prismaClient.authSession.update({
        where: { id: session.id },
        data: { revokedAt: now },
      }).catch(() => undefined);
      throw new HttpError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired');
    }

    await this.prismaClient.authSession.update({
      where: { id: session.id },
      data: { revokedAt: now },
    });

    const newRefreshToken = await this.createSession(session.userId);
    const accessToken = this.signAccessToken(session.user);

    return {
      user: toBasicProfile(session.user),
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async getUserProfile(userId: string): Promise<BasicUserProfile | null> {
    if (!userId) {
      return null;
    }

    const user = await this.prismaClient.user.findUnique({
      where: { id: userId },
    });

    return user ? toBasicProfile(user) : null;
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = this.verifyRefreshToken(refreshToken);
      const hashedToken = hashToken(payload.sid);

      await this.prismaClient.authSession.updateMany({
        where: { tokenHash: hashedToken, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof HttpError && error.statusCode >= 500) {
        throw error;
      }
    }
  }
}

export const authService = new AuthService();
