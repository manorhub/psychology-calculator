import type { APIRoute } from 'astro';
import { getD1Database } from '@/lib/db/client';
import { SettingsService } from '@/services/settings/settings.service';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env;
  const db = getD1Database(env);
  const settingsService = new SettingsService(db);

  const content = await settingsService.get<string>(
    'llms_txt_content',
    '# Psychology Calculator (psychologycalculator.com)\n\n> Evidence-based psychological assessments and psychometrics platform.\n\n## Core Instruments\n- /assessments/big-five-personality-test : Big Five (OCEAN) Personality Evaluation\n- /assessments/attachment-style-test : Adult Relational Attachment Patterns\n- /assessments/emotional-intelligence-test : Emotional Intelligence (EQ)\n\n## Methodology\nAll instruments use validated psychological scales and deterministic scoring engines.'
  );

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
