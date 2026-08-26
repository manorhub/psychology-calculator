import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { ShareService } from '@/services/share.service';
import { formatErrorResponse, ValidationError } from '@/lib/errors';

export const POST: APIRoute = async ({ params, cookies, locals, request }) => {
  try {
    const { id } = params;
    if (!id) throw new ValidationError('Attempt ID is required');

    let bodyJson: Record<string, any> = {};
    try {
      bodyJson = await request.json();
    } catch {
      // Empty or no JSON body
    }

    const language = bodyJson.language || 'en';

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const shareService = new ShareService(db);

    const currentUser = locals.user;
    const guestSessionId = cookies.get('mm_guest_id')?.value || request.headers.get('x-guest-session') || null;

    const shareResult = await shareService.createOrGetPublicShare(
      id,
      currentUser?.id || null,
      guestSessionId,
      language
    );

    // Track creation event
    await shareService.trackShareEvent(
      shareResult.shareToken,
      'share_created',
      bodyJson.channel || 'direct',
      guestSessionId || currentUser?.id || 'session'
    );

    const response: ApiResponse = {
      success: true,
      data: shareResult,
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    const errorResponse: ApiResponse = {
      success: false,
      error: body,
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(errorResponse), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ params, cookies, locals, request }) => {
  try {
    const { id } = params;
    if (!id) throw new ValidationError('Attempt ID is required');

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const shareService = new ShareService(db);

    const currentUser = locals.user;
    const guestSessionId = cookies.get('mm_guest_id')?.value || request.headers.get('x-guest-session') || null;

    await shareService.revokePublicShare(
      id,
      currentUser?.id || null,
      guestSessionId
    );

    const response: ApiResponse = {
      success: true,
      data: { message: 'Share link revoked successfully' },
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    const errorResponse: ApiResponse = {
      success: false,
      error: body,
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(errorResponse), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
  }
};
