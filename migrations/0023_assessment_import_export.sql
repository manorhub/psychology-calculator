-- Migration 0023: Assessment Import History and Ledger
-- Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS assessment_import_history (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    assessment_id TEXT,
    assessment_name TEXT NOT NULL,
    assessment_slug TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial_blocked')),
    imported_by TEXT,
    schema_version TEXT NOT NULL DEFAULT '1.0',
    error_count INTEGER NOT NULL DEFAULT 0,
    warning_count INTEGER NOT NULL DEFAULT 0,
    errors_json TEXT, -- JSON string array
    warnings_json TEXT, -- JSON string array
    metadata_json TEXT, -- Summary JSON
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_import_history_created ON assessment_import_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_history_assessment ON assessment_import_history(assessment_id);
CREATE INDEX IF NOT EXISTS idx_import_history_slug ON assessment_import_history(assessment_slug);
