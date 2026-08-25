import fs from 'node:fs';
import path from 'node:path';

console.log('=== Dynamically syncing multilingual translations to D1 (local & remote) ===\n');

const assessmentTranslations = {
  'big-five-personality-test': {
    es: { name: 'Test de Personalidad Big Five (OCEAN)', short: 'Descubre tu perfil único en las 5 grandes dimensiones científicas de la personalidad: Apertura, Responsabilidad, Extraversión, Amabilidad y Estabilidad Emocional.' },
    fr: { name: 'Test de Personnalité Big Five (OCEAN)', short: 'Découvrez votre profil psychologique selon les 5 dimensions fondamentales de la personnalité : Ouverture, Conscience, Extraversion, Agréabilité et Stabilité Émotionnelle.' },
    de: { name: 'Big Five Persönlichkeitstest (OCEAN)', short: 'Erfassen Sie Ihr wissenschaftlich fundiertes Persönlichkeitsprofil anhand der fünf Hauptdimensionen des Big-Five-Modells.' },
    pt: { name: 'Teste de Personalidade Big Five (OCEAN)', short: 'Descubra seu perfil nas 5 dimensões validadas da personalidade: Abertura, Conscienciosidade, Extroversão, Amabilidade e Estabilidade Emocional.' },
    hi: { name: 'बिग फाइव व्यक्तित्व परीक्षण (OCEAN)', short: 'व्यक्तित्व के 5 वैज्ञानिक रूप से प्रमाणित मुख्य आयामों में अपनी अनूठी संरचना को जानें: खुलापन, कर्तव्यनिष्ठा, बहिर्मुखता, सौम्यता और भावनात्मक स्थिरता।' }
  },
  'attachment-style-test': {
    es: { name: 'Test de Estilos de Apego Adulto', short: 'Identifica tu patrón de vinculación afectiva: Seguro, Ansioso, Evitativo o Desorganizado.' },
    fr: { name: "Test des Styles d'Attachement Adulte", short: "Identifiez votre schéma relationnel : Sécure, Anxieux-Préoccupé, Évitant ou Craintif." },
    de: { name: 'Bindungsstil-Test für Erwachsene', short: 'Ermitteln Sie Ihr Beziehungsmuster: Sicher, Ängstlich, Vermeidend oder Desorganisiert.' },
    pt: { name: 'Teste de Estilos de Apego Adulto', short: 'Descubra seu padrão de vínculo emocional: Seguro, Ansioso, Evitativo ou Desorganizado.' },
    hi: { name: 'अडल्ट अटैचमेंट स्टाइल टेस्ट', short: 'अपनी भावनात्मक जुड़ाव शैली को पहचानें: सुरक्षित (Secure), चिंतित (Anxious), परिहार (Avoidant), या भयभीत।' }
  },
  'love-language-quiz': {
    es: { name: 'Test de Lenguajes del Amor', short: 'Descubre tu canal principal para expresar y recibir afecto: Palabras, Tiempo de Calidad, Regalos, Actos o Contacto.' },
    fr: { name: "Quiz des Langages de l'Amour", short: "Découvrez vos canaux privilégiés pour exprimer et recevoir l'amour dans votre couple." },
    de: { name: 'Die 5 Sprachen der Liebe Test', short: 'Erkennen Sie Ihre bevorzugten Wege, Zuneigung und Wertschätzung in Beziehungen zu erleben.' },
    pt: { name: 'Teste das 5 Linguagens do Amor', short: 'Descubra seus canais primários para demonstrar e receber amor em relacionamentos íntimos.' },
    hi: { name: 'लव लैंग्वेज टेस्ट (प्रेम की 5 भाषाएं)', short: 'प्रेम व्यक्त करने और प्राप्त करने के अपने प्राथमिक माध्यमों को समझें।' }
  },
  'emotional-intelligence-test': {
    es: { name: 'Test de Inteligencia Emocional (EQ)', short: 'Evalúa tu capacidad de autoconciencia emocional, autorregulación, empatía y destrezas sociales.' },
    fr: { name: "Test d'Intelligence Émotionnelle (QE)", short: 'Mesurez votre conscience de soi, régulation des impulsions, empathie et compétences sociales.' },
    de: { name: 'Test zur Emotionalen Intelligenz (EQ)', short: 'Ermitteln Sie Ihre emotionale Selbstwahrnehmung, Selbststeuerung, Motivation und Empathie.' },
    pt: { name: 'Teste de Inteligência Emocional (QE)', short: 'Avalie seu nível de autopercepção emocional, controle de impulsos, empatia e habilidades sociais.' },
    hi: { name: 'भावनात्मक बुद्धिमत्ता (EQ) परीक्षण', short: 'अपनी आत्म-जागरूकता, आवेग नियंत्रण, आंतरिक प्रेरणा, सहानुभूति और सामाजिक कौशल को मापें।' }
  },
  'introvert-extrovert-test': {
    es: { name: 'Test de Introversión vs Extraversión', short: 'Descubre tu fuente de recarga de energía social: Introvertido, Ambivertido o Extravertido.' },
    fr: { name: 'Test Introverti vs Extraverti', short: 'Déterminez comment vous rechargez votre énergie : Introversion, Ambiversion ou Extraversion.' },
    de: { name: 'Introvertiert vs. Extravertiert Test', short: 'Erfahren Sie, wie Sie Ihre Energie auftanken: Introvertiert, Ambivertiert oder Extravertiert.' },
    pt: { name: 'Teste de Introversão vs Extroversão', short: 'Mapeie como você recarrega sua energia social: Introvertido, Ambivertido ou Extrovertido.' },
    hi: { name: 'अंतर्मुखी बनाम बहिर्मुखी परीक्षण (Introvert vs Extrovert)', short: 'जानें कि आप अपनी सामाजिक ऊर्जा को कैसे रिचार्ज करते हैं: अंतर्मुखी, उभयमुखी (Ambivert), या बहिर्मुखी।' }
  },
  'self-esteem-test': {
    es: { name: 'Test de Autoestima (Escala de Rosenberg)', short: 'Evalúa tu sentido fundamental de autovalía, autoaceptación incondicional y autoeficacia.' },
    fr: { name: "Test d'Estime de Soi (Échelle de Rosenberg)", short: 'Évaluez votre sentiment de valeur personnelle, votre auto-acceptation et votre confiance en vous.' },
    de: { name: 'Selbstwertgefühl-Test (Rosenberg-Skala)', short: 'Erfassen Sie Ihr grundlegendes Gefühl für eigenen Wert, Selbstakzeptanz und Selbstwirksamkeit.' },
    pt: { name: 'Teste de Autoestima (Escala de Rosenberg)', short: 'Avalie seu sentimento fundamental de valor próprio, autoaceitação incondicional e confiança.' },
    hi: { name: 'आत्म-सम्मान परीक्षण (Rosenberg Self-Esteem)', short: 'अपने आत्म-मूल्य, बिना शर्त आत्म-स्वीकृति और आंतरिक आत्मविश्वास का मूल्यांकन करें।' }
  },
  'communication-style-test': {
    es: { name: 'Test de Estilos de Comunicación', short: 'Identifica tu enfoque conversacional predominante: Asertivo, Pasivo, Agresivo o Pasivo-Agresivo.' },
    fr: { name: 'Test des Styles de Communication', short: 'Identifiez votre façon de communiquer : Assertive, Passive, Agressive ou Passive-Agressive.' },
    de: { name: 'Kommunikationsstil-Test', short: 'Erkennen Sie Ihr Gesprächsmuster: Assertiv (Durchsetzungsstark), Passiv, Aggressiv oder Passiv-Aggressiv.' },
    pt: { name: 'Teste de Estilos de Comunicação', short: 'Identifique sua postura conversacional: Assertiva, Passiva, Agressiva ou Passivo-Agressiva.' },
    hi: { name: 'संचार शैली परीक्षण (Communication Style)', short: 'अपनी बातचीत की प्राथमिक शैली पहचानें: मुखर (Assertive), निष्क्रिय (Passive), आक्रामक, या निष्क्रिय-आक्रामक।' }
  },
  'conflict-style-test': {
    es: { name: 'Test de Estilos de Conflicto (Thomas-Kilmann)', short: 'Descubre cómo negocias disputas: Colaborador, Comprometido, Complaciente, Competidor o Evasivo.' },
    fr: { name: 'Test de Gestion des Conflits (Thomas-Kilmann)', short: 'Analysez vos réflexes face aux désaccords : Collaboration, Compromis, Conciliation, Compétition ou Évitement.' },
    de: { name: 'Konfliktstil-Test (Thomas-Kilmann Modell)', short: 'Messen Sie Ihre Verhandlungsmuster: Kollaborativ, Kompromissbereit, Anpassend, Konkurrierend oder Vermeidend.' },
    pt: { name: 'Teste de Estilos de Conflito (Thomas-Kilmann)', short: 'Mapeie sua forma de gerenciar disputas: Colaborativo, Conciliador, Acomodativo, Competitivo ou Evitativo.' },
    hi: { name: 'संघर्ष समाधान शैली परीक्षण (Thomas-Kilmann TKI)', short: 'तय करें कि आप विवादों का समाधान कैसे करते हैं: सहयोगी (Collaborating), समझौतावादी, समायोजक, प्रतिस्पर्धी, या टालने वाले।' }
  }
};

const categoryTranslations = {
  'cat_personality': {
    es: { name: 'Personalidad', desc: 'Comprende tus rasgos fundamentales, patrones conductuales y arquitectura psicológica.' },
    fr: { name: 'Personnalité', desc: "Comprenez vos traits fondamentaux, vos réflexes comportementaux et votre architecture psychologique." },
    de: { name: 'Persönlichkeit', desc: 'Verstehen Sie Ihre grundlegenden Wesensmerkmale, Handlungsmuster und psychologischen Strukturen.' },
    pt: { name: 'Personalidade', desc: 'Compreenda seus traços essenciais, padrões de conduta e arquitetura psicológica.' },
    hi: { name: 'व्यक्तित्व (Personality)', desc: 'अपने मूल लक्षणों, व्यवहार संबंधी प्रवृत्तियों और मनोवैज्ञानिक संरचना को समझें।' }
  },
  'cat_relationships': {
    es: { name: 'Relaciones y Apego', desc: 'Profundiza en tus dinámicas de apego, lenguajes afectivos e intimidad emocional.' },
    fr: { name: 'Relations et Attachement', desc: "Approfondissez vos dynamiques affectives, langages de l'amour et intimité relationnelle." },
    de: { name: 'Beziehungen & Bindung', desc: 'Gewinnen Sie Klarheit über Ihren Bindungsstil, Liebessprachen und Beziehungsdynamiken.' },
    pt: { name: 'Relacionamentos e Apego', desc: 'Aprofunde-se em seus estilos de apego, linguagens do afeto e intimidade emocional.' },
    hi: { name: 'संबंध और लगाव (Relationships & Attachment)', desc: 'अपनी लगाव शैली, प्रेम की भाषाओं और भावनात्मक निकटता को गहराई से समझें।' }
  },
  'cat_eq': {
    es: { name: 'Inteligencia Emocional', desc: 'Evalúa tu autorregulación emocional, empatía, autoconocimiento y agilidad social en momentos de tensión.' },
    fr: { name: 'Intelligence Émotionnelle', desc: 'Mesurez votre autorégulation, empathie, lucidité émotionnelle et agilité relationnelle sous pression.' },
    de: { name: 'Emotionale Intelligenz', desc: 'Erfassen Sie Ihre emotionale Selbstwahrnehmung, Impulskontrolle, Empathie und soziale Agilität unter Stress.' },
    pt: { name: 'Inteligência Emocional', desc: 'Avalie sua autorregulação, empatia, autopercepção e flexibilidade social sob situações de pressão.' },
    hi: { name: 'भावनात्मक बुद्धिमत्ता (EQ)', desc: 'दबाव में आत्म-नियमन, सहानुभूति, आत्म-जागरूकता और पारस्परिक सामाजिक चपलता का मूल्यांकन करें।' }
  },
  'cat_self_dev': {
    es: { name: 'Desarrollo Personal', desc: 'Fortalece tu autoestima, autoconfianza y claridad psicológica para un crecimiento consciente.' },
    fr: { name: 'Développement Personnel', desc: "Développez une estime de soi solide, l'autodiscipline et vos leviers d'épanouissement personnel." },
    de: { name: 'Persönlichkeitsentwicklung', desc: 'Stärken Sie Ihr gesundes Selbstwertgefühl, Selbstwirksamkeit und persönliche Entwicklungspfade.' },
    pt: { name: 'Desenvolvimento Pessoal', desc: 'Fortaleça sua autoestima, autoeficácia e clareza mental para uma evolução contínua e autêntica.' },
    hi: { name: 'आत्म-विकास (Self Development)', desc: 'मजबूत आत्म-सम्मान, आदत अनुशासन और संज्ञानात्मक विकास के मार्गों का निर्माण करें।' }
  },
  'cat_communication': {
    es: { name: 'Comunicación', desc: 'Comprende tu asertividad, hábitos conversacionales y dinámicas de resolución de conflictos.' },
    fr: { name: 'Communication', desc: "Comprenez votre assertivité, vos dynamiques d'échange et vos réflexes face aux désaccords." },
    de: { name: 'Kommunikation', desc: 'Analysieren Sie Ihre Durchsetzungsstärke, Gesprächsgewohnheiten und Verhandlungsstrategien.' },
    pt: { name: 'Comunicação', desc: 'Compreenda sua assertividade, hábitos de diálogo e abordagens para resolver divergências.' },
    hi: { name: 'संचार (Communication)', desc: 'अपनी बातचीत की गतिशीलता, मुखरता (Assertiveness) और संघर्ष समाधान शैली को समझें।' }
  }
};

function generateSql() {
  const statements = [];

  // Categories
  for (const [catId, locales] of Object.entries(categoryTranslations)) {
    for (const [loc, data] of Object.entries(locales)) {
      statements.push(`INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, updated_at)
SELECT 'trans_' || id || '_${loc}', id, '${loc}', '${data.name.replace(/'/g, "''")}', '${data.desc.replace(/'/g, "''")}', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = '${catId}';`);
    }
  }

  // Assessments
  for (const [slug, locales] of Object.entries(assessmentTranslations)) {
    for (const [loc, data] of Object.entries(locales)) {
      statements.push(`INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_${loc}', id, '${loc}', '${data.name.replace(/'/g, "''")}', '${data.short.replace(/'/g, "''")}', long_description, instructions, disclaimer, '${data.name.replace(/'/g, "''")} | PsychologyCalculator.com', '${data.short.replace(/'/g, "''")}', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = '${slug}';`);
    }
  }

  // Dimension fallback clones
  for (const loc of ['es', 'fr', 'de', 'pt', 'hi']) {
    statements.push(`INSERT OR IGNORE INTO assessment_dimension_translations (id, dimension_id, locale, name, description)
SELECT 'trans_' || id || '_${loc}', id, '${loc}', name, description FROM assessment_dimensions;`);
  }

  return statements.join('\n');
}

const sql = generateSql();
const sqlPath = path.resolve(process.cwd(), 'migrations/0040_dynamic_translations_sync.sql');
fs.writeFileSync(sqlPath, sql, 'utf8');
console.log('✔ Generated clean migrations/0040_dynamic_translations_sync.sql');
