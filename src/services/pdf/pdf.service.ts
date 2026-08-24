import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { BaseService } from '../base.service';
import { executeQuery, executeMutation, fetchFirst } from '@/lib/db/query';
import { AppStorageService } from '../storage.service';
import { ResultService } from '../result.service';
import { PdfDocumentBuilder, type DimensionScoreData, type SectionContentData } from './pdf-builder';
import { NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import type { User } from '@/types/auth';

export interface GeneratedFileRow {
  id: string;
  user_id: string | null;
  attempt_id: string | null;
  report_id: string | null;
  file_type: 'basic_result' | 'ai_report';
  r2_key: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  version: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export class PdfService extends BaseService {
  private readonly db: D1Database | null;
  private readonly storageService: AppStorageService;
  private readonly resultService: ResultService;

  constructor(db: D1Database | null, bucket: R2Bucket | null) {
    super('PdfService');
    this.db = db;
    this.storageService = new AppStorageService(bucket);
    this.resultService = new ResultService(db);
  }

  /**
   * Generates and stores a Basic Result PDF
   */
  public async generateResultPdf(
    attemptId: string,
    options?: { userDisplayName?: string }
  ): Promise<{ fileRecord: GeneratedFileRow; pdfBytes: Uint8Array }> {
    if (!this.db) throw new Error('Database unavailable');

    this.logger.info('Generating Basic Result PDF', { attemptId });

    // 1. Fetch Attempt and Frozen Snapshot
    const attempt = await fetchFirst<{
      id: string;
      user_id: string | null;
      assessment_id: string;
      session_id: string;
      status: string;
      completed_at: string;
      created_at: string;
      user_name?: string;
    }>(
      this.db,
      `SELECT a.*, p.display_name as user_name 
       FROM assessment_attempts a
       LEFT JOIN profiles p ON a.user_id = p.user_id
       WHERE a.id = ?`,
      [attemptId]
    );

    if (!attempt) throw new NotFoundError('Assessment attempt not found');
    if (attempt.status !== 'completed') {
      throw new ValidationError('PDF report can only be generated for completed assessments');
    }

    const snapshot = await this.resultService.createOrGetSnapshot(attemptId);
    
    // Load dynamic PDF settings
    const settingRows = await executeQuery<{ key: string; value: string }>(
      this.db,
      'SELECT key, value FROM site_settings'
    );
    const settings: Record<string, string> = {};
    for (const s of settingRows) {
      settings[s.key] = s.value;
    }

    // 2. Build PDF Document
    const builder = new PdfDocumentBuilder({
      brandName: settings.pdf_brand_name || 'Psychology Calculator',
      brandDomain: settings.pdf_brand_domain || 'psychologycalculator.com',
      primaryColor: settings.pdf_primary_color || '#4f46e5',
      secondaryColor: settings.pdf_secondary_color || '#0ea5e9',
      footerText: settings.pdf_footer_text || 'Psychology Calculator — Official Psychometric Evaluation Report',
      disclaimerText: snapshot.disclaimer || settings.pdf_disclaimer
    });

    const displayName = options?.userDisplayName || attempt.user_name || 'Guest Participant';
    const reportDate = new Date(attempt.completed_at || attempt.created_at).toLocaleDateString('en-US', {
      dateStyle: 'long'
    });

    await builder.initialize(`${snapshot.assessmentName} - Result Report`, 'Psychology Calculator');

    // Header & Title
    builder.addHeader('Psychological Evaluation', snapshot.assessmentName);
    builder.addTitleBlock(snapshot.assessmentName, 'Psychological Evaluation', displayName, reportDate);

    // Primary Outcome Card
    builder.addOutcomeCard(
      snapshot.primaryResultType?.name || 'Psychological Outcome',
      snapshot.totalNormalizedScore || 0,
      snapshot.primaryResultType?.description || 'Standardized psychometric outcome calculated from verified item responses.'
    );

    // Dimensional Scores Breakdown
    if (snapshot.dimensionScores && snapshot.dimensionScores.length > 0) {
      const dimData: DimensionScoreData[] = snapshot.dimensionScores.map((d) => ({
        name: d.dimensionName,
        normalizedScore: d.normalizedScore,
        rawScore: d.rawScore,
        maxScore: d.maxScore
      }));
      builder.addDimensionScores(dimData);
    }

    // Modular Narrative Sections
    if (snapshot.primaryResultType?.contents && snapshot.primaryResultType.contents.length > 0) {
      builder.addSectionHeader('Psychological Interpretation');
      const secData: SectionContentData[] = snapshot.primaryResultType.contents.map((s) => ({
        title: s.title,
        content: s.content
      }));
      builder.addContentSections(secData);
    }

    // Disclaimer
    builder.addDisclaimer(snapshot.disclaimer || undefined);

    // Compile Bytes
    const pdfBytes = await builder.save();
    const r2Key = `reports/results/${attemptId}.pdf`;
    const safeSlug = snapshot.assessmentSlug || 'assessment';
    const fileName = `psychology-calculator-${safeSlug}-result.pdf`;

    // 3. Upload to Cloudflare R2
    await this.storageService.put(r2Key, pdfBytes, {
      contentType: 'application/pdf',
      customMetadata: {
        attemptId,
        fileType: 'basic_result',
        userId: attempt.user_id || 'guest'
      }
    });

    // 4. Upsert in D1 generated_files ledger
    const fileId = crypto.randomUUID();
    await executeMutation(
      this.db,
      `INSERT INTO generated_files (
         id, user_id, attempt_id, report_id, file_type, r2_key, file_name, mime_type, file_size, version, status, updated_at
       ) VALUES (?, ?, ?, NULL, 'basic_result', ?, ?, 'application/pdf', ?, 1, 'completed', CURRENT_TIMESTAMP)
       ON CONFLICT(attempt_id, file_type) DO UPDATE SET
         r2_key = excluded.r2_key,
         file_name = excluded.file_name,
         file_size = excluded.file_size,
         version = generated_files.version + 1,
         status = 'completed',
         error_message = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [fileId, attempt.user_id, attemptId, r2Key, fileName, pdfBytes.byteLength]
    );

    const record = await fetchFirst<GeneratedFileRow>(
      this.db,
      `SELECT * FROM generated_files WHERE attempt_id = ? AND file_type = 'basic_result'`,
      [attemptId]
    );

    this.logger.info('Basic Result PDF generated and stored', { attemptId, r2Key, size: pdfBytes.byteLength });

    return { fileRecord: record!, pdfBytes };
  }

  /**
   * Generates and stores a Detailed AI Report PDF
   */
  public async generateAiReportPdf(
    reportId: string,
    options?: { userDisplayName?: string }
  ): Promise<{ fileRecord: GeneratedFileRow; pdfBytes: Uint8Array }> {
    if (!this.db) throw new Error('Database unavailable');

    this.logger.info('Generating AI Report PDF', { reportId });

    // 1. Fetch AI Report and underlying attempt
    const report = await fetchFirst<{
      id: string;
      user_id: string;
      attempt_id: string;
      title: string;
      summary: string | null;
      content: string | null;
      status: string;
      generated_at: string | null;
      created_at: string;
      user_name?: string;
    }>(
      this.db,
      `SELECT r.*, p.display_name as user_name
       FROM reports r
       LEFT JOIN profiles p ON r.user_id = p.user_id
       WHERE r.id = ?`,
      [reportId]
    );

    if (!report) throw new NotFoundError('AI report not found');

    const snapshot = await this.resultService.createOrGetSnapshot(report.attempt_id);
    
    // Load dynamic PDF settings
    const settingRows = await executeQuery<{ key: string; value: string }>(
      this.db,
      'SELECT key, value FROM site_settings'
    );
    const settings: Record<string, string> = {};
    for (const s of settingRows) {
      settings[s.key] = s.value;
    }

    // 2. Parse AI Report structured output or fallbacks
    let aiContent: any = {};
    const rawContent = (report as any).content_data || report.content;
    if (rawContent) {
      try {
        aiContent = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
      } catch {
        aiContent = { executive_summary: rawContent };
      }
    }

    const executiveSummary = aiContent.executive_summary || report.summary || 'Comprehensive psychological narrative report.';
    const keyTraits: string[] = Array.isArray(aiContent.key_traits) ? aiContent.key_traits : [];
    const cognitiveStrengths: string[] = Array.isArray(aiContent.cognitive_strengths) ? aiContent.cognitive_strengths : [];
    const growthOpportunities: string[] = Array.isArray(aiContent.growth_opportunities) ? aiContent.growth_opportunities : [];
    const dailyPractices: string[] = Array.isArray(aiContent.daily_practices) ? aiContent.daily_practices : [];

    // 3. Build PDF Document
    const builder = new PdfDocumentBuilder({
      brandName: settings.pdf_brand_name || 'Psychology Calculator',
      brandDomain: settings.pdf_brand_domain || 'psychologycalculator.com',
      primaryColor: settings.pdf_primary_color || '#4f46e5',
      secondaryColor: settings.pdf_secondary_color || '#0ea5e9',
      footerText: settings.pdf_footer_text || 'Psychology Calculator — Official Psychometric Evaluation Report',
      disclaimerText: snapshot.disclaimer || settings.pdf_disclaimer
    });

    const displayName = options?.userDisplayName || report.user_name || 'Evaluated Client';
    const reportDate = new Date(report.generated_at || report.created_at).toLocaleDateString('en-US', {
      dateStyle: 'long'
    });

    await builder.initialize(`${snapshot.assessmentName} - Detailed AI Psychological Report`, 'Psychology Calculator');

    // Header & Title
    builder.addHeader('Comprehensive AI Evaluation', snapshot.assessmentName);
    builder.addTitleBlock(
      `${snapshot.assessmentName} — Detailed Interpretation Report`,
      'Comprehensive AI Evaluation',
      displayName,
      reportDate
    );

    // Primary Outcome Card
    builder.addOutcomeCard(
      snapshot.primaryResultType?.name || 'Psychological Classification',
      snapshot.totalNormalizedScore || 0,
      snapshot.primaryResultType?.description || 'Standardized baseline assessment outcome.'
    );

    // Executive Summary
    builder.addSectionHeader('Executive Psychological Synthesis');
    builder.addContentSections([{ title: '', content: executiveSummary }]);

    // Key Trait Pills
    if (keyTraits.length > 0) {
      builder.addTraitPills(keyTraits);
    }

    // Dimensional Scores Breakdown
    if (snapshot.dimensionScores && snapshot.dimensionScores.length > 0) {
      const dimData: DimensionScoreData[] = snapshot.dimensionScores.map((d) => ({
        name: d.dimensionName,
        normalizedScore: d.normalizedScore,
        rawScore: d.rawScore,
        maxScore: d.maxScore
      }));
      builder.addDimensionScores(dimData);
    }

    // Cognitive Strengths
    if (cognitiveStrengths.length > 0) {
      builder.addBulletListCard('Core Cognitive & Behavioral Strengths', cognitiveStrengths, 'strengths');
    }

    // Growth Opportunities & Potential Blindspots
    if (growthOpportunities.length > 0) {
      builder.addBulletListCard('Growth Opportunities & Stress Vulnerabilities', growthOpportunities, 'challenges');
    }

    // Relational / Communication Domains
    if (aiContent.relational_patterns) {
      builder.addSectionHeader('Interpersonal & Communication Dynamics');
      builder.addContentSections([{ title: '', content: aiContent.relational_patterns }]);
    }

    // Actionable Recommendations
    if (dailyPractices.length > 0) {
      builder.addBulletListCard('Actionable Daily Practices & Recommendations', dailyPractices, 'recommendations');
    }

    // Disclaimer
    builder.addDisclaimer(snapshot.disclaimer || undefined);

    // Compile Bytes
    const pdfBytes = await builder.save();
    const r2Key = `reports/ai/${reportId}.pdf`;
    const safeSlug = snapshot.assessmentSlug || 'assessment';
    const fileName = `psychology-calculator-${safeSlug}-detailed-report.pdf`;

    // 4. Upload to Cloudflare R2
    await this.storageService.put(r2Key, pdfBytes, {
      contentType: 'application/pdf',
      customMetadata: {
        reportId,
        attemptId: report.attempt_id,
        fileType: 'ai_report',
        userId: report.user_id
      }
    });

    // 5. Upsert in D1 generated_files ledger
    const fileId = crypto.randomUUID();
    await executeMutation(
      this.db,
      `INSERT INTO generated_files (
         id, user_id, attempt_id, report_id, file_type, r2_key, file_name, mime_type, file_size, version, status, updated_at
       ) VALUES (?, ?, ?, ?, 'ai_report', ?, ?, 'application/pdf', ?, 1, 'completed', CURRENT_TIMESTAMP)
       ON CONFLICT(report_id, file_type) DO UPDATE SET
         r2_key = excluded.r2_key,
         file_name = excluded.file_name,
         file_size = excluded.file_size,
         version = generated_files.version + 1,
         status = 'completed',
         error_message = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [fileId, report.user_id, report.attempt_id, reportId, r2Key, fileName, pdfBytes.byteLength]
    );

    const record = await fetchFirst<GeneratedFileRow>(
      this.db,
      `SELECT * FROM generated_files WHERE report_id = ? AND file_type = 'ai_report'`,
      [reportId]
    );

    this.logger.info('AI Report PDF generated and stored', { reportId, r2Key, size: pdfBytes.byteLength });

    return { fileRecord: record!, pdfBytes };
  }

  /**
   * Idempotently gets or generates a Basic Result PDF with ownership authorization
   */
  public async getOrGenerateResultPdf(
    attemptId: string,
    user: User | null,
    sessionId?: string
  ): Promise<{ fileRecord: GeneratedFileRow; pdfBytes: Uint8Array }> {
    if (!this.db) throw new Error('Database unavailable');

    // 1. Authorize access to attempt
    const attempt = await fetchFirst<{
      id: string;
      user_id: string | null;
      session_id: string;
    }>(this.db, 'SELECT id, user_id, session_id FROM assessment_attempts WHERE id = ?', [attemptId]);

    if (!attempt) throw new NotFoundError('Assessment attempt not found');

    if (attempt.user_id) {
      if (!user || user.id !== attempt.user_id) {
        throw new UnauthorizedError('You are not authorized to download this report');
      }
    } else {
      if (!sessionId || attempt.session_id !== sessionId) {
        throw new UnauthorizedError('Unauthorized access to guest assessment attempt');
      }
    }

    // 2. Check if file already exists in D1 and R2
    const existing = await fetchFirst<GeneratedFileRow>(
      this.db,
      `SELECT * FROM generated_files WHERE attempt_id = ? AND file_type = 'basic_result' AND status = 'completed'`,
      [attemptId]
    );

    const userDisplayName = user?.profile?.displayName || undefined;

    if (existing) {
      const obj = await this.storageService.get(existing.r2_key);
      if (obj && obj.data) {
        let pdfBytes: Uint8Array;
        if (obj.data instanceof Uint8Array) {
          pdfBytes = obj.data;
        } else if (obj.data instanceof ArrayBuffer) {
          pdfBytes = new Uint8Array(obj.data);
        } else if (typeof (obj.data as any).arrayBuffer === 'function') {
          const buf = await (obj.data as any).arrayBuffer();
          pdfBytes = new Uint8Array(buf);
        } else {
          // Generate fresh if stream format unrecognized
          return this.generateResultPdf(attemptId, { userDisplayName });
        }
        return { fileRecord: existing, pdfBytes };
      }
    }

    // 3. Generate fresh
    return this.generateResultPdf(attemptId, { userDisplayName });
  }

  /**
   * Idempotently gets or generates an AI Report PDF with ownership authorization
   */
  public async getOrGenerateAiReportPdf(
    reportId: string,
    user: User | null
  ): Promise<{ fileRecord: GeneratedFileRow; pdfBytes: Uint8Array }> {
    if (!this.db) throw new Error('Database unavailable');

    // 1. Authorize access to report
    const report = await fetchFirst<{
      id: string;
      user_id: string;
    }>(this.db, 'SELECT id, user_id FROM reports WHERE id = ?', [reportId]);

    if (!report) throw new NotFoundError('Report not found');

    if (!user || (user.id !== report.user_id && (user.role as string) !== 'admin')) {
      throw new UnauthorizedError('You are not authorized to download this AI report');
    }

    const userDisplayName = user?.profile?.displayName || undefined;

    // 2. Check if file already exists in D1 and R2
    const existing = await fetchFirst<GeneratedFileRow>(
      this.db,
      `SELECT * FROM generated_files WHERE report_id = ? AND file_type = 'ai_report' AND status = 'completed'`,
      [reportId]
    );

    if (existing) {
      const obj = await this.storageService.get(existing.r2_key);
      if (obj && obj.data) {
        let pdfBytes: Uint8Array;
        if (obj.data instanceof Uint8Array) {
          pdfBytes = obj.data;
        } else if (obj.data instanceof ArrayBuffer) {
          pdfBytes = new Uint8Array(obj.data);
        } else if (typeof (obj.data as any).arrayBuffer === 'function') {
          const buf = await (obj.data as any).arrayBuffer();
          pdfBytes = new Uint8Array(buf);
        } else {
          return this.generateAiReportPdf(reportId, { userDisplayName });
        }
        return { fileRecord: existing, pdfBytes };
      }
    }

    // 3. Generate fresh
    return this.generateAiReportPdf(reportId, { userDisplayName });
  }

  /**
   * Lists generated files for Admin auditing
   */
  public async listGeneratedFiles(limit = 100): Promise<any[]> {
    if (!this.db) return [];

    return executeQuery<any>(
      this.db,
      `SELECT 
         f.*,
         u.email as user_email,
         p.display_name as user_name,
         asm.name as assessment_name,
         asm.slug as assessment_slug
       FROM generated_files f
       LEFT JOIN users u ON f.user_id = u.id
       LEFT JOIN profiles p ON f.user_id = p.user_id
       LEFT JOIN assessment_attempts a ON f.attempt_id = a.id
       LEFT JOIN assessments asm ON a.assessment_id = asm.id
       ORDER BY f.created_at DESC LIMIT ?`,
      [limit]
    );
  }

  /**
   * Deletes a generated PDF from R2 and updates D1
   */
  public async deletePdf(fileId: string): Promise<boolean> {
    if (!this.db) return false;

    const file = await fetchFirst<GeneratedFileRow>(
      this.db,
      'SELECT * FROM generated_files WHERE id = ?',
      [fileId]
    );
    if (!file) return false;

    await this.storageService.delete(file.r2_key);
    await executeMutation(this.db, 'DELETE FROM generated_files WHERE id = ?', [fileId]);

    this.logger.info('Deleted generated PDF', { fileId, r2Key: file.r2_key });
    return true;
  }
}
