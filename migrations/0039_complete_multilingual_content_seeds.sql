-- Migration 0039: Complete Multilingual Translations Seed for All Categories, Assessments, Dimensions, Questions, and Email Templates
-- PsychologyCalculator.com
-- Supported Locales: Spanish (es), French (fr), German (de), Portuguese (pt), Hindi (hi)

-- =========================================================================
-- 1. CATEGORY TRANSLATIONS
-- =========================================================================
INSERT INTO assessment_category_translations (id, category_id, locale, name, description, seo_title, seo_description)
VALUES
    -- Emotional Intelligence (cat_eq)
    ('trans_cat_eq_es', 'cat_eq', 'es', 'Inteligencia Emocional (EQ)', 'Evalúa tu autorregulación emocional, empatía, autoconocimiento y agilidad social en momentos de tensión.', 'Test de Inteligencia Emocional Gratis | PsychologyCalculator.com', 'Mide tu cociente emocional (EQ), empatía y autocontrol con evaluaciones psicométricas validadas.'),
    ('trans_cat_eq_fr', 'cat_eq', 'fr', 'Intelligence Émotionnelle (QE)', 'Mesurez votre autorégulation, empathie, lucidité émotionnelle et agilité relationnelle sous pression.', 'Tests d''Intelligence Émotionnelle Gratuits | PsychologyCalculator.com', 'Évaluez votre quotient émotionnel (QE), empathie et gestion des émotions avec nos tests validés.'),
    ('trans_cat_eq_de', 'cat_eq', 'de', 'Emotionale Intelligenz (EQ)', 'Erfassen Sie Ihre emotionale Selbstwahrnehmung, Impulskontrolle, Empathie und soziale Agilität unter Stress.', 'Kostenlose Tests zur Emotionalen Intelligenz | PsychologyCalculator.com', 'Wissenschaftlich fundierte EQ-Tests zur Analyse von Empathie, Impulskontrolle und Selbstregulation.'),
    ('trans_cat_eq_pt', 'cat_eq', 'pt', 'Inteligência Emocional (QE)', 'Avalie sua autorregulação, empatia, autopercepção e flexibilidade social sob situações de pressão.', 'Testes de Inteligência Emocional Grátis | PsychologyCalculator.com', 'Descubra seu quociente emocional (QE), empatia e autocontrole através de psicometria validada.'),
    ('trans_cat_eq_hi', 'cat_eq', 'hi', 'भावनात्मक बुद्धिमत्ता (EQ)', 'दबाव में आत्म-नियमन, सहानुभूति, आत्म-जागरूकता और पारस्परिक सामाजिक चपलता का मूल्यांकन करें।', 'भावनात्मक बुद्धिमत्ता परीक्षण ऑनलाइन | PsychologyCalculator.com', 'प्रमाणित मनोवैज्ञानिक परीक्षणों के साथ अपने EQ, सहानुभूति और भावनात्मक नियंत्रण को मापें।'),

    -- Self Development (cat_self_dev)
    ('trans_cat_sd_es', 'cat_self_dev', 'es', 'Desarrollo Personal y Autoestima', 'Fortalece tu autoestima, autoconfianza y claridad psicológica para un crecimiento consciente.', 'Test de Autoestima y Crecimiento Personal | PsychologyCalculator.com', 'Instrumentos psicométricos validados para medir autoestima, autoeficacia y fortalezas personales.'),
    ('trans_cat_sd_fr', 'cat_self_dev', 'fr', 'Développement Personnel et Estime de Soi', 'Développez une estime de soi solide, l''autodiscipline et vos leviers d''épanouissement personnel.', 'Tests d''Estime de Soi et Développement Personnel | PsychologyCalculator.com', 'Évaluez votre sentiment de valeur personnelle, auto-efficacité et confiance avec nos tests.'),
    ('trans_cat_sd_de', 'cat_self_dev', 'de', 'Persönlichkeitsentwicklung & Selbstwert', 'Stärken Sie Ihr gesundes Selbstwertgefühl, Selbstwirksamkeit und persönliche Entwicklungspfade.', 'Selbstwertgefühl-Tests & Potenzialanalyse | PsychologyCalculator.com', 'Wissenschaftliche Selbsttests zur Analyse von Selbstachtung, Resilienz und innerer Stärke.'),
    ('trans_cat_sd_pt', 'cat_self_dev', 'pt', 'Desenvolvimento Pessoal e Autoestima', 'Fortaleça sua autoestima, autoeficácia e clareza mental para uma evolução contínua e autêntica.', 'Testes de Autoestima e Desenvolvimento Pessoal | PsychologyCalculator.com', 'Avalie sua autoconfiança, amor-próprio e potencial de crescimento com psicometria sólida.'),
    ('trans_cat_sd_hi', 'cat_self_dev', 'hi', 'आत्म-विकास एवं आत्म-सम्मान', 'मजबूत आत्म-सम्मान, आदत अनुशासन और संज्ञानात्मक विकास के मार्गों का निर्माण करें।', 'आत्म-सम्मान एवं व्यक्तिगत विकास परीक्षण | PsychologyCalculator.com', 'आत्म-मूल्य, आत्म-प्रभावकारिता और व्यक्तिगत विकास के लिए वैज्ञानिक मूल्यांकन।'),

    -- Communication (cat_communication)
    ('trans_cat_com_es', 'cat_communication', 'es', 'Comunicación y Resolución de Conflictos', 'Comprende tu asertividad, hábitos conversacionales y dinámicas de resolución de conflictos.', 'Test de Estilos de Comunicación y Asertividad | PsychologyCalculator.com', 'Analiza tu estilo comunicativo: asertivo, pasivo, agresivo o negociador con test científicos.'),
    ('trans_cat_com_fr', 'cat_communication', 'fr', 'Communication et Résolution de Conflits', 'Comprenez votre assertivité, vos dynamiques d''échange et vos réflexes face aux désaccords.', 'Tests de Styles de Communication et Assertivité | PsychologyCalculator.com', 'Évaluez votre communication assertive, passive ou constructive lors des situations complexes.'),
    ('trans_cat_com_de', 'cat_communication', 'de', 'Kommunikation & Konfliktlösung', 'Analysieren Sie Ihre Durchsetzungsstärke, Gesprächsgewohnheiten und Verhandlungsstrategien.', 'Kommunikationsstil- & Konfliktmanagement-Tests | PsychologyCalculator.com', 'Erkennen Sie Durchsetzungsfähigkeit, Kooperationsbereitschaft und Konfliktmuster in Beziehungen.'),
    ('trans_cat_com_pt', 'cat_communication', 'pt', 'Comunicação e Resolução de Conflitos', 'Compreenda sua assertividade, hábitos de diálogo e abordagens para resolver divergências.', 'Testes de Estilo de Comunicação e Assertividade | PsychologyCalculator.com', 'Analise se seu estilo é assertivo, passivo, agressivo ou colaborativo com instrumentos válidos.'),
    ('trans_cat_com_hi', 'cat_communication', 'hi', 'संचार और संघर्ष समाधान', 'अपनी बातचीत की गतिशीलता, मुखरता (Assertiveness) और संघर्ष समाधान शैली को समझें।', 'संचार शैली एवं संघर्ष समाधान परीक्षण | PsychologyCalculator.com', 'पारस्परिक बातचीत की आदतों, मुखरता और सुलह की रणनीतियों का मूल्यांकन करें।')
ON CONFLICT(category_id, locale) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    updated_at = CURRENT_TIMESTAMP;

-- =========================================================================
-- 2. ASSESSMENT TRANSLATIONS (All Remaining MVP Assessments)
-- =========================================================================
INSERT INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status)
VALUES
    -- Attachment Style Test (asm_attachment)
    ('trans_asm_att_es', 'asm_attachment', 'es', 'Test de Estilos de Apego Adulto', 'Identifica tu patrón de vinculación afectiva: Seguro, Ansioso, Evitativo o Desorganizado.', 'Basado en la teoría del apego adulto formulada por John Bowlby y Mary Ainsworth, este test evalúa cómo gestionas la intimidad, la necesidad de cercanía y la autonomía en tus relaciones de pareja.', 'Reflexiona sobre tu comportamiento habitual en relaciones afectivas cercanas y responde con sinceridad.', 'Esta evaluación es una herramienta educativa de autorreflexión y no sustituye la terapia o el diagnóstico clínico.', 'Test de Estilos de Apego Gratis Online | PsychologyCalculator.com', 'Descubre tu estilo de apego (seguro, ansioso o evitativo) en español. Evaluación psicométrica científica gratuita.', 'published'),
    ('trans_asm_att_fr', 'asm_attachment', 'fr', 'Test des Styles d''Attachement Adulte', 'Identifiez votre schéma relationnel : Sécure, Anxieux-Préoccupé, Évitant ou Craintif.', 'Fondé sur les travaux de John Bowlby et Mary Ainsworth, ce test analyse vos réactions émotionnelles face à l''intimité, la vulnérabilité et l''autonomie en couple.', 'Répondez honnêtement en fonction de votre façon naturelle de vivre vos relations proches.', 'Ce test est destiné à l''autoréflexion et ne constitue pas un diagnostic relationnel médical.', 'Test de Style d''Attachement Gratuit | PsychologyCalculator.com', 'Évaluez votre profil d''attachement (sécure, anxieux, évitant) en français avec analyse instantanée.', 'published'),
    ('trans_asm_att_de', 'asm_attachment', 'de', 'Bindungsstil-Test für Erwachsene', 'Ermitteln Sie Ihr Beziehungsmuster: Sicher, Ängstlich, Vermeidend oder Desorganisiert.', 'Basierend auf der Bindungstheorie von John Bowlby und Mary Ainsworth zeigt dieser Test, wie Sie Nähe, Unabhängigkeit und Vertrauen in Partnerschaften erleben.', 'Beantworten Sie die Fragen spontan anhand Ihrer typischen Erfahrungen in engen Beziehungen.', 'Dieser Selbsttest dient der persönlichen Reflexion und ersetzt keine psychologische Beratung.', 'Kostenloser Bindungsstil-Test Online | PsychologyCalculator.com', 'Wissenschaftlich fundierter Bindungsstil-Test auf Deutsch. Sofortige Auswertung Ihres Beziehungsmusters.', 'published'),
    ('trans_asm_att_pt', 'asm_attachment', 'pt', 'Teste de Estilos de Apego Adulto', 'Descubra seu padrão de vínculo emocional: Seguro, Ansioso, Evitativo ou Desorganizado.', 'Baseado na teoria do apego de John Bowlby e Mary Ainsworth, esta avaliação examina como você lida com a intimidade, vulnerabilidade e autonomia nas relações amorosas.', 'Reflita sobre suas reações habituais em relacionamentos íntimos e responda com sinceridade.', 'Esta avaliação é exclusivamente educacional e de autoanálise, não substituindo acompanhamento clínico.', 'Teste de Estilo de Apego Grátis | PsychologyCalculator.com', 'Faça o teste de apego adulto (seguro, ansioso, evitativo) em português com relatório imediato.', 'published'),
    ('trans_asm_att_hi', 'asm_attachment', 'hi', 'अडल्ट अटैचमेंट स्टाइल टेस्ट', 'अपनी भावनात्मक जुड़ाव शैली को पहचानें: सुरक्षित (Secure), चिंतित (Anxious), परिहार (Avoidant), या भयभीत।', 'जॉन बॉल्बी और मैरी एन्सवर्थ के लगाव सिद्धांत पर आधारित, यह परीक्षण बताता है कि आप रिश्तों में निकटता, स्वतंत्रता और भरोसे का प्रबंधन कैसे करते हैं।', 'अपने करीबी रिश्तों के सामान्य अनुभवों के आधार पर प्रत्येक प्रश्न का ईमानदारी से उत्तर दें।', 'यह परीक्षण केवल व्यक्तिगत समझ के लिए है और किसी नैदानिक संबंध निदान का विकल्प नहीं है।', 'निःशुल्क अटैचमेंट स्टाइल टेस्ट हिंदी में | PsychologyCalculator.com', 'हिंदी में अपनी अटैचमेंट स्टाइल (सुरक्षित, चिंतित, परिहार) जानें। त्वरित और सटीक स्कोर प्राप्त करें।', 'published'),

    -- Love Language Quiz (asm_love_language)
    ('trans_asm_ll_es', 'asm_love_language', 'es', 'Test de Lenguajes del Amor', 'Descubre tu canal principal para expresar y recibir afecto: Palabras, Tiempo de Calidad, Regalos, Actos o Contacto.', 'Inspirado en el marco de los 5 lenguajes del amor del Dr. Gary Chapman, este test clarifica las conductas relacionales que te hacen sentir verdaderamente valorado.', 'Elige el grado de afinidad con cada afirmación según lo que te genera mayor satisfacción emocional.', 'Los lenguajes del amor son preferencias comunicativas dinámicas, no etiquetas rígidas.', 'Test de los 5 Lenguajes del Amor Gratis | PsychologyCalculator.com', 'Realiza el test de lenguajes del amor en español. Conoce tus preferencias afectivas al instante.', 'published'),
    ('trans_asm_ll_fr', 'asm_love_language', 'fr', 'Quiz des Langages de l''Amour', 'Découvrez vos canaux privilégiés pour exprimer et recevoir l''amour dans votre couple.', 'Inspiré des travaux du Dr Gary Chapman, ce quiz met en lumière les attentions qui nourrissent votre sécurité affective.', 'Indiquez dans quelle mesure chaque situation résonne avec votre épanouissement relationnel.', 'Les langages de l''amour sont des préférences relationnelles et non des catégories figées.', 'Test des 5 Langages de l''Amour Gratuit | PsychologyCalculator.com', 'Découvrez votre langage d''amour dominant en français avec profil personnalisé immédiat.', 'published'),
    ('trans_asm_ll_de', 'asm_love_language', 'de', 'Die 5 Sprachen der Liebe Test', 'Erkennen Sie Ihre bevorzugten Wege, Zuneigung und Wertschätzung in Beziehungen zu erleben.', 'Basierend auf dem Modell von Dr. Gary Chapman zeigt dieser Test, welche Verhaltensweisen Ihnen das tiefste Gefühl von Geborgenheit und Liebe vermitteln.', 'Wählen Sie spontan die Aussagen, die am besten zu Ihren emotionalen Bedürfnissen passen.', 'Die Sprachen der Liebe sind Kommunikationspräferenzen und keine starren Persönlichkeitstypen.', 'Die 5 Sprachen der Liebe Test Kostenlos | PsychologyCalculator.com', 'Finden Sie Ihre Liebessprache auf Deutsch heraus. Schnelle Auswertung aller 5 Beziehungsdimensionen.', 'published'),
    ('trans_asm_ll_pt', 'asm_love_language', 'pt', 'Teste das 5 Linguagens do Amor', 'Descubra seus canais primários para demonstrar e receber amor em relacionamentos íntimos.', 'Inspirado no modelo do Dr. Gary Chapman, este teste esclarece quais atitudes fazem você se sentir verdadeiramente amado e acolhido.', 'Selecione o grau em que cada afirmação reflete sua satisfação afetiva mais profunda.', 'As linguagens do amor são preferências dinâmicas de comunicação afetiva.', 'Teste das 5 Linguagens do Amor Grátis | PsychologyCalculator.com', 'Faça o teste das linguagens do amor em português e descubra seu perfil relacional.', 'published'),
    ('trans_asm_ll_hi', 'asm_love_language', 'hi', 'लव लैंग्वेज टेस्ट (प्रेम की 5 भाषाएं)', 'प्रेम व्यक्त करने और प्राप्त करने के अपने प्राथमिक माध्यमों को समझें।', 'डॉ. गैरी चैपमैन के सिद्धांतों पर आधारित, यह परीक्षण बताता है कि कौन से व्यवहार आपको सबसे अधिक सम्मानित और प्रिय महसूस कराते हैं।', 'अपने भावनात्मक अनुभवों के आधार पर प्रत्येक कथन पर अपनी सहमति दर्ज करें।', 'प्रेम की भाषाएं लचीली संचार प्राथमिकताएं हैं, कोई कठोर मनोवैज्ञानिक वर्गीकरण नहीं।', 'लव लैंग्वेज टेस्ट ऑनलाइन हिंदी में | PsychologyCalculator.com', 'हिंदी में अपनी प्रेम भाषा (Love Language) पहचानें और अपने साथी के साथ संबंध बेहतर बनाएं।', 'published'),

    -- Emotional Intelligence (asm_eq)
    ('trans_asm_eq_es', 'asm_eq', 'es', 'Test de Inteligencia Emocional (EQ)', 'Evalúa tu capacidad de autoconciencia emocional, autorregulación, empatía y destrezas sociales.', 'Basado en el modelo de Daniel Goleman, el Cociente Emocional (EQ) mide la habilidad para reconocer emociones propias y ajenas, adaptándote constructivamente a dinámicas complejas.', 'Considera cómo respondes ante el estrés y las situaciones desafiantes en tu vida cotidiana.', 'Este instrumento mide agilidad emocional autorreportada para el crecimiento personal, sin carácter médico.', 'Test de Inteligencia Emocional Gratis | PsychologyCalculator.com', 'Evalúa tu coeficiente emocional (EQ) en español con desglose dimensional de autoconciencia y empatía.', 'published'),
    ('trans_asm_eq_fr', 'asm_eq', 'fr', 'Test d''Intelligence Émotionnelle (QE)', 'Mesurez votre conscience de soi, régulation des impulsions, empathie et compétences sociales.', 'Fondé sur le cadre de Daniel Goleman, ce test évalue votre capacité à comprendre et réguler vos émotions face aux défis.', 'Répondez selon vos réactions habituelles face aux situations de tension personnelle ou professionnelle.', 'Cette évaluation vise le développement personnel et ne remplace pas un bilan psychologique clinique.', 'Test de Quotient Émotionnel (QE) Gratuit | PsychologyCalculator.com', 'Testez votre intelligence émotionnelle en français : maîtrise de soi, empathie et relations.', 'published'),
    ('trans_asm_eq_de', 'asm_eq', 'de', 'Test zur Emotionalen Intelligenz (EQ)', 'Ermitteln Sie Ihre emotionale Selbstwahrnehmung, Selbststeuerung, Motivation und Empathie.', 'Basierend auf dem Modell von Daniel Goleman misst dieser EQ-Test Ihre Fähigkeiten zur Erkennung und konstruktiven Steuerung emotionaler Prozesse.', 'Reflektieren Sie Ihr Verhalten in emotional fordernden privaten und beruflichen Momenten.', 'Dieser Test dient der Selbstreflexion und stellt keine psychiatrische Diagnostik dar.', 'Emotionaler Intelligenzquotient (EQ) Test Online | PsychologyCalculator.com', 'Wissenschaftlicher EQ-Test auf Deutsch mit Sofortanalyse über Selbstwahrnehmung und Empathie.', 'published'),
    ('trans_asm_eq_pt', 'asm_eq', 'pt', 'Teste de Inteligência Emocional (QE)', 'Avalie seu nível de autopercepção emocional, controle de impulsos, empatia e habilidades sociais.', 'Inspirado no modelo de Daniel Goleman, o Quociente Emocional (QE) reflete a capacidade de gerir emoções e construir laços interpessoais saudáveis.', 'Reflita sobre como você lida com frustrações e tensões no seu dia a dia.', 'Esta avaliação é uma ferramenta de autoconhecimento e aprimoramento pessoal.', 'Teste de Inteligência Emocional Grátis | PsychologyCalculator.com', 'Avalie seu QE em português e obtenha um diagnóstico dimensional de autocontrole e empatia.', 'published'),
    ('trans_asm_eq_hi', 'asm_eq', 'hi', 'भावनात्मक बुद्धिमत्ता (EQ) परीक्षण', 'अपनी आत्म-जागरूकता, आवेग नियंत्रण, आंतरिक प्रेरणा, सहानुभूति और सामाजिक कौशल को मापें।', 'डैनियल गोलेमैन के प्रसिद्ध मॉडल पर आधारित, यह परीक्षण आपकी भावनात्मक क्षमताओं और सामाजिक अनुकूलन का मूल्यांकन करता है।', 'दैनिक जीवन में तनाव और दूसरों के साथ बातचीत के अपने स्वाभाविक तरीकों पर विचार करें।', 'यह परीक्षण व्यक्तिगत विकास के लिए है, किसी मनोरोग निदान के लिए नहीं।', 'भावनात्मक बुद्धिमत्ता (EQ) परीक्षण ऑनलाइन | PsychologyCalculator.com', 'हिंदी में अपना भावनात्मक भागफल (EQ) मापें। आत्म-जागरूकता और सहानुभूति स्कोर प्राप्त करें।', 'published'),

    -- Introvert vs Extrovert (asm_intro_extro)
    ('trans_asm_ie_es', 'asm_intro_extro', 'es', 'Test de Introversión vs Extraversión', 'Descubre tu fuente de recarga de energía social: Introvertido, Ambivertido o Extravertido.', 'Basado en los tipos psicológicos de Carl Jung, este instrumento clarifica cómo orientas tu atención cognitiva y recuperas tu vitalidad mental.', 'Evalúa tus preferencias naturales cuando no estás condicionado por obligaciones laborales.', 'La orientación social es un espectro flexible influenciado por el contexto y la energía individual.', 'Test de Introversión y Extraversión Gratis | PsychologyCalculator.com', 'Conoce si eres introvertido, ambivertido o extravertido en español con análisis dimensional.', 'published'),
    ('trans_asm_ie_fr', 'asm_intro_extro', 'fr', 'Test Introverti vs Extraverti', 'Déterminez comment vous rechargez votre énergie : Introversion, Ambiversion ou Extraversion.', 'Issu de la typologie jungienne, ce test montre si vous puisez votre vitalité dans le calme intérieur ou l''interaction sociale.', 'Répondez selon vos préférences spontanées hors contraintes professionnelles obligatoires.', 'L''orientation sociale est un continuum dynamique propre à chaque individu.', 'Test Introversion vs Extraversion Gratuit | PsychologyCalculator.com', 'Passez le test de personnalité introverti/extraverti en français avec résultat immédiat.', 'published'),
    ('trans_asm_ie_de', 'asm_intro_extro', 'de', 'Introvertiert vs. Extravertiert Test', 'Erfahren Sie, wie Sie Ihre Energie auftanken: Introvertiert, Ambivertiert oder Extravertiert.', 'Basierend auf den psychologischen Typen von C.G. Jung beschreibt dieser Test Ihre bevorzugte Reizverarbeitung und Energiegewinnung.', 'Bewerten Sie Ihre natürlichen Neigungen abseits beruflicher Verpflichtungen.', 'Soziale Orientierung ist ein Spektrum, das sich je nach Lebensphase und Kontext anpasst.', 'Introvertiert oder Extravertiert Test Online | PsychologyCalculator.com', 'Wissenschaftlicher Test zur Introversion und Extraversion auf Deutsch mit sofortigem Ergebnis.', 'published'),
    ('trans_asm_ie_pt', 'asm_intro_extro', 'pt', 'Teste de Introversão vs Extroversão', 'Mapeie como você recarrega sua energia social: Introvertido, Ambivertido ou Extrovertido.', 'Fundamentado nos tipos psicológicos de Carl Jung, este teste indica se sua vitalidade se renova no silêncio ou na troca social.', 'Avalie suas escolhas espontâneas em momentos livres de obrigações formais.', 'A orientação social é um contínuo dinâmico influenciado pelo ambiente.', 'Teste de Introversão e Extroversão Grátis | PsychologyCalculator.com', 'Descubra seu perfil social (introvertido, ambivertido ou extrovertido) em português.', 'published'),
    ('trans_asm_ie_hi', 'asm_intro_extro', 'hi', 'अंतर्मुखी बनाम बहिर्मुखी परीक्षण (Introvert vs Extrovert)', 'जानें कि आप अपनी सामाजिक ऊर्जा को कैसे रिचार्ज करते हैं: अंतर्मुखी, उभयमुखी (Ambivert), या बहिर्मुखी।', 'कार्ल जुंग के मनोवैज्ञानिक प्रकारों पर आधारित, यह परीक्षण आपकी संज्ञानात्मक ऊर्जा और सामाजिक प्राथमिकताओं को स्पष्ट करता है।', 'काम के दबाव से मुक्त होने पर अपनी स्वाभाविक प्राथमिकताओं के अनुसार उत्तर दें।', 'सामाजिक अभिविन्यास एक लचीला स्पेक्ट्रम है जो संदर्भ और ऊर्जा के स्तर पर निर्भर करता है।', 'इंट्रोवर्ट या एक्सट्रोवर्ट टेस्ट हिंदी में | PsychologyCalculator.com', 'हिंदी में जानें कि आप अंतर्मुखी, बहिर्मुखी या उभयमुखी हैं। त्वरित विश्लेषण प्राप्त करें।', 'published'),

    -- Self-Esteem Test (asm_self_esteem)
    ('trans_asm_se_es', 'asm_self_esteem', 'es', 'Test de Autoestima (Escala de Rosenberg)', 'Evalúa tu sentido fundamental de autovalía, autoaceptación incondicional y autoeficacia.', 'Inspirado en la prestigiosa escala de Morris Rosenberg, este test explora tu respeto propio y solidez interior sin etiquetas clínicas.', 'Indica qué tan identificado te sientes con cada afirmación en tu vida cotidiana.', 'Esta herramienta ofrece orientación para el desarrollo personal y no diagnostica trastornos depresivos.', 'Test de Autoestima Gratis Online | PsychologyCalculator.com', 'Mide tu nivel de autoestima y confianza personal en español con baremos psicométricos.', 'published'),
    ('trans_asm_se_fr', 'asm_self_esteem', 'fr', 'Test d''Estime de Soi (Échelle de Rosenberg)', 'Évaluez votre sentiment de valeur personnelle, votre auto-acceptation et votre confiance en vous.', 'Inspiré de l''échelle de Morris Rosenberg, ce questionnaire mesure le regard que vous portez sur vous-même.', 'Indiquez avec sincérité la mesure dans laquelle chaque phrase correspond à votre ressenti.', 'Ce test est un instrument de développement personnel et ne pose aucun diagnostic médical.', 'Test d''Estime de Soi Gratuit | PsychologyCalculator.com', 'Mesurez votre niveau d''estime de soi en français avec score et recommandations détaillées.', 'published'),
    ('trans_asm_se_de', 'asm_self_esteem', 'de', 'Selbstwertgefühl-Test (Rosenberg-Skala)', 'Erfassen Sie Ihr grundlegendes Gefühl für eigenen Wert, Selbstakzeptanz und Selbstwirksamkeit.', 'Angelehnt an die bewährte Rosenberg-Selbstwert-Skala misst dieser Test Ihre innere Stabilität und Selbstachtung.', 'Wählen Sie die Antwort, die Ihr inneres Lebensgefühl am besten beschreibt.', 'Dieser Test dient der Bildung und Selbstreflexion und ersetzt keine klinische Diagnostik.', 'Kostenloser Selbstwertgefühl-Test Online | PsychologyCalculator.com', 'Analysieren Sie Ihr Selbstwertgefühl und Selbstvertrauen auf Deutsch mit sofortiger Auswertung.', 'published'),
    ('trans_asm_se_pt', 'asm_self_esteem', 'pt', 'Teste de Autoestima (Escala de Rosenberg)', 'Avalie seu sentimento fundamental de valor próprio, autoaceitação incondicional e confiança.', 'Inspirado na clássica escala de Morris Rosenberg, este instrumento avalia sua solidez emocional e amor-próprio.', 'Indique o quanto cada afirmação descreve sua relação consigo mesmo.', 'Esta triagem tem caráter reflexivo e educativo, sem finalidade diagnóstica médica.', 'Teste de Autoestima Grátis Online | PsychologyCalculator.com', 'Avalie sua autoestima e segurança interior em português com resultados psicométricos claros.', 'published'),
    ('trans_asm_se_hi', 'asm_self_esteem', 'hi', 'आत्म-सम्मान परीक्षण (Rosenberg Self-Esteem)', 'अपने आत्म-मूल्य, बिना शर्त आत्म-स्वीकृति और आंतरिक आत्मविश्वास का मूल्यांकन करें।', 'मॉरिस रोसेनबर्ग के प्रसिद्ध पैमाने पर आधारित, यह मूल्यांकन आपके चरित्र और आत्म-सम्मान की गहराई को मापता है।', 'प्रत्येक कथन पर विचार करें कि वह आपके प्रति आपके वास्तविक दृष्टिकोण को कितना दर्शाता है।', 'यह परीक्षण केवल व्यक्तिगत चिंतन के लिए है और अवसादग्रस्तता या नैदानिक निदान नहीं है।', 'आत्म-सम्मान परीक्षण हिंदी में | PsychologyCalculator.com', 'हिंदी में अपनी आत्म-मूल्य और आत्मविश्वास की स्थिति का वैज्ञानिक मूल्यांकन करें।', 'published'),

    -- Communication Style (asm_communication)
    ('trans_asm_cs_es', 'asm_communication', 'es', 'Test de Estilos de Comunicación', 'Identifica tu enfoque conversacional predominante: Asertivo, Pasivo, Agresivo o Pasivo-Agresivo.', 'Los estilos de comunicación determinan cómo expresas tus límites, defiendes tus necesidades y escuchas a los demás.', 'Piensa en cómo manifiestas desacuerdos en conversaciones cruciales o de alta presión.', 'Los estilos comunicativos son hábitos aprendidos que pueden entrenarse conscientemente.', 'Test de Estilos de Comunicación y Asertividad | PsychologyCalculator.com', 'Descubre si tu comunicación es asertiva, pasiva o agresiva en español con pautas de mejora.', 'published'),
    ('trans_asm_cs_fr', 'asm_communication', 'fr', 'Test des Styles de Communication', 'Identifiez votre façon de communiquer : Assertive, Passive, Agressive ou Passive-Agressive.', 'Votre style d''échange influence votre capacité à poser des limites claires et à désamorcer les tensions.', 'Pensez à vos réactions courantes lors de désaccords ou d''échanges professionnels importants.', 'La communication est une compétence comportementale qui se perfectionne avec la pratique.', 'Test de Style de Communication Gratuit | PsychologyCalculator.com', 'Évaluez votre niveau d''assertivité et vos réflexes de dialogue en français.', 'published'),
    ('trans_asm_cs_de', 'asm_communication', 'de', 'Kommunikationsstil-Test', 'Erkennen Sie Ihr Gesprächsmuster: Assertiv (Durchsetzungsstark), Passiv, Aggressiv oder Passiv-Aggressiv.', 'Ihr Kommunikationsstil bestimmt, wie klar Sie Grenzen setzen, eigene Interessen vertreten und anderen zuhören.', 'Reflektieren Sie, wie Sie in Meinungsverschiedenheiten typischerweise reagieren.', 'Kommunikationsmuster sind erlernte Verhaltensweisen, die gezielt weiterentwickelt werden können.', 'Kommunikationsstil- & Durchsetzungs-Test | PsychologyCalculator.com', 'Wissenschaftlicher Kommunikations-Test auf Deutsch mit individuellen Feedback-Tipps.', 'published'),
    ('trans_asm_cs_pt', 'asm_communication', 'pt', 'Teste de Estilos de Comunicação', 'Identifique sua postura conversacional: Assertiva, Passiva, Agressiva ou Passivo-Agressiva.', 'Seu estilo de comunicação define como você expressa limites, defende seus pontos de vista e escuta os outros.', 'Pense em como você se posiciona em momentos de divergência de opinião.', 'Padrões de comunicação são hábitos comportamentais que podem ser aperfeiçoados continuamente.', 'Teste de Estilo de Comunicação Grátis | PsychologyCalculator.com', 'Descubra se seu estilo é assertivo ou passivo em português com diagnóstico dimensional.', 'published'),
    ('trans_asm_cs_hi', 'asm_communication', 'hi', 'संचार शैली परीक्षण (Communication Style)', 'अपनी बातचीत की प्राथमिक शैली पहचानें: मुखर (Assertive), निष्क्रिय (Passive), आक्रामक, या निष्क्रिय-आक्रामक।', 'संचार शैलियाँ यह तय करती हैं कि आप अपनी सीमाओं को कितनी स्पष्टता से रखते हैं और दूसरों की बात कैसे सुनते हैं।', 'महत्वपूर्ण या तनावपूर्ण चर्चाओं में अपनी स्वाभाविक प्रतिक्रिया के आधार पर उत्तर दें।', 'संचार शैलियाँ सीखी गई आदतें हैं जिन्हें अभ्यास द्वारा सुधारा जा सकता है।', 'संचार शैली परीक्षण ऑनलाइन | PsychologyCalculator.com', 'हिंदी में अपनी बातचीत और मुखरता (Assertiveness) का विश्लेषण करें।', 'published'),

    -- Conflict Style (asm_conflict)
    ('trans_asm_cf_es', 'asm_conflict', 'es', 'Test de Estilos de Conflicto (Thomas-Kilmann)', 'Descubre cómo negocias disputas: Colaborador, Comprometido, Complaciente, Competidor o Evasivo.', 'Basado en el modelo TKI (Thomas-Kilmann Conflict Mode), este test analiza cómo balanceas asertividad y cooperación en discrepancias.', 'Evalúa cómo respondes cuando tus metas chocan directamente con las de otra persona.', 'Todos los modos de conflicto son útiles según el contexto; ninguno es intrínsecamente superior.', 'Test de Resolución de Conflictos (TKI) Gratis | PsychologyCalculator.com', 'Realiza el test Thomas-Kilmann de manejo de conflictos en español con perfil dimensional.', 'published'),
    ('trans_asm_cf_fr', 'asm_conflict', 'fr', 'Test de Gestion des Conflits (Thomas-Kilmann)', 'Analysez vos réflexes face aux désaccords : Collaboration, Compromis, Conciliation, Compétition ou Évitement.', 'Fondé sur l''instrument TKI (Thomas-Kilmann), ce test mesure votre équilibre entre affirmation de soi et coopération.', 'Pensez à vos réactions lorsque vos intérêts entrent en contradiction avec ceux d''un tiers.', 'Chaque mode de résolution a sa pertinence selon la situation rencontrée.', 'Test de Gestion des Conflits Gratuit | PsychologyCalculator.com', 'Évaluez votre stratégie de négociation et de conciliation en français.', 'published'),
    ('trans_asm_cf_de', 'asm_conflict', 'de', 'Konfliktstil-Test (Thomas-Kilmann Modell)', 'Messen Sie Ihre Verhandlungsmuster: Kollaborativ, Kompromissbereit, Anpassend, Konkurrierend oder Vermeidend.', 'Basierend auf dem TKI-Modell von Thomas-Kilmann zeigt dieser Test die Balance aus Durchsetzungsstärke und Kooperation.', 'Denken Sie an Situationen zurück, in denen Ihre Ziele mit denen anderer kollidierten.', 'Alle fünf Konfliktstile haben ihren situationsbezogenen Nutzen und Wert.', 'Konfliktstil-Test (TKI) Online | PsychologyCalculator.com', 'Wissenschaftlicher Test zum Konfliktverhalten auf Deutsch mit fundierter Auswertung.', 'published'),
    ('trans_asm_cf_pt', 'asm_conflict', 'pt', 'Teste de Estilos de Conflito (Thomas-Kilmann)', 'Mapeie sua forma de gerenciar disputas: Colaborativo, Conciliador, Acomodativo, Competitivo ou Evitativo.', 'Baseado no modelo TKI de Thomas-Kilmann, este teste avalia seu equilíbrio entre assertividade e cooperação em impasses.', 'Pense em como você reage quando seus interesses entram em confronto direto com os de outrem.', 'Todos os cinco modos de lidar com conflitos têm aplicabilidade em contextos específicos.', 'Teste de Estilo de Conflito Grátis | PsychologyCalculator.com', 'Faça o teste de resolução de conflitos (TKI) em português com diagnóstico imediato.', 'published'),
    ('trans_asm_cf_hi', 'asm_conflict', 'hi', 'संघर्ष समाधान शैली परीक्षण (Thomas-Kilmann TKI)', 'तय करें कि आप विवादों का समाधान कैसे करते हैं: सहयोगी (Collaborating), समझौतावादी, समायोजक, प्रतिस्पर्धी, या टालने वाले।', 'थॉमस-किल्मन मॉडल पर आधारित, यह परीक्षण मापता है कि आप असहमति के दौरान अपने लक्ष्यों और रिश्तों में कैसे संतुलन बनाते हैं।', 'जब आपका हित किसी अन्य व्यक्ति से टकराता है, तो अपनी स्वाभाविक रणनीति के आधार पर उत्तर दें।', 'संघर्ष के सभी पाँच तरीके विशेष संदर्भों में उपयोगी होते हैं।', 'संघर्ष प्रबंधन शैली परीक्षण हिंदी में | PsychologyCalculator.com', 'हिंदी में अपनी संघर्ष समाधान रणनीति (TKI मॉडल) का मूल्यांकन करें।', 'published')
ON CONFLICT(assessment_id, locale) DO UPDATE SET
    name = excluded.name,
    short_description = excluded.short_description,
    long_description = excluded.long_description,
    instructions = excluded.instructions,
    disclaimer = excluded.disclaimer,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    updated_at = CURRENT_TIMESTAMP;

-- =========================================================================
-- 3. DIMENSION TRANSLATIONS (All Remaining Dimensions)
-- =========================================================================
INSERT INTO assessment_dimension_translations (id, dimension_id, locale, name, description)
VALUES
    -- Attachment Dimensions
    ('trans_dim_att_sec_es', 'dim_att_secure', 'es', 'Apego Seguro', 'Comodidad con la intimidad emocional, la vulnerabilidad mutua y la autonomía personal equilibrada.'),
    ('trans_dim_att_sec_fr', 'dim_att_secure', 'fr', 'Attachement Sécure', 'Aisance avec l''intimité émotionnelle, la vulnérabilité partagée et une autonomie équilibrée.'),
    ('trans_dim_att_sec_de', 'dim_att_secure', 'de', 'Sichere Bindung', 'Vertrauen in Nähe, emotionale Offenheit und gesunde zwischenmenschliche Unabhängigkeit.'),
    ('trans_dim_att_sec_pt', 'dim_att_secure', 'pt', 'Apego Seguro', 'Conforto com a intimidade emocional, vulnerabilidade recíproca e autonomia equilibrada.'),
    ('trans_dim_att_sec_hi', 'dim_att_secure', 'hi', 'सुरक्षित लगाव (Secure Attachment)', 'भावनात्मक निकटता, पारस्परिक भेद्यता और संतुलित व्यक्तिगत स्वतंत्रता में सहजता।'),

    ('trans_dim_att_anx_es', 'dim_att_anxious', 'es', 'Apego Ansioso-Preocupado', 'Fuerte deseo de cercanía acompañado de inquietud constante por el compromiso del otro.'),
    ('trans_dim_att_anx_fr', 'dim_att_anxious', 'fr', 'Attachement Anxieux', 'Recherche intense de proximité combinée à une inquiétude fréquente quant à l''engagement.'),
    ('trans_dim_att_anx_de', 'dim_att_anxious', 'de', 'Ängstliche Bindung', 'Hohes Bedürfnis nach Bestätigung verbunden mit Sorge vor emotionaler Distanz.'),
    ('trans_dim_att_anx_pt', 'dim_att_anxious', 'pt', 'Apego Ansioso', 'Desejo intenso de proximidade com preocupação frequente sobre a estabilidade da relação.'),
    ('trans_dim_att_anx_hi', 'dim_att_anxious', 'hi', 'चिंतित लगाव (Anxious Attachment)', 'निकटता की तीव्र इच्छा और साथी की प्रतिबद्धता को लेकर निरंतर चिंता।'),

    ('trans_dim_att_avd_es', 'dim_att_avoidant', 'es', 'Apego Evitativo-Desestimulante', 'Autosuficiencia defensiva que prioriza la distancia interpersonal sobre la intimidad profunda.'),
    ('trans_dim_att_avd_fr', 'dim_att_avoidant', 'fr', 'Attachement Évitant', 'Défense émotionnelle d''autosuffisance privilégiant la distance à la vulnérabilité.'),
    ('trans_dim_att_avd_de', 'dim_att_avoidant', 'de', 'Vermeidende Bindung', 'Starke Selbstgenügsamkeit, die emotionale Distanz tiefer Verletzlichkeit vorzieht.'),
    ('trans_dim_att_avd_pt', 'dim_att_avoidant', 'pt', 'Apego Evitativo', 'Autossuficiência defensiva que prioriza a distância em relação à vulnerabilidade.'),
    ('trans_dim_att_avd_hi', 'dim_att_avoidant', 'hi', 'परिहार लगाव (Avoidant Attachment)', 'भावनात्मक आत्मनिर्भरता जो गहरी निकटता के स्थान पर दूरी को प्राथमिकता देती है।'),

    ('trans_dim_att_fea_es', 'dim_att_fearful', 'es', 'Apego Temeroso-Evitativo (Desorganizado)', 'Deseo simultáneo de conexión íntima combinado con un intenso temor al dolor emocional.'),
    ('trans_dim_att_fea_fr', 'dim_att_fearful', 'fr', 'Attachement Craintif-Évitant', 'Désir de connexion profonde associé à une vive appréhension d''être blessé.'),
    ('trans_dim_att_fea_de', 'dim_att_fearful', 'de', 'Ängstlich-Vermeidende Bindung', 'Gleichzeitiger Wunsch nach Verbundenheit bei ausgeprägter Angst vor Verletzungen.'),
    ('trans_dim_att_fea_pt', 'dim_att_fearful', 'pt', 'Apego Desorganizado/Temeroso', 'Desejo simultâneo de proximidade com receio acentuado de vulnerabilidade.'),
    ('trans_dim_att_fea_hi', 'dim_att_fearful', 'hi', 'भयभीत लगाव (Fearful-Avoidant)', 'गहरे संबंध की तीव्र इच्छा के साथ आहत होने का गहरा डर।'),

    -- Love Languages Dimensions
    ('trans_dim_ll_words_es', 'dim_ll_words', 'es', 'Palabras de Afirmación', 'Elogios verbales sinceros, expresiones explícitas de aprecio y notas de gratitud.'),
    ('trans_dim_ll_words_fr', 'dim_ll_words', 'fr', 'Paroles Valorisantes', 'Compliments sincères, encouragements explicites et marques de reconnaissance verbales.'),
    ('trans_dim_ll_words_de', 'dim_ll_words', 'de', 'Worte der Anerkennung', 'Aufrichtiges Lob, verbale Wertschätzung und ermutigende Botschaften.'),
    ('trans_dim_ll_words_pt', 'dim_ll_words', 'pt', 'Palavras de Afirmação', 'Elogios sinceros, expressões verbais de carinho e reconhecimento.'),
    ('trans_dim_ll_words_hi', 'dim_ll_words', 'hi', 'प्रशंसा के शब्द (Words of Affirmation)', 'सच्ची मौखिक प्रशंसा, सराहना के शब्द और उत्साहवर्धक बातें।'),

    ('trans_dim_ll_time_es', 'dim_ll_time', 'es', 'Tiempo de Calidad', 'Atención plena e indivisible, contacto visual y vivencias compartidas significativas.'),
    ('trans_dim_ll_time_fr', 'dim_ll_time', 'fr', 'Moments de Qualité', 'Attention exclusive, présence attentive et expériences partagées sans distraction.'),
    ('trans_dim_ll_time_de', 'dim_ll_time', 'de', 'Zweisamkeit (Quality Time)', 'Ungeteilte Aufmerksamkeit, bewusste Präsenz und ungestörte gemeinsame Momente.'),
    ('trans_dim_ll_time_pt', 'dim_ll_time', 'pt', 'Tempo de Qualidade', 'Atenção dedicada, escuta atenta e momentos compartilhados sem distrações digitais.'),
    ('trans_dim_ll_time_hi', 'dim_ll_time', 'hi', 'गुणवत्तापूर्ण समय (Quality Time)', 'पूर्ण ध्यान, सार्थक उपस्थिति और बिना किसी रुकावट के साथ बिताए गए पल।'),

    ('trans_dim_ll_gifts_es', 'dim_ll_gifts', 'es', 'Recepción de Regalos', 'Símbolos visuales y tangibles de consideración, afecto y recuerdo.'),
    ('trans_dim_ll_gifts_fr', 'dim_ll_gifts', 'fr', 'Cadeaux Touchants', 'Attentions matérielles symbolisant la pensée, le soin et le souvenir.'),
    ('trans_dim_ll_gifts_de', 'dim_ll_gifts', 'de', 'Geschenke erhalten', 'Sichtbare Symbole der Aufmerksamkeit, Fürsorge und Verbundenheit.'),
    ('trans_dim_ll_gifts_pt', 'dim_ll_gifts', 'pt', 'Presentes Significativos', 'Símbolos visuais e gestos tangíveis de afeto e lembrança.'),
    ('trans_dim_ll_gifts_hi', 'dim_ll_gifts', 'hi', 'उपहार प्राप्त करना (Receiving Gifts)', 'विचारशीलता, देखभाल और अपनेपन के दृश्य और ठोस प्रतीक।'),

    ('trans_dim_ll_acts_es', 'dim_ll_acts', 'es', 'Actos de Servicio', 'Acciones prácticas y solidarias que alivian las responsabilidades cotidianas.'),
    ('trans_dim_ll_acts_fr', 'dim_ll_acts', 'fr', 'Services Rendus', 'Aide concrète et soutien pratique facilitant le quotidien.'),
    ('trans_dim_ll_acts_de', 'dim_ll_acts', 'de', 'Hilfsbereitschaft & Taten', 'Praktische Unterstützung und tatkräftige Entlastung im Alltag.'),
    ('trans_dim_ll_acts_pt', 'dim_ll_acts', 'pt', 'Atos de Serviço', 'Ações práticas e apoio no dia a dia que demonstram dedicação e cuidado.'),
    ('trans_dim_ll_acts_hi', 'dim_ll_acts', 'hi', 'सेवा के कार्य (Acts of Service)', 'मददगार कार्य और व्यावहारिक सहयोग जो दैनिक जिम्मेदारियों को आसान बनाते हैं।'),

    ('trans_dim_ll_touch_es', 'dim_ll_touch', 'es', 'Contacto Físico', 'Abrazos, calidez, tomarse de las manos y cercanía corporal reconfortante.'),
    ('trans_dim_ll_touch_fr', 'dim_ll_touch', 'fr', 'Contact Physique', 'Étreintes chaleureuses, gestes affectueux et proximité corporelle apaisante.'),
    ('trans_dim_ll_touch_de', 'dim_ll_touch', 'de', 'Körperliche Nähe', 'Umarmungen, Händchenhalten, Wärme und tröstende körperliche Zuneigung.'),
    ('trans_dim_ll_touch_pt', 'dim_ll_touch', 'pt', 'Toque Físico', 'Abraços, carinho, segurar as mãos e proximidade corporal reconfortante.'),
    ('trans_dim_ll_touch_hi', 'dim_ll_touch', 'hi', 'शारीरिक स्पर्श (Physical Touch)', 'गले लगना, हाथ थामना और आश्वस्त करने वाली शारीरिक निकटता।'),

    -- Emotional Intelligence Dimensions
    ('trans_dim_eq_aware_es', 'dim_eq_aware', 'es', 'Autoconciencia Emocional', 'Capacidad para identificar estados de ánimo internos, detonantes y su impacto conductual.'),
    ('trans_dim_eq_aware_fr', 'dim_eq_aware', 'fr', 'Conscience de Soi', 'Reconnaissance claire des émotions internes, déclencheurs et de leur impact.'),
    ('trans_dim_eq_aware_de', 'dim_eq_aware', 'de', 'Selbstwahrnehmung', 'Klares Erkennen eigener Stimmungen, Auslöser und Verhaltenswirkungen.'),
    ('trans_dim_eq_aware_pt', 'dim_eq_aware', 'pt', 'Autopercepção Emocional', 'Capacidade de identificar sentimentos internos, gatilhos e suas repercussões.'),
    ('trans_dim_eq_aware_hi', 'dim_eq_aware', 'hi', 'आत्म-जागरूकता (Self-Awareness)', 'आंतरिक मनोदशाओं, भावनात्मक ट्रिगर्स और उनके प्रभाव को स्पष्ट पहचानना।'),

    ('trans_dim_eq_reg_es', 'dim_eq_reg', 'es', 'Autorregulación Emocional', 'Gestión serena de impulsos y preservación de la calma bajo situaciones de estrés.'),
    ('trans_dim_eq_reg_fr', 'dim_eq_reg', 'fr', 'Autorégulation', 'Maîtrise des impulsions et maintien du calme dans les contextes exigeants.'),
    ('trans_dim_eq_reg_de', 'dim_eq_reg', 'de', 'Selbststeuerung', 'Konstruktiver Umgang mit Impulsen und Gelassenheit in Stresssituationen.'),
    ('trans_dim_eq_reg_pt', 'dim_eq_reg', 'pt', 'Autorregulação', 'Controle consciente de impulsos e manutenção da compostura sob estresse.'),
    ('trans_dim_eq_reg_hi', 'dim_eq_reg', 'hi', 'आत्म-नियमन (Self-Regulation)', 'आवेगों का प्रबंधन और तनाव की स्थिति में शांति बनाए रखना।'),

    ('trans_dim_eq_mot_es', 'dim_eq_mot', 'es', 'Motivación Intrínseca', 'Perseverancia orientada a metas con optimismo y resiliencia ante la frustración.'),
    ('trans_dim_eq_mot_fr', 'dim_eq_mot', 'fr', 'Motivation Intrinsèque', 'Persévérance vers les objectifs avec optimisme et résilience face aux obstacles.'),
    ('trans_dim_eq_mot_de', 'dim_eq_mot', 'de', 'Intrinsische Motivation', 'Zielstrebigkeit, Optimismus und Ausdauer auch bei Rückschlägen.'),
    ('trans_dim_eq_mot_pt', 'dim_eq_mot', 'pt', 'Motivação Interna', 'Persistência focada em objetivos com resiliência diante de desafios.'),
    ('trans_dim_eq_mot_hi', 'dim_eq_mot', 'hi', 'आंतरिक प्रेरणा (Internal Motivation)', 'आशावाद और दृढ़ता के साथ दीर्घकालिक लक्ष्यों की ओर अग्रसर रहना।'),

    ('trans_dim_eq_emp_es', 'dim_eq_emp', 'es', 'Empatía y Sensibilidad Interpersonal', 'Comprensión profunda de las perspectivas ajenas y de las emociones no verbalizadas.'),
    ('trans_dim_eq_emp_fr', 'dim_eq_emp', 'fr', 'Empathie Relationnelle', 'Perception des perspectives d''autrui et des émotions sous-jacentes.'),
    ('trans_dim_eq_emp_de', 'dim_eq_emp', 'de', 'Empathie & Einfühlungsvermögen', 'Fähigkeit, Perspektiven anderer und unausgesprochene Gefühle wahrzunehmen.'),
    ('trans_dim_eq_emp_pt', 'dim_eq_emp', 'pt', 'Empatia Interpessoal', 'Compreensão das perspectivas alheias e sensibilidade a emoções sutis.'),
    ('trans_dim_eq_emp_hi', 'dim_eq_emp', 'hi', 'सहानुभूति (Empathy)', 'दूसरों के दृष्टिकोण और बिना कहे उनकी भावनाओं को गहराई से समझना।'),

    ('trans_dim_eq_soc_es', 'dim_eq_soc', 'es', 'Habilidades Sociales y Diplomacia', 'Creación de sintonía, mediación de conflictos y facilitación del trabajo cooperativo.'),
    ('trans_dim_eq_soc_fr', 'dim_eq_soc', 'fr', 'Compétences Sociales', 'Facilité à créer du lien, désamorcer les tensions et fédérer les équipes.'),
    ('trans_dim_eq_soc_de', 'dim_eq_soc', 'de', 'Soziale Kompetenz', 'Aufbau tragfähiger Beziehungen, Konfliktentschärfung und Teamdynamik.'),
    ('trans_dim_eq_soc_pt', 'dim_eq_soc', 'pt', 'Habilidades Sociais', 'Facilidade em construir conexões, gerenciar conflitos e inspirar cooperação.'),
    ('trans_dim_eq_soc_hi', 'dim_eq_soc', 'hi', 'सामाजिक कौशल (Social Skills)', 'तालमेल बनाना, विवादों को सुलझाना और सहयोग को प्रेरित करना।'),

    -- Introvert / Extrovert Dimensions
    ('trans_dim_ie_intro_es', 'dim_ie_intro', 'es', 'Orientación a la Introversión', 'Recarga de vitalidad a través de la reflexión individual y entornos de baja estimulación.'),
    ('trans_dim_ie_intro_fr', 'dim_ie_intro', 'fr', 'Orientation Introversion', 'Régénération d''énergie par la solitude, le calme et la réflexion intérieure.'),
    ('trans_dim_ie_intro_de', 'dim_ie_intro', 'de', 'Introversion', 'Energiegewinnung durch Rückzug, Reflexion und reizarme Umgebungen.'),
    ('trans_dim_ie_intro_pt', 'dim_ie_intro', 'pt', 'Orientação à Introversão', 'Recarga de energia através da introspecção e ambientes tranquilos.'),
    ('trans_dim_ie_intro_hi', 'dim_ie_intro', 'hi', 'अंतर्मुखता (Introversion)', 'एकांत, आत्म-चिंतन और शांत वातावरण के माध्यम से ऊर्जा पुनः प्राप्त करना।'),

    ('trans_dim_ie_extro_es', 'dim_ie_extro', 'es', 'Orientación a la Extraversión', 'Recarga de vitalidad mediante la interacción social activa y el estímulo del entorno.'),
    ('trans_dim_ie_extro_fr', 'dim_ie_extro', 'fr', 'Orientation Extraversion', 'Régénération d''énergie par l''action collective et le dynamisme relationnel.'),
    ('trans_dim_ie_extro_de', 'dim_ie_extro', 'de', 'Extraversion', 'Energiegewinnung durch sozialen Austausch und dynamische Außenreize.'),
    ('trans_dim_ie_extro_pt', 'dim_ie_extro', 'pt', 'Orientação à Extroversão', 'Recarga de energia através do convívio social e novos estímulos.'),
    ('trans_dim_ie_extro_hi', 'dim_ie_extro', 'hi', 'बहिर्मुखता (Extraversion)', 'सक्रिय सामाजिक मेलजोल और नए अनुभवों के माध्यम से ऊर्जा प्राप्त करना।'),

    -- Self-Esteem Dimensions
    ('trans_dim_se_worth_es', 'dim_se_worth', 'es', 'Autovalía y Autoaceptación', 'Valoración intrínseca de la propia dignidad independiente de resultados externos.'),
    ('trans_dim_se_worth_fr', 'dim_se_worth', 'fr', 'Valeur Personnelle et Acceptation', 'Sentiment intrinsèque de dignité et d''estime personnelle inconditionnelle.'),
    ('trans_dim_se_worth_de', 'dim_se_worth', 'de', 'Selbstwert & Selbstannahme', 'Innere Überzeugung des eigenen Werts unabhängig von äußeren Urteilen.'),
    ('trans_dim_se_worth_pt', 'dim_se_worth', 'pt', 'Autovalorização e Autoaceitação', 'Sentimento de dignidade pessoal independente do desempenho externo.'),
    ('trans_dim_se_worth_hi', 'dim_se_worth', 'hi', 'आत्म-मूल्य और स्वीकृति (Self-Worth)', 'बाहरी परिणामों की परवाह किए बिना अपने चरित्र और गरिमा का आंतरिक सम्मान।'),

    ('trans_dim_se_eff_es', 'dim_se_eff', 'es', 'Autoeficacia y Confianza', 'Confianza en las capacidades para superar desafíos y alcanzar objetivos propios.'),
    ('trans_dim_se_eff_fr', 'dim_se_eff', 'fr', 'Auto-Efficacité et Confiance', 'Confiance en ses ressources pour surmonter les épreuves et progresser.'),
    ('trans_dim_se_eff_de', 'dim_se_eff', 'de', 'Selbstwirksamkeit & Zuversicht', 'Vertrauen in die eigenen Fähigkeiten, Herausforderungen zu meistern.'),
    ('trans_dim_se_eff_pt', 'dim_se_eff', 'pt', 'Autoeficácia e Confiança', 'Certeza na própria capacidade de enfrentar desafios e atingir metas.'),
    ('trans_dim_se_eff_hi', 'dim_se_eff', 'hi', 'आत्म-प्रभावकारिता (Self-Efficacy)', 'चुनौतियों को पार करने और लक्ष्य हासिल करने की अपनी क्षमता पर भरोसा।'),

    -- Communication Style Dimensions
    ('trans_dim_cs_assert_es', 'dim_cs_assert', 'es', 'Comunicación Asertiva', 'Expresión directa y respetuosa de necesidades honrando los derechos de los demás.'),
    ('trans_dim_cs_assert_fr', 'dim_cs_assert', 'fr', 'Communication Assertive', 'Affirmation claire et respectueuse de ses besoins dans le respect d''autrui.'),
    ('trans_dim_cs_assert_de', 'dim_cs_assert', 'de', 'Assertive Kommunikation', 'Klare und respektvolle Äußerung von Bedürfnissen auf Augenhöhe.'),
    ('trans_dim_cs_assert_pt', 'dim_cs_assert', 'pt', 'Comunicação Assertiva', 'Expressão clara e respeitosa de necessidades respeitando o próximo.'),
    ('trans_dim_cs_assert_hi', 'dim_cs_assert', 'hi', 'मुखर संचार (Assertive Communication)', 'दूसरों के अधिकारों का सम्मान करते हुए अपनी बात स्पष्ट और शांत तरीके से रखना।'),

    ('trans_dim_cs_pass_es', 'dim_cs_pass', 'es', 'Comunicación Pasiva', 'Represión de preferencias propias para evitar desacuerdos o confrontaciones.'),
    ('trans_dim_cs_pass_fr', 'dim_cs_pass', 'fr', 'Communication Passive', 'Tendance à taire ses besoins pour préserver la paix ou éviter le conflit.'),
    ('trans_dim_cs_pass_de', 'dim_cs_pass', 'de', 'Passive Kommunikation', 'Zurückhalten eigener Wünsche zur Vermeidung von Unstimmigkeiten.'),
    ('trans_dim_cs_pass_pt', 'dim_cs_pass', 'pt', 'Comunicação Passiva', 'Supressão de vontades próprias para evitar descontentamentos.'),
    ('trans_dim_cs_pass_hi', 'dim_cs_pass', 'hi', 'निष्क्रिय संचार (Passive Communication)', 'विवाद या टकराव से बचने के लिए अपनी प्राथमिकताओं को दबाना।'),

    ('trans_dim_cs_aggr_es', 'dim_cs_aggr', 'es', 'Comunicación Agresiva', 'Búsqueda de conformidad mediante interrupciones, imposición o dominación.'),
    ('trans_dim_cs_aggr_fr', 'dim_cs_aggr', 'fr', 'Communication Agressive', 'Imposition de son point de vue avec fermeté excessive ou domination.'),
    ('trans_dim_cs_aggr_de', 'dim_cs_aggr', 'de', 'Aggressive Kommunikation', 'Durchsetzung eigener Ziele durch Dominanz oder Unterbrechung.'),
    ('trans_dim_cs_aggr_pt', 'dim_cs_aggr', 'pt', 'Comunicação Agressiva', 'Imposição de pontos de vista mediante dominação ou autoritarismo.'),
    ('trans_dim_cs_aggr_hi', 'dim_cs_aggr', 'hi', 'आक्रामक संचार (Aggressive Communication)', 'दबाव, टोकने या हावी होने के माध्यम से अपनी बात मनवाना।'),

    ('trans_dim_cs_pass_aggr_es', 'dim_cs_pass_aggr', 'es', 'Patrón Pasivo-Agresivo', 'Manifestación indirecta de molestia mediante sarcasmo sutil o postergación.'),
    ('trans_dim_cs_pass_aggr_fr', 'dim_cs_pass_aggr', 'fr', 'Communication Passive-Agressive', 'Expression indirecte de la frustration par l''ironie ou la rétention.'),
    ('trans_dim_cs_pass_aggr_de', 'dim_cs_pass_aggr', 'de', 'Passiv-Aggressives Muster', 'Indirekte Frustrationsäußerung durch Ironie oder Verzögerung.'),
    ('trans_dim_cs_pass_aggr_pt', 'dim_cs_pass_aggr', 'pt', 'Padrão Passivo-Agressivo', 'Expressão indireta de frustração através de ironia ou omissão.'),
    ('trans_dim_cs_pass_aggr_hi', 'dim_cs_pass_aggr', 'hi', 'निष्क्रिय-आक्रामक संचार (Passive-Aggressive)', 'व्यंग्य या अप्रत्यक्ष तरीकों से असंतोष व्यक्त करना।'),

    -- Conflict Style Dimensions (Thomas-Kilmann)
    ('trans_dim_cf_collab_es', 'dim_cf_collab', 'es', 'Estilo Colaborativo (Ganar-Ganar)', 'Búsqueda profunda de soluciones creativas que satisfagan plenamente a ambas partes.'),
    ('trans_dim_cf_collab_fr', 'dim_cf_collab', 'fr', 'Style Collaboratif (Gagnant-Gagnant)', 'Recherche approfondie de solutions intégratives satisfaisant chacun.'),
    ('trans_dim_cf_collab_de', 'dim_cf_collab', 'de', 'Kollaborativer Stil (Win-Win)', 'Tiefgehendes Erarbeiten integrativer Lösungen zum beiderseitigen Nutzen.'),
    ('trans_dim_cf_collab_pt', 'dim_cf_collab', 'pt', 'Estilo Colaborativo (Ganha-Ganha)', 'Busca ativa por soluções integrativas que atendam plenamente a ambas as partes.'),
    ('trans_dim_cf_collab_hi', 'dim_cf_collab', 'hi', 'सहयोगी शैली (Collaborating Win-Win)', 'दोनों पक्षों को पूरी तरह संतुष्ट करने वाले रचनात्मक समाधान खोजना।'),

    ('trans_dim_cf_comp_es', 'dim_cf_comp', 'es', 'Estilo Comprometido (Negociación)', 'Enfoque práctico de concesión mutua para alcanzar un acuerdo rápido.'),
    ('trans_dim_cf_comp_fr', 'dim_cf_comp', 'fr', 'Style de Compromis (Donnant-Donnant)', 'Recherche d''un juste milieu pragmatique où chacun fait une concession.'),
    ('trans_dim_cf_comp_de', 'dim_cf_comp', 'de', 'Kompromissbereiter Stil', 'Pragmatische Suche nach schnellen, beiderseits tragfähigen Mittelwegen.'),
    ('trans_dim_cf_comp_pt', 'dim_cf_comp', 'pt', 'Estilo Conciliador (Compromisso)', 'Abordagem prática de concessões mútuas para um acordo equilibrado.'),
    ('trans_dim_cf_comp_hi', 'dim_cf_comp', 'hi', 'समझौतावादी शैली (Compromising)', 'पारस्परिक सहमति से व्यावहारिक मध्य मार्ग निकालना।'),

    ('trans_dim_cf_accom_es', 'dim_cf_accom', 'es', 'Estilo Complaciente (Prioridad a la Armonía)', 'Cesión generosa ante las preferencias del otro para cuidar la relación afectiva.'),
    ('trans_dim_cf_accom_fr', 'dim_cf_accom', 'fr', 'Style Conciliant (Harmonie)', 'Tendance à privilégier la relation en cédant aux demandes d''autrui.'),
    ('trans_dim_cf_accom_de', 'dim_cf_accom', 'de', 'Anpassender Stil (Harmonieorientiert)', 'Nachgeben zugunsten zwischenmenschlicher Harmonie und Beziehungspflege.'),
    ('trans_dim_cf_accom_pt', 'dim_cf_accom', 'pt', 'Estilo Acomodativo (Harmonia)', 'Cedência consciente para preservar a harmonia interpessoal.'),
    ('trans_dim_cf_accom_hi', 'dim_cf_accom', 'hi', 'समायोजक शैली (Accommodating)', 'रिश्ते में सद्भाव बनाए रखने के लिए दूसरों की प्राथमिकता को महत्व देना।'),

    ('trans_dim_cf_compete_es', 'dim_cf_compete', 'es', 'Estilo Competidor (Firmeza)', 'Defensa decidida de los objetivos propios con alta asertividad.'),
    ('trans_dim_cf_compete_fr', 'dim_cf_compete', 'fr', 'Style Compétitif (Fermeté)', 'Défense vigoureuse de ses convictions et objectifs personnels.'),
    ('trans_dim_cf_compete_de', 'dim_cf_compete', 'de', 'Konkurrierender Stil (Zielorientiert)', 'Konsequente Vertretung eigener Positionen und berechtigter Interessen.'),
    ('trans_dim_cf_compete_pt', 'dim_cf_compete', 'pt', 'Estilo Competitivo (Firmeza)', 'Defesa assertiva e determinada dos próprios objetivos.'),
    ('trans_dim_cf_compete_hi', 'dim_cf_compete', 'hi', 'प्रतिस्पर्धी शैली (Competing)', 'मजबूत मुखरता के साथ अपने सिद्धांतों और लक्ष्यों की रक्षा करना।'),

    ('trans_dim_cf_avoid_es', 'dim_cf_avoid', 'es', 'Estilo Evasivo (Prudencia)', 'Postergación estratégica o desescalada de confrontaciones tensas.'),
    ('trans_dim_cf_avoid_fr', 'dim_cf_avoid', 'fr', 'Style Évitant (Désescalade)', 'Prudence temporaire ou report des discussions conflictuelles à chaud.'),
    ('trans_dim_cf_avoid_de', 'dim_cf_avoid', 'de', 'Vermeidender Stil (Deeskalation)', 'Aufschieben oder Ausweichen bei akuter emotionaler Überhitzung.'),
    ('trans_dim_cf_avoid_pt', 'dim_cf_avoid', 'pt', 'Estilo Evitativo (Prudência)', 'Pausa estratégica para evitar desgastes emocionais desnecessários.'),
    ('trans_dim_cf_avoid_hi', 'dim_cf_avoid', 'hi', 'टालने वाली शैली (Avoiding)', 'भावनात्मक तनाव कम होने तक तत्काल टकराव को टालना।')
ON CONFLICT(dimension_id, locale) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    updated_at = CURRENT_TIMESTAMP;

-- =========================================================================
-- 4. QUESTION TRANSLATIONS (All 45 Items in Spanish, French, German, Portuguese, Hindi)
-- =========================================================================
INSERT INTO assessment_question_translations (id, question_id, locale, question_text)
VALUES
    -- Big Five Questions (q_bf_1 to q_bf_10)
    ('trans_q_bf_1_es', 'q_bf_1', 'es', 'Disfruto explorar conceptos abstractos, expresiones artísticas y teorías poco convencionales.'),
    ('trans_q_bf_1_fr', 'q_bf_1', 'fr', 'J''aime explorer des concepts philosophiques abstraits, l''art et de nouvelles théories.'),
    ('trans_q_bf_1_de', 'q_bf_1', 'de', 'Ich vertiefe mich gern in abstrakte philosophische Ideen, Kunst und neue Konzepte.'),
    ('trans_q_bf_1_pt', 'q_bf_1', 'pt', 'Gosto de explorar conceitos abstratos, expressões artísticas e teorias inovadoras.'),
    ('trans_q_bf_1_hi', 'q_bf_1', 'hi', 'मुझे अमूर्त दार्शनिक अवधारणाओं, कला और नए सिद्धांतों की खोज करने में आनंद आता है।'),

    ('trans_q_bf_2_es', 'q_bf_2', 'es', 'Tengo una imaginación activa y genero constantemente ideas originales.'),
    ('trans_q_bf_2_fr', 'q_bf_2', 'fr', 'J''ai une imagination fertile et formule régulièrement des idées inédites.'),
    ('trans_q_bf_2_de', 'q_bf_2', 'de', 'Ich besitze eine lebhafte Fantasie und entwickle regelmäßig kreative Gedanken.'),
    ('trans_q_bf_2_pt', 'q_bf_2', 'pt', 'Tenho uma imaginação ativa e costumo gerar ideias criativas e originais.'),
    ('trans_q_bf_2_hi', 'q_bf_2', 'hi', 'मेरी कल्पनाशीलता सक्रिय है और मैं नियमित रूप से नए विचार विकसित करता/करती हूँ।'),

    ('trans_q_bf_3_es', 'q_bf_3', 'es', 'Mantengo mi entorno ordenado y termino mis proyectos antes de las fechas límite.'),
    ('trans_q_bf_3_fr', 'q_bf_3', 'fr', 'J''organise soigneusement mes espaces et termine mes projets dans les délais.'),
    ('trans_q_bf_3_de', 'q_bf_3', 'de', 'Ich halte meine Arbeitsumgebung strukturiert und schließe Aufgaben vor Fristende ab.'),
    ('trans_q_bf_3_pt', 'q_bf_3', 'pt', 'Mantenho meus espaços organizados e concluo tarefas antes dos prazos finais.'),
    ('trans_q_bf_3_hi', 'q_bf_3', 'hi', 'मैं अपने कार्यक्षेत्र को व्यवस्थित रखता/रखती हूँ और समय सीमा से पहले कार्य पूरे करता/करती हूँ।'),

    ('trans_q_bf_4_es', 'q_bf_4', 'es', 'Presto minuciosa atención a los detalles y prefiero una ejecución rigurosa y metódica.'),
    ('trans_q_bf_4_fr', 'q_bf_4', 'fr', 'J''accorde une grande attention aux détails et privilégie une méthode rigoureuse.'),
    ('trans_q_bf_4_de', 'q_bf_4', 'de', 'Ich achte sehr auf Genauigkeit und bevorzuge strukturiertes, sorgfältiges Vorgehen.'),
    ('trans_q_bf_4_pt', 'q_bf_4', 'pt', 'Presto muita atenção aos detalhes e prefiro um trabalho metódico e cuidadoso.'),
    ('trans_q_bf_4_hi', 'q_bf_4', 'hi', 'मैं बारीकियों पर पूरा ध्यान देता/देती हूँ और व्यवस्थित ढंग से काम करना पसंद करता/करती हूँ।'),

    ('trans_q_bf_5_es', 'q_bf_5', 'es', 'Me siento lleno de energía tras participar activamente en conversaciones grupales dinámicas.'),
    ('trans_q_bf_5_fr', 'q_bf_5', 'fr', 'Je me sens dynamisé après avoir pris part à des échanges stimulants en groupe.'),
    ('trans_q_bf_5_de', 'q_bf_5', 'de', 'Ich fühle mich belebt und voller Energie nach lebhaften Gesprächen in Gruppen.'),
    ('trans_q_bf_5_pt', 'q_bf_5', 'pt', 'Sinto-me energizado ao participar ativamente de conversas e encontros sociais.'),
    ('trans_q_bf_5_hi', 'q_bf_5', 'hi', 'समूह चर्चाओं में सक्रिय रूप से भाग लेने के बाद मैं ऊर्जावान महसूस करता/करती हूँ।'),

    ('trans_q_bf_6_es', 'q_bf_6', 'es', 'Tomo la iniciativa con naturalidad en situaciones sociales y expreso mi postura con soltura.'),
    ('trans_q_bf_6_fr', 'q_bf_6', 'fr', 'Je prends facilement l''initiative dans les contextes sociaux et m''exprime avec aisance.'),
    ('trans_q_bf_6_de', 'q_bf_6', 'de', 'Ich ergreife in Gesellschaft spontan die Initiative und äußere meine Meinung klar.'),
    ('trans_q_bf_6_pt', 'q_bf_6', 'pt', 'Tomo a iniciativa em situações sociais e expresso minha opinião com naturalidade.'),
    ('trans_q_bf_6_hi', 'q_bf_6', 'hi', 'मैं सामाजिक स्थितियों में सहजता से पहल करता/करती हूँ और अपने विचार आसानी से व्यक्त करता/करती हूँ।'),

    ('trans_q_bf_7_es', 'q_bf_7', 'es', 'Percibo con claridad las emociones de los demás y busco apoyarlos con empatía.'),
    ('trans_q_bf_7_fr', 'q_bf_7', 'fr', 'Je suis très attentif aux sentiments des autres et m''efforce de les épauler.'),
    ('trans_q_bf_7_de', 'q_bf_7', 'de', 'Ich spüre rasch, wie sich andere fühlen, und unterstütze sie hilfsbereit.'),
    ('trans_q_bf_7_pt', 'q_bf_7', 'pt', 'Percebo com facilidade o que os outros sentem e busco oferecer apoio sincero.'),
    ('trans_q_bf_7_hi', 'q_bf_7', 'hi', 'मैं दूसरों की भावनाओं को समझता/समझती हूँ और उनकी मदद के लिए तत्पर रहता/रहती हूँ।'),

    ('trans_q_bf_8_es', 'q_bf_8', 'es', 'Priorizo la comprensión mutua y la cooperación sobre la confrontación competitiva.'),
    ('trans_q_bf_8_fr', 'q_bf_8', 'fr', 'Je privilégie l''entente mutuelle et la coopération plutôt que l''affrontement.'),
    ('trans_q_bf_8_de', 'q_bf_8', 'de', 'Ich setze auf gegenseitiges Verständnis und Kooperation statt auf Rivalität.'),
    ('trans_q_bf_8_pt', 'q_bf_8', 'pt', 'Priorizo o entendimento mútuo e a harmonia em vez de discussões competitivas.'),
    ('trans_q_bf_8_hi', 'q_bf_8', 'hi', 'मैं प्रतिस्पर्धात्मक टकराव के बजाय आपसी समझ और सहयोग को प्राथमिकता देता/देती हूँ।'),

    ('trans_q_bf_9_es', 'q_bf_9', 'es', 'Mantengo la serenidad y la claridad mental cuando surgen imprevistos o emergencias.'),
    ('trans_q_bf_9_fr', 'q_bf_9', 'fr', 'Je reste calme, posé et lucide face aux imprévus ou situations d''urgence.'),
    ('trans_q_bf_9_de', 'q_bf_9', 'de', 'Ich bewahre Ruhe und einen klaren Kopf bei unerwarteten Herausforderungen.'),
    ('trans_q_bf_9_pt', 'q_bf_9', 'pt', 'Permaneço tranquilo e focado quando imprevistos e emergências acontecem.'),
    ('trans_q_bf_9_hi', 'q_bf_9', 'hi', 'अप्रत्याशित आपात स्थितियों में मैं शांत, स्थिर और स्पष्ट सोच बनाए रखता/रखती हूँ।'),

    ('trans_q_bf_10_es', 'q_bf_10', 'es', 'Rara vez me abruman pensamientos ansiosos o la incertidumbre del día a día.'),
    ('trans_q_bf_10_fr', 'q_bf_10', 'fr', 'Je suis rarement envahi par des pensées anxieuses ou le doute du quotidien.'),
    ('trans_q_bf_10_de', 'q_bf_10', 'de', 'Ich lasse mich von alltäglichen Ungewissheiten selten verunsichern oder stressen.'),
    ('trans_q_bf_10_pt', 'q_bf_10', 'pt', 'Raramente me sinto sobrecarregado por pensamentos ansiosos ou incertezas.'),
    ('trans_q_bf_10_hi', 'q_bf_10', 'hi', 'दैनिक अनिश्चितताओं या चिंताजनक विचारों से मैं शायद ही कभी परेशान होता/होती हूँ।'),

    -- Attachment Questions (q_att_1 to q_att_8)
    ('trans_q_att_1_es', 'q_att_1', 'es', 'Me resulta sencillo expresar vulnerabilidad y apoyarme en mi pareja cuando lo necesito.'),
    ('trans_q_att_1_fr', 'q_att_1', 'fr', 'Il m''est facile d''exprimer ma vulnérabilité et de compter sur mon partenaire.'),
    ('trans_q_att_1_de', 'q_att_1', 'de', 'Es fällt mir leicht, mich verletzlich zu zeigen und bei Bedarf auf meinen Partner zu vertrauen.'),
    ('trans_q_att_1_pt', 'q_att_1', 'pt', 'Acho relativamente fácil expressar vulnerabilidade e confiar no meu parceiro.'),
    ('trans_q_att_1_hi', 'q_att_1', 'hi', 'अपनी कमजोरियों को साझा करना और आवश्यकता पड़ने पर साथी पर भरोसा करना मुझे आसान लगता है।'),

    ('trans_q_att_2_es', 'q_att_2', 'es', 'Me siento cómodo con la intimidad emocional mutua sin temer perder mi independencia.'),
    ('trans_q_att_2_fr', 'q_att_2', 'fr', 'Je vis l''intimité émotionnelle sereinement sans craindre de perdre mon autonomie.'),
    ('trans_q_att_2_de', 'q_att_2', 'de', 'Ich schätze emotionale Nähe, ohne Angst vor dem Verlust meiner Unabhängigkeit zu haben.'),
    ('trans_q_att_2_pt', 'q_att_2', 'pt', 'Sinto-me confortável com a intimidade sem medo de perder minha autonomia pessoal.'),
    ('trans_q_att_2_hi', 'q_att_2', 'hi', 'मैं स्वतंत्रता खोने के डर के बिना भावनात्मक निकटता में सहज महसूस करता/करती हूँ।'),

    ('trans_q_att_3_es', 'q_att_3', 'es', 'A menudo me preocupa que mi pareja pierda el interés o termine la relación.'),
    ('trans_q_att_3_fr', 'q_att_3', 'fr', 'Je crains fréquemment que mon partenaire se désintéresse de notre relation.'),
    ('trans_q_att_3_de', 'q_att_3', 'de', 'Ich sorge mich oft, mein Partner könnte das Interesse verlieren oder mich verlassen.'),
    ('trans_q_att_3_pt', 'q_att_3', 'pt', 'Costumo me preocupar com o risco de meu parceiro perder o interesse ou se afastar.'),
    ('trans_q_att_3_hi', 'q_att_3', 'hi', 'मुझे अक्सर चिंता होती है कि मेरा साथी रुचि खो देगा या रिश्ता छोड़ देगा।'),

    ('trans_q_att_4_es', 'q_att_4', 'es', 'Cuando mi pareja se muestra distante, siento una necesidad urgente de buscar confirmación de afecto.'),
    ('trans_q_att_4_fr', 'q_att_4', 'fr', 'Si mon partenaire prend de la distance, j''éprouve un besoin urgent d''être rassuré.'),
    ('trans_q_att_4_de', 'q_att_4', 'de', 'Wenn mein Partner distanzierter wirkt, verspüre ich sofort den Drang nach Bestätigung.'),
    ('trans_q_att_4_pt', 'q_att_4', 'pt', 'Quando meu parceiro fica distante, sinto uma urgência intensa de pedir confirmação.'),
    ('trans_q_att_4_hi', 'q_att_4', 'hi', 'जब मेरा साथी दूर लगता है, तो मुझे तुरंत आश्वासन पाने की बेचैनी महसूस होती है।'),

    ('trans_q_att_5_es', 'q_att_5', 'es', 'Me incomoda cuando una relación se vuelve excesivamente cercana o dependiente.'),
    ('trans_q_att_5_fr', 'q_att_5', 'fr', 'Je me sens mal à l''aise lorsqu''une relation devient trop fusionnelle ou dépendante.'),
    ('trans_q_att_5_de', 'q_att_5', 'de', 'Es behagt mir nicht, wenn eine Beziehung zu eng oder emotional anhänglich wird.'),
    ('trans_q_att_5_pt', 'q_att_5', 'pt', 'Fico desconfortável quando as relações se tornam excessivamente dependentes.'),
    ('trans_q_att_5_hi', 'q_att_5', 'hi', 'जब रिश्ते अत्यधिक भावनात्मक रूप से निर्भर हो जाते हैं तो मुझे असहजता होती है।'),

    ('trans_q_att_6_es', 'q_att_6', 'es', 'Prefiero solucionar mis dificultades personales por mi cuenta sin buscar apoyo emocional.'),
    ('trans_q_att_6_fr', 'q_att_6', 'fr', 'Je préfère gérer mes problèmes en toute autonomie sans solliciter de soutien.'),
    ('trans_q_att_6_de', 'q_att_6', 'de', 'Ich löse persönliche Probleme am liebsten allein, ohne um Beistand zu bitten.'),
    ('trans_q_att_6_pt', 'q_att_6', 'pt', 'Prefiro resolver meus desafios de forma totalmente independente.'),
    ('trans_q_att_6_hi', 'q_att_6', 'hi', 'मैं भावनात्मक समर्थन के बिना अपनी व्यक्तिगत समस्याओं को स्वतंत्र रूप से हल करना पसंद करता/करती हूँ।'),

    ('trans_q_att_7_es', 'q_att_7', 'es', 'Deseo sinceramente una conexión profunda, pero tiendo a alejarme cuando alguien se acerca demasiado.'),
    ('trans_q_att_7_fr', 'q_att_7', 'fr', 'Je désire une vraie proximité, mais j''ai le réflexe de reculer quand on s''approche trop.'),
    ('trans_q_att_7_de', 'q_att_7', 'de', 'Ich sehne mich nach Nähe, ziehe mich jedoch zurück, sobald mir jemand zu nahe kommt.'),
    ('trans_q_att_7_pt', 'q_att_7', 'pt', 'Desejo conexão profunda, mas recuo quando alguém se aproxima em excesso.'),
    ('trans_q_att_7_hi', 'q_att_7', 'hi', 'मैं गहरा संबंध चाहता/चाहती हूँ, लेकिन जब कोई बहुत करीब आता है तो मैं पीछे हट जाता/जाती हूँ।'),

    ('trans_q_att_8_es', 'q_att_8', 'es', 'Experimento sentimientos encontrados: deseo intimidad profunda pero temo salir lastimado.'),
    ('trans_q_att_8_fr', 'q_att_8', 'fr', 'Je ressens des élans contradictoires : besoin d''intimité et peur constante de souffrir.'),
    ('trans_q_att_8_de', 'q_att_8', 'de', 'Ich erlebe oft einen Zwiespalt: Sehnsucht nach Vertrautheit bei gleichzeitiger Angst vor Schmerz.'),
    ('trans_q_att_8_pt', 'q_att_8', 'pt', 'Sinto emoções conflitantes: quero intimidade, mas antecipo a dor da decepção.'),
    ('trans_q_att_8_hi', 'q_att_8', 'hi', 'मुझे अक्सर विरोधाभासी भावनाएं होती हैं: गहरी निकटता की चाह और आहत होने का डर।'),

    -- Love Language Questions (q_ll_1 to q_ll_5)
    ('trans_q_ll_1_es', 'q_ll_1', 'es', 'Recibir elogios sinceros y palabras explícitas de agradecimiento me hace sentir profundamente querido.'),
    ('trans_q_ll_1_fr', 'q_ll_1', 'fr', 'Entendre des compliments sincères et des remerciements me fait me sentir très aimé.'),
    ('trans_q_ll_1_de', 'q_ll_1', 'de', 'Ehrliches verbales Lob und Zuspruch geben mir das stärkste Gefühl von Liebe und Wertschätzung.'),
    ('trans_q_ll_1_pt', 'q_ll_1', 'pt', 'Ouvir elogios sinceros e palavras de reconhecimento me faz sentir muito amado.'),
    ('trans_q_ll_1_hi', 'q_ll_1', 'hi', 'सच्ची प्रशंसा और सराहना के शब्द सुनना मुझे गहराई से प्रिय महसूस कराता है।'),

    ('trans_q_ll_2_es', 'q_ll_2', 'es', 'Compartir momentos exclusivos e ininterrumpidos sin pantallas es lo más valioso para mí.'),
    ('trans_q_ll_2_fr', 'q_ll_2', 'fr', 'Partager des moments à deux sans distractions numériques est ce qui compte le plus.'),
    ('trans_q_ll_2_de', 'q_ll_2', 'de', 'Ungestörte Zweisamkeit ohne digitale Ablenkungen bedeutet mir in einer Beziehung am meisten.'),
    ('trans_q_ll_2_pt', 'q_ll_2', 'pt', 'Ter tempo dedicado a sós sem distrações de celular é o que mais valorizo.'),
    ('trans_q_ll_2_hi', 'q_ll_2', 'hi', 'बिना डिजिटल बाधाओं के एक साथ समर्पित समय बिताना मेरे लिए सबसे महत्वपूर्ण है।'),

    ('trans_q_ll_3_es', 'q_ll_3', 'es', 'Recibir un detalle o regalo inesperado me demuestra que mi pareja pensaba en mí.'),
    ('trans_q_ll_3_fr', 'q_ll_3', 'fr', 'Recevoir un cadeau inattendu et attentionné me prouve que mon partenaire a pensé à moi.'),
    ('trans_q_ll_3_de', 'q_ll_3', 'de', 'Ein aufmerksames, überraschendes Geschenk zeigt mir, dass mein Partner an mich gedacht hat.'),
    ('trans_q_ll_3_pt', 'q_ll_3', 'pt', 'Receber um presente carinhoso e inesperado me mostra que a pessoa pensou em mim.'),
    ('trans_q_ll_3_hi', 'q_ll_3', 'hi', 'अचानक सोचा-समझा उपहार मिलना दर्शाता है कि मेरा साथी मेरे बारे में सोच रहा था।'),

    ('trans_q_ll_4_es', 'q_ll_4', 'es', 'Cuando mi pareja me ayuda proactivamente con tareas pesadas, me siento profundamente respaldado.'),
    ('trans_q_ll_4_fr', 'q_ll_4', 'fr', 'Lorsque mon partenaire m''aide spontanément dans mes tâches, je me sens vraiment soutenu.'),
    ('trans_q_ll_4_de', 'q_ll_4', 'de', 'Wenn mir mein Partner unaufgefordert bei anstrengenden Aufgaben hilft, fühle ich mich geborgen.'),
    ('trans_q_ll_4_pt', 'q_ll_4', 'pt', 'Quando meu parceiro me ajuda com tarefas difíceis sem que eu precise pedir, sinto-me apoiado.'),
    ('trans_q_ll_4_hi', 'q_ll_4', 'hi', 'जब मेरा साथी कठिन कार्यों में आगे बढ़कर मेरी मदद करता है, तो मुझे बहुत सहयोग महसूस होता है।'),

    ('trans_q_ll_5_es', 'q_ll_5', 'es', 'El afecto físico, como abrazarse o tomarse de las manos, es fundamental para mi felicidad en pareja.'),
    ('trans_q_ll_5_fr', 'q_ll_5', 'fr', 'Les marques d''affection physique (câlins, se tenir la main) sont indispensables à mon bonheur.'),
    ('trans_q_ll_5_de', 'q_ll_5', 'de', 'Körperliche Nähe wie Umarmungen oder Händchenhalten ist für mein Beziehungsglück essenziell.'),
    ('trans_q_ll_5_pt', 'q_ll_5', 'pt', 'O carinho físico, como abraços e beijos, é essencial para minha felicidade no relacionamento.'),
    ('trans_q_ll_5_hi', 'q_ll_5', 'hi', 'शारीरिक स्नेह (जैसे हाथ पकड़ना या गले लगाना) मेरे रिश्ते की खुशी के लिए आवश्यक है।'),

    -- Emotional Intelligence Questions (q_eq_1 to q_eq_5)
    ('trans_q_eq_1_es', 'q_eq_1', 'es', 'Identifico rápidamente el motivo subyacente cuando cambia mi estado de ánimo o nivel de estrés.'),
    ('trans_q_eq_1_fr', 'q_eq_1', 'fr', 'J''identifie immédiatement la cause lorsque mon humeur ou mon niveau de stress évolue.'),
    ('trans_q_eq_1_de', 'q_eq_1', 'de', 'Ich erkenne sofort den eigentlichen Grund, wenn sich meine Stimmung oder mein Stresslevel ändert.'),
    ('trans_q_eq_1_pt', 'q_eq_1', 'pt', 'Consigo perceber rapidamente o motivo exato quando meu humor ou nível de estresse muda.'),
    ('trans_q_eq_1_hi', 'q_eq_1', 'hi', 'जब मेरा मूड या तनाव का स्तर बदलता है, तो मैं इसके कारण को तुरंत पहचान लेता/लेती हूँ।'),

    ('trans_q_eq_2_es', 'q_eq_2', 'es', 'Controlo las reacciones impulsivas y hago una pausa reflexiva antes de responder en momentos tensos.'),
    ('trans_q_eq_2_fr', 'q_eq_2', 'fr', 'Je maîtrise mes impulsions et prends le temps de réfléchir avant de réagir sous tension.'),
    ('trans_q_eq_2_de', 'q_eq_2', 'de', 'Ich zügle impulsive Reaktionen und halte kurz inne, bevor ich in heiklen Momenten antworte.'),
    ('trans_q_eq_2_pt', 'q_eq_2', 'pt', 'Controlo reações precipitadas e faço uma pausa antes de responder em situações tensas.'),
    ('trans_q_eq_2_hi', 'q_eq_2', 'hi', 'तनावपूर्ण परिस्थितियों में मैं आवेगपूर्ण प्रतिक्रियाओं को नियंत्रित करता/करती हूँ और सोच-समझकर जवाब देता/देती हूँ।'),

    ('trans_q_eq_3_es', 'q_eq_3', 'es', 'Mantengo mi motivación hacia objetivos a largo plazo incluso tras enfrentar contratiempos frustrantes.'),
    ('trans_q_eq_3_fr', 'q_eq_3', 'fr', 'Je reste motivé par mes projets à long terme, même après des déconvenues frustrantes.'),
    ('trans_q_eq_3_de', 'q_eq_3', 'de', 'Ich bleibe meinen langfristigen Zielen treu, selbst wenn frustrierende Hürden auftreten.'),
    ('trans_q_eq_3_pt', 'q_eq_3', 'pt', 'Mantenho o entusiasmo pelas minhas metas mesmo após enfrentar contratempos e frustrações.'),
    ('trans_q_eq_3_hi', 'q_eq_3', 'hi', 'निराशाजनक असफलताओं के बाद भी मैं अपने दीर्घकालिक लक्ष्यों के प्रति प्रेरित रहता/रहती हूँ।'),

    ('trans_q_eq_4_es', 'q_eq_4', 'es', 'Capto con facilidad los cambios sutiles de emoción en una conversación antes de que la otra persona los exprese.'),
    ('trans_q_eq_4_fr', 'q_eq_4', 'fr', 'Je perçois aisément les nuances émotionnelles chez mon interlocuteur avant même qu''il ne parle.'),
    ('trans_q_eq_4_de', 'q_eq_4', 'de', 'Ich bemerke feine emotionale Nuancen im Gespräch, noch bevor der andere sie ausspricht.'),
    ('trans_q_eq_4_pt', 'q_eq_4', 'pt', 'Capto facilmente sutilezas emocionais nas pessoas antes mesmo de elas falarem a respeito.'),
    ('trans_q_eq_4_hi', 'q_eq_4', 'hi', 'मैं बातचीत में सूक्ष्म भावनात्मक बदलावों को किसी के बोलने से पहले ही भांप लेता/लेती हूँ।'),

    ('trans_q_eq_5_es', 'q_eq_5', 'es', 'Desactivo eficazmente desacuerdos entre personas y facilito acuerdos constructivos.'),
    ('trans_q_eq_5_fr', 'q_eq_5', 'fr', 'Je désamorce efficacement les conflits entre pairs et favorise les solutions partagées.'),
    ('trans_q_eq_5_de', 'q_eq_5', 'de', 'Ich entschärfe Konflikte zwischen anderen konstruktiv und trage zu tragfähigen Einigungen bei.'),
    ('trans_q_eq_5_pt', 'q_eq_5', 'pt', 'Consigo acalmar conflitos entre pessoas e construir consensos saudáveis e produtivos.'),
    ('trans_q_eq_5_hi', 'q_eq_5', 'hi', 'मैं लोगों के बीच विवादों को कुशलता से शांत करता/करती हूँ और रचनात्मक समझौते की ओर ले जाता/जाती हूँ।'),

    -- Introvert / Extrovert Questions (q_ie_1 to q_ie_4)
    ('trans_q_ie_1_es', 'q_ie_1', 'es', 'Tras una semana intensa, recupero mi energía con actividades tranquilas a solas más que en fiestas.'),
    ('trans_q_ie_1_fr', 'q_ie_1', 'fr', 'Après une semaine intense, je me ressource dans le calme en solo plutôt qu''en soirée festive.'),
    ('trans_q_ie_1_de', 'q_ie_1', 'de', 'Nach einer anstrengenden Woche tanke ich Energie am besten bei ruhigen Solo-Aktivitäten auf.'),
    ('trans_q_ie_1_pt', 'q_ie_1', 'pt', 'Após uma semana agitada, recupero minha energia em momentos tranquilos a sós.'),
    ('trans_q_ie_1_hi', 'q_ie_1', 'hi', 'एक व्यस्त सप्ताह के बाद, मैं पार्टियों के बजाय शांतिपूर्ण एकल गतिविधियों से अपनी ऊर्जा पुनः प्राप्त करता/करती हूँ।'),

    ('trans_q_ie_2_es', 'q_ie_2', 'es', 'Prefiero conversaciones profundas cara a cara antes que eventos sociales multitudinarios con charlas superficiales.'),
    ('trans_q_ie_2_fr', 'q_ie_2', 'fr', 'Je préfère les échanges profonds à deux aux grands rassemblements et discussions de surface.'),
    ('trans_q_ie_2_de', 'q_ie_2', 'de', 'Ich bevorzuge intensive Vier-Augen-Gespräche gegenüber großen Netzwerk-Events mit Smalltalk.'),
    ('trans_q_ie_2_pt', 'q_ie_2', 'pt', 'Prefiro conversas profundas a dois do que grandes eventos com conversas superficiais.'),
    ('trans_q_ie_2_hi', 'q_ie_2', 'hi', 'मैं सतही बातचीत वाले बड़े नेटवर्किंग कार्यक्रमों के बजाय आमने-सामने की गहरी बातचीत पसंद करता/करती हूँ।'),

    ('trans_q_ie_3_es', 'q_ie_3', 'es', 'Estar rodeado de grupos activos de personas me estimula y despierta mi creatividad.'),
    ('trans_q_ie_3_fr', 'q_ie_3', 'fr', 'Être entouré de groupes dynamiques me stimule et réveille ma créativité.'),
    ('trans_q_ie_3_de', 'q_ie_3', 'de', 'In lebendigen Gruppen fühle ich mich belebt und schöpfe daraus kreative Impulse.'),
    ('trans_q_ie_3_pt', 'q_ie_3', 'pt', 'Estar rodeado por grupos dinâmicos e animados me revigora e estimula minha criatividade.'),
    ('trans_q_ie_3_hi', 'q_ie_3', 'hi', 'उत्साही लोगों के समूह में रहना मुझे तरोताजा करता है और मेरी रचनात्मकता को बढ़ाता है।'),

    ('trans_q_ie_4_es', 'q_ie_4', 'es', 'Suelo pensar en voz alta y estructuro mejor mis ideas a través del intercambio conversacional.'),
    ('trans_q_ie_4_fr', 'q_ie_4', 'fr', 'J''ai tendance à penser tout haut et affine mes idées à travers l''échange direct.'),
    ('trans_q_ie_4_de', 'q_ie_4', 'de', 'Ich denke gern laut nach und strukturiere meine Gedanken am besten im direkten Dialog.'),
    ('trans_q_ie_4_pt', 'q_ie_4', 'pt', 'Costumo pensar em voz alta e compreendo melhor as ideias ao discuti-las com outros.'),
    ('trans_q_ie_4_hi', 'q_ie_4', 'hi', 'मैं अक्सर बोलकर सोचता/सोचती हूँ और संवाद के माध्यम से अवधारणाओं को बेहतर समझता/समझती हूँ।'),

    -- Self-Esteem Questions (q_se_1 to q_se_4)
    ('trans_q_se_1_es', 'q_se_1', 'es', 'En general, siento que poseo cualidades valiosas y merezco ser feliz.'),
    ('trans_q_se_1_fr', 'q_se_1', 'fr', 'Dans l''ensemble, j''estime avoir de nombreuses qualités et mériter le bonheur.'),
    ('trans_q_se_1_de', 'q_se_1', 'de', 'Im Großen und Ganzen habe ich viele gute Eigenschaften und verdiene ein glückliches Leben.'),
    ('trans_q_se_1_pt', 'q_se_1', 'pt', 'No geral, reconheço que possuo boas qualidades e mereço ser feliz.'),
    ('trans_q_se_1_hi', 'q_se_1', 'hi', 'कुल मिलाकर, मुझे लगता है कि मुझमें कई अच्छे गुण हैं और मैं खुशियों का हकदार हूँ।'),

    ('trans_q_se_2_es', 'q_se_2', 'es', 'Soy capaz de aceptar mis errores sin juzgar con dureza mi valía como persona.'),
    ('trans_q_se_2_fr', 'q_se_2', 'fr', 'Je sais accepter mes erreurs sans remettre en question toute ma valeur personnelle.'),
    ('trans_q_se_2_de', 'q_se_2', 'de', 'Ich kann eigene Fehler annehmen, ohne meinen gesamten Selbstwert infrage zu stellen.'),
    ('trans_q_se_2_pt', 'q_se_2', 'pt', 'Consigo aceitar meus erros sem condenar severamente meu valor como ser humano.'),
    ('trans_q_se_2_hi', 'q_se_2', 'hi', 'मैं अपने पूरे आत्म-मूल्य पर सवाल उठाए बिना अपनी गलतियों को स्वीकार करने में सक्षम हूँ।'),

    ('trans_q_se_3_es', 'q_se_3', 'es', 'Confío en mi capacidad para aprender nuevas destrezas y afrontar retos desconocidos.'),
    ('trans_q_se_3_fr', 'q_se_3', 'fr', 'J''ai confiance en ma capacité d''apprendre et de relever de nouveaux défis.'),
    ('trans_q_se_3_de', 'q_se_3', 'de', 'Ich vertraue auf meine Fähigkeit, Neues zu lernen und unbekannte Hürden zu meistern.'),
    ('trans_q_se_3_pt', 'q_se_3', 'pt', 'Confio na minha capacidade de aprender novas habilidades e superar desafios.'),
    ('trans_q_se_3_hi', 'q_se_3', 'hi', 'मुझे नए कौशल सीखने और अपरिचित चुनौतियों का सामना करने की अपनी क्षमता पर भरोसा है।'),

    ('trans_q_se_4_es', 'q_se_4', 'es', 'Con frecuencia me siento como una decepción en comparación con las personas de mi entorno.'),
    ('trans_q_se_4_fr', 'q_se_4', 'fr', 'J''ai fréquemment l''impression d''être une déception par rapport à ceux qui m''entourent.'),
    ('trans_q_se_4_de', 'q_se_4', 'de', 'Ich fühle mich im Vergleich zu meinen Mitmenschen häufig unzulänglich oder enttäuschend.'),
    ('trans_q_se_4_pt', 'q_se_4', 'pt', 'Costumo me sentir uma decepção quando me comparo às pessoas ao meu redor.'),
    ('trans_q_se_4_hi', 'q_se_4', 'hi', 'मुझे अक्सर अपने आसपास के लोगों की तुलना में खुद से निराशा महसूस होती है।'),

    -- Communication Style Questions (q_cs_1 to q_cs_4)
    ('trans_q_cs_1_es', 'q_cs_1', 'es', 'Expreso mis límites y desacuerdos de forma honesta, tranquila y sin hostilidad.'),
    ('trans_q_cs_1_fr', 'q_cs_1', 'fr', 'J''exprime mes limites et mes désaccords avec honnêteté, calme et sans animosité.'),
    ('trans_q_cs_1_de', 'q_cs_1', 'de', 'Ich äußere meine Grenzen und Einwände ehrlich, ruhig und ohne feindseligen Ton.'),
    ('trans_q_cs_1_pt', 'q_cs_1', 'pt', 'Expresso meus limites e divergências com calma, firmeza e sem hostilidade.'),
    ('trans_q_cs_1_hi', 'q_cs_1', 'hi', 'मैं अपनी सीमाओं और असहमतियों को बिना किसी शत्रुता के ईमानदारी और शांति से व्यक्त करता/करती हूँ।'),

    ('trans_q_cs_2_es', 'q_cs_2', 'es', 'A menudo guardo silencio cuando se sobrepasan mis límites solo para mantener la paz.'),
    ('trans_q_cs_2_fr', 'q_cs_2', 'fr', 'Je préfère souvent me taire quand on dépasse mes limites uniquement pour préserver la paix.'),
    ('trans_q_cs_2_de', 'q_cs_2', 'de', 'Ich schweige oft, wenn meine Grenzen überschritten werden, nur um Konflikte zu vermeiden.'),
    ('trans_q_cs_2_pt', 'q_cs_2', 'pt', 'Costumo ficar em silêncio quando desrespeitam meus limites apenas para evitar conflitos.'),
    ('trans_q_cs_2_hi', 'q_cs_2', 'hi', 'शांति बनाए रखने के लिए मैं अक्सर अपनी सीमाएं लांघे जाने पर भी चुप रहता/रहती हूँ।'),

    ('trans_q_cs_3_es', 'q_cs_3', 'es', 'Cuando una discusión sube de tono, me enfoco en ganar la discusión antes que en encontrar puntos en común.'),
    ('trans_q_cs_3_fr', 'q_cs_3', 'fr', 'Lors d''un débat houleux, je cherche avant tout à avoir raison plutôt qu''à trouver un terrain d''entente.'),
    ('trans_q_cs_3_de', 'q_cs_3', 'de', 'Wenn Debatten hitziger werden, will ich Recht behalten statt gemeinsame Lösungen zu suchen.'),
    ('trans_q_cs_3_pt', 'q_cs_3', 'pt', 'Quando as discussões esquentam, meu foco é vencer o debate em vez de buscar acordo.'),
    ('trans_q_cs_3_hi', 'q_cs_3', 'hi', 'जब चर्चाएं तेज होती हैं, तो मेरा ध्यान सामान्य आधार खोजने के बजाय बहस जीतने पर होता है।'),

    ('trans_q_cs_4_es', 'q_cs_4', 'es', 'Si alguien me genera frustración, suelo recurrir al sarcasmo indirecto en lugar de hablarlo abiertamente.'),
    ('trans_q_cs_4_fr', 'q_cs_4', 'fr', 'En cas de frustration envers quelqu''un, j''utilise l''ironie plutôt qu''une explication directe.'),
    ('trans_q_cs_4_de', 'q_cs_4', 'de', 'Wenn mich jemand ärgert, reagiere ich eher mit feiner Ironie als mit direkter Aussprache.'),
    ('trans_q_cs_4_pt', 'q_cs_4', 'pt', 'Quando estou frustrado com alguém, costumo usar ironia em vez de conversar diretamente.'),
    ('trans_q_cs_4_hi', 'q_cs_4', 'hi', 'यदि मैं किसी से निराश हूँ, तो सीधी बातचीत के बजाय अप्रत्यक्ष कटाक्ष का उपयोग करता/करती हूँ।'),

    -- Conflict Style Questions (q_cf_1 to q_cf_5)
    ('trans_q_cf_1_es', 'q_cf_1', 'es', 'Dedico tiempo a entender todas las preocupaciones de fondo para lograr una solución donde ambos ganemos.'),
    ('trans_q_cf_1_fr', 'q_cf_1', 'fr', 'Je prends le temps d''écouter tous les enjeux pour forger un accord gagnant-gagnant complet.'),
    ('trans_q_cf_1_de', 'q_cf_1', 'de', 'Ich nehme mir Zeit für alle Hintergründe, um eine ganzheitliche Win-Win-Lösung zu erarbeiten.'),
    ('trans_q_cf_1_pt', 'q_cf_1', 'pt', 'Dedico tempo para entender todos os pontos e criar uma solução em que todos saiam ganhando.'),
    ('trans_q_cf_1_hi', 'q_cf_1', 'hi', 'मैं सभी चिंताओं को समझने में समय लगाता/लगाती हूँ ताकि दोनों पक्षों की जीत वाला व्यापक समाधान बने।'),

    ('trans_q_cf_2_es', 'q_cf_2', 'es', 'Propongo dividir diferencias rápidamente para que ambas partes cedan algo y podamos avanzar.'),
    ('trans_q_cf_2_fr', 'q_cf_2', 'fr', 'Je propose vite de couper la poire en deux pour que chacun avance sans blocage.'),
    ('trans_q_cf_2_de', 'q_cf_2', 'de', 'Ich schlage rasch einen Mittelweg vor, bei dem jeder nachgibt und es zügig weitergeht.'),
    ('trans_q_cf_2_pt', 'q_cf_2', 'pt', 'Proponho um acordo intermediário rápido para que ambos cedam e possamos avançar.'),
    ('trans_q_cf_2_hi', 'q_cf_2', 'hi', 'मैं मतभेदों को जल्दी सुलझाने का प्रस्ताव देता/देती हूँ ताकि दोनों पक्ष कुछ पाकर आगे बढ़ सकें।'),

    ('trans_q_cf_3_es', 'q_cf_3', 'es', 'Estoy dispuesto a dejar a un lado mis preferencias si eso protege una relación valiosa.'),
    ('trans_q_cf_3_fr', 'q_cf_3', 'fr', 'Je suis prêt à mettre mes souhaits entre parenthèses pour préserver une relation précieuse.'),
    ('trans_q_cf_3_de', 'q_cf_3', 'de', 'Ich stelle eigene Wünsche zurück, wenn dadurch eine wertvolle Beziehung bewahrt bleibt.'),
    ('trans_q_cf_3_pt', 'q_cf_3', 'pt', 'Disponho-me a abrir mão da minha vontade se isso preservar um relacionamento importante.'),
    ('trans_q_cf_3_hi', 'q_cf_3', 'hi', 'यदि किसी मूल्यवान रिश्ते की रक्षा होती है, तो मैं अपनी पसंद को एक तरफ रखने को तैयार हूँ।'),

    ('trans_q_cf_4_es', 'q_cf_4', 'es', 'Cuando hay principios fundamentales en juego, defiendo mi postura con firmeza y convicción.'),
    ('trans_q_cf_4_fr', 'q_cf_4', 'fr', 'Quand des principes clés sont en jeu, je maintiens et défends ma position avec détermination.'),
    ('trans_q_cf_4_de', 'q_cf_4', 'de', 'Wenn Grundsätzliches auf dem Spiel steht, vertrete ich meinen Standpunkt unnachgiebig.'),
    ('trans_q_cf_4_pt', 'q_cf_4', 'pt', 'Quando princípios essenciais estão em jogo, defendo minha posição com total firmeza.'),
    ('trans_q_cf_4_hi', 'q_cf_4', 'hi', 'जब महत्वपूर्ण सिद्धांत दांव पर होते हैं, तो मैं दृढ़ रहता/रहती हूँ और मजबूती से अपना पक्ष रखता/रखती हूँ।'),

    ('trans_q_cf_5_es', 'q_cf_5', 'es', 'Prefiero posponer la discusión inmediata hasta que los ánimos se hayan enfriado.'),
    ('trans_q_cf_5_fr', 'q_cf_5', 'fr', 'Je préfère différer l''échange conflictuel jusqu''à ce que les esprits se soient calmés.'),
    ('trans_q_cf_5_de', 'q_cf_5', 'de', 'Ich weiche direkter Konfrontation zunächst aus, bis sich die Gemüter beruhigt haben.'),
    ('trans_q_cf_5_pt', 'q_cf_5', 'pt', 'Prefiro adiar a discussão até que os ânimos estejam mais calmos e ponderados.'),
    ('trans_q_cf_5_hi', 'q_cf_5', 'hi', 'जब तक भावनात्मक तनाव शांत न हो जाए, मैं तत्काल टकराव से बचना पसंद करता/करती हूँ।')
ON CONFLICT(question_id, locale) DO UPDATE SET
    question_text = excluded.question_text,
    updated_at = CURRENT_TIMESTAMP;
