import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import type { DynamicSiteConfig } from '@/types/config';
import { ConfigService } from '@/services/config.service';
import { getD1Database } from '@/lib/db/client';
import { formatErrorResponse } from '@/lib/errors';
import { TECHNICAL_CONFIG } from '@/config/technical';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const configService = new ConfigService(db);
    const config = await configService.getSiteConfig();

    const responseBody: ApiResponse<DynamicSiteConfig> = {
      success: true,
      data: config,
      meta: {
        requestId: locals.requestId,
        timestamp: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(responseBody, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60'
      }
    });
  } catch (error) {
    const { statusCode, body } = formatErrorResponse(error);
    const errorResponse: ApiResponse = {
      success: false,
      error: body,
      meta: {
        requestId: locals.requestId,
        timestamp: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': TECHNICAL_CONFIG.cacheControl.apiNoCache
      }
    });
  }
};
