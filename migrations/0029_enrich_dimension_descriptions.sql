-- Migration 0029: Enrich Psychological Assessment Dimension Descriptions

UPDATE assessment_dimensions SET description = 'Explores intellectual curiosity, creative imagination, openness to novel ideas, and aesthetic sensitivity.' WHERE name IN ('Openness', 'Openness to Experience');
UPDATE assessment_dimensions SET description = 'Measures deliberate goal-directed execution, self-discipline, organization, and methodical reliability.' WHERE name = 'Conscientiousness';
UPDATE assessment_dimensions SET description = 'Assesses energy derived from social interactions, assertiveness, enthusiasm, and outward engagement.' WHERE name = 'Extraversion';
UPDATE assessment_dimensions SET description = 'Evaluates empathy, prosocial cooperativeness, interpersonal trust, and compassionate communication.' WHERE name = 'Agreeableness';
UPDATE assessment_dimensions SET description = 'Reflects emotional resilience under acute pressure, calmness, and balanced nervous system regulation.' WHERE name IN ('Neuroticism', 'Emotional Stability');

UPDATE assessment_dimensions SET description = 'Measures how often irritation, frustration, or impatience tends to arise in everyday situations.' WHERE name = 'Anger Frequency';
UPDATE assessment_dimensions SET description = 'Evaluates the visceral strength, physical arousal, and emotional magnitude of anger when experienced.' WHERE name = 'Anger Intensity';
UPDATE assessment_dimensions SET description = 'Assesses how long emotional tension or resentment tends to linger after an upsetting encounter.' WHERE name = 'Anger Duration';
UPDATE assessment_dimensions SET description = 'Examines outward communication habits, verbal reactivity, and visible displays of anger.' WHERE name = 'Anger Expression';
UPDATE assessment_dimensions SET description = 'Measures the intentional ability to pause, calm thoughts, and choose constructive responses.' WHERE name = 'Anger Regulation';

UPDATE assessment_dimensions SET description = 'Measures the richness of your inner mental world, daydreaming, and creative mental simulations.' WHERE name = 'Imagination';
UPDATE assessment_dimensions SET description = 'Evaluates sensitivity to art, natural beauty, music, poetry, and evocative aesthetic experiences.' WHERE name = 'Aesthetic Appreciation';
UPDATE assessment_dimensions SET description = 'Assesses how clearly you perceive, distinguish, and acknowledge complex internal emotional states.' WHERE name = 'Emotional Awareness';
UPDATE assessment_dimensions SET description = 'Measures willingness to explore unfamiliar environments, try new activities, and break repetitive routines.' WHERE name = 'Adventurousness';
UPDATE assessment_dimensions SET description = 'Evaluates appetite for deep conceptual thinking, philosophical debate, and novel problem solving.' WHERE name = 'Intellectual Curiosity';
