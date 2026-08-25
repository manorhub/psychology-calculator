-- Migration 0028: Enforce Zero Initial Credits Policy
-- Users must buy one-time credit packages to generate AI reports. New accounts start with 0 credits.

-- Update site setting to explicitly document 0 signup credits
INSERT OR REPLACE INTO site_settings (key, value, type, is_public, description, updated_at)
VALUES (
    'signup_bonus_credits',
    '0',
    'number',
    1,
    'Number of free credits granted upon registration (0 enforces pay-as-you-go).',
    CURRENT_TIMESTAMP
);
