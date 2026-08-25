import type { AIProvider, AIGenerationOptions, AIGenerationResponse } from './ai-provider.interface';
import { ExternalServiceError } from '@/lib/errors';

export class OpenRouterProvider implements AIProvider {
  public readonly name = 'openrouter' as const;

  public async generateStructured(
    prompt: string,
    systemPrompt: string,
    options: AIGenerationOptions
  ): Promise<AIGenerationResponse> {
    const startTime = Date.now();
    const apiKey = options.apiKey;
    const model = options.model || 'anthropic/claude-3.5-haiku';

    if (!apiKey) {
      throw new ExternalServiceError('OPENROUTER_API_KEY is not configured in server environment');
    }

    try {
      const timeoutMs = options.timeoutMs || 90000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://psychologycalculator.com',
          'X-Title': 'Psychology Calculator'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new ExternalServiceError(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as any;
      const latencyMs = Date.now() - startTime;
      const contentJson = data.choices?.[0]?.message?.content || '{}';

      const inputTokens = data.usage?.prompt_tokens || Math.round(prompt.length / 4);
      const outputTokens = data.usage?.completion_tokens || Math.round(contentJson.length / 4);

      return {
        contentJson,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        provider: this.name,
        model,
        latencyMs
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const seconds = Math.round((options.timeoutMs || 90000) / 1000);
        throw new ExternalServiceError(`OpenRouter request timed out after ${seconds} seconds`);
      }
      throw err instanceof ExternalServiceError ? err : new ExternalServiceError(err.message || 'OpenRouter generation failed');
    }
  }

  public async testConnection(apiKey?: string, model = 'anthropic/claude-3.5-haiku'): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      if (!apiKey) return { success: false, latencyMs: 0, error: 'Missing API key' };
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Respond with {"status": "ok"}' }],
          max_tokens: 20
        })
      });
      return { success: res.ok, latencyMs: Date.now() - start, error: res.ok ? undefined : `Status ${res.status}` };
    } catch (e: any) {
      return { success: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
