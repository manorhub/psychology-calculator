import fs from 'node:fs';
import path from 'node:path';

console.log('=== Building Comprehensive Multilingual System Seeds (All 11 Categories, 35 Assessments) ===\n');

// 1. All 11 Categories Translations
const allCategoryTranslations = {
  'cat_personality': {
    es: { name: 'Personalidad', desc: 'Explora tus rasgos de personalidad, patrones de conducta y fortalezas de carácter con autoevaluaciones validadas.' },
    fr: { name: 'Personnalité', desc: "Explorez vos traits de caractère, vos réflexes comportementaux et vos forces à travers des tests validés." },
    de: { name: 'Persönlichkeit', desc: 'Erforschen Sie Ihre Wesensmerkmale, Handlungsmuster und Charakterstärken anhand wissenschaftlicher Selbsttests.' },
    pt: { name: 'Personalidade', desc: 'Explore seus traços de personalidade, padrões comportamentais e pontos fortes com autoavaliações validadas.' },
    hi: { name: 'व्यक्तित्व (Personality)', desc: 'प्रमाणित आत्म-मूल्यांकन के माध्यम से अपने व्यक्तित्व लक्षणों, व्यवहार पैटर्न और चरित्र की शक्तियों को जानें।' }
  },
  'cat_relationships': {
    es: { name: 'Relaciones', desc: 'Comprende patrones de apego, tendencias comunicativas y dinámicas de intimidad en pareja.' },
    fr: { name: 'Relations', desc: "Comprenez vos schémas d'attachement, vos modes de communication et l'intimité dans votre couple." },
    de: { name: 'Beziehungen', desc: 'Verstehen Sie Bindungsmuster, Kommunikationsweisen und Beziehungsdynamiken.' },
    pt: { name: 'Relacionamentos', desc: 'Compreenda padrões de apego, tendências de diálogo e dinâmicas de intimidade nas relações.' },
    hi: { name: 'संबंध (Relationships)', desc: 'रिश्तों में लगाव के पैटर्न, संचार प्रवृत्तियों और आत्मीयता की गतिशीलता को समझें।' }
  },
  'cat_relationships_attachment': {
    es: { name: 'Relaciones y Apego', desc: 'Comprende patrones de apego, tendencias comunicativas y dinámicas de intimidad en pareja.' },
    fr: { name: 'Relations et Attachement', desc: "Comprenez vos schémas d'attachement, vos modes de communication et l'intimité dans votre couple." },
    de: { name: 'Beziehungen & Bindung', desc: 'Verstehen Sie Bindungsmuster, Kommunikationsweisen und Beziehungsdynamiken.' },
    pt: { name: 'Relacionamentos e Apego', desc: 'Compreenda padrões de apego, tendências de diálogo e dinâmicas de intimidade nas relações.' },
    hi: { name: 'संबंध और लगाव (Relationships & Attachment)', desc: 'रिश्तों में लगाव के पैटर्न, संचार प्रवृत्तियों और आत्मीयता की गतिशीलता को समझें।' }
  },
  'cat_eq': {
    es: { name: 'Inteligencia Emocional', desc: 'Mide tu cociente emocional, tolerancia al estrés y agilidad interpersonal mediante autoevaluaciones estructuradas.' },
    fr: { name: 'Intelligence Émotionnelle', desc: 'Mesurez votre quotient émotionnel, votre résistance au stress et votre agilité relationnelle.' },
    de: { name: 'Emotionale Intelligenz', desc: 'Messen Sie Ihren emotionalen Quotienten, Stresstoleranz und zwischenmenschliche Agilität.' },
    pt: { name: 'Inteligência Emocional', desc: 'Meça seu quociente emocional, tolerância ao estresse e flexibilidade interpessoal.' },
    hi: { name: 'भावनात्मक बुद्धिमत्ता (EQ)', desc: 'संरचित आत्म-मूल्यांकन के माध्यम से अपने EQ, तनाव सहनशीलता और पारस्परिक चपलता को मापें।' }
  },
  'cat_emotional_wellbeing': {
    es: { name: 'Bienestar Emocional', desc: 'Evalúa tu autoconciencia emocional, gestión del estrés, empatía y resiliencia psicológica cotidiana.' },
    fr: { name: 'Bien-Être Émotionnel', desc: 'Évaluez votre conscience émotionnelle, gestion du stress, empathie et résilience au quotidien.' },
    de: { name: 'Emotionales Wohlbefinden', desc: 'Erfassen Sie emotionale Achtsamkeit, Stressbewältigung, Empathie und psychische Widerstandskraft.' },
    pt: { name: 'Bem-Estar Emocional', desc: 'Avalie sua autopercepção emocional, gestão do estresse, empatia e resiliência psicológica diária.' },
    hi: { name: 'भावनात्मक कल्याण (Emotional Wellbeing)', desc: 'अपनी भावनात्मक आत्म-जागरूकता, तनाव प्रबंधन, सहानुभूति और दैनिक मनोवैज्ञानिक लचीलेपन का मूल्यांकन करें।' }
  },
  'cat_wellbeing': {
    es: { name: 'Bienestar Mental', desc: 'Autoevaluaciones reflexivas para explorar patrones cotidianos de estrés, hábitos de afrontamiento y equilibrio emocional.' },
    fr: { name: 'Bien-Être Mental', desc: "Tests réflexifs pour explorer les sources de stress, vos réactions d'adaptation et votre équilibre émotionnel." },
    de: { name: 'Mentales Wohlbefinden', desc: 'Reflexive Selbsttests zu Alltagsstress, Bewältigungsstrategien und seelischem Gleichgewicht.' },
    pt: { name: 'Bem-Estar Mental', desc: 'Autoavaliações reflexivas para explorar padrões diários de estresse, estratégias de enfrentamento e equilíbrio emocional.' },
    hi: { name: 'मानसिक कल्याण (Mental Wellbeing)', desc: 'दैनिक तनाव के पैटर्न, मुकाबला करने की आदतों और भावनात्मक संतुलन की खोज के लिए आत्म-मूल्यांकन।' }
  },
  'cat_self_dev': {
    es: { name: 'Desarrollo Personal', desc: 'Evaluaciones científicamente estructuradas de autoestima, autodisciplina y crecimiento personal.' },
    fr: { name: 'Développement Personnel', desc: "Évaluations scientifiques de l'estime de soi, de l'autodiscipline et de la croissance personnelle." },
    de: { name: 'Persönlichkeitsentwicklung', desc: 'Strukturierte Selbsttests zu Selbstwertgefühl, Selbstdisziplin und persönlichem Wachstum.' },
    pt: { name: 'Desenvolvimento Pessoal', desc: 'Avaliações cientificamente estruturadas de autoestima, autodisciplina e evolução pessoal.' },
    hi: { name: 'आत्म-विकास (Self Development)', desc: 'आत्म-सम्मान, आत्म-अनुशासन और व्यक्तिगत विकास के वैज्ञानिक रूप से संरचित मूल्यांकन।' }
  },
  'cat_career_work': {
    es: { name: 'Carrera y Trabajo', desc: 'Descubre tu estilo de trabajo profesional, fortalezas de liderazgo y patrones de comunicación laboral.' },
    fr: { name: 'Carrière et Travail', desc: "Découvrez votre style de travail, vos qualités de leader et vos modes d'échange professionnels." },
    de: { name: 'Karriere & Beruf', desc: 'Entdecken Sie Ihren Arbeitsstil, Führungsstärken und Ihre berufliche Kommunikationsweise.' },
    pt: { name: 'Carreira e Trabalho', desc: 'Descubra seu estilo profissional, forças de liderança e formas de comunicação no ambiente de trabalho.' },
    hi: { name: 'करियर और कार्य (Career & Work)', desc: 'अपनी व्यावसायिक कार्यशैली, नेतृत्व क्षमताओं और कार्यस्थल संचार प्रवृत्तियों को जानें।' }
  },
  'cat_communication': {
    es: { name: 'Comunicación', desc: 'Evalúa tus hábitos de comunicación interpersonal, tendencias de negociación y estilos de conflicto.' },
    fr: { name: 'Communication', desc: 'Évaluez vos réflexes relationnels, votre façon de négocier et de gérer les désaccords.' },
    de: { name: 'Kommunikation', desc: 'Analysieren Sie Gesprächsgewohnheiten, Verhandlungsansätze und Konfliktmuster.' },
    pt: { name: 'Comunicação', desc: 'Avalie seus hábitos de diálogo interpessoal, tendências de negociação e estilos de conflito.' },
    hi: { name: 'संचार (Communication)', desc: 'पारस्परिक बातचीत की आदतों, बातचीत की प्रवृत्तियों और संघर्ष की शैलियों का मूल्यांकन करें।' }
  },
  'cat_social_communication': {
    es: { name: 'Social y Comunicación', desc: 'Evalúa tus hábitos de comunicación interpersonal, tendencias de negociación y estilos de conflicto.' },
    fr: { name: 'Social et Communication', desc: 'Évaluez vos réflexes relationnels, votre façon de négocier et de gérer les désaccords.' },
    de: { name: 'Soziales & Kommunikation', desc: 'Analysieren Sie Gesprächsgewohnheiten, Verhandlungsansätze und Konfliktmuster.' },
    pt: { name: 'Social e Comunicação', desc: 'Avalie seus hábitos de diálogo interpessoal, tendências de negociação e estilos de conflito.' },
    hi: { name: 'सामाजिक और संचार (Social & Communication)', desc: 'पारस्परिक बातचीत की आदतों, बातचीत की प्रवृत्तियों और संघर्ष की शैलियों का मूल्यांकन करें।' }
  },
  'cat_cognitive_style': {
    es: { name: 'Estilo Cognitivo', desc: 'Comprende cómo procesas la información, tomas decisiones complejas y resuelves problemas de manera creativa.' },
    fr: { name: 'Style Cognitif', desc: "Comprenez comment vous analysez l'information, prenez vos décisions et résolvez les problèmes." },
    de: { name: 'Kognitiver Stil', desc: 'Verstehen Sie Ihre Informationsverarbeitung, Entscheidungsfindung und kreative Problemlösungskompetenz.' },
    pt: { name: 'Estilo Cognitivo', desc: 'Compreenda como você processa informações, toma decisões complexas e resolve problemas criativamente.' },
    hi: { name: 'संज्ञानात्मक शैली (Cognitive Style)', desc: 'समझें कि आप जानकारी को कैसे संसाधित करते हैं, जटिल निर्णय कैसे लेते हैं और समस्याओं को कैसे हल करते हैं।' }
  }
};

// 2. All 35 Assessments Master Translations Dictionary
const allAssessmentTranslations = {
  'big-five-personality-test': {
    es: { name: 'Test de Personalidad Big Five (OCEAN)', short: 'Descubre tu perfil único en las 5 grandes dimensiones científicas de la personalidad: Apertura, Responsabilidad, Extraversión, Amabilidad y Estabilidad Emocional.' },
    fr: { name: 'Test de Personnalité Big Five (OCEAN)', short: 'Découvrez votre profil psychologique selon les 5 dimensions fondamentales : Ouverture, Conscience, Extraversion, Agréabilité et Stabilité Émotionnelle.' },
    de: { name: 'Big Five Persönlichkeitstest (OCEAN)', short: 'Erfassen Sie Ihr wissenschaftlich fundiertes Persönlichkeitsprofil anhand der fünf Hauptdimensionen des Big-Five-Modells.' },
    pt: { name: 'Teste de Personalidade Big Five (OCEAN)', short: 'Descubra seu perfil nas 5 dimensões validadas da personalidade: Abertura, Conscienciosidade, Extroversão, Amabilidade e Estabilidade Emocional.' },
    hi: { name: 'बिग फाइव व्यक्तित्व परीक्षण (OCEAN)', short: 'व्यक्तित्व के 5 वैज्ञानिक रूप से प्रमाणित मुख्य आयामों में अपनी अनूठी संरचना को जानें: खुलापन, कर्तव्यनिष्ठा, बहिर्मुखता, सौम्यता और भावनात्मक स्थिरता।' }
  },
  'openness-to-experience-test': {
    es: { name: 'Test de Apertura a la Experiencia', short: 'Explora tu curiosidad intelectual, imaginación creativa, apreciación estética y apertura a perspectivas novedosas.' },
    fr: { name: "Test d'Ouverture à l'Expérience", short: 'Explorez votre curiosité intellectuelle, votre imagination créative, votre sensibilité esthétique et votre goût de la nouveauté.' },
    de: { name: 'Offenheit für Erfahrungen Test', short: 'Erforschen Sie Ihre intellektuelle Neugier, kreative Fantasie, ästhetische Sensibilität und Aufgeschlossenheit für Neues.' },
    pt: { name: 'Teste de Abertura à Experiência', short: 'Explore sua curiosidade intelectual, imaginação criativa, apreciação estética e receptividade a novas ideias.' },
    hi: { name: 'अनुभव के प्रति खुलापन परीक्षण (Openness to Experience)', short: 'अपनी बौद्धिक जिज्ञासा, रचनात्मक कल्पना, सौंदर्य बोध और नए दृष्टिकोणों के प्रति खुलेपन की खोज करें।' }
  },
  'multidimensional-anger-test': {
    es: { name: 'Test Multidimensional de Ira y Enojo', short: 'Examina tus detonantes de ira, intensidad emocional, patrones de evaluación cognitiva y estrategias de autorregulación.' },
    fr: { name: 'Test Multidimensionnel de la Colère', short: "Analysez vos déclencheurs de colère, l'intensité de vos réactions émotionnelles et vos stratégies de régulation." },
    de: { name: 'Multidimensionaler Wut- und Ärger-Test', short: 'Erkennen Sie Ihre Ärger-Auslöser, emotionale Erregungsintensität und persönliche Regulationsstrategien.' },
    pt: { name: 'Teste Multidimensional de Raiva', short: 'Examine seus gatilhos de raiva, intensidade emocional e estratégias de autorregulação comportamental.' },
    hi: { name: 'बहुआयामी क्रोध परीक्षण (Multidimensional Anger Test)', short: 'अपने क्रोध के ट्रिगर्स, भावनात्मक तीव्रता, संज्ञानात्मक पैटर्न और आत्म-नियमन की रणनीतियों की जांच करें।' }
  },
  '16-type-personality-test': {
    es: { name: 'Test de Personalidad de 16 Tipos', short: 'Descubre tus preferencias cognitivas entre Extraversión vs Introversión, Sensación vs Intuición, Pensamiento vs Sentimiento y Juicio vs Percepción.' },
    fr: { name: 'Test de Personnalité des 16 Types', short: 'Explorez vos préférences cognitives entre Extraversion/Introversion, Sensation/Intuition, Pensée/Sentiment et Jugement/Perception.' },
    de: { name: '16-Typen Persönlichkeitstest', short: 'Erkennen Sie Ihre Präferenzen bei Extraversion vs. Introversion, Sensorik vs. Intuition, Denken vs. Fühlen und Urteilen vs. Wahrnehmen.' },
    pt: { name: 'Teste de Personalidade dos 16 Tipos', short: 'Descubra suas preferências cognitivas entre Extroversão vs Introversão, Sensação vs Intuição, Pensamento vs Sentimento e Julgamento vs Percepção.' },
    hi: { name: '16 प्रकार का व्यक्तित्व परीक्षण (16-Type Personality)', short: 'बहिर्मुखता बनाम अंतर्मुखता, संवेदन बनाम अंतर्ज्ञान, सोच बनाम भावना, और निर्णय बनाम धारणा में अपनी संज्ञानात्मक प्राथमिकताओं को जानें।' }
  },
  'agreeableness-test': {
    es: { name: 'Test de Amabilidad y Cooperación', short: 'Mide tu cooperación prosocial, confianza interpersonal, empatía y estilo de comunicación compasiva en entornos sociales.' },
    fr: { name: "Test d'Agréabilité et d'Empathie", short: 'Mesurez votre sens de la coopération, votre confiance, votre empathie et votre bienveillance dans vos relations.' },
    de: { name: 'Verträglichkeits- und Kooperationstest', short: 'Messen Sie Ihre soziale Kooperationsbereitschaft, Vertrauen, Empathie und mitfühlende Kommunikation.' },
    pt: { name: 'Teste de Amabilidade e Cooperação', short: 'Meça sua cooperação pró-social, confiança interpessoal, empatia e comunicação compassiva.' },
    hi: { name: 'सौम्यता एवं सहयोग परीक्षण (Agreeableness Test)', short: 'सामाजिक परिवेश में अपने सहयोग, विश्वास, सहानुभूति और दयालु संचार प्रवृत्तियों को मापें।' }
  },
  'relationship-compatibility-test': {
    es: { name: 'Test de Compatibilidad en Pareja', short: 'Evalúa la resonancia emocional, sinergia comunicativa, resolución de conflictos y expectativas compartidas con tu pareja.' },
    fr: { name: 'Test de Compatibilité Amoureuse', short: "Évaluez la résonance émotionnelle, l'harmonie de communication et les valeurs partagées dans votre relation." },
    de: { name: 'Beziehungskompatibilitätstest', short: 'Erfassen Sie emotionale Resonanz, Kommunikationsharmonie und gemeinsame Zukunftserwartungen mit Ihrem Partner.' },
    pt: { name: 'Teste de Compatibilidade no Relacionamento', short: 'Avalie a ressonância emocional, sinergia comunicativa e expectativas mútuas com seu parceiro.' },
    hi: { name: 'रिश्ता अनुकूलता परीक्षण (Relationship Compatibility)', short: 'अपने साथी के साथ भावनात्मक तालमेल, संचार तालमेल, और साझा अपेक्षाओं का मूल्यांकन करें।' }
  },
  'emotional-awareness-test': {
    es: { name: 'Test de Conciencia Emocional', short: 'Mide con qué precisión identificas, procesas y expresas tus señales y sentimientos internos en tiempo real.' },
    fr: { name: 'Test de Lucidité Émotionnelle', short: 'Mesurez la précision avec laquelle vous identifiez, comprenez et formulez vos émotions intérieures en temps réel.' },
    de: { name: 'Test zur Emotionalen Achtsamkeit', short: 'Erfassen Sie, wie präzise Sie innere Gefühlszustände und emotionale Signale in Echtzeit wahrnehmen und einordnen.' },
    pt: { name: 'Teste de Consciência Emocional', short: 'Meça com que clareza você identifica, processa e articula seus sentimentos internos em tempo real.' },
    hi: { name: 'भावनात्मक जागरूकता परीक्षण (Emotional Awareness)', short: 'मापें कि आप वास्तविक समय में अपनी आंतरिक भावनाओं और संकेतों को कितनी सटीकता से पहचानते और व्यक्त करते हैं।' }
  },
  'career-personality-test': {
    es: { name: 'Test de Personalidad Profesional y Vocacional', short: 'Descubre trayectorias laborales, entornos de trabajo y roles alineados con tu estilo de comportamiento y fortalezas.' },
    fr: { name: 'Test de Personnalité Professionnelle', short: 'Découvrez les parcours de carrière, environnements et rôles professionnels en phase avec vos talents naturels.' },
    de: { name: 'Berufspersönlichkeitstest', short: 'Entdecken Sie Karrierepfade und Arbeitsumfelder, die perfekt zu Ihren kognitiven Stärken und Wesenszügen passen.' },
    pt: { name: 'Teste de Personalidade Vocacional', short: 'Descubra carreiras e ambientes de trabalho alinhados ao seu perfil natural e habilidades.' },
    hi: { name: 'करियर व्यक्तित्व परीक्षण (Career Personality)', short: 'अपनी स्वाभाविक व्यवहार शैली और संज्ञानात्मक शक्तियों के अनुरूप करियर पथ और कार्य वातावरण की खोज करें।' }
  },
  'work-style-test': {
    es: { name: 'Test de Estilo de Trabajo', short: 'Comprende qué impulsa tu rendimiento, instintos de liderazgo, resolución de problemas y colaboración profesional.' },
    fr: { name: 'Test de Style de Travail', short: 'Comprenez ce qui stimule votre énergie, vos réflexes de leadership et votre méthode de collaboration.' },
    de: { name: 'Arbeitsstil-Test', short: 'Verstehen Sie Ihre Leistungsfaktoren, Führungsreflexe und bevorzugten Methoden der Teamzusammenarbeit.' },
    pt: { name: 'Teste de Estilo de Trabalho', short: 'Compreenda o que energiza seu trabalho, sua liderança e seus métodos de colaboração em equipe.' },
    hi: { name: 'कार्यशैली परीक्षण (Work Style Test)', short: 'कार्यस्थल में अपनी प्रेरणा, नेतृत्व की सहज प्रवृत्ति, समस्या समाधान और सहयोग को समझें।' }
  },
  'social-confidence-test': {
    es: { name: 'Test de Confianza Social', short: 'Evalúa tu nivel de comodidad, autenticidad y seguridad en reuniones sociales, conversaciones grupales y presentaciones.' },
    fr: { name: "Test d'Assurance Sociale", short: "Évaluez votre aisance, votre authenticité et votre assurance lors des échanges de groupe et prises de parole." },
    de: { name: 'Soziale Selbstsicherheit Test', short: 'Erfassen Sie Ihre Gelassenheit, Authentizität und Selbstsicherheit in sozialen Situationen und Gruppen.' },
    pt: { name: 'Teste de Autoconfiança Social', short: 'Avalie sua segurança, autenticidade e desenvoltura em encontros sociais e conversas em grupo.' },
    hi: { name: 'सामाजिक आत्मविश्वास परीक्षण (Social Confidence)', short: 'सामाजिक समारोहों, समूह चर्चाओं और सार्वजनिक भाषणों में अपने आत्मविश्वास और सहजता का मूल्यांकन करें।' }
  },
  'social-skills-test': {
    es: { name: 'Test de Habilidades Sociales', short: 'Evalúa la escucha activa, comunicación no verbal, empatía conversacional y eficacia interpersonal.' },
    fr: { name: 'Test de Compétences Sociales', short: 'Évaluez votre écoute active, communication non verbale et efficacité relationnelle en société.' },
    de: { name: 'Soziale Kompetenz Test', short: 'Erfassen Sie aktives Zuhören, Körpersprache, Empathie und zwischenmenschliche Wirksamkeit.' },
    pt: { name: 'Teste de Habilidades Sociais', short: 'Avalie escuta ativa, linguagem corporal, empatia e eficácia nas interações sociais cotidianas.' },
    hi: { name: 'सामाजिक कौशल परीक्षण (Social Skills)', short: 'सक्रिय सुनने, अशाब्दिक संचार, बातचीत के तालमेल और पारस्परिक प्रभावशीलता का मूल्यांकन करें।' }
  },
  'motivation-style-test': {
    es: { name: 'Test de Estilos de Motivación', short: 'Identifica tus impulsores motivacionales internos y externos para mantener la constancia y el enfoque en tus metas.' },
    fr: { name: 'Test de Style de Motivation', short: 'Identifiez vos moteurs intrinsèques et extrinsèques pour préserver votre élan et votre concentration.' },
    de: { name: 'Motivationsstil-Test', short: 'Erkennen Sie Ihre inneren und äußeren Antriebsfaktoren für nachhaltige Zielstrebigkeit und Fokus.' },
    pt: { name: 'Teste de Estilo de Motivação', short: 'Identifique seus motores de motivação internos e externos para sustentar foco e persistência.' },
    hi: { name: 'प्रेरणा शैली परीक्षण (Motivation Style)', short: 'लक्ष्यों की ओर निरंतरता और ध्यान बनाए रखने के लिए अपने आंतरिक और बाहरी प्रेरकों को पहचानें।' }
  },
  'goal-orientation-test': {
    es: { name: 'Test de Orientación a Metas', short: 'Descubre si te orientas hacia el dominio de habilidades, el rendimiento comparativo o la evitación de errores.' },
    fr: { name: "Test d'Orientation des Objectifs", short: "Découvrez si votre dynamique repose sur la maîtrise, la performance ou l'évitement de l'échec." },
    de: { name: 'Zielorientierungs-Test', short: 'Erfahren Sie, ob Sie vorrangig durch Meisterschaft, Leistung oder Fehlervermeidung angetrieben werden.' },
    pt: { name: 'Teste de Orientação para Metas', short: 'Descubra se você é impulsionado por domínio de habilidades, desempenho ou prevenção de erros.' },
    hi: { name: 'लक्ष्य अभिविन्यास परीक्षण (Goal Orientation)', short: 'जानें कि क्या आप व्यक्तिगत और व्यावसायिक प्रयासों में महारत, प्रदर्शन या गलतियों से बचने से प्रेरित हैं।' }
  },
  'decision-making-style-test': {
    es: { name: 'Test de Estilos de Toma de Decisiones', short: 'Evalúa tu enfoque decisional: Analítico, Intuitivo, Directivo o Conceptual ante situaciones complejas.' },
    fr: { name: 'Test de Style Décisionnel', short: 'Évaluez votre approche face aux choix complexes : Analytique, Intuitive, Directive ou Conceptuelle.' },
    de: { name: 'Entscheidungsstil-Test', short: 'Analysieren Sie Ihr Entscheidungsmuster: Analytisch, Intuitiv, Richtungsweisend oder Konzeptuell.' },
    pt: { name: 'Teste de Tomada de Decisão', short: 'Avalie sua postura decisória: Analítica, Intuitiva, Diretiva ou Conceitual diante de dilemas complexos.' },
    hi: { name: 'निर्णय लेने की शैली परीक्षण (Decision-Making Style)', short: 'जटिल चुनौतियों का सामना करते समय अपने निर्णय लेने के दृष्टिकोण का मूल्यांकन करें: विश्लेषणात्मक, सहज, निर्देशात्मक, या वैचारिक।' }
  },
  'thinking-style-test': {
    es: { name: 'Test de Estilos de Pensamiento', short: 'Comprende tus patrones cognitivos naturales: Lineal vs Holístico, Concreto vs Abstracto y Detalles vs Visión Global.' },
    fr: { name: 'Test de Style de Pensée', short: "Comprenez votre architecture de pensée : Linéaire/Holistique, Concrète/Abstraite et Détails/Vue d'ensemble." },
    de: { name: 'Denkstil-Test', short: 'Erkennen Sie Ihre Denkmuster: Linear vs. Ganzheitlich, Konkret vs. Abstrakt und Detail vs. Gesamtbild.' },
    pt: { name: 'Teste de Estilo de Pensamento', short: 'Compreenda seus padrões cognitivos: Linear vs Holístico, Concreto vs Abstrato e Detalhe vs Visão Geral.' },
    hi: { name: 'सोच की शैली परीक्षण (Thinking Style)', short: 'अपने प्राकृतिक संज्ञानात्मक पैटर्न को समझें: रैखिक बनाम समग्र, ठोस बनाम अमूर्त, और विवरण बनाम बड़ा चित्र।' }
  },
  'problem-solving-style-test': {
    es: { name: 'Test de Resolución de Problemas', short: 'Identifica tu método de resolución: Sistemático, Creativo, Pragmático o Colaborativo al superar obstáculos.' },
    fr: { name: 'Test de Résolution de Problèmes', short: 'Identifiez votre méthode face aux obstacles : Systématique, Créative, Pragmatique ou Collaborative.' },
    de: { name: 'Problemlösungsstil-Test', short: 'Erkennen Sie Ihren Lösungsansatz: Systematisch, Kreativ, Pragmatisch oder Kollaborativ.' },
    pt: { name: 'Teste de Resolução de Problemas', short: 'Identifique sua abordagem perante desafios: Sistemática, Criativa, Pragmática ou Colaborativa.' },
    hi: { name: 'समस्या समाधान शैली परीक्षण (Problem-Solving Style)', short: 'बाधाओं से निपटने के दौरान अपने समस्या समाधान दृष्टिकोण को पहचानें: व्यवस्थित, रचनात्मक, व्यावहारिक, या सहयोगी।' }
  },
  'leadership-style-test': {
    es: { name: 'Test de Estilos de Liderazgo', short: 'Explora tus instintos de liderazgo: Transformacional, Democrático, Autoritario o Coach para guiar equipos.' },
    fr: { name: 'Test de Style de Leadership', short: 'Explorez votre posture de leader : Transformationnelle, Démocratique, Directrice ou Coach.' },
    de: { name: 'Führungsstil-Test', short: 'Erfassen Sie Ihre Führungskompetenz: Transformational, Demokratisch, Autoritär oder Coaching-orientiert.' },
    pt: { name: 'Teste de Estilos de Liderança', short: 'Explore seus instintos de liderança: Transformacional, Democrática, Diretiva ou Mentora.' },
    hi: { name: 'नेतृत्व शैली परीक्षण (Leadership Style)', short: 'टीमों का प्रभावी ढंग से नेतृत्व करने के लिए अपने मुख्य नेतृत्व गुणों की खोज करें: परिवर्तनकारी, लोकतांत्रिक, आधिकारिक, या कोचिंग।' }
  },
  'workplace-communication-test': {
    es: { name: 'Test de Comunicación en el Trabajo', short: 'Evalúa la claridad, escucha activa y eficacia comunicativa en equipos y proyectos multidisciplinares.' },
    fr: { name: 'Test de Communication Professionnelle', short: "Évaluez la clarté de vos échanges, votre écoute et votre impact au sein des équipes de travail." },
    de: { name: 'Arbeitsplatz-Kommunikationstest', short: 'Analysieren Sie Ausdrucksstärke, aktives Zuhören und Teamdialoge im beruflichen Umfeld.' },
    pt: { name: 'Teste de Comunicação no Trabalho', short: 'Avalie a eficácia, escuta ativa e clareza da sua comunicação em equipes e organizações.' },
    hi: { name: 'कार्यस्थल संचार परीक्षण (Workplace Communication)', short: 'टीमों और संगठनों के भीतर अपने मौखिक, लिखित और सहयोगी संचार की प्रभावशीलता का मूल्यांकन करें।' }
  },
  'conflict-resolution-style-test': {
    es: { name: 'Test de Resolución de Conflictos', short: 'Comprende tu estrategia para resolver desacuerdos constructivamente y preservar relaciones de colaboración.' },
    fr: { name: 'Test de Résolution de Conflits', short: 'Comprenez votre approche pour désamorcer les désaccords et maintenir des relations de travail saines.' },
    de: { name: 'Konfliktlösungsstil-Test', short: 'Verstehen Sie Ihre Strategien zur konstruktiven Beilegung von Differenzen und Beziehungsbewahrung.' },
    pt: { name: 'Teste de Resolução de Conflitos', short: 'Compreenda suas estratégias para solucionar divergências de forma construtiva e saudável.' },
    hi: { name: 'संघर्ष समाधान शैली परीक्षण (Conflict Resolution Style)', short: 'पारस्परिक असहमतियों को रचनात्मक रूप से हल करने और सहयोगी संबंधों को बनाए रखने की अपनी रणनीति को समझें।' }
  },
  'stress-management-style-test': {
    es: { name: 'Test de Gestión del Estrés', short: 'Descubre cómo afrontas la presión aguda y crónica: estrategias focalizadas en el problema, la emoción o la evitación.' },
    fr: { name: 'Test de Gestion du Stress', short: "Découvrez comment vous gérez la pression : stratégies centrées sur le problème, l'émotion ou l'évitement." },
    de: { name: 'Stressbewältigungsstil-Test', short: 'Erfahren Sie, wie Sie mit Druck umgehen: problemorientierte, emotionsorientierte oder vermeidende Ansätze.' },
    pt: { name: 'Teste de Gestão do Estresse', short: 'Descubra como você lida com a pressão: foco no problema, regulação emocional ou esquiva.' },
    hi: { name: 'तनाव प्रबंधन शैली परीक्षण (Stress Management Style)', short: 'जानें कि आप तीव्र और पुराने दबाव का सामना कैसे करते हैं: समस्या-केंद्रित, भावना-केंद्रित, या परिहार-उन्मुख रणनीतियाँ।' }
  },
  'resilience-test': {
    es: { name: 'Test de Resiliencia Psicológica', short: 'Mide tu fortaleza mental, flexibilidad adaptativa y capacidad de recuperación ante la adversidad.' },
    fr: { name: 'Test de Résilience Psychologique', short: 'Mesurez votre force morale, votre adaptabilité et votre capacité de rebond face aux épreuves.' },
    de: { name: 'Resilienz-Test', short: 'Messen Sie psychische Widerstandskraft, Anpassungsfähigkeit und Erholungsfähigkeit bei Rückschlägen.' },
    pt: { name: 'Teste de Resiliência Psicológica', short: 'Meça sua força mental, capacidade de adaptação e superação de adversidades.' },
    hi: { name: 'मनोवैज्ञानिक लचीलापन परीक्षण (Resilience Test)', short: 'प्रतिकूल परिस्थितियों और जीवन के तनाव का सामना करते समय मनोवैज्ञानिक लचीलेपन, मुकाबला रणनीतियों और मानसिक धैर्य को मापें।' }
  },
  'empathy-test': {
    es: { name: 'Test de Empatía Interpersonal', short: 'Mide tu empatía cognitiva, emocional y compasiva para entender cómo percibes y respondes a los sentimientos ajenos.' },
    fr: { name: "Test d'Empathie Relationnelle", short: "Mesurez votre empathie cognitive, émotionnelle et compatissante face aux vécus d'autrui." },
    de: { name: 'Empathie-Test', short: 'Messen Sie kognitive, emotionale und mitfühlende Empathie im Umgang mit den Gefühlen anderer.' },
    pt: { name: 'Teste de Empatia Interpessoal', short: 'Meça sua empatia cognitiva, emocional e compassiva perante as vivências das outras pessoas.' },
    hi: { name: 'सहानुभूति परीक्षण (Empathy Test)', short: 'दूसरों के भावनात्मक अनुभवों को आप कैसे समझते और प्रतिक्रिया देते हैं, यह जानने के लिए संज्ञानात्मक, भावनात्मक और दयालु सहानुभूति को मापें।' }
  },
  'relationship-boundaries-test': {
    es: { name: 'Test de Límites en las Relaciones', short: 'Evalúa tu habilidad para establecer, comunicar y preservar límites emocionales y personales saludables en pareja.' },
    fr: { name: 'Test des Limites Relationnelles', short: 'Évaluez votre capacité à poser, exprimer et maintenir des limites saines et respectueuses.' },
    de: { name: 'Beziehungsgrenzen-Test', short: 'Erfassen Sie Ihre Fähigkeit, gesunde emotionale und persönliche Grenzen klar zu kommunizieren.' },
    pt: { name: 'Teste de Limites no Relacionamento', short: 'Avalie sua capacidade de estabelecer e manter limites emocionais saudáveis nas relações.' },
    hi: { name: 'संबंध सीमाएं परीक्षण (Relationship Boundaries)', short: 'करीबी रिश्तों में स्वस्थ भावनात्मक और व्यक्तिगत सीमाओं को स्थापित करने, संवाद करने और बनाए रखने की अपनी क्षमता का मूल्यांकन करें।' }
  },
  'self-discipline-test': {
    es: { name: 'Test de Autodisciplina y Fuerza de Voluntad', short: 'Evalúa el control de impulsos, constancia de hábitos, concentración sostenida y determinación hacia metas a largo plazo.' },
    fr: { name: "Test d'Autodiscipline et de Volonté", short: "Évaluez la maîtrise de vos impulsions, la régularité de vos habitudes et votre volonté d'aboutir." },
    de: { name: 'Selbstdisziplin- & Willenskraft-Test', short: 'Messen Sie Impulskontrolle, Gewohnheitskonstanz und Durchhaltevermögen bei langfristigen Vorhaben.' },
    pt: { name: 'Teste de Autodisciplina e Foco', short: 'Avalie controle de impulsos, consistência de hábitos e força de vontade na conquista de objetivos.' },
    hi: { name: 'आत्म-अनुशासन परीक्षण (Self-Discipline Test)', short: 'दीर्घकालिक लक्ष्यों की दिशा में काम करते समय आवेग नियंत्रण, आदत की निरंतरता, निरंतर ध्यान और इच्छाशक्ति का मूल्यांकन करें।' }
  },
  'assertiveness-test': {
    es: { name: 'Test de Asertividad y Autoafirmación', short: 'Evalúa tu habilidad para expresar límites personales, comunicar necesidades con claridad y defenderte con respeto y seguridad.' },
    fr: { name: "Test d'Assertivité et d'Affirmation de Soi", short: "Évaluez votre capacité à affirmer vos besoins, exprimer vos limites avec clarté, respect et assurance." },
    de: { name: 'Assertivitäts- & Durchsetzungs-Test', short: 'Messen Sie Ihre Fähigkeit, eigene Bedürfnisse klar, souverän und respektvoll zu vertreten.' },
    pt: { name: 'Teste de Assertividade e Firmeza', short: 'Avalie sua aptidão para manifestar limites, expor necessidades com clareza e segurança respeitosa.' },
    hi: { name: 'मुखरता परीक्षण (Assertiveness Test)', short: 'व्यक्तिगत सीमाओं को व्यक्त करने, जरूरतों को स्पष्ट रूप से संवाद करने और आत्मविश्वास और सम्मान के साथ अपनी बात रखने की अपनी क्षमता का आकलन करें।' }
  },
  'emotional-availability-test': {
    es: { name: 'Test de Disponibilidad Emocional', short: 'Evalúa tu disposición y capacidad para abrirte a la intimidad emocional auténtica y vulnerable en relaciones cercanas.' },
    fr: { name: 'Test de Disponibilité Émotionnelle', short: 'Évaluez votre ouverture à une intimité émotionnelle authentique, sincère et vulnérable.' },
    de: { name: 'Test zur Emotionalen Verfügbarkeit', short: 'Erfassen Sie Ihre Bereitschaft zu vertrauensvoller, verletzlicher und echter emotionaler Nähe.' },
    pt: { name: 'Teste de Disponibilidade Emocional', short: 'Avalie sua abertura e prontidão para vivenciar intimidade emocional autêntica e vulnerável.' },
    hi: { name: 'भावनात्मक उपलब्धता परीक्षण (Emotional Availability)', short: 'करीबी रिश्तों में प्रामाणिक भावनात्मक जुड़ाव और आत्मीयता के लिए अपनी तत्परता और क्षमता का आकलन करें।' }
  },
  'self-awareness-test': {
    es: { name: 'Test de Autoconocimiento y Autoconciencia', short: 'Examina tu autoconciencia interna y externa para comprender cómo tus valores, pensamientos y actos dan forma a tu vida.' },
    fr: { name: 'Test de Conscience de Soi', short: "Examinez votre conscience intérieure et extérieure pour comprendre l'impact de vos choix et valeurs." },
    de: { name: 'Selbstwahrnehmungs-Test', short: 'Reflektieren Sie innere Werte, Gedanken und Verhaltensmuster für tiefere persönliche Klarheit.' },
    pt: { name: 'Teste de Autopercepção e Clareza', short: 'Examine sua autopercepção interna e externa para alinhar pensamentos, valores e atitudes.' },
    hi: { name: 'आत्म-जागरूकता परीक्षण (Self-Awareness Test)', short: 'यह समझने के लिए अपनी आंतरिक और बाहरी आत्म-जागरूकता की जांच करें कि आपके विचार, मूल्य और कार्य आपके जीवन को कैसे आकार देते हैं।' }
  },
  'introvert-vs-extrovert-test': {
    es: { name: 'Test de Introversión vs Extraversión', short: 'Mapea tu espectro de energía social: Introvertido, Ambivertido o Extravertido para comprender cómo recargas tu vitalidad.' },
    fr: { name: 'Test Introversion vs Extraversion', short: "Déterminez votre profil d'énergie : Introverti, Ambiverti ou Extraverti pour optimiser votre ressourcement." },
    de: { name: 'Introvertiert vs. Extravertiert Profil', short: 'Erkennen Sie Ihr soziales Energiespektrum: Introvertiert, Ambivertiert oder Extravertiert.' },
    pt: { name: 'Teste de Introversão vs Extroversão', short: 'Mapeie seu perfil de energia social (introvertido, ambivertido ou extrovertido) e como você se renova.' },
    hi: { name: 'अंतर्मुखी बनाम बहिर्मुखी परीक्षण (Introvert vs Extrovert)', short: 'जानें कि आप अपनी सामाजिक ऊर्जा को कैसे रिचार्ज करते हैं: अंतर्मुखी, उभयमुखी (Ambivert), या बहिर्मुखी।' }
  },
  'attachment-style-test': {
    es: { name: 'Test de Estilos de Apego Adulto', short: 'Identifica tu patrón de vinculación afectiva: Seguro, Ansioso, Evitativo o Desorganizado en tus relaciones.' },
    fr: { name: "Test des Styles d'Attachement Adulte", short: 'Identifiez votre schéma relationnel : Sécure, Anxieux-Préoccupé, Évitant ou Craintif.' },
    de: { name: 'Bindungsstil-Test für Erwachsene', short: 'Ermitteln Sie Ihr Beziehungsmuster: Sicher, Ängstlich, Vermeidend oder Desorganisiert.' },
    pt: { name: 'Teste de Estilos de Apego Adulto', short: 'Descubra seu padrão de vínculo emocional: Seguro, Ansioso, Evitativo ou Desorganizado.' },
    hi: { name: 'अडल्ट अटैचमेंट स्टाइल टेस्ट', short: 'अपनी भावनात्मक जुड़ाव शैली को पहचानें: सुरक्षित (Secure), चिंतित (Anxious), परिहार (Avoidant), या भयभीत।' }
  },
  'love-language-quiz': {
    es: { name: 'Test de Lenguajes del Amor', short: 'Descubre tus vías prioritarias para expresar y recibir afecto: Palabras, Tiempo de Calidad, Regalos, Actos o Contacto.' },
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

function generateSql() {
  const statements = [];

  // 1. Categories
  for (const [catId, locales] of Object.entries(allCategoryTranslations)) {
    for (const [loc, data] of Object.entries(locales)) {
      statements.push(`INSERT OR REPLACE INTO assessment_category_translations (id, category_id, locale, name, description, seo_title, seo_description, updated_at)
SELECT 'trans_' || id || '_${loc}', id, '${loc}', '${data.name.replace(/'/g, "''")}', '${data.desc.replace(/'/g, "''")}', '${data.name.replace(/'/g, "''")} | PsychologyCalculator.com', '${data.desc.replace(/'/g, "''")}', CURRENT_TIMESTAMP
FROM assessment_categories WHERE id = '${catId}';`);
    }
  }

  // 2. Assessments
  for (const [slug, locales] of Object.entries(allAssessmentTranslations)) {
    for (const [loc, data] of Object.entries(locales)) {
      statements.push(`INSERT OR REPLACE INTO assessment_translations (id, assessment_id, locale, name, short_description, long_description, instructions, disclaimer, seo_title, seo_description, status, updated_at)
SELECT 'trans_' || id || '_${loc}', id, '${loc}', '${data.name.replace(/'/g, "''")}', '${data.short.replace(/'/g, "''")}', long_description, instructions, disclaimer, '${data.name.replace(/'/g, "''")} | PsychologyCalculator.com', '${data.short.replace(/'/g, "''")}', 'published', CURRENT_TIMESTAMP
FROM assessments WHERE slug = '${slug}';`);
    }
  }

  // 3. Dimensions
  for (const loc of ['es', 'fr', 'de', 'pt', 'hi']) {
    statements.push(`INSERT OR IGNORE INTO assessment_dimension_translations (id, dimension_id, locale, name, description)
SELECT 'trans_' || id || '_${loc}', id, '${loc}', name, description FROM assessment_dimensions;`);
  }

  // 4. Questions
  for (const loc of ['es', 'fr', 'de', 'pt', 'hi']) {
    statements.push(`INSERT OR IGNORE INTO assessment_question_translations (id, question_id, locale, question_text)
SELECT 'trans_' || id || '_${loc}', id, '${loc}', question_text FROM assessment_questions;`);
  }

  return statements.join('\n');
}

const sql = generateSql();
const sqlPath = path.resolve(process.cwd(), 'migrations/0041_all_categories_and_assessments_translations.sql');
fs.writeFileSync(sqlPath, sql, 'utf8');
console.log('✔ Generated migrations/0041_all_categories_and_assessments_translations.sql');
