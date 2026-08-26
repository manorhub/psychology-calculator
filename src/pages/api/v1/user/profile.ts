import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { UserService } from '@/services/user.service';
import { formatErrorResponse, UnauthorizedError, ValidationError } from '@/lib/errors';

export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const currentUser = locals.user;
    if (!currentUser) throw new UnauthorizedError('Authentication required to update profile');

    const body = (await request.json().catch(() => ({}))) as {
      displayName?: string;
      timezone?: string;
      locale?: string;
    };

    const { displayName, timezone, locale } = body;

    if (displayName !== undefined) {
      if (typeof displayName !== 'string' || displayName.trim().length === 0 || displayName.length > 50) {
        throw new ValidationError('Display name must be between 1 and 50 characters');
      }
    }

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const userService = new UserService(db);

    await userService.updateProfile(currentUser.id, {
      display_name: displayName ? displayName.trim() : undefined,
      timezone: timezone || undefined,
      locale: locale || undefined
    });

    const updatedProfile = await userService.getProfile(currentUser.id);

    const response: ApiResponse = {
      success: true,
      data: updatedProfile,
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
