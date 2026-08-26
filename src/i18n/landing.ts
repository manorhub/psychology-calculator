import type { SupportedLocale } from './config';

export interface LandingTranslations {
  hero: {
    badge: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trustItems: string[];
    preview: {
      tag: string;
      title: string;
      alignment: string;
      questionLabel: string;
      questionTopic: string;
      questionText: string;
      breakdownTitle: string;
      dimensions: { name: string; pct: number }[];
      freeResult: string;
      explorePatterns: string;
    };
  };
  trustStrip: {
    title1: string; desc1: string;
    title2: string; desc2: string;
    title3: string; desc3: string;
    title4: string; desc4: string;
  };
  approach: {
    badge: string;
    title: string;
    subtitle: string;
    steps: { num: string; title: string; desc: string }[];
  };
  categories: {
    badge: string;
    title: string;
    subtitle: string;
    personality: { tag: string; title: string; desc: string; tests: string[]; cta: string };
    relationships: { tag: string; title: string; desc: string; tests: string[]; cta: string };
    eq: { tag: string; title: string; desc: string; tests: string[]; cta: string };
    career: { tag: string; title: string; desc: string; tests: string[]; cta: string };
    growth: { tag: string; title: string; desc: string; tests: string[]; cta: string };
  };
  popular: {
    badge: string;
    title: string;
    subtitle: string;
    viewAll: string;
    takeTest: string;
    questionsCount: string;
    minEstimated: string;
  };
  howItWorks: {
    badge: string;
    title: string;
    subtitle: string;
    steps: { num: string; title: string; desc: string }[];
  };
  freeFirst: {
    badge: string;
    title: string;
    desc: string;
    cta: string;
    boxTitle: string;
    items: string[];
  };
  reports: {
    badge: string;
    title: string;
    subtitle: string;
    starter: { name: string; price: string; credits: string; desc: string };
    growth: { popularBadge: string; name: string; price: string; credits: string; desc: string };
    pro: { name: string; price: string; credits: string; desc: string };
    viewPricing: string;
  };
  dimensionalDepth: {
    badge: string;
    title: string;
    desc: string;
    points: { bold: string; text: string }[];
    exampleTag: string;
    exampleType: string;
    alignmentLabel: string;
    alignmentValue: string;
    topBadge: string;
    dim1: string; dim2: string; dim3: string; dim4: string;
    suggestTitle: string;
    suggestText: string;
  };
  privacy: {
    badge: string;
    title: string;
    subtitle: string;
    items: { title: string; desc: string }[];
  };
  whoFor: {
    badge: string;
    title: string;
    subtitle: string;
    groups: { icon: string; title: string; desc: string }[];
  };
  faqs: {
    badge: string;
    title: string;
    subtitle: string;
    items: { q: string; a: string }[];
  };
  disclaimer: {
    prefix: string;
    text: string;
  };
  finalCta: {
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
}

export const landingTranslations: Record<SupportedLocale, LandingTranslations> = {
  en: {
    hero: {
      badge: 'Psychometrics & Self-Discovery',
      title: 'Psychology Tests That Turn Your Answers Into',
      titleHighlight: 'Useful Insights',
      subtitle: 'Explore personality, relationships, emotional intelligence, career, and self-development assessments designed to help you understand your patterns, preferences, and tendencies.',
      ctaPrimary: 'Take a Free Test',
      ctaSecondary: 'Explore Assessments',
      trustItems: ['Free to start', 'No account required for basic results', 'Takes only a few minutes'],
      preview: {
        tag: 'Assessment Preview',
        title: 'Personality & Curiosity Profile',
        alignment: '78% Alignment',
        questionLabel: 'Question 7 of 25',
        questionTopic: 'Intellectual Curiosity',
        questionText: '"I enjoy exploring ideas and perspectives that challenge conventional thinking."',
        breakdownTitle: 'Dimensional Breakdown',
        dimensions: [
          { name: 'Intellectual Curiosity', pct: 82 },
          { name: 'Self-Awareness', pct: 74 },
          { name: 'Adaptability & Novelty', pct: 69 }
        ],
        freeResult: 'Instant Free Result',
        explorePatterns: 'Explore Dimension Patterns →'
      }
    },
    trustStrip: {
      title1: 'FREE TO START', desc1: 'Take assessments and see your basic results without creating an account.',
      title2: 'CLEAR RESULTS', desc2: 'Understand what your scores may mean across distinct psychological dimensions.',
      title3: 'PRIVATE BY DESIGN', desc3: 'Your personal responses and results are kept private and never published.',
      title4: 'DETAILED REPORTS', desc4: 'Optional deeper AI-assisted synthesis with PDF reports when you want them.'
    },
    approach: {
      badge: 'A Thoughtful Approach',
      title: 'A Better Way to Explore Your Personality',
      subtitle: 'Many people take an online quiz, receive a rigid label, and have no idea what to do with it. We focus on nuanced dimensions so you can see your real tendencies in context.',
      steps: [
        { num: '1', title: 'Take Assessment', desc: 'Answer focused questions at your own pace.' },
        { num: '2', title: 'Understand Scores', desc: 'See your raw and normalized percentiles.' },
        { num: '3', title: 'Explore Dimensions', desc: 'Examine specific traits, facets, and strengths.' },
        { num: '4', title: 'Reflect on Patterns', desc: 'Notice how your tendencies shape decisions.' },
        { num: '5', title: 'Optional AI Report', desc: 'Unlock deep synthesis whenever you choose.' }
      ]
    },
    categories: {
      badge: 'Browse By Topic',
      title: 'Explore Psychology Tests by Topic',
      subtitle: 'Find structured assessments across personality traits, relational styles, emotional awareness, and career preferences.',
      personality: {
        tag: 'Core Traits',
        title: 'Personality Tests',
        desc: 'Explore core personality traits, behavioral tendencies, intellectual curiosity, and decision-making preferences.',
        tests: ['Big Five Personality Test', 'Openness to Experience Test', 'Conscientiousness & Focus Test'],
        cta: 'Explore Personality Tests'
      },
      relationships: {
        tag: 'Connection',
        title: 'Relationship Tests',
        desc: 'Explore communication patterns, adult attachment styles, emotional boundaries, and interpersonal compatibility.',
        tests: ['Adult Attachment Style Test', 'Communication Style Assessment', 'Relational Boundaries Test'],
        cta: 'Explore Relationship Tests'
      },
      eq: {
        tag: 'Awareness',
        title: 'Emotional Intelligence Tests',
        desc: 'Examine emotional self-awareness, empathy, regulation during stress, and social perception.',
        tests: ['Emotional Intelligence (EQ) Test', 'Empathy & Perspective Test', 'Self-Awareness Assessment'],
        cta: 'Explore Emotional Intelligence'
      },
      career: {
        tag: 'Professional',
        title: 'Career & Work Style',
        desc: 'Explore work motivation, leadership tendencies, collaboration styles, and task focus.',
        tests: ['Career Personality Assessment', 'Leadership Style Exploration', 'Collaboration & Work Preferences'],
        cta: 'Explore Career Tests'
      },
      growth: {
        tag: 'Growth & Resilience',
        title: 'Self-Development & Resilience',
        desc: 'Reflect on resilience, assertiveness, motivation, cognitive flexibility, and personal boundaries.',
        tests: ['Resilience & Adaptability Test', 'Constructive Mindset Exploration', 'Stress Response & Recovery', 'Assertiveness & Communication'],
        cta: 'Explore Self-Development Tests'
      }
    },
    popular: {
      badge: 'Featured Tests',
      title: 'Popular Assessments',
      subtitle: 'Real, structured self-assessments designed for thoughtful self-reflection.',
      viewAll: 'View All Assessments',
      takeTest: 'Take Test',
      questionsCount: 'questions',
      minEstimated: 'min'
    },
    howItWorks: {
      badge: 'Simple Process',
      title: 'How It Works',
      subtitle: 'From first question to dimensional insight in four simple steps.',
      steps: [
        { num: '01', title: 'Choose an assessment', desc: 'Select a topic in personality, relationships, career, or emotional intelligence that you are curious about.' },
        { num: '02', title: 'Answer honestly', desc: 'Respond to clear, focused statements on a simple 5-point scale at your own comfortable pace.' },
        { num: '03', title: 'See your results', desc: 'Instantly view your overall score and multi-dimensional breakdown for free without needing an account.' },
        { num: '04', title: 'Go deeper if you want', desc: 'Optionally unlock in-depth AI psychological narrative synthesis and vector PDF reports using one-time credits.' }
      ]
    },
    freeFirst: {
      badge: 'Free-First Experience',
      title: 'Start Free. Decide Later.',
      desc: 'You don\'t have to pay to take a test. You don\'t have to create an account before starting. Take an assessment, view your free basic result, and decide for yourself whether you want a deeper report.',
      cta: 'Take Your First Test Free',
      boxTitle: 'What\'s Included Free',
      items: [
        '100% Free assessment completion',
        'Instant score calculation & percentiles',
        'Dimensional breakdown visualization',
        'Basic psychological summary',
        'Optional: In-depth AI Dossier (5 credits)'
      ]
    },
    reports: {
      badge: 'Optional In-Depth Layer',
      title: 'Want to Go Beyond the Score?',
      subtitle: 'Your free basic result gives you the essential foundation. A detailed report looks closer at your dimensions, cross-pattern synthesis, strengths, blind spots, and communication style.',
      starter: { name: 'Starter', price: '$4 USD', credits: '20 Credits • Up to 4 reports', desc: 'One-time payment. Credits never expire.' },
      growth: { popularBadge: 'Most Popular', name: 'Growth', price: '$9 USD', credits: '50 Credits • Up to 10 reports', desc: 'One-time payment. Credits never expire.' },
      pro: { name: 'Pro', price: '$19 USD', credits: '120 Credits • Up to 24 reports', desc: 'One-time payment. Credits never expire.' },
      viewPricing: 'See How Detailed Reports Work & View All Packages'
    },
    dimensionalDepth: {
      badge: 'Dimensional Depth',
      title: 'Your Score Is Only the Starting Point',
      desc: 'A single number rarely captures how human personality works. PsychologyCalculator.com breaks assessments down into their constituent dimensions so you can see where your tendencies are stronger, balanced, or less prominent.',
      points: [
        { bold: 'Nuance over labels:', text: 'Understand specific traits rather than fitting into a rigid four-letter box.' },
        { bold: 'Cross-dimension patterns:', text: 'Observe how high curiosity combined with balanced focus shapes creative problem solving.' },
        { bold: 'Constructive language:', text: 'Thoughtful, non-diagnostic observations designed to encourage self-reflection.' }
      ],
      exampleTag: 'EXAMPLE RESULT',
      exampleType: 'Profile Synthesis',
      alignmentLabel: 'Overall Alignment',
      alignmentValue: '78%',
      topBadge: 'High Intellectual Curiosity',
      dim1: 'Curiosity', dim2: 'Creativity & Ideas', dim3: 'Novelty Seeking', dim4: 'Perspective Flexibility',
      suggestTitle: 'What this may suggest:',
      suggestText: 'Your responses indicate an active preference for exploring unfamiliar concepts, conceptual thinking, and open-minded inquiry when evaluating everyday challenges.'
    },
    privacy: {
      badge: 'Privacy & Security',
      title: 'Your Results Are Personal',
      subtitle: 'We treat assessment answers with the respect and boundaries personal reflection deserves.',
      items: [
        { title: 'You own your data', desc: 'Your results belong to you. Personal dossiers require user authorization to view.' },
        { title: 'No public exposure', desc: 'Public assessment catalog pages never expose user responses or private result data.' },
        { title: 'Never indexed', desc: 'Personal result and report pages contain strict noindex tags for search engines.' },
        { title: 'Encrypted billing', desc: 'Payments are processed securely via Lemon Squeezy Merchant of Record.' }
      ]
    },
    whoFor: {
      badge: 'Community',
      title: 'Who Uses PsychologyCalculator.com?',
      subtitle: 'Designed for anyone seeking structured, grounded self-reflection.',
      groups: [
        { icon: '🧭', title: 'Curious Individuals', desc: 'People who want to understand their personality traits, tendencies, and natural motivations.' },
        { icon: '💬', title: 'Partners & Couples', desc: 'Couples exploring adult attachment styles, communication tendencies, and emotional boundaries.' },
        { icon: '📚', title: 'Students & Learners', desc: 'Learners studying psychometric frameworks and cognitive styles for academic or personal interest.' },
        { icon: '💼', title: 'Professionals & Leaders', desc: 'Professionals reflecting on leadership styles, workplace communication, and collaboration patterns.' },
        { icon: '🌱', title: 'Self-Development Seekers', desc: 'Individuals working on emotional intelligence, stress resilience, and self-awareness.' },
        { icon: '💡', title: 'Reflective Thinkers', desc: 'Anyone who appreciates structured questions that prompt meaningful self-examination.' }
      ]
    },
    faqs: {
      badge: 'Questions & Answers',
      title: 'Frequently Asked Questions',
      subtitle: 'Everything you need to know about taking tests, viewing results, and detailed reports.',
      items: [
        { q: 'What is a psychology test?', a: 'A psychology test on PsychologyCalculator.com is a structured self-assessment questionnaire with standardized statements. It helps you reflect on specific behavioral traits, emotional tendencies, or relational patterns across multiple dimensions.' },
        { q: 'Are the personality tests free?', a: 'Yes. All assessments on PsychologyCalculator.com are 100% free to take. You will receive an immediate dimensional score breakdown and basic interpretation without paying anything.' },
        { q: 'Can I take a personality test without creating an account?', a: 'Yes. You can start and complete any assessment as a guest without creating an account or providing a credit card. Your basic result is generated immediately.' },
        { q: 'How long do the assessments take?', a: 'Most assessments consist of 20 to 25 focused questions and take approximately 5 to 7 minutes to complete at a comfortable pace.' },
        { q: 'What can I learn from a personality test?', a: 'You can discover your relative tendencies across specific dimensions—such as intellectual curiosity, emotional regulation, conscientiousness, or communication style—and understand how these patterns interact in everyday situations.' },
        { q: 'What is a personality assessment?', a: 'A personality assessment is a structured psychological tool that evaluates different facets of your behavioral style, decision-making preferences, and natural strengths rather than reducing you to a simplistic label.' },
        { q: 'Are these tests a clinical diagnosis?', a: 'No. Assessments on PsychologyCalculator.com are provided strictly for educational and personal self-reflection purposes. They are not clinical diagnoses and are not a substitute for professional mental health care.' },
        { q: 'How do detailed AI reports work?', a: 'If you want deeper narrative interpretation beyond your free basic score, you can optionally unlock a comprehensive AI report. It synthesizes cross-dimension patterns, strengths, blind spots, and communication tendencies, and includes a downloadable vector PDF.' },
        { q: 'Do I need a monthly subscription?', a: 'No. PsychologyCalculator.com uses a simple pay-as-you-go credit system with no recurring billing. You only purchase one-time credits when you want a detailed report.' },
        { q: 'Do credits expire?', a: 'No. Purchased credits never expire. A credit package bought today can be used whenever you choose.' }
      ]
    },
    disclaimer: {
      prefix: 'Educational & Self-Reflection Notice:',
      text: 'PsychologyCalculator.com provides self-assessments for educational and personal reflection purposes. Results are not a clinical psychological or psychiatric diagnosis and should not replace advice from a qualified mental health professional.'
    },
    finalCta: {
      title: 'Ready to Explore Your Results?',
      subtitle: 'Choose an assessment, answer at your own pace, and see what your responses reveal about your patterns, strengths, and preferences.',
      ctaPrimary: 'Take a Free Test →',
      ctaSecondary: 'Browse All Assessments'
    }
  },

  es: {
    hero: {
      badge: 'Psicometría y Autodescubrimiento',
      title: 'Tests Psicológicos que Transforman tus Respuestas en',
      titleHighlight: 'Perspectivas Útiles',
      subtitle: 'Explora evaluaciones de personalidad, relaciones, inteligencia emocional, carrera y desarrollo personal diseñadas para comprender tus patrones y tendencias.',
      ctaPrimary: 'Hacer un Test Gratis',
      ctaSecondary: 'Explorar Evaluaciones',
      trustItems: ['Gratis para empezar', 'Sin registro previo para resultados básicos', 'Solo toma unos minutos'],
      preview: {
        tag: 'Vista Previa del Test',
        title: 'Perfil de Personalidad y Curiosidad',
        alignment: '78% Alineación',
        questionLabel: 'Pregunta 7 de 25',
        questionTopic: 'Curiosidad Intelectual',
        questionText: '"Disfruto explorando ideas y perspectivas que desafían el pensamiento convencional."',
        breakdownTitle: 'Desglose Dimensional',
        dimensions: [
          { name: 'Curiosidad Intelectual', pct: 82 },
          { name: 'Autoconocimiento', pct: 74 },
          { name: 'Adaptabilidad y Novedad', pct: 69 }
        ],
        freeResult: 'Resultado Inmediato Gratis',
        explorePatterns: 'Explorar Patrones Dimensionales →'
      }
    },
    trustStrip: {
      title1: 'GRATIS PARA EMPEZAR', desc1: 'Realiza evaluaciones y obtén resultados básicos sin necesidad de crear una cuenta.',
      title2: 'RESULTADOS CLAROS', desc2: 'Comprende el significado de tus puntuaciones a través de dimensiones psicológicas claras.',
      title3: 'MÁXIMA PRIVACIDAD', desc3: 'Tus respuestas y resultados se mantienen estrictamente privados y nunca se publican.',
      title4: 'INFORMES DETALLADOS', desc4: 'Síntesis profunda asistida por IA e informes descargables en PDF cuando los necesites.'
    },
    approach: {
      badge: 'Un Enfoque Reflexivo',
      title: 'Una Mejor Forma de Explorar tu Personalidad',
      subtitle: 'En lugar de encasillarte en etiquetas rígidas, nos centramos en dimensiones matizadas para que comprendas tus tendencias reales en su contexto.',
      steps: [
        { num: '1', title: 'Realiza el Test', desc: 'Responde a preguntas claras a tu propio ritmo.' },
        { num: '2', title: 'Comprende tu Puntuación', desc: 'Consulta tus percentiles brutos y normalizados.' },
        { num: '3', title: 'Explora Dimensiones', desc: 'Examina rasgos específicos, facetas y fortalezas.' },
        { num: '4', title: 'Reflexiona sobre Patrones', desc: 'Descubre cómo tus tendencias influyen en tus decisiones.' },
        { num: '5', title: 'Informe IA Opcional', desc: 'Desbloquea análisis profundos cuando lo desees.' }
      ]
    },
    categories: {
      badge: 'Explorar por Tema',
      title: 'Tests Psicológicos por Categoría',
      subtitle: 'Evaluaciones estructuradas sobre rasgos de personalidad, estilos relacionales, conciencia emocional y preferencias profesionales.',
      personality: {
        tag: 'Rasgos Clave',
        title: 'Tests de Personalidad',
        desc: 'Explora rasgos fundamentales, tendencias conductuales, curiosidad y toma de decisiones.',
        tests: ['Test Big Five (OCEAN)', 'Test de Apertura a la Experiencia', 'Test de Responsabilidad y Enfoque'],
        cta: 'Explorar Tests de Personalidad'
      },
      relationships: {
        tag: 'Vínculos',
        title: 'Tests de Pareja y Relaciones',
        desc: 'Descubre patrones de comunicación, apego adulto, límites emocionales y compatibilidad.',
        tests: ['Test de Estilos de Apego Adulto', 'Evaluación de Comunicación', 'Test de Límites en Relaciones'],
        cta: 'Explorar Tests de Relaciones'
      },
      eq: {
        tag: 'Conciencia',
        title: 'Inteligencia Emocional',
        desc: 'Evalúa la autoconciencia emocional, empatía, autorregulación y percepción social.',
        tests: ['Test de Inteligencia Emocional (EQ)', 'Test de Empatía y Perspectiva', 'Evaluación de Autoconocimiento'],
        cta: 'Explorar Inteligencia Emocional'
      },
      career: {
        tag: 'Profesional',
        title: 'Carrera y Trabajo',
        desc: 'Analiza motivación laboral, liderazgo, trabajo en equipo y enfoque en metas.',
        tests: ['Personalidad Profesional', 'Estilo de Liderazgo', 'Preferencias de Colaboración'],
        cta: 'Explorar Tests de Carrera'
      },
      growth: {
        tag: 'Crecimiento',
        title: 'Desarrollo y Resiliencia',
        desc: 'Reflexiona sobre resiliencia, asertividad, motivación y flexibilidad cognitiva.',
        tests: ['Test de Resiliencia y Adaptabilidad', 'Mentalidad Constructiva', 'Respuesta al Estrés', 'Asertividad y Comunicación'],
        cta: 'Explorar Desarrollo Personal'
      }
    },
    popular: {
      badge: 'Tests Destacados',
      title: 'Evaluaciones Populares',
      subtitle: 'Autoevaluaciones estructuradas diseñadas para la autorreflexión constructiva.',
      viewAll: 'Ver Todas las Evaluaciones',
      takeTest: 'Hacer Test',
      questionsCount: 'preguntas',
      minEstimated: 'min'
    },
    howItWorks: {
      badge: 'Proceso Sencillo',
      title: 'Cómo Funciona',
      subtitle: 'De la primera pregunta a perspectivas dimensionales en cuatro pasos sencillos.',
      steps: [
        { num: '01', title: 'Elige una evaluación', desc: 'Selecciona el tema de personalidad, relaciones o carrera que te interese.' },
        { num: '02', title: 'Responde con honestidad', desc: 'Evalúa afirmaciones claras en una escala de 5 puntos a tu propio ritmo.' },
        { num: '03', title: 'Consulta tus resultados', desc: 'Visualiza de forma gratuita e instantánea tu puntuación y desglose dimensional.' },
        { num: '04', title: 'Profundiza si lo deseas', desc: 'Opcionalmente genera informes narrativos con IA y descarga tu dossier en PDF.' }
      ]
    },
    freeFirst: {
      badge: 'Experiencia Gratuita',
      title: 'Comienza Gratis. Decide Después.',
      desc: 'No necesitas pagar ni crear una cuenta para realizar una prueba. Completa el test, consulta tu resultado básico y decide si deseas un informe ampliado.',
      cta: 'Haz tu Primer Test Gratis',
      boxTitle: 'Incluido Gratis',
      items: [
        'Completar test 100% gratis',
        'Cálculo inmediato de puntuación y percentiles',
        'Visualización de desglose dimensional',
        'Resumen psicológico inicial',
        'Opcional: Informe en profundidad con IA (5 créditos)'
      ]
    },
    reports: {
      badge: 'Profundidad Opcional',
      title: '¿Deseas Ir Más Allá de la Puntuación?',
      subtitle: 'Tu resultado básico gratuito te brinda la base. Un informe detallado analiza a fondo sinergias, fortalezas, puntos ciegos y patrones de comunicación.',
      starter: { name: 'Inicial', price: '$4 USD', credits: '20 Créditos • Hasta 4 informes', desc: 'Pago único. Los créditos nunca caducan.' },
      growth: { popularBadge: 'Más Popular', name: 'Crecimiento', price: '$9 USD', credits: '50 Créditos • Hasta 10 informes', desc: 'Pago único. Los créditos nunca caducan.' },
      pro: { name: 'Profesional', price: '$19 USD', credits: '120 Créditos • Hasta 24 informes', desc: 'Pago único. Los créditos nunca caducan.' },
      viewPricing: 'Conoce los Informes Detallados y Ver Paquetes'
    },
    dimensionalDepth: {
      badge: 'Profundidad Dimensional',
      title: 'Tu Puntuación es Solo el Comienzo',
      desc: 'Un solo número no refleja la complejidad humana. Desglosamos las evaluaciones en dimensiones específicas para que aprecies dónde destacan tus fortalezas y tendencias.',
      points: [
        { bold: 'Matices sobre etiquetas:', text: 'Comprende rasgos concretos en lugar de limitarte a una casilla rígida.' },
        { bold: 'Patrones multidimensionales:', text: 'Descubre cómo interactúan tu curiosidad y enfoque en la resolución de problemas.' },
        { bold: 'Lenguaje constructivo:', text: 'Observaciones respetuosas orientadas al crecimiento y la autorreflexión.' }
      ],
      exampleTag: 'EJEMPLO DE RESULTADO',
      exampleType: 'Síntesis de Perfil',
      alignmentLabel: 'Alineación Global',
      alignmentValue: '78%',
      topBadge: 'Alta Curiosidad Intelectual',
      dim1: 'Curiosidad', dim2: 'Creatividad e Ideas', dim3: 'Búsqueda de Novedad', dim4: 'Flexibilidad de Perspectiva',
      suggestTitle: 'Lo que esto sugiere:',
      suggestText: 'Tus respuestas reflejan una inclinación activa hacia la exploración de conceptos novedosos, pensamiento conceptual y apertura mental ante nuevos desafíos.'
    },
    privacy: {
      badge: 'Privacidad y Seguridad',
      title: 'Tus Resultados Son Personales',
      subtitle: 'Tratamos tus respuestas con el máximo respeto y confidencialidad que mereces.',
      items: [
        { title: 'Tú controlas tus datos', desc: 'Tus resultados te pertenecen y solo tú puedes autorizar su acceso.' },
        { title: 'Sin exposición pública', desc: 'Las páginas públicas de catálogo jamás muestran datos personales o respuestas.' },
        { title: 'Nunca indexados', desc: 'Las páginas privadas de resultados cuentan con directivas estrictas de noindex.' },
        { title: 'Pagos seguros', desc: 'Transacciones procesadas de forma segura y encriptada vía Lemon Squeezy.' }
      ]
    },
    whoFor: {
      badge: 'Comunidad',
      title: '¿Para Quién es Psychology Calculator?',
      subtitle: 'Diseñado para cualquier persona interesada en una autorreflexión fundamentada y constructiva.',
      groups: [
        { icon: '🧭', title: 'Personas Curiosas', desc: 'Quienes buscan comprender mejor sus motivaciones, rasgos y patrones naturales.' },
        { icon: '💬', title: 'Parejas y Vínculos', desc: 'Parejas que desean profundizar en sus estilos de apego y comunicación.' },
        { icon: '📚', title: 'Estudiantes y Aprendices', desc: 'Interesados en modelos psicométricos y estilos cognitivos.' },
        { icon: '💼', title: 'Profesionales y Líderes', desc: 'Líderes que reflexionan sobre dinámicas de trabajo, liderazgo y colaboración.' },
        { icon: '🌱', title: 'Buscadores de Crecimiento', desc: 'Personas trabajando en inteligencia emocional, resiliencia y autocuidado.' },
        { icon: '💡', title: 'Mentes Reflexivas', desc: 'Cualquiera que valore preguntas profundas que fomenten la claridad personal.' }
      ]
    },
    faqs: {
      badge: 'Preguntas y Respuestas',
      title: 'Preguntas Frecuentes',
      subtitle: 'Todo lo que necesitas saber sobre cómo realizar pruebas y consultar informes.',
      items: [
        { q: '¿Qué es un test psicológico?', a: 'Es un cuestionario estructurado con ítems estandarizados que te ayuda a reflexionar sobre rasgos de personalidad, emociones o patrones relacionales.' },
        { q: '¿Las evaluaciones son gratuitas?', a: 'Sí. Todas las evaluaciones son 100% gratuitas para responder, con desglose dimensional y puntuación inmediata sin coste.' },
        { q: '¿Puedo hacer un test sin crear una cuenta?', a: 'Sí. Puedes completar cualquier prueba como invitado sin registrarte ni proporcionar datos de pago.' },
        { q: '¿Cuánto tiempo dura una evaluación?', a: 'La mayoría consta de 20 a 25 preguntas y se completa en unos 5 a 7 minutos a un ritmo cómodo.' },
        { q: '¿Qué aprenderé de un test de personalidad?', a: 'Conocerás tus tendencias relativas en dimensiones como curiosidad, empatía, asertividad o regulación emocional.' },
        { q: '¿Estas pruebas constituyen un diagnóstico clínico?', a: 'No. Son herramientas de autorreflexión y educación personal, y no sustituyen la atención de un profesional de la salud mental.' },
        { q: '¿Cómo funcionan los informes con IA?', a: 'Si deseas una interpretación narrativa profunda, puedes desbloquear un informe exhaustivo con síntesis de patrones y PDF descargable.' },
        { q: '¿Hay suscripción mensual recurrente?', a: 'No. Operamos con un sistema de créditos prepagados sin cobros automáticos ni renovaciones ocultas.' },
        { q: '¿Los créditos comprados caducan?', a: 'No. Los créditos nunca caducan y puedes utilizarlos cuando lo desees.' },
        { q: '¿Mis resultados son confidenciales?', a: 'Sí. Tus resultados y respuestas son privados y nunca se comparten públicamente.' }
      ]
    },
    disclaimer: {
      prefix: 'Aviso Educativo y de Autorreflexión:',
      text: 'PsychologyCalculator.com ofrece autoevaluaciones con fines educativos y de autorreflexión. Los resultados no constituyen un diagnóstico médico o psiquiátrico ni sustituyen el asesoramiento profesional.'
    },
    finalCta: {
      title: '¿Listo para Explorar tus Resultados?',
      subtitle: 'Elige un test, responde a tu propio ritmo y descubre lo que tus respuestas revelan sobre tus fortalezas y patrones.',
      ctaPrimary: 'Hacer un Test Gratis →',
      ctaSecondary: 'Ver Todas las Evaluaciones'
    }
  },

  hi: {
    hero: {
      badge: 'मनोविज्ञान एवं आत्म-खोज',
      title: 'मनोवैज्ञानिक परीक्षण जो आपके उत्तरों को बदलते हैं',
      titleHighlight: 'सटीक अंतर्दृष्टि में',
      subtitle: 'व्यक्तित्व, रिश्ते, भावनात्मक बुद्धिमत्ता, करियर और आत्म-विकास परीक्षणों के माध्यम से अपने स्वभाव, प्राथमिकताओं और प्रवृत्तियों को गहराई से समझें।',
      ctaPrimary: 'मुफ़्त परीक्षण दें',
      ctaSecondary: 'सभी परीक्षण देखें',
      trustItems: ['मुफ़्त में शुरू करें', 'बुनियादी परिणाम के लिए खाते की आवश्यकता नहीं', 'केवल कुछ मिनट लगते हैं'],
      preview: {
        tag: 'परीक्षण पूर्वावलोकन',
        title: 'व्यक्तित्व एवं जिज्ञासा प्रोफ़ाइल',
        alignment: '78% अनुकूलता',
        questionLabel: 'प्रश्न 7 of 25',
        questionTopic: 'बौद्धिक जिज्ञासा',
        questionText: '"मुझे ऐसे विचारों और दृष्टिकोणों का पता लगाना पसंद है जो पारंपरिक सोच को चुनौती देते हैं।"',
        breakdownTitle: 'आयामीय विश्लेषण',
        dimensions: [
          { name: 'बौद्धिक जिज्ञासा', pct: 82 },
          { name: 'आत्म-जागरूकता', pct: 74 },
          { name: 'अनुकूलनशीलता एवं नवीनता', pct: 69 }
        ],
        freeResult: 'तत्काल निःशुल्क परिणाम',
        explorePatterns: 'आयाम पैटर्न देखें →'
      }
    },
    trustStrip: {
      title1: 'शुरुआत मुफ़्त', desc1: 'बिना खाता बनाए टेस्ट पूरा करें और बुनियादी स्कोर तुरंत देखें।',
      title2: 'स्पष्ट विश्लेषण', desc2: 'विभिन्न मनोवैज्ञानिक आयामों पर अपने स्कोर का अर्थ समझें।',
      title3: 'पूर्ण गोपनीयता', desc3: 'आपके उत्तर और व्यक्तिगत परिणाम हमेशा सुरक्षित और निजी रहते हैं।',
      title4: 'विस्तृत रिपोर्ट', desc4: 'आवश्यकता होने पर AI विश्लेषण एवं डाउनलोड करने योग्य PDF रिपोर्ट।'
    },
    approach: {
      badge: 'एक वैज्ञानिक दृष्टिकोण',
      title: 'अपने व्यक्तित्व को समझने का बेहतर तरीका',
      subtitle: 'रूढ़िवादी लेबलों के बजाय, हम सूक्ष्म आयामों पर ध्यान केंद्रित करते हैं ताकि आप अपने वास्तविक स्वभाव को संदर्भ सहित समझ सकें।',
      steps: [
        { num: '1', title: 'परीक्षण दें', desc: 'अपनी गति से केंद्रित प्रश्नों के उत्तर दें।' },
        { num: '2', title: 'स्कोर समझें', desc: 'अपने बुनियादी और मानकीकृत प्रतिशतक देखें।' },
        { num: '3', title: 'आयाम देखें', desc: 'विशिष्ट लक्षणों, खूबियों और शक्तियों को जानें।' },
        { num: '4', title: 'पैटर्न पर विचार करें', desc: 'देखें कि आपका स्वभाव आपके निर्णयों को कैसे प्रभावित करता है।' },
        { num: '5', title: 'वैकल्पिक AI रिपोर्ट', desc: 'गहन मनोवैज्ञानिक विश्लेषण कभी भी अनलॉक करें।' }
      ]
    },
    categories: {
      badge: 'विषय अनुसार खोजें',
      title: 'विषय अनुसार मनोविज्ञान परीक्षण',
      subtitle: 'व्यक्तित्व, रिश्ते, भावनात्मक समझ और करियर से जुड़े संरचित मनोवैज्ञानिक परीक्षण।',
      personality: {
        tag: 'मूल प्रवृत्तियाँ',
        title: 'व्यक्तित्व परीक्षण',
        desc: 'व्यक्तित्व के मूल लक्षण, व्यवहारिक प्रवृत्तियाँ, बौद्धिक जिज्ञासा और निर्णय लेने की क्षमता।',
        tests: ['Big Five व्यक्तित्व परीक्षण', 'अनुभव के प्रति खुलापन टेस्ट', 'कर्तव्यनिष्ठा एवं फोकस टेस्ट'],
        cta: 'व्यक्तित्व परीक्षण देखें'
      },
      relationships: {
        tag: 'संबंध',
        title: 'संबंध एवं रिश्ते परीक्षण',
        desc: 'संवाद शैली, वयस्क लगाव शैली, भावनात्मक सीमाएं और आपसी अनुकूलता।',
        tests: ['वयस्क लगाव शैली टेस्ट', 'संचार शैली मूल्यांकन', 'संबंध सीमा टेस्ट'],
        cta: 'रिश्ते परीक्षण देखें'
      },
      eq: {
        tag: 'जागरूकता',
        title: 'भावनात्मक बुद्धिमत्ता (EQ)',
        desc: 'भावनात्मक आत्म-जागरूकता, सहानुभूति, तनाव प्रबंधन और सामाजिक समझ।',
        tests: ['भावनात्मक बुद्धिमत्ता (EQ) टेस्ट', 'सहानुभूति एवं दृष्टिकोण टेस्ट', 'आत्म-जागरूकता मूल्यांकन'],
        cta: 'भावनात्मक बुद्धिमत्ता परीक्षण देखें'
      },
      career: {
        tag: 'व्यावसायिक',
        title: 'करियर एवं कार्यशैली',
        desc: 'कार्य प्रेरणा, नेतृत्व प्रवृत्तियाँ, टीमवर्क और पेशेवर प्राथमिकताएं।',
        tests: ['करियर व्यक्तित्व मूल्यांकन', 'नेतृत्व शैली परीक्षण', 'सहयोग एवं कार्य प्राथमिकताएं'],
        cta: 'करियर परीक्षण देखें'
      },
      growth: {
        tag: 'विकास एवं लचीलापन',
        title: 'आत्म-विकास एवं सहनशीलता',
        desc: 'तनाव से उबरने की क्षमता, मुखरता, प्रेरणा और व्यक्तिगत सीमाएं।',
        tests: ['लचीलापन एवं अनुकूलनशीलता टेस्ट', 'सकारात्मक मानसिकता अन्वेषण', 'तनाव प्रतिक्रिया', 'मुखरता एवं संवाद'],
        cta: 'आत्म-विकास परीक्षण देखें'
      }
    },
    popular: {
      badge: 'प्रमुख परीक्षण',
      title: 'लोकप्रिय आत्म-मूल्यांकन',
      subtitle: 'सार्थक आत्म-चिंतन के लिए वैज्ञानिक रूप से तैयार किए गए वास्तविक परीक्षण।',
      viewAll: 'सभी परीक्षण देखें',
      takeTest: 'परीक्षण दें',
      questionsCount: 'प्रश्न',
      minEstimated: 'मिनट'
    },
    howItWorks: {
      badge: 'सरल प्रक्रिया',
      title: 'यह कैसे काम करता है',
      subtitle: 'पहले प्रश्न से लेकर विस्तृत परिणाम तक चार सरल चरणों में।',
      steps: [
        { num: '01', title: 'परीक्षण चुनें', desc: 'व्यक्तित्व, रिश्ते या करियर से जुड़ा अपना पसंदीदा परीक्षण चुनें।' },
        { num: '02', title: 'ईमानदारी से उत्तर दें', desc: '5-पॉइंट स्केल पर अपनी गति से प्रश्नों का उत्तर दें।' },
        { num: '03', title: 'परिणाम तुरंत देखें', desc: 'बिना किसी शुल्क या खाते के तुरंत अपना स्कोर और आयाम विश्लेषण देखें।' },
        { num: '04', title: 'गहराई से समझें', desc: 'यदि चाहें तो एकमुश्त क्रेडिट से विस्तृत AI रिपोर्ट और PDF प्राप्त करें।' }
      ]
    },
    freeFirst: {
      badge: 'निःशुल्क अनुभव',
      title: 'शुरुआत मुफ़्त करें। निर्णय बाद में लें।',
      desc: 'टेस्ट देने के लिए कोई भुगतान या खाता बनाने की आवश्यकता नहीं है। अपना परीक्षण पूरा करें, बुनियादी स्कोर देखें और स्वयं तय करें कि क्या आपको विस्तृत रिपोर्ट चाहिए।',
      cta: 'पहला टेस्ट मुफ़्त दें',
      boxTitle: 'मुफ़्त में क्या शामिल है',
      items: [
        '100% मुफ़्त परीक्षण समाप्ति',
        'तत्काल स्कोर एवं प्रतिशतक गणना',
        'आयामीय विश्लेषण चार्ट',
        'बुनियादी मनोवैज्ञानिक सारांश',
        'वैकल्पिक: विस्तृत AI रिपोर्ट (5 क्रेडिट)'
      ]
    },
    reports: {
      badge: 'विस्तृत रिपोर्ट विकल्प',
      title: 'स्कोर से आगे समझना चाहते हैं?',
      subtitle: 'मुफ़्त बुनियादी परिणाम आपको आधार देता है। विस्तृत रिपोर्ट आपकी शक्तियों, कमजोरियों, संचार शैली और व्यवहारिक तालमेल का गहरा विश्लेषण करती है।',
      starter: { name: 'शुरुआती', price: '$4 USD', credits: '20 क्रेडिट • 4 रिपोर्ट तक', desc: 'एकमुश्त भुगतान। क्रेडिट कभी समाप्त नहीं होते।' },
      growth: { popularBadge: 'सबसे लोकप्रिय', name: 'ग्रोथ', price: '$9 USD', credits: '50 क्रेडिट • 10 रिपोर्ट तक', desc: 'एकमुश्त भुगतान। क्रेडिट कभी समाप्त नहीं होते।' },
      pro: { name: 'प्रो', price: '$19 USD', credits: '120 क्रेडिट • 24 रिपोर्ट तक', desc: 'एकमुश्त भुगतान। क्रेडिट कभी समाप्त नहीं होते।' },
      viewPricing: 'विस्तृत रिपोर्ट के बारे में जानें एवं पैकेज देखें'
    },
    dimensionalDepth: {
      badge: 'आयामीय गहराई',
      title: 'आपका स्कोर केवल एक शुरुआत है',
      desc: 'मानव व्यक्तित्व को एक संख्या में नहीं बांधा जा सकता। हम परीक्षणों को उनके मुख्य आयामों में विभाजित करते हैं ताकि आप अपनी सभी प्रवृत्तियों को देख सकें।',
      points: [
        { bold: 'लेबल के बजाय सूक्ष्मता:', text: 'कठोर लेबलों में कैद होने के बजाय अपने वास्तविक लक्षणों को समझें।' },
        { bold: 'बहुआयामी संबंध:', text: 'देखें कि कैसे आपकी जिज्ञासा और ध्यान मिलकर रचनात्मक सोच बनाते हैं।' },
        { bold: 'सकारात्मक भाषा:', text: 'आत्म-चिंतन और व्यक्तिगत विकास को प्रेरित करने वाली विचारशील टिप्पणियां।' }
      ],
      exampleTag: 'उदाहरण परिणाम',
      exampleType: 'प्रोफ़ाइल विश्लेषण',
      alignmentLabel: 'समग्र स्कोर',
      alignmentValue: '78%',
      topBadge: 'उच्च बौद्धिक जिज्ञासा',
      dim1: 'जिज्ञासा', dim2: 'रचनात्मकता एवं विचार', dim3: 'नवीनता की खोज', dim4: 'दृष्टिकोण में लचीलापन',
      suggestTitle: 'यह क्या दर्शाता है:',
      suggestText: 'आपके उत्तर नए विचारों को तलाशने, वैचारिक सोच और रोजमर्रा की चुनौतियों का समाधान करने में आपकी खुली मानसिकता को दर्शाते हैं।'
    },
    privacy: {
      badge: 'गोपनीयता एवं सुरक्षा',
      title: 'आपके परिणाम व्यक्तिगत हैं',
      subtitle: 'हम आपकी गोपनीयता और व्यक्तिगत विचारों का पूरा सम्मान करते हैं।',
      items: [
        { title: 'डेटा पर आपका अधिकार', desc: 'आपके परिणाम केवल आपके हैं। व्यक्तिगत रिपोर्ट देखने के लिए आपकी अनुमति आवश्यक है।' },
        { title: 'कोई सार्वजनिक प्रदर्शन नहीं', desc: 'सार्वजनिक पेजों पर कभी भी किसी उपयोगकर्ता का व्यक्तिगत डेटा या उत्तर नहीं दिखाया जाता।' },
        { title: 'सर्च इंजन से सुरक्षित', desc: 'व्यक्तिगत परिणाम पेजों पर सख्त नो-इंडेक्स टैग लगे होते हैं।' },
        { title: 'सुरक्षित भुगतान', desc: 'लेन-देन Lemon Squeezy द्वारा सुरक्षित रूप से संसाधित किए जाते हैं।' }
      ]
    },
    whoFor: {
      badge: 'समुदाय',
      title: 'Psychology Calculator किसके लिए है?',
      subtitle: 'हर उस व्यक्ति के लिए जो संरचित और वास्तविक आत्म-चिंतन करना चाहता है।',
      groups: [
        { icon: '🧭', title: 'जिज्ञासु व्यक्ति', desc: 'जो अपने व्यक्तित्व, स्वभाव और स्वाभाविक प्रेरणाओं को समझना चाहते हैं।' },
        { icon: '💬', title: 'जोड़े एवं साथी', desc: 'जो अपने लगाव शैली, संचार और भावनात्मक सीमाओं को समझना चाहते हैं।' },
        { icon: '📚', title: 'छात्र एवं शिक्षार्थी', desc: 'जो मनोवैज्ञानिक मॉडल और संज्ञानात्मक शैलियों का अध्ययन कर रहे हैं।' },
        { icon: '💼', title: 'पेशेवर एवं लीडर्स', desc: 'जो नेतृत्व शैली, कार्यस्थल संचार और टीम सहयोग पर विचार करते हैं।' },
        { icon: '🌱', title: 'आत्म-विकास के खोजी', desc: 'जो भावनात्मक समझ, तनाव प्रबंधन और आत्म-जागरूकता पर काम कर रहे हैं।' },
        { icon: '💡', title: 'विचारशील चिंतक', desc: 'जो गहरे और विचारोत्तेजक प्रश्नों के माध्यम से खुद को परखना पसंद करते हैं।' }
      ]
    },
    faqs: {
      badge: 'प्रश्न एवं उत्तर',
      title: 'अक्सर पूछे जाने वाले प्रश्न',
      subtitle: 'परीक्षण देने, परिणाम देखने और विस्तृत रिपोर्ट से जुड़े सभी आवश्यक उत्तर।',
      items: [
        { q: 'मनोविज्ञान परीक्षण क्या है?', a: 'यह मानकीकृत कथनों पर आधारित एक संरचित आत्म-मूल्यांकन है जो विभिन्न आयामों पर आपके व्यवहार और भावनाओं को समझने में मदद करता है।' },
        { q: 'क्या ये परीक्षण मुफ़्त हैं?', a: 'हाँ, वेबसाइट पर सभी परीक्षण 100% मुफ़्त हैं। आपको बिना किसी शुल्क के तुरंत स्कोर और आयामीय विवरण प्राप्त होता है।' },
        { q: 'क्या बिना खाता बनाए टेस्ट दिया जा सकता है?', a: 'हाँ, आप बिना किसी रजिस्ट्रेशन या कार्ड विवरण के अतिथि के रूप में टेस्ट पूरा कर सकते हैं।' },
        { q: 'परीक्षण में कितना समय लगता है?', a: 'अधिकांश परीक्षणों में 20 से 25 प्रश्न होते हैं और इन्हें पूरा करने में 5 से 7 मिनट का समय लगता है।' },
        { q: 'मैं व्यक्तित्व परीक्षण से क्या सीख सकता हूँ?', a: 'आप जिज्ञासा, भावनात्मक नियंत्रण, संचार शैली और कर्तव्यनिष्ठा जैसे विभिन्न आयामों पर अपनी वास्तविक प्रवृत्तियों को जान सकते हैं।' },
        { q: 'क्या यह कोई नैदानिक (क्लिनिकल) निदान है?', a: 'नहीं, ये परीक्षण केवल शैक्षणिक और व्यक्तिगत आत्म-चिंतन के लिए हैं और किसी मानसिक स्वास्थ्य विशेषज्ञ की सलाह का विकल्प नहीं हैं।' },
        { q: 'AI रिपोर्ट कैसे काम करती है?', a: 'यदि आप अधिक गहराई से समझना चाहते हैं, तो आप वैकल्पिक रूप से AI रिपोर्ट अनलॉक कर सकते हैं जिसमें विस्तृत विश्लेषण और PDF रिपोर्ट मिलती है।' },
        { q: 'क्या कोई मासिक सदस्यता शुल्क है?', a: 'नहीं, यह केवल एकमुश्त क्रेडिट प्रणाली है, कोई आवर्ती या ऑटो-कट बिलिंग नहीं है।' },
        { q: 'क्या खरीदे गए क्रेडिट समाप्त होते हैं?', a: 'नहीं, आपके खरीदे गए क्रेडिट की कोई समय सीमा नहीं होती, आप जब चाहें तब उपयोग कर सकते हैं।' },
        { q: 'क्या मेरे परिणाम निजी रहते हैं?', a: 'हाँ, आपके उत्तर और परिणाम पूरी तरह गोपनीय और सुरक्षित रहते हैं।' }
      ]
    },
    disclaimer: {
      prefix: 'शैक्षणिक एवं आत्म-चिंतन सूचना:',
      text: 'PsychologyCalculator.com आत्म-चिंतन और व्यक्तिगत शिक्षा के उद्देश्य से परीक्षण प्रदान करता है। परिणाम किसी चिकित्सीय या मानसिक विकार का निदान नहीं हैं।'
    },
    finalCta: {
      title: 'क्या आप अपने परिणाम जानने के लिए तैयार हैं?',
      subtitle: 'एक परीक्षण चुनें, अपनी गति से उत्तर दें और देखें कि आपके उत्तर आपके स्वभाव और क्षमताओं के बारे में क्या बताते हैं।',
      ctaPrimary: 'मुफ़्त परीक्षण दें →',
      ctaSecondary: 'सभी परीक्षण ब्राउज़ करें'
    }
  },

  fr: {
    hero: {
      badge: 'Psychométrie et Découverte de Soi',
      title: 'Des Tests Psychologiques qui Transforment vos Réponses en',
      titleHighlight: 'Perspectives Utiles',
      subtitle: 'Explorez des évaluations de personnalité, relations, intelligence émotionnelle, carrière et développement personnel conçues pour éclairer vos tendances naturelles.',
      ctaPrimary: 'Passer un Test Gratuit',
      ctaSecondary: 'Explorer les Tests',
      trustItems: ['Gratuit pour commencer', 'Sans inscription préalable', 'Prend seulement quelques minutes'],
      preview: {
        tag: 'Aperçu du Test',
        title: 'Profil de Personnalité et Curiosité',
        alignment: '78% Alignement',
        questionLabel: 'Question 7 sur 25',
        questionTopic: 'Curiosité Intellectuelle',
        questionText: '"J\'aime explorer des idées et des perspectives qui remettent en question la pensée conventionnelle."',
        breakdownTitle: 'Ventilation Dimensionnelle',
        dimensions: [
          { name: 'Curiosité Intellectuelle', pct: 82 },
          { name: 'Conscience de Soi', pct: 74 },
          { name: 'Adaptabilité et Nouveauté', pct: 69 }
        ],
        freeResult: 'Résultat Immédiat Gratuit',
        explorePatterns: 'Explorer les Tendances →'
      }
    },
    trustStrip: {
      title1: 'GRATUIT POUR DÉBUTER', desc1: 'Complétez les tests et consultez vos scores de base sans avoir à créer de compte.',
      title2: 'RÉSULTATS CLAIRS', desc2: 'Comprenez ce que signifient vos scores à travers des dimensions psychologiques précises.',
      title3: 'CONFIDENTIALITÉ TOTALE', desc3: 'Vos réponses et résultats restent strictement privés et ne sont jamais diffusés.',
      title4: 'RAPPORTS DÉTAILLÉS', desc4: 'Analyses approfondies par IA et dossiers PDF téléchargeables lorsque vous le souhaitez.'
    },
    approach: {
      badge: 'Une Approche Réfléchie',
      title: 'Une Meilleure Façon d\'Explorer Votre Personnalité',
      subtitle: 'Plutôt que de vous enfermer dans des étiquettes rigides, nous analysons des dimensions nuancées pour situer vos tendances dans leur contexte réel.',
      steps: [
        { num: '1', title: 'Passez le Test', desc: 'Répondez à des questions ciblées à votre propre rythme.' },
        { num: '2', title: 'Comprenez vos Scores', desc: 'Visualisez vos percentiles bruts et normalisés.' },
        { num: '3', title: 'Explorez les Dimensions', desc: 'Analysez vos traits spécifiques et vos atouts.' },
        { num: '4', title: 'Réfléchissez à vos Schémas', desc: 'Observez comment vos tendances guident vos choix.' },
        { num: '5', title: 'Rapport IA Optionnel', desc: 'Débloquez une synthèse approfondie quand vous le désirez.' }
      ]
    },
    categories: {
      badge: 'Parcourir par Thème',
      title: 'Tests Psychologiques par Thématique',
      subtitle: 'Évaluations structurées sur les traits de personnalité, dynamiques relationnelles, intelligence émotionnelle et aspirations professionnelles.',
      personality: {
        tag: 'Traits Fondamentaux',
        title: 'Tests de Personnalité',
        desc: 'Découvrez vos traits de personnalité, curiosité intellectuelle et processus décisionnels.',
        tests: ['Test Big Five (OCEAN)', 'Test d\'Ouverture à l\'Expérience', 'Test de Conscienciosité et Focus'],
        cta: 'Explorer les Tests de Personnalité'
      },
      relationships: {
        tag: 'Relations',
        title: 'Tests Relationnels et Couple',
        desc: 'Analysez vos styles d\'attachement adulte, communication et limites relationnelles.',
        tests: ['Test des Styles d\'Attachement', 'Évaluation de la Communication', 'Test des Limites Relationnelles'],
        cta: 'Explorer les Tests Relationnels'
      },
      eq: {
        tag: 'Conscience',
        title: 'Intelligence Émotionnelle',
        desc: 'Évaluez votre conscience émotionnelle, empathie et régulation face au stress.',
        tests: ['Test d\'Intelligence Émotionnelle (EQ)', 'Test d\'Empathie et Perspective', 'Évaluation de Conscience de Soi'],
        cta: 'Explorer l\'Intelligence Émotionnelle'
      },
      career: {
        tag: 'Professionnel',
        title: 'Carrière et Travail',
        desc: 'Identifiez vos moteurs professionnels, style de leadership et dynamiques d\'équipe.',
        tests: ['Personnalité Professionnelle', 'Style de Leadership', 'Préférences de Collaboration'],
        cta: 'Explorer les Tests Carrière'
      },
      growth: {
        tag: 'Évolution',
        title: 'Développement et Résilience',
        desc: 'Mesurez votre résilience face aux défis, assertivité et flexibilité mentale.',
        tests: ['Test de Résilience et Adaptabilité', 'État d\'Esprit Constructif', 'Gestion du Stress', 'Assertivité'],
        cta: 'Explorer le Développement Personnel'
      }
    },
    popular: {
      badge: 'Tests Populaires',
      title: 'Évaluations Populaires',
      subtitle: 'Des autoevaluations rigoureuses conçues pour une introspection éclairée.',
      viewAll: 'Voir Tous les Tests',
      takeTest: 'Commencer',
      questionsCount: 'questions',
      minEstimated: 'min'
    },
    howItWorks: {
      badge: 'Processus Simple',
      title: 'Comment Ça Marche',
      subtitle: 'De la première question à vos résultats dimensionnels en quatre étapes simples.',
      steps: [
        { num: '01', title: 'Choisissez un test', desc: 'Sélectionnez le sujet de personnalité, relations ou carrière qui vous intéresse.' },
        { num: '02', title: 'Répondez sincèrement', desc: 'Évaluez des propositions sur une échelle de 1 à 5 à votre propre rythme.' },
        { num: '03', title: 'Découvrez vos résultats', desc: 'Consultez gratuitement et immédiatement votre score et votre profil dimensionnel.' },
        { num: '04', title: 'Allez plus loin', desc: 'Générez si vous le souhaitez un rapport approfondi rédigé par IA avec dossier PDF.' }
      ]
    },
    freeFirst: {
      badge: 'Accès Gratuit',
      title: 'Commencez Gratuitement. Décidez Ensuite.',
      desc: 'Aucun paiement ni création de compte n\'est exigé pour passer un test. Répondez aux questions, consultez votre résultat de base et décidez ensuite si vous souhaitez un rapport complet.',
      cta: 'Passer Votre Premier Test Gratuit',
      boxTitle: 'Inclus Gratuitement',
      items: [
        'Passation de test 100% gratuite',
        'Calcul instantané des scores et percentiles',
        'Visualisation du profil dimensionnel',
        'Synthèse psychologique initiale',
        'Optionnel: Dossier complet avec IA (5 crédits)'
      ]
    },
    reports: {
      badge: 'Niveau Approfondi',
      title: 'Envie d\'Aller Plus Loin que le Score ?',
      subtitle: 'Votre résultat gratuit fournit l\'essentiel. Un rapport détaillé explore vos synergies de traits, vos forces, vos angles morts et votre style de communication.',
      starter: { name: 'Découverte', price: '4 $ USD', credits: '20 Crédits • Jusqu\'à 4 rapports', desc: 'Paiement unique. Les crédits n\'expirent jamais.' },
      growth: { popularBadge: 'Plus Populaire', name: 'Évolution', price: '9 $ USD', credits: '50 Crédits • Jusqu\'à 10 rapports', desc: 'Paiement unique. Les crédits n\'expirent jamais.' },
      pro: { name: 'Expert', price: '19 $ USD', credits: '120 Crédits • Jusqu\'à 24 rapports', desc: 'Paiement unique. Les crédits n\'expirent jamais.' },
      viewPricing: 'Découvrir les Rapports Détaillés et Tarifs'
    },
    dimensionalDepth: {
      badge: 'Profondeur Dimensionnelle',
      title: 'Votre Score n\'est qu\'un Point de Départ',
      desc: 'Un simple chiffre ne peut résumer la personnalité humaine. Nous décomposons chaque test en dimensions distinctes pour faire ressortir vos nuances et équilibres.',
      points: [
        { bold: 'Nuances plutôt qu\'étiquettes :', text: 'Comprenez des traits précis au lieu de vous enfermer dans une case.' },
        { bold: 'Schémas multidimensionnels :', text: 'Observez comment votre curiosité et votre rigueur s\'associent pour résoudre des problèmes.' },
        { bold: 'Langage constructif :', text: 'Des observations bienveillantes conçues pour nourrir votre réflexion personnelle.' }
      ],
      exampleTag: 'EXEMPLE DE RÉSULTAT',
      exampleType: 'Synthèse de Profil',
      alignmentLabel: 'Alignement Global',
      alignmentValue: '78%',
      topBadge: 'Haute Curiosité Intellectuelle',
      dim1: 'Curiosité', dim2: 'Créativité & Idées', dim3: 'Recherche de Nouveauté', dim4: 'Flexibilité d\'Esprit',
      suggestTitle: 'Ce que cela suggère :',
      suggestText: 'Vos réponses indiquent une nette préférence pour l\'exploration de concepts novateurs, la pensée conceptuelle et l\'ouverture d\'esprit face aux défis quotidiens.'
    },
    privacy: {
      badge: 'Confidentialité et Sécurité',
      title: 'Vos Résultats Vous Appartiennent',
      subtitle: 'Nous accordons à vos réponses le respect et la confidentialité qu\'exige toute démarche personnelle.',
      items: [
        { title: 'Maîtrise de vos données', desc: 'Vos résultats vous appartiennent exclusivement.' },
        { title: 'Aucune exposition publique', desc: 'Les pages publiques ne révèlent jamais de données personnelles.' },
        { title: 'Non indexé par les moteurs', desc: 'Les résultats privés portent des balises noindex strictes.' },
        { title: 'Paiements sécurisés', desc: 'Transactions cryptées et traitées en toute sécurité via Lemon Squeezy.' }
      ]
    },
    whoFor: {
      badge: 'Communauté',
      title: 'À Qui S\'Adresse Psychology Calculator ?',
      subtitle: 'À toute personne en quête d\'une introspection structurée et éclairante.',
      groups: [
        { icon: '🧭', title: 'Individus Curieux', desc: 'Ceux qui souhaitent mieux cerner leurs traits de caractère et leurs motivations profondes.' },
        { icon: '💬', title: 'Couples et Partenaires', desc: 'Couples explorant leurs styles d\'attachement et leurs dynamiques relationnelles.' },
        { icon: '📚', title: 'Étudiants et Passionnés', desc: 'Personnes étudiant les modèles psychométriques et les styles cognitifs.' },
        { icon: '💼', title: 'Professionnels et Leaders', desc: 'Professionnels réfléchissant à leur style de leadership et à la collaboration en équipe.' },
        { icon: '🌱', title: 'En Quête d\'Évolution', desc: 'Ceux qui développent leur intelligence émotionnelle et leur résilience au stress.' },
        { icon: '💡', title: 'Esprits Réflexifs', desc: 'Toute personne appréciant des questions structurées qui invitent à la clarté.' }
      ]
    },
    faqs: {
      badge: 'Questions & Réponses',
      title: 'Foire Aux Questions',
      subtitle: 'Tout ce que vous devez savoir sur la passation des tests et les rapports.',
      items: [
        { q: 'Qu\'est-ce qu\'un test psychologique ?', a: 'Il s\'agit d\'un questionnaire structuré basé sur des énoncés standardisés permettant d\'éclairer des traits comportementaux et émotionnels.' },
        { q: 'Les tests sont-ils gratuits ?', a: 'Oui. Tous les tests sont 100% gratuits avec affichage immédiat de votre score et profil dimensionnel sans frais.' },
        { q: 'Puis-je passer un test sans créer de compte ?', a: 'Oui. Vous pouvez compléter n\'importe quel test en mode invité sans inscription ni carte bancaire.' },
        { q: 'Combien de temps prend un test ?', a: 'La majorité compte 20 à 25 questions et se complète en 5 à 7 minutes à votre rythme.' },
        { q: 'Ce test constitue-t-il un diagnostic clinique ?', a: 'Non. Il s\'agit d\'outils d\'autoréflexion éducatifs qui ne remplacent en aucun cas l\'avis d\'un professionnel de santé mentale.' },
        { q: 'Comment fonctionnent les rapports avec IA ?', a: 'Si vous souhaitez une analyse narrative approfondie, vous pouvez débloquer un rapport complet avec PDF téléchargeable.' },
        { q: 'Y a-t-il un abonnement mensuel récurrent ?', a: 'Non. Nous fonctionnons par crédits prépayés à l\'acte, sans aucun prélèvement automatique.' },
        { q: 'Les crédits achetés expirent-ils ?', a: 'Non. Vos crédits restent valables indéfiniment.' }
      ]
    },
    disclaimer: {
      prefix: 'Avertissement Éducatif et Introspectif :',
      text: 'PsychologyCalculator.com propose des autoevaluations à des fins d\'autoréflexion et de découverte personnelle. Les résultats ne constituent pas un diagnostic médical ou psychiatrique.'
    },
    finalCta: {
      title: 'Prêt à Découvrir vos Résultats ?',
      subtitle: 'Choisissez une évaluation, répondez à votre rythme et découvrez ce que révèlent vos réponses sur vos forces et tendances.',
      ctaPrimary: 'Passer un Test Gratuit →',
      ctaSecondary: 'Parcourir Tous les Tests'
    }
  },

  de: {
    hero: {
      badge: 'Psychometrie & Selbsterkenntnis',
      title: 'Psychologische Tests, die Ihre Antworten in',
      titleHighlight: 'Wertvolle Einsichten Verwandeln',
      subtitle: 'Entdecken Sie wissenschaftlich fundierte Tests zu Persönlichkeit, Beziehungen, emotionaler Intelligenz und Karriere, um Ihre Muster und Stärken zu verstehen.',
      ctaPrimary: 'Kostenlosen Test Starten',
      ctaSecondary: 'Alle Tests Entdecken',
      trustItems: ['Kostenlos starten', 'Kein Konto für Basisergebnisse nötig', 'Dauert nur wenige Minuten'],
      preview: {
        tag: 'Test-Vorschau',
        title: 'Persönlichkeits- & Neugier-Profil',
        alignment: '78% Übereinstimmung',
        questionLabel: 'Frage 7 von 25',
        questionTopic: 'Intellektuelle Neugier',
        questionText: '"Ich beschäftige mich gerne mit Ideen, die traditionelle Denkweisen herausfordern."',
        breakdownTitle: 'Dimensionale Auswertung',
        dimensions: [
          { name: 'Intellektuelle Neugier', pct: 82 },
          { name: 'Selbstwahrnehmung', pct: 74 },
          { name: 'Anpassungsfähigkeit', pct: 69 }
        ],
        freeResult: 'Sofortiges Gratis-Ergebnis',
        explorePatterns: 'Muster Erkunden →'
      }
    },
    trustStrip: {
      title1: 'KOSTENLOS STARTEN', desc1: 'Führen Sie Tests durch und sehen Sie Ihre Basisergebnisse ohne Registrierung.',
      title2: 'KLARE ERGEBNISSE', desc2: 'Verstehen Sie Ihre Punktzahlen anhand differenzierter psychologischer Dimensionen.',
      title3: 'VOLLE PRIVATSPHÄRE', desc3: 'Ihre Antworten und Ergebnisse bleiben streng vertraulich und werden nie veröffentlicht.',
      title4: 'AUSFÜHRLICHE BERICHTE', desc4: 'Tiefgehende KI-gestützte Analysen und PDF-Berichte jederzeit auf Wunsch.'
    },
    approach: {
      badge: 'Ein Fundierter Ansatz',
      title: 'Ein Besserer Weg zur Persönlichkeitsanalyse',
      subtitle: 'Statt starren Schubladen konzentrieren wir uns auf differenzierte Dimensionen, damit Sie Ihre echten Tendenzen im Kontext verstehen.',
      steps: [
        { num: '1', title: 'Test Durchführen', desc: 'Beantworten Sie klare Fragen in Ihrem eigenen Tempo.' },
        { num: '2', title: 'Punkte Verstehen', desc: 'Sehen Sie Ihre rohen und standardisierten Perzentile.' },
        { num: '3', title: 'Dimensionen Erkunden', desc: 'Untersuchen Sie spezifische Facetten und Stärken.' },
        { num: '4', title: 'Muster Reflektieren', desc: 'Erkennen Sie, wie Ihre Tendenzen Entscheidungen prägen.' },
        { num: '5', title: 'Optionaler KI-Bericht', desc: 'Schalten Sie bei Bedarf tiefgehende Berichte frei.' }
      ]
    },
    categories: {
      badge: 'Nach Thema Erkunden',
      title: 'Psychologische Tests nach Themen',
      subtitle: 'Strukturierte Tests zu Persönlichkeitsmerkmalen, Beziehungsstilen, emotionaler Wahrnehmung und Berufspräferenzen.',
      personality: {
        tag: 'Kernmerkmale',
        title: 'Persönlichkeitstests',
        desc: 'Erkunden Sie Persönlichkeitsmerkmale, Verhaltenstendenzen und Entscheidungsstile.',
        tests: ['Big Five Persönlichkeitstest', 'Offenheit für Erfahrungen', 'Gewissenhaftigkeit & Fokus'],
        cta: 'Persönlichkeitstests Entdecken'
      },
      relationships: {
        tag: 'Verbindung',
        title: 'Beziehungstests',
        desc: 'Analysieren Sie Bindungsstile, Kommunikationsmuster und zwischenmenschliche Grenzen.',
        tests: ['Bindungsstil-Test für Erwachsene', 'Kommunikationsstil-Analyse', 'Beziehungsgrenzen-Test'],
        cta: 'Beziehungstests Entdecken'
      },
      eq: {
        tag: 'Wahrnehmung',
        title: 'Emotionale Intelligenz',
        desc: 'Untersuchen Sie emotionale Selbstwahrnehmung, Empathie und Stressregulation.',
        tests: ['Emotionaler Intelligenz (EQ) Test', 'Empathie & Perspektivenwechsel', 'Selbstwahrnehmungs-Test'],
        cta: 'Emotionale Intelligenz Entdecken'
      },
      career: {
        tag: 'Beruflich',
        title: 'Karriere & Arbeitsstil',
        desc: 'Erkunden Sie Arbeitsmotivation, Führungsqualitäten und Teampräferenzen.',
        tests: ['Berufliche Persönlichkeitsanalyse', 'Führungsstil-Test', 'Zusammenarbeitspräferenzen'],
        cta: 'Karrieretests Entdecken'
      },
      growth: {
        tag: 'Entwicklung',
        title: 'Selbstentwicklung & Resilienz',
        desc: 'Reflektieren Sie über Resilienz, Selbstbehauptung und kognitive Flexibilität.',
        tests: ['Resilienz & Anpassungsfähigkeit', 'Konstruktive Denkweise', 'Stressbewältigung', 'Selbstbehauptung'],
        cta: 'Selbstentwicklung Entdecken'
      }
    },
    popular: {
      badge: 'Beliebte Tests',
      title: 'Häufig Gewählte Tests',
      subtitle: 'Wissenschaftlich fundierte Selbsttests für echte Selbstreflexion.',
      viewAll: 'Alle Tests Anzeigen',
      takeTest: 'Test Starten',
      questionsCount: 'Fragen',
      minEstimated: 'Min.'
    },
    howItWorks: {
      badge: 'Einfacher Ablauf',
      title: 'So Funktioniert Es',
      subtitle: 'Von der ersten Frage bis zu dimensionalen Erkenntnissen in vier Schritten.',
      steps: [
        { num: '01', title: 'Test auswählen', desc: 'Wählen Sie das Persönlichkeits- oder Beziehungsthema, das Sie interessiert.' },
        { num: '02', title: 'Ehrlich antworten', desc: 'Bewerten Sie Aussagen auf einer 5-Punkte-Skala in Ihrem eigenen Tempo.' },
        { num: '03', title: 'Ergebnisse sehen', desc: 'Sehen Sie sofort und kostenlos Ihr Gesamtergebnis und dimensionales Profil.' },
        { num: '04', title: 'Vertiefen auf Wunsch', desc: 'Erhalten Sie optional vertiefende KI-Synthesen und PDF-Berichte mit Einmalguthaben.' }
      ]
    },
    freeFirst: {
      badge: 'Kostenloses Erlebnis',
      title: 'Kostenlos Starten. Später Entscheiden.',
      desc: 'Sie müssen weder bezahlen noch vorab ein Konto erstellen. Machen Sie den Test, sehen Sie Ihr Basisergebnis und entscheiden Sie selbst, ob Sie einen vertieften Bericht wünschen.',
      cta: 'Ersten Test Kostenlos Starten',
      boxTitle: 'Kostenlos Enthalten',
      items: [
        '100% kostenlose Testdurchführung',
        'Sofortige Punkte- und Perzentilberechnung',
        'Visualisierung des dimensionalen Profils',
        'Grundlegende psychologische Zusammenfassung',
        'Optional: Umfassender KI-Dossierbericht (5 Credits)'
      ]
    },
    reports: {
      badge: 'Optionale Vertiefung',
      title: 'Möchten Sie Mehr als Nur den Score?',
      subtitle: 'Ihr kostenloses Basisergebnis liefert das Fundament. Ein ausführlicher Bericht beleuchtet Facetten, Stärken, blinde Flecken und Kommunikationsstile.',
      starter: { name: 'Starter', price: '4 $ USD', credits: '20 Credits • Bis zu 4 Berichte', desc: 'Einmalzahlung. Credits verfallen nie.' },
      growth: { popularBadge: 'Beliebteste Wahl', name: 'Growth', price: '9 $ USD', credits: '50 Credits • Bis zu 10 Berichte', desc: 'Einmalzahlung. Credits verfallen nie.' },
      pro: { name: 'Pro', price: '19 $ USD', credits: '120 Credits • Bis zu 24 Berichte', desc: 'Einmalzahlung. Credits verfallen nie.' },
      viewPricing: 'Berichte Kennenlernen & Pakete Ansehen'
    },
    dimensionalDepth: {
      badge: 'Dimensionale Tiefe',
      title: 'Ihre Punktzahl ist Nur der Anfang',
      desc: 'Eine einzige Zahl kann die menschliche Persönlichkeit nicht erfassen. Wir schlüsseln Tests in Dimensionen auf, damit Sie Ihre Stärken differenziert sehen.',
      points: [
        { bold: 'Nuancen statt Etiketten:', text: 'Verstehen Sie spezifische Eigenschaften statt starrer Typologien.' },
        { bold: 'Mustererkennung:', text: 'Erleben Sie, wie Neugier und Gewissenhaftigkeit Ihr Problemlösungsverhalten prägen.' },
        { bold: 'Konstruktive Sprache:', text: 'Wertschätzende Beobachtungen für Ihre persönliche Weiterentwicklung.' }
      ],
      exampleTag: 'BEISPIEL-ERGEBNIS',
      exampleType: 'Profil-Synthese',
      alignmentLabel: 'Gesamt-Übereinstimmung',
      alignmentValue: '78%',
      topBadge: 'Hohe Intellektuelle Neugier',
      dim1: 'Neugier', dim2: 'Kreativität & Ideen', dim3: 'Offenheit für Neues', dim4: 'Perspektivenwechsel',
      suggestTitle: 'Was dies nahelegt:',
      suggestText: 'Ihre Antworten spiegeln eine ausgeprägte Freude an neuen Konzepten, konzeptionellem Denken und unvoreingenommener Problemlösung wider.'
    },
    privacy: {
      badge: 'Datenschutz & Sicherheit',
      title: 'Ihre Ergebnisse Gehören Ihnen',
      subtitle: 'Wir behandeln Ihre Antworten mit dem Respekt und Schutz, den persönliche Reflexion verlangt.',
      items: [
        { title: 'Volle Datenkontrolle', desc: 'Ihre Ergebnisse gehören allein Ihnen.' },
        { title: 'Keine öffentliche Einsicht', desc: 'Öffentliche Seiten zeigen niemals persönliche Daten oder Antworten.' },
        { title: 'Keine Suchmaschinen-Indexierung', desc: 'Ergebnisseiten sind mit strengen Noindex-Tags geschützt.' },
        { title: 'Sichere Zahlung', desc: 'Verschlüsselte Abwicklung über Lemon Squeezy.' }
      ]
    },
    whoFor: {
      badge: 'Community',
      title: 'Für Wen ist Psychology Calculator?',
      subtitle: 'Für alle, die fundierte und konstruktive Selbsterkenntnis schätzen.',
      groups: [
        { icon: '🧭', title: 'Neugierige Menschen', desc: 'Die ihre Persönlichkeitsmerkmale und Verhaltensmuster verstehen möchten.' },
        { icon: '💬', title: 'Paare & Partner', desc: 'Die ihre Bindungsmuster und Kommunikation vertiefen wollen.' },
        { icon: '📚', title: 'Lernende & Studenten', desc: 'Die sich für psychometrische Modelle und kognitive Stile interessieren.' },
        { icon: '💼', title: 'Fach- & Führungskräfte', desc: 'Die über Führungsstil und Teamzusammenarbeit reflektieren.' },
        { icon: '🌱', title: 'Selbstentwickler', desc: 'Die an emotionaler Intelligenz und mentaler Resilienz arbeiten.' },
        { icon: '💡', title: 'Reflektierte Denker', desc: 'Die strukturierte Fragen zur Selbsterkenntnis schätzen.' }
      ]
    },
    faqs: {
      badge: 'Fragen & Antworten',
      title: 'Häufig Gestellte Fragen',
      subtitle: 'Alles, was Sie über Tests, Ergebnisse und Berichte wissen müssen.',
      items: [
        { q: 'Was ist ein psychologischer Test?', a: 'Ein strukturierter Selbsttest mit standardisierten Aussagen zur Reflexion über Persönlichkeit, Gefühle oder Beziehungsstile.' },
        { q: 'Sind die Tests kostenlos?', a: 'Ja. Alle Tests sind zu 100% kostenlos durchführbar, inklusive sofortiger dimensionaler Auswertung.' },
        { q: 'Kann ich ohne Registrierung teilnehmen?', a: 'Ja. Sie können jeden Test als Gast durchführen, ohne ein Konto anzulegen.' },
        { q: 'Wie lange dauert ein Test?', a: 'Die meisten Tests umfassen 20 bis 25 Fragen und dauern ca. 5 bis 7 Minuten.' },
        { q: 'Handelt es sich um eine klinische Diagnose?', a: 'Nein. Es handelt sich um pädagogische Selbsttests, die keine fachärztliche Beratung ersetzen.' },
        { q: 'Gibt es ein monatliches Abonnement?', a: 'Nein. Wir arbeiten mit Einmal-Guthaben ohne automatische Verlängerung oder versteckte Kosten.' },
        { q: 'Verfallen gekaufte Credits?', a: 'Nein. Gekaufte Credits behalten unbegrenzt ihre Gültigkeit.' }
      ]
    },
    disclaimer: {
      prefix: 'Hinweis zu Bildung & Selbstreflexion:',
      text: 'PsychologyCalculator.com bietet Tests zu Bildungs- und Reflexionszwecken an. Die Ergebnisse stellen keine medizinische oder psychiatrische Diagnose dar.'
    },
    finalCta: {
      title: 'Bereit für Ihre Persönlichen Einsichten?',
      subtitle: 'Wählen Sie einen Test, antworten Sie in Ihrem Tempo und entdecken Sie Ihre Stärken und Tendenzen.',
      ctaPrimary: 'Kostenlosen Test Starten →',
      ctaSecondary: 'Alle Tests Durchsuchen'
    }
  },

  pt: {
    hero: {
      badge: 'Psicometria e Autodescoberta',
      title: 'Testes Psicológicos que Transformam suas Respostas em',
      titleHighlight: 'Percepções Úteis',
      subtitle: 'Explore testes de personalidade, relacionamentos, inteligência emocional e carreira desenhados para compreender suas tendências e padrões reais.',
      ctaPrimary: 'Fazer Teste Grátis',
      ctaSecondary: 'Explorar Todos os Testes',
      trustItems: ['Gratuito para começar', 'Sem cadastro para resultados básicos', 'Leva apenas alguns minutos'],
      preview: {
        tag: 'Prévia do Teste',
        title: 'Perfil de Personalidade e Curiosidade',
        alignment: '78% Alinhamento',
        questionLabel: 'Questão 7 de 25',
        questionTopic: 'Curiosidade Intelectual',
        questionText: '"Gosto de explorar ideias e perspectivas que desafiam o pensamento convencional."',
        breakdownTitle: 'Detalhamento Dimensional',
        dimensions: [
          { name: 'Curiosidade Intelectual', pct: 82 },
          { name: 'Autoconsciência', pct: 74 },
          { name: 'Adaptabilidade e Novidade', pct: 69 }
        ],
        freeResult: 'Resultado Imediato Grátis',
        explorePatterns: 'Explorar Padrões →'
      }
    },
    trustStrip: {
      title1: 'GRÁTIS PARA COMEÇAR', desc1: 'Faça os testes e veja seus resultados básicos sem precisar criar conta.',
      title2: 'RESULTADOS CLAROS', desc2: 'Entenda suas pontuações através de dimensões psicológicas detalhadas.',
      title3: 'TOTAL PRIVACIDADE', desc3: 'Suas respostas são mantidas estritamente confidenciais e nunca são expostas.',
      title4: 'RELATÓRIOS COMPLETOS', desc4: 'Análises aprofundadas com IA e relatórios em PDF para download quando desejar.'
    },
    approach: {
      badge: 'Uma Abordagem Cuidadosa',
      title: 'Uma Forma Melhor de Conhecer sua Personalidade',
      subtitle: 'Em vez de rótulos simplistas, focamos em dimensões sutis para situar suas tendências no contexto real.',
      steps: [
        { num: '1', title: 'Faça o Teste', desc: 'Responda a perguntas claras no seu próprio ritmo.' },
        { num: '2', title: 'Entenda sua Pontuação', desc: 'Veja seus percentis brutos e normalizados.' },
        { num: '3', title: 'Explore Dimensões', desc: 'Examine traços específicos e pontos fortes.' },
        { num: '4', title: 'Reflita sobre Padrões', desc: 'Descubra como suas inclinações moldam suas escolhas.' },
        { num: '5', title: 'Relatório IA Opcional', desc: 'Desbloqueie sínteses profundas quando quiser.' }
      ]
    },
    categories: {
      badge: 'Navegar por Tema',
      title: 'Testes Psicológicos por Categoria',
      subtitle: 'Avaliações estruturadas sobre traços de personalidade, estilos de relacionamento, emoções e carreira.',
      personality: {
        tag: 'Traços Centrais',
        title: 'Testes de Personalidade',
        desc: 'Explore traços fundamentais, curiosidade intelectual e processos de tomada de decisão.',
        tests: ['Teste Big Five (OCEAN)', 'Abertura a Experiências', 'Conscienciosidade e Foco'],
        cta: 'Explorar Testes de Personalidade'
      },
      relationships: {
        tag: 'Conexão',
        title: 'Testes de Relacionamento',
        desc: 'Descubra estilos de apego adulto, padrões de comunicação e limites interpessoais.',
        tests: ['Teste de Estilos de Apego Adulto', 'Avaliação de Comunicação', 'Teste de Limites no Relacionamento'],
        cta: 'Explorar Testes de Relacionamento'
      },
      eq: {
        tag: 'Consciência',
        title: 'Inteligência Emocional',
        desc: 'Avalie autoconsciência emocional, empatia e regulação diante do estresse.',
        tests: ['Teste de Inteligência Emocional (EQ)', 'Teste de Empatia e Perspectiva', 'Avaliação de Autoconhecimento'],
        cta: 'Explorar Inteligência Emocional'
      },
      career: {
        tag: 'Profissional',
        title: 'Carreira e Trabalho',
        desc: 'Identifique motivação profissional, liderança e preferências de colaboração.',
        tests: ['Personalidade Profissional', 'Estilo de Liderança', 'Preferências de Colaboração'],
        cta: 'Explorar Testes de Carreira'
      },
      growth: {
        tag: 'Evolução',
        title: 'Autodesenvolvimento e Resiliência',
        desc: 'Reflita sobre resiliência, assertividade, motivação e flexibilidade mental.',
        tests: ['Teste de Resiliência e Adaptabilidade', 'Mentalidade Construtiva', 'Resposta ao Estresse', 'Assertividade'],
        cta: 'Explorar Autodesenvolvimento'
      }
    },
    popular: {
      badge: 'Destaques',
      title: 'Testes Populares',
      subtitle: 'Autoavaliações estruturadas criadas para autorreflexão consciente.',
      viewAll: 'Ver Todos os Testes',
      takeTest: 'Fazer Teste',
      questionsCount: 'questões',
      minEstimated: 'min'
    },
    howItWorks: {
      badge: 'Processo Simples',
      title: 'Como Funciona',
      subtitle: 'Da primeira pergunta aos insights dimensionais em quatro passos simples.',
      steps: [
        { num: '01', title: 'Escolha um teste', desc: 'Selecione o tema de personalidade, relações ou carreira de seu interesse.' },
        { num: '02', title: 'Responda com sinceridade', desc: 'Avalie declarações em uma escala de 5 pontos no seu ritmo.' },
        { num: '03', title: 'Veja seus resultados', desc: 'Visualize seu resultado e perfil dimensional gratuitamente e na hora.' },
        { num: '04', title: 'Aprofunde se desejar', desc: 'Gere relatórios completos com IA e PDF baixável quando preferir.' }
      ]
    },
    freeFirst: {
      badge: 'Experiência Gratuita',
      title: 'Comece Grátis. Decida Depois.',
      desc: 'Você não precisa pagar nem criar conta para responder a um teste. Conclua a avaliação, veja seu resultado básico e decida se quer um relatório completo.',
      cta: 'Fazer Primeiro Teste Grátis',
      boxTitle: 'Incluído Gratuitamente',
      items: [
        'Realização de teste 100% gratuita',
        'Cálculo instantâneo de pontuação e percentis',
        'Visualização do perfil dimensional',
        'Resumo psicológico fundamental',
        'Opcional: Dossiê aprofundado com IA (5 créditos)'
      ]
    },
    reports: {
      badge: 'Camada Aprofundada',
      title: 'Quer Ir Além da Pontuação Básica?',
      subtitle: 'Seu resultado gratuito oferece a base. Um relatório detalhado analisa a fundo suas forças, pontos cegos e estilo de comunicação.',
      starter: { name: 'Inicial', price: '$4 USD', credits: '20 Créditos • Até 4 relatórios', desc: 'Pagamento único. Créditos nunca expiram.' },
      growth: { popularBadge: 'Mais Popular', name: 'Evolução', price: '$9 USD', credits: '50 Créditos • Até 10 relatórios', desc: 'Pagamento único. Créditos nunca expiram.' },
      pro: { name: 'Profissional', price: '$19 USD', credits: '120 Créditos • Até 24 relatórios', desc: 'Pagamento único. Créditos nunca expiram.' },
      viewPricing: 'Conhecer Relatórios Detalhados e Pacotes'
    },
    dimensionalDepth: {
      badge: 'Profundidade Dimensional',
      title: 'Sua Pontuação é Apenas o Ponto de Partida',
      desc: 'Um único número não reflete a riqueza da personalidade. Nós dividimos os testes em dimensões para você enxergar seus pontos fortes com clareza.',
      points: [
        { bold: 'Nuances em vez de rótulos:', text: 'Compreenda traços específicos em vez de ficar preso a uma caixa rígida.' },
        { bold: 'Padrões multidimensionais:', text: 'Descubra como sua curiosidade e foco interagem na resolução de problemas.' },
        { bold: 'Linguagem construtiva:', text: 'Observações acolhedoras pensadas para enriquecer seu autoconhecimento.' }
      ],
      exampleTag: 'EXEMPLO DE RESULTADO',
      exampleType: 'Síntesi de Perfil',
      alignmentLabel: 'Alinhamento Geral',
      alignmentValue: '78%',
      topBadge: 'Alta Curiosidade Intelectual',
      dim1: 'Curiosidade', dim2: 'Criatividade & Ideias', dim3: 'Busca por Novidade', dim4: 'Flexibilidade de Perspectiva',
      suggestTitle: 'O que isso sugere:',
      suggestText: 'Suas respostas apontam para um gosto ativo em explorar novos conceitos, pensamento reflexivo e mente aberta diante dos desafios.'
    },
    privacy: {
      badge: 'Privacidade e Segurança',
      title: 'Seus Resultados São Pessoais',
      subtitle: 'Tratamos suas respostas com o sigilo e respeito que o autoconhecimento merece.',
      items: [
        { title: 'Você controla seus dados', desc: 'Seus resultados pertencem exclusivamente a você.' },
        { title: 'Sem exposição pública', desc: 'Páginas públicas jamais exibem respostas ou dados de usuários.' },
        { title: 'Não indexado pelo Google', desc: 'Páginas privadas possuem regras estritas de noindex.' },
        { title: 'Pagamento seguro', desc: 'Transações criptografadas e processadas via Lemon Squeezy.' }
      ]
    },
    whoFor: {
      badge: 'Comunidade',
      title: 'Para Quem é o Psychology Calculator?',
      subtitle: 'Para qualquer pessoa que valoriza o autoconhecimento fundamentado e prático.',
      groups: [
        { icon: '🧭', title: 'Indivíduos Curiosos', desc: 'Quem deseja compreender melhor seus traços de personalidade e impulsos naturais.' },
        { icon: '💬', title: 'Casais e Parceiros', desc: 'Pares explorando seus estilos de apego e dinâmicas de comunicação.' },
        { icon: '📚', title: 'Estudantes e Aprendizes', desc: 'Interessados em modelos psicométricos e estilos cognitivos.' },
        { icon: '💼', title: 'Profissionais e Líderes', desc: 'Líderes refletindo sobre estilo de gestão e colaboração em equipe.' },
        { icon: '🌱', title: 'Buscadores de Evolução', desc: 'Pessoas desenvolvendo inteligência emocional e resiliência.' },
        { icon: '💡', title: 'Pensadores Reflexivos', desc: 'Quem aprecia perguntas profundas que provocam reflexão real.' }
      ]
    },
    faqs: {
      badge: 'Perguntas e Respostas',
      title: 'Perguntas Frequentes',
      subtitle: 'Tudo o que você precisa saber sobre fazer testes e acessar relatórios.',
      items: [
        { q: 'O que é um teste psicológico?', a: 'É um questionário com afirmações estruturadas para autoavaliação de traços comportamentais e emocionais.' },
        { q: 'Os testes são gratuitos?', a: 'Sim. Todos os testes são 100% gratuitos com visualização imediata da pontuação.' },
        { q: 'Posso fazer sem criar conta?', a: 'Sim. Você pode responder como convidado sem cadastro ou cartão.' },
        { q: 'Quanto tempo leva?', a: 'A maioria tem entre 20 e 25 perguntas e leva de 5 a 7 minutos.' },
        { q: 'Isso é um diagnóstico clínico?', a: 'Não. São ferramentas educativas de autorreflexão e não substituem profissionais de saúde mental.' },
        { q: 'Os créditos comprados expiram?', a: 'Não. Seus créditos nunca expiram.' }
      ]
    },
    disclaimer: {
      prefix: 'Aviso Educativo e de Autorreflexão:',
      text: 'O PsychologyCalculator.com oferece avaliações para fins de autodescoberta e educação. Os resultados não são diagnósticos médicos ou psiquiátricos.'
    },
    finalCta: {
      title: 'Pronto para Descobrir seus Resultados?',
      subtitle: 'Escolha um teste, responda no seu ritmo e descubra o que suas respostas revelam sobre você.',
      ctaPrimary: 'Fazer Teste Grátis →',
      ctaSecondary: 'Ver Todos os Testes'
    }
  }
};

export function getLandingTranslations(locale: SupportedLocale): LandingTranslations {
  return landingTranslations[locale] || landingTranslations.en;
}
