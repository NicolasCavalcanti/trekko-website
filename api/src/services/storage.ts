import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

export interface StorageServiceOptions {
  bucket: string;
  basePath?: string;
  publicBaseUrl?: string;
}

export interface PresignedUpload {
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

export interface CreatePresignedUploadOptions {
  expiresInSeconds?: number;
  fileName?: string;
  metadata?: Record<string, string>;
  contentDisposition?: string;
}

export class StorageService {
  private readonly client: S3Client;

  private readonly bucket: string;

  private readonly basePath?: string;

  private readonly publicBaseUrl?: string;

  constructor(config: S3ClientConfig, options: StorageServiceOptions) {
    this.client = new S3Client(config);
    this.bucket = options.bucket;
    this.basePath = options.basePath;
    this.publicBaseUrl = options.publicBaseUrl;
  }

  private buildObjectKey(fileName?: string): string {
    const extension = fileName ? extname(fileName).toLowerCase() : '';
    const sanitizedExtension = extension.replace(/[^a-z0-9.]/g, '');
    const uniqueName = `${randomUUID()}${sanitizedExtension}`;
    const segments = [this.basePath, uniqueName].filter((segment): segment is string => Boolean(segment && segment.length > 0));

    return segments.join('/');
  }

  private buildPublicUrl(key: string): string {
    if (this.publicBaseUrl) {
      const trimmed = this.publicBaseUrl.replace(/\/+$|^\/+/, '');
      if (trimmed.length === 0) {
        return `https://${this.bucket}.s3.amazonaws.com/${key}`;
      }

      return `${trimmed}/${key}`;
    }

    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async createPresignedUpload(
    contentType: string,
    options: CreatePresignedUploadOptions = {},
  ): Promise<PresignedUpload> {
    const key = this.buildObjectKey(options.fileName);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      Metadata: options.metadata,
      ContentDisposition: options.contentDisposition,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: options.expiresInSeconds ?? 900,
    });

    return {
      key,
      uploadUrl,
      publicUrl: this.buildPublicUrl(key),
    };
  }
}

export const createStorageServiceFromEnv = (): StorageService => {
  const bucket = process.env.STORAGE_BUCKET;

  if (!bucket) {
    throw new Error('STORAGE_BUCKET is not configured');
  }

  const region = process.env.STORAGE_REGION ?? 'auto';
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  const basePath = process.env.STORAGE_BASE_PATH;
  const publicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;
  const forcePathStyle = process.env.STORAGE_FORCE_PATH_STYLE === 'true';

  const config: S3ClientConfig = {
    region,
  };

  if (endpoint) {
    config.endpoint = endpoint;
  }

  if (accessKeyId && secretAccessKey) {
    config.credentials = { accessKeyId, secretAccessKey };
  }

  if (forcePathStyle) {
    config.forcePathStyle = true;
  }

  return new StorageService(config, {
    bucket,
    basePath,
    publicBaseUrl,
  });
};
