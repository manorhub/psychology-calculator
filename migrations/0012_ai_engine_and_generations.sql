-- Migration 0012: AI Generation Audit & Prompt Templates
-- Cloudflare D1 (SQLite)

-- 1. AI Generations Table
-- Tracks token usage, latency, provider, model, prompt version, estimated costs, and errors
CREATE TABLE IF NOT EXISTS ai_generations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    attempt_id TEXT NOT NULL,
    report_id TEXT,
    provider TEXT NOT NULL, -- e.g. "gemini", "openai", "openrouter", "deepseek"
    model TEXT NOT NULL, -- e.g. "gemini-1.5-flash", "gpt-4o-mini"
    prompt_slug TEXT NOT NULL,
    prompt_version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost REAL NOT NULL DEFAULT 0.0,
    generation_time_ms INTEGER NOT NULL DEFAULT 0,
    error_category TEXT, -- e.g. "timeout", "rate_limit", "schema_validation", "provider_error"
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_gen_attempt ON ai_generations(attempt_id);
CREATE INDEX IF NOT EXISTS idx_ai_gen_user ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_gen_provider ON ai_generations(provider, status);
CREATE INDEX IF NOT EXISTS idx_ai_gen_created ON ai_generations(created_at);

-- 2. Seed Default AI Configurations (OpenAI, Gemini, OpenRouter, DeepSeek)
INSERT OR IGNORE INTO ai_configurations (
    id, provider, model, is_enabled, priority, api_key_reference, token_limit, temperature, credit_cost, system_prompt
) VALUES
('cfg_gemini', 'gemini', 'gemini-1.5-flash', 1, 1, 'GEMINI_API_KEY', 4096, 0.7, 5, 'You are an empathetic, scientifically grounded psychological insight synthesizer for Psychology Calculator (psychologycalculator.com). Your role is to turn verified, deterministic self-assessment scores into structured, practical self-reflection narratives. NEVER diagnose medical or mental disorders, never prescribe medication, and always present findings as opportunities for self-discovery.'),
('cfg_openai', 'openai', 'gpt-4o-mini', 1, 2, 'OPENAI_API_KEY', 4096, 0.7, 5, 'You are an empathetic, scientifically grounded psychological insight synthesizer for Psychology Calculator (psychologycalculator.com). Your role is to turn verified, deterministic self-assessment scores into structured, practical self-reflection narratives. NEVER diagnose medical or mental disorders, never prescribe medication, and always present findings as opportunities for self-discovery.'),
('cfg_openrouter', 'openrouter', 'anthropic/claude-3.5-haiku', 0, 3, 'OPENROUTER_API_KEY', 4096, 0.7, 5, 'You are an empathetic, scientifically grounded psychological insight synthesizer for Psychology Calculator (psychologycalculator.com).'),
('cfg_deepseek', 'deepseek', 'deepseek-chat', 0, 4, 'DEEPSEEK_API_KEY', 4096, 0.7, 5, 'You are an empathetic, scientifically grounded psychological insight synthesizer for Psychology Calculator (psychologycalculator.com).');

-- Set fallback relationships
UPDATE ai_configurations SET fallback_provider_id = 'cfg_openai' WHERE id = 'cfg_gemini';
UPDATE ai_configurations SET fallback_provider_id = 'cfg_gemini' WHERE id = 'cfg_openai';

-- 3. Seed Default AI Interpretation Prompt
INSERT OR IGNORE INTO ai_prompts (
    id, name, slug, purpose, prompt_template, version, status
) VALUES (
    'prompt_report_v1',
    'Comprehensive Psychometric Interpretation',
    'assessment-interpretation',
    'Synthesize a comprehensive psychological report based strictly on the verified deterministic assessment scores provided below. Return a valid JSON object matching the requested schema.\n\nAssessment: {{assessment_name}} (v{{assessment_version}})\nPrimary Outcome Archetype: {{primary_result_name}}\nDescription: {{primary_result_description}}\nOverall Normalized Score: {{overall_score}}%\n\nEvaluated Dimensions & Normalized Scores:\n{{dimensions_summary}}\n\nGuidelines:\n- Explain the cognitive and emotional strengths indicated by these scores.\n- Outline growth opportunities, interpersonal communication dynamics, relationship patterns, and practical recommendations.\n- Do not make clinical diagnosis claims.',
    1,
    'active'
);
