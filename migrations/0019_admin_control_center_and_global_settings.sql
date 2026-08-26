-- Phase 16: Admin Control Center & Global Dynamic Settings Schema
-- Cloudflare D1 (SQLite)

-- 1. Enhance site_settings with group_name and is_secret if not present
-- SQLite D1 supports ALTER TABLE ADD COLUMN safely
-- SQLite ignores if column already added in earlier runs via script

-- 2. Legal Pages Table (Markdown & HTML legal content)
CREATE TABLE IF NOT EXISTS legal_pages (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    content_html TEXT NOT NULL,
    is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_legal_pages_slug ON legal_pages(slug);

-- 3. Seed Default Legal Pages
INSERT OR IGNORE INTO legal_pages (id, slug, title, content_markdown, content_html, is_published) VALUES
(
    'leg_privacy',
    'privacy-policy',
    'Privacy Policy',
    '# Privacy Policy\n\nLast updated: January 2026\n\nAt **Psychology Calculator** (psychologycalculator.com), we respect your privacy and are committed to protecting your personal information. This Privacy Policy outlines how we collect, store, and process assessment responses, account details, and telemetry data.\n\n### 1. Information We Collect\n* **Anonymous Assessment Responses**: Responses submitted by guest participants to calculate deterministic scores.\n* **Account Information**: Email address and encrypted password hash for registered members.\n* **AI Interpretation Data**: Anonymized score summaries transmitted to LLM providers for synthesis.\n\n### 2. Data Minimization & Security\nWe practice strict data minimization. We do not sell your personal data or psychological assessment responses to third parties.',
    '<h1>Privacy Policy</h1><p>Last updated: January 2026</p><p>At <strong>Psychology Calculator</strong> (psychologycalculator.com), we respect your privacy and are committed to protecting your personal information. This Privacy Policy outlines how we collect, store, and process assessment responses, account details, and telemetry data.</p><h3>1. Information We Collect</h3><ul><li><strong>Anonymous Assessment Responses</strong>: Responses submitted by guest participants to calculate deterministic scores.</li><li><strong>Account Information</strong>: Email address and encrypted password hash for registered members.</li><li><strong>AI Interpretation Data</strong>: Anonymized score summaries transmitted to LLM providers for synthesis.</li></ul><h3>2. Data Minimization & Security</h3><p>We practice strict data minimization. We do not sell your personal data or psychological assessment responses to third parties.</p>',
    1
),
(
    'leg_terms',
    'terms-of-service',
    'Terms of Service',
    '# Terms of Service\n\nLast updated: January 2026\n\nWelcome to **Psychology Calculator**. By accessing or using psychologycalculator.com, you agree to be bound by these Terms of Service.\n\n### 1. Educational & Self-Reflection Purpose\nAll assessments, scoring rubrics, and AI-synthesized interpretation reports provided on this platform are for **educational, self-discovery, and reflective purposes only**.\n\n### 2. Pro Subscriptions & Payments\nPro memberships and credit balances are processed securely via Lemon Squeezy. Subscriptions renew automatically until cancelled by the user in the Dashboard.',
    '<h1>Terms of Service</h1><p>Last updated: January 2026</p><p>Welcome to <strong>Psychology Calculator</strong>. By accessing or using psychologycalculator.com, you agree to be bound by these Terms of Service.</p><h3>1. Educational & Self-Reflection Purpose</h3><p>All assessments, scoring rubrics, and AI-synthesized interpretation reports provided on this platform are for <strong>educational, self-discovery, and reflective purposes only</strong>.</p><h3>2. Pro Subscriptions & Payments</h3><p>Pro memberships and credit balances are processed securely via Lemon Squeezy. Subscriptions renew automatically until cancelled by the user in the Dashboard.</p>',
    1
),
(
    'leg_disclaimer',
    'disclaimer',
    'Psychological & Medical Disclaimer',
    '# Psychological & Medical Disclaimer\n\n**CRITICAL NOTICE**: The assessments, dimensional scores, and AI interpretations on **Psychology Calculator** (psychologycalculator.com) do **NOT** constitute medical, psychiatric, or clinical psychological advice, diagnosis, or treatment.\n\nIf you are experiencing acute mental distress or a psychological emergency, please contact your local crisis hotline or seek immediate care from a licensed healthcare professional.',
    '<h1>Psychological & Medical Disclaimer</h1><p><strong>CRITICAL NOTICE</strong>: The assessments, dimensional scores, and AI interpretations on <strong>Psychology Calculator</strong> (psychologycalculator.com) do <strong>NOT</strong> constitute medical, psychiatric, or clinical psychological advice, diagnosis, or treatment.</p><p>If you are experiencing acute mental distress or a psychological emergency, please contact your local crisis hotline or seek immediate care from a licensed healthcare professional.</p>',
    1
),
(
    'leg_cookies',
    'cookie-policy',
    'Cookie Policy',
    '# Cookie Policy\n\nLast updated: January 2026\n\nPsychology Calculator uses privacy-conscious cookies and local session tokens solely for authentication, guest assessment state preservation, and essential platform functionality.',
    '<h1>Cookie Policy</h1><p>Last updated: January 2026</p><p>Psychology Calculator uses privacy-conscious cookies and local session tokens solely for authentication, guest assessment state preservation, and essential platform functionality.</p>',
    1
),
(
    'leg_refunds',
    'refund-policy',
    'Refund Policy',
    '# Refund Policy\n\nLast updated: January 2026\n\nWe strive to provide exceptional psychometric insights. If you are unsatisfied with your Pro subscription, you may request a refund within 14 days of your purchase by contacting support@psychologycalculator.com.',
    '<h1>Refund Policy</h1><p>Last updated: January 2026</p><p>We strive to provide exceptional psychometric insights. If you are unsatisfied with your Pro subscription, you may request a refund within 14 days of your purchase by contacting support@psychologycalculator.com.</p>',
    1
);

-- 4. Seed Global Site Settings across all functional categories
INSERT OR REPLACE INTO site_settings (key, value, type, is_public, description) VALUES
-- General
('site_name', 'Psychology Calculator', 'string', 1, 'Official platform brand name'),
('site_url', 'https://psychologycalculator.com', 'string', 1, 'Canonical website domain URL'),
('tagline', 'Evidence-Based Psychometrics & Psychological Insights', 'string', 1, 'Global brand tagline'),
('default_language', 'en', 'string', 1, 'Default platform locale code'),
('default_timezone', 'UTC', 'string', 1, 'System and reporting timezone'),
('default_currency', 'USD', 'string', 1, 'Default display currency'),
('contact_email', 'contact@psychologycalculator.com', 'string', 1, 'General contact inquiry email'),
('support_email', 'support@psychologycalculator.com', 'string', 1, 'Customer support inquiry email'),

-- Branding
('logo_url', '/images/logo.svg', 'string', 1, 'Header logo image URL'),
('favicon_url', '/favicon.svg', 'string', 1, 'Browser favicon URL'),
('primary_color', '#4F46E5', 'string', 1, 'Brand primary color (Indigo)'),
('secondary_color', '#0D9488', 'string', 1, 'Brand secondary color (Teal)'),
('accent_color', '#F59E0B', 'string', 1, 'Brand accent highlight color (Amber)'),
('theme_mode', 'system', 'string', 1, 'Default UI theme: light, dark, or system'),

-- Homepage
('hero_heading', 'Discover Your Mind Through Scientific Psychometrics', 'string', 1, 'Main homepage hero headline'),
('hero_description', 'Take validated psychological assessments with instant scoring, dimensional breakdowns, and personalized AI narrative interpretations.', 'string', 1, 'Homepage hero subheadline'),
('hero_cta_text', 'Explore Assessments', 'string', 1, 'Homepage hero primary button text'),
('hero_cta_url', '/assessments', 'string', 1, 'Homepage hero primary button destination'),
('featured_assessments_enabled', 'true', 'boolean', 1, 'Show featured assessments grid on homepage'),
('how_it_works_enabled', 'true', 'boolean', 1, 'Show How It Works 3-step section on homepage'),
('how_it_works_steps', '[{"step":1,"title":"Select an Assessment","description":"Choose from 8 scientifically validated instruments across personality, attachment, and EQ."},{"step":2,"title":"Complete & Score Instantly","description":"Answer questions with real-time progress saving and deterministic dimensional scoring."},{"step":3,"title":"Unlock AI Synthesis","description":"Receive personalized psychological growth opportunities and download publication-quality PDF reports."}]', 'json', 1, 'Structured 3-step flow on homepage'),
('homepage_faqs_enabled', 'true', 'boolean', 1, 'Show dynamic FAQ section on homepage'),
('final_cta_heading', 'Ready to Understand Yourself on a Deeper Level?', 'string', 1, 'Homepage bottom banner headline'),
('final_cta_description', 'Join thousands of self-reflective explorers taking scientifically grounded psychological evaluations today.', 'string', 1, 'Homepage bottom banner copy'),
('final_cta_button_text', 'Start Free Assessment', 'string', 1, 'Homepage bottom CTA button text'),
('final_cta_button_url', '/assessments/big-five-personality-test', 'string', 1, 'Homepage bottom CTA destination'),

-- Announcement
('announcement_enabled', 'false', 'boolean', 1, 'Enable global header announcement banner'),
('announcement_message', '✨ Explore our new Emotional Intelligence and Attachment Style assessments!', 'string', 1, 'Announcement message text'),
('announcement_link_text', 'Take Test', 'string', 1, 'Announcement button text'),
('announcement_link_url', '/assessments', 'string', 1, 'Announcement target URL'),
('announcement_dismissible', 'true', 'boolean', 1, 'Allow visitors to dismiss announcement bar'),

-- Maintenance
('maintenance_mode', 'false', 'boolean', 1, 'Global maintenance mode toggle (Admin bypass enabled)'),
('maintenance_message', 'Psychology Calculator is currently undergoing scheduled maintenance to improve scoring systems.', 'string', 1, 'Maintenance page user notice'),
('maintenance_estimated_return', '1 hour', 'string', 1, 'Estimated maintenance duration message'),

-- Navigation & Footer
('header_nav_links', '[{"label":"Assessments","href":"/assessments"},{"label":"Articles","href":"/blog"},{"label":"Pricing","href":"/pricing"},{"label":"About","href":"/about"}]', 'json', 1, 'Header navigation items'),
('footer_nav_columns', '[{"title":"Assessments","links":[{"label":"Big Five Personality","href":"/assessments/big-five-personality-test"},{"label":"Attachment Style","href":"/assessments/attachment-style-test"},{"label":"Emotional Intelligence","href":"/assessments/emotional-intelligence-test"},{"label":"All Assessments","href":"/assessments"}]},{"title":"Resources","links":[{"label":"Psychology Blog","href":"/blog"},{"label":"About Us","href":"/about"},{"label":"Contact Support","href":"/contact"},{"label":"FAQ","href":"/faq"}]},{"title":"Legal & Privacy","links":[{"label":"Privacy Policy","href":"/privacy"},{"label":"Terms of Service","href":"/terms"},{"label":"Disclaimer","href":"/disclaimer"},{"label":"Cookie Policy","href":"/cookies"},{"label":"Refund Policy","href":"/refunds"}]}]', 'json', 1, 'Footer navigation column groups'),
('social_links', '{"twitter":"https://twitter.com/psychologycalc","facebook":"","youtube":"","linkedin":"https://linkedin.com/company/psychologycalculator"}', 'json', 1, 'Configured social media URLs'),

-- SEO & LLMs
('seo_title_template', '%s | Psychology Calculator', 'string', 1, 'Global title template'),
('seo_default_description', 'Explore evidence-based psychological self-assessments, deterministic psychometric scoring, and AI-synthesized narrative reports.', 'string', 1, 'Global default SEO description'),
('seo_canonical_domain', 'https://psychologycalculator.com', 'string', 1, 'Canonical domain origin'),
('robots_custom_directives', 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /api/\nDisallow: /reset-password\n\nSitemap: https://psychologycalculator.com/sitemap.xml', 'string', 1, 'Dynamic robots.txt content'),
('llms_txt_content', '# Psychology Calculator (psychologycalculator.com)\n\n> Evidence-based psychological assessments and psychometrics platform.\n\n## Core Instruments\n- /assessments/big-five-personality-test : Big Five (OCEAN) Personality Evaluation\n- /assessments/attachment-style-test : Adult Relational Attachment Patterns\n- /assessments/emotional-intelligence-test : Emotional Intelligence (EQ)\n\n## Methodology\nAll instruments use validated psychological scales and deterministic scoring engines.', 'string', 1, 'Dynamic llms.txt content'),

-- Users & Privacy
('registration_enabled', 'true', 'boolean', 1, 'Allow new user registrations'),
('guest_assessments_enabled', 'true', 'boolean', 1, 'Allow anonymous guest participants to take assessments'),
('email_verification_required', 'true', 'boolean', 1, 'Require email verification before full account access');

-- 5. Seed Core Feature Flags
INSERT OR REPLACE INTO feature_flags (key, name, description, is_enabled) VALUES
('ai_reports', 'AI Psychological Interpretation', 'Enables AI-synthesized narrative report generation using LLMs', 1),
('pdf_reports', 'Vector PDF Report Downloads', 'Enables generation and downloading of branded high-resolution PDF results', 1),
('premium_assessments', 'Pro Tier Psychometrics', 'Enables gating of advanced assessments behind Pro subscriptions', 1),
('user_dashboard', 'Authenticated User Dashboard', 'Enables logged-in user history, assessment resumption, and report catalog', 1),
('blog', 'Content CMS & Articles', 'Enables public educational blog and psychological guides', 1),
('notifications', 'In-App Notifications', 'Enables real-time user notification center and badge alerts', 1),
('subscriptions', 'Lemon Squeezy Subscriptions', 'Enables Pro membership checkout and billing management', 1),
('guest_assessments', 'Anonymous Guest Takers', 'Enables non-registered visitors to take and score assessments', 1);
