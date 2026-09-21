-- Migration 0043: Configure Default Email Verification and Auth Settings
-- Cloudflare D1 (SQLite)

INSERT OR REPLACE INTO site_settings (key, value, description)
VALUES 
  ('require_email_verification', 'false', 'Require email confirmation link before allowing users to log in (false = instant frictionless onboarding)');
