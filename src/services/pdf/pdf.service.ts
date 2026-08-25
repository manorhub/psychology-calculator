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
        aiContent = { summary: rawContent };
      }
    }

    const executiveSummary = aiContent.summary || aiContent.executive_summary || report.summary || 'Comprehensive psychological narrative report.';
    const headline = aiContent.headline || snapshot.primaryResultType?.description || undefined;
    const keyTraits: string[] = Array.isArray(aiContent.key_traits) ? aiContent.key_traits : [];
    const dimensionAnalyses = Array.isArray(aiContent.dimension_analyses) ? aiContent.dimension_analyses : [];
    const interactions = aiContent.cross_dimension_interactions;
    const strengths = Array.isArray(aiContent.strengths) ? aiContent.strengths : [];
    const growthBlindspots = Array.isArray(aiContent.growth_blindspots) ? aiContent.growth_blindspots : [];
    const relComm = aiContent.relationships_communication;
    const workLead = aiContent.work_leadership;
    const stressAdapt = aiContent.stress_adaptability;
    const actionPlan = Array.isArray(aiContent.action_plan) ? aiContent.action_plan : [];
    const finalSynth = aiContent.final_synthesis;

    // 3. Build Full-Length PDF Document
    const builder = new PdfDocumentBuilder({
      brandName: settings.pdf_brand_name || 'Psychology Calculator',
      brandDomain: settings.pdf_brand_domain || 'psychologycalculator.com',
      primaryColor: settings.pdf_primary_color || '#0f766e',
      secondaryColor: settings.pdf_secondary_color || '#4338ca',
      footerText: settings.pdf_footer_text || 'Psychology Calculator — Official Psychometric Evaluation Report',
      disclaimerText: snapshot.disclaimer || settings.pdf_disclaimer
    });

    const displayName = options?.userDisplayName || report.user_name || 'Evaluated Client';
    const reportDate = new Date(report.generated_at || report.created_at).toLocaleDateString('en-US', {
      dateStyle: 'long'
    });

    await builder.initialize(`${snapshot.assessmentName} - Detailed AI Psychological Report`, 'Psychology Calculator');

    // ==========================================
    // PAGE 1: COVER & RESULT IDENTITY
    // ==========================================
    builder.addHeader('PERSONALIZED ASSESSMENT REPORT', snapshot.assessmentName);
    builder.addCoverHeader(
      snapshot.assessmentName,
      snapshot.assessmentCategoryName || 'Psychological Assessment',
      displayName,
      reportDate,
      snapshot.primaryResultType?.name || 'Assessed Psychological Profile',
      snapshot.totalNormalizedScore || 0,
      headline
    );

    if (keyTraits.length > 0) {
      builder.addSectionHeader('Core Profile Signatures', 'Key behavioral tendencies and cognitive strengths deduced from your responses');
      builder.addTraitPills(keyTraits);
    }

    // ==========================================
    // SECTION 2: EXECUTIVE PSYCHOLOGICAL SUMMARY
    // ==========================================
    builder.forcePageBreak();
    builder.addHeader('EXECUTIVE PSYCHOLOGICAL SUMMARY', snapshot.assessmentName);
    builder.addSectionHeader('Executive Psychological Synthesis', 'Comprehensive analysis of cognitive patterns and baseline tendencies');
    builder.addParagraphs(executiveSummary, 10, 15);

    // ==========================================
    // SECTION 3: SCORE & DIMENSION PROFILE + PROFILE AT A GLANCE
    // ==========================================
    if (snapshot.dimensionScores && snapshot.dimensionScores.length > 0) {
      builder.ensureSpace(240);
      builder.addSectionHeader('Construct Scores & Dimensional Breakdown', 'Standardized psychometric measurements across all evaluated domains');
      
      const dimData: DimensionScoreData[] = snapshot.dimensionScores.map((d) => ({
        name: d.dimensionName,
        normalizedScore: d.normalizedScore,
        rawScore: d.rawScore,
        maxScore: d.maxScore,
        level: d.resultTypeName || (d.normalizedScore >= 70 ? 'High' : d.normalizedScore >= 35 ? 'Moderate' : 'Low'),
        description: d.description || undefined
      }));
      builder.addDimensionScores(dimData);
      builder.addProfileAtAGlance(dimData);
    }

    // ==========================================
    // SECTION 4: DETAILED DIMENSION ANALYSIS
    // ==========================================
    if (dimensionAnalyses.length > 0) {
      builder.ensureSpace(180);
      builder.addSectionHeader('Detailed Dimension Evaluations', 'Individual construct manifestations, behavioral indicators, and personalized interpretations');
      
      for (const dim of dimensionAnalyses) {
        builder.addDimensionDeepDive(dim);
      }
    }

    // ==========================================
    // SECTION 5: CROSS-DIMENSION PATTERNS & INTERACTIONS
    // ==========================================
    if (interactions) {
      builder.ensureSpace(180);
      builder.addSectionHeader('Cross-Dimension Patterns & Dynamic Synergies', 'How your evaluated dimensions interact and influence behavior across varying environments');
      
      if (interactions.core_pattern) {
        builder.addParagraphs(interactions.core_pattern, 9.5, 14.5);
      }
      if (interactions.trait_synergies && interactions.trait_synergies.length > 0) {
        builder.addBulletListCard('Construct Synergies & Natural Multipliers', interactions.trait_synergies, 'strengths');
      }
      if (interactions.trait_tensions && interactions.trait_tensions.length > 0) {
        builder.addBulletListCard('Internal Tensions & Situational Trade-Offs', interactions.trait_tensions, 'challenges');
      }
      if (interactions.situational_differences) {
        builder.addSectionHeader('Situational Behavioral Shifts');
        builder.addParagraphs(interactions.situational_differences, 9.5, 14);
      }
    }

    // ==========================================
    // SECTION 6: KEY STRENGTHS & NATURAL TENDENCIES
    // ==========================================
    if (strengths.length > 0) {
      builder.ensureSpace(160);
      builder.addSectionHeader('Key Strengths & Natural Tendencies', 'Core cognitive strengths, relational assets, and natural advantages');
      builder.addStrengthCards(strengths);
    }

    // ==========================================
    // SECTION 7: CONSTRUCTIVE GROWTH OPPORTUNITIES & REFLECTION
    // ==========================================
    if (growthBlindspots.length > 0) {
      builder.ensureSpace(160);
      builder.addSectionHeader('Constructive Growth Opportunities & Reflection', 'Constructive self-awareness frontiers and actionable navigation strategies');
      builder.addGrowthBlindspotCards(growthBlindspots);
    } else if (Array.isArray(aiContent.challenges) && aiContent.challenges.length > 0) {
      builder.addBulletListCard('Growth Frontiers & Areas for Reflection', aiContent.challenges, 'challenges');
    }

    // ==========================================
    // SECTION 8: DOMAIN-SPECIFIC DEEP DIVE (RELATIONSHIP / WORK / STRESS)
    // ==========================================
    const slug = (snapshot.assessmentSlug || '').toLowerCase();
    const isRelational = slug.includes('attachment') || slug.includes('love') || slug.includes('relationship') || slug.includes('couple');
    const isWork = slug.includes('career') || slug.includes('work') || slug.includes('leadership') || slug.includes('disc');

    if (isRelational && (relComm || aiContent.communication || aiContent.relationships)) {
      builder.ensureSpace(180);
      builder.addSectionHeader('Relationships, Intimacy & Communication Style', 'Interpersonal bonding, conversational expression, listening tendencies, and conflict navigation');
      
      if (relComm?.relational_style) builder.addParagraphs(relComm.relational_style, 9.5, 14);
      else if (aiContent.relationships) builder.addParagraphs(aiContent.relationships, 9.5, 14);

      if (relComm?.communication_style) {
        builder.addSectionHeader('Conversational Style & Boundaries');
        builder.addParagraphs(relComm.communication_style, 9.5, 14);
      } else if (aiContent.communication) {
        builder.addParagraphs(aiContent.communication, 9.5, 14);
      }

      if (relComm?.listening_conflict) {
        builder.addSectionHeader('Listening Habits & Conflict Navigation');
        builder.addParagraphs(relComm.listening_conflict, 9.5, 14);
      }
      if (relComm?.partner_dynamics) {
        builder.addSectionHeader('Interpersonal Values & Potential Misunderstandings');
        builder.addParagraphs(relComm.partner_dynamics, 9.5, 14);
      }
      if (relComm?.relationship_tips && relComm.relationship_tips.length > 0) {
        builder.addBulletListCard('Actionable Relationship Practices', relComm.relationship_tips, 'recommendations');
      }
    } else if (isWork && (workLead || aiContent.work_style)) {
      builder.ensureSpace(180);
      builder.addSectionHeader('Professional & Workplace Execution Dynamics', 'Optimal environments, collaboration, decision-making style, and leadership approach');
      
      if (workLead?.work_environment) builder.addParagraphs(workLead.work_environment, 9.5, 14);
      else if (aiContent.work_style) builder.addParagraphs(aiContent.work_style, 9.5, 14);

      if (workLead?.collaboration_teamwork) {
        builder.addSectionHeader('Collaboration & Team Dynamics');
        builder.addParagraphs(workLead.collaboration_teamwork, 9.5, 14);
      }
      if (workLead?.decision_problem_solving) {
        builder.addSectionHeader('Decision-Making & Problem-Solving Approach');
        builder.addParagraphs(workLead.decision_problem_solving, 9.5, 14);
      }
      if (workLead?.leadership_mentorship) {
        builder.addSectionHeader('Leadership & Influence Style');
        builder.addParagraphs(workLead.leadership_mentorship, 9.5, 14);
      }
      if (workLead?.workplace_strengths && workLead.workplace_strengths.length > 0) {
        builder.addBulletListCard('Workplace Superpowers', workLead.workplace_strengths, 'strengths');
      }
      if (workLead?.workplace_challenges && workLead.workplace_challenges.length > 0) {
        builder.addBulletListCard('Workplace Friction Points', workLead.workplace_challenges, 'challenges');
      }
    } else {
      // General / Multidimensional Assessments
      if (relComm?.relational_style || relComm?.communication_style) {
        builder.ensureSpace(160);
        builder.addSectionHeader('Interpersonal & Communication Dynamics', 'Interpersonal bonding, conversational expression, and conflict navigation');
        if (relComm.relational_style) builder.addParagraphs(relComm.relational_style, 9.5, 14);
        if (relComm.communication_style) builder.addParagraphs(relComm.communication_style, 9.5, 14);
        if (relComm.relationship_tips && relComm.relationship_tips.length > 0) {
          builder.addBulletListCard('Interpersonal Growth Suggestions', relComm.relationship_tips, 'recommendations');
        }
      }

      if (workLead?.work_environment || workLead?.collaboration_teamwork) {
        builder.ensureSpace(160);
        builder.addSectionHeader('Workplace & Execution Preferences', 'Cognitive problem-solving, collaboration, and optimal work settings');
        if (workLead.work_environment) builder.addParagraphs(workLead.work_environment, 9.5, 14);
        if (workLead.decision_problem_solving) builder.addParagraphs(workLead.decision_problem_solving, 9.5, 14);
      }

      if (stressAdapt?.pressure_patterns || stressAdapt?.recovery_equilibrium) {
        builder.ensureSpace(160);
        builder.addSectionHeader('Stress Response & Adaptability Patterns', 'Pressure dynamics, response to ambiguity, and restorative equilibrium');
        if (stressAdapt.pressure_patterns) builder.addParagraphs(stressAdapt.pressure_patterns, 9.5, 14);
        if (stressAdapt.recovery_equilibrium) builder.addParagraphs(stressAdapt.recovery_equilibrium, 9.5, 14);
      }
    }

    // ==========================================
    // SECTION 9: 30-DAY PERSONALIZED GROWTH ROADMAP
    // ==========================================
    if (actionPlan.length > 0) {
      builder.ensureSpace(160);
      builder.addSectionHeader('Personalized Action Plan', 'Practical self-mastery practices tailored to your specific results');
      builder.addActionPlanCards(actionPlan);
    } else if (Array.isArray(aiContent.practical_suggestions) && aiContent.practical_suggestions.length > 0) {
      builder.ensureSpace(140);
      builder.addSectionHeader('Actionable Daily Practices', 'Practical daily reflection practices and recommendations');
      builder.addBulletListCard('Recommended Self-Development Practices', aiContent.practical_suggestions, 'recommendations');
    }

    // ==========================================
    // SECTION 10: FINAL PROFILE SYNTHESIS & REFLECTION
    // ==========================================
    builder.ensureSpace(200);
    builder.addSectionHeader('Final Profile Synthesis', 'Core takeaways, reflective inquiries, and concluding perspective');
    
    if (finalSynth) {
      if (finalSynth.top_takeaways && finalSynth.top_takeaways.length > 0) {
        builder.addSectionHeader('Your Top 5 Key Takeaways');
        builder.addTopTakeaways(finalSynth.top_takeaways);
      }

      builder.addSynthesisCallouts(
        finalSynth.strongest_pattern,
        finalSynth.biggest_growth_opportunity,
        finalSynth.next_step
      );

      builder.addFinalSynthesisGrid(finalSynth);

      if (finalSynth.reflection_questions && finalSynth.reflection_questions.length > 0) {
        builder.addSectionHeader('Metacognitive Reflection Prompts');
        builder.addReflectionQuestions(finalSynth.reflection_questions);
      }
      if (finalSynth.closing_summary) {
        builder.addSectionHeader('Concluding Perspective');
        builder.addParagraphs(finalSynth.closing_summary, 9.5, 14);
      }
    }

    // Educational / Self-Reflection Disclaimer
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
