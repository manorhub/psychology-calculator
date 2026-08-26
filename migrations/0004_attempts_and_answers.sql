-- Migration 0004: Assessment Attempts, Answers, Scores, and Generated Reports
-- Cloudflare D1 (SQLite)

-- 1. Assessment Attempts
CREATE TABLE IF NOT EXISTS assessment_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- Nullable for anonymous/guest takers
    assessment_id TEXT NOT NULL,
    session_id TEXT NOT NULL, -- Client cookie or anonymous token
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    current_question_index INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON assessment_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_session ON assessment_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_assessment ON assessment_attempts(assessment_id, status);

-- 2. Assessment Answers
CREATE TABLE IF NOT EXISTS assessment_answers (
    id TEXT PRIMARY KEY,
    attempt_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    option_id TEXT, -- Nullable for direct numeric or custom inputs
    answer_value TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES question_options(id) ON DELETE SET NULL,
    UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_attempt ON assessment_answers(attempt_id);

-- 3. Assessment Scores (Dimension scores calculated per attempt)
CREATE TABLE IF NOT EXISTS assessment_scores (
    id TEXT PRIMARY KEY,
    attempt_id TEXT NOT NULL,
    dimension_id TEXT, -- Nullable for global overall scores
    raw_score REAL NOT NULL DEFAULT 0.0,
    normalized_score REAL NOT NULL DEFAULT 0.0, -- Standardized scale (e.g. 0-100 or percentile)
    percentage REAL NOT NULL DEFAULT 0.0,
    result_type_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (dimension_id) REFERENCES assessment_dimensions(id) ON DELETE CASCADE,
    FOREIGN KEY (result_type_id) REFERENCES result_types(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_attempt ON assessment_scores(attempt_id);

-- 4. Generated Reports (Basic, AI, PDF)
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    attempt_id TEXT NOT NULL,
    report_type TEXT NOT NULL DEFAULT 'basic' CHECK (report_type IN ('basic', 'ai', 'pdf', 'comprehensive')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_reference TEXT, -- R2 object key (e.g. "reports/2026/02/attempt-xyz.pdf")
    content_data TEXT, -- JSON structure for AI report narrative sections
    error_message TEXT,
    generated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reports_attempt ON reports(attempt_id);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
