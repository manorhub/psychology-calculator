-- Migration 0040: Social Result Sharing and Viral Growth System
-- Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS result_shares (
    id TEXT PRIMARY KEY,
    share_token TEXT NOT NULL UNIQUE,
    attempt_id TEXT NOT NULL,
    assessment_id TEXT NOT NULL,
    assessment_slug TEXT NOT NULL,
    user_id TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    sanitized_data TEXT NOT NULL, -- JSON containing { assessmentName, assessmentSlug, resultTitle, resultSummary, dimensionScores, totalScore, scorePercent, levelLabel }
    is_active INTEGER NOT NULL DEFAULT 1,
    view_count INTEGER NOT NULL DEFAULT 0,
    share_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_result_shares_token ON result_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_result_shares_attempt ON result_shares(attempt_id);
CREATE INDEX IF NOT EXISTS idx_result_shares_assessment ON result_shares(assessment_id);
CREATE INDEX IF NOT EXISTS idx_result_shares_created ON result_shares(created_at);
