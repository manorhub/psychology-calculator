import type { D1Database } from '@cloudflare/workers-types';
import { BaseService } from '../services/base.service';
import { executeQuery, fetchFirst } from '@/lib/db/query';
import {
  type SupportedLocale,
  DEFAULT_LOCALE,
  SUPPORTED_LANGUAGES,
  normalizeLocale
} from './config';

export interface LanguageRow {
  code: string;
  name: string;
  native_name: string;
  is_default: number;
  is_active: number;
  display_order: number;
  rtl: number;
}

export interface LocalizedAssessmentContent {
  name: string;
  shortDescription: string;
  longDescription?: string | null;
  instructions?: string | null;
  disclaimer?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isFallback: boolean;
}

export interface LocalizedCategoryContent {
  name: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isFallback: boolean;
}

export interface LocalizedDimensionContent {
  name: string;
  description?: string | null;
  isFallback: boolean;
}

export class TranslationsService extends BaseService {
  private readonly db: D1Database | null;

  constructor(db: D1Database | null) {
    super('TranslationsService');
    this.db = db;
  }

  /**
   * Fetches all registered active languages from DB or config fallback
   */
  public async getActiveLanguages(): Promise<LanguageRow[]> {
    if (!this.db) {
      return Object.values(SUPPORTED_LANGUAGES).map((l) => ({
        code: l.code,
        name: l.name,
        native_name: l.nativeName,
        is_default: l.isDefault ? 1 : 0,
        is_active: 1,
        display_order: l.code === 'en' ? 1 : 2,
        rtl: l.dir === 'rtl' ? 1 : 0
      }));
    }

    try {
      const rows = await executeQuery<LanguageRow>(
        this.db,
        'SELECT * FROM languages WHERE is_active = 1 ORDER BY display_order ASC, code ASC'
      );
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      this.logger.warn('Failed to query languages table, falling back to static config', { error: String(err) });
    }

    return Object.values(SUPPORTED_LANGUAGES).map((l) => ({
      code: l.code,
      name: l.name,
      native_name: l.nativeName,
      is_default: l.isDefault ? 1 : 0,
      is_active: 1,
      display_order: 1,
      rtl: l.dir === 'rtl' ? 1 : 0
    }));
  }

  /**
   * Gets localized assessment metadata with fallback to base English row
   */
  public async getLocalizedAssessment(
    assessmentIdOrSlug: string,
    locale: string
  ): Promise<LocalizedAssessmentContent | null> {
    if (!this.db) return null;
    const targetLocale = normalizeLocale(locale);

    // 1. Fetch base assessment
    const base = await fetchFirst<{
      id: string;
      name: string;
      short_description: string;
      long_description: string | null;
      instructions: string | null;
      disclaimer: string | null;
    }>(
      this.db,
      'SELECT id, name, short_description, long_description, instructions, disclaimer FROM assessments WHERE id = ? OR slug = ?',
      [assessmentIdOrSlug, assessmentIdOrSlug]
    );

    if (!base) return null;

    if (targetLocale === DEFAULT_LOCALE) {
      return {
        name: base.name,
        shortDescription: base.short_description,
        longDescription: base.long_description,
        instructions: base.instructions,
        disclaimer: base.disclaimer,
        seoTitle: null,
        seoDescription: null,
        isFallback: false
      };
    }

    // 2. Fetch translation if available
    const trans = await fetchFirst<{
      name: string;
      short_description: string;
      long_description: string | null;
      instructions: string | null;
      disclaimer: string | null;
      seo_title: string | null;
      seo_description: string | null;
    }>(
      this.db,
      'SELECT name, short_description, long_description, instructions, disclaimer, seo_title, seo_description FROM assessment_translations WHERE assessment_id = ? AND locale = ?',
      [base.id, targetLocale]
    );

    if (trans) {
      return {
        name: trans.name || base.name,
        shortDescription: trans.short_description || base.short_description,
        longDescription: trans.long_description || base.long_description,
        instructions: trans.instructions || base.instructions,
        disclaimer: trans.disclaimer || base.disclaimer,
        seoTitle: trans.seo_title,
        seoDescription: trans.seo_description,
        isFallback: false
      };
    }

    // Fallback to base English
    return {
      name: base.name,
      shortDescription: base.short_description,
      longDescription: base.long_description,
      instructions: base.instructions,
      disclaimer: base.disclaimer,
      seoTitle: null,
      seoDescription: null,
      isFallback: true
    };
  }

  /**
   * Gets localized category metadata with fallback to English
   */
  public async getLocalizedCategory(
    categoryIdOrSlug: string,
    locale: string
  ): Promise<LocalizedCategoryContent | null> {
    if (!this.db) return null;
    const targetLocale = normalizeLocale(locale);

    const base = await fetchFirst<{
      id: string;
      name: string;
      description: string | null;
      seo_title: string | null;
      seo_description: string | null;
    }>(
      this.db,
      'SELECT id, name, description, seo_title, seo_description FROM assessment_categories WHERE id = ? OR slug = ?',
      [categoryIdOrSlug, categoryIdOrSlug]
    );

    if (!base) return null;

    if (targetLocale === DEFAULT_LOCALE) {
      return {
        name: base.name,
        description: base.description,
        seoTitle: base.seo_title,
        seoDescription: base.seo_description,
        isFallback: false
      };
    }

    const trans = await fetchFirst<{
      name: string;
      description: string | null;
      seo_title: string | null;
      seo_description: string | null;
    }>(
      this.db,
      'SELECT name, description, seo_title, seo_description FROM assessment_category_translations WHERE category_id = ? AND locale = ?',
      [base.id, targetLocale]
    );

    if (trans) {
      return {
        name: trans.name || base.name,
        description: trans.description || base.description,
        seoTitle: trans.seo_title || base.seo_title,
        seoDescription: trans.seo_description || base.seo_description,
        isFallback: false
      };
    }

    return {
      name: base.name,
      description: base.description,
      seoTitle: base.seo_title,
      seoDescription: base.seo_description,
      isFallback: true
    };
  }

  /**
   * Gets localized dimension metadata with fallback to English
   */
  public async getLocalizedDimension(
    dimensionId: string,
    locale: string
  ): Promise<LocalizedDimensionContent | null> {
    if (!this.db) return null;
    const targetLocale = normalizeLocale(locale);

    const base = await fetchFirst<{ id: string; name: string; description: string | null }>(
      this.db,
      'SELECT id, name, description FROM assessment_dimensions WHERE id = ?',
      [dimensionId]
    );

    if (!base) return null;

    if (targetLocale === DEFAULT_LOCALE) {
      return { name: base.name, description: base.description, isFallback: false };
    }

    const trans = await fetchFirst<{ name: string; description: string | null }>(
      this.db,
      'SELECT name, description FROM assessment_dimension_translations WHERE dimension_id = ? AND locale = ?',
      [base.id, targetLocale]
    );

    if (trans) {
      return { name: trans.name || base.name, description: trans.description || base.description, isFallback: false };
    }

    return { name: base.name, description: base.description, isFallback: true };
  }

  /**
   * Gets map of localized question texts for an assessment
   */
  public async getLocalizedQuestionsMap(
    assessmentId: string,
    locale: string
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!this.db) return map;
    const targetLocale = normalizeLocale(locale);
    if (targetLocale === DEFAULT_LOCALE) return map;

    try {
      const rows = await executeQuery<{ question_id: string; question_text: string }>(
        this.db,
        `SELECT aqt.question_id, aqt.question_text 
         FROM assessment_question_translations aqt
         JOIN assessment_questions aq ON aqt.question_id = aq.id
         WHERE aq.assessment_id = ? AND aqt.locale = ?`,
        [assessmentId, targetLocale]
      );
      for (const r of rows) {
        map.set(r.question_id, r.question_text);
      }
    } catch (err) {
      this.logger.warn('Failed to load question translations', { error: String(err) });
    }

    return map;
  }
}
