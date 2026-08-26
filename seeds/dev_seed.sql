-- Development & Testing Seed Data
-- Cloudflare D1 (SQLite)

-- 1. Site Settings
INSERT OR IGNORE INTO site_settings (key, value, type, is_public, description) VALUES
('site_name', 'MindMetrics', 'string', 1, 'Public site name'),
('site_tagline', 'Scientifically grounded self-assessments for clarity, growth, and self-discovery.', 'string', 1, 'Public site tagline'),
('site_description', 'Explore comprehensive personality, emotional intelligence, and relationship assessments designed with psychological rigor.', 'string', 1, 'SEO default meta description'),
('disclaimer_text', 'MindMetrics self-assessments are provided for educational and self-exploration purposes only. They are not intended as diagnostic tools or clinical psychological evaluations.', 'string', 1, 'Mandatory psychology assessment disclaimer'),
('contact_email', 'support@mindmetrics.io', 'string', 1, 'Public support email'),
('maintenance_mode', 'false', 'boolean', 1, 'Global maintenance mode toggle');

-- 2. Feature Flags
INSERT OR IGNORE INTO feature_flags (key, name, description, is_enabled) VALUES
('ai_reports', 'AI Detailed Interpretations', 'Generate AI-driven personality narrative breakdowns', 1),
('pdf_reports', 'PDF Export & Storage', 'Export assessment reports as downloadable PDFs', 0),
('guest_assessments', 'Anonymous Guest Attempts', 'Allow users to complete tests without registering upfront', 1),
('social_sharing', 'Social Share Previews', 'Generate dynamic OpenGraph summary cards', 1),
('maintenance_mode', 'Maintenance Mode', 'Lock the public front-end for maintenance', 0);

-- 3. Assessment Categories
INSERT OR IGNORE INTO assessment_categories (id, name, slug, description, icon, display_order, status, seo_title, seo_description) VALUES
('cat_personality', 'Personality', 'personality', 'Understand your core traits, behavioral tendencies, and cognitive patterns.', 'Sparkles', 1, 'active', 'Personality Assessments & Psychometrics | MindMetrics', 'Explore evidence-based Big Five, Introversion, and temperament tests.'),
('cat_relationships', 'Relationships', 'relationships', 'Gain deep clarity into your attachment style, love languages, and intimacy dynamics.', 'Heart', 2, 'active', 'Relationship & Attachment Assessments | MindMetrics', 'Validated attachment style and relationship compatibility self-evaluations.'),
('cat_eq', 'Emotional Intelligence', 'emotional-intelligence', 'Assess self-regulation, empathy, social intelligence, and resilience under pressure.', 'Brain', 3, 'active', 'Emotional Intelligence (EQ) Assessments | MindMetrics', 'Measure emotional quotient, stress tolerance, and interpersonal agility.'),
('cat_wellbeing', 'Mental Wellbeing', 'mental-wellbeing', 'Screen habits, burnout indicators, mindfulness, and cognitive self-care.', 'Shield', 4, 'active', 'Mental Wellbeing & Resilience Self-Checks | MindMetrics', 'Reflective wellness and burnout assessments.');

-- 4. Demo Assessment: Big Five (OCEAN) Personality Quick Test
INSERT OR IGNORE INTO assessments (
    id, category_id, name, slug, short_description, long_description, instructions, estimated_minutes, question_count, access_type, status, featured, display_order, version, disclaimer, published_at
) VALUES (
    'asm_big_five',
    'cat_personality',
    'Big Five (OCEAN) Personality Test',
    'big-five-personality',
    'Discover your unique profile across the 5 scientifically validated core personality dimensions.',
    'The Big Five model (OCEAN) is the gold standard of contemporary personality psychology. It evaluates Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism (Emotional Stability).',
    'Read each statement carefully and select the degree to which you agree or disagree. Answer honestly as you naturally are, not how you wish to be.',
    8,
    10,
    'free',
    'published',
    1,
    1,
    1,
    'This test provides psychological self-reflection and is not a clinical diagnosis.',
    CURRENT_TIMESTAMP
);

-- 5. Big Five Dimensions
INSERT OR IGNORE INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status) VALUES
('dim_openness', 'asm_big_five', 'Openness to Experience', 'openness', 'Intellectual curiosity, creativity, and preference for novelty.', 1, 'active'),
('dim_conscientiousness', 'asm_big_five', 'Conscientiousness', 'conscientiousness', 'Self-discipline, organization, goal-directed behavior, and reliability.', 2, 'active'),
('dim_extraversion', 'asm_big_five', 'Extraversion', 'extraversion', 'Energy from social interaction, assertiveness, and enthusiasm.', 3, 'active'),
('dim_agreeableness', 'asm_big_five', 'Agreeableness', 'agreeableness', 'Empathy, cooperativeness, compassion, and trust in others.', 4, 'active'),
('dim_neuroticism', 'asm_big_five', 'Emotional Stability', 'emotional-stability', 'Resilience to stress, calmness, and emotional regulation.', 5, 'active');

-- 6. Big Five Assessment Questions
INSERT OR IGNORE INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status) VALUES
('q_bf_1', 'asm_big_five', 'I enjoy exploring abstract ideas, art, and unconventional theories.', 'likert', 1, 1, 'active'),
('q_bf_2', 'asm_big_five', 'I have a vivid imagination and love brainstorming creative solutions.', 'likert', 2, 1, 'active'),
('q_bf_3', 'asm_big_five', 'I keep my schedule organized and complete tasks well before deadlines.', 'likert', 3, 1, 'active'),
('q_bf_4', 'asm_big_five', 'I pay close attention to detail and prefer methodical execution.', 'likert', 4, 1, 'active'),
('q_bf_5', 'asm_big_five', 'I feel energized after spending time in large social gatherings.', 'likert', 5, 1, 'active'),
('q_bf_6', 'asm_big_five', 'I naturally initiate conversations and speak up in groups.', 'likert', 6, 1, 'active'),
('q_bf_7', 'asm_big_five', 'I am deeply sensitive to the emotional needs and struggles of others.', 'likert', 7, 1, 'active'),
('q_bf_8', 'asm_big_five', 'I prefer harmonious cooperation over aggressive competition.', 'likert', 8, 1, 'active'),
('q_bf_9', 'asm_big_five', 'I stay composed and calm when unexpected crises arise.', 'likert', 9, 1, 'active'),
('q_bf_10', 'asm_big_five', 'I rarely worry or feel overwhelmed by daily uncertainties.', 'likert', 10, 1, 'active');

-- 7. Standard 5-Point Likert Options for Questions
-- (Reused across the questions)
INSERT OR IGNORE INTO question_options (id, question_id, option_text, option_value, display_order, status) VALUES
-- Q1
('opt_q1_1', 'q_bf_1', 'Strongly Disagree', '1', 1, 'active'),
('opt_q1_2', 'q_bf_1', 'Disagree', '2', 2, 'active'),
('opt_q1_3', 'q_bf_1', 'Neutral', '3', 3, 'active'),
('opt_q1_4', 'q_bf_1', 'Agree', '4', 4, 'active'),
('opt_q1_5', 'q_bf_1', 'Strongly Agree', '5', 5, 'active'),
-- Q2
('opt_q2_1', 'q_bf_2', 'Strongly Disagree', '1', 1, 'active'),
('opt_q2_2', 'q_bf_2', 'Disagree', '2', 2, 'active'),
('opt_q2_3', 'q_bf_2', 'Neutral', '3', 3, 'active'),
('opt_q2_4', 'q_bf_2', 'Agree', '4', 4, 'active'),
('opt_q2_5', 'q_bf_2', 'Strongly Agree', '5', 5, 'active'),
-- Q3
('opt_q3_1', 'q_bf_3', 'Strongly Disagree', '1', 1, 'active'),
('opt_q3_2', 'q_bf_3', 'Disagree', '2', 2, 'active'),
('opt_q3_3', 'q_bf_3', 'Neutral', '3', 3, 'active'),
('opt_q3_4', 'q_bf_3', 'Agree', '4', 4, 'active'),
('opt_q3_5', 'q_bf_3', 'Strongly Agree', '5', 5, 'active'),
-- Q4
('opt_q4_1', 'q_bf_4', 'Strongly Disagree', '1', 1, 'active'),
('opt_q4_2', 'q_bf_4', 'Disagree', '2', 2, 'active'),
('opt_q4_3', 'q_bf_4', 'Neutral', '3', 3, 'active'),
('opt_q4_4', 'q_bf_4', 'Agree', '4', 4, 'active'),
('opt_q4_5', 'q_bf_4', 'Strongly Agree', '5', 5, 'active'),
-- Q5
('opt_q5_1', 'q_bf_5', 'Strongly Disagree', '1', 1, 'active'),
('opt_q5_2', 'q_bf_5', 'Disagree', '2', 2, 'active'),
('opt_q5_3', 'q_bf_5', 'Neutral', '3', 3, 'active'),
('opt_q5_4', 'q_bf_5', 'Agree', '4', 4, 'active'),
('opt_q5_5', 'q_bf_5', 'Strongly Agree', '5', 5, 'active'),
-- Q6
('opt_q6_1', 'q_bf_6', 'Strongly Disagree', '1', 1, 'active'),
('opt_q6_2', 'q_bf_6', 'Disagree', '2', 2, 'active'),
('opt_q6_3', 'q_bf_6', 'Neutral', '3', 3, 'active'),
('opt_q6_4', 'q_bf_6', 'Agree', '4', 4, 'active'),
('opt_q6_5', 'q_bf_6', 'Strongly Agree', '5', 5, 'active'),
-- Q7
('opt_q7_1', 'q_bf_7', 'Strongly Disagree', '1', 1, 'active'),
('opt_q7_2', 'q_bf_7', 'Disagree', '2', 2, 'active'),
('opt_q7_3', 'q_bf_7', 'Neutral', '3', 3, 'active'),
('opt_q7_4', 'q_bf_7', 'Agree', '4', 4, 'active'),
('opt_q7_5', 'q_bf_7', 'Strongly Agree', '5', 5, 'active'),
-- Q8
('opt_q8_1', 'q_bf_8', 'Strongly Disagree', '1', 1, 'active'),
('opt_q8_2', 'q_bf_8', 'Disagree', '2', 2, 'active'),
('opt_q8_3', 'q_bf_8', 'Neutral', '3', 3, 'active'),
('opt_q8_4', 'q_bf_8', 'Agree', '4', 4, 'active'),
('opt_q8_5', 'q_bf_8', 'Strongly Agree', '5', 5, 'active'),
-- Q9
('opt_q9_1', 'q_bf_9', 'Strongly Disagree', '1', 1, 'active'),
('opt_q9_2', 'q_bf_9', 'Disagree', '2', 2, 'active'),
('opt_q9_3', 'q_bf_9', 'Neutral', '3', 3, 'active'),
('opt_q9_4', 'q_bf_9', 'Agree', '4', 4, 'active'),
('opt_q9_5', 'q_bf_9', 'Strongly Agree', '5', 5, 'active'),
-- Q10
('opt_q10_1', 'q_bf_10', 'Strongly Disagree', '1', 1, 'active'),
('opt_q10_2', 'q_bf_10', 'Disagree', '2', 2, 'active'),
('opt_q10_3', 'q_bf_10', 'Neutral', '3', 3, 'active'),
('opt_q10_4', 'q_bf_10', 'Agree', '4', 4, 'active'),
('opt_q10_5', 'q_bf_10', 'Strongly Agree', '5', 5, 'active');

-- 8. Scoring Rules (Mapping each option to dimension score)
-- Q1 & Q2 -> Openness
INSERT OR IGNORE INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight) VALUES
('sr_q1_1', 'asm_big_five', 'q_bf_1', 'dim_openness', 'opt_q1_1', 1.0, 1.0),
('sr_q1_2', 'asm_big_five', 'q_bf_1', 'dim_openness', 'opt_q1_2', 2.0, 1.0),
('sr_q1_3', 'asm_big_five', 'q_bf_1', 'dim_openness', 'opt_q1_3', 3.0, 1.0),
('sr_q1_4', 'asm_big_five', 'q_bf_1', 'dim_openness', 'opt_q1_4', 4.0, 1.0),
('sr_q1_5', 'asm_big_five', 'q_bf_1', 'dim_openness', 'opt_q1_5', 5.0, 1.0),
('sr_q2_1', 'asm_big_five', 'q_bf_2', 'dim_openness', 'opt_q2_1', 1.0, 1.0),
('sr_q2_2', 'asm_big_five', 'q_bf_2', 'dim_openness', 'opt_q2_2', 2.0, 1.0),
('sr_q2_3', 'asm_big_five', 'q_bf_2', 'dim_openness', 'opt_q2_3', 3.0, 1.0),
('sr_q2_4', 'asm_big_five', 'q_bf_2', 'dim_openness', 'opt_q2_4', 4.0, 1.0),
('sr_q2_5', 'asm_big_five', 'q_bf_2', 'dim_openness', 'opt_q2_5', 5.0, 1.0),
-- Q3 & Q4 -> Conscientiousness
('sr_q3_1', 'asm_big_five', 'q_bf_3', 'dim_conscientiousness', 'opt_q3_1', 1.0, 1.0),
('sr_q3_2', 'asm_big_five', 'q_bf_3', 'dim_conscientiousness', 'opt_q3_2', 2.0, 1.0),
('sr_q3_3', 'asm_big_five', 'q_bf_3', 'dim_conscientiousness', 'opt_q3_3', 3.0, 1.0),
('sr_q3_4', 'asm_big_five', 'q_bf_3', 'dim_conscientiousness', 'opt_q3_4', 4.0, 1.0),
('sr_q3_5', 'asm_big_five', 'q_bf_3', 'dim_conscientiousness', 'opt_q3_5', 5.0, 1.0),
('sr_q4_1', 'asm_big_five', 'q_bf_4', 'dim_conscientiousness', 'opt_q4_1', 1.0, 1.0),
('sr_q4_2', 'asm_big_five', 'q_bf_4', 'dim_conscientiousness', 'opt_q4_2', 2.0, 1.0),
('sr_q4_3', 'asm_big_five', 'q_bf_4', 'dim_conscientiousness', 'opt_q4_3', 3.0, 1.0),
('sr_q4_4', 'asm_big_five', 'q_bf_4', 'dim_conscientiousness', 'opt_q4_4', 4.0, 1.0),
('sr_q4_5', 'asm_big_five', 'q_bf_4', 'dim_conscientiousness', 'opt_q4_5', 5.0, 1.0),
-- Q5 & Q6 -> Extraversion
('sr_q5_1', 'asm_big_five', 'q_bf_5', 'dim_extraversion', 'opt_q5_1', 1.0, 1.0),
('sr_q5_2', 'asm_big_five', 'q_bf_5', 'dim_extraversion', 'opt_q5_2', 2.0, 1.0),
('sr_q5_3', 'asm_big_five', 'q_bf_5', 'dim_extraversion', 'opt_q5_3', 3.0, 1.0),
('sr_q5_4', 'asm_big_five', 'q_bf_5', 'dim_extraversion', 'opt_q5_4', 4.0, 1.0),
('sr_q5_5', 'asm_big_five', 'q_bf_5', 'dim_extraversion', 'opt_q5_5', 5.0, 1.0),
('sr_q6_1', 'asm_big_five', 'q_bf_6', 'dim_extraversion', 'opt_q6_1', 1.0, 1.0),
('sr_q6_2', 'asm_big_five', 'q_bf_6', 'dim_extraversion', 'opt_q6_2', 2.0, 1.0),
('sr_q6_3', 'asm_big_five', 'q_bf_6', 'dim_extraversion', 'opt_q6_3', 3.0, 1.0),
('sr_q6_4', 'asm_big_five', 'q_bf_6', 'dim_extraversion', 'opt_q6_4', 4.0, 1.0),
('sr_q6_5', 'asm_big_five', 'q_bf_6', 'dim_extraversion', 'opt_q6_5', 5.0, 1.0),
-- Q7 & Q8 -> Agreeableness
('sr_q7_1', 'asm_big_five', 'q_bf_7', 'dim_agreeableness', 'opt_q7_1', 1.0, 1.0),
('sr_q7_2', 'asm_big_five', 'q_bf_7', 'dim_agreeableness', 'opt_q7_2', 2.0, 1.0),
('sr_q7_3', 'asm_big_five', 'q_bf_7', 'dim_agreeableness', 'opt_q7_3', 3.0, 1.0),
('sr_q7_4', 'asm_big_five', 'q_bf_7', 'dim_agreeableness', 'opt_q7_4', 4.0, 1.0),
('sr_q7_5', 'asm_big_five', 'q_bf_7', 'dim_agreeableness', 'opt_q7_5', 5.0, 1.0),
('sr_q8_1', 'asm_big_five', 'q_bf_8', 'dim_agreeableness', 'opt_q8_1', 1.0, 1.0),
('sr_q8_2', 'asm_big_five', 'q_bf_8', 'dim_agreeableness', 'opt_q8_2', 2.0, 1.0),
('sr_q8_3', 'asm_big_five', 'q_bf_8', 'dim_agreeableness', 'opt_q8_3', 3.0, 1.0),
('sr_q8_4', 'asm_big_five', 'q_bf_8', 'dim_agreeableness', 'opt_q8_4', 4.0, 1.0),
('sr_q8_5', 'asm_big_five', 'q_bf_8', 'dim_agreeableness', 'opt_q8_5', 5.0, 1.0),
-- Q9 & Q10 -> Emotional Stability
('sr_q9_1', 'asm_big_five', 'q_bf_9', 'dim_neuroticism', 'opt_q9_1', 1.0, 1.0),
('sr_q9_2', 'asm_big_five', 'q_bf_9', 'dim_neuroticism', 'opt_q9_2', 2.0, 1.0),
('sr_q9_3', 'asm_big_five', 'q_bf_9', 'dim_neuroticism', 'opt_q9_3', 3.0, 1.0),
('sr_q9_4', 'asm_big_five', 'q_bf_9', 'dim_neuroticism', 'opt_q9_4', 4.0, 1.0),
('sr_q9_5', 'asm_big_five', 'q_bf_9', 'dim_neuroticism', 'opt_q9_5', 5.0, 1.0),
('sr_q10_1', 'asm_big_five', 'q_bf_10', 'dim_neuroticism', 'opt_q10_1', 1.0, 1.0),
('sr_q10_2', 'asm_big_five', 'q_bf_10', 'dim_neuroticism', 'opt_q10_2', 2.0, 1.0),
('sr_q10_3', 'asm_big_five', 'q_bf_10', 'dim_neuroticism', 'opt_q10_3', 3.0, 1.0),
('sr_q10_4', 'asm_big_five', 'q_bf_10', 'dim_neuroticism', 'opt_q10_4', 4.0, 1.0),
('sr_q10_5', 'asm_big_five', 'q_bf_10', 'dim_neuroticism', 'opt_q10_5', 5.0, 1.0);

-- 9. Result Types
INSERT OR IGNORE INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order) VALUES
('rt_openness_high', 'asm_big_five', 'dim_openness', 'High Openness', 'high-openness', 'Visionary, imaginative, intellectually curious.', 70.0, 100.0, 1),
('rt_openness_mid', 'asm_big_five', 'dim_openness', 'Moderate Openness', 'moderate-openness', 'Pragmatic balance between novelty and established methods.', 30.0, 69.9, 2),
('rt_openness_low', 'asm_big_five', 'dim_openness', 'Ground-Focused Openness', 'low-openness', 'Concrete, traditional, down-to-earth perspective.', 0.0, 29.9, 3);

-- 10. Result Contents
INSERT OR IGNORE INTO result_contents (id, result_type_id, section_type, title, content, display_order) VALUES
('rc_op_high_ov', 'rt_openness_high', 'overview', 'Overview of Your High Openness Profile', 'You have a natural thirst for creative exploration and deep philosophical concepts. You enjoy synthesizing cross-domain ideas and challenge status-quo thinking.', 1),
('rc_op_high_str', 'rt_openness_high', 'strengths', 'Key Cognitive Strengths', '• Strong divergent thinking and artistic appreciation\n• Adaptable to novel challenges and changing environments\n• Natural problem solver when conventional methods fail', 2),
('rc_op_high_gw', 'rt_openness_high', 'growth_suggestions', 'Actionable Growth Suggestions', 'Anchor your expansive ideas with structured milestones to prevent project sprawl.', 3);

-- 11. Subscription Plans (Lemon Squeezy Ready)
INSERT OR IGNORE INTO subscription_plans (id, name, slug, description, price, currency, billing_interval, features, included_credits, status, display_order) VALUES
('plan_free', 'Free Explorer', 'free', 'Essential psychometric assessments and basic scoring breakdowns.', 0.0, 'USD', 'monthly', '["Access to all core assessments", "Deterministic score calculation", "Standard result profile", "No account required"]', 0, 'active', 1),
('plan_pro_monthly', 'MindMetrics Pro', 'pro-monthly', 'Deep AI interpretations, growth roadmaps, and career insights.', 9.99, 'USD', 'monthly', '["Everything in Free", "10 AI Detailed Interpretations/month", "PDF Report Exports", "Full Attempt History & Trajectory Tracking", "Priority Support"]', 10, 'active', 2),
('plan_pro_annual', 'MindMetrics Annual Pass', 'pro-annual', 'Complete yearly access with comprehensive insights and 150 AI credits.', 79.99, 'USD', 'yearly', '["Everything in Pro", "150 AI Credits Included", "Relationship Compatibility Analyses", "2 Months Free", "Direct Psychometric Data Export"]', 150, 'active', 3);

-- 12. Dynamic CMS Pages
INSERT OR IGNORE INTO pages (id, title, slug, content, status, seo_title, seo_description, published_at) VALUES
('page_about', 'About MindMetrics', 'about', '# About MindMetrics\n\nMindMetrics was founded to bring psychological clarity and scientific rigour to consumer self-reflection.\n\nOur platform combines validated psychometric models with cutting-edge Edge serverless architecture to deliver private, instant, and transformative personal insights.', 'published', 'About Us | MindMetrics', 'Learn about the mission and scientific foundation of MindMetrics.', CURRENT_TIMESTAMP),
('page_privacy', 'Privacy Policy', 'privacy', '# Privacy Policy\n\nAt MindMetrics, we value your privacy above all else.\n\n### 1. Data Collection\nWe do not sell assessment responses to third parties. Responses are stored in encrypted Cloudflare D1 storage.\n\n### 2. AI Processing\nWhen optional AI interpretations are requested, no personally identifiable information (PII) is transmitted to LLM providers.', 'published', 'Privacy Policy | MindMetrics', 'Read our strict privacy policy and data security standards.', CURRENT_TIMESTAMP),
('page_terms', 'Terms of Service', 'terms', '# Terms of Service\n\nBy using MindMetrics, you agree to these terms.\n\n### 1. Permitted Use\nMindMetrics provides self-reflection instruments for personal self-development only.\n\n### 2. Limitation of Liability\nThe assessments and interpretations provided are educational and not clinical evaluations.', 'published', 'Terms of Service | MindMetrics', 'Terms of service for using the MindMetrics platform.', CURRENT_TIMESTAMP),
('page_disclaimer', 'Psychological Disclaimer', 'disclaimer', '# Medical & Psychological Disclaimer\n\nThe assessments, psychometric models, reports, and AI-generated insights presented on MindMetrics are intended strictly for educational, informational, and self-reflection purposes.\n\n### Not Clinical Diagnosis\nNothing contained on this website should be construed as medical, psychiatric, or clinical psychological advice, diagnosis, or treatment. If you are experiencing psychological distress, please consult a licensed professional or crisis hotline.', 'published', 'Psychological Disclaimer | MindMetrics', 'Important medical and psychological notice for all assessment takers.', CURRENT_TIMESTAMP);

-- 13. Dynamic FAQs
INSERT OR IGNORE INTO faqs (id, question, answer, category, entity_type, entity_id, display_order, status) VALUES
('faq_1', 'Are these assessments scientifically validated?', 'Yes. Our assessments are built using recognized psychometric frameworks such as the Big Five (OCEAN), Adult Attachment Theory, and Mayer-Salovey EQ frameworks.', 'general', 'global', NULL, 1, 'active'),
('faq_2', 'Can I take assessments without creating an account?', 'Absolutely. You can complete assessments as a guest taker. You may optionally create an account later to save your progress and access longitudinal score tracking.', 'general', 'global', NULL, 2, 'active'),
('faq_3', 'How are AI report interpretations generated?', 'Our scoring engine first computes deterministic, standardized dimension scores. If you request an AI interpretation, these scores are synthesized with expert psychological prompt templates.', 'ai', 'global', NULL, 3, 'active'),
('faq_4', 'Is my psychological data private and secure?', 'Yes. All data is processed on Cloudflare Edge infrastructure with end-to-end encryption. We never sell your responses or share your personal profile with third parties.', 'general', 'global', NULL, 4, 'active');

-- 14. Dynamic AI Configurations & Prompts
INSERT OR IGNORE INTO ai_configurations (id, provider, model, is_enabled, priority, api_key_reference, token_limit, credit_cost, system_prompt) VALUES
('ai_gemini_flash', 'gemini', 'gemini-1.5-flash', 1, 1, 'GEMINI_API_KEY', 4096, 1, 'You are an empathetic, scientifically grounded psychologist and executive coach explaining assessment results clearly.'),
('ai_openai_mini', 'openai', 'gpt-4o-mini', 1, 2, 'OPENAI_API_KEY', 4096, 1, 'You are a professional psychometrician providing constructive and empowering behavioral synthesis.');

INSERT OR IGNORE INTO ai_prompts (id, name, slug, purpose, prompt_template, version, status) VALUES
('prompt_assessment_synthesis', 'Assessment Narrative Synthesis', 'assessment-synthesis', 'assessment_interpretation', 'Analyze the following score profile for assessment "{{assessment_name}}":\n\nDimensions & Scores:\n{{dimension_scores}}\n\nProvide:\n1. Core Behavioral Narrative\n2. Key Interpersonal Dynamics\n3. High-Leverage Growth Pathway\n\nMaintain an encouraging, evidence-based tone.', 1, 'active');
