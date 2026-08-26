-- Migration 0033: Update Footer Nav Privacy Policy Link to /privacy-policy

UPDATE site_settings
SET value = '[{"title":"Assessments","links":[{"label":"Big Five Personality","href":"/assessments/big-five-personality-test"},{"label":"Attachment Style","href":"/assessments/attachment-style-test"},{"label":"Emotional Intelligence","href":"/assessments/emotional-intelligence-test"},{"label":"All Assessments","href":"/assessments"}]},{"title":"Resources","links":[{"label":"About Us","href":"/about"},{"label":"How It Works","href":"/#how-it-works"},{"label":"Credits & Pricing","href":"/pricing"}]},{"title":"Legal & Privacy","links":[{"label":"Privacy Policy","href":"/privacy-policy"},{"label":"Terms of Service","href":"/terms"},{"label":"Disclaimer","href":"/disclaimer"}]}]',
updated_at = CURRENT_TIMESTAMP
WHERE key = 'footer_nav_columns';
