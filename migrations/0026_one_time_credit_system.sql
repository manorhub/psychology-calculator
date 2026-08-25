-- Migration 0026: One-Time Credit System, Credit Wallets, Packages, and Orders
-- Cloudflare D1 (SQLite)

-- 1. Credit Wallets Table (One wallet per user)
CREATE TABLE IF NOT EXISTS credit_wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    balance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credit_wallets_user ON credit_wallets(user_id);

-- Backfill credit_wallets from existing credit_balances
INSERT OR IGNORE INTO credit_wallets (id, user_id, balance, created_at, updated_at)
SELECT 'wlt_' || user_id, user_id, balance, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM credit_balances;

-- 2. Credit Packages Table (Configurable one-time packages)
CREATE TABLE IF NOT EXISTS credit_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price REAL NOT NULL DEFAULT 4.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    credits INTEGER NOT NULL DEFAULT 20,
    billing_type TEXT NOT NULL DEFAULT 'one_time' CHECK (billing_type IN ('one_time')),
    lemon_squeezy_product_id TEXT,
    lemon_squeezy_variant_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    is_featured INTEGER NOT NULL DEFAULT 1 CHECK (is_featured IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_packages_slug ON credit_packages(slug);
CREATE INDEX IF NOT EXISTS idx_credit_packages_active ON credit_packages(is_active, sort_order);

-- Seed Initial Primary Package: 20 Credits for $4.00 USD
INSERT OR IGNORE INTO credit_packages (
    id, name, slug, description, price, currency, credits, billing_type,
    lemon_squeezy_product_id, lemon_squeezy_variant_id, is_active, is_featured, sort_order, created_at, updated_at
) VALUES (
    'pkg_credits_20',
    '20 AI Report Credits',
    'ai-report-credits-20',
    'Generate up to 4 comprehensive, personalized psychological synthesis reports with downloadable PDF dossiers. Credits never expire.',
    4.00,
    'USD',
    20,
    'one_time',
    'prod_credits_20',
    'var_credits_20',
    1,
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 3. One-Time Orders Table (Lemon Squeezy Order Ledger with strict Idempotency)
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'lemonsqueezy',
    provider_order_id TEXT NOT NULL UNIQUE,
    provider_transaction_id TEXT,
    package_id TEXT,
    product_id TEXT,
    variant_id TEXT,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
    credits_granted INTEGER NOT NULL DEFAULT 0,
    receipt_url TEXT,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES credit_packages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_provider_order ON orders(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 4. Seed Dynamic Site Settings for One-Time Credit Economics
INSERT OR IGNORE INTO site_settings (key, value, type, is_public, description) VALUES
('ai_report_credit_cost', '5', 'integer', 1, 'Cost in credits to generate a single detailed AI psychological report'),
('default_currency', 'USD', 'string', 1, 'Default currency for credit packages and checkout'),
('allow_credit_refunds', 'true', 'boolean', 1, 'Allow credit refunds when AI report generation fails'),
('allow_admin_credit_adjustment', 'true', 'boolean', 0, 'Allow admin to manually adjust user credit balances with audit reasons');
