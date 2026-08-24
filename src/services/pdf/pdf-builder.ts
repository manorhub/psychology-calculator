import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

type RGB = ReturnType<typeof rgb>;

export interface PdfThemeOptions {
  brandName?: string;
  brandDomain?: string;
  primaryColor?: string; // hex e.g. #4f46e5
  secondaryColor?: string; // hex e.g. #0ea5e9
  footerText?: string;
  disclaimerText?: string;
}

export interface DimensionScoreData {
  name: string;
  normalizedScore: number;
  rawScore?: number;
  maxScore?: number;
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
  return rgb(isNaN(r) ? 0.31 : r, isNaN(g) ? 0.27 : g, isNaN(b) ? 0.9 : b);
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
  private readonly marginX = 45;
  private readonly marginTop = 50;
  private readonly marginBottom = 55;
  private readonly contentWidth = 595.28 - 90; // 505.28

  // Colors
  private primaryRgb: RGB;
  private secondaryRgb: RGB;
  private textDark = rgb(0.09, 0.11, 0.15); // Gray 900
  private textMuted = rgb(0.39, 0.45, 0.55); // Gray 500
  private textLight = rgb(0.55, 0.6, 0.68); // Gray 400
  private bgLight = rgb(0.97, 0.98, 0.99); // Gray 50
  private borderLight = rgb(0.88, 0.91, 0.94); // Gray 200
  private barTrack = rgb(0.93, 0.94, 0.96); // Gray 100

  private theme: PdfThemeOptions;

  constructor(theme: PdfThemeOptions = {}) {
    this.theme = {
      brandName: theme.brandName || 'Psychology Calculator',
      brandDomain: theme.brandDomain || 'psychologycalculator.com',
      primaryColor: theme.primaryColor || '#4f46e5',
      secondaryColor: theme.secondaryColor || '#0ea5e9',
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
    this.pdfDoc.setProducer('Psychology Calculator PDF Engine');
    this.pdfDoc.setCreator('psychologycalculator.com');
    this.pdfDoc.setCreationDate(new Date());

    this.regularFont = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    this.boldFont = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);
    this.italicFont = await this.pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    this.addNewPage();
  }

  private addNewPage(): void {
    this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
    this.pages.push(this.currentPage);
    this.cursorY = this.pageHeight - this.marginTop;
  }

  private ensureSpace(requiredHeight: number): void {
    if (this.cursorY - requiredHeight < this.marginBottom) {
      this.addNewPage();
    }
  }

  /**
   * Header banner with Brand and Domain
   */
  public addHeader(_categoryName?: string, _assessmentName?: string): void {
    const headerHeight = 45;
    this.ensureSpace(headerHeight + 20);

    // Top decorative brand bar
    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - 2,
      width: this.contentWidth,
      height: 3,
      color: this.primaryRgb
    });

    this.cursorY -= 16;

    // Brand Title
    this.currentPage.drawText(this.theme.brandName!.toUpperCase(), {
      x: this.marginX,
      y: this.cursorY,
      size: 10,
      font: this.boldFont,
      color: this.primaryRgb
    });

    // Domain Right-aligned
    const domainText = this.theme.brandDomain!;
    const domainWidth = this.regularFont.widthOfTextAtSize(domainText, 9);
    this.currentPage.drawText(domainText, {
      x: this.marginX + this.contentWidth - domainWidth,
      y: this.cursorY,
      size: 9,
      font: this.regularFont,
      color: this.textMuted
    });

    this.cursorY -= 14;

    // Thin separator line
    this.currentPage.drawLine({
      start: { x: this.marginX, y: this.cursorY },
      end: { x: this.marginX + this.contentWidth, y: this.cursorY },
      thickness: 0.5,
      color: this.borderLight
    });

    this.cursorY -= 15;
  }

  /**
   * Title Block (Assessment Name, Date, User)
   */
  public addTitleBlock(
    title: string,
    subtitle: string,
    userDisplayName?: string,
    reportDate: string = new Date().toLocaleDateString('en-US', { dateStyle: 'long' })
  ): void {
    this.ensureSpace(80);

    // Subtitle / Category
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

    // Main Report Title
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

    // Metadata Row (Assessed For / Date)
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
   * Result Archetype Highlight Box
   */
  public addOutcomeCard(archetype: string, scorePercent: number, summaryText?: string): void {
    const lines = summaryText ? this.wrapText(summaryText, this.regularFont, 10, this.contentWidth - 30) : [];
    const cardHeight = 65 + lines.length * 14;

    this.ensureSpace(cardHeight + 15);

    // Background Card
    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - cardHeight,
      width: this.contentWidth,
      height: cardHeight,
      color: this.bgLight,
      borderColor: this.primaryRgb,
      borderWidth: 1
    });

    // Left accent strip
    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - cardHeight,
      width: 4,
      height: cardHeight,
      color: this.primaryRgb
    });

    const textX = this.marginX + 16;
    let cardCursorY = this.cursorY - 20;

    // Category Tag
    this.currentPage.drawText('PRIMARY OUTCOME & CLASSIFICATION', {
      x: textX,
      y: cardCursorY,
      size: 8,
      font: this.boldFont,
      color: this.primaryRgb
    });

    // Score badge (Right side)
    const scoreBadge = `Overall: ${Math.round(scorePercent)}%`;
    const badgeWidth = this.boldFont.widthOfTextAtSize(scoreBadge, 10) + 16;
    const badgeX = this.marginX + this.contentWidth - badgeWidth - 14;

    this.currentPage.drawRectangle({
      x: badgeX,
      y: cardCursorY - 4,
      width: badgeWidth,
      height: 18,
      color: this.primaryRgb
    });
    this.currentPage.drawText(scoreBadge, {
      x: badgeX + 8,
      y: cardCursorY,
      size: 10,
      font: this.boldFont,
      color: rgb(1, 1, 1)
    });

    cardCursorY -= 20;

    // Archetype Title
    this.currentPage.drawText(archetype, {
      x: textX,
      y: cardCursorY,
      size: 15,
      font: this.boldFont,
      color: this.textDark
    });

    cardCursorY -= 18;

    // Summary lines
    for (const line of lines) {
      this.currentPage.drawText(line, {
        x: textX,
        y: cardCursorY,
        size: 10,
        font: this.regularFont,
        color: this.textMuted
      });
      cardCursorY -= 14;
    }

    this.cursorY -= cardHeight + 20;
  }

  /**
   * Section Header with Icon-like bullet
   */
  public addSectionHeader(title: string): void {
    this.ensureSpace(35);

    // Decorative bullet
    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - 2,
      width: 8,
      height: 8,
      color: this.primaryRgb
    });

    this.currentPage.drawText(title, {
      x: this.marginX + 14,
      y: this.cursorY - 2,
      size: 12,
      font: this.boldFont,
      color: this.textDark
    });

    this.cursorY -= 18;

    this.currentPage.drawLine({
      start: { x: this.marginX, y: this.cursorY },
      end: { x: this.marginX + this.contentWidth, y: this.cursorY },
      thickness: 0.5,
      color: this.borderLight
    });

    this.cursorY -= 15;
  }

  /**
   * Dimensional Score Meters
   */
  public addDimensionScores(dimensions: DimensionScoreData[]): void {
    if (!dimensions || dimensions.length === 0) return;

    this.ensureSpace(dimensions.length * 36 + 25);
    this.addSectionHeader('Dimensional Score Breakdown');

    for (const dim of dimensions) {
      this.ensureSpace(34);

      const pct = Math.max(0, Math.min(100, dim.normalizedScore || 0));

      // Dimension Name
      this.currentPage.drawText(dim.name, {
        x: this.marginX,
        y: this.cursorY,
        size: 10,
        font: this.boldFont,
        color: this.textDark
      });

      // Score Value Right-Aligned
      const scoreStr = `${Math.round(pct)}%`;
      const scoreWidth = this.boldFont.widthOfTextAtSize(scoreStr, 10);
      this.currentPage.drawText(scoreStr, {
        x: this.marginX + this.contentWidth - scoreWidth,
        y: this.cursorY,
        size: 10,
        font: this.boldFont,
        color: this.primaryRgb
      });

      this.cursorY -= 12;

      // Progress Track
      const barY = this.cursorY - 2;
      const barHeight = 6;
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
        color: this.primaryRgb
      });

      this.cursorY -= 18;
    }

    this.cursorY -= 8;
  }

  /**
   * Formatted Paragraph or Multi-section interpretations
   */
  public addContentSections(sections: SectionContentData[]): void {
    if (!sections || sections.length === 0) return;

    for (const sec of sections) {
      if (!sec.content || sec.content.trim() === '') continue;

      const lines = this.wrapText(sec.content, this.regularFont, 10, this.contentWidth);
      const reqHeight = 25 + lines.length * 15;

      this.ensureSpace(Math.min(reqHeight, 150));

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
        this.ensureSpace(16);
        this.currentPage.drawText(line, {
          x: this.marginX,
          y: this.cursorY,
          size: 10,
          font: this.regularFont,
          color: this.textDark
        });
        this.cursorY -= 14;
      }

      this.cursorY -= 12;
    }
  }

  /**
   * Trait Pills / Badge Row (For AI Reports)
   */
  public addTraitPills(traits: string[]): void {
    if (!traits || traits.length === 0) return;

    this.ensureSpace(50);
    this.addSectionHeader('Identified Psychometric Signatures');

    let currentX = this.marginX;
    const pillHeight = 20;

    for (const trait of traits) {
      const textWidth = this.boldFont.widthOfTextAtSize(trait, 9);
      const pillWidth = textWidth + 18;

      if (currentX + pillWidth > this.marginX + this.contentWidth) {
        currentX = this.marginX;
        this.cursorY -= pillHeight + 8;
        this.ensureSpace(30);
      }

      // Pill Background
      this.currentPage.drawRectangle({
        x: currentX,
        y: this.cursorY - pillHeight,
        width: pillWidth,
        height: pillHeight,
        color: this.bgLight,
        borderColor: this.secondaryRgb,
        borderWidth: 1
      });

      this.currentPage.drawText(trait, {
        x: currentX + 9,
        y: this.cursorY - pillHeight + 6,
        size: 9,
        font: this.boldFont,
        color: this.primaryRgb
      });

      currentX += pillWidth + 8;
    }

    this.cursorY -= pillHeight + 18;
  }

  /**
   * Key-Value / Bullet List Card (e.g. Cognitive Strengths, Challenges, Recommendations)
   */
  public addBulletListCard(title: string, items: string[], type: 'strengths' | 'challenges' | 'recommendations' = 'recommendations'): void {
    if (!items || items.length === 0) return;

    this.ensureSpace(40 + items.length * 20);

    const accentColor =
      type === 'strengths'
        ? rgb(0.06, 0.65, 0.4) // Green
        : type === 'challenges'
        ? rgb(0.85, 0.35, 0.1) // Amber/Orange
        : this.primaryRgb;

    // Card Header
    this.currentPage.drawText(title.toUpperCase(), {
      x: this.marginX,
      y: this.cursorY,
      size: 9,
      font: this.boldFont,
      color: accentColor
    });
    this.cursorY -= 14;

    for (const item of items) {
      const lines = this.wrapText(item, this.regularFont, 10, this.contentWidth - 20);
      this.ensureSpace(lines.length * 15 + 8);

      // Bullet dot
      this.currentPage.drawCircle({
        x: this.marginX + 5,
        y: this.cursorY - 4,
        size: 2.5,
        color: accentColor
      });

      for (let i = 0; i < lines.length; i++) {
        this.currentPage.drawText(lines[i], {
          x: this.marginX + 15,
          y: this.cursorY,
          size: 10,
          font: this.regularFont,
          color: this.textDark
        });
        this.cursorY -= 14;
      }
      this.cursorY -= 4;
    }

    this.cursorY -= 10;
  }

  /**
   * Disclaimer Box at the end of report
   */
  public addDisclaimer(customDisclaimer?: string): void {
    const text = customDisclaimer || this.theme.disclaimerText!;
    const lines = this.wrapText(text, this.italicFont, 8.5, this.contentWidth - 24);
    const boxHeight = 24 + lines.length * 12;

    this.ensureSpace(boxHeight + 20);

    this.currentPage.drawRectangle({
      x: this.marginX,
      y: this.cursorY - boxHeight,
      width: this.contentWidth,
      height: boxHeight,
      color: this.bgLight,
      borderColor: this.borderLight,
      borderWidth: 0.5
    });

    let textY = this.cursorY - 14;
    for (const line of lines) {
      this.currentPage.drawText(line, {
        x: this.marginX + 12,
        y: textY,
        size: 8.5,
        font: this.italicFont,
        color: this.textMuted
      });
      textY -= 12;
    }

    this.cursorY -= boxHeight + 15;
  }

  /**
   * Adds Footers and Page Numbers across all generated pages
   */
  public finalizeFooters(): void {
    const totalPages = this.pages.length;

    for (let i = 0; i < totalPages; i++) {
      const page = this.pages[i];
      const pageNumText = `Page ${i + 1} of ${totalPages}`;
      const pageNumWidth = this.regularFont.widthOfTextAtSize(pageNumText, 8.5);

      // Separator Line
      page.drawLine({
        start: { x: this.marginX, y: this.marginBottom },
        end: { x: this.marginX + this.contentWidth, y: this.marginBottom },
        thickness: 0.5,
        color: this.borderLight
      });

      // Footer Text Left
      page.drawText(this.theme.footerText!, {
        x: this.marginX,
        y: this.marginBottom - 14,
        size: 8,
        font: this.regularFont,
        color: this.textLight
      });

      // Page Number Right
      page.drawText(pageNumText, {
        x: this.marginX + this.contentWidth - pageNumWidth,
        y: this.marginBottom - 14,
        size: 8.5,
        font: this.regularFont,
        color: this.textMuted
      });
    }
  }

  /**
   * Compiles the PDF Document into a Uint8Array byte stream
   */
  public async save(): Promise<Uint8Array> {
    this.finalizeFooters();
    return this.pdfDoc.save();
  }

  /**
   * Word-wrapping helper
   */
  private wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const cleanText = text.replace(/[\r\n]+/g, ' ').trim();
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
