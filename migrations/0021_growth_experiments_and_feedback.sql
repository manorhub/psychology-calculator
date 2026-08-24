-- Migration: 0021_growth_experiments_and_feedback.sql
-- Description: Post-launch growth, dynamic CTAs, lightweight experiments, and user feedback

-- 1. Dynamic CTA Placements Table
CREATE TABLE IF NOT EXISTS cta_placements (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    placement TEXT NOT NULL CHECK (placement IN ('assessment_result', 'ai_report', 'blog', 'category', 'homepage')),
    title TEXT NOT NULL,
    description TEXT,
    button_text TEXT NOT NULL,
    button_url TEXT NOT NULL,
    position TEXT DEFAULT 'inline',
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cta_placements_placement ON cta_placements(placement, is_enabled);

-- 2. Lightweight Experiments (A/B Testing) Tables
CREATE TABLE IF NOT EXISTS experiments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'concluded')),
    target_placement TEXT NOT NULL,
    primary_metric TEXT NOT NULL DEFAULT 'cta_click' CHECK (primary_metric IN ('cta_click', 'assessment_start', 'assessment_complete', 'ai_report_view', 'subscription')),
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    winner_variant_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_placement ON experiments(target_placement, status);

CREATE TABLE IF NOT EXISTS experiment_variants (
    id TEXT PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    variant_key TEXT NOT NULL, -- 'control', 'variant_a', 'variant_b'
    name TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON with variant overrides (title, description, button_text, etc.)
    weight INTEGER NOT NULL DEFAULT 50, -- Percentage weight
    is_control INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
    UNIQUE(experiment_id, variant_key)
);

CREATE INDEX IF NOT EXISTS idx_exp_variants_exp ON experiment_variants(experiment_id);

CREATE TABLE IF NOT EXISTS experiment_assignments (
    id TEXT PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES experiment_variants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exp_assignments_user ON experiment_assignments(experiment_id, user_id);
CREATE INDEX IF NOT EXISTS idx_exp_assignments_session ON experiment_assignments(experiment_id, session_id);

-- 3. User Feedback Table
CREATE TABLE IF NOT EXISTS user_feedback (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('assessment', 'result', 'ai_report', 'page')),
    entity_id TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_helpful INTEGER CHECK (is_helpful IN (0, 1)),
    comment TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reviewed', 'archived')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_entity ON user_feedback(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status, created_at DESC);

-- 4. Seed Default Dynamic CTAs
INSERT OR IGNORE INTO cta_placements (id, slug, placement, title, description, button_text, button_url, position, is_enabled)
VALUES
('cta_res_ai', 'result-ai-synthesis', 'assessment_result', 'Unlock Your Deep AI Narrative Synthesis', 'Get deep, multi-dimensional psychological insights, tailored personal strengths, and actionable growth steps.', 'Generate AI Report', '/dashboard/reports', 'bottom', 1),
('cta_res_pro', 'result-pro-upgrade', 'assessment_result', 'Take Your Personal Growth Further', 'Upgrade to Psychology Calculator Pro for unlimited validated evaluations, deep AI syntheses, and PDF exports.', 'Explore Pro Plans', '/pricing', 'sidebar', 1),
('cta_blog_asm', 'blog-related-assessment', 'blog', 'Evaluate Your Psychological Profile Today', 'Take our scientifically validated 10-minute psychological assessment and discover evidence-based insights.', 'Take Free Assessment', '/assessments/big-five-personality-test', 'inline', 1),
('cta_home_featured', 'homepage-primary-hero', 'homepage', 'Scientific Self-Discovery Starts Here', 'Explore validated personality, relationship, and cognitive psychometric tools.', 'Browse All Assessments', '/assessments', 'hero', 1);
