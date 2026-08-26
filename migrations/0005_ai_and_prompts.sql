-- Migration 0005: AI Configurations and Dynamic Versioned Prompts
-- Cloudflare D1 (SQLite)

-- 1. AI Configurations (Dynamic Provider & Model Management)
CREATE TABLE IF NOT EXISTS ai_configurations (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini', 'anthropic', 'openrouter', 'deepseek')),
    model TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 1, -- 1 = highest priority
    api_key_reference TEXT NOT NULL, -- Name of environment secret (e.g. "OPENAI_API_KEY") - NOT the plaintext key
    token_limit INTEGER NOT NULL DEFAULT 4096,
    temperature REAL NOT NULL DEFAULT 0.7,
    credit_cost INTEGER NOT NULL DEFAULT 1,
    system_prompt TEXT,
    fallback_provider_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fallback_provider_id) REFERENCES ai_configurations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_configs_enabled ON ai_configurations(is_enabled, priority);

-- 2. AI Prompts (Admin-managed dynamic prompt templates)
CREATE TABLE IF NOT EXISTS ai_prompts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    purpose TEXT NOT NULL, -- e.g. "assessment_interpretation", "growth_roadmap", "relationship_compatibility"
    prompt_template TEXT NOT NULL, -- Contains template variables like {{assessment_name}}, {{dimensions}}, {{scores}}
    provider_override TEXT, -- Optional override
    model_override TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_slug ON ai_prompts(slug);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_purpose ON ai_prompts(purpose, status);
