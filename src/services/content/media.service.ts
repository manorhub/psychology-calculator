import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst, executeMutation } from '@/lib/db/query';
import type { MediaItemRow } from '@/types/database';
import { AppStorageService } from '../storage.service';
import { generateId } from '@/lib/crypto';
import { ValidationError, NotFoundError } from '@/lib/errors';

export const ALLOWED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif'
];

export const MAX_MEDIA_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadMediaInput {
  filename: string;
  data: ArrayBuffer | Uint8Array;
  mimeType: string;
  altText?: string;
  caption?: string;
}

export class MediaService extends BaseService {
  private readonly storage: AppStorageService;

  constructor(db?: D1Database | null, bucket?: R2Bucket | null) {
    super(db);
    this.storage = new AppStorageService(bucket || null);
  }

  /**
   * Validates and uploads media to R2 and indexes metadata in D1
   */
  public async uploadMedia(input: UploadMediaInput): Promise<MediaItemRow> {
    if (!this.db) throw new ValidationError('Database not configured');

    if (!ALLOWED_MEDIA_MIME_TYPES.includes(input.mimeType.toLowerCase())) {
      throw new ValidationError(
        `Unsupported media type: ${input.mimeType}. Allowed formats: JPEG, PNG, WebP, SVG, GIF`
      );
    }

    const byteLength = input.data.byteLength;
    if (byteLength > MAX_MEDIA_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `File size exceeds limit (${(byteLength / (1024 * 1024)).toFixed(2)} MB > 5 MB)`
      );
    }

    const id = generateId();
    const safeFilename = input.filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
    const r2Key = `media/${id}-${safeFilename}`;

    // Upload to Cloudflare R2
    await this.storage.put(r2Key, input.data, {
      contentType: input.mimeType,
      customMetadata: {
        altText: input.altText || '',
        originalName: input.filename
      }
    });

    // Record in D1 Ledger
    await executeMutation(
      this.db,
      `INSERT INTO media_items (id, filename, r2_key, mime_type, file_size, alt_text, caption)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.filename,
        r2Key,
        input.mimeType,
        byteLength,
        input.altText || null,
        input.caption || null
      ]
    );

    this.logger.info('Media uploaded and indexed', { id, r2Key, size: byteLength });

    return {
      id,
      filename: input.filename,
      r2_key: r2Key,
      mime_type: input.mimeType,
      file_size: byteLength,
      alt_text: input.altText || null,
      caption: input.caption || null,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Retrieves paginated media items
   */
  public async getMediaItems(limit = 20, offset = 0): Promise<{ items: MediaItemRow[]; total: number }> {
    if (!this.db) return { items: [], total: 0 };

    const countRes = await fetchFirst<{ count: number }>(
      this.db,
      'SELECT COUNT(*) as count FROM media_items'
    );
    const total = countRes?.count || 0;

    const items = await executeQuery<MediaItemRow>(
      this.db,
      'SELECT * FROM media_items ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return { items, total };
  }

  /**
   * Deletes media from R2 and removes D1 ledger entry
   */
  public async deleteMedia(id: string): Promise<void> {
    if (!this.db) return;

    const item = await fetchFirst<MediaItemRow>(
      this.db,
      'SELECT * FROM media_items WHERE id = ?',
      [id]
    );
    if (!item) throw new NotFoundError('Media item not found');

    await this.storage.delete(item.r2_key);
    await executeMutation(this.db, 'DELETE FROM media_items WHERE id = ?', [id]);
    this.logger.info('Media item deleted', { id, r2Key: item.r2_key });
  }

  /**
   * Resolves public media URL for an R2 key or relative path
   */
  public getPublicMediaUrl(r2Key: string): string {
    return this.storage.getPublicUrl(r2Key);
  }
}
