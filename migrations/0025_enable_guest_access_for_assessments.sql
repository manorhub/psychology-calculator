-- Migration 0025: Ensure All Standard Public Assessments Are Free for Guest Access

-- 1. Ensure all assessments have access_type = 'free' for public guest access
UPDATE assessments SET access_type = 'free' WHERE access_type != 'free' OR access_type IS NULL;

-- 2. Ensure guest assessment and result viewing toggles are enabled
INSERT OR REPLACE INTO site_settings (key, value, type, is_public, description, updated_at) VALUES
('guest_assessments_enabled', 'true', 'boolean', 1, 'Allow unauthenticated guests to take assessments without signing up', CURRENT_TIMESTAMP),
('guest_results_enabled', 'true', 'boolean', 1, 'Allow guests to view basic assessment result snapshots without signing up', CURRENT_TIMESTAMP);
