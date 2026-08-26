-- Phase 15: Analytics & Business Intelligence Schema
-- Cloudflare D1 (SQLite)

-- 1. Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    session_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    metadata TEXT, -- JSON Object with extra event context
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_entity ON analytics_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);

-- 2. Daily Analytics Aggregation Rollup Table
CREATE TABLE IF NOT EXISTS daily_analytics (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL, -- YYYY-MM-DD
    metric_key TEXT NOT NULL,
    entity_id TEXT,
    value REAL NOT NULL DEFAULT 0,
    metadata TEXT, -- JSON Object
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, metric_key, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_metric ON daily_analytics(metric_key);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_entity ON daily_analytics(entity_id);
