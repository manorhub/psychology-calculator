import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst, executeMutation } from '@/lib/db/query';
import type {
  PostRow,
  PostWithRelations,
  PostStatus,
  TagRow,
  PostVersionRow
} from '@/types/database';
import { generateId } from '@/lib/crypto';
import { ValidationError, NotFoundError } from '@/lib/errors';

export interface PostFilterOptions {
  categorySlug?: string;
  tagSlug?: string;
  search?: string;
  status?: PostStatus;
  page?: number;
  limit?: number;
}

export interface PostListResult {
  posts: PostWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpsertPostInput {
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string | null;
  content: string;
  featured_image_url?: string | null;
  author_id?: string | null;
  category_id?: string | null;
  status?: PostStatus;
  featured?: number;
  reading_time_minutes?: number;
  related_assessment_id?: string | null;
  cta_id?: string | null;
  tags?: string[]; // tag slugs or names
  published_at?: string | null;
}

export class BlogService extends BaseService {
  constructor(db?: D1Database | null) {
    super(db);
  }

  /**
   * Helper to calculate estimated reading time in minutes (avg 200 wpm)
   */
  public calculateReadingTime(text: string): number {
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  /**
   * Generates a URL-friendly slug from title
   */
  public generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Retrieves public published posts with filtering, search, and pagination
   */
  public async getPublishedPosts(options: PostFilterOptions = {}): Promise<PostListResult> {
    if (!this.db) {
      return { posts: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 9));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["p.status = 'published'", "p.published_at <= datetime('now')"];
    const params: any[] = [];

    if (options.categorySlug) {
      conditions.push('c.slug = ?');
      params.push(options.categorySlug);
    }

    if (options.tagSlug) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM post_tags pt
          JOIN tags t ON pt.tag_id = t.id
          WHERE pt.post_id = p.id AND t.slug = ?
        )`
      );
      params.push(options.tagSlug);
    }

    if (options.search && options.search.trim().length > 0) {
      conditions.push('(p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ?)');
      const term = `%${options.search.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.join(' AND ');

    // Total Count
    const countSql = `
      SELECT COUNT(DISTINCT p.id) as count
      FROM posts p
      LEFT JOIN blog_categories c ON p.category_id = c.id
      WHERE ${whereClause}
    `;
    const countResult = await fetchFirst<{ count: number }>(this.db, countSql, params);
    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Query Items
    const listSql = `
      SELECT p.*,
             a.name as author_name, a.slug as author_slug, a.avatar_url as author_avatar, a.role_title as author_role,
             c.name as category_name, c.slug as category_slug,
             asm.name as related_assessment_name, asm.slug as related_assessment_slug,
             cta.title as cta_title, cta.description as cta_desc, cta.button_text as cta_btn_text, cta.button_url as cta_btn_url, cta.style as cta_style
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN blog_categories c ON p.category_id = c.id
      LEFT JOIN assessments asm ON p.related_assessment_id = asm.id
      LEFT JOIN content_ctas cta ON p.cta_id = cta.id
      WHERE ${whereClause}
      ORDER BY p.featured DESC, p.published_at DESC
      LIMIT ? OFFSET ?
    `;

    const posts = await executeQuery<PostWithRelations>(this.db, listSql, [...params, limit, offset]);

    // Attach tags
    for (const post of posts) {
      post.tags = await this.getPostTags(post.id);
    }

    return { posts, total, page, limit, totalPages };
  }

  /**
   * Retrieves single post by slug with full relational data
   */
  public async getPostBySlug(slug: string, allowUnpublished = false): Promise<PostWithRelations | null> {
    if (!this.db) return null;

    let sql = `
      SELECT p.*,
             a.name as author_name, a.slug as author_slug, a.bio as author_bio, a.avatar_url as author_avatar, a.role_title as author_role,
             c.name as category_name, c.slug as category_slug,
             asm.name as related_assessment_name, asm.slug as related_assessment_slug,
             cta.title as cta_title, cta.description as cta_desc, cta.button_text as cta_btn_text, cta.button_url as cta_btn_url, cta.style as cta_style
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN blog_categories c ON p.category_id = c.id
      LEFT JOIN assessments asm ON p.related_assessment_id = asm.id
      LEFT JOIN content_ctas cta ON p.cta_id = cta.id
      WHERE p.slug = ?
    `;

    const params: any[] = [slug];

    if (!allowUnpublished) {
      sql += " AND p.status = 'published' AND p.published_at <= datetime('now')";
    }

    const post = await fetchFirst<PostWithRelations>(this.db, sql, params);
    if (post) {
      post.tags = await this.getPostTags(post.id);
    }
    return post;
  }

  /**
   * Retrieves post by ID
   */
  public async getPostById(id: string): Promise<PostWithRelations | null> {
    if (!this.db) return null;

    const sql = `
      SELECT p.*,
             a.name as author_name, a.slug as author_slug,
             c.name as category_name, c.slug as category_slug
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN blog_categories c ON p.category_id = c.id
      WHERE p.id = ?
    `;

    const post = await fetchFirst<PostWithRelations>(this.db, sql, [id]);
    if (post) {
      post.tags = await this.getPostTags(post.id);
    }
    return post;
  }

  /**
   * Retrieves tags for a specific post
   */
  public async getPostTags(postId: string): Promise<TagRow[]> {
    if (!this.db) return [];
    return executeQuery<TagRow>(
      this.db,
      `SELECT t.* FROM tags t
       JOIN post_tags pt ON t.id = pt.tag_id
       WHERE pt.post_id = ?
       ORDER BY t.name ASC`,
      [postId]
    );
  }

  /**
   * Retrieves spotlight featured post
   */
  public async getFeaturedPost(): Promise<PostWithRelations | null> {
    if (!this.db) return null;

    const sql = `
      SELECT p.*,
             a.name as author_name, a.slug as author_slug, a.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN blog_categories c ON p.category_id = c.id
      WHERE p.status = 'published' AND p.published_at <= datetime('now') AND p.featured = 1
      ORDER BY p.published_at DESC LIMIT 1
    `;

    const post = await fetchFirst<PostWithRelations>(this.db, sql);
    if (post) {
      post.tags = await this.getPostTags(post.id);
    }
    return post;
  }

  /**
   * Retrieves contextual related posts
   */
  public async getRelatedPosts(currentPostId: string, categoryId?: string | null, limit = 3): Promise<PostWithRelations[]> {
    if (!this.db) return [];

    let query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM posts p
      LEFT JOIN blog_categories c ON p.category_id = c.id
      WHERE p.status = 'published' AND p.published_at <= datetime('now') AND p.id != ?
    `;
    const params: any[] = [currentPostId];

    if (categoryId) {
      query += ' AND p.category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY p.published_at DESC LIMIT ?';
    params.push(limit);

    return executeQuery<PostWithRelations>(this.db, query, params);
  }

  /**
   * Admin: List all posts with comprehensive filters
   */
  public async getAdminPosts(options: {
    search?: string;
    status?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PostListResult> {
    if (!this.db) {
      return { posts: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 15));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (options.status && options.status !== 'all') {
      conditions.push('p.status = ?');
      params.push(options.status);
    }

    if (options.categoryId) {
      conditions.push('p.category_id = ?');
      params.push(options.categoryId);
    }

    if (options.search && options.search.trim().length > 0) {
      conditions.push('(p.title LIKE ? OR p.slug LIKE ?)');
      const term = `%${options.search.trim()}%`;
      params.push(term, term);
    }

    const whereClause = conditions.join(' AND ');

    const countSql = `SELECT COUNT(*) as count FROM posts p WHERE ${whereClause}`;
    const countResult = await fetchFirst<{ count: number }>(this.db, countSql, params);
    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    const listSql = `
      SELECT p.*,
             a.name as author_name,
             c.name as category_name
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN blog_categories c ON p.category_id = c.id
      WHERE ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const posts = await executeQuery<PostWithRelations>(this.db, listSql, [...params, limit, offset]);
    return { posts, total, page, limit, totalPages };
  }

  /**
   * Creates or updates a blog post with automatic version snapshotting
   */
  public async upsertPost(input: UpsertPostInput): Promise<string> {
    if (!this.db) throw new ValidationError('Database not configured');

    if (!input.title || input.title.trim().length === 0) {
      throw new ValidationError('Post title is required');
    }
    if (!input.content || input.content.trim().length === 0) {
      throw new ValidationError('Post content cannot be empty');
    }

    const id = input.id || generateId();
    const isNew = !input.id;
    const baseSlug = input.slug ? this.generateSlug(input.slug) : this.generateSlug(input.title);

    // Slug uniqueness check
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await fetchFirst<{ id: string }>(
        this.db,
        'SELECT id FROM posts WHERE slug = ? AND id != ?',
        [slug, id]
      );
      if (!existing) break;
      slug = `${baseSlug}-${counter++}`;
    }

    const readingTime = input.reading_time_minutes || this.calculateReadingTime(input.content);
    const status: PostStatus = input.status || 'draft';
    const publishedAt =
      status === 'published' && !input.published_at
        ? new Date().toISOString()
        : input.published_at || null;

    if (isNew) {
      await executeMutation(
        this.db,
        `INSERT INTO posts (
          id, title, slug, excerpt, content, featured_image_url, author_id, category_id,
          status, featured, reading_time_minutes, related_assessment_id, cta_id, published_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          id,
          input.title.trim(),
          slug,
          input.excerpt?.trim() || null,
          input.content,
          input.featured_image_url || null,
          input.author_id || null,
          input.category_id || null,
          status,
          input.featured ? 1 : 0,
          readingTime,
          input.related_assessment_id || null,
          input.cta_id || null,
          publishedAt
        ]
      );
    } else {
      await executeMutation(
        this.db,
        `UPDATE posts SET
          title = ?, slug = ?, excerpt = ?, content = ?, featured_image_url = ?,
          author_id = ?, category_id = ?, status = ?, featured = ?, reading_time_minutes = ?,
          related_assessment_id = ?, cta_id = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          input.title.trim(),
          slug,
          input.excerpt?.trim() || null,
          input.content,
          input.featured_image_url || null,
          input.author_id || null,
          input.category_id || null,
          status,
          input.featured ? 1 : 0,
          readingTime,
          input.related_assessment_id || null,
          input.cta_id || null,
          publishedAt,
          id
        ]
      );
    }

    // Save lightweight version snapshot
    const versionCount = await fetchFirst<{ count: number }>(
      this.db,
      'SELECT COUNT(*) as count FROM post_versions WHERE post_id = ?',
      [id]
    );
    const nextVer = (versionCount?.count || 0) + 1;

    await executeMutation(
      this.db,
      `INSERT INTO post_versions (id, post_id, version_number, title, content, excerpt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [generateId(), id, nextVer, input.title.trim(), input.content, input.excerpt?.trim() || null]
    );

    // Sync Tags
    if (input.tags) {
      await this.syncPostTags(id, input.tags);
    }

    this.logger.info('Post upserted', { id, slug, status, version: nextVer });
    return id;
  }

  /**
   * Syncs tags for a post, creating new tags if they do not exist
   */
  public async syncPostTags(postId: string, tagNamesOrSlugs: string[]): Promise<void> {
    if (!this.db) return;

    await executeMutation(this.db, 'DELETE FROM post_tags WHERE post_id = ?', [postId]);

    for (const rawTag of tagNamesOrSlugs) {
      const cleanName = rawTag.trim();
      if (!cleanName) continue;
      const tagSlug = this.generateSlug(cleanName);

      let tag = await fetchFirst<TagRow>(this.db, 'SELECT * FROM tags WHERE slug = ?', [tagSlug]);
      if (!tag) {
        const tagId = generateId();
        await executeMutation(
          this.db,
          'INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)',
          [tagId, cleanName, tagSlug]
        );
        tag = { id: tagId, name: cleanName, slug: tagSlug, created_at: new Date().toISOString() };
      }

      await executeMutation(
        this.db,
        'INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)',
        [postId, tag.id]
      );
    }
  }

  /**
   * Deletes a post and cascades tags and versions
   */
  public async deletePost(id: string): Promise<void> {
    if (!this.db) return;
    await executeMutation(this.db, 'DELETE FROM posts WHERE id = ?', [id]);
    this.logger.info('Post deleted', { id });
  }

  /**
   * Duplicates an existing post into a draft
   */
  public async duplicatePost(id: string): Promise<string> {
    if (!this.db) throw new ValidationError('Database not configured');

    const original = await this.getPostById(id);
    if (!original) throw new NotFoundError('Original post not found');

    const newTitle = `${original.title} (Copy)`;
    const newSlug = this.generateSlug(newTitle);
    const newId = generateId();

    const tags = original.tags ? original.tags.map((t) => t.name) : [];

    await this.upsertPost({
      id: newId,
      title: newTitle,
      slug: newSlug,
      excerpt: original.excerpt,
      content: original.content,
      featured_image_url: original.featured_image_url,
      author_id: original.author_id,
      category_id: original.category_id,
      status: 'draft',
      featured: 0,
      reading_time_minutes: original.reading_time_minutes,
      related_assessment_id: original.related_assessment_id,
      cta_id: original.cta_id,
      tags
    });

    this.logger.info('Post duplicated', { originalId: id, newId });
    return newId;
  }
}
