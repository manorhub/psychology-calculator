export interface StorageObjectMetadata {
  key: string;
  size: number;
  etag?: string;
  contentType?: string;
  uploadedAt: Date;
  customMetadata?: Record<string, string>;
}

export interface PutObjectOptions {
  contentType?: string;
  customMetadata?: Record<string, string>;
  cacheControl?: string;
}

export interface StorageResult {
  key: string;
  url?: string;
  size: number;
}

export interface StorageService {
  put(
    key: string,
    data: ArrayBuffer | Uint8Array | string | Blob | ReadableStream,
    options?: PutObjectOptions
  ): Promise<StorageResult>;
  get(key: string): Promise<{ data: unknown; metadata?: StorageObjectMetadata } | null>;
  delete(key: string): Promise<boolean>;
  getPublicUrl(key: string): string;
}
