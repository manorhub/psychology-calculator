import type { ResultSnapshotData } from '@/types/database';
import { SUPPORTED_LANGUAGES, type SupportedLocale, DEFAULT_LOCALE } from '@/i18n';

export class AIContextBuilder {
  /**
   * Builds the complete full-length prompt for the LLM using verified snapshot scores,
   * construct metadata, target locale, and structured multi-page JSON requirements.
   */
  public static buildInterpretationPrompt(
    template: string,
    snapshot: ResultSnapshotData,
    targetLocale: string = DEFAULT_LOCALE
  ): string {
    const langInfo = SUPPORTED_LANGUAGES[targetLocale as SupportedLocale] || SUPPORTED_LANGUAGES[DEFAULT_LOCALE];
    const dimensionsDetailed = snapshot.dimensionScores
      .map(
        (d, idx) =>
          `Dimension ${idx + 1}: ${d.dimensionName} (Slug: ${d.dimensionSlug})\n` +
          `• Normalized Score: ${d.normalizedScore}% (Raw: ${d.rawScore} / ${d.maxScore})\n` +
          `• Evaluated Classification: ${d.resultTypeName || (d.normalizedScore >= 70 ? 'High' : d.normalizedScore >= 35 ? 'Moderate' : 'Low')}\n` +
          (d.description ? `• Construct Description: ${d.description}\n` : '')
      )
      .join('\n');

    const primaryArchetype = snapshot.primaryResultType?.name || 'Standardized Psychological Profile';
    const primaryDesc = snapshot.primaryResultType?.description || 'Standardized psychometric evaluation.';

    let prompt = template
      .replace(/\{\{assessment_name\}\}/g, snapshot.assessmentName)
      .replace(/\{\{assessment_version\}\}/g, String(snapshot.assessmentVersion))
      .replace(/\{\{primary_result_name\}\}/g, primaryArchetype)
      .replace(/\{\{primary_result_description\}\}/g, primaryDesc)
      .replace(/\{\{overall_score\}\}/g, String(snapshot.totalNormalizedScore))
      .replace(/\{\{dimensions_summary\}\}/g, dimensionsDetailed);

    // Append full-length structured multi-section JSON output instructions
    prompt += `\n\n========================================================================
FULL-LENGTH PROFESSIONAL PSYCHOMETRIC REPORT GENERATION INSTRUCTIONS:
========================================================================
You are an expert psychometrician and cognitive researcher generating a comprehensive 10-12 page professional self-reflection report (approx 2,000–3,000 words of high-density insights across all sections).

CRITICAL LANGUAGE INSTRUCTION:
- Target Language: ${langInfo.name} (${langInfo.nativeName} [${langInfo.code}])
- All JSON schema keys MUST remain in standard English.
- ALL narrative text, headers, explanations, interpretations, feedback, and action plans in the JSON string values MUST be written natively, fluently, and culturally appropriately in ${langInfo.name} (${langInfo.nativeName}). Do not mix English words into the narrative unless standard psychological domain terminology.

CRITICAL SCIENTIFIC & SAFETY GUIDELINES:
1. Base all interpretations strictly on the user's verified dimensional scores above.
2. Use respectful, nuanced psychological language ("Your responses suggest...", "This pattern may be associated with...").
3. DO NOT pathologize low or high scores. Frame all patterns as natural human variations with distinct advantages and trade-offs.
4. NEVER provide medical diagnoses, treatment prescriptions, or career pigeonholing.
5. Provide detailed, substantive, non-repetitive paragraphs for every single section.

REQUIRED JSON RESPONSE SCHEMA:
You MUST respond with a valid, parseable JSON object matching this exact structure:
{
  "headline": "A punchy, insightful, personalized 1-sentence assessment summary header.",
  
  "summary": "Detailed Executive Psychological Summary (300–450 words across 2-3 cohesive paragraphs). Thoroughly analyze the user's overall cognitive and emotional configuration, prominent tendencies, balance between dimensions, and environmental preferences.",
  
  "key_traits": [
    "4-6 prominent behavioral tendencies or cognitive signatures clearly deduced from their score profile"
  ],
  
  "dimension_analyses": [
    ${snapshot.dimensionScores
      .map(
        (d) => `{
      "dimension_name": "${d.dimensionName}",
      "score_percent": ${d.normalizedScore},
      "level": "${d.resultTypeName || (d.normalizedScore >= 70 ? 'High' : d.normalizedScore >= 35 ? 'Moderate' : 'Low')}",
      "what_it_measures": "Clear definition of the psychological construct.",
      "personalized_interpretation": "100–160 words analyzing how this specific score manifests in cognition and daily life.",
      "behavioral_expression": "Observable behaviors and habits typical of this score level.",
      "key_strength": "The primary cognitive or interpersonal advantage granted by this level.",
      "potential_challenge": "A subtle vulnerability or blind spot to be mindful of.",
      "practical_reflection": "A targeted self-reflection question for this dimension."
    }`
      )
      .join(',\n    ')}
  ],

  "cross_dimension_interactions": {
    "core_pattern": "In-depth analysis (200-300 words) of how the user's dimensions interact with one another rather than in isolation.",
    "trait_synergies": [
      "2-3 specific ways high or moderate dimensions reinforce each other positively"
    ],
    "trait_tensions": [
      "2-3 natural trade-offs, internal tensions, or situational dilemmas created by this combination"
    ],
    "situational_differences": "Detailed explanation of how this profile responds when under pressure vs in comfortable environments."
  },

  "strengths": [
    {
      "title": "Distinctive Strength Name",
      "description": "Thorough explanation of why this strength appears from the scores, how it creates value, and where it is especially powerful.",
      "context": "Optimal environment or situation where this shines."
    }
  ],

  "growth_blindspots": [
    {
      "title": "Constructive Growth Opportunity",
      "manifestation": "What tends to happen and why it occurs under specific conditions.",
      "impact": "How this might subtly affect productivity, relationships, or inner well-being.",
      "constructive_response": "Specific, actionable strategy to navigate this constructively without judgment."
    }
  ],

  "relationships_communication": {
    "relational_style": "1-2 paragraphs analyzing intimacy, bonding tendencies, trust dynamics, and emotional expression.",
    "communication_style": "Detailed evaluation of conversational habits, assertiveness, and boundary expression.",
    "listening_conflict": "Analysis of listening style, perspective-taking, and conflict navigation tendencies.",
    "partner_dynamics": "What this profile deeply values from colleagues/partners and potential misunderstandings.",
    "relationship_tips": [
      "3-4 practical, actionable practices for improving interpersonal connection"
    ]
  },

  "work_leadership": {
    "work_environment": "Analysis of optimal work settings, autonomy needs, and team pace.",
    "collaboration_teamwork": "Collaboration style, group dynamics, and feedback reception.",
    "decision_problem_solving": "Cognitive approach to risk, ambiguity, analytical rigor, and execution.",
    "leadership_mentorship": "Natural leadership, mentoring, and influence style.",
    "workplace_strengths": [
      "3-4 concrete professional superpowers"
    ],
    "workplace_challenges": [
      "2-3 potential workplace friction points or energy drains"
    ]
  },

  "stress_adaptability": {
    "pressure_patterns": "How cognitive processing and emotional regulation shift under acute pressure or chronic demand.",
    "adaptability_change": "Response to sudden organizational or environmental change, ambiguity, and disrupted routines.",
    "recovery_equilibrium": "Evidence-grounded decompression strategies specifically calibrated to restore this profile's energy."
  },

  "action_plan": [
    {
      "goal": "Clear self-mastery objective",
      "why_it_matters": "Psychological rationale connected to their test profile",
      "action": "Concrete, actionable step-by-step practice to execute",
      "frequency": "Recommended cadence (e.g. Daily morning habit, 2x per week, Monthly review)"
    }
  ],

  "final_synthesis": {
    "top_takeaways": [
      "5 distinct, high-impact key takeaways synthesized across the entire profile"
    ],
    "strongest_pattern": "A short, personalized explanation of the most prominent synergy across dimensions.",
    "biggest_growth_opportunity": "A constructive, non-judgmental explanation of the highest-leverage area for personal growth.",
    "notable_trait": "The single most defining signature of this profile.",
    "primary_advantage": "The highest-leverage natural asset to lean into.",
    "growth_frontier": "The most transformative area for intentional growth.",
    "relationship_insight": "Core interpersonal takeaway.",
    "work_insight": "Core professional takeaway.",
    "next_step": "One immediate, practical micro-action the user can take today.",
    "reflection_questions": [
      "3-4 deep metacognitive questions designed for personal journaling or self-reflection"
    ],
    "closing_summary": "An inspiring, grounded closing paragraph summarizing their path forward."
  }
}`;

    return prompt;
  }
}
