-- Migration 0035: Set Initial Signup Bonus Credits Setting
INSERT INTO site_settings (key, value, description)
VALUES 
  ('signup_bonus_credits', '10', 'Number of free credits granted to newly registered users on signup'),
  ('new_user_initial_credits', '10', 'Fallback alias for new user initial credits')
ON CONFLICT(key) DO UPDATE SET 
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
