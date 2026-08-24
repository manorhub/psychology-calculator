-- Migration 0015: SEO Engine, Dynamic Redirects, Internal Linking, and Global Settings
-- Cloudflare D1 (SQLite)

-- 1. URL Redirects Ledger (301 Permanent / 302 Temporary redirects with loop tracking)
CREATE TABLE IF NOT EXISTS redirects (
    id TEXT PRIMARY KEY,
    old_path TEXT NOT NULL UNIQUE,
    new_path TEXT NOT NULL,
    status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308)),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    hit_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_redirects_old_path ON redirects(old_path);
CREATE INDEX IF NOT EXISTS idx_redirects_active ON redirects(is_active);

-- 2. Internal Linking Rules (Contextual relationships between entities)
CREATE TABLE IF NOT EXISTS internal_link_rules (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL, -- "assessment", "category", "global"
    source_id TEXT, -- assessment_id or category_id
    target_type TEXT NOT NULL, -- "assessment", "category", "page"
    target_id TEXT NOT NULL,
    anchor_text TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_internal_links_source ON internal_link_rules(source_type, source_id);

-- 3. Enhance SEO Metadata Table If Needed (Ensure uniqueness and structure)
-- (seo_metadata was initialized in 0007, ensure default seeds exist)

-- 4. Seed Default Global SEO Configuration Settings
INSERT OR IGNORE INTO site_settings (key, value, type, is_public, description) VALUES
('seo_site_title', 'Psychology Calculator', 'string', 1, 'Default website title for search engines'),
('seo_title_template', '{{page_title}} | Psychology Calculator', 'string', 1, 'Dynamic title template formula'),
('seo_default_description', 'Scientifically validated psychological assessments, personality evaluations, and deep psychometric interpretations.', 'string', 1, 'Default search snippet description'),
('seo_canonical_domain', 'https://psychologycalculator.com', 'string', 1, 'Official primary canonical domain origin'),
('seo_default_robots', 'index, follow', 'string', 1, 'Default search crawler indexation directive'),
('seo_default_og_image', '/images/og-default.png', 'string', 1, 'Default Open Graph and social share card image URL'),
('seo_twitter_handle', '@PsychCalculator', 'string', 1, 'Official Twitter/X social card attribution'),
('seo_org_name', 'Psychology Calculator', 'string', 1, 'Official Organization schema brand name'),
('seo_org_logo', '/images/logo.png', 'string', 1, 'Official Organization schema logo asset URL'),
('seo_gsc_verification', '', 'string', 0, 'Google Search Console site verification token'),
('seo_bing_verification', '', 'string', 0, 'Bing Webmaster Tools site verification token'),
('seo_ga4_measurement_id', '', 'string', 1, 'Google Analytics 4 Measurement Stream ID (e.g. G-XXXXX)');

-- 5. Seed Initial Internal Linking Graph for Core Assessments
INSERT OR IGNORE INTO internal_link_rules (id, source_type, source_id, target_type, target_id, anchor_text, display_order, is_active) VALUES
('link_1', 'assessment', 'asm_big_five', 'assessment', 'asm_attachment', 'Explore Attachment Style Test', 1, 1),
('link_2', 'assessment', 'asm_big_five', 'assessment', 'asm_eq', 'Evaluate Your Emotional Intelligence (EQ)', 2, 1),
('link_3', 'assessment', 'asm_attachment', 'assessment', 'asm_love_languages', 'Discover Your Primary Love Language', 1, 1),
('link_4', 'assessment', 'asm_burnout', 'assessment', 'asm_self_esteem', 'Evaluate Self-Esteem Index', 1, 1);
