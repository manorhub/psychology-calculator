-- Migration 0031: Store IndexNow Key in site_settings

INSERT INTO site_settings (key, value, description)
VALUES 
  ('seo_indexnow_key', 'c7849e625a1e49058b732d8479e0a6d1', 'IndexNow API Key for instant search engine URL submission')
ON CONFLICT(key) DO UPDATE SET 
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
