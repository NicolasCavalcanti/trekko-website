import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

export interface StorageServiceOptions {
  bucket: string;
  basePath?: string;
}

export interface SignedUpload {
  url: string;
  fields: Record<string, string>;
  key: string;
}

export class StorageService {
  private readonly client: S3Client;

  private readonly bucket: string;

  private readonly basePath?: string;

  constructor(config: S3ClientConfig, options: StorageServiceOptions) {
    this.client = new S3Client(config);
    this.bucket = options.bucket;
    this.basePath = options.basePath;
  }

  async createPresignedUpload(contentType: string, expiresInSeconds = 900): Promise<SignedUpload> {
    const keySegments = [this.basePath, randomUUID()].filter(Boolean);
    const key = keySegments.join('/');

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });

    return {
      url,
      fields: {},
      key,
    };
  }
}
