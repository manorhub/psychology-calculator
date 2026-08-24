import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { NotificationService } from '@/services/notifications/notification.service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user;
  if (!currentUser) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const notificationService = new NotificationService(db);

  try {
    const body = (await request.json()) as any;
    const { action, id, preferences } = body;

    if (action === 'mark_read') {
      if (!id) {
        return new Response(JSON.stringify({ success: false, message: 'Notification ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      await notificationService.markAsRead(id, currentUser.id);
      return new Response(JSON.stringify({ success: true, message: 'Notification marked as read' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'mark_all_read') {
      await notificationService.markAllAsRead(currentUser.id);
      return new Response(JSON.stringify({ success: true, message: 'All notifications marked as read' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'update_preferences') {
      if (!preferences) {
        return new Response(JSON.stringify({ success: false, message: 'Preferences payload required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      await notificationService.updatePreferences(currentUser.id, preferences);
      return new Response(JSON.stringify({ success: true, message: 'Preferences updated' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, message: `Unknown action: ${action}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
