-- Migration 0038: Full Multilingual / Internationalization (i18n) Architecture
-- PsychologyCalculator.com
-- Cloudflare D1 (SQLite)

-- 1. Languages Registry Table
CREATE TABLE IF NOT EXISTS languages (
    code TEXT PRIMARY KEY, -- 'en', 'es', 'fr', 'de', 'pt', 'hi', etc.
    name TEXT NOT NULL, -- 'English', 'Spanish', 'French', etc.
    native_name TEXT NOT NULL, -- 'English', 'Español', 'Français', 'Deutsch', 'Português', 'हिन्दी'
    is_default INTEGER NOT NULL DEFAULT 0, -- 1 = true (only 'en' by default)
    is_active INTEGER NOT NULL DEFAULT 1, -- 1 = enabled, 0 = disabled
    display_order INTEGER NOT NULL DEFAULT 0,
    rtl INTEGER NOT NULL DEFAULT 0, -- 0 = ltr, 1 = rtl
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_languages_active_order ON languages(is_active, display_order);

-- Seed Initial Core Languages
INSERT INTO languages (code, name, native_name, is_default, is_active, display_order, rtl)
VALUES 
    ('en', 'English', 'English', 1, 1, 1, 0),
    ('es', 'Spanish', 'Español', 0, 1, 2, 0),
    ('fr', 'French', 'Français', 0, 1, 3, 0),
    ('de', 'German', 'Deutsch', 0, 1, 4, 0),
    ('pt', 'Portuguese', 'Português', 0, 1, 5, 0),
    ('hi', 'Hindi', 'हिन्दी', 0, 1, 6, 0)
ON CONFLICT(code) DO UPDATE SET
    name = excluded.name,
    native_name = excluded.native_name,
    is_active = excluded.is_active,
    display_order = excluded.display_order,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Assessment Category Translations
CREATE TABLE IF NOT EXISTS assessment_category_translations (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES assessment_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (locale) REFERENCES languages(code) ON DELETE CASCADE,
    UNIQUE(category_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_cat_trans_lookup ON assessment_category_translations(category_id, locale);

-- 3. Assessment Translations
CREATE TABLE IF NOT EXISTS assessment_translations (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT,
    instructions TEXT,
    disclaimer TEXT,
    seo_title TEXT,
    seo_description TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'review')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (locale) REFERENCES languages(code) ON DELETE CASCADE,
    UNIQUE(assessment_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_asm_trans_lookup ON assessment_translations(assessment_id, locale);

-- 4. Assessment Dimension Translations
CREATE TABLE IF NOT EXISTS assessment_dimension_translations (
    id TEXT PRIMARY KEY,
    dimension_id TEXT NOT NULL,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dimension_id) REFERENCES assessment_dimensions(id) ON DELETE CASCADE,
    FOREIGN KEY (locale) REFERENCES languages(code) ON DELETE CASCADE,
    UNIQUE(dimension_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_dim_trans_lookup ON assessment_dimension_translations(dimension_id, locale);

-- 5. Assessment Question Translations
CREATE TABLE IF NOT EXISTS assessment_question_translations (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    locale TEXT NOT NULL,
    question_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (locale) REFERENCES languages(code) ON DELETE CASCADE,
    UNIQUE(question_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_quest_trans_lookup ON assessment_question_translations(question_id, locale);

-- 6. Question Option Translations
CREATE TABLE IF NOT EXISTS question_option_translations (
    id TEXT PRIMARY KEY,
    option_id TEXT NOT NULL,
    locale TEXT NOT NULL,
    option_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (option_id) REFERENCES question_options(id) ON DELETE CASCADE,
    FOREIGN KEY (locale) REFERENCES languages(code) ON DELETE CASCADE,
    UNIQUE(option_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_opt_trans_lookup ON question_option_translations(option_id, locale);

-- 7. Result Type Translations
CREATE TABLE IF NOT EXISTS result_type_translations (
    id TEXT PRIMARY KEY,
    result_type_id TEXT NOT NULL,
    locale TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (result_type_id) REFERENCES result_types(id) ON DELETE CASCADE,
    FOREIGN KEY (locale) REFERENCES languages(code) ON DELETE CASCADE,
    UNIQUE(result_type_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_res_type_trans_lookup ON result_type_translations(result_type_id, locale);

-- 8. Result Content Translations
CREATE TABLE IF NOT EXISTS result_content_translations (
    id TEXT PRIMARY KEY,
    result_content_id TEXT NOT NULL,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (result_content_id) REFERENCES result_contents(id) ON DELETE CASCADE,
    FOREIGN KEY (locale) REFERENCES languages(code) ON DELETE CASCADE,
    UNIQUE(result_content_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_res_content_trans_lookup ON result_content_translations(result_content_id, locale);

-- 9. Email Template Translations
CREATE TABLE IF NOT EXISTS email_template_translations (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    locale TEXT NOT NULL,
    subject TEXT NOT NULL,
    headline TEXT NOT NULL,
    body_paragraphs TEXT NOT NULL, -- JSON array of strings
    button_text TEXT,
    footer_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (locale) REFERENCES languages(code) ON DELETE CASCADE,
    UNIQUE(template_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_email_trans_lookup ON email_template_translations(template_id, locale);

-- 10. Add report_locale column to ai_reports and attempts if not present
-- Note: SQLite allows adding columns safely
ALTER TABLE ai_reports ADD COLUMN report_locale TEXT DEFAULT 'en';
ALTER TABLE assessment_attempts ADD COLUMN locale TEXT DEFAULT 'en';

-- =========================================================================
-- SEED INITIAL LOCALIZED CONTENT FOR CATEGORIES AND POPULAR ASSESSMENTS
-- =========================================================================

-- Seed Category Translations for Spanish, French, German, Portuguese, Hindi
INSERT INTO assessment_category_translations (id, category_id, locale, name, description, seo_title, seo_description)
VALUES
    -- Personality
    ('trans_cat_pers_es', 'cat_personality', 'es', 'Test de Personalidad', 'Explora rasgos de personalidad, patrones de conducta y fortalezas de carácter mediante evaluaciones validadas.', 'Test de Personalidad y Evaluaciones Científicas', 'Descubre test de personalidad basados en el modelo Big Five (OCEAN), estilos conductuales y psicología científica.'),
    ('trans_cat_pers_fr', 'cat_personality', 'fr', 'Tests de Personnalité', 'Explorez vos traits de personnalité, vos schémas comportementaux et vos forces de caractère grâce à des évaluations validées.', 'Tests de Personnalité et Évaluations Psychométriques', 'Découvrez des tests de personnalité validés basés sur le modèle Big Five (OCEAN), les styles comportementaux et la psychologie.'),
    ('trans_cat_pers_de', 'cat_personality', 'de', 'Persönlichkeitstests', 'Erkunden Sie Persönlichkeitsmerkmale, Verhaltensmuster und Charakterstärken durch wissenschaftlich fundierte Selbsttests.', 'Persönlichkeitstests & Psychometrische Analysen', 'Wissenschaftlich fundierte Persönlichkeitstests basierend auf dem Big Five (OCEAN) Modell und psychologischer Forschung.'),
    ('trans_cat_pers_pt', 'cat_personality', 'pt', 'Testes de Personalidade', 'Explore traços de personalidade, padrões comportamentais e forças de caráter através de autoavaliações validadas.', 'Testes de Personalidade e Avaliações Psicométricas', 'Descubra testes de personalidade baseados no modelo Big Five (OCEAN), estilos comportamentais e psicologia científica.'),
    ('trans_cat_pers_hi', 'cat_personality', 'hi', 'व्यक्तित्व परीक्षण', 'प्रमाणित आत्म-मूल्यांकन के माध्यम से व्यक्तित्व लक्षणों, व्यवहार पैटर्न और चरित्र शक्तियों का अन्वेषण करें।', 'व्यक्तित्व परीक्षण एवं मनोवैज्ञानिक मूल्यांकन', 'बिग फाइव (OCEAN) मॉडल और वैज्ञानिक सिद्धांतों पर आधारित व्यक्तित्व परीक्षण।'),

    -- Relationships
    ('trans_cat_rel_es', 'cat_relationships', 'es', 'Relaciones y Apego', 'Analiza tus patrones de vinculación afectiva, estilos de apego adulto y dinámicas en tus relaciones personales.', 'Test de Estilos de Apego y Compatibilidad de Pareja', 'Evalúa tu estilo de apego seguro, ansioso o evitativo y fortalece tus relaciones afectivas.'),
    ('trans_cat_rel_fr', 'cat_relationships', 'fr', 'Relations et Attachement', 'Analysez vos schémas d''attachement adulte, votre dynamique relationnelle et votre style de communication en couple.', 'Tests de Styles d''Attachement et Dynamique de Couple', 'Évaluez votre style d''attachement sécure, anxieux ou évitant pour mieux comprendre vos relations.'),
    ('trans_cat_rel_de', 'cat_relationships', 'de', 'Beziehungen & Bindung', 'Analysieren Sie Ihre Bindungsstile, partnerschaftliche Dynamiken und Beziehungsverhalten für tiefere Verbindungen.', 'Bindungsstil-Tests & Beziehungspsychologie', 'Erkennen Sie sichere, ängstliche oder vermeidende Bindungsmuster und verbessern Sie Ihre Partnerschaft.'),
    ('trans_cat_rel_pt', 'cat_relationships', 'pt', 'Relacionamentos e Apego', 'Analise seus padrões de apego adulto, dinâmicas de casal e estilos de vinculação para relacionamentos mais saudáveis.', 'Testes de Estilo de Apego e Psicologia dos Relacionamentos', 'Avalie seu estilo de apego seguro, ansioso ou evitativo e fortaleça seus vínculos afetivos.'),
    ('trans_cat_rel_hi', 'cat_relationships', 'hi', 'संबंध और लगाव शैली', 'अपने लगाव के पैटर्न, साथी के साथ संबंधों की गतिशीलता और संचार शैलियों का वैज्ञानिक विश्लेषण करें।', 'अटैचमेंट स्टाइल एवं संबंध मनोविज्ञान परीक्षण', 'सुरक्षित, चिंतित या परिहार लगाव शैलियों को समझें और अपने व्यक्तिगत संबंधों को मजबूत बनाएं।')
ON CONFLICT(category_id, locale) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    updated_at = CURRENT_TIMESTAMP;

-- Seed Assessment Translations for Big Five Personality Test
INSERT INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status)
VALUES
    ('trans_asm_b5_es', 'asm_big_five', 'es', 'Test de Personalidad Big Five (OCEAN)', 'Evalúa tus cinco grandes dimensiones de personalidad: Apertura, Responsabilidad, Extraversión, Amabilidad y Neuroticismo.', 'El modelo de los Cinco Grandes (Big Five o modelo OCEAN) es el marco científico de referencia en la psicología contemporánea para evaluar los rasgos estables de la personalidad humana.', 'Responde a cada una de las afirmaciones con sinceridad según tu comportamiento habitual. No hay respuestas correctas ni incorrectas.', 'Esta evaluación se proporciona exclusivamente con fines educativos y de autorreflexión. No constituye un diagnóstico clínico.', 'Test de Personalidad Big Five Gratis Online | PsychologyCalculator.com', 'Realiza el test científico de los Cinco Grandes (OCEAN) en español. Evaluación psicométrica gratuita con desglose dimensional inmediato.', 'published'),
    ('trans_asm_b5_fr', 'asm_big_five', 'fr', 'Test de Personnalité Big Five (OCEAN)', 'Évaluez vos cinq grands traits de personnalité : Ouverture, Conscience, Extraversion, Agréabilité et Névrosisme.', 'Le modèle des Big Five (ou modèle OCEAN) est le standard d''excellence de la psychologie contemporaine pour mesurer les dimensions fondamentales de la personnalité.', 'Répondez honnêtement à chaque affirmation en fonction de vos tendances naturelles. Il n''y a pas de bonne ou de mauvaise réponse.', 'Cette évaluation est fournie uniquement à des fins éducatives et d''autoréflexion. Elle ne constitue pas un diagnostic clinique.', 'Test de Personnalité Big Five Gratuit | PsychologyCalculator.com', 'Passez le test psychométrique des 5 grands facteurs de personnalité (OCEAN) en français. Résultats et profil détaillés immédiats.', 'published'),
    ('trans_asm_b5_de', 'asm_big_five', 'de', 'Big Five Persönlichkeitstest (OCEAN)', 'Ermitteln Sie Ihre Ausprägung in den fünf zentralen Persönlichkeitsdimensionen: Offenheit, Gewissenhaftigkeit, Extraversion, Verträglichkeit und Neurotizismus.', 'Das Big-Five-Modell (OCEAN) ist der wissenschaftliche Goldstandard der modernen Persönlichkeitspsychologie.', 'Beantworten Sie die Aussagen spontan und ehrlich entsprechend Ihrem typischen Verhalten. Es gibt keine richtigen oder falschen Antworten.', 'Dieser Selbsttest dient ausschließlich der Selbstreflexion und Bildung. Er stellt keine klinische Diagnose dar.', 'Kostenloser Big Five Persönlichkeitstest Online | PsychologyCalculator.com', 'Wissenschaftlich fundierter Big-Five-Persönlichkeitstest auf Deutsch. Sofortige Auswertung über alle 5 psychologischen Dimensionen.', 'published'),
    ('trans_asm_b5_pt', 'asm_big_five', 'pt', 'Teste de Personalidade Big Five (OCEAN)', 'Avalie suas cinco grandes dimensões de personalidade: Abertura, Conscienciosidade, Extroversão, Amabilidade e Neuroticismo.', 'O modelo dos Cinco Grandes Fatores (OCEAN) é a referência científica primordial na psicologia contemporânea para compreensão da personalidade.', 'Responda a cada questão com sinceridade com base no seu comportamento habitual. Não existem respostas certas ou erradas.', 'Esta avaliação é fornecida estritamente para fins educacionais e de autorreflexão. Não constitui diagnóstico clínico.', 'Teste de Personalidade Big Five Grátis | PsychologyCalculator.com', 'Faça o teste científico dos Cinco Grandes Fatores de personalidade (OCEAN) em português. Pontuação e análise dimensional instantânea.', 'published'),
    ('trans_asm_b5_hi', 'asm_big_five', 'hi', 'बिग फाइव व्यक्तित्व परीक्षण (OCEAN)', 'अपने पांच प्रमुख व्यक्तित्व आयामों का मूल्यांकन करें: खुलापन, कर्तव्यनिष्ठा, बहिर्मुखता, सहमतता और मनोविक्षुब्धता।', 'बिग फाइव मॉडल (OCEAN) आधुनिक मनोविज्ञान में व्यक्तित्व लक्षणों के मूल्यांकन का वैज्ञानिक मानक है।', 'प्रत्येक कथन का उत्तर अपनी स्वाभाविक प्रवृत्तियों के आधार पर ईमानदारी से दें। कोई सही या गलत उत्तर नहीं है।', 'यह परीक्षण केवल शैक्षिक एवं आत्म-चिंतन उद्देश्यों के लिए है। यह कोई नैदानिक ​​या चिकित्सीय निदान नहीं है।', 'निःशुल्क बिग फाइव व्यक्तित्व परीक्षण ऑनलाइन | PsychologyCalculator.com', 'हिंदी में वैज्ञानिक बिग फाइव (OCEAN) व्यक्तित्व परीक्षण लें। त्वरित स्कोर और आयामी रिपोर्ट प्राप्त करें।', 'published')
ON CONFLICT(assessment_id, locale) DO UPDATE SET
    name = excluded.name,
    short_description = excluded.short_description,
    long_description = excluded.long_description,
    instructions = excluded.instructions,
    disclaimer = excluded.disclaimer,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    updated_at = CURRENT_TIMESTAMP;

-- Seed Dimensions Translations for Big Five (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)
INSERT INTO assessment_dimension_translations (id, dimension_id, locale, name, description)
VALUES
    -- Openness
    ('trans_dim_open_es', 'dim_b5_openness', 'es', 'Apertura a la Experiencia', 'Mide la curiosidad intelectual, la imaginación creativa y la disposición hacia nuevas ideas.'),
    ('trans_dim_open_fr', 'dim_b5_openness', 'fr', 'Ouverture à l''Expérience', 'Mesure la curiosité intellectuelle, l''imagination créative et la réceptivité aux idées nouvelles.'),
    ('trans_dim_open_de', 'dim_b5_openness', 'de', 'Offenheit für Erfahrungen', 'Erfasst intellektuelle Neugier, kreative Vorstellungskraft und Bereitschaft für neue Perspektiven.'),
    ('trans_dim_open_pt', 'dim_b5_openness', 'pt', 'Abertura à Experiência', 'Mede a curiosidade intelectual, imaginação criativa e receptividade a novas ideias e experiências.'),
    ('trans_dim_open_hi', 'dim_b5_openness', 'hi', 'अनुभव के प्रति खुलापन', 'बौद्धिक जिज्ञासा, रचनात्मक कल्पना और नए विचारों के प्रति ग्रहणशीलता को मापता है।'),

    -- Conscientiousness
    ('trans_dim_consc_es', 'dim_b5_conscientiousness', 'es', 'Responsabilidad y Autodisciplina', 'Evalúa la organización personal, la perseverancia orientada a metas y el autocontrol.'),
    ('trans_dim_consc_fr', 'dim_b5_conscientiousness', 'fr', 'Conscience Professionnelle', 'Évalue l''organisation personnelle, la persévérance vers les objectifs et la maîtrise de soi.'),
    ('trans_dim_consc_de', 'dim_b5_conscientiousness', 'de', 'Gewissenhaftigkeit & Disziplin', 'Misst Zielorientierung, Selbstorganisation, Zuverlässigkeit und strukturierte Arbeitsweise.'),
    ('trans_dim_consc_pt', 'dim_b5_conscientiousness', 'pt', 'Conscienciosidade e Disciplina', 'Avalia a organização pessoal, persistência focada em metas e autocontrole.'),
    ('trans_dim_consc_hi', 'dim_b5_conscientiousness', 'hi', 'कर्तव्यनिष्ठा और आत्म-अनुशासन', 'व्यक्तिगत संगठन, लक्ष्य-उन्मुख दृढ़ता और आत्म-नियंत्रण का मूल्यांकन करता है।'),

    -- Extraversion
    ('trans_dim_ext_es', 'dim_b5_extraversion', 'es', 'Extraversión y Energía Social', 'Mide el entusiasmo en interacciones sociales, la asertividad y la búsqueda de estímulos externos.'),
    ('trans_dim_ext_fr', 'dim_b5_extraversion', 'fr', 'Extraversion et Énergie Sociale', 'Mesure l''enthousiasme dans les interactions sociales, l''assertivité et l''énergie relationnelle.'),
    ('trans_dim_ext_de', 'dim_b5_extraversion', 'de', 'Extraversion & Soziale Energie', 'Erfasst Begeisterungsfähigkeit im sozialen Kontakt, Durchsetzungsstärke und Kontaktfreude.'),
    ('trans_dim_ext_pt', 'dim_b5_extraversion', 'pt', 'Extroversão e Energia Social', 'Mede o entusiasmo nas relações sociais, assertividade e busca por estímulos sociais.'),
    ('trans_dim_ext_hi', 'dim_b5_extraversion', 'hi', 'बहिर्मुखता और सामाजिक ऊर्जा', 'सामाजिक संपर्कों में उत्साह, मुखरता और बाहरी उत्तेजनाओं की तलाश को मापता है।'),

    -- Agreeableness
    ('trans_dim_agr_es', 'dim_b5_agreeableness', 'es', 'Amabilidad y Empatía', 'Examina la disposición prosocial, la confianza interpersonal y la orientación a la cooperación.'),
    ('trans_dim_agr_fr', 'dim_b5_agreeableness', 'fr', 'Agréabilité et Empathie', 'Examine les dispositions prosociales, la confiance envers autrui et l''orientation vers la coopération.'),
    ('trans_dim_agr_de', 'dim_b5_agreeableness', 'de', 'Verträglichkeit & Empathie', 'Untersucht Kooperationsbereitschaft, zwischenmenschliches Vertrauen und Hilfsbereitschaft.'),
    ('trans_dim_agr_pt', 'dim_b5_agreeableness', 'pt', 'Amabilidade e Empatia', 'Examina a conduta pró-social, confiança interpessoal e predisposição para cooperação.'),
    ('trans_dim_agr_hi', 'dim_b5_agreeableness', 'hi', 'सहमतता और सहानुभूति', 'सामाजिक सहयोग, पारस्परिक विश्वास और दूसरों की भलाई के प्रति झुकाव की जांच करता है।'),

    -- Neuroticism / Emotional Stability
    ('trans_dim_neur_es', 'dim_b5_neuroticism', 'es', 'Sensibilidad Emocional (Neuroticismo)', 'Evalúa la tendencia a experimentar respuestas emocionales intensas ante situaciones de estrés o incertidumbre.'),
    ('trans_dim_neur_fr', 'dim_b5_neuroticism', 'fr', 'Sensibilité Émotionnelle (Névrosisme)', 'Évalue la propension à ressentir des émotions intenses face au stress ou à l''incertitude.'),
    ('trans_dim_neur_de', 'dim_b5_neuroticism', 'de', 'Emotionale Sensibilität (Neurotizismus)', 'Erfasst die emotionale Reaktionsstärke auf Stressfaktoren und Herausforderungen im Alltag.'),
    ('trans_dim_neur_pt', 'dim_b5_neuroticism', 'pt', 'Sensibilidade Emocional (Neuroticismo)', 'Avalia a propensão a vivenciar reações emocionais intensas sob estresse ou incerteza.'),
    ('trans_dim_neur_hi', 'dim_b5_neuroticism', 'hi', 'भावनात्मक संवेदनशीलता (मनोविक्षुब्धता)', 'तनाव या अनिश्चितता के प्रति भावनात्मक प्रतिक्रियाशीलता का आकलन करता है।')
ON CONFLICT(dimension_id, locale) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    updated_at = CURRENT_TIMESTAMP;
