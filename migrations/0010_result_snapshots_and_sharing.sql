-- Migration 0010: Result Snapshots and Secure Public Sharing
-- Cloudflare D1 (SQLite)

-- 1. Result Snapshots Table
-- Preserves immutable historical result state at the time of assessment completion
CREATE TABLE IF NOT EXISTS result_snapshots (
    id TEXT PRIMARY KEY,
    attempt_id TEXT NOT NULL UNIQUE,
    assessment_id TEXT NOT NULL,
    assessment_version INTEGER NOT NULL DEFAULT 1,
    primary_result_type_id TEXT,
    snapshot_data TEXT NOT NULL, -- JSON containing frozen assessment metadata, dimensions, scores, matched result type, and section narratives
    share_token TEXT UNIQUE, -- Optional secure random token for public link sharing
    is_public INTEGER NOT NULL DEFAULT 0, -- 0 = private (default), 1 = public via share_token
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (primary_result_type_id) REFERENCES result_types(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_attempt ON result_snapshots(attempt_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_assessment ON result_snapshots(assessment_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_share_token ON result_snapshots(share_token);
