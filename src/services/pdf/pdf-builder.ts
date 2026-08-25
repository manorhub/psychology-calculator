import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import type {
  AIDimensionAnalysis,
  AIStrengthItem,
  AIGrowthBlindspot,
  AIActionPlanItem,
  AIFinalSynthesis
} from '@/types/database';

type RGB = ReturnType<typeof rgb>;

export interface PdfThemeOptions {
  brandName?: string;
  brandDomain?: string;
  primaryColor?: string; // hex e.g. #0f766e
  secondaryColor?: string; // hex e.g. #4f46e5
  footerText?: string;
  disclaimerText?: string;
}

export interface DimensionScoreData {
  name: string;
  normalizedScore: number;
  rawScore?: number;
  maxScore?: number;
  level?: string;
  description?: string;
}

export interface SectionContentData {
  title: string;
  content: string;
}

function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0.06 : r, isNaN(g) ? 0.46 : g, isNaN(b) ? 0.43 : b);
}

export class PdfDocumentBuilder {
  private pdfDoc!: PDFDocument;
  private regularFont!: PDFFont;
  private boldFont!: PDFFont;
  private italicFont!: PDFFont;
  private pages: PDFPage[] = [];
  private currentPage!: PDFPage;
  private cursorY: number = 0;

  // Page dimensions (A4 standard)
  private readonly pageWidth = 595.28;
  private readonly pageHeight = 841.89;
  private readonly marginX = 42;
  private readonly marginTop = 48;
  private readonly marginBottom = 50;
  private readonly contentWidth = 595.28 - 84; // 511.28

  // Colors
  private primaryRgb: RGB;
  private secondaryRgb: RGB;
  private textDark = rgb(0.06, 0.09, 0.13); // Slate 900
  private textBody = rgb(0.2, 0.25, 0.33); // Slate 700
  private textMuted = rgb(0.4, 0.45, 0.55); // Slate 500
  private textLight = rgb(0.6, 0.65, 0.72); // Slate 400
  private bgLight = rgb(0.97, 0.98, 0.99); // Slate 50
  private borderLight = rgb(0.88, 0.91, 0.94); // Slate 200
  private barTrack = rgb(0.93, 0.94, 0.96); // Slate 100
  private cardBg = rgb(0.98, 0.99, 1.0);
  private greenAccent = rgb(0.05, 0.6, 0.4);
  private amberAccent = rgb(0.85, 0.4, 0.1);

  private theme: PdfThemeOptions;

  constructor(theme: PdfThemeOptions = {}) {
    this.theme = {
      brandName: theme.brandName || 'Psychology Calculator',
      brandDomain: theme.brandDomain || 'psychologycalculator.com',
      primaryColor: theme.primaryColor || '#0f766e',
      secondaryColor: theme.secondaryColor || '#4338ca',
      footerText: theme.footerText || 'Psychology Calculator — Official Psychometric Evaluation Report',
      disclaimerText:
        theme.disclaimerText ||
        'This assessment report is designed solely for self-reflection and educational purposes. It does not constitute a clinical psychological diagnosis or medical advice.'
    };
    this.primaryRgb = hexToRgb(this.theme.primaryColor!);
    this.secondaryRgb = hexToRgb(this.theme.secondaryColor!);
  }

  public async initialize(title: string, author = 'Psychology Calculator'): Promise<void> {
    this.pdfDoc = await PDFDocument.create();
    this.pdfDoc.setTitle(title);
    this.pdfDoc.setAuthor(author);
    this.pdfDoc.setProducer('Psychology Calculator PDF Engine v2.0');
    this.pdfDoc.setCreator('psychologycalculator.com');
    this.pdfDoc.setCreationDate(new Date());

    this.regularFont = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    this.boldFont = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);
    this.italicFont = await this.pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    this.addNewPage();
  }

  public addNewPage(): void {
    this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
    this.pages.push(this.currentPage);
    this.cursorY = this.pageHeight - this.marginTop;
  }

  public forcePageBreak(): void {
    this.addNewPage();
  }

  public ensureSpace(requiredHeight: number): void {
    if (this.cursorY - requiredHeight < this.marginBottom) {
      this.addNewPage();
    }
  }

  /**
   * Top running header banner with brand identity
   */
  public addHeader(categoryName = 'PSYCHOLOGICAL EVALUATION', assessmentName?: string): void {
    this.ensureSpace(40);

    // Decorative top accent bar
    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - 2,
      width: this.contentWidth,
      height: 2.5,
      color: this.primaryRgb
    });

    this.cursorY -= 14;

    // Brand Name Left
    this.currentPage.drawText(this.theme.brandName!.toUpperCase(), {
      x: this.marginX,
      y: this.cursorY,
      size: 8.5,
      font: this.boldFont,
      color: this.primaryRgb
    });

    // Running Section Title Center/Right
    const rightText = assessmentName ? this.sanitizeText(`${categoryName} | ${assessmentName}`) : this.theme.brandDomain!;
    const textWidth = this.regularFont.widthOfTextAtSize(rightText, 8);
    this.currentPage.drawText(rightText, {
      x: Math.max(this.marginX + 150, this.marginX + this.contentWidth - textWidth),
      y: this.cursorY,
      size: 8,
      font: this.regularFont,
      color: this.textMuted
    });

    this.cursorY -= 12;

    // Separator line
    this.currentPage.drawLine({
      start: { x: this.marginX, y: this.cursorY },
      end: { x: this.marginX + this.contentWidth, y: this.cursorY },
      thickness: 0.5,
      color: this.borderLight
    });

    this.cursorY -= 18;
  }

  /**
   * Title Block (Assessment Name, Date, User) for Basic Result PDFs
   */
  public addTitleBlock(
    title: string,
    subtitle: string,
    userDisplayName?: string,
    reportDate: string = new Date().toLocaleDateString('en-US', { dateStyle: 'long' })
  ): void {
    this.ensureSpace(80);

    if (subtitle) {
      this.currentPage.drawText(subtitle.toUpperCase(), {
        x: this.marginX,
        y: this.cursorY,
        size: 9,
        font: this.boldFont,
        color: this.secondaryRgb
      });
      this.cursorY -= 16;
    }

    const titleLines = this.wrapText(title, this.boldFont, 20, this.contentWidth);
    for (const line of titleLines) {
      this.currentPage.drawText(line, {
        x: this.marginX,
        y: this.cursorY,
        size: 20,
        font: this.boldFont,
        color: this.textDark
      });
      this.cursorY -= 24;
    }

    this.cursorY -= 2;

    let metaText = `Generated: ${reportDate}`;
    if (userDisplayName && userDisplayName !== 'Guest User') {
      metaText = `Evaluation for: ${userDisplayName}  |  Generated: ${reportDate}`;
    }

    this.currentPage.drawText(metaText, {
      x: this.marginX,
      y: this.cursorY,
      size: 9,
      font: this.regularFont,
      color: this.textMuted
    });

    this.cursorY -= 22;
  }

  /**
   * Primary Outcome Card for Basic Result PDFs
   */
  public addOutcomeCard(archetype: string, scorePercent: number, summaryText?: string): void {
    const lines = summaryText ? this.wrapText(summaryText, this.regularFont, 10, this.contentWidth - 30) : [];
    const cardHeight = 65 + lines.length * 14;

    this.ensureSpace(cardHeight + 15);

    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - cardHeight,
      width: this.contentWidth,
      height: cardHeight,
      color: this.cardBg,
      borderColor: this.primaryRgb,
      borderWidth: 1.5
    });

    this.currentPage.drawText('PRIMARY EVALUATION OUTCOME', {
      x: this.marginX + 16,
      y: this.cursorY - 20,
      size: 8,
      font: this.boldFont,
      color: this.secondaryRgb
    });

    this.currentPage.drawText(archetype, {
      x: this.marginX + 16,
      y: this.cursorY - 40,
      size: 15,
      font: this.boldFont,
      color: this.textDark
    });

    const scoreText = `${Math.round(scorePercent)}%`;
    const scoreWidth = this.boldFont.widthOfTextAtSize(scoreText, 20);
    this.currentPage.drawText(scoreText, {
      x: this.marginX + this.contentWidth - scoreWidth - 20,
      y: this.cursorY - 35,
      size: 20,
      font: this.boldFont,
      color: this.primaryRgb
    });

    let lineY = this.cursorY - 58;
    for (const line of lines) {
      this.currentPage.drawText(line, {
        x: this.marginX + 16,
        y: lineY,
        size: 9.5,
        font: this.regularFont,
        color: this.textBody
      });
      lineY -= 14;
    }

    this.cursorY -= cardHeight + 18;
  }

  /**
   * Page 1 Cover & Result Identity Block
   */
  public addCoverHeader(
    title: string,
    subtitle: string,
    participantName = 'Evaluated Client',
    reportDate = new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
    primaryArchetype = 'Standardized Profile',
    overallScore = 0,
    headline?: string
  ): void {
    this.ensureSpace(240);

    // Pill badge
    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - 18,
      width: 195,
      height: 18,
      color: this.bgLight,
      borderColor: this.secondaryRgb,
      borderWidth: 1
    });
    this.currentPage.drawText('PERSONALIZED ASSESSMENT REPORT', {
      x: this.marginX + 8,
      y: this.cursorY - 13,
      size: 7.5,
      font: this.boldFont,
      color: this.secondaryRgb
    });

    this.cursorY -= 32;

    // Category
    this.currentPage.drawText(subtitle.toUpperCase(), {
      x: this.marginX,
      y: this.cursorY,
      size: 9.5,
      font: this.boldFont,
      color: this.primaryRgb
    });
    this.cursorY -= 18;

    // Assessment Title
    const titleLines = this.wrapText(title, this.boldFont, 22, this.contentWidth);
    for (const line of titleLines) {
      this.currentPage.drawText(line, {
        x: this.marginX,
        y: this.cursorY,
        size: 22,
        font: this.boldFont,
        color: this.textDark
      });
      this.cursorY -= 26;
    }

    this.cursorY -= 6;

    // Metadata Strip
    const metaText = `Participant: ${participantName}  |  Generated: ${reportDate}  |  Platform: psychologycalculator.com`;
    this.currentPage.drawText(metaText, {
      x: this.marginX,
      y: this.cursorY,
      size: 8.5,
      font: this.regularFont,
      color: this.textMuted
    });
    this.cursorY -= 22;

    // Archetype Result Banner Box
    const headlineLines = headline ? this.wrapText(headline, this.italicFont, 9.5, this.contentWidth - 140) : [];
    const boxHeight = 70 + headlineLines.length * 13;

    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - boxHeight,
      width: this.contentWidth,
      height: boxHeight,
      color: this.cardBg,
      borderColor: this.primaryRgb,
      borderWidth: 1.5
    });

    // Score Circle/Box Left
    this.currentPage.drawRectangle({
      x: this.marginX + 14,
      y: this.cursorY - boxHeight + 14,
      width: 75,
      height: boxHeight - 28,
      color: this.primaryRgb
    });

    const scoreStr = `${Math.round(overallScore)}%`;
    const scoreWidth = this.boldFont.widthOfTextAtSize(scoreStr, 18);
    this.currentPage.drawText(scoreStr, {
      x: this.marginX + 14 + (75 - scoreWidth) / 2,
      y: this.cursorY - boxHeight / 2 - 2,
      size: 18,
      font: this.boldFont,
      color: rgb(1, 1, 1)
    });

    this.currentPage.drawText('OVERALL SCORE', {
      x: this.marginX + 14 + 6,
      y: this.cursorY - boxHeight / 2 - 16,
      size: 6.5,
      font: this.boldFont,
      color: rgb(0.85, 0.95, 0.95)
    });

    // Archetype Name Right
    this.currentPage.drawText('PRIMARY RESULT PROFILE', {
      x: this.marginX + 105,
      y: this.cursorY - 22,
      size: 8,
      font: this.boldFont,
      color: this.secondaryRgb
    });

    this.currentPage.drawText(primaryArchetype, {
      x: this.marginX + 105,
      y: this.cursorY - 42,
      size: 15,
      font: this.boldFont,
      color: this.textDark
    });

    let hlY = this.cursorY - 58;
    for (const hLine of headlineLines) {
      this.currentPage.drawText(hLine, {
        x: this.marginX + 105,
        y: hlY,
        size: 9.5,
        font: this.italicFont,
        color: this.textBody
      });
      hlY -= 13;
    }

    this.cursorY -= boxHeight + 22;
  }

  /**
   * Distinct Section Header
   */
  public addSectionHeader(title: string, subtitle?: string): void {
    this.ensureSpace(50);

    this.currentPage.drawText(title.toUpperCase(), {
      x: this.marginX,
      y: this.cursorY,
      size: 13,
      font: this.boldFont,
      color: this.primaryRgb
    });

    this.cursorY -= 14;

    if (subtitle) {
      this.currentPage.drawText(subtitle, {
        x: this.marginX,
        y: this.cursorY,
        size: 8.5,
        font: this.regularFont,
        color: this.textMuted
      });
      this.cursorY -= 12;
    }

    this.currentPage.drawLine({
      start: { x: this.marginX, y: this.cursorY },
      end: { x: this.marginX + this.contentWidth, y: this.cursorY },
      thickness: 1,
      color: this.primaryRgb
    });

    this.cursorY -= 16;
  }

  /**
   * Formatted Paragraph or Multi-section interpretations (Used by Basic Result PDF)
   */
  public addContentSections(sections: SectionContentData[]): void {
    if (!sections || sections.length === 0) return;

    for (const sec of sections) {
      if (!sec.content || sec.content.trim() === '') continue;

      const lines = this.wrapText(sec.content, this.regularFont, 9.5, this.contentWidth);
      const reqHeight = (sec.title ? 25 : 0) + lines.length * 14;

      const minStartHeight = sec.title ? 65 : 40;
      this.ensureSpace(Math.min(reqHeight, minStartHeight));

      if (sec.title) {
        this.currentPage.drawText(sec.title, {
          x: this.marginX,
          y: this.cursorY,
          size: 11,
          font: this.boldFont,
          color: this.textDark
        });
        this.cursorY -= 16;
      }

      for (const line of lines) {
        this.ensureSpace(15);
        this.currentPage.drawText(line, {
          x: this.marginX,
          y: this.cursorY,
          size: 9.5,
          font: this.regularFont,
          color: this.textBody
        });
        this.cursorY -= 14;
      }

      this.cursorY -= 12;
    }
  }

  /**
   * Flowing Multi-Paragraph Text Block with clean typography
   */
  public addParagraphs(text: string, fontSize = 9.5, lineHeight = 14): void {
    if (!text || text.trim() === '') return;

    const rawParagraphs = text.split(/\n\s*\n|\n/);
    for (const p of rawParagraphs) {
      const cleanP = p.trim();
      if (!cleanP) continue;

      const lines = this.wrapText(cleanP, this.regularFont, fontSize, this.contentWidth);
      for (const line of lines) {
        this.ensureSpace(lineHeight + 4);
        this.currentPage.drawText(line, {
          x: this.marginX,
          y: this.cursorY,
          size: fontSize,
          font: this.regularFont,
          color: this.textBody
        });
        this.cursorY -= lineHeight;
      }
      this.cursorY -= 6; // paragraph spacing
    }
  }

  /**
   * Dimensional Scores Visual Breakdown Grid
   */
  public addDimensionScores(dimensions: DimensionScoreData[]): void {
    if (!dimensions || dimensions.length === 0) return;

    this.ensureSpace(dimensions.length * 36 + 20);

    for (const dim of dimensions) {
      const pct = Math.min(100, Math.max(0, Math.round(dim.normalizedScore)));
      const levelLabel = dim.level || (pct >= 70 ? 'High' : pct >= 35 ? 'Moderate' : 'Low');

      this.ensureSpace(34);

      // Dimension Name & Level
      this.currentPage.drawText(dim.name, {
        x: this.marginX,
        y: this.cursorY,
        size: 9.5,
        font: this.boldFont,
        color: this.textDark
      });

      const levelText = `[${levelLabel}] ${pct}%`;
      const levelWidth = this.boldFont.widthOfTextAtSize(levelText, 9.5);
      this.currentPage.drawText(levelText, {
        x: this.marginX + this.contentWidth - levelWidth,
        y: this.cursorY,
        size: 9.5,
        font: this.boldFont,
        color: this.primaryRgb
      });

      this.cursorY -= 11;

      // Progress Bar Track
      const barHeight = 6.5;
      const barY = this.cursorY - barHeight;
      this.currentPage.drawRectangle({
        x: this.marginX,
        y: barY,
        width: this.contentWidth,
        height: barHeight,
        color: this.barTrack
      });

      // Progress Fill
      const fillWidth = Math.max(4, (this.contentWidth * pct) / 100);
      this.currentPage.drawRectangle({
        x: this.marginX,
        y: barY,
        width: fillWidth,
        height: barHeight,
        color: pct >= 70 ? this.greenAccent : pct >= 35 ? this.primaryRgb : this.amberAccent
      });

      this.cursorY -= 16;
    }

    this.cursorY -= 8;
  }

  /**
   * Page 3 "Your Profile At A Glance" Synthesis Block
   */
  public addProfileAtAGlance(dimensions: DimensionScoreData[]): void {
    if (!dimensions || dimensions.length === 0) return;

    // Dynamically compute key profile metrics from real dimension scores
    const sorted = [...dimensions].sort((a, b) => b.normalizedScore - a.normalizedScore);
    const strongest = sorted[0];
    const lowest = sorted[sorted.length - 1];

    // Find dimension closest to 50% / moderate balance
    const balanced = [...dimensions].sort(
      (a, b) => Math.abs(a.normalizedScore - 50) - Math.abs(b.normalizedScore - 50)
    )[0];

    const scoreSpread = strongest.normalizedScore - lowest.normalizedScore;
    let patternSummary = 'Balanced profile showing stable dimensional equilibrium across evaluated domains.';
    if (scoreSpread >= 35) {
      patternSummary = `Pronounced differentiation with primary orientation in ${strongest.name}.`;
    } else if (scoreSpread >= 20) {
      patternSummary = `Focused profile with clear cognitive anchor in ${strongest.name}.`;
    }

    const cardHeight = 110;
    this.ensureSpace(cardHeight + 15);

    // Box Container
    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - cardHeight,
      width: this.contentWidth,
      height: cardHeight,
      color: this.bgLight,
      borderColor: this.borderLight,
      borderWidth: 1
    });

    // Header strip inside box
    this.currentPage.drawText('YOUR PROFILE AT A GLANCE', {
      x: this.marginX + 14,
      y: this.cursorY - 18,
      size: 9,
      font: this.boldFont,
      color: this.secondaryRgb
    });

    const metrics = [
      {
        label: 'STRONGEST DIMENSION',
        val: `${strongest.name} (${Math.round(strongest.normalizedScore)}% — ${strongest.level || (strongest.normalizedScore >= 70 ? 'High' : 'Moderate')})`
      },
      {
        label: 'LOWEST DIMENSION',
        val: `${lowest.name} (${Math.round(lowest.normalizedScore)}% — ${lowest.level || (lowest.normalizedScore <= 35 ? 'Low' : 'Moderate')})`
      },
      {
        label: 'MOST BALANCED AREA',
        val: `${balanced.name} (${Math.round(balanced.normalizedScore)}%)`
      },
      {
        label: 'OVERALL PATTERN',
        val: patternSummary
      }
    ];

    let rowY = this.cursorY - 36;
    for (const m of metrics) {
      this.currentPage.drawText(m.label, {
        x: this.marginX + 14,
        y: rowY,
        size: 7.5,
        font: this.boldFont,
        color: this.textMuted
      });

      const lines = this.wrapText(m.val, this.boldFont, 8.5, this.contentWidth - 170);
      let valY = rowY;
      for (const line of lines) {
        this.currentPage.drawText(line, {
          x: this.marginX + 150,
          y: valY,
          size: 8.5,
          font: this.boldFont,
          color: this.textDark
        });
        valY -= 11;
      }

      rowY -= 17;
    }

    this.cursorY -= cardHeight + 16;
  }

  /**
   * Detailed Dimension Analysis Card (150-250 words per dimension)
   */
  public addDimensionDeepDive(dim: AIDimensionAnalysis): void {
    const lines = this.wrapText(dim.personalized_interpretation, this.regularFont, 9, this.contentWidth - 24);
    const interpHeight = lines.length * 13;
    const estHeight = 110 + interpHeight;

    this.ensureSpace(Math.min(estHeight, 140));

    // Card boundary
    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - estHeight,
      width: this.contentWidth,
      height: estHeight,
      color: this.cardBg,
      borderColor: this.borderLight,
      borderWidth: 0.8
    });

    // Left accent strip
    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - estHeight,
      width: 4,
      height: estHeight,
      color: this.primaryRgb
    });

    let curY = this.cursorY - 14;

    // Dimension Title + Level Badge
    this.currentPage.drawText(dim.dimension_name, {
      x: this.marginX + 14,
      y: curY,
      size: 11,
      font: this.boldFont,
      color: this.textDark
    });

    const badgeText = `${dim.level.toUpperCase()} (${dim.score_percent}%)`;
    const badgeWidth = this.boldFont.widthOfTextAtSize(badgeText, 8.5);
    this.currentPage.drawText(badgeText, {
      x: this.marginX + this.contentWidth - badgeWidth - 14,
      y: curY,
      size: 8.5,
      font: this.boldFont,
      color: this.primaryRgb
    });

    curY -= 15;

    // What it measures
    if (dim.what_it_measures) {
      this.currentPage.drawText(`Construct: ${dim.what_it_measures}`, {
        x: this.marginX + 14,
        y: curY,
        size: 8,
        font: this.italicFont,
        color: this.textMuted
      });
      curY -= 14;
    }

    // Personalized interpretation lines
    for (const l of lines) {
      this.currentPage.drawText(l, {
        x: this.marginX + 14,
        y: curY,
        size: 9,
        font: this.regularFont,
        color: this.textBody
      });
      curY -= 13;
    }

    curY -= 4;

    // Strength & Challenge Micro-Row
    if (dim.key_strength) {
      this.currentPage.drawText(`+ Strength: ${dim.key_strength}`, {
        x: this.marginX + 14,
        y: curY,
        size: 8,
        font: this.boldFont,
        color: this.greenAccent
      });
      curY -= 12;
    }

    if (dim.potential_challenge) {
      this.currentPage.drawText(`- Mindfulness: ${dim.potential_challenge}`, {
        x: this.marginX + 14,
        y: curY,
        size: 8,
        font: this.regularFont,
        color: this.amberAccent
      });
      curY -= 12;
    }

    this.cursorY -= estHeight + 14;
  }

  /**
   * Trait Pills / Badge Row
   */
  public addTraitPills(traits: string[]): void {
    if (!traits || traits.length === 0) return;

    this.ensureSpace(45);
    let currentX = this.marginX;
    const pillHeight = 18;

    for (const trait of traits) {
      const textWidth = this.boldFont.widthOfTextAtSize(trait, 8);
      const pillWidth = textWidth + 16;

      if (currentX + pillWidth > this.marginX + this.contentWidth) {
        currentX = this.marginX;
        this.cursorY -= pillHeight + 6;
        this.ensureSpace(28);
      }

      this.currentPage.drawRectangle({
        x: currentX,
        y: this.cursorY - pillHeight,
        width: pillWidth,
        height: pillHeight,
        color: this.bgLight,
        borderColor: this.secondaryRgb,
        borderWidth: 0.8
      });

      this.currentPage.drawText(trait, {
        x: currentX + 8,
        y: this.cursorY - pillHeight + 5,
        size: 8,
        font: this.boldFont,
        color: this.primaryRgb
      });

      currentX += pillWidth + 6;
    }

    this.cursorY -= pillHeight + 16;
  }

  /**
   * Structured Strength Cards (5-8 items)
   */
  public addStrengthCards(strengths: Array<string | AIStrengthItem>): void {
    if (!strengths || strengths.length === 0) return;

    for (const s of strengths) {
      const title = typeof s === 'string' ? s : s.title;
      const desc = typeof s === 'string' ? '' : s.description;
      const context = typeof s === 'string' ? '' : s.context;

      const descLines = desc ? this.wrapText(desc, this.regularFont, 9, this.contentWidth - 28) : [];
      const cardH = 34 + descLines.length * 13 + (context ? 14 : 0);

      this.ensureSpace(cardH + 6);

      this.currentPage.drawRectangle({
        x: this.marginX,
        y: this.cursorY - cardH,
        width: this.contentWidth,
        height: cardH,
        color: rgb(0.97, 1.0, 0.98),
        borderColor: rgb(0.75, 0.9, 0.8),
        borderWidth: 0.8
      });

      this.currentPage.drawText(`+  ${title}`, {
        x: this.marginX + 12,
        y: this.cursorY - 14,
        size: 9.5,
        font: this.boldFont,
        color: this.greenAccent
      });

      let textY = this.cursorY - 28;
      for (const dl of descLines) {
        this.currentPage.drawText(dl, {
          x: this.marginX + 12,
          y: textY,
          size: 9,
          font: this.regularFont,
          color: this.textBody
        });
        textY -= 13;
      }

      if (context) {
        this.currentPage.drawText(`Optimal Environment: ${context}`, {
          x: this.marginX + 12,
          y: textY,
          size: 8,
          font: this.italicFont,
          color: this.textMuted
        });
      }

      this.cursorY -= cardH + 10;
    }
  }

  /**
   * Growth Areas & Blindspot Cards
   */
  public addGrowthBlindspotCards(blindspots: AIGrowthBlindspot[]): void {
    if (!blindspots || blindspots.length === 0) return;

    for (const g of blindspots) {
      const mLines = this.wrapText(`Condition: ${g.manifestation}`, this.regularFont, 9, this.contentWidth - 28);
      const rLines = this.wrapText(`Constructive Strategy: ${g.constructive_response}`, this.regularFont, 9, this.contentWidth - 28);
      const cardH = 32 + (mLines.length + rLines.length) * 13;

      this.ensureSpace(cardH + 6);

      this.currentPage.drawRectangle({
        x: this.marginX,
        y: this.cursorY - cardH,
        width: this.contentWidth,
        height: cardH,
        color: rgb(1.0, 0.99, 0.96),
        borderColor: rgb(0.95, 0.85, 0.7),
        borderWidth: 0.8
      });

      this.currentPage.drawText(`*  ${g.title}`, {
        x: this.marginX + 12,
        y: this.cursorY - 14,
        size: 9.5,
        font: this.boldFont,
        color: this.amberAccent
      });

      let textY = this.cursorY - 27;
      for (const ml of mLines) {
        this.currentPage.drawText(ml, {
          x: this.marginX + 12,
          y: textY,
          size: 9,
          font: this.regularFont,
          color: this.textBody
        });
        textY -= 13;
      }

      for (const rl of rLines) {
        this.currentPage.drawText(rl, {
          x: this.marginX + 12,
          y: textY,
          size: 9,
          font: this.boldFont,
          color: this.primaryRgb
        });
        textY -= 13;
      }

      this.cursorY -= cardH + 10;
    }
  }

  /**
   * Bullet List Card (Legacy / General Items)
   */
  public addBulletListCard(
    title: string,
    items: string[],
    type: 'strengths' | 'challenges' | 'recommendations' = 'recommendations'
  ): void {
    if (!items || items.length === 0) return;

    this.ensureSpace(35 + items.length * 18);

    const accentColor =
      type === 'strengths'
        ? this.greenAccent
        : type === 'challenges'
        ? this.amberAccent
        : this.primaryRgb;

    this.currentPage.drawText(title.toUpperCase(), {
      x: this.marginX,
      y: this.cursorY,
      size: 9,
      font: this.boldFont,
      color: accentColor
    });
    this.cursorY -= 14;

    for (const item of items) {
      const lines = this.wrapText(item, this.regularFont, 9.5, this.contentWidth - 20);
      this.ensureSpace(lines.length * 14 + 6);

      this.currentPage.drawCircle({
        x: this.marginX + 5,
        y: this.cursorY - 4,
        size: 2.2,
        color: accentColor
      });

      for (let i = 0; i < lines.length; i++) {
        this.currentPage.drawText(lines[i], {
          x: this.marginX + 14,
          y: this.cursorY,
          size: 9.5,
          font: this.regularFont,
          color: this.textBody
        });
        this.cursorY -= 13;
      }
      this.cursorY -= 3;
    }

    this.cursorY -= 8;
  }

  /**
   * 30-Day Action Plan Cards
   */
  public addActionPlanCards(items: AIActionPlanItem[]): void {
    if (!items || items.length === 0) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const actionLines = this.wrapText(`Action: ${item.action}`, this.regularFont, 9, this.contentWidth - 28);
      const whyLines = item.why_it_matters
        ? this.wrapText(`Rationale: ${item.why_it_matters}`, this.italicFont, 8.5, this.contentWidth - 28)
        : [];
      const cardH = 34 + (actionLines.length + whyLines.length) * 13;

      this.ensureSpace(cardH + 6);

      this.currentPage.drawRectangle({
        x: this.marginX,
        y: this.cursorY - cardH,
        width: this.contentWidth,
        height: cardH,
        color: this.bgLight,
        borderColor: this.borderLight,
        borderWidth: 0.8
      });

      this.currentPage.drawText(`Practice #${i + 1}: ${item.goal}`, {
        x: this.marginX + 12,
        y: this.cursorY - 14,
        size: 9.5,
        font: this.boldFont,
        color: this.secondaryRgb
      });

      const freqText = item.frequency || 'Weekly';
      const freqWidth = this.boldFont.widthOfTextAtSize(freqText, 8);
      this.currentPage.drawText(freqText, {
        x: this.marginX + this.contentWidth - freqWidth - 12,
        y: this.cursorY - 14,
        size: 8,
        font: this.boldFont,
        color: this.primaryRgb
      });

      let textY = this.cursorY - 27;
      for (const al of actionLines) {
        this.currentPage.drawText(al, {
          x: this.marginX + 12,
          y: textY,
          size: 9,
          font: this.regularFont,
          color: this.textDark
        });
        textY -= 13;
      }

      for (const wl of whyLines) {
        this.currentPage.drawText(wl, {
          x: this.marginX + 12,
          y: textY,
          size: 8.5,
          font: this.italicFont,
          color: this.textMuted
        });
        textY -= 13;
      }

      this.cursorY -= cardH + 10;
    }
  }

  /**
   * Top 5 Takeaways Numbered Cards
   */
  public addTopTakeaways(takeaways: string[]): void {
    if (!takeaways || takeaways.length === 0) return;

    this.ensureSpace(35 + takeaways.length * 28);

    for (let i = 0; i < takeaways.length; i++) {
      const num = i + 1;
      const text = takeaways[i];
      const lines = this.wrapText(text, this.regularFont, 9, this.contentWidth - 40);
      const cardHeight = Math.max(26, lines.length * 13 + 12);

      this.ensureSpace(cardHeight + 6);

      // Card row
      this.currentPage.drawRectangle({
        x: this.marginX,
        y: this.cursorY - cardHeight,
        width: this.contentWidth,
        height: cardHeight,
        color: this.bgLight,
        borderColor: this.borderLight,
        borderWidth: 0.6
      });

      // Number badge
      this.currentPage.drawRectangle({
        x: this.marginX + 8,
        y: this.cursorY - cardHeight + (cardHeight - 16) / 2,
        width: 16,
        height: 16,
        color: this.primaryRgb
      });

      const numStr = String(num);
      const numW = this.boldFont.widthOfTextAtSize(numStr, 8);
      this.currentPage.drawText(numStr, {
        x: this.marginX + 8 + (16 - numW) / 2,
        y: this.cursorY - cardHeight + (cardHeight - 16) / 2 + 4,
        size: 8,
        font: this.boldFont,
        color: rgb(1, 1, 1)
      });

      let textY = this.cursorY - 14;
      for (const line of lines) {
        this.currentPage.drawText(line, {
          x: this.marginX + 32,
          y: textY,
          size: 9,
          font: this.regularFont,
          color: this.textDark
        });
        textY -= 13;
      }

      this.cursorY -= cardHeight + 6;
    }

    this.cursorY -= 8;
  }

  /**
   * Synthesis Callouts: Strongest Pattern, Growth Opportunity & Next Step
   */
  public addSynthesisCallouts(pattern?: string, growth?: string, nextStep?: string): void {
    if (pattern) {
      const pLines = this.wrapText(pattern, this.regularFont, 9, this.contentWidth - 28);
      const pH = 28 + pLines.length * 13;
      this.ensureSpace(pH + 8);

      this.currentPage.drawRectangle({
        x: this.marginX,
        y: this.cursorY - pH,
        width: this.contentWidth,
        height: pH,
        color: rgb(0.97, 0.99, 1.0),
        borderColor: this.secondaryRgb,
        borderWidth: 0.8
      });

      this.currentPage.drawText('YOUR STRONGEST PATTERN', {
        x: this.marginX + 12,
        y: this.cursorY - 13,
        size: 8,
        font: this.boldFont,
        color: this.secondaryRgb
      });

      let py = this.cursorY - 26;
      for (const l of pLines) {
        this.currentPage.drawText(l, {
          x: this.marginX + 12,
          y: py,
          size: 9,
          font: this.regularFont,
          color: this.textDark
        });
        py -= 13;
      }

      this.cursorY -= pH + 8;
    }

    if (growth) {
      const gLines = this.wrapText(growth, this.regularFont, 9, this.contentWidth - 28);
      const gH = 28 + gLines.length * 13;
      this.ensureSpace(gH + 8);

      this.currentPage.drawRectangle({
        x: this.marginX,
        y: this.cursorY - gH,
        width: this.contentWidth,
        height: gH,
        color: rgb(1.0, 0.99, 0.96),
        borderColor: this.amberAccent,
        borderWidth: 0.8
      });

      this.currentPage.drawText('YOUR BIGGEST GROWTH OPPORTUNITY', {
        x: this.marginX + 12,
        y: this.cursorY - 13,
        size: 8,
        font: this.boldFont,
        color: this.amberAccent
      });

      let gy = this.cursorY - 26;
      for (const l of gLines) {
        this.currentPage.drawText(l, {
          x: this.marginX + 12,
          y: gy,
          size: 9,
          font: this.regularFont,
          color: this.textDark
        });
        gy -= 13;
      }

      this.cursorY -= gH + 8;
    }

    if (nextStep) {
      const nLines = this.wrapText(nextStep, this.boldFont, 9, this.contentWidth - 28);
      const nH = 28 + nLines.length * 13;
      this.ensureSpace(nH + 8);

      this.currentPage.drawRectangle({
        x: this.marginX,
        y: this.cursorY - nH,
        width: this.contentWidth,
        height: nH,
        color: rgb(0.96, 1.0, 0.98),
        borderColor: this.greenAccent,
        borderWidth: 0.8
      });

      this.currentPage.drawText('YOUR NEXT STEP', {
        x: this.marginX + 12,
        y: this.cursorY - 13,
        size: 8,
        font: this.boldFont,
        color: this.greenAccent
      });

      let ny = this.cursorY - 26;
      for (const l of nLines) {
        this.currentPage.drawText(l, {
          x: this.marginX + 12,
          y: ny,
          size: 9,
          font: this.boldFont,
          color: this.textDark
        });
        ny -= 13;
      }

      this.cursorY -= nH + 10;
    }
  }

  /**
   * Final Synthesis 2-Column Summary Grid
   */
  public addFinalSynthesisGrid(synth: AIFinalSynthesis): void {
    const pairs = [
      { label: 'Defining Trait', value: synth.notable_trait },
      { label: 'Primary Superpower', value: synth.primary_advantage },
      { label: 'Growth Frontier', value: synth.growth_frontier },
      { label: 'Relationship Takeaway', value: synth.relationship_insight },
      { label: 'Workplace Takeaway', value: synth.work_insight },
      { label: 'Immediate Next Step', value: synth.next_step }
    ].filter((p) => Boolean(p.value));

    this.ensureSpace(pairs.length * 28 + 15);

    for (const p of pairs) {
      this.ensureSpace(26);
      this.currentPage.drawText(p.label.toUpperCase(), {
        x: this.marginX,
        y: this.cursorY,
        size: 7.5,
        font: this.boldFont,
        color: this.secondaryRgb
      });

      const lines = this.wrapText(p.value, this.regularFont, 9, this.contentWidth - 140);
      let valY = this.cursorY;
      for (const l of lines) {
        this.currentPage.drawText(l, {
          x: this.marginX + 130,
          y: valY,
          size: 9,
          font: this.regularFont,
          color: this.textDark
        });
        valY -= 12;
      }

      this.cursorY -= Math.max(18, lines.length * 12 + 6);
    }

    this.cursorY -= 8;
  }

  /**
   * Metacognitive Reflection Prompts
   */
  public addReflectionQuestions(questions: string[]): void {
    if (!questions || questions.length === 0) return;

    this.ensureSpace(30 + questions.length * 22);

    for (let i = 0; i < questions.length; i++) {
      const qLines = this.wrapText(`${i + 1}. ${questions[i]}`, this.italicFont, 9, this.contentWidth - 20);
      for (const ql of qLines) {
        this.ensureSpace(14);
        this.currentPage.drawText(ql, {
          x: this.marginX + 6,
          y: this.cursorY,
          size: 9,
          font: this.italicFont,
          color: this.textBody
        });
        this.cursorY -= 13;
      }
      this.cursorY -= 4;
    }
    this.cursorY -= 8;
  }

  /**
   * Educational & Clinical Disclaimer Box
   */
  public addDisclaimer(customDisclaimer?: string): void {
    const text = customDisclaimer || this.theme.disclaimerText!;
    const lines = this.wrapText(text, this.italicFont, 8, this.contentWidth - 24);
    const boxHeight = 22 + lines.length * 11;

    this.ensureSpace(boxHeight + 15);

    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - boxHeight,
      width: this.contentWidth,
      height: boxHeight,
      color: this.bgLight,
      borderColor: this.borderLight,
      borderWidth: 0.5
    });

    let textY = this.cursorY - 12;
    for (const line of lines) {
      this.currentPage.drawText(line, {
        x: this.marginX + 12,
        y: textY,
        size: 8,
        font: this.italicFont,
        color: this.textMuted
      });
      textY -= 11;
    }

    this.cursorY -= boxHeight + 12;
  }

  /**
   * Finalizes footers with exact dynamic page numbering across all pages
   */
  public finalizeFooters(): void {
    const totalPages = this.pages.length;

    for (let i = 0; i < totalPages; i++) {
      const page = this.pages[i];
      const pageNumText = `Page ${i + 1} of ${totalPages}`;
      const pageNumWidth = this.regularFont.widthOfTextAtSize(pageNumText, 8);

      page.drawLine({
        start: { x: this.marginX, y: this.marginBottom },
        end: { x: this.marginX + this.contentWidth, y: this.marginBottom },
        thickness: 0.5,
        color: this.borderLight
      });

      page.drawText(this.theme.footerText!, {
        x: this.marginX,
        y: this.marginBottom - 13,
        size: 7.5,
        font: this.regularFont,
        color: this.textLight
      });

      page.drawText(pageNumText, {
        x: this.marginX + this.contentWidth - pageNumWidth,
        y: this.marginBottom - 13,
        size: 8,
        font: this.regularFont,
        color: this.textMuted
      });
    }
  }

  public async save(): Promise<Uint8Array> {
    this.finalizeFooters();
    return this.pdfDoc.save();
  }

  private sanitizeText(text: string): string {
    if (!text) return '';
    return text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2022/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/[★☆✦✧]/g, '*')
      .replace(/[✓✔]/g, '+')
      .replace(/[🌱🌿⚡💡🧠🎯🛡️🤝💼💬❤️⚠️🧭🔍]/g, '')
      .replace(/[^\x00-\x7F\xA0-\xFF]/g, '');
  }

  private wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const cleanText = this.sanitizeText(text).replace(/[\r\n]+/g, ' ').trim();
    const words = cleanText.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }
}
