-- Cloudflare D1 Initial Migration: Baseline Foundation Schema
-- Phase 0: System Settings & Audit Logging

-- 1. Site Settings (Key-Value dynamic configuration store for Admin CMS)
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'string', -- string, json, number, boolean
    is_public INTEGER NOT NULL DEFAULT 1, -- 1 = exposed to client/public config, 0 = server only
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Audit Logs (System-wide action audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT, -- JSON string
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Initial Default Dynamic Site Settings (Phase 0 Baseline)
INSERT OR IGNORE INTO site_settings (key, value, type, is_public, description) VALUES
('site_name', 'MindMetrics', 'string', 1, 'Public site name'),
('site_tagline', 'Scientifically grounded self-assessments for clarity, growth, and self-discovery.', 'string', 1, 'Public site tagline'),
('maintenance_mode', 'false', 'boolean', 1, 'Global maintenance mode toggle'),
('disclaimer_text', 'These self-assessments are designed for educational and self-reflection purposes only and do not replace professional psychological or medical advice.', 'string', 1, 'Mandatory psychology assessment disclaimer');
