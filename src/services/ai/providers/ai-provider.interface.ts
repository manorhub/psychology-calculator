import type { AIProviderType } from '@/types/database';

export interface AIGenerationOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  apiKey?: string;
}

export interface AIGenerationResponse {
  contentJson: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  provider: AIProviderType;
  model: string;
  latencyMs: number;
}

export interface AIProvider {
  readonly name: AIProviderType;
  generateStructured(
    prompt: string,
    systemPrompt: string,
    options: AIGenerationOptions
  ): Promise<AIGenerationResponse>;
  testConnection(apiKey?: string, model?: string): Promise<{ success: boolean; latencyMs: number; error?: string }>;
}
