-- Migration 0014: Lemon Squeezy Monetization, Webhook Ledger, and Dynamic Plan Entitlements
-- Cloudflare D1 (SQLite)

-- 1. Webhook Events Ledger (Strict idempotency and replay protection)
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    event_name TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'lemon_squeezy',
    payload TEXT NOT NULL, -- JSON event payload
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'duplicate', 'ignored')),
    error_message TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at);

-- 2. Plan Entitlements Table (Dynamic feature matrix configuration per plan)
CREATE TABLE IF NOT EXISTS plan_entitlements (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    feature_key TEXT NOT NULL, -- e.g. 'premium_assessments', 'premium_ai_reports', 'premium_pdf_exports', 'priority_support'
    is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
    limit_value INTEGER, -- NULL for unlimited, integer for numerical quota
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
    UNIQUE(plan_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_entitlements_plan ON plan_entitlements(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_entitlements_feature ON plan_entitlements(feature_key);

-- 3. Enhance Subscription Plans with Marketing & Variant Identifiers
-- Check & add column safely for SQLite D1
-- Seed default dynamic plans
INSERT OR IGNORE INTO subscription_plans (
    id, name, slug, description, price, currency, billing_interval, features, included_credits, lemon_squeezy_variant_id, status, display_order, created_at, updated_at
) VALUES 
(
    'plan_free',
    'Free Explorer',
    'free',
    'Essential psychological self-discovery tools and baseline standardized scoring.',
    0.00,
    'USD',
    'monthly',
    '["Access to all 8 core psychometric assessments","Instant deterministic scoring & dimensional breakdowns","Standard result summary","Community self-reflection guidelines"]',
    0,
    NULL,
    'active',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'plan_pro_monthly',
    'Psychology Calculator Pro (Monthly)',
    'pro-monthly',
    'Full access to advanced AI psychological synthesis, in-depth reports, and PDF downloads.',
    14.99,
    'USD',
    'monthly',
    '["Unlimited access to all psychometric assessments","Detailed AI-synthesized narrative reports","Personalized strength & growth opportunities","Export high-resolution vector PDF reports","50 monthly AI interpretation credits included","Priority psychometric support"]',
    50,
    'variant_monthly_test_123',
    'active',
    2,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'plan_pro_annual',
    'Psychology Calculator Pro (Annual)',
    'pro-annual',
    'Best value. Unlimited psychological insights, AI synthesis, and permanent report archiving.',
    119.99,
    'USD',
    'yearly',
    '["Save over 33% compared to monthly plan","Unlimited access to all psychometric assessments","Detailed AI-synthesized narrative reports","Personalized strength & growth opportunities","Export high-resolution vector PDF reports","100 monthly AI interpretation credits included","Permanent cloud report history & comparisons","Priority psychometric support"]',
    100,
    'variant_annual_test_456',
    'active',
    3,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 4. Seed Default Entitlements for Plans
-- Free Plan Entitlements
INSERT OR IGNORE INTO plan_entitlements (id, plan_id, feature_key, is_enabled, limit_value) VALUES
('ent_free_basic_asm', 'plan_free', 'basic_assessments', 1, NULL),
('ent_free_basic_res', 'plan_free', 'basic_results', 1, NULL),
('ent_free_prem_asm', 'plan_free', 'premium_assessments', 0, NULL),
('ent_free_ai_rep', 'plan_free', 'premium_ai_reports', 0, NULL),
('ent_free_prem_pdf', 'plan_free', 'premium_pdf_exports', 0, NULL);

-- Pro Monthly Entitlements
INSERT OR IGNORE INTO plan_entitlements (id, plan_id, feature_key, is_enabled, limit_value) VALUES
('ent_m_basic_asm', 'plan_pro_monthly', 'basic_assessments', 1, NULL),
('ent_m_basic_res', 'plan_pro_monthly', 'basic_results', 1, NULL),
('ent_m_prem_asm', 'plan_pro_monthly', 'premium_assessments', 1, NULL),
('ent_m_ai_rep', 'plan_pro_monthly', 'premium_ai_reports', 1, NULL),
('ent_m_prem_pdf', 'plan_pro_monthly', 'premium_pdf_exports', 1, NULL),
('ent_m_priority_sup', 'plan_pro_monthly', 'priority_support', 1, NULL);

-- Pro Annual Entitlements
INSERT OR IGNORE INTO plan_entitlements (id, plan_id, feature_key, is_enabled, limit_value) VALUES
('ent_a_basic_asm', 'plan_pro_annual', 'basic_assessments', 1, NULL),
('ent_a_basic_res', 'plan_pro_annual', 'basic_results', 1, NULL),
('ent_a_prem_asm', 'plan_pro_annual', 'premium_assessments', 1, NULL),
('ent_a_ai_rep', 'plan_pro_annual', 'premium_ai_reports', 1, NULL),
('ent_a_prem_pdf', 'plan_pro_annual', 'premium_pdf_exports', 1, NULL),
('ent_a_priority_sup', 'plan_pro_annual', 'priority_support', 1, NULL);

-- 5. Seed Dynamic Lemon Squeezy Settings
INSERT OR IGNORE INTO site_settings (key, value, type, is_public, description) VALUES
('lemon_squeezy_enabled', 'true', 'boolean', 1, 'Master switch for Lemon Squeezy payment gateway and checkout'),
('lemon_squeezy_store_id', 'store_demo_101', 'string', 0, 'Lemon Squeezy Store Identifier'),
('lemon_squeezy_api_key', 'ls_test_api_key_placeholder', 'string', 0, 'Lemon Squeezy Server API Key'),
('lemon_squeezy_webhook_secret', 'ls_test_webhook_secret_placeholder', 'string', 0, 'HMAC signing secret for incoming Lemon Squeezy webhooks'),
('lemon_squeezy_currency', 'USD', 'string', 1, 'Primary billing currency code (e.g. USD, EUR, GBP)'),
('lemon_squeezy_mode', 'test', 'string', 0, 'Integration environment mode (test or live)');

-- 6. Seed Billing Feature Flags
INSERT OR IGNORE INTO feature_flags (id, key, name, description, is_enabled) VALUES
('flag_billing_enabled', 'monetization', 'Monetization & Subscriptions', 'Enables paid subscription plans and checkout redirects', 1),
('flag_annual_discount', 'annual_discount_banner', 'Annual Discount Callout', 'Displays 33% off savings badge on annual pricing tier', 1);
