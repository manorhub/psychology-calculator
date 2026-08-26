-- Migration 0032: Set Yandex Webmaster Verification Meta Tag

INSERT INTO site_settings (key, value, description)
VALUES 
  ('seo_yandex_verification', '0dbd2107b6f660d6', 'Yandex Webmaster Verification Meta Tag')
ON CONFLICT(key) DO UPDATE SET 
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
