import { z } from 'zod';
import type { AIReportContent } from '@/types/database';
import { ValidationError } from '@/lib/errors';

export const AIReportContentSchema = z.object({
  summary: z.string().min(20, 'Summary too short'),
  key_traits: z.array(z.string()).min(1, 'At least 1 trait required'),
  strengths: z.array(z.string()).min(1, 'At least 1 strength required'),
  challenges: z.array(z.string()).default([]),
  communication: z.string().default(''),
  relationships: z.string().default(''),
  work_style: z.string().default(''),
  growth_opportunities: z.array(z.string()).default([]),
  practical_suggestions: z.array(z.string()).min(1, 'At least 1 suggestion required')
});

export class AIValidator {
  /**
   * Parses raw LLM JSON response and sanitizes fields
   */
  public static validateAndSanitize(rawJson: string): AIReportContent {
    let parsed: any;
    try {
      // Remove any accidental markdown backticks (e.g. ```json ... ```)
      const cleanJson = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (e: any) {
      throw new ValidationError(`Failed to parse AI response as JSON: ${e.message}`);
    }

    const result = AIReportContentSchema.safeParse(parsed);
    if (!result.success) {
      throw new ValidationError(`AI response failed schema validation: ${result.error.message}`);
    }

    const data = result.data;

    // Sanitize string content (strip dangerous HTML/script tags)
    const sanitizeStr = (s: string) =>
      s
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();

    return {
      summary: sanitizeStr(data.summary),
      key_traits: data.key_traits.map(sanitizeStr).filter(Boolean),
      strengths: data.strengths.map(sanitizeStr).filter(Boolean),
      challenges: data.challenges.map(sanitizeStr).filter(Boolean),
      communication: sanitizeStr(data.communication),
      relationships: sanitizeStr(data.relationships),
      work_style: sanitizeStr(data.work_style),
      growth_opportunities: data.growth_opportunities.map(sanitizeStr).filter(Boolean),
      practical_suggestions: data.practical_suggestions.map(sanitizeStr).filter(Boolean)
    };
  }
}
