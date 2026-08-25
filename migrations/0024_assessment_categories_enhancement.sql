-- Migration 0024: Assessment Categories Enhancement & Master Categories Seed
-- Cloudflare D1 (SQLite)

-- 1. Add missing fields if not present
ALTER TABLE assessment_categories ADD COLUMN short_description TEXT;
ALTER TABLE assessment_categories ADD COLUMN image TEXT;
ALTER TABLE assessment_categories ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE assessment_categories ADD COLUMN canonical TEXT;
ALTER TABLE assessment_categories ADD COLUMN og_title TEXT;
ALTER TABLE assessment_categories ADD COLUMN og_description TEXT;
ALTER TABLE assessment_categories ADD COLUMN og_image TEXT;

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_categories_featured ON assessment_categories(featured, status);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON assessment_categories(display_order ASC);

-- 3. Seed Initial 7 Master Psychology Categories (Idempotent via INSERT OR IGNORE)
INSERT OR IGNORE INTO assessment_categories (
    id, name, slug, short_description, description, icon, display_order, status, featured, seo_title, seo_description, created_at, updated_at
) VALUES 
(
    'cat_personality',
    'Personality',
    'personality',
    'Explore personality traits, tendencies, and individual differences through educational self-assessments.',
    'Explore scientifically validated personality models including the Big Five (OCEAN), temperament frameworks, and cognitive behavioral dispositions for deeper self-awareness.',
    '🧬',
    1,
    'active',
    1,
    'Personality Tests & Psychometric Profiles | Psychology Calculator',
    'Discover your unique psychometric traits and behavioral tendencies with scientifically grounded personality assessments.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'cat_relationships_attachment',
    'Relationships & Attachment',
    'relationships-attachment',
    'Explore relationship patterns, attachment tendencies, communication, and interpersonal dynamics.',
    'Understand adult attachment styles, love languages, romantic intimacy tendencies, and boundary dynamics to foster deeper connection and emotional security.',
    '❤️',
    2,
    'active',
    1,
    'Relationships & Attachment Style Quizzes | Psychology Calculator',
    'Analyze your attachment pattern, relationship communication habits, and interpersonal connection preferences.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'cat_emotional_wellbeing',
    'Emotional Wellbeing',
    'emotional-wellbeing',
    'Explore emotional awareness, resilience, empathy, and everyday wellbeing-related traits.',
    'Assess emotional intelligence, resilience, empathy metrics, stress regulation strategies, and grounded self-reflection tools.',
    '🌿',
    3,
    'active',
    1,
    'Emotional Wellbeing & EQ Assessments | Psychology Calculator',
    'Evaluate emotional awareness, stress management, and agility through standardized educational self-evaluations.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'cat_career_work',
    'Career & Work',
    'career-work',
    'Explore work preferences, leadership tendencies, career-related traits, and workplace styles.',
    'Assess professional drive, workplace communication, burnout risk, leadership potential, and vocational fit.',
    '💼',
    4,
    'active',
    1,
    'Career & Workplace Psychology Assessments | Psychology Calculator',
    'Gain behavioral insights into your workplace style, leadership potential, and collaborative strengths.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'cat_social_communication',
    'Social & Communication',
    'social-communication',
    'Explore social confidence, communication preferences, interpersonal skills, and conflict styles.',
    'Identify conflict management strategies, assertiveness levels, social conversational dynamics, and active listening capabilities.',
    '💬',
    5,
    'active',
    1,
    'Social & Communication Style Tests | Psychology Calculator',
    'Explore your conflict resolution approach, communication style, and social interaction patterns.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'cat_self_development',
    'Self-Development',
    'self-development',
    'Explore motivation, self-awareness, decision-making, goals, and personal growth.',
    'Evaluate self-esteem, growth mindset, decision fatigue tendencies, intrinsic motivation, and personal transformation paths.',
    '🚀',
    6,
    'active',
    1,
    'Self-Development & Mindset Tests | Psychology Calculator',
    'Foster sustainable personal growth and self-awareness with validated reflective psychological instruments.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'cat_cognitive_style',
    'Cognitive Style',
    'cognitive-style',
    'Explore thinking preferences, problem-solving approaches, and cognitive styles.',
    'Discover cognitive problem-solving approaches, learning preferences, analytical versus intuitive thinking, and intellectual tendencies.',
    '🧠',
    7,
    'active',
    1,
    'Cognitive Style & Thinking Preferences | Psychology Calculator',
    'Understand how you process information, make complex decisions, and solve problems creatively.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
