-- Migration 0027: Seed Final MVP One-Time Credit Packages (Starter, Growth, Pro)
-- Cloudflare D1 (SQLite)

-- 1. Safely add short_description column if it does not exist
-- (SQLite allows ADD COLUMN safely)
-- Note: wrapped or safe execution
ALTER TABLE credit_packages ADD COLUMN short_description TEXT;

-- 2. Clean/Update Credit Packages to the 3 Final MVP Packages
DELETE FROM credit_packages WHERE id IN ('pkg_credits_20', 'pkg_starter', 'pkg_growth', 'pkg_pro');

-- Package 1: Starter ($4.00, 20 Credits)
INSERT INTO credit_packages (
    id, name, slug, description, short_description, price, currency, credits, billing_type,
    lemon_squeezy_product_id, lemon_squeezy_variant_id, is_active, is_featured, sort_order, created_at, updated_at
) VALUES (
    'pkg_starter',
    'Starter',
    'starter-ai-report-credits',
    '20 AI Report Credits for detailed personalized assessment reports.',
    '4 detailed reports',
    4.00,
    'USD',
    20,
    'one_time',
    'prod_starter',
    'var_starter_credits_20',
    1,
    0,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Package 2: Growth ($9.00, 50 Credits) - MOST POPULAR
INSERT INTO credit_packages (
    id, name, slug, description, short_description, price, currency, credits, billing_type,
    lemon_squeezy_product_id, lemon_squeezy_variant_id, is_active, is_featured, sort_order, created_at, updated_at
) VALUES (
    'pkg_growth',
    'Growth',
    'growth-ai-report-credits',
    '50 AI Report Credits for users who want multiple detailed assessment reports.',
    '10 detailed reports',
    9.00,
    'USD',
    50,
    'one_time',
    'prod_growth',
    'var_growth_credits_50',
    1,
    1,
    2,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Package 3: Pro ($19.00, 120 Credits)
INSERT INTO credit_packages (
    id, name, slug, description, short_description, price, currency, credits, billing_type,
    lemon_squeezy_product_id, lemon_squeezy_variant_id, is_active, is_featured, sort_order, created_at, updated_at
) VALUES (
    'pkg_pro',
    'Pro',
    'pro-ai-report-credits',
    '120 AI Report Credits for users who want to explore multiple assessments in depth.',
    '24 detailed reports',
    19.00,
    'USD',
    120,
    'one_time',
    'prod_pro',
    'var_pro_credits_120',
    1,
    0,
    3,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
