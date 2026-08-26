import { z } from 'zod';
import type { AIReportContent } from '@/types/database';
import { ValidationError } from '@/lib/errors';

export const AIDimensionAnalysisSchema = z.object({
  dimension_name: z.string().default('Dimension'),
  score_percent: z.number().or(z.string().transform((v) => parseFloat(v) || 0)).default(50),
  level: z.string().default('Moderate'),
  what_it_measures: z.string().default(''),
  personalized_interpretation: z.string().default(''),
  behavioral_expression: z.string().default(''),
  key_strength: z.string().default(''),
  potential_challenge: z.string().default(''),
  practical_reflection: z.string().default('')
});

export const AIStrengthItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  context: z.string().optional()
});

export const AIGrowthBlindspotSchema = z.object({
  title: z.string(),
  manifestation: z.string(),
  impact: z.string().default(''),
  constructive_response: z.string().default('')
});

export const AIActionPlanItemSchema = z.object({
  goal: z.string(),
  why_it_matters: z.string().default(''),
  action: z.string(),
  frequency: z.string().default('Weekly')
});

export const AICrossDimensionInteractionsSchema = z.object({
  core_pattern: z.string().default(''),
  trait_synergies: z.array(z.string()).default([]),
  trait_tensions: z.array(z.string()).default([]),
  situational_differences: z.string().default('')
});

export const AIRelationshipsCommunicationSchema = z.object({
  relational_style: z.string().default(''),
  communication_style: z.string().default(''),
  listening_conflict: z.string().default(''),
  partner_dynamics: z.string().default(''),
  relationship_tips: z.array(z.string()).default([])
});

export const AIWorkLeadershipSchema = z.object({
  work_environment: z.string().default(''),
  collaboration_teamwork: z.string().default(''),
  decision_problem_solving: z.string().default(''),
  leadership_mentorship: z.string().default(''),
  workplace_strengths: z.array(z.string()).default([]),
  workplace_challenges: z.array(z.string()).default([])
});

export const AIStressAdaptabilitySchema = z.object({
  pressure_patterns: z.string().default(''),
  adaptability_change: z.string().default(''),
  recovery_equilibrium: z.string().default('')
});

export const AIFinalSynthesisSchema = z.object({
  notable_trait: z.string().default(''),
  primary_advantage: z.string().default(''),
  growth_frontier: z.string().default(''),
  relationship_insight: z.string().default(''),
  work_insight: z.string().default(''),
  next_step: z.string().default(''),
  reflection_questions: z.array(z.string()).default([]),
  closing_summary: z.string().default('')
});

export const AIReportContentSchema = z.object({
  headline: z.string().optional(),
  summary: z.string().min(10, 'Summary too short'),
  key_traits: z.array(z.string()).default([]),
  dimension_analyses: z.array(AIDimensionAnalysisSchema).optional(),
  cross_dimension_interactions: AICrossDimensionInteractionsSchema.optional(),
  strengths: z.union([z.array(z.string()), z.array(AIStrengthItemSchema)]).default([]),
  challenges: z.array(z.string()).default([]),
  growth_blindspots: z.array(AIGrowthBlindspotSchema).optional(),
  communication: z.string().default(''),
  relationships: z.string().default(''),
  relationships_communication: AIRelationshipsCommunicationSchema.optional(),
  work_style: z.string().default(''),
  work_leadership: AIWorkLeadershipSchema.optional(),
  stress_adaptability: AIStressAdaptabilitySchema.optional(),
  growth_opportunities: z.array(z.string()).default([]),
  practical_suggestions: z.array(z.string()).default([]),
  action_plan: z.array(AIActionPlanItemSchema).optional(),
  final_synthesis: AIFinalSynthesisSchema.optional()
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
    const sanitizeStr = (s: string | undefined | null) =>
      (s || '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();

    return {
      headline: data.headline ? sanitizeStr(data.headline) : undefined,
      summary: sanitizeStr(data.summary),
      key_traits: data.key_traits.map(sanitizeStr).filter(Boolean),
      dimension_analyses: data.dimension_analyses?.map((d) => ({
        dimension_name: sanitizeStr(d.dimension_name),
        score_percent: Number(d.score_percent) || 0,
        level: sanitizeStr(d.level),
        what_it_measures: sanitizeStr(d.what_it_measures),
        personalized_interpretation: sanitizeStr(d.personalized_interpretation),
        behavioral_expression: sanitizeStr(d.behavioral_expression),
        key_strength: sanitizeStr(d.key_strength),
        potential_challenge: sanitizeStr(d.potential_challenge),
        practical_reflection: sanitizeStr(d.practical_reflection)
      })),
      cross_dimension_interactions: data.cross_dimension_interactions
        ? {
            core_pattern: sanitizeStr(data.cross_dimension_interactions.core_pattern),
            trait_synergies: data.cross_dimension_interactions.trait_synergies.map(sanitizeStr).filter(Boolean),
            trait_tensions: data.cross_dimension_interactions.trait_tensions.map(sanitizeStr).filter(Boolean),
            situational_differences: sanitizeStr(data.cross_dimension_interactions.situational_differences)
          }
        : undefined,
      strengths: Array.isArray(data.strengths)
        ? (data.strengths as any[]).map((st) => {
            if (typeof st === 'string') return sanitizeStr(st);
            return {
              title: sanitizeStr(st.title),
              description: sanitizeStr(st.description),
              context: st.context ? sanitizeStr(st.context) : undefined
            };
          })
        : [],
      challenges: data.challenges.map(sanitizeStr).filter(Boolean),
      growth_blindspots: data.growth_blindspots?.map((g) => ({
        title: sanitizeStr(g.title),
        manifestation: sanitizeStr(g.manifestation),
        impact: sanitizeStr(g.impact),
        constructive_response: sanitizeStr(g.constructive_response)
      })),
      communication: sanitizeStr(data.communication),
      relationships: sanitizeStr(data.relationships),
      relationships_communication: data.relationships_communication
        ? {
            relational_style: sanitizeStr(data.relationships_communication.relational_style),
            communication_style: sanitizeStr(data.relationships_communication.communication_style),
            listening_conflict: sanitizeStr(data.relationships_communication.listening_conflict),
            partner_dynamics: sanitizeStr(data.relationships_communication.partner_dynamics),
            relationship_tips: data.relationships_communication.relationship_tips.map(sanitizeStr).filter(Boolean)
          }
        : undefined,
      work_style: sanitizeStr(data.work_style),
      work_leadership: data.work_leadership
        ? {
            work_environment: sanitizeStr(data.work_leadership.work_environment),
            collaboration_teamwork: sanitizeStr(data.work_leadership.collaboration_teamwork),
            decision_problem_solving: sanitizeStr(data.work_leadership.decision_problem_solving),
            leadership_mentorship: sanitizeStr(data.work_leadership.leadership_mentorship),
            workplace_strengths: data.work_leadership.workplace_strengths.map(sanitizeStr).filter(Boolean),
            workplace_challenges: data.work_leadership.workplace_challenges.map(sanitizeStr).filter(Boolean)
          }
        : undefined,
      stress_adaptability: data.stress_adaptability
        ? {
            pressure_patterns: sanitizeStr(data.stress_adaptability.pressure_patterns),
            adaptability_change: sanitizeStr(data.stress_adaptability.adaptability_change),
            recovery_equilibrium: sanitizeStr(data.stress_adaptability.recovery_equilibrium)
          }
        : undefined,
      growth_opportunities: data.growth_opportunities.map(sanitizeStr).filter(Boolean),
      practical_suggestions: data.practical_suggestions.map(sanitizeStr).filter(Boolean),
      action_plan: data.action_plan?.map((a) => ({
        goal: sanitizeStr(a.goal),
        why_it_matters: sanitizeStr(a.why_it_matters),
        action: sanitizeStr(a.action),
        frequency: sanitizeStr(a.frequency)
      })),
      final_synthesis: data.final_synthesis
        ? {
            notable_trait: sanitizeStr(data.final_synthesis.notable_trait),
            primary_advantage: sanitizeStr(data.final_synthesis.primary_advantage),
            growth_frontier: sanitizeStr(data.final_synthesis.growth_frontier),
            relationship_insight: sanitizeStr(data.final_synthesis.relationship_insight),
            work_insight: sanitizeStr(data.final_synthesis.work_insight),
            next_step: sanitizeStr(data.final_synthesis.next_step),
            reflection_questions: data.final_synthesis.reflection_questions.map(sanitizeStr).filter(Boolean),
            closing_summary: sanitizeStr(data.final_synthesis.closing_summary)
          }
        : undefined
    };
  }
}
