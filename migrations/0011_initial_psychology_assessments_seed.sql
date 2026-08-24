-- Migration 0011: Initial Psychology Assessments Library (8 MVP Instruments)
-- Cloudflare D1 (SQLite)

-- 1. Ensure Categories Exist
INSERT OR IGNORE INTO assessment_categories (id, name, slug, description, icon, display_order, status, seo_title, seo_description) VALUES
('cat_personality', 'Personality', 'personality', 'Understand your core traits, behavioral tendencies, and cognitive patterns.', 'Sparkles', 1, 'active', 'Personality Assessments & Psychometrics | Psychology Calculator', 'Explore evidence-based Big Five, Introversion, and temperament tests.'),
('cat_relationships', 'Relationships', 'relationships', 'Gain deep clarity into your attachment style, love languages, and intimacy dynamics.', 'Heart', 2, 'active', 'Relationship & Attachment Assessments | Psychology Calculator', 'Validated attachment style and relationship compatibility self-evaluations.'),
('cat_eq', 'Emotional Intelligence', 'emotional-intelligence', 'Assess self-regulation, empathy, social intelligence, and resilience under pressure.', 'Brain', 3, 'active', 'Emotional Intelligence (EQ) Assessments | Psychology Calculator', 'Measure emotional quotient, stress tolerance, and interpersonal agility.'),
('cat_self_dev', 'Self Development', 'self-development', 'Build grounded self-esteem, habit discipline, and cognitive growth pathways.', 'Compass', 4, 'active', 'Self Development Assessments | Psychology Calculator', 'Scientifically structured self-esteem and personal growth assessments.'),
('cat_communication', 'Communication', 'communication', 'Understand your conversational dynamics, assertiveness, and conflict resolution style.', 'MessageCircle', 5, 'active', 'Communication & Conflict Assessments | Psychology Calculator', 'Evaluate interpersonal communication habits and negotiation styles.');

-- =========================================================================
-- 1. Big Five (OCEAN) Personality Test
-- =========================================================================
INSERT OR IGNORE INTO assessments (
    id, category_id, name, slug, short_description, long_description, instructions, estimated_minutes, question_count, access_type, status, featured, display_order, version, disclaimer, published_at
) VALUES (
    'asm_big_five', 'cat_personality', 'Big Five (OCEAN) Personality Test', 'big-five-personality-test',
    'Discover your unique profile across the 5 scientifically validated core personality dimensions: Openness, Conscientiousness, Extraversion, Agreeableness, and Emotional Stability.',
    'The Big Five framework (OCEAN) represents the gold standard in contemporary psychological research. Decades of cross-cultural empirical studies show these five traits form the foundation of human behavioral variance.',
    'Read each statement carefully and select the degree to which you agree or disagree based on how you genuinely act, not how you feel you should act.',
    8, 10, 'free', 'published', 1, 1, 1,
    'This assessment is intended for self-reflection and educational purposes only. It is not a clinical psychological or psychiatric evaluation.',
    CURRENT_TIMESTAMP
);

-- Dimensions
INSERT OR IGNORE INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status) VALUES
('dim_openness', 'asm_big_five', 'Openness to Experience', 'openness', 'Intellectual curiosity, creative imagination, and preference for conceptual novelty.', 1, 'active'),
('dim_conscientiousness', 'asm_big_five', 'Conscientiousness', 'conscientiousness', 'Self-discipline, organization, deliberate goal-directed execution, and reliability.', 2, 'active'),
('dim_extraversion', 'asm_big_five', 'Extraversion', 'extraversion', 'Energy derived from social interactions, assertiveness, and positive emotionality.', 3, 'active'),
('dim_agreeableness', 'asm_big_five', 'Agreeableness', 'agreeableness', 'Empathy, prosocial cooperativeness, compassion, and interpersonal trust.', 4, 'active'),
('dim_neuroticism', 'asm_big_five', 'Emotional Stability', 'emotional-stability', 'Resilience under acute pressure, calmness, and balanced emotional regulation.', 5, 'active');

-- Questions
INSERT OR IGNORE INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status) VALUES
('q_bf_1', 'asm_big_five', 'I enjoy exploring abstract philosophical concepts, art, and unfamiliar theories.', 'likert', 1, 1, 'active'),
('q_bf_2', 'asm_big_five', 'I have an active imagination and regularly formulate novel ideas.', 'likert', 2, 1, 'active'),
('q_bf_3', 'asm_big_five', 'I keep my physical and digital workspace structured and finish projects before deadlines.', 'likert', 3, 1, 'active'),
('q_bf_4', 'asm_big_five', 'I pay close attention to precision and prefer methodical, thorough execution.', 'likert', 4, 1, 'active'),
('q_bf_5', 'asm_big_five', 'I feel energized after engaging actively in dynamic group conversations.', 'likert', 5, 1, 'active'),
('q_bf_6', 'asm_big_five', 'I naturally take the initiative in social situations and express my perspective easily.', 'likert', 6, 1, 'active'),
('q_bf_7', 'asm_big_five', 'I am deeply attuned to how others feel and go out of my way to support them.', 'likert', 7, 1, 'active'),
('q_bf_8', 'asm_big_five', 'I prioritize mutual understanding and cooperation over competitive confrontation.', 'likert', 8, 1, 'active'),
('q_bf_9', 'asm_big_five', 'I remain calm, steady, and clear-headed when unexpected emergencies arise.', 'likert', 9, 1, 'active'),
('q_bf_10', 'asm_big_five', 'I rarely dwell on anxious thoughts or feel overwhelmed by daily uncertainties.', 'likert', 10, 1, 'active');

-- Likert 5-point options for Big Five
INSERT OR IGNORE INTO question_options (id, question_id, option_text, option_value, display_order, status) VALUES
('opt_q1_1', 'q_bf_1', 'Strongly Disagree', '1', 1, 'active'), ('opt_q1_2', 'q_bf_1', 'Disagree', '2', 2, 'active'), ('opt_q1_3', 'q_bf_1', 'Neutral', '3', 3, 'active'), ('opt_q1_4', 'q_bf_1', 'Agree', '4', 4, 'active'), ('opt_q1_5', 'q_bf_1', 'Strongly Agree', '5', 5, 'active'),
('opt_q2_1', 'q_bf_2', 'Strongly Disagree', '1', 1, 'active'), ('opt_q2_2', 'q_bf_2', 'Disagree', '2', 2, 'active'), ('opt_q2_3', 'q_bf_2', 'Neutral', '3', 3, 'active'), ('opt_q2_4', 'q_bf_2', 'Agree', '4', 4, 'active'), ('opt_q2_5', 'q_bf_2', 'Strongly Agree', '5', 5, 'active'),
('opt_q3_1', 'q_bf_3', 'Strongly Disagree', '1', 1, 'active'), ('opt_q3_2', 'q_bf_3', 'Disagree', '2', 2, 'active'), ('opt_q3_3', 'q_bf_3', 'Neutral', '3', 3, 'active'), ('opt_q3_4', 'q_bf_3', 'Agree', '4', 4, 'active'), ('opt_q3_5', 'q_bf_3', 'Strongly Agree', '5', 5, 'active'),
('opt_q4_1', 'q_bf_4', 'Strongly Disagree', '1', 1, 'active'), ('opt_q4_2', 'q_bf_4', 'Disagree', '2', 2, 'active'), ('opt_q4_3', 'q_bf_4', 'Neutral', '3', 3, 'active'), ('opt_q4_4', 'q_bf_4', 'Agree', '4', 4, 'active'), ('opt_q4_5', 'q_bf_4', 'Strongly Agree', '5', 5, 'active'),
('opt_q5_1', 'q_bf_5', 'Strongly Disagree', '1', 1, 'active'), ('opt_q5_2', 'q_bf_5', 'Disagree', '2', 2, 'active'), ('opt_q5_3', 'q_bf_5', 'Neutral', '3', 3, 'active'), ('opt_q5_4', 'q_bf_5', 'Agree', '4', 4, 'active'), ('opt_q5_5', 'q_bf_5', 'Strongly Agree', '5', 5, 'active'),
('opt_q6_1', 'q_bf_6', 'Strongly Disagree', '1', 1, 'active'), ('opt_q6_2', 'q_bf_6', 'Disagree', '2', 2, 'active'), ('opt_q6_3', 'q_bf_6', 'Neutral', '3', 3, 'active'), ('opt_q6_4', 'q_bf_6', 'Agree', '4', 4, 'active'), ('opt_q6_5', 'q_bf_6', 'Strongly Agree', '5', 5, 'active'),
('opt_q7_1', 'q_bf_7', 'Strongly Disagree', '1', 1, 'active'), ('opt_q7_2', 'q_bf_7', 'Disagree', '2', 2, 'active'), ('opt_q7_3', 'q_bf_7', 'Neutral', '3', 3, 'active'), ('opt_q7_4', 'q_bf_7', 'Agree', '4', 4, 'active'), ('opt_q7_5', 'q_bf_7', 'Strongly Agree', '5', 5, 'active'),
('opt_q8_1', 'q_bf_8', 'Strongly Disagree', '1', 1, 'active'), ('opt_q8_2', 'q_bf_8', 'Disagree', '2', 2, 'active'), ('opt_q8_3', 'q_bf_8', 'Neutral', '3', 3, 'active'), ('opt_q8_4', 'q_bf_8', 'Agree', '4', 4, 'active'), ('opt_q8_5', 'q_bf_8', 'Strongly Agree', '5', 5, 'active'),
('opt_q9_1', 'q_bf_9', 'Strongly Disagree', '1', 1, 'active'), ('opt_q9_2', 'q_bf_9', 'Disagree', '2', 2, 'active'), ('opt_q9_3', 'q_bf_9', 'Neutral', '3', 3, 'active'), ('opt_q9_4', 'q_bf_9', 'Agree', '4', 4, 'active'), ('opt_q9_5', 'q_bf_9', 'Strongly Agree', '5', 5, 'active'),
('opt_q10_1', 'q_bf_10', 'Strongly Disagree', '1', 1, 'active'), ('opt_q10_2', 'q_bf_10', 'Disagree', '2', 2, 'active'), ('opt_q10_3', 'q_bf_10', 'Neutral', '3', 3, 'active'), ('opt_q10_4', 'q_bf_10', 'Agree', '4', 4, 'active'), ('opt_q10_5', 'q_bf_10', 'Strongly Agree', '5', 5, 'active');

-- Scoring Rules for Big Five (Forward 1-5 scale)
INSERT OR IGNORE INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight) VALUES
('sr_q1_1', 'asm_big_five', 'q_bf_1', 'dim_openness', 'opt_q1_1', 1.0, 1.0), ('sr_q1_2', 'asm_big_five', 'q_bf_1', 'dim_openness', 'opt_q1_2', 2.0, 1.0), ('sr_q1_3', 'asm_big_five', 'q_bf_1', 'dim_openness', 'opt_q1_3', 3.0, 1.0), ('sr_q1_4', 'asm_big_five', 'q_bf_1', 'dim_openness', 'opt_q1_4', 4.0, 1.0), ('sr_q1_5', 'asm_big_five', 'q_bf_1', 'dim_openness', 'opt_q1_5', 5.0, 1.0),
('sr_q2_1', 'asm_big_five', 'q_bf_2', 'dim_openness', 'opt_q2_1', 1.0, 1.0), ('sr_q2_2', 'asm_big_five', 'q_bf_2', 'dim_openness', 'opt_q2_2', 2.0, 1.0), ('sr_q2_3', 'asm_big_five', 'q_bf_2', 'dim_openness', 'opt_q2_3', 3.0, 1.0), ('sr_q2_4', 'asm_big_five', 'q_bf_2', 'dim_openness', 'opt_q2_4', 4.0, 1.0), ('sr_q2_5', 'asm_big_five', 'q_bf_2', 'dim_openness', 'opt_q2_5', 5.0, 1.0),
('sr_q3_1', 'asm_big_five', 'q_bf_3', 'dim_conscientiousness', 'opt_q3_1', 1.0, 1.0), ('sr_q3_2', 'asm_big_five', 'q_bf_3', 'dim_conscientiousness', 'opt_q3_2', 2.0, 1.0), ('sr_q3_3', 'asm_big_five', 'q_bf_3', 'dim_conscientiousness', 'opt_q3_3', 3.0, 1.0), ('sr_q3_4', 'asm_big_five', 'q_bf_3', 'dim_conscientiousness', 'opt_q3_4', 4.0, 1.0), ('sr_q3_5', 'asm_big_five', 'q_bf_3', 'dim_conscientiousness', 'opt_q3_5', 5.0, 1.0),
('sr_q4_1', 'asm_big_five', 'q_bf_4', 'dim_conscientiousness', 'opt_q4_1', 1.0, 1.0), ('sr_q4_2', 'asm_big_five', 'q_bf_4', 'dim_conscientiousness', 'opt_q4_2', 2.0, 1.0), ('sr_q4_3', 'asm_big_five', 'q_bf_4', 'dim_conscientiousness', 'opt_q4_3', 3.0, 1.0), ('sr_q4_4', 'asm_big_five', 'q_bf_4', 'dim_conscientiousness', 'opt_q4_4', 4.0, 1.0), ('sr_q4_5', 'asm_big_five', 'q_bf_4', 'dim_conscientiousness', 'opt_q4_5', 5.0, 1.0),
('sr_q5_1', 'asm_big_five', 'q_bf_5', 'dim_extraversion', 'opt_q5_1', 1.0, 1.0), ('sr_q5_2', 'asm_big_five', 'q_bf_5', 'dim_extraversion', 'opt_q5_2', 2.0, 1.0), ('sr_q5_3', 'asm_big_five', 'q_bf_5', 'dim_extraversion', 'opt_q5_3', 3.0, 1.0), ('sr_q5_4', 'asm_big_five', 'q_bf_5', 'dim_extraversion', 'opt_q5_4', 4.0, 1.0), ('sr_q5_5', 'asm_big_five', 'q_bf_5', 'dim_extraversion', 'opt_q5_5', 5.0, 1.0),
('sr_q6_1', 'asm_big_five', 'q_bf_6', 'dim_extraversion', 'opt_q6_1', 1.0, 1.0), ('sr_q6_2', 'asm_big_five', 'q_bf_6', 'dim_extraversion', 'opt_q6_2', 2.0, 1.0), ('sr_q6_3', 'asm_big_five', 'q_bf_6', 'dim_extraversion', 'opt_q6_3', 3.0, 1.0), ('sr_q6_4', 'asm_big_five', 'q_bf_6', 'dim_extraversion', 'opt_q6_4', 4.0, 1.0), ('sr_q6_5', 'asm_big_five', 'q_bf_6', 'dim_extraversion', 'opt_q6_5', 5.0, 1.0),
('sr_q7_1', 'asm_big_five', 'q_bf_7', 'dim_agreeableness', 'opt_q7_1', 1.0, 1.0), ('sr_q7_2', 'asm_big_five', 'q_bf_7', 'dim_agreeableness', 'opt_q7_2', 2.0, 1.0), ('sr_q7_3', 'asm_big_five', 'q_bf_7', 'dim_agreeableness', 'opt_q7_3', 3.0, 1.0), ('sr_q7_4', 'asm_big_five', 'q_bf_7', 'dim_agreeableness', 'opt_q7_4', 4.0, 1.0), ('sr_q7_5', 'asm_big_five', 'q_bf_7', 'dim_agreeableness', 'opt_q7_5', 5.0, 1.0),
('sr_q8_1', 'asm_big_five', 'q_bf_8', 'dim_agreeableness', 'opt_q8_1', 1.0, 1.0), ('sr_q8_2', 'asm_big_five', 'q_bf_8', 'dim_agreeableness', 'opt_q8_2', 2.0, 1.0), ('sr_q8_3', 'asm_big_five', 'q_bf_8', 'dim_agreeableness', 'opt_q8_3', 3.0, 1.0), ('sr_q8_4', 'asm_big_five', 'q_bf_8', 'dim_agreeableness', 'opt_q8_4', 4.0, 1.0), ('sr_q8_5', 'asm_big_five', 'q_bf_8', 'dim_agreeableness', 'opt_q8_5', 5.0, 1.0),
('sr_q9_1', 'asm_big_five', 'q_bf_9', 'dim_neuroticism', 'opt_q9_1', 1.0, 1.0), ('sr_q9_2', 'asm_big_five', 'q_bf_9', 'dim_neuroticism', 'opt_q9_2', 2.0, 1.0), ('sr_q9_3', 'asm_big_five', 'q_bf_9', 'dim_neuroticism', 'opt_q9_3', 3.0, 1.0), ('sr_q9_4', 'asm_big_five', 'q_bf_9', 'dim_neuroticism', 'opt_q9_4', 4.0, 1.0), ('sr_q9_5', 'asm_big_five', 'q_bf_9', 'dim_neuroticism', 'opt_q9_5', 5.0, 1.0),
('sr_q10_1', 'asm_big_five', 'q_bf_10', 'dim_neuroticism', 'opt_q10_1', 1.0, 1.0), ('sr_q10_2', 'asm_big_five', 'q_bf_10', 'dim_neuroticism', 'opt_q10_2', 2.0, 1.0), ('sr_q10_3', 'asm_big_five', 'q_bf_10', 'dim_neuroticism', 'opt_q10_3', 3.0, 1.0), ('sr_q10_4', 'asm_big_five', 'q_bf_10', 'dim_neuroticism', 'opt_q10_4', 4.0, 1.0), ('sr_q10_5', 'asm_big_five', 'q_bf_10', 'dim_neuroticism', 'opt_q10_5', 5.0, 1.0);

-- Result Types for Big Five
INSERT OR IGNORE INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order) VALUES
('rt_openness_high', 'asm_big_five', 'dim_openness', 'High Openness', 'high-openness', 'Imaginative, intellectually adventurous, and eager to synthesize cross-disciplinary concepts.', 70.0, 100.0, 1),
('rt_openness_mod', 'asm_big_five', 'dim_openness', 'Moderate Openness', 'moderate-openness', 'Practical equilibrium between creative experimentation and proven conventional methods.', 30.0, 69.9, 2),
('rt_openness_low', 'asm_big_five', 'dim_openness', 'Ground-Focused Openness', 'low-openness', 'Direct, down-to-earth realism with strong respect for established processes.', 0.0, 29.9, 3);

INSERT OR IGNORE INTO result_contents (id, result_type_id, section_type, title, content, display_order) VALUES
('rc_high_open_1', 'rt_openness_high', 'overview', 'Comprehensive Cognitive Profile', 'You show an exceptional degree of intellectual curiosity and artistic or philosophical appreciation. You naturally question conventional constraints and generate innovative hypotheses.', 1),
('rc_high_open_2', 'rt_openness_high', 'strengths', 'Key Cognitive Strengths', '• Strong abstract reasoning and divergent ideation\n• Receptivity to novel cultural and intellectual perspectives\n• Agility in ambiguous, rapidly evolving problem spaces', 2),
('rc_high_open_3', 'rt_openness_high', 'growth_suggestions', 'Strategic Growth Suggestions', 'Pair your expansive conceptual brainstorms with systematic execution milestones to ensure ideas become concrete reality.', 3);


-- =========================================================================
-- 2. Attachment Style Test
-- =========================================================================
INSERT OR IGNORE INTO assessments (
    id, category_id, name, slug, short_description, long_description, instructions, estimated_minutes, question_count, access_type, status, featured, display_order, version, disclaimer, published_at
) VALUES (
    'asm_attachment', 'cat_relationships', 'Attachment Style Test', 'attachment-style-test',
    'Identify your relational bonding style: Secure, Anxious-Preoccupied, Dismissive-Avoidant, or Fearful-Avoidant.',
    'Based on adult attachment theory developed by John Bowlby and Mary Ainsworth, attachment styles reflect the subconscious emotional expectations and behavioral strategies we deploy in intimate relationships.',
    'Reflect on your general patterns across close romantic relationships and select the response that best describes your honest reactions.',
    8, 8, 'free', 'published', 1, 2, 1,
    'This assessment is an educational self-reflection tool, not a clinical relationship diagnosis or therapy substitute.',
    CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status) VALUES
('dim_att_secure', 'asm_attachment', 'Secure Attachment', 'secure', 'Comfort with emotional intimacy, vulnerability, and personal autonomy.', 1, 'active'),
('dim_att_anxious', 'asm_attachment', 'Anxious Attachment', 'anxious', 'Strong desire for closeness combined with worry regarding partner commitment.', 2, 'active'),
('dim_att_avoidant', 'asm_attachment', 'Avoidant Attachment', 'avoidant', 'Self-reliant emotional defense favoring interpersonal distance over deep intimacy.', 3, 'active'),
('dim_att_fearful', 'asm_attachment', 'Fearful-Avoidant', 'fearful', 'Simultaneous craving for close intimacy and acute fear of emotional vulnerability.', 4, 'active');

INSERT OR IGNORE INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status) VALUES
('q_att_1', 'asm_attachment', 'I find it relatively easy to express vulnerability and rely on my partner when needed.', 'likert', 1, 1, 'active'),
('q_att_2', 'asm_attachment', 'I feel comfortable with mutual emotional intimacy without fearing loss of personal autonomy.', 'likert', 2, 1, 'active'),
('q_att_3', 'asm_attachment', 'I frequently worry that my partner will lose romantic interest or abandon our relationship.', 'likert', 3, 1, 'active'),
('q_att_4', 'asm_attachment', 'When my partner is distant, I experience intense urgency to seek immediate reassurance.', 'likert', 4, 1, 'active'),
('q_att_5', 'asm_attachment', 'I am uncomfortable when relationships become overly emotionally close or dependent.', 'likert', 5, 1, 'active'),
('q_att_6', 'asm_attachment', 'I prefer resolving personal problems completely independently without emotional support.', 'likert', 6, 1, 'active'),
('q_att_7', 'asm_attachment', 'I deeply desire close connection but pull away when someone gets too close to me.', 'likert', 7, 1, 'active'),
('q_att_8', 'asm_attachment', 'I often experience conflicting emotions: wanting intense intimacy while anticipating hurt.', 'likert', 8, 1, 'active');

INSERT OR IGNORE INTO question_options (id, question_id, option_text, option_value, display_order, status) VALUES
('opt_at1_1', 'q_att_1', 'Strongly Disagree', '1', 1, 'active'), ('opt_at1_5', 'q_att_1', 'Strongly Agree', '5', 5, 'active'),
('opt_at2_1', 'q_att_2', 'Strongly Disagree', '1', 1, 'active'), ('opt_at2_5', 'q_att_2', 'Strongly Agree', '5', 5, 'active'),
('opt_at3_1', 'q_att_3', 'Strongly Disagree', '1', 1, 'active'), ('opt_at3_5', 'q_att_3', 'Strongly Agree', '5', 5, 'active'),
('opt_at4_1', 'q_att_4', 'Strongly Disagree', '1', 1, 'active'), ('opt_at4_5', 'q_att_4', 'Strongly Agree', '5', 5, 'active'),
('opt_at5_1', 'q_att_5', 'Strongly Disagree', '1', 1, 'active'), ('opt_at5_5', 'q_att_5', 'Strongly Agree', '5', 5, 'active'),
('opt_at6_1', 'q_att_6', 'Strongly Disagree', '1', 1, 'active'), ('opt_at6_5', 'q_att_6', 'Strongly Agree', '5', 5, 'active'),
('opt_at7_1', 'q_att_7', 'Strongly Disagree', '1', 1, 'active'), ('opt_at7_5', 'q_att_7', 'Strongly Agree', '5', 5, 'active'),
('opt_at8_1', 'q_att_8', 'Strongly Disagree', '1', 1, 'active'), ('opt_at8_5', 'q_att_8', 'Strongly Agree', '5', 5, 'active');

INSERT OR IGNORE INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight) VALUES
('sr_at_1', 'asm_attachment', 'q_att_1', 'dim_att_secure', 'opt_at1_5', 5.0, 1.0),
('sr_at_2', 'asm_attachment', 'q_att_2', 'dim_att_secure', 'opt_at2_5', 5.0, 1.0),
('sr_at_3', 'asm_attachment', 'q_att_3', 'dim_att_anxious', 'opt_at3_5', 5.0, 1.0),
('sr_at_4', 'asm_attachment', 'q_att_4', 'dim_att_anxious', 'opt_at4_5', 5.0, 1.0),
('sr_at_5', 'asm_attachment', 'q_att_5', 'dim_att_avoidant', 'opt_at5_5', 5.0, 1.0),
('sr_at_6', 'asm_attachment', 'q_att_6', 'dim_att_avoidant', 'opt_at6_5', 5.0, 1.0),
('sr_at_7', 'asm_attachment', 'q_att_7', 'dim_att_fearful', 'opt_at7_5', 5.0, 1.0),
('sr_at_8', 'asm_attachment', 'q_att_8', 'dim_att_fearful', 'opt_at8_5', 5.0, 1.0);

INSERT OR IGNORE INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order) VALUES
('rt_att_sec', 'asm_attachment', 'dim_att_secure', 'Secure Attachment Pattern', 'secure-attachment', 'Comfortable with mutual intimacy, transparent communication, and balanced autonomy.', 60.0, 100.0, 1),
('rt_att_anx', 'asm_attachment', 'dim_att_anxious', 'Anxious-Preoccupied Pattern', 'anxious-attachment', 'Deep emotional investment with heightened sensitivity to relationship reassurance.', 60.0, 100.0, 2),
('rt_att_avd', 'asm_attachment', 'dim_att_avoidant', 'Dismissive-Avoidant Pattern', 'avoidant-attachment', 'Prioritizes emotional self-sufficiency, often de-activating intimacy when vulnerable.', 60.0, 100.0, 3),
('rt_att_fea', 'asm_attachment', 'dim_att_fearful', 'Fearful-Avoidant (Disorganized) Pattern', 'fearful-avoidant', 'Navigates dual desires for profound intimacy alongside protective self-distancing.', 60.0, 100.0, 4);

INSERT OR IGNORE INTO result_contents (id, result_type_id, section_type, title, content, display_order) VALUES
('rc_att_1', 'rt_att_sec', 'overview', 'Relational Bonding Dynamic', 'You approach relationships with constructive trust and clear boundary communication. You navigate natural partner fluctuations without catastrophizing or withdrawing.', 1),
('rc_att_2', 'rt_att_sec', 'strengths', 'Interpersonal Strengths', '• Direct and calm conflict de-escalation\n• Supportive validation of partner autonomy\n• High emotional safety and resilience', 2);


-- =========================================================================
-- 3. Love Language Quiz
-- =========================================================================
INSERT OR IGNORE INTO assessments (
    id, category_id, name, slug, short_description, long_description, instructions, estimated_minutes, question_count, access_type, status, featured, display_order, version, disclaimer, published_at
) VALUES (
    'asm_love_language', 'cat_relationships', 'Love Language Quiz', 'love-language-quiz',
    'Uncover your primary communication pathways for giving and receiving love in intimate connections.',
    'Formulated around Dr. Gary Chapman’s five distinct emotional channels, this quiz illuminates the relational behaviors that make you feel genuinely cherished and valued.',
    'Select the degree to which each action resonates with your deepest emotional fulfillment.',
    7, 5, 'free', 'published', 1, 3, 1,
    'Love languages are dynamic communication preferences, not rigid psychological categorizations.',
    CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status) VALUES
('dim_ll_words', 'asm_love_language', 'Words of Affirmation', 'words-of-affirmation', 'Verbal compliments, words of appreciation, and encouraging notes.', 1, 'active'),
('dim_ll_time', 'asm_love_language', 'Quality Time', 'quality-time', 'Undivided attention, meaningful eye contact, and focused shared moments.', 2, 'active'),
('dim_ll_gifts', 'asm_love_language', 'Receiving Gifts', 'receiving-gifts', 'Visual symbols of thoughtfulness, care, and remembrance.', 3, 'active'),
('dim_ll_acts', 'asm_love_language', 'Acts of Service', 'acts-of-service', 'Helpful actions and practical easing of daily responsibilities.', 4, 'active'),
('dim_ll_touch', 'asm_love_language', 'Physical Touch', 'physical-touch', 'Warmth, hugs, holding hands, and comforting physical closeness.', 5, 'active');

INSERT OR IGNORE INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status) VALUES
('q_ll_1', 'asm_love_language', 'Hearing genuine, specific verbal praise and appreciation makes me feel deeply loved.', 'likert', 1, 1, 'active'),
('q_ll_2', 'asm_love_language', 'Having uninterrupted, focused one-on-one time without digital distractions means the most to me.', 'likert', 2, 1, 'active'),
('q_ll_3', 'asm_love_language', 'Receiving an unexpected, thoughtful gift demonstrates that my partner was thinking of me.', 'likert', 3, 1, 'active'),
('q_ll_4', 'asm_love_language', 'When my partner proactively assists me with demanding tasks, I feel deeply supported.', 'likert', 4, 1, 'active'),
('q_ll_5', 'asm_love_language', 'Physical affection—such as holding hands or warm embraces—is essential to my relational happiness.', 'likert', 5, 1, 'active');

INSERT OR IGNORE INTO question_options (id, question_id, option_text, option_value, display_order, status) VALUES
('opt_ll1_5', 'q_ll_1', 'Strongly Agree', '5', 5, 'active'),
('opt_ll2_5', 'q_ll_2', 'Strongly Agree', '5', 5, 'active'),
('opt_ll3_5', 'q_ll_3', 'Strongly Agree', '5', 5, 'active'),
('opt_ll4_5', 'q_ll_4', 'Strongly Agree', '5', 5, 'active'),
('opt_ll5_5', 'q_ll_5', 'Strongly Agree', '5', 5, 'active');

INSERT OR IGNORE INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight) VALUES
('sr_ll_1', 'asm_love_language', 'q_ll_1', 'dim_ll_words', 'opt_ll1_5', 5.0, 1.0),
('sr_ll_2', 'asm_love_language', 'q_ll_2', 'dim_ll_time', 'opt_ll2_5', 5.0, 1.0),
('sr_ll_3', 'asm_love_language', 'q_ll_3', 'dim_ll_gifts', 'opt_ll3_5', 5.0, 1.0),
('sr_ll_4', 'asm_love_language', 'q_ll_4', 'dim_ll_acts', 'opt_ll4_5', 5.0, 1.0),
('sr_ll_5', 'asm_love_language', 'q_ll_5', 'dim_ll_touch', 'opt_ll5_5', 5.0, 1.0);

INSERT OR IGNORE INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order) VALUES
('rt_ll_words', 'asm_love_language', 'dim_ll_words', 'Words of Affirmation Dominant', 'words-of-affirmation-dominant', 'You flourish when affection is articulated through genuine spoken praise and vocal appreciation.', 70.0, 100.0, 1),
('rt_ll_time', 'asm_love_language', 'dim_ll_time', 'Quality Time Dominant', 'quality-time-dominant', 'You bond most deeply through intentional, presence-filled shared experiences.', 70.0, 100.0, 2);

INSERT OR IGNORE INTO result_contents (id, result_type_id, section_type, title, content, display_order) VALUES
('rc_ll_1', 'rt_ll_words', 'overview', 'Affirming Communication Expression', 'Words carry tremendous emotional weight for you. An encouraging note or unprompted "thank you" fills your emotional reservoir.', 1);


-- =========================================================================
-- 4. Emotional Intelligence (EQ) Test
-- =========================================================================
INSERT OR IGNORE INTO assessments (
    id, category_id, name, slug, short_description, long_description, instructions, estimated_minutes, question_count, access_type, status, featured, display_order, version, disclaimer, published_at
) VALUES (
    'asm_eq', 'cat_eq', 'Emotional Intelligence Test', 'emotional-intelligence-test',
    'Assess your capacity for emotional self-awareness, impulse regulation, empathy, and interpersonal social agility.',
    'Based on Daniel Goleman’s seminal framework, Emotional Quotient (EQ) reflects your ability to recognize emotional states in yourself and others and navigate complex social dynamics constructively.',
    'Reflect on how you handle emotional tension in workplace and personal settings.',
    8, 5, 'free', 'published', 1, 4, 1,
    'This evaluation measures self-reported emotional agility for educational enhancement, not psychiatric diagnostic capacity.',
    CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status) VALUES
('dim_eq_aware', 'asm_eq', 'Self-Awareness', 'self-awareness', 'Recognizing internal moods, emotional triggers, and their psychological impact.', 1, 'active'),
('dim_eq_reg', 'asm_eq', 'Self-Regulation', 'self-regulation', 'Managing disruptive impulses and maintaining composure under acute stress.', 2, 'active'),
('dim_eq_mot', 'asm_eq', 'Internal Motivation', 'motivation', 'Pursuing intrinsic goals with persistent optimism and grit.', 3, 'active'),
('dim_eq_emp', 'asm_eq', 'Empathy', 'empathy', 'Intuiting other perspectives and sensing unspoken interpersonal emotions.', 4, 'active'),
('dim_eq_soc', 'asm_eq', 'Social Skills', 'social-skills', 'Building rapport, navigating conflict, and inspiring collaborative momentum.', 5, 'active');

INSERT OR IGNORE INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status) VALUES
('q_eq_1', 'asm_eq', 'I can immediately identify the underlying cause when my mood or stress levels shift.', 'likert', 1, 1, 'active'),
('q_eq_2', 'asm_eq', 'I control impulsive emotional reactions and pause before responding in tense situations.', 'likert', 2, 1, 'active'),
('q_eq_3', 'asm_eq', 'I remain motivated toward long-term ambitions even after experiencing frustrating setbacks.', 'likert', 3, 1, 'active'),
('q_eq_4', 'asm_eq', 'I easily pick up on subtle emotional shifts in conversations before someone speaks them.', 'likert', 4, 1, 'active'),
('q_eq_5', 'asm_eq', 'I effectively defuse conflict between peers and facilitate constructive agreement.', 'likert', 5, 1, 'active');

INSERT OR IGNORE INTO question_options (id, question_id, option_text, option_value, display_order, status) VALUES
('opt_eq1_5', 'q_eq_1', 'Strongly Agree', '5', 5, 'active'),
('opt_eq2_5', 'q_eq_2', 'Strongly Agree', '5', 5, 'active'),
('opt_eq3_5', 'q_eq_3', 'Strongly Agree', '5', 5, 'active'),
('opt_eq4_5', 'q_eq_4', 'Strongly Agree', '5', 5, 'active'),
('opt_eq5_5', 'q_eq_5', 'Strongly Agree', '5', 5, 'active');

INSERT OR IGNORE INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight) VALUES
('sr_eq_1', 'asm_eq', 'q_eq_1', 'dim_eq_aware', 'opt_eq1_5', 5.0, 1.0),
('sr_eq_2', 'asm_eq', 'q_eq_2', 'dim_eq_reg', 'opt_eq2_5', 5.0, 1.0),
('sr_eq_3', 'asm_eq', 'q_eq_3', 'dim_eq_mot', 'opt_eq3_5', 5.0, 1.0),
('sr_eq_4', 'asm_eq', 'q_eq_4', 'dim_eq_emp', 'opt_eq4_5', 5.0, 1.0),
('sr_eq_5', 'asm_eq', 'q_eq_5', 'dim_eq_soc', 'opt_eq5_5', 5.0, 1.0);

INSERT OR IGNORE INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order) VALUES
('rt_eq_high', 'asm_eq', 'dim_eq_aware', 'High Emotional Intelligence (Emotionally Agile)', 'high-eq', 'You possess advanced emotional self-awareness, strong composure, and nuanced empathy.', 75.0, 100.0, 1),
('rt_eq_mod', 'asm_eq', 'dim_eq_aware', 'Moderate Emotional Quotient', 'moderate-eq', 'Grounded emotional awareness with opportunities to expand impulse self-regulation.', 40.0, 74.9, 2);

INSERT OR IGNORE INTO result_contents (id, result_type_id, section_type, title, content, display_order) VALUES
('rc_eq_1', 'rt_eq_high', 'overview', 'Emotional Mastery & Interpersonal Agility', 'Your high EQ enables you to remain centered during adversity while understanding the psychological needs of collaborators.', 1);


-- =========================================================================
-- 5. Introvert vs Extrovert Test
-- =========================================================================
INSERT OR IGNORE INTO assessments (
    id, category_id, name, slug, short_description, long_description, instructions, estimated_minutes, question_count, access_type, status, featured, display_order, version, disclaimer, published_at
) VALUES (
    'asm_intro_extro', 'cat_personality', 'Introvert vs Extrovert Test', 'introvert-extrovert-test',
    'Map your social energy recharge spectrum: Introvert, Ambivert, or Extrovert.',
    'Rooted in Carl Jung’s psychological types, introversion and extroversion describe where you orient your cognitive attention and how your nervous system replenishes mental energy.',
    'Rate your natural preferences when you are unrestricted by obligatory professional expectations.',
    6, 4, 'free', 'published', 0, 5, 1,
    'Social orientation is a flexible spectrum influenced by environmental context and personal energy levels.',
    CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status) VALUES
('dim_ie_intro', 'asm_intro_extro', 'Introversion Orientation', 'introversion', 'Recharging energy through solitude, reflective introspection, and low-stimulation environments.', 1, 'active'),
('dim_ie_extro', 'asm_intro_extro', 'Extroversion Orientation', 'extroversion', 'Recharging energy through active social engagement, collaborative dialogue, and novel stimuli.', 2, 'active');

INSERT OR IGNORE INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status) VALUES
('q_ie_1', 'asm_intro_extro', 'After a hectic week, I restore my mental energy through peaceful solo activities rather than parties.', 'likert', 1, 1, 'active'),
('q_ie_2', 'asm_intro_extro', 'I prefer deep one-on-one dialogues over large networking events with rapid small talk.', 'likert', 2, 1, 'active'),
('q_ie_3', 'asm_intro_extro', 'Being around vibrant groups of people invigorates me and sparks my creativity.', 'likert', 3, 1, 'active'),
('q_ie_4', 'asm_intro_extro', 'I tend to think out loud and process concepts best through interactive conversation.', 'likert', 4, 1, 'active');

INSERT OR IGNORE INTO question_options (id, question_id, option_text, option_value, display_order, status) VALUES
('opt_ie1_5', 'q_ie_1', 'Strongly Agree', '5', 5, 'active'),
('opt_ie2_5', 'q_ie_2', 'Strongly Agree', '5', 5, 'active'),
('opt_ie3_5', 'q_ie_3', 'Strongly Agree', '5', 5, 'active'),
('opt_ie4_5', 'q_ie_4', 'Strongly Agree', '5', 5, 'active');

INSERT OR IGNORE INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight) VALUES
('sr_ie_1', 'asm_intro_extro', 'q_ie_1', 'dim_ie_intro', 'opt_ie1_5', 5.0, 1.0),
('sr_ie_2', 'asm_intro_extro', 'q_ie_2', 'dim_ie_intro', 'opt_ie2_5', 5.0, 1.0),
('sr_ie_3', 'asm_intro_extro', 'q_ie_3', 'dim_ie_extro', 'opt_ie3_5', 5.0, 1.0),
('sr_ie_4', 'asm_intro_extro', 'q_ie_4', 'dim_ie_extro', 'opt_ie4_5', 5.0, 1.0);

INSERT OR IGNORE INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order) VALUES
('rt_ie_intro', 'asm_intro_extro', 'dim_ie_intro', 'Introverted Spectrum', 'introverted-profile', 'You thrive in focused, low-distraction spaces and recharge through deliberate solitude.', 60.0, 100.0, 1),
('rt_ie_ambi', 'asm_intro_extro', 'dim_ie_intro', 'Ambivert (Adaptive Balance)', 'ambivert-profile', 'You demonstrate situational agility, moving smoothly between collaborative engagement and quiet reflection.', 30.0, 59.9, 2);

INSERT OR IGNORE INTO result_contents (id, result_type_id, section_type, title, content, display_order) VALUES
('rc_ie_1', 'rt_ie_intro', 'overview', 'Reflective Cognitive Orientation', 'You possess strong listening skills, deliberate focus, and a rich inner life. You contribute profound clarity to teams.', 1);


-- =========================================================================
-- 6. Self-Esteem Test
-- =========================================================================
INSERT OR IGNORE INTO assessments (
    id, category_id, name, slug, short_description, long_description, instructions, estimated_minutes, question_count, access_type, status, featured, display_order, version, disclaimer, published_at
) VALUES (
    'asm_self_esteem', 'cat_self_dev', 'Self-Esteem Test', 'self-esteem-test',
    'Evaluate your foundational sense of self-worth, unconditional self-acceptance, and psychological self-efficacy.',
    'Inspired by Morris Rosenberg’s classic self-esteem scale, this assessment screens your intrinsic feelings of worthiness, competence, and positive self-regard without clinical labeling.',
    'Select how accurately each statement reflects your core inner attitude toward yourself.',
    6, 4, 'free', 'published', 0, 6, 1,
    'This screening tool provides educational insights into personal self-regard and does not diagnose depressive or psychological disorders.',
    CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status) VALUES
('dim_se_worth', 'asm_self_esteem', 'Self-Worth & Acceptance', 'self-worth', 'Intrinsic valuation of your character regardless of external performance.', 1, 'active'),
('dim_se_eff', 'asm_self_esteem', 'Self-Efficacy & Confidence', 'self-efficacy', 'Confidence in your capacity to master challenges and achieve desired outcomes.', 2, 'active');

INSERT OR IGNORE INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status) VALUES
('q_se_1', 'asm_self_esteem', 'On the whole, I feel that I have a number of good qualities and deserve happiness.', 'likert', 1, 1, 'active'),
('q_se_2', 'asm_self_esteem', 'I am able to accept my mistakes without harshly judging my entire self-worth.', 'likert', 2, 1, 'active'),
('q_se_3', 'asm_self_esteem', 'I feel confident in my ability to learn new skills and navigate unfamiliar challenges.', 'likert', 3, 1, 'active'),
('q_se_4', 'asm_self_esteem', 'I frequently feel like a disappointment compared to the peers around me.', 'likert', 4, 1, 'active');

INSERT OR IGNORE INTO question_options (id, question_id, option_text, option_value, display_order, status) VALUES
('opt_se1_5', 'q_se_1', 'Strongly Agree', '5', 5, 'active'),
('opt_se2_5', 'q_se_2', 'Strongly Agree', '5', 5, 'active'),
('opt_se3_5', 'q_se_3', 'Strongly Agree', '5', 5, 'active'),
('opt_se4_1', 'q_se_4', 'Strongly Disagree', '1', 1, 'active');

INSERT OR IGNORE INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight, reverse_scoring) VALUES
('sr_se_1', 'asm_self_esteem', 'q_se_1', 'dim_se_worth', 'opt_se1_5', 5.0, 1.0, 0),
('sr_se_2', 'asm_self_esteem', 'q_se_2', 'dim_se_worth', 'opt_se2_5', 5.0, 1.0, 0),
('sr_se_3', 'asm_self_esteem', 'q_se_3', 'dim_se_eff', 'opt_se3_5', 5.0, 1.0, 0),
('sr_se_4', 'asm_self_esteem', 'q_se_4', 'dim_se_worth', 'opt_se4_1', 5.0, 1.0, 1);

INSERT OR IGNORE INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order) VALUES
('rt_se_high', 'asm_self_esteem', 'dim_se_worth', 'High & Grounded Self-Esteem', 'grounded-self-esteem', 'Healthy, resilient self-regard anchored in intrinsic acceptance rather than fragile comparison.', 70.0, 100.0, 1),
('rt_se_mod', 'asm_self_esteem', 'dim_se_worth', 'Healthy Moderate Self-Esteem', 'moderate-self-esteem', 'Generally positive self-regard with occasional vulnerability to external criticism.', 40.0, 69.9, 2);

INSERT OR IGNORE INTO result_contents (id, result_type_id, section_type, title, content, display_order) VALUES
('rc_se_1', 'rt_se_high', 'overview', 'Self-Esteem Foundations', 'You maintain a sturdy psychological baseline that allows you to pursue bold goals and recover quickly from setbacks.', 1);


-- =========================================================================
-- 7. Communication Style Test
-- =========================================================================
INSERT OR IGNORE INTO assessments (
    id, category_id, name, slug, short_description, long_description, instructions, estimated_minutes, question_count, access_type, status, featured, display_order, version, disclaimer, published_at
) VALUES (
    'asm_communication', 'cat_communication', 'Communication Style Test', 'communication-style-test',
    'Identify your conversational approach: Assertive, Passive, Aggressive, or Passive-Aggressive.',
    'Communication styles determine how clearly you state boundaries, advocate for personal needs, and listen to the perspectives of colleagues and loved ones.',
    'Consider how you typically express differing viewpoints in high-stakes conversations.',
    7, 4, 'free', 'published', 0, 7, 1,
    'Communication styles are learned behavioral habits that can be consciously refined and improved over time.',
    CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status) VALUES
('dim_cs_assert', 'asm_communication', 'Assertive Communication', 'assertive', 'Direct, respectful advocacy of needs while honoring the rights of others.', 1, 'active'),
('dim_cs_pass', 'asm_communication', 'Passive Communication', 'passive', 'Suppressing personal preferences to avoid confrontation or displeasing others.', 2, 'active'),
('dim_cs_aggr', 'asm_communication', 'Aggressive Communication', 'aggressive', 'Demanding compliance through domination, interruption, or blunt force.', 3, 'active'),
('dim_cs_pass_aggr', 'asm_communication', 'Passive-Aggressive Pattern', 'passive-aggressive', 'Expressing indirect frustration through subtle sarcasm, procrastination, or sullenness.', 4, 'active');

INSERT OR IGNORE INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status) VALUES
('q_cs_1', 'asm_communication', 'I express my boundaries and disagreements honestly and calmly without hostility.', 'likert', 1, 1, 'active'),
('q_cs_2', 'asm_communication', 'I often remain silent when my boundaries are crossed just to keep the peace.', 'likert', 2, 1, 'active'),
('q_cs_3', 'asm_communication', 'When discussions escalate, I focus on winning the argument rather than finding common ground.', 'likert', 3, 1, 'active'),
('q_cs_4', 'asm_communication', 'If I am frustrated with someone, I tend to use indirect sarcasm rather than direct discussion.', 'likert', 4, 1, 'active');

INSERT OR IGNORE INTO question_options (id, question_id, option_text, option_value, display_order, status) VALUES
('opt_cs1_5', 'q_cs_1', 'Strongly Agree', '5', 5, 'active'),
('opt_cs2_5', 'q_cs_2', 'Strongly Agree', '5', 5, 'active'),
('opt_cs3_5', 'q_cs_3', 'Strongly Agree', '5', 5, 'active'),
('opt_cs4_5', 'q_cs_4', 'Strongly Agree', '5', 5, 'active');

INSERT OR IGNORE INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight) VALUES
('sr_cs_1', 'asm_communication', 'q_cs_1', 'dim_cs_assert', 'opt_cs1_5', 5.0, 1.0),
('sr_cs_2', 'asm_communication', 'q_cs_2', 'dim_cs_pass', 'opt_cs2_5', 5.0, 1.0),
('sr_cs_3', 'asm_communication', 'q_cs_3', 'dim_cs_aggr', 'opt_cs3_5', 5.0, 1.0),
('sr_cs_4', 'asm_communication', 'q_cs_4', 'dim_cs_pass_aggr', 'opt_cs4_5', 5.0, 1.0);

INSERT OR IGNORE INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order) VALUES
('rt_cs_assert', 'asm_communication', 'dim_cs_assert', 'Assertive Communication Style', 'assertive-style', 'You speak clearly, state needs with confidence, and listen attentively to divergent viewpoints.', 60.0, 100.0, 1);

INSERT OR IGNORE INTO result_contents (id, result_type_id, section_type, title, content, display_order) VALUES
('rc_cs_1', 'rt_cs_assert', 'overview', 'Constructive Dialogue Dynamic', 'Assertive communicators establish psychological safety while ensuring mutual clarity and accountability.', 1);


-- =========================================================================
-- 8. Conflict Style Test (Thomas-Kilmann Model)
-- =========================================================================
INSERT OR IGNORE INTO assessments (
    id, category_id, name, slug, short_description, long_description, instructions, estimated_minutes, question_count, access_type, status, featured, display_order, version, disclaimer, published_at
) VALUES (
    'asm_conflict', 'cat_communication', 'Conflict Style Test', 'conflict-style-test',
    'Map your negotiation and conflict resolution tendencies: Collaborating, Compromising, Accommodating, Competing, or Avoiding.',
    'Based on the Thomas-Kilmann Conflict Mode Instrument (TKI), this assessment illustrates how you balance assertiveness (focus on own goals) and cooperativeness (focus on relationships) during disputes.',
    'Think about how you respond when your interests directly clash with a peer or partner.',
    8, 5, 'free', 'published', 0, 8, 1,
    'All five conflict modes are useful in specific contexts; none is inherently superior in every situation.',
    CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO assessment_dimensions (id, assessment_id, name, slug, description, display_order, status) VALUES
('dim_cf_collab', 'asm_conflict', 'Collaborating (Win-Win)', 'collaborating', 'Exploring disagreements in depth to forge an innovative solution satisfying all parties.', 1, 'active'),
('dim_cf_comp', 'asm_conflict', 'Compromising (Give & Take)', 'compromising', 'Seeking an expedient, mutually acceptable middle ground where everyone concedes something.', 2, 'active'),
('dim_cf_accom', 'asm_conflict', 'Accommodating (Harmony First)', 'accommodating', 'Yielding to others preferences to preserve interpersonal harmony.', 3, 'active'),
('dim_cf_compete', 'asm_conflict', 'Competing (Direct Assertion)', 'competing', 'Pursuing your own objectives firmly using all available positional authority.', 4, 'active'),
('dim_cf_avoid', 'asm_conflict', 'Avoiding (De-escalation)', 'avoiding', 'Sidestepping conflicts, delaying discussions, or withdrawing from disputes.', 5, 'active');

INSERT OR IGNORE INTO assessment_questions (id, assessment_id, question_text, question_type, display_order, required, status) VALUES
('q_cf_1', 'asm_conflict', 'I invest time understanding all underlying concerns to create a comprehensive win-win resolution.', 'likert', 1, 1, 'active'),
('q_cf_2', 'asm_conflict', 'I propose splitting the difference quickly so both sides gain something and can move forward.', 'likert', 2, 1, 'active'),
('q_cf_3', 'asm_conflict', 'I am willing to set aside my own preference if it preserves a valuable relationship.', 'likert', 3, 1, 'active'),
('q_cf_4', 'asm_conflict', 'When crucial principles are at stake, I stand firm and defend my position vigorously.', 'likert', 4, 1, 'active'),
('q_cf_5', 'asm_conflict', 'I prefer avoiding immediate confrontation until emotional tempers have cooled down.', 'likert', 5, 1, 'active');

INSERT OR IGNORE INTO question_options (id, question_id, option_text, option_value, display_order, status) VALUES
('opt_cf1_5', 'q_cf_1', 'Strongly Agree', '5', 5, 'active'),
('opt_cf2_5', 'q_cf_2', 'Strongly Agree', '5', 5, 'active'),
('opt_cf3_5', 'q_cf_3', 'Strongly Agree', '5', 5, 'active'),
('opt_cf4_5', 'q_cf_4', 'Strongly Agree', '5', 5, 'active'),
('opt_cf5_5', 'q_cf_5', 'Strongly Agree', '5', 5, 'active');

INSERT OR IGNORE INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight) VALUES
('sr_cf_1', 'asm_conflict', 'q_cf_1', 'dim_cf_collab', 'opt_cf1_5', 5.0, 1.0),
('sr_cf_2', 'asm_conflict', 'q_cf_2', 'dim_cf_comp', 'opt_cf2_5', 5.0, 1.0),
('sr_cf_3', 'asm_conflict', 'q_cf_3', 'dim_cf_accom', 'opt_cf3_5', 5.0, 1.0),
('sr_cf_4', 'asm_conflict', 'q_cf_4', 'dim_cf_compete', 'opt_cf4_5', 5.0, 1.0),
('sr_cf_5', 'asm_conflict', 'q_cf_5', 'dim_cf_avoid', 'opt_cf5_5', 5.0, 1.0);

INSERT OR IGNORE INTO result_types (id, assessment_id, dimension_id, name, slug, description, minimum_score, maximum_score, display_order) VALUES
('rt_cf_collab', 'asm_conflict', 'dim_cf_collab', 'Collaborating Conflict Style', 'collaborating-style', 'High assertiveness and high cooperativeness: finding integrative synergy.', 70.0, 100.0, 1);

INSERT OR IGNORE INTO result_contents (id, result_type_id, section_type, title, content, display_order) VALUES
('rc_cf_1', 'rt_cf_collab', 'overview', 'Collaborative Problem-Solving', 'You treat conflict as an opportunity to deepen mutual understanding and uncover creative solutions.', 1);
