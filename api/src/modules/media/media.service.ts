import { HttpError } from '../../middlewares/error';
import { prisma, type PrismaClientInstance } from '../../services/prisma';
import {
  StorageService,
  createStorageServiceFromEnv,
} from '../../services/storage';
import { audit } from '../audit/audit.service';
import { toMediaSummary, type MediaSummary } from './media.mappers';
import type { CreateTrailMediaBody } from './media.schemas';

export type ActorContext = {
  actorId?: string | null;
  roles: string[];
};

export type RequestContext = {
  ip?: string | null;
  userAgent?: string | null;
};

export type PresignedUploadResult = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
};

export type TrailMediaUploadResult = {
  media: MediaSummary;
  upload: PresignedUploadResult;
};

const normalizeRoles = (roles: string[]): Set<string> => {
  return new Set(roles.map((role) => role.trim().toUpperCase()).filter((role) => role.length > 0));
};

const sanitizeNullableText = (value?: string): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export class AdminMediaService {
  private storageService?: StorageService;

  constructor(
    private readonly prismaClient: PrismaClientInstance = prisma,
    private readonly storageFactory: () => StorageService = () => createStorageServiceFromEnv(),
  ) {}

  private getStorage(): StorageService {
    if (!this.storageService) {
      try {
        this.storageService = this.storageFactory();
      } catch (error) {
        throw new HttpError(500, 'STORAGE_NOT_CONFIGURED', 'Storage service is not configured');
      }
    }

    return this.storageService;
  }

  async createTrailMediaUpload(
    actor: ActorContext,
    trailId: string,
    input: CreateTrailMediaBody,
    context: RequestContext,
  ): Promise<TrailMediaUploadResult> {
    const roles = normalizeRoles(actor.roles);

    if (!(roles.has('ADMIN') || roles.has('EDITOR') || roles.has('OPERADOR'))) {
      throw new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role');
    }

    const trail = await this.prismaClient.trail.findFirst({
      where: {
        id: trailId,
        deletedAt: null,
      },
    });

    if (!trail) {
      throw new HttpError(404, 'TRAIL_NOT_FOUND', 'Trail not found');
    }

    const storage = this.getStorage();
    const fileName = sanitizeNullableText(input.fileName) ?? undefined;

    const upload = await storage.createPresignedUpload(input.contentType, {
      fileName,
    });

    const mediaCount = await this.prismaClient.media.count({
      where: {
        trailId,
        deletedAt: null,
      },
    });

    const createdMedia = await this.prismaClient.media.create({
      data: {
        trailId,
        key: upload.key,
        fileName: sanitizeNullableText(input.fileName),
        contentType: sanitizeNullableText(input.contentType) ?? null,
        size: input.size ?? null,
        title: sanitizeNullableText(input.title),
        description: sanitizeNullableText(input.description),
        order: mediaCount + 1,
        publicUrl: upload.publicUrl,
        uploadedAt: null,
      },
    });

    const mediaSummary = toMediaSummary(createdMedia);

    await audit({
      userId: actor.actorId,
      entity: 'trail_media',
      entityId: createdMedia.id,
      action: 'TRAIL_MEDIA_CREATE',
      diff: {
        trailId,
        mediaId: createdMedia.id,
        key: createdMedia.key,
        order: createdMedia.order,
        contentType: createdMedia.contentType,
        size: createdMedia.size,
      },
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return {
      media: mediaSummary,
      upload,
    };
  }

  async deleteMedia(actor: ActorContext, mediaId: string, context: RequestContext): Promise<void> {
    const roles = normalizeRoles(actor.roles);

    if (!(roles.has('ADMIN') || roles.has('EDITOR'))) {
      throw new HttpError(403, 'INSUFFICIENT_ROLE', 'User lacks required role');
    }

    const now = new Date();

    const result = await this.prismaClient.$transaction(async (tx) => {
      const media = await tx.media.findFirst({
        where: {
          id: mediaId,
          deletedAt: null,
        },
      });

      if (!media) {
        throw new HttpError(404, 'MEDIA_NOT_FOUND', 'Media not found');
      }

      await tx.media.update({
        where: { id: mediaId },
        data: { deletedAt: now },
      });

      if (media.trailId) {
        const remaining = await tx.media.findMany({
          where: {
            trailId: media.trailId,
            deletedAt: null,
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        });

        let order = 1;
        for (const item of remaining) {
          if (item.order !== order) {
            await tx.media.update({
              where: { id: item.id },
              data: { order },
            });
          }
          order += 1;
        }
      }

      return media;
    });

    await audit({
      userId: actor.actorId,
      entity: 'trail_media',
      entityId: result.id,
      action: 'TRAIL_MEDIA_DELETE',
      diff: {
        trailId: result.trailId,
        key: result.key,
      },
      ip: context.ip,
      userAgent: context.userAgent,
    });
  }
}

export const adminMediaService = new AdminMediaService();
