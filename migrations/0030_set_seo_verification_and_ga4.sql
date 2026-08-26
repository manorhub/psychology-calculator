-- Migration 0030: Set Search Engine Verifications and Google Analytics 4

INSERT INTO site_settings (key, value, description)
VALUES 
  ('seo_gsc_verification', 'D31rYIDvdWj0qVMkNlIUtEEK66FJJYRtJIK7erAITlw', 'Google Search Console Verification Meta Tag'),
  ('seo_bing_verification', '2A730A2FAF8DA672C0BDBCC548BEB4FA', 'Bing Webmaster Tools Verification Meta Tag'),
  ('seo_ga4_measurement_id', 'G-D70LGC3MQB', 'Google Analytics 4 Measurement ID (G-XXXXXXX)')
ON CONFLICT(key) DO UPDATE SET 
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
