import type { APIRoute } from 'astro';
import type { ApiResponse } from '@/types/api';
import { getD1Database } from '@/lib/db/client';
import { ShareService } from '@/services/share.service';

export const POST: APIRoute = async ({ params, request, cookies, locals }) => {
  try {
    const { token } = params;
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Token is required' }), { status: 400 });
    }

    let bodyJson: Record<string, any> = {};
    try {
      bodyJson = await request.json();
    } catch {
      // Empty body
    }

    const env = locals.runtime?.env;
    const db = getD1Database(env);
    const shareService = new ShareService(db);

    const eventName = bodyJson.event || 'share_channel_clicked';
    const channel = bodyJson.channel || 'direct';
    const sessionId = cookies.get('mm_guest_id')?.value || locals.user?.id || 'anonymous';

    await shareService.trackShareEvent(token, eventName, channel, sessionId);

    const response: ApiResponse = {
      success: true,
      data: { recorded: true },
      meta: { requestId: locals.requestId, timestamp: new Date().toISOString() }
    };
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};
