import type { ResultSnapshotData } from '@/types/database';

export class AIContextBuilder {
  /**
   * Builds the complete prompt for the LLM using the database-driven template and verified snapshot scores
   */
  public static buildInterpretationPrompt(template: string, snapshot: ResultSnapshotData): string {
    const dimensionsSummary = snapshot.dimensionScores
      .map(
        (d) =>
          `• ${d.dimensionName}: ${d.normalizedScore}% (Raw: ${d.rawScore}/${d.maxScore})${
            d.resultTypeName ? ` [Classification: ${d.resultTypeName}]` : ''
          }`
      )
      .join('\n');

    let prompt = template
      .replace(/\{\{assessment_name\}\}/g, snapshot.assessmentName)
      .replace(/\{\{assessment_version\}\}/g, String(snapshot.assessmentVersion))
      .replace(/\{\{primary_result_name\}\}/g, snapshot.primaryResultType?.name || 'Assessed Profile')
      .replace(
        /\{\{primary_result_description\}\}/g,
        snapshot.primaryResultType?.description || 'Standardized psychometric evaluation.'
      )
      .replace(/\{\{overall_score\}\}/g, String(snapshot.totalNormalizedScore))
      .replace(/\{\{dimensions_summary\}\}/g, dimensionsSummary);

    // Append strict JSON output formatting instructions
    prompt += `\n\nREQUIRED JSON RESPONSE SCHEMA:
You MUST respond with a valid, parseable JSON object matching this exact structure:
{
  "summary": "2-3 paragraphs of insightful, empathetic, and personalized psychological interpretation synthesizing the verified dimensions and outcome.",
  "key_traits": ["3-5 prominent behavioral tendencies or cognitive habits deduced from scores"],
  "strengths": ["3-5 key strengths and cognitive assets"],
  "challenges": ["2-4 potential blind spots or stress-induced vulnerabilities"],
  "communication": "1-2 paragraphs analyzing conversational style and boundary expression.",
  "relationships": "1-2 paragraphs exploring intimacy, trust, and interpersonal connection patterns.",
  "work_style": "1-2 paragraphs evaluating problem solving, collaboration, and execution dynamics.",
  "growth_opportunities": ["3-4 actionable psychological growth frontiers"],
  "practical_suggestions": ["3-5 evidence-based, actionable daily exercises or reflective practices"]
}`;

    return prompt;
  }
}
