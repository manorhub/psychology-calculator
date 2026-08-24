import type { R2Bucket } from '@cloudflare/workers-types';
import type { StorageService, PutObjectOptions, StorageResult, StorageObjectMetadata } from '@/types/storage';
import { logger } from '@/lib/logger';

export class CloudflareR2Storage implements StorageService {
  private readonly bucket: R2Bucket | null;
  private readonly publicBaseUrl: string;

  constructor(bucket: R2Bucket | null, publicBaseUrl: string = '/storage') {
    this.bucket = bucket;
    this.publicBaseUrl = publicBaseUrl;
  }

  public async put(
    key: string,
    data: ArrayBuffer | Uint8Array | string | Blob | ReadableStream,
    options?: PutObjectOptions
  ): Promise<StorageResult> {
    if (!this.bucket) {
      logger.warn('R2 bucket binding is not available, falling back to noop storage', { key });
      return { key, url: `${this.publicBaseUrl}/${key}`, size: 0 };
    }

    try {
      // Cast to any to cleanly bridge Cloudflare Worker R2PutValue stream overloads
      const result = await this.bucket.put(key, data as any, {
        httpMetadata: {
          contentType: options?.contentType,
          cacheControl: options?.cacheControl
        },
        customMetadata: options?.customMetadata
      });

      return {
        key: result?.key || key,
        url: this.getPublicUrl(key),
        size: result?.size || 0
      };
    } catch (error) {
      logger.error('Failed to put object in R2', { key }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async get(key: string): Promise<{ data: unknown; metadata?: StorageObjectMetadata } | null> {
    if (!this.bucket) {
      return null;
    }

    try {
      const obj = await this.bucket.get(key);
      if (!obj) return null;

      return {
        data: obj.body,
        metadata: {
          key: obj.key,
          size: obj.size,
          etag: obj.etag,
          contentType: obj.httpMetadata?.contentType,
          uploadedAt: obj.uploaded,
          customMetadata: obj.customMetadata
        }
      };
    } catch (error) {
      logger.error('Failed to get object from R2', { key }, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  public async delete(key: string): Promise<boolean> {
    if (!this.bucket) return true;

    try {
      await this.bucket.delete(key);
      return true;
    } catch (error) {
      logger.error('Failed to delete object from R2', { key }, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  public getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${encodeURIComponent(key)}`;
  }
}
