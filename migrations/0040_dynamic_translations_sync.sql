INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Personalidad', 'Comprende tus rasgos fundamentales, patrones conductuales y arquitectura psicológica.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_personality';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Personnalité', 'Comprenez vos traits fondamentaux, vos réflexes comportementaux et votre architecture psychologique.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_personality';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Persönlichkeit', 'Verstehen Sie Ihre grundlegenden Wesensmerkmale, Handlungsmuster und psychologischen Strukturen.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_personality';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Personalidade', 'Compreenda seus traços essenciais, padrões de conduta e arquitetura psicológica.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_personality';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'व्यक्तित्व (Personality)', 'अपने मूल लक्षणों, व्यवहार संबंधी प्रवृत्तियों और मनोवैज्ञानिक संरचना को समझें।', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_personality';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Relaciones y Apego', 'Profundiza en tus dinámicas de apego, lenguajes afectivos e intimidad emocional.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_relationships';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Relations et Attachement', 'Approfondissez vos dynamiques affectives, langages de l''amour et intimité relationnelle.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_relationships';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Beziehungen & Bindung', 'Gewinnen Sie Klarheit über Ihren Bindungsstil, Liebessprachen und Beziehungsdynamiken.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_relationships';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Relacionamentos e Apego', 'Aprofunde-se em seus estilos de apego, linguagens do afeto e intimidade emocional.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_relationships';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'संबंध और लगाव (Relationships & Attachment)', 'अपनी लगाव शैली, प्रेम की भाषाओं और भावनात्मक निकटता को गहराई से समझें।', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_relationships';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Inteligencia Emocional', 'Evalúa tu autorregulación emocional, empatía, autoconocimiento y agilidad social en momentos de tensión.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_eq';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Intelligence Émotionnelle', 'Mesurez votre autorégulation, empathie, lucidité émotionnelle et agilité relationnelle sous pression.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_eq';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Emotionale Intelligenz', 'Erfassen Sie Ihre emotionale Selbstwahrnehmung, Impulskontrolle, Empathie und soziale Agilität unter Stress.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_eq';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Inteligência Emocional', 'Avalie sua autorregulação, empatia, autopercepção e flexibilidade social sob situações de pressão.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_eq';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'भावनात्मक बुद्धिमत्ता (EQ)', 'दबाव में आत्म-नियमन, सहानुभूति, आत्म-जागरूकता और पारस्परिक सामाजिक चपलता का मूल्यांकन करें।', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_eq';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Desarrollo Personal', 'Fortalece tu autoestima, autoconfianza y claridad psicológica para un crecimiento consciente.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_self_dev';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Développement Personnel', 'Développez une estime de soi solide, l''autodiscipline et vos leviers d''épanouissement personnel.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_self_dev';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Persönlichkeitsentwicklung', 'Stärken Sie Ihr gesundes Selbstwertgefühl, Selbstwirksamkeit und persönliche Entwicklungspfade.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_self_dev';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Desenvolvimento Pessoal', 'Fortaleça sua autoestima, autoeficácia e clareza mental para uma evolução contínua e autêntica.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_self_dev';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'आत्म-विकास (Self Development)', 'मजबूत आत्म-सम्मान, आदत अनुशासन और संज्ञानात्मक विकास के मार्गों का निर्माण करें।', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_self_dev';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Comunicación', 'Comprende tu asertividad, hábitos conversacionales y dinámicas de resolución de conflictos.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_communication';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Communication', 'Comprenez votre assertivité, vos dynamiques d''échange et vos réflexes face aux désaccords.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_communication';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Kommunikation', 'Analysieren Sie Ihre Durchsetzungsstärke, Gesprächsgewohnheiten und Verhandlungsstrategien.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_communication';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Comunicação', 'Compreenda sua assertividade, hábitos de diálogo e abordagens para resolver divergências.', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_communication';
INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'संचार (Communication)', 'अपनी बातचीत की गतिशीलता, मुखरता (Assertiveness) और संघर्ष समाधान शैली को समझें।', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = 'cat_communication';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Test de Personalidad Big Five (OCEAN)', 'Descubre tu perfil único en las 5 grandes dimensiones científicas de la personalidad: Apertura, Responsabilidad, Extraversión, Amabilidad y Estabilidad Emocional.', long_description, instructions, disclaimer, 'Test de Personalidad Big Five (OCEAN) | PsychologyCalculator.com', 'Descubre tu perfil único en las 5 grandes dimensiones científicas de la personalidad: Apertura, Responsabilidad, Extraversión, Amabilidad y Estabilidad Emocional.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'big-five-personality-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Test de Personnalité Big Five (OCEAN)', 'Découvrez votre profil psychologique selon les 5 dimensions fondamentales de la personnalité : Ouverture, Conscience, Extraversion, Agréabilité et Stabilité Émotionnelle.', long_description, instructions, disclaimer, 'Test de Personnalité Big Five (OCEAN) | PsychologyCalculator.com', 'Découvrez votre profil psychologique selon les 5 dimensions fondamentales de la personnalité : Ouverture, Conscience, Extraversion, Agréabilité et Stabilité Émotionnelle.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'big-five-personality-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Big Five Persönlichkeitstest (OCEAN)', 'Erfassen Sie Ihr wissenschaftlich fundiertes Persönlichkeitsprofil anhand der fünf Hauptdimensionen des Big-Five-Modells.', long_description, instructions, disclaimer, 'Big Five Persönlichkeitstest (OCEAN) | PsychologyCalculator.com', 'Erfassen Sie Ihr wissenschaftlich fundiertes Persönlichkeitsprofil anhand der fünf Hauptdimensionen des Big-Five-Modells.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'big-five-personality-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Teste de Personalidade Big Five (OCEAN)', 'Descubra seu perfil nas 5 dimensões validadas da personalidade: Abertura, Conscienciosidade, Extroversão, Amabilidade e Estabilidade Emocional.', long_description, instructions, disclaimer, 'Teste de Personalidade Big Five (OCEAN) | PsychologyCalculator.com', 'Descubra seu perfil nas 5 dimensões validadas da personalidade: Abertura, Conscienciosidade, Extroversão, Amabilidade e Estabilidade Emocional.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'big-five-personality-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'बिग फाइव व्यक्तित्व परीक्षण (OCEAN)', 'व्यक्तित्व के 5 वैज्ञानिक रूप से प्रमाणित मुख्य आयामों में अपनी अनूठी संरचना को जानें: खुलापन, कर्तव्यनिष्ठा, बहिर्मुखता, सौम्यता और भावनात्मक स्थिरता।', long_description, instructions, disclaimer, 'बिग फाइव व्यक्तित्व परीक्षण (OCEAN) | PsychologyCalculator.com', 'व्यक्तित्व के 5 वैज्ञानिक रूप से प्रमाणित मुख्य आयामों में अपनी अनूठी संरचना को जानें: खुलापन, कर्तव्यनिष्ठा, बहिर्मुखता, सौम्यता और भावनात्मक स्थिरता।', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'big-five-personality-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Test de Estilos de Apego Adulto', 'Identifica tu patrón de vinculación afectiva: Seguro, Ansioso, Evitativo o Desorganizado.', long_description, instructions, disclaimer, 'Test de Estilos de Apego Adulto | PsychologyCalculator.com', 'Identifica tu patrón de vinculación afectiva: Seguro, Ansioso, Evitativo o Desorganizado.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'attachment-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Test des Styles d''Attachement Adulte', 'Identifiez votre schéma relationnel : Sécure, Anxieux-Préoccupé, Évitant ou Craintif.', long_description, instructions, disclaimer, 'Test des Styles d''Attachement Adulte | PsychologyCalculator.com', 'Identifiez votre schéma relationnel : Sécure, Anxieux-Préoccupé, Évitant ou Craintif.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'attachment-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Bindungsstil-Test für Erwachsene', 'Ermitteln Sie Ihr Beziehungsmuster: Sicher, Ängstlich, Vermeidend oder Desorganisiert.', long_description, instructions, disclaimer, 'Bindungsstil-Test für Erwachsene | PsychologyCalculator.com', 'Ermitteln Sie Ihr Beziehungsmuster: Sicher, Ängstlich, Vermeidend oder Desorganisiert.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'attachment-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Teste de Estilos de Apego Adulto', 'Descubra seu padrão de vínculo emocional: Seguro, Ansioso, Evitativo ou Desorganizado.', long_description, instructions, disclaimer, 'Teste de Estilos de Apego Adulto | PsychologyCalculator.com', 'Descubra seu padrão de vínculo emocional: Seguro, Ansioso, Evitativo ou Desorganizado.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'attachment-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'अडल्ट अटैचमेंट स्टाइल टेस्ट', 'अपनी भावनात्मक जुड़ाव शैली को पहचानें: सुरक्षित (Secure), चिंतित (Anxious), परिहार (Avoidant), या भयभीत।', long_description, instructions, disclaimer, 'अडल्ट अटैचमेंट स्टाइल टेस्ट | PsychologyCalculator.com', 'अपनी भावनात्मक जुड़ाव शैली को पहचानें: सुरक्षित (Secure), चिंतित (Anxious), परिहार (Avoidant), या भयभीत।', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'attachment-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Test de Lenguajes del Amor', 'Descubre tu canal principal para expresar y recibir afecto: Palabras, Tiempo de Calidad, Regalos, Actos o Contacto.', long_description, instructions, disclaimer, 'Test de Lenguajes del Amor | PsychologyCalculator.com', 'Descubre tu canal principal para expresar y recibir afecto: Palabras, Tiempo de Calidad, Regalos, Actos o Contacto.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'love-language-quiz';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Quiz des Langages de l''Amour', 'Découvrez vos canaux privilégiés pour exprimer et recevoir l''amour dans votre couple.', long_description, instructions, disclaimer, 'Quiz des Langages de l''Amour | PsychologyCalculator.com', 'Découvrez vos canaux privilégiés pour exprimer et recevoir l''amour dans votre couple.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'love-language-quiz';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Die 5 Sprachen der Liebe Test', 'Erkennen Sie Ihre bevorzugten Wege, Zuneigung und Wertschätzung in Beziehungen zu erleben.', long_description, instructions, disclaimer, 'Die 5 Sprachen der Liebe Test | PsychologyCalculator.com', 'Erkennen Sie Ihre bevorzugten Wege, Zuneigung und Wertschätzung in Beziehungen zu erleben.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'love-language-quiz';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Teste das 5 Linguagens do Amor', 'Descubra seus canais primários para demonstrar e receber amor em relacionamentos íntimos.', long_description, instructions, disclaimer, 'Teste das 5 Linguagens do Amor | PsychologyCalculator.com', 'Descubra seus canais primários para demonstrar e receber amor em relacionamentos íntimos.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'love-language-quiz';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'लव लैंग्वेज टेस्ट (प्रेम की 5 भाषाएं)', 'प्रेम व्यक्त करने और प्राप्त करने के अपने प्राथमिक माध्यमों को समझें।', long_description, instructions, disclaimer, 'लव लैंग्वेज टेस्ट (प्रेम की 5 भाषाएं) | PsychologyCalculator.com', 'प्रेम व्यक्त करने और प्राप्त करने के अपने प्राथमिक माध्यमों को समझें।', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'love-language-quiz';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Test de Inteligencia Emocional (EQ)', 'Evalúa tu capacidad de autoconciencia emocional, autorregulación, empatía y destrezas sociales.', long_description, instructions, disclaimer, 'Test de Inteligencia Emocional (EQ) | PsychologyCalculator.com', 'Evalúa tu capacidad de autoconciencia emocional, autorregulación, empatía y destrezas sociales.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'emotional-intelligence-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Test d''Intelligence Émotionnelle (QE)', 'Mesurez votre conscience de soi, régulation des impulsions, empathie et compétences sociales.', long_description, instructions, disclaimer, 'Test d''Intelligence Émotionnelle (QE) | PsychologyCalculator.com', 'Mesurez votre conscience de soi, régulation des impulsions, empathie et compétences sociales.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'emotional-intelligence-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Test zur Emotionalen Intelligenz (EQ)', 'Ermitteln Sie Ihre emotionale Selbstwahrnehmung, Selbststeuerung, Motivation und Empathie.', long_description, instructions, disclaimer, 'Test zur Emotionalen Intelligenz (EQ) | PsychologyCalculator.com', 'Ermitteln Sie Ihre emotionale Selbstwahrnehmung, Selbststeuerung, Motivation und Empathie.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'emotional-intelligence-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Teste de Inteligência Emocional (QE)', 'Avalie seu nível de autopercepção emocional, controle de impulsos, empatia e habilidades sociais.', long_description, instructions, disclaimer, 'Teste de Inteligência Emocional (QE) | PsychologyCalculator.com', 'Avalie seu nível de autopercepção emocional, controle de impulsos, empatia e habilidades sociais.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'emotional-intelligence-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'भावनात्मक बुद्धिमत्ता (EQ) परीक्षण', 'अपनी आत्म-जागरूकता, आवेग नियंत्रण, आंतरिक प्रेरणा, सहानुभूति और सामाजिक कौशल को मापें।', long_description, instructions, disclaimer, 'भावनात्मक बुद्धिमत्ता (EQ) परीक्षण | PsychologyCalculator.com', 'अपनी आत्म-जागरूकता, आवेग नियंत्रण, आंतरिक प्रेरणा, सहानुभूति और सामाजिक कौशल को मापें।', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'emotional-intelligence-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Test de Introversión vs Extraversión', 'Descubre tu fuente de recarga de energía social: Introvertido, Ambivertido o Extravertido.', long_description, instructions, disclaimer, 'Test de Introversión vs Extraversión | PsychologyCalculator.com', 'Descubre tu fuente de recarga de energía social: Introvertido, Ambivertido o Extravertido.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'introvert-extrovert-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Test Introverti vs Extraverti', 'Déterminez comment vous rechargez votre énergie : Introversion, Ambiversion ou Extraversion.', long_description, instructions, disclaimer, 'Test Introverti vs Extraverti | PsychologyCalculator.com', 'Déterminez comment vous rechargez votre énergie : Introversion, Ambiversion ou Extraversion.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'introvert-extrovert-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Introvertiert vs. Extravertiert Test', 'Erfahren Sie, wie Sie Ihre Energie auftanken: Introvertiert, Ambivertiert oder Extravertiert.', long_description, instructions, disclaimer, 'Introvertiert vs. Extravertiert Test | PsychologyCalculator.com', 'Erfahren Sie, wie Sie Ihre Energie auftanken: Introvertiert, Ambivertiert oder Extravertiert.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'introvert-extrovert-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Teste de Introversão vs Extroversão', 'Mapeie como você recarrega sua energia social: Introvertido, Ambivertido ou Extrovertido.', long_description, instructions, disclaimer, 'Teste de Introversão vs Extroversão | PsychologyCalculator.com', 'Mapeie como você recarrega sua energia social: Introvertido, Ambivertido ou Extrovertido.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'introvert-extrovert-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'अंतर्मुखी बनाम बहिर्मुखी परीक्षण (Introvert vs Extrovert)', 'जानें कि आप अपनी सामाजिक ऊर्जा को कैसे रिचार्ज करते हैं: अंतर्मुखी, उभयमुखी (Ambivert), या बहिर्मुखी।', long_description, instructions, disclaimer, 'अंतर्मुखी बनाम बहिर्मुखी परीक्षण (Introvert vs Extrovert) | PsychologyCalculator.com', 'जानें कि आप अपनी सामाजिक ऊर्जा को कैसे रिचार्ज करते हैं: अंतर्मुखी, उभयमुखी (Ambivert), या बहिर्मुखी।', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'introvert-extrovert-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Test de Autoestima (Escala de Rosenberg)', 'Evalúa tu sentido fundamental de autovalía, autoaceptación incondicional y autoeficacia.', long_description, instructions, disclaimer, 'Test de Autoestima (Escala de Rosenberg) | PsychologyCalculator.com', 'Evalúa tu sentido fundamental de autovalía, autoaceptación incondicional y autoeficacia.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'self-esteem-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Test d''Estime de Soi (Échelle de Rosenberg)', 'Évaluez votre sentiment de valeur personnelle, votre auto-acceptation et votre confiance en vous.', long_description, instructions, disclaimer, 'Test d''Estime de Soi (Échelle de Rosenberg) | PsychologyCalculator.com', 'Évaluez votre sentiment de valeur personnelle, votre auto-acceptation et votre confiance en vous.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'self-esteem-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Selbstwertgefühl-Test (Rosenberg-Skala)', 'Erfassen Sie Ihr grundlegendes Gefühl für eigenen Wert, Selbstakzeptanz und Selbstwirksamkeit.', long_description, instructions, disclaimer, 'Selbstwertgefühl-Test (Rosenberg-Skala) | PsychologyCalculator.com', 'Erfassen Sie Ihr grundlegendes Gefühl für eigenen Wert, Selbstakzeptanz und Selbstwirksamkeit.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'self-esteem-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Teste de Autoestima (Escala de Rosenberg)', 'Avalie seu sentimento fundamental de valor próprio, autoaceitação incondicional e confiança.', long_description, instructions, disclaimer, 'Teste de Autoestima (Escala de Rosenberg) | PsychologyCalculator.com', 'Avalie seu sentimento fundamental de valor próprio, autoaceitação incondicional e confiança.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'self-esteem-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'आत्म-सम्मान परीक्षण (Rosenberg Self-Esteem)', 'अपने आत्म-मूल्य, बिना शर्त आत्म-स्वीकृति और आंतरिक आत्मविश्वास का मूल्यांकन करें।', long_description, instructions, disclaimer, 'आत्म-सम्मान परीक्षण (Rosenberg Self-Esteem) | PsychologyCalculator.com', 'अपने आत्म-मूल्य, बिना शर्त आत्म-स्वीकृति और आंतरिक आत्मविश्वास का मूल्यांकन करें।', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'self-esteem-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Test de Estilos de Comunicación', 'Identifica tu enfoque conversacional predominante: Asertivo, Pasivo, Agresivo o Pasivo-Agresivo.', long_description, instructions, disclaimer, 'Test de Estilos de Comunicación | PsychologyCalculator.com', 'Identifica tu enfoque conversacional predominante: Asertivo, Pasivo, Agresivo o Pasivo-Agresivo.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'communication-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Test des Styles de Communication', 'Identifiez votre façon de communiquer : Assertive, Passive, Agressive ou Passive-Agressive.', long_description, instructions, disclaimer, 'Test des Styles de Communication | PsychologyCalculator.com', 'Identifiez votre façon de communiquer : Assertive, Passive, Agressive ou Passive-Agressive.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'communication-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Kommunikationsstil-Test', 'Erkennen Sie Ihr Gesprächsmuster: Assertiv (Durchsetzungsstark), Passiv, Aggressiv oder Passiv-Aggressiv.', long_description, instructions, disclaimer, 'Kommunikationsstil-Test | PsychologyCalculator.com', 'Erkennen Sie Ihr Gesprächsmuster: Assertiv (Durchsetzungsstark), Passiv, Aggressiv oder Passiv-Aggressiv.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'communication-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Teste de Estilos de Comunicação', 'Identifique sua postura conversacional: Assertiva, Passiva, Agressiva ou Passivo-Agressiva.', long_description, instructions, disclaimer, 'Teste de Estilos de Comunicação | PsychologyCalculator.com', 'Identifique sua postura conversacional: Assertiva, Passiva, Agressiva ou Passivo-Agressiva.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'communication-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'संचार शैली परीक्षण (Communication Style)', 'अपनी बातचीत की प्राथमिक शैली पहचानें: मुखर (Assertive), निष्क्रिय (Passive), आक्रामक, या निष्क्रिय-आक्रामक।', long_description, instructions, disclaimer, 'संचार शैली परीक्षण (Communication Style) | PsychologyCalculator.com', 'अपनी बातचीत की प्राथमिक शैली पहचानें: मुखर (Assertive), निष्क्रिय (Passive), आक्रामक, या निष्क्रिय-आक्रामक।', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'communication-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_es', id, 'es', 'Test de Estilos de Conflicto (Thomas-Kilmann)', 'Descubre cómo negocias disputas: Colaborador, Comprometido, Complaciente, Competidor o Evasivo.', long_description, instructions, disclaimer, 'Test de Estilos de Conflicto (Thomas-Kilmann) | PsychologyCalculator.com', 'Descubre cómo negocias disputas: Colaborador, Comprometido, Complaciente, Competidor o Evasivo.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'conflict-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_fr', id, 'fr', 'Test de Gestion des Conflits (Thomas-Kilmann)', 'Analysez vos réflexes face aux désaccords : Collaboration, Compromis, Conciliation, Compétition ou Évitement.', long_description, instructions, disclaimer, 'Test de Gestion des Conflits (Thomas-Kilmann) | PsychologyCalculator.com', 'Analysez vos réflexes face aux désaccords : Collaboration, Compromis, Conciliation, Compétition ou Évitement.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'conflict-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_de', id, 'de', 'Konfliktstil-Test (Thomas-Kilmann Modell)', 'Messen Sie Ihre Verhandlungsmuster: Kollaborativ, Kompromissbereit, Anpassend, Konkurrierend oder Vermeidend.', long_description, instructions, disclaimer, 'Konfliktstil-Test (Thomas-Kilmann Modell) | PsychologyCalculator.com', 'Messen Sie Ihre Verhandlungsmuster: Kollaborativ, Kompromissbereit, Anpassend, Konkurrierend oder Vermeidend.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'conflict-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_pt', id, 'pt', 'Teste de Estilos de Conflito (Thomas-Kilmann)', 'Mapeie sua forma de gerenciar disputas: Colaborativo, Conciliador, Acomodativo, Competitivo ou Evitativo.', long_description, instructions, disclaimer, 'Teste de Estilos de Conflito (Thomas-Kilmann) | PsychologyCalculator.com', 'Mapeie sua forma de gerenciar disputas: Colaborativo, Conciliador, Acomodativo, Competitivo ou Evitativo.', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'conflict-style-test';
INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_hi', id, 'hi', 'संघर्ष समाधान शैली परीक्षण (Thomas-Kilmann TKI)', 'तय करें कि आप विवादों का समाधान कैसे करते हैं: सहयोगी (Collaborating), समझौतावादी, समायोजक, प्रतिस्पर्धी, या टालने वाले।', long_description, instructions, disclaimer, 'संघर्ष समाधान शैली परीक्षण (Thomas-Kilmann TKI) | PsychologyCalculator.com', 'तय करें कि आप विवादों का समाधान कैसे करते हैं: सहयोगी (Collaborating), समझौतावादी, समायोजक, प्रतिस्पर्धी, या टालने वाले।', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = 'conflict-style-test';
INSERT OR IGNORE INTO assessment_dimension_translations (id, dimension_id, locale, name, description)
SELECT 'trans_' || id || '_es', id, 'es', name, description FROM assessment_dimensions;
INSERT OR IGNORE INTO assessment_dimension_translations (id, dimension_id, locale, name, description)
SELECT 'trans_' || id || '_fr', id, 'fr', name, description FROM assessment_dimensions;
INSERT OR IGNORE INTO assessment_dimension_translations (id, dimension_id, locale, name, description)
SELECT 'trans_' || id || '_de', id, 'de', name, description FROM assessment_dimensions;
INSERT OR IGNORE INTO assessment_dimension_translations (id, dimension_id, locale, name, description)
SELECT 'trans_' || id || '_pt', id, 'pt', name, description FROM assessment_dimensions;
INSERT OR IGNORE INTO assessment_dimension_translations (id, dimension_id, locale, name, description)
SELECT 'trans_' || id || '_hi', id, 'hi', name, description FROM assessment_dimensions;