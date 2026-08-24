-- Migration 0022: Assessment & Guest Controls Settings
-- Cloudflare D1 (SQLite)

-- Seed dynamic assessment configuration and guest access controls
INSERT OR IGNORE INTO site_settings (key, value, type, is_public, description, updated_at) VALUES
('guest_assessments_enabled', 'true', 'boolean', 1, 'Allow unauthenticated guest users to take free assessments and psychology calculators', CURRENT_TIMESTAMP),
('guest_results_enabled', 'true', 'boolean', 1, 'Allow guest users to immediately view their basic score and psychometric breakdown upon completion', CURRENT_TIMESTAMP),
('guest_result_retention_days', '7', 'number', 0, 'Retention window in days for unclaimed guest assessment attempts and results before archival', CURRENT_TIMESTAMP),
('guest_ai_reports_enabled', 'false', 'boolean', 1, 'Allow guest users to generate AI reports without creating an account', CURRENT_TIMESTAMP),
('login_required_for_ai_reports', 'true', 'boolean', 1, 'Require account authentication before synthesizing in-depth AI narrative reports', CURRENT_TIMESTAMP),
('login_required_for_pdf', 'false', 'boolean', 1, 'Require login for basic result PDF export (exclusive AI PDFs always require authentication/Pro)', CURRENT_TIMESTAMP),
('guest_rate_limit', '60', 'number', 0, 'Maximum assessment starts and answer submissions allowed per 15-minute window per IP for guest sessions', CURRENT_TIMESTAMP);
