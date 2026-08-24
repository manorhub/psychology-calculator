import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, fetchFirst, executeMutation } from '@/lib/db/query';
import type {
  AuthorRow,
  BlogCategoryRow,
  TagRow,
  ContentCtaRow,
  PageRow
} from '@/types/database';
import { ValidationError } from '@/lib/errors';

export class CmsService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db?: D1Database | null) {
    super('CmsService');
    this.db = db || null;
  }

  // ==========================================================================
  // AUTHORS
  // ==========================================================================

  public async getAuthors(status?: 'active' | 'inactive'): Promise<AuthorRow[]> {
    if (!this.db) return [];
    const query = status
      ? 'SELECT * FROM authors WHERE status = ? ORDER BY name ASC'
      : 'SELECT * FROM authors ORDER BY name ASC';
    const params = status ? [status] : [];
    return executeQuery<AuthorRow>(this.db, query, params);
  }

  public async getAuthorBySlug(slug: string): Promise<AuthorRow | null> {
    if (!this.db) return null;
    return fetchFirst<AuthorRow>(this.db, 'SELECT * FROM authors WHERE slug = ?', [slug]);
  }

  public async upsertAuthor(author: {
    id?: string;
    name: string;
    slug?: string;
    bio?: string;
    avatar_url?: string;
    role_title?: string;
    social_links?: Record<string, string>;
    status?: 'active' | 'inactive';
  }): Promise<string> {
    if (!this.db) throw new ValidationError('Database not configured');
    if (!author.name || !author.name.trim()) throw new ValidationError('Author name is required');

    const id = author.id || crypto.randomUUID();
    const isNew = !author.id;
    const slug =
      author.slug ||
      author.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const status = author.status || 'active';
    const socialLinks = JSON.stringify(author.social_links || {});

    if (isNew) {
      await executeMutation(
        this.db,
        `INSERT INTO authors (id, name, slug, bio, avatar_url, role_title, social_links, status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, author.name.trim(), slug, author.bio || null, author.avatar_url || null, author.role_title || null, socialLinks, status]
      );
    } else {
      await executeMutation(
        this.db,
        `UPDATE authors SET name = ?, slug = ?, bio = ?, avatar_url = ?, role_title = ?, social_links = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [author.name.trim(), slug, author.bio || null, author.avatar_url || null, author.role_title || null, socialLinks, status, id]
      );
    }
    return id;
  }

  // ==========================================================================
  // BLOG CATEGORIES
  // ==========================================================================

  public async getBlogCategories(status?: 'active' | 'inactive'): Promise<BlogCategoryRow[]> {
    if (!this.db) return [];
    const query = status
      ? 'SELECT * FROM blog_categories WHERE status = ? ORDER BY display_order ASC, name ASC'
      : 'SELECT * FROM blog_categories ORDER BY display_order ASC, name ASC';
    const params = status ? [status] : [];
    return executeQuery<BlogCategoryRow>(this.db, query, params);
  }

  public async getBlogCategoryBySlug(slug: string): Promise<BlogCategoryRow | null> {
    if (!this.db) return null;
    return fetchFirst<BlogCategoryRow>(this.db, 'SELECT * FROM blog_categories WHERE slug = ?', [slug]);
  }

  public async upsertBlogCategory(cat: {
    id?: string;
    name: string;
    slug?: string;
    description?: string;
    image_url?: string;
    status?: 'active' | 'inactive';
    display_order?: number;
  }): Promise<string> {
    if (!this.db) throw new ValidationError('Database not configured');
    if (!cat.name || !cat.name.trim()) throw new ValidationError('Category name is required');

    const id = cat.id || crypto.randomUUID();
    const isNew = !cat.id;
    const slug =
      cat.slug ||
      cat.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const status = cat.status || 'active';
    const displayOrder = cat.display_order || 0;

    if (isNew) {
      await executeMutation(
        this.db,
        `INSERT INTO blog_categories (id, name, slug, description, image_url, status, display_order, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, cat.name.trim(), slug, cat.description || null, cat.image_url || null, status, displayOrder]
      );
    } else {
      await executeMutation(
        this.db,
        `UPDATE blog_categories SET name = ?, slug = ?, description = ?, image_url = ?, status = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [cat.name.trim(), slug, cat.description || null, cat.image_url || null, status, displayOrder, id]
      );
    }
    return id;
  }

  // ==========================================================================
  // TAGS
  // ==========================================================================

  public async getTags(): Promise<TagRow[]> {
    if (!this.db) return [];
    return executeQuery<TagRow>(this.db, 'SELECT * FROM tags ORDER BY name ASC');
  }

  public async getTagBySlug(slug: string): Promise<TagRow | null> {
    if (!this.db) return null;
    return fetchFirst<TagRow>(this.db, 'SELECT * FROM tags WHERE slug = ?', [slug]);
  }

  // ==========================================================================
  // CONTENT CTAS
  // ==========================================================================

  public async getContentCtas(status?: 'active' | 'inactive'): Promise<ContentCtaRow[]> {
    if (!this.db) return [];
    const query = status
      ? 'SELECT * FROM content_ctas WHERE status = ? ORDER BY title ASC'
      : 'SELECT * FROM content_ctas ORDER BY title ASC';
    const params = status ? [status] : [];
    return executeQuery<ContentCtaRow>(this.db, query, params);
  }

  public async upsertContentCta(cta: {
    id?: string;
    title: string;
    description?: string;
    button_text: string;
    button_url: string;
    style?: 'indigo' | 'teal' | 'dark' | 'outline';
    status?: 'active' | 'inactive';
  }): Promise<string> {
    if (!this.db) throw new ValidationError('Database not configured');
    if (!cta.title || !cta.button_text || !cta.button_url) {
      throw new ValidationError('Title, button text, and destination URL are required');
    }

    const id = cta.id || crypto.randomUUID();
    const isNew = !cta.id;
    const style = cta.style || 'indigo';
    const status = cta.status || 'active';

    if (isNew) {
      await executeMutation(
        this.db,
        `INSERT INTO content_ctas (id, title, description, button_text, button_url, style, status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, cta.title.trim(), cta.description || null, cta.button_text.trim(), cta.button_url.trim(), style, status]
      );
    } else {
      await executeMutation(
        this.db,
        `UPDATE content_ctas SET title = ?, description = ?, button_text = ?, button_url = ?, style = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [cta.title.trim(), cta.description || null, cta.button_text.trim(), cta.button_url.trim(), style, status, id]
      );
    }
    return id;
  }

  // ==========================================================================
  // STATIC PAGES
  // ==========================================================================

  public async getPageBySlug(slug: string): Promise<PageRow | null> {
    if (!this.db) return null;
    return fetchFirst<PageRow>(
      this.db,
      "SELECT * FROM pages WHERE slug = ? AND status = 'published'",
      [slug]
    );
  }

  public async getAllPagesAdmin(): Promise<PageRow[]> {
    if (!this.db) return [];
    return executeQuery<PageRow>(this.db, 'SELECT * FROM pages ORDER BY title ASC');
  }

  public async upsertPage(page: {
    id?: string;
    title: string;
    slug: string;
    content: string;
    status?: 'draft' | 'published' | 'archived';
    seo_title?: string;
    seo_description?: string;
  }): Promise<string> {
    if (!this.db) throw new ValidationError('Database not configured');
    if (!page.title || !page.slug) throw new ValidationError('Page title and slug are required');

    const id = page.id || crypto.randomUUID();
    const isNew = !page.id;
    const status = page.status || 'published';

    if (isNew) {
      await executeMutation(
        this.db,
        `INSERT INTO pages (id, title, slug, content, status, seo_title, seo_description, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, page.title.trim(), page.slug.trim(), page.content, status, page.seo_title || null, page.seo_description || null]
      );
    } else {
      await executeMutation(
        this.db,
        `UPDATE pages SET title = ?, slug = ?, content = ?, status = ?, seo_title = ?, seo_description = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [page.title.trim(), page.slug.trim(), page.content, status, page.seo_title || null, page.seo_description || null, id]
      );
    }
    return id;
  }
}
