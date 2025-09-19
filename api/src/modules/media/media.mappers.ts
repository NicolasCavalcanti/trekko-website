import type { Media } from '@prisma/client';

export type MediaSummary = {
  id: string;
  trailId: string | null;
  key: string;
  fileName: string | null;
  contentType: string | null;
  size: number | null;
  title: string | null;
  description: string | null;
  order: number | null;
  publicUrl: string | null;
  uploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const toMediaSummary = (media: Media): MediaSummary => ({
  id: media.id,
  trailId: media.trailId ?? null,
  key: media.key,
  fileName: media.fileName ?? null,
  contentType: media.contentType ?? null,
  size: media.size ?? null,
  title: media.title ?? null,
  description: media.description ?? null,
  order: media.order ?? null,
  publicUrl: media.publicUrl ?? null,
  uploadedAt: media.uploadedAt ? media.uploadedAt.toISOString() : null,
  createdAt: media.createdAt.toISOString(),
  updatedAt: media.updatedAt.toISOString(),
});
