-- Migration 0007: Dynamic CMS Content, FAQs, Feature Flags, SEO Metadata, and Site Settings
-- Cloudflare D1 (SQLite)

-- 1. Site Settings Store
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'string' CHECK (type IN ('string', 'json', 'number', 'boolean')),
    is_public INTEGER NOT NULL DEFAULT 1, -- 1 = client-visible, 0 = server-only
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Dynamic Pages (Admin editable CMS pages)
CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL, -- Markdown / HTML rich content
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    seo_title TEXT,
    seo_description TEXT,
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);

-- 3. Dynamic FAQs
CREATE TABLE IF NOT EXISTS faqs (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general', -- "general", "scoring", "ai", "billing"
    entity_type TEXT DEFAULT 'global', -- "global", "assessment", "category", "result"
    entity_id TEXT, -- Optional relation to specific assessment ID
    display_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_faqs_entity ON faqs(entity_type, entity_id, status, display_order);

-- 4. Feature Flags (Dynamic runtime switches)
CREATE TABLE IF NOT EXISTS feature_flags (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_enabled INTEGER NOT NULL DEFAULT 0, -- 1 = enabled, 0 = disabled
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Universal SEO Metadata (Attachable to any entity/page)
CREATE TABLE IF NOT EXISTS seo_metadata (
    id TEXT PRIMARY KEY,
    page_type TEXT NOT NULL, -- "home", "assessment", "category", "page", "result"
    entity_id TEXT, -- Target ID or unique route name
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    canonical_url TEXT,
    og_title TEXT,
    og_description TEXT,
    og_image TEXT,
    robots TEXT DEFAULT 'index, follow',
    schema_data TEXT, -- JSON-LD structured schema
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_seo_lookup ON seo_metadata(page_type, entity_id);
