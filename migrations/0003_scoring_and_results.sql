-- Migration 0003: Dynamic Scoring Rules, Result Types, and Modular Result Content
-- Cloudflare D1 (SQLite)

-- 1. Scoring Rules
CREATE TABLE IF NOT EXISTS scoring_rules (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    dimension_id TEXT NOT NULL,
    option_id TEXT, -- nullable if scoring directly applies to numerical question value
    score REAL NOT NULL DEFAULT 0.0,
    weight REAL NOT NULL DEFAULT 1.0,
    reverse_scoring INTEGER NOT NULL DEFAULT 0, -- 1 = true, 0 = false
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (dimension_id) REFERENCES assessment_dimensions(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES question_options(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scoring_assessment ON scoring_rules(assessment_id);
CREATE INDEX IF NOT EXISTS idx_scoring_question ON scoring_rules(question_id);
CREATE INDEX IF NOT EXISTS idx_scoring_dimension ON scoring_rules(dimension_id);

-- 2. Result Types (Archetypes, Range-based outcomes, or Dimension tiers)
CREATE TABLE IF NOT EXISTS result_types (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    dimension_id TEXT, -- nullable for global assessment results vs dimension-specific results
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    minimum_score REAL NOT NULL DEFAULT 0.0,
    maximum_score REAL NOT NULL DEFAULT 100.0,
    display_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (dimension_id) REFERENCES assessment_dimensions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_result_types_assessment ON result_types(assessment_id, display_order);
CREATE INDEX IF NOT EXISTS idx_result_types_dimension ON result_types(dimension_id);

-- 3. Result Content Sections (Admin-configurable rich content)
CREATE TABLE IF NOT EXISTS result_contents (
    id TEXT PRIMARY KEY,
    result_type_id TEXT NOT NULL,
    section_type TEXT NOT NULL CHECK (section_type IN (
        'overview',
        'strengths',
        'challenges',
        'communication',
        'relationships',
        'work_style',
        'growth_suggestions',
        'recommendations',
        'custom'
    )),
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Markdown or formatted rich text
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (result_type_id) REFERENCES result_types(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_result_contents_type ON result_contents(result_type_id, display_order);
