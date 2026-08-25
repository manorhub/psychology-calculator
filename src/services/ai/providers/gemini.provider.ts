import type { AIProvider, AIGenerationOptions, AIGenerationResponse } from './ai-provider.interface';
import { ExternalServiceError } from '@/lib/errors';

export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini' as const;

  public async generateStructured(
    prompt: string,
    systemPrompt: string,
    options: AIGenerationOptions
  ): Promise<AIGenerationResponse> {
    const startTime = Date.now();
    const apiKey = options.apiKey;
    const model = options.model || 'gemini-1.5-flash';

    if (!apiKey) {
      throw new ExternalServiceError('GEMINI_API_KEY is not configured in server environment');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const timeoutMs = options.timeoutMs || 90000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 4096
          }
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new ExternalServiceError(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as any;
      const latencyMs = Date.now() - startTime;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      const inputTokens = data.usageMetadata?.promptTokenCount || Math.round(prompt.length / 4);
      const outputTokens = data.usageMetadata?.candidatesTokenCount || Math.round(text.length / 4);

      return {
        contentJson: text,
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
        throw new ExternalServiceError(`Gemini request timed out after ${seconds} seconds`);
      }
      throw err instanceof ExternalServiceError ? err : new ExternalServiceError(err.message || 'Gemini generation failed');
    }
  }

  public async testConnection(apiKey?: string, model = 'gemini-1.5-flash'): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      if (!apiKey) return { success: false, latencyMs: 0, error: 'Missing API key' };
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with {"status": "ok"}' }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 20 }
        })
      });
      return { success: res.ok, latencyMs: Date.now() - start, error: res.ok ? undefined : `Status ${res.status}` };
    } catch (e: any) {
      return { success: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
