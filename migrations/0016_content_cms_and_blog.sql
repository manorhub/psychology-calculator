-- Migration 0016: Content CMS, Blog Engine, Authors, Media Ledger, and Dynamic Pages
-- Cloudflare D1 (SQLite)

-- 1. Authors
CREATE TABLE IF NOT EXISTS authors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    role_title TEXT DEFAULT 'Psychometric Researcher',
    social_links TEXT DEFAULT '{}', -- JSON map: { twitter, linkedin, website }
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);

-- 2. Blog Categories
CREATE TABLE IF NOT EXISTS blog_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);

-- 3. Content Tags
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- 4. Reusable Content CTAs (Call-to-Action Blocks)
CREATE TABLE IF NOT EXISTS content_ctas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    button_text TEXT NOT NULL,
    button_url TEXT NOT NULL,
    style TEXT NOT NULL DEFAULT 'indigo' CHECK (style IN ('indigo', 'teal', 'dark', 'outline')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Blog Posts & Articles
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL, -- Rich Markdown or HTML
    featured_image_url TEXT,
    author_id TEXT,
    category_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
    featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
    reading_time_minutes INTEGER NOT NULL DEFAULT 5,
    related_assessment_id TEXT,
    cta_id TEXT,
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (related_assessment_id) REFERENCES assessments(id) ON DELETE SET NULL,
    FOREIGN KEY (cta_id) REFERENCES content_ctas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts(status, published_at);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);

-- 6. Post Tags Junction
CREATE TABLE IF NOT EXISTS post_tags (
    post_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 7. Media Items Ledger (Cloudflare R2 storage reference)
CREATE TABLE IF NOT EXISTS media_items (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    alt_text TEXT,
    caption TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_r2_key ON media_items(r2_key);

-- 8. Post Revision Snapshots
CREATE TABLE IF NOT EXISTS post_versions (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_versions_post ON post_versions(post_id, version_number);

-- 9. Seed Initial Editorial Author
INSERT OR IGNORE INTO authors (id, name, slug, bio, avatar_url, role_title, status) VALUES
('author_editorial', 'Psychology Calculator Editorial Team', 'editorial-team', 'Our multidisciplinary team of psychometricians, researchers, and cognitive psychologists specializing in validated self-discovery tools.', '/images/authors/editorial-team.png', 'Scientific Research & Editorial Team', 'active');

-- 10. Seed Initial Blog Categories
INSERT OR IGNORE INTO blog_categories (id, name, slug, description, display_order, status) VALUES
('bcat_personality', 'Personality & Psychometrics', 'personality', 'In-depth analyses of the Big Five, cognitive temperaments, and behavioral psychology.', 1, 'active'),
('bcat_relationships', 'Relationships & Attachment', 'relationships', 'Evidence-based insights into attachment dynamics, emotional intimacy, and interpersonal patterns.', 2, 'active'),
('bcat_emotional_eq', 'Emotional Intelligence & Wellbeing', 'emotional-intelligence', 'Techniques and research on emotional self-regulation, resilience, and workplace social intelligence.', 3, 'active');

-- 11. Seed Initial Content Tags
INSERT OR IGNORE INTO tags (id, name, slug) VALUES
('tag_big_five', 'Big Five', 'big-five'),
('tag_ocean', 'OCEAN Model', 'ocean-model'),
('tag_attachment', 'Attachment Styles', 'attachment-styles'),
('tag_psychometrics', 'Psychometrics', 'psychometrics'),
('tag_mental_resilience', 'Resilience', 'resilience');

-- 12. Seed Default Content CTAs
INSERT OR IGNORE INTO content_ctas (id, title, description, button_text, button_url, style, status) VALUES
('cta_take_big_five', 'Discover Your True Personality Profile', 'Take our scientifically validated 10-item Big Five OCEAN test with instant dimensional scoring and AI synthesis.', 'Take Big Five Test Free →', '/assessments/big-five-personality-test', 'indigo', 'active'),
('cta_explore_all', 'Explore Full Psychology Assessment Library', 'Access 8 standardized psychological instruments designed for grounded self-understanding.', 'Browse All Assessments →', '/assessments', 'dark', 'active');

-- 13. Seed Initial Comprehensive Pillar Article
INSERT OR IGNORE INTO posts (
    id, title, slug, excerpt, content, featured_image_url, author_id, category_id, status, featured, reading_time_minutes, related_assessment_id, cta_id, published_at
) VALUES (
    'post_big_five_guide',
    'What Is the Big Five Personality Model? The Scientific Gold Standard Explained',
    'what-is-the-big-five-personality-model',
    'Explore the 5 core dimensions of human personality—Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism—and how modern psychometrics evaluates your cognitive and behavioral profile.',
    '## The Five-Factor Model of Personality

The **Big Five Personality Model**—often referred to by the acronym **OCEAN**—is widely regarded by contemporary psychologists as the most empirically robust, cross-culturally validated framework for assessing human personality traits.

Unlike binary typology instruments that place individuals into rigid categories, the Big Five measures personality along continuous dimensions:

1. **Openness to Experience**: Intellectual curiosity, artistic appreciation, and conceptual novelty.
2. **Conscientiousness**: Goal-directed execution, self-discipline, and organized precision.
3. **Extraversion**: Energy derived from social engagement, assertiveness, and enthusiasm.
4. **Agreeableness**: Empathy, prosocial cooperation, and interpersonal warmth.
5. **Emotional Stability (Neuroticism)**: Resilience under pressure, emotional regulation, and stress tolerance.

### Why Psychologists Prefer the Big Five

Decades of cross-cultural research demonstrate that Big Five scores exhibit remarkable temporal stability across adulthood while meaningfully correlating with career satisfaction, relationship patterns, and cognitive problem-solving styles.

> *"Personality traits are not fixed destinies, but rather habitual behavioral baselines that inform how we naturally process our environment."*

### How Scores Are Calculated

Standardized psychometric testing evaluates responses using balanced Likert scales, combining direct and reverse-scored questions to neutralize acquiescence bias. Your profile provides a percentage score across all five independent traits rather than a single label.',
    '/images/blog/big-five-banner.jpg',
    'author_editorial',
    'bcat_personality',
    'published',
    1,
    6,
    'asm_big_five',
    'cta_take_big_five',
    CURRENT_TIMESTAMP
);

-- Tag association
INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES
('post_big_five_guide', 'tag_big_five'),
('post_big_five_guide', 'tag_ocean'),
('post_big_five_guide', 'tag_psychometrics');

-- 14. Ensure Core Static Legal/About Pages Exist
INSERT OR IGNORE INTO pages (id, title, slug, content, status, seo_title, seo_description) VALUES
('page_about', 'About Psychology Calculator', 'about', '# About Psychology Calculator\n\nPsychology Calculator provides scientifically validated psychological assessments, deterministic scoring engines, and deep psychometric insights for self-discovery and personal development.', 'published', 'About Us | Psychology Calculator', 'Learn about our mission to make scientific psychometric tools accessible and transparent.'),
('page_privacy', 'Privacy Policy', 'privacy-policy', '# Privacy Policy\n\nYour privacy is our utmost priority. All assessment responses and generated AI reports are encrypted and strictly confidential. We do not sell your personal or psychometric data.', 'published', 'Privacy Policy | Psychology Calculator', 'Our strict privacy guidelines and data protection commitments.'),
('page_terms', 'Terms of Service', 'terms', '# Terms of Service\n\nBy accessing Psychology Calculator, you agree to our terms. Assessments are designed for self-reflection and educational purposes only and do not constitute clinical psychological or medical advice.', 'published', 'Terms of Service | Psychology Calculator', 'Terms and conditions for utilizing Psychology Calculator.'),
('page_disclaimer', 'Psychological & Medical Disclaimer', 'disclaimer', '# Psychological & Medical Disclaimer\n\nAll tools and AI reports provided on Psychology Calculator are strictly for educational and personal reflection purposes. They are not substitutes for professional psychiatric or psychological diagnosis.', 'published', 'Disclaimer | Psychology Calculator', 'Important psychological and medical disclaimers.');
