-- Migration 0042: Fix SEO Crawler Errors, Assessment Slugs, and Canonical 301 Redirects
-- Cloudflare D1 (SQLite)

-- 1. Canonicalize Big Five Personality Test Assessment Slug
UPDATE assessments 
SET slug = 'big-five-personality-test', 
    status = 'published',
    name = 'Big Five (OCEAN) Personality Test',
    short_description = 'Discover your profile across 5 core personality dimensions: Openness, Conscientiousness, Extraversion, Agreeableness, and Emotional Stability.'
WHERE id = 'asm_big_five' OR slug = 'big-five-ocean-personality-test' OR slug = 'big-five-personality-test';

-- 2. Archive all duplicate / -copy assessment records
UPDATE assessments SET status = 'archived' WHERE slug LIKE '%-copy';

-- 3. Concise Category SEO Titles (under 60 chars with brand suffix for Bing & Google SERP)
UPDATE assessment_categories SET seo_title = 'Personality Tests & Assessments' WHERE slug = 'personality';
UPDATE assessment_categories SET seo_title = 'Relationship & Attachment Tests' WHERE slug = 'relationships';
UPDATE assessment_categories SET seo_title = 'Emotional Intelligence Tests' WHERE slug = 'emotional-intelligence';
UPDATE assessment_categories SET seo_title = 'Self-Development Tests' WHERE slug = 'self-development';
UPDATE assessment_categories SET seo_title = 'Communication & Conflict Tests' WHERE slug = 'communication';
UPDATE assessment_categories SET seo_title = 'Career & Workplace Tests' WHERE slug = 'career-work';
UPDATE assessment_categories SET seo_title = 'Cognitive Style Tests' WHERE slug = 'cognitive-style';
UPDATE assessment_categories SET seo_title = 'Mental Wellbeing Self-Checks' WHERE slug = 'mental-wellbeing';

-- 4. Comprehensive 301 Redirects for Legacy, Alias, and Crawler Errors
INSERT OR REPLACE INTO redirects (id, old_path, new_path, status_code, is_active, hit_count, updated_at, created_at)
VALUES 
    ('red_b5_ocean', '/assessments/big-five-ocean-personality-test', '/assessments/big-five-personality-test', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_attach_quiz', '/assessments/attachment-style-relationship-quiz', '/assessments/attachment-style-test', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_eq_copy_42', '/assessments/emotional-intelligence-test-copy', '/assessments/emotional-intelligence-test', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_ea_copy_42', '/assessments/emotional-awareness-test-copy', '/assessments/emotional-awareness-test', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_rel_cat_42', '/assessments/category/relationships-attachment', '/assessments/category/relationships', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_soc_cat_42', '/assessments/category/social-communication', '/assessments/category/communication', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_id_rel', '/assessments/category/cat_relationships', '/assessments/category/relationships', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_id_pers', '/assessments/category/cat_personality', '/assessments/category/personality', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_id_eq', '/assessments/category/cat_eq', '/assessments/category/emotional-intelligence', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_id_comm', '/assessments/category/cat_communication', '/assessments/category/communication', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_id_cog', '/assessments/category/cat_cognitive_style', '/assessments/category/cognitive-style', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_id_well', '/assessments/category/cat_mental_wellbeing', '/assessments/category/mental-wellbeing', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_id_self', '/assessments/category/cat_self_development', '/assessments/category/self-development', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_rel_att', '/categories/relationships-attachment', '/assessments/category/relationships', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_soc_comm', '/categories/social-communication', '/assessments/category/communication', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_pers', '/categories/personality', '/assessments/category/personality', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_rel', '/categories/relationships', '/assessments/category/relationships', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_eq', '/categories/emotional-intelligence', '/assessments/category/emotional-intelligence', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_self', '/categories/self-development', '/assessments/category/self-development', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_comm', '/categories/communication', '/assessments/category/communication', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_car', '/categories/career-work', '/assessments/category/career-work', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_cog', '/categories/cognitive-style', '/assessments/category/cognitive-style', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_cat_well', '/categories/mental-wellbeing', '/assessments/category/mental-wellbeing', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_p_priv', '/p/privacy-policy', '/privacy-policy', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_p_terms', '/p/terms-of-service', '/terms-of-service', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_p_disc', '/p/disclaimer', '/disclaimer', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_p_about', '/p/about', '/about', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_p_contact', '/p/contact', '/contact', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_contact_us', '/contact-us', '/contact', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_terms_short', '/terms', '/terms-of-service', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_privacy_short', '/privacy', '/privacy-policy', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
