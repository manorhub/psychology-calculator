-- Migration 0037: Technical SEO Audit Fix, Canonical Normalization, and Description Enrichment
-- PsychologyCalculator.com

-- 1. Update site_settings for canonical domain and clean title template
INSERT INTO site_settings (key, value, type, is_public, description, updated_at)
VALUES 
    ('seo_canonical_domain', 'https://www.psychologycalculator.com', 'string', 1, 'Preferred canonical domain with HTTPS and www', CURRENT_TIMESTAMP),
    ('seo_title_template', '{{page_title}} | PsychologyCalculator.com', 'string', 1, 'Clean single-brand title template', CURRENT_TIMESTAMP),
    ('seo_site_title', 'Psychology Calculator', 'string', 1, 'Primary platform name', CURRENT_TIMESTAMP),
    ('seo_default_description', 'Explore evidence-based psychology tests and personality assessments online. Free to start with instant scoring and detailed psychometric insights.', 'string', 1, 'Default platform meta description', CURRENT_TIMESTAMP),
    ('site_url', 'https://www.psychologycalculator.com', 'string', 1, 'Canonical public site URL', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Clean category SEO titles, slugs, and descriptions
UPDATE assessment_categories
SET 
    seo_title = 'Personality Tests & Assessments',
    seo_description = 'Explore evidence-based personality tests and psychometric assessments based on the Big Five (OCEAN), temperament frameworks, and behavioral styles.',
    description = 'Explore personality traits, behavioral patterns, and character strengths through validated self-assessments.',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'personality' OR id = 'cat_personality';

UPDATE assessment_categories
SET 
    seo_title = 'Relationships & Attachment Tests',
    seo_description = 'Discover your attachment style, love languages, and relationship compatibility patterns through structured psychological assessments.',
    description = 'Understand attachment patterns, communication tendencies, and intimacy dynamics in relationships.',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'relationships' OR slug = 'relationships-attachment' OR id = 'cat_relationships';

UPDATE assessment_categories
SET 
    seo_title = 'Emotional Wellbeing & EQ Tests',
    seo_description = 'Measure your emotional intelligence (EQ), stress resilience, self-awareness, and emotional regulation strategies.',
    description = 'Assess emotional self-awareness, stress management, empathy, and everyday psychological resilience.',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'emotional-wellbeing' OR id = 'cat_emotional_wellbeing';

UPDATE assessment_categories
SET 
    seo_title = 'Emotional Intelligence (EQ) Assessments',
    seo_description = 'Assess your emotional intelligence (EQ), interpersonal empathy, self-regulation, and social agility.',
    description = 'Measure emotional quotient, stress tolerance, and interpersonal agility through structured self-evaluations.',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'emotional-intelligence' OR id = 'cat_eq';

UPDATE assessment_categories
SET 
    seo_title = 'Career & Workplace Assessments',
    seo_description = 'Gain actionable insights into your workplace communication style, leadership approach, motivation drivers, and problem-solving habits.',
    description = 'Discover your professional working style, leadership strengths, and workplace communication tendencies.',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'career-work' OR id = 'cat_career';

UPDATE assessment_categories
SET 
    seo_title = 'Communication & Conflict Tests',
    seo_description = 'Identify your interpersonal communication style, assertiveness level, and conflict resolution tendencies.',
    description = 'Evaluate interpersonal communication habits, negotiation tendencies, and conflict styles.',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'communication' OR slug = 'social-communication' OR id = 'cat_communication';

UPDATE assessment_categories
SET 
    seo_title = 'Self-Development & Personal Growth Tests',
    seo_description = 'Assess foundational self-esteem, self-discipline, resilience, and goal orientation with psychometrically grounded tests.',
    description = 'Scientifically structured self-esteem, self-discipline, and personal growth assessments.',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'self-development' OR id = 'cat_self_dev';

UPDATE assessment_categories
SET 
    seo_title = 'Cognitive Style & Thinking Tests',
    seo_description = 'Explore how you process information, evaluate options, solve complex problems, and make everyday decisions.',
    description = 'Understand how you process information, make complex decisions, and solve problems creatively.',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'cognitive-style' OR id = 'cat_cognitive_style';

UPDATE assessment_categories
SET 
    seo_title = 'Mental Wellbeing & Resilience Self-Checks',
    seo_description = 'Reflective self-assessments to examine personal stress patterns, burnout vulnerability, and healthy emotional equilibrium.',
    description = 'Reflective self-assessments for exploring everyday stress patterns, coping habits, and emotional equilibrium.',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'mental-wellbeing' OR id = 'cat_wellbeing';

-- 3. Enrich All Assessment Short Descriptions & Descriptions
UPDATE assessments SET short_description = 'Discover your unique profile across the 5 scientifically validated core personality dimensions: Openness, Conscientiousness, Extraversion, Agreeableness, and Emotional Stability.' WHERE slug = 'big-five-personality-test';
UPDATE assessments SET short_description = 'Identify your relational bonding style: Secure, Anxious-Preoccupied, Dismissive-Avoidant, or Fearful-Avoidant to understand romantic intimacy patterns.' WHERE slug = 'attachment-style-test';
UPDATE assessments SET short_description = 'Discover your primary pathways for giving and receiving love: Words of Affirmation, Quality Time, Receiving Gifts, Acts of Service, or Physical Touch.' WHERE slug = 'love-language-quiz';
UPDATE assessments SET short_description = 'Assess your emotional self-awareness, impulse regulation, empathy, and social agility to improve personal and professional relationships.' WHERE slug = 'emotional-intelligence-test';
UPDATE assessments SET short_description = 'Map your social energy spectrum: Introvert, Ambivert, or Extrovert to understand how you recharge, communicate, and navigate social stimulation.' WHERE slug = 'introvert-extrovert-test';
UPDATE assessments SET short_description = 'Evaluate your foundational sense of self-worth, unconditional self-acceptance, and internal psychological self-efficacy.' WHERE slug = 'self-esteem-test';
UPDATE assessments SET short_description = 'Identify whether your communication tendencies are Assertive, Passive, Aggressive, or Passive-Aggressive in everyday conversations.' WHERE slug = 'communication-style-test';
UPDATE assessments SET short_description = 'Map your primary conflict negotiation tendencies: Collaborating, Compromising, Accommodating, Competing, or Avoiding under interpersonal pressure.' WHERE slug = 'conflict-style-test';
UPDATE assessments SET short_description = 'Explore your cognitive preferences across Extraversion vs Introversion, Sensing vs Intuition, Thinking vs Feeling, and Judging vs Perceiving.' WHERE slug = '16-type-personality-test';
UPDATE assessments SET short_description = 'Measure your prosocial cooperativeness, trust, empathy, and compassionate communication tendencies in social environments.' WHERE slug = 'agreeableness-test';
UPDATE assessments SET short_description = 'Assess your ability to express personal boundaries, communicate needs clearly, and stand up for yourself with confidence and respect.' WHERE slug = 'assertiveness-test';
UPDATE assessments SET short_description = 'Discover career paths, workplace environments, and occupational roles aligned with your natural behavioral style and cognitive strengths.' WHERE slug = 'career-personality-test';
UPDATE assessments SET short_description = 'Understand your strategic approach to resolving interpersonal disagreements constructively and preserving collaborative relationships.' WHERE slug = 'conflict-resolution-style-test';
UPDATE assessments SET short_description = 'Evaluate your decision-making approach: Analytical, Intuitive, Directive, or Conceptual when facing complex challenges.' WHERE slug = 'decision-making-style-test';
UPDATE assessments SET short_description = 'Assess your readiness and capacity for vulnerable, authentic emotional connection and intimacy in close relationships.' WHERE slug = 'emotional-availability-test';
UPDATE assessments SET short_description = 'Measure how accurately you identify, process, and articulate your internal feelings and emotional signals in real time.' WHERE slug = 'emotional-awareness-test';
UPDATE assessments SET short_description = 'Measure cognitive, emotional, and compassionate empathy to understand how you perceive and respond to others'' emotional experiences.' WHERE slug = 'empathy-test';
UPDATE assessments SET short_description = 'Discover whether you are driven by mastery, performance, or avoidance motivations in personal and professional pursuits.' WHERE slug = 'goal-orientation-test';
UPDATE assessments SET short_description = 'Explore your core leadership instincts: Transformational, Democratic, Authoritative, or Coaching to lead teams effectively.' WHERE slug = 'leadership-style-test';
UPDATE assessments SET short_description = 'Identify your primary internal and external motivation drivers to maintain momentum, focus, and purposeful engagement.' WHERE slug = 'motivation-style-test';
UPDATE assessments SET short_description = 'Examine your anger triggers, emotional arousal intensity, cognitive appraisal patterns, and behavioral regulation strategies.' WHERE slug = 'multidimensional-anger-test';
UPDATE assessments SET short_description = 'Explore your intellectual curiosity, creative imagination, aesthetic appreciation, and openness to novel perspectives.' WHERE slug = 'openness-to-experience-test';
UPDATE assessments SET short_description = 'Identify your cognitive problem-solving approach: Systematic, Creative, Pragmatic, or Collaborative when tackling obstacles.' WHERE slug = 'problem-solving-style-test';
UPDATE assessments SET short_description = 'Evaluate your ability to establish, communicate, and maintain healthy emotional and physical boundaries in close relationships.' WHERE slug = 'relationship-boundaries-test';
UPDATE assessments SET short_description = 'Assess emotional resonance, communication synergy, conflict tendencies, and shared relationship expectations with a partner.' WHERE slug = 'relationship-compatibility-test';
UPDATE assessments SET short_description = 'Measure psychological resilience, adaptive coping strategies, and mental fortitude when navigating adversity and life stress.' WHERE slug = 'resilience-test';
UPDATE assessments SET short_description = 'Examine your internal and external self-awareness to gain insight into how your thoughts, values, and actions shape your life.' WHERE slug = 'self-awareness-test';
UPDATE assessments SET short_description = 'Evaluate impulse control, habit consistency, sustained attention, and willpower in working toward long-term goals.' WHERE slug = 'self-discipline-test';
UPDATE assessments SET short_description = 'Assess your level of comfort, authenticity, and self-assurance in social gatherings, group conversations, and public speaking.' WHERE slug = 'social-confidence-test';
UPDATE assessments SET short_description = 'Evaluate active listening, nonverbal communication, conversational rapport, and interpersonal effectiveness in social settings.' WHERE slug = 'social-skills-test';
UPDATE assessments SET short_description = 'Discover how you cope with acute and chronic pressure: Problem-focused, Emotion-focused, or Avoidance-oriented strategies.' WHERE slug = 'stress-management-style-test';
UPDATE assessments SET short_description = 'Understand your natural cognitive patterns: Linear vs Holistic, Concrete vs Abstract, and Detail-oriented vs Big-picture thinking.' WHERE slug = 'thinking-style-test';
UPDATE assessments SET short_description = 'Understand what energizes your work, leadership instincts, problem-solving, and professional collaboration in workplace settings.' WHERE slug = 'work-style-test';
UPDATE assessments SET short_description = 'Evaluate your verbal, written, and collaborative communication effectiveness within teams and cross-functional organizations.' WHERE slug = 'workplace-communication-test';

-- 4. Archive duplicate / copy assessment slugs and create 301 redirects
UPDATE assessments SET status = 'archived' WHERE slug IN ('emotional-awareness-test-copy', 'emotional-intelligence-test-copy', 'big-five-ocean-personality-test');

INSERT OR REPLACE INTO redirects (id, old_path, new_path, status_code, is_active, hit_count, updated_at, created_at)
VALUES 
    ('red_ea_copy', '/assessments/emotional-awareness-test-copy', '/assessments/emotional-awareness-test', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_eq_copy', '/assessments/emotional-intelligence-test-copy', '/assessments/emotional-intelligence-test', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_b5_copy', '/assessments/big-five-ocean-personality-test', '/assessments/big-five-personality-test', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_terms', '/terms', '/terms-of-service', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_privacy', '/privacy', '/privacy-policy', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_rel_cat', '/assessments/category/relationships-attachment', '/assessments/category/relationships', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('red_soc_cat', '/assessments/category/social-communication', '/assessments/category/communication', 301, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
