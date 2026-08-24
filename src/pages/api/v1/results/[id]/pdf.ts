import type { APIRoute } from 'astro';
import { PdfService } from '@/services/pdf/pdf.service';
import { formatErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals, cookies }) => {
  const attemptId = params.id;
  if (!attemptId) {
    return new Response(JSON.stringify(formatErrorResponse(new ValidationError('Assessment attempt ID is required'))), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = locals.runtime?.env;
  const db = env?.DB || null;
  const storage = env?.STORAGE || null;
  const user = locals.user || null;
  const sessionId = cookies.get('assessment_session')?.value;

  try {
    const pdfService = new PdfService(db, storage);
    const { fileRecord, pdfBytes } = await pdfService.getOrGenerateResultPdf(attemptId, user, sessionId);

    return new Response(pdfBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileRecord.file_name}"`,
        'Content-Length': pdfBytes.byteLength.toString(),
        'Cache-Control': 'private, no-transform, max-age=3600',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    const formatted = formatErrorResponse(error);
    logger.error('Failed to generate Result PDF', { attemptId }, error instanceof Error ? error : new Error(String(error)));
    return new Response(JSON.stringify(formatted.body), {
      status: formatted.statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
