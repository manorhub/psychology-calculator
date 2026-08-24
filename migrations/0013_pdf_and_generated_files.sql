-- Migration 0013: PDF Reports & Generated Files Storage
-- Cloudflare D1 (SQLite)

-- 1. Generated Files Ledger
CREATE TABLE IF NOT EXISTS generated_files (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    attempt_id TEXT,
    report_id TEXT,
    file_type TEXT NOT NULL CHECK (file_type IN ('basic_result', 'ai_report')),
    r2_key TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    file_size INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gen_files_user ON generated_files(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gen_files_attempt ON generated_files(attempt_id);
CREATE INDEX IF NOT EXISTS idx_gen_files_report ON generated_files(report_id);
CREATE INDEX IF NOT EXISTS idx_gen_files_status ON generated_files(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gen_files_attempt_type ON generated_files(attempt_id, file_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gen_files_report_type ON generated_files(report_id, file_type);

-- 2. Seed Default Dynamic PDF Settings
INSERT OR IGNORE INTO site_settings (key, value, type, is_public, description) VALUES
('pdf_enabled', 'true', 'boolean', 1, 'Master switch for PDF report generation'),
('pdf_brand_name', 'Psychology Calculator', 'string', 1, 'Official brand name displayed in PDF headers'),
('pdf_brand_domain', 'psychologycalculator.com', 'string', 1, 'Official website domain displayed in PDF headers and footers'),
('pdf_primary_color', '#4f46e5', 'string', 1, 'Primary hex brand color used for headings and score meters in PDFs'),
('pdf_secondary_color', '#0ea5e9', 'string', 1, 'Secondary hex accent color used for badges and subheadings in PDFs'),
('pdf_footer_text', 'Psychology Calculator — Official Psychometric Evaluation Report', 'string', 1, 'Standardized footer text printed on all generated PDF pages'),
('pdf_disclaimer', 'This assessment report is designed solely for self-reflection and educational purposes. It does not constitute a clinical psychological diagnosis or medical advice.', 'string', 1, 'Standardized medical/psychological disclaimer printed on PDF reports'),
('pdf_basic_enabled', 'true', 'boolean', 1, 'Allow users to download Basic Result PDFs'),
('pdf_ai_enabled', 'true', 'boolean', 1, 'Allow users to download Detailed AI Interpretation PDFs');
