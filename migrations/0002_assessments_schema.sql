-- Migration 0002: Assessment Categories, Assessments, Dimensions, Questions, and Options
-- Cloudflare D1 (SQLite)

-- 1. Assessment Categories
CREATE TABLE IF NOT EXISTS assessment_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON assessment_categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_status_order ON assessment_categories(status, display_order);

-- 2. Assessments
CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    short_description TEXT NOT NULL,
    long_description TEXT,
    instructions TEXT,
    estimated_minutes INTEGER NOT NULL DEFAULT 10,
    question_count INTEGER NOT NULL DEFAULT 0,
    access_type TEXT NOT NULL DEFAULT 'free' CHECK (access_type IN ('free', 'premium', 'credit_only')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured INTEGER NOT NULL DEFAULT 0, -- 1 = featured on homepage, 0 = normal
    display_order INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    disclaimer TEXT,
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES assessment_categories(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_assessments_category ON assessments(category_id);
CREATE INDEX IF NOT EXISTS idx_assessments_slug ON assessments(slug);
CREATE INDEX IF NOT EXISTS idx_assessments_status_order ON assessments(status, display_order);
CREATE INDEX IF NOT EXISTS idx_assessments_featured ON assessments(featured, status);

-- 3. Assessment Dimensions (e.g. Openness, Conscientiousness, Anxiety, Avoidance)
CREATE TABLE IF NOT EXISTS assessment_dimensions (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    UNIQUE(assessment_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_dimensions_assessment ON assessment_dimensions(assessment_id, display_order);

-- 4. Assessment Questions
CREATE TABLE IF NOT EXISTS assessment_questions (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'likert' CHECK (question_type IN ('likert', 'multiple_choice', 'yes_no', 'ranking')),
    display_order INTEGER NOT NULL DEFAULT 0,
    required INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_assessment_order ON assessment_questions(assessment_id, display_order);

-- 5. Question Options
CREATE TABLE IF NOT EXISTS question_options (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    option_text TEXT NOT NULL,
    option_value TEXT NOT NULL, -- e.g. "1", "2", "3", "4", "5" or custom choice token
    display_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_options_question_order ON question_options(question_id, display_order);
