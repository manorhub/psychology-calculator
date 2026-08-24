import type { R2Bucket } from '@cloudflare/workers-types';
import { BaseService } from './base.service';
import type { StorageService, PutObjectOptions, StorageResult, StorageObjectMetadata } from '@/types/storage';
import { CloudflareR2Storage } from '@/lib/storage/r2';

export class AppStorageService extends BaseService implements StorageService {
  private readonly driver: StorageService;

  constructor(bucket: R2Bucket | null) {
    super('StorageService');
    this.driver = new CloudflareR2Storage(bucket);
  }

  public async put(
    key: string,
    data: ArrayBuffer | Uint8Array | string | Blob | ReadableStream,
    options?: PutObjectOptions
  ): Promise<StorageResult> {
    this.logger.info('Storing object in R2', { key, contentType: options?.contentType });
    return this.driver.put(key, data, options);
  }

  public async get(key: string): Promise<{ data: unknown; metadata?: StorageObjectMetadata } | null> {
    return this.driver.get(key);
  }

  public async delete(key: string): Promise<boolean> {
    this.logger.info('Deleting object from R2', { key });
    return this.driver.delete(key);
  }

  public getPublicUrl(key: string): string {
    return this.driver.getPublicUrl(key);
  }
}
