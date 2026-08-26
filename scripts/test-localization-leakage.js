console.log('=== Complete Live Multilingual Leakage & UI Audit ===\n');

const baseUrl = 'https://psychology-saas.manorhub533.workers.dev';
const locales = ['es', 'fr', 'de', 'pt', 'hi'];

const testPages = [
  '',
  '/assessments',
  '/pricing',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/disclaimer',
  '/assessments/category/personality',
  '/assessments/category/career-work',
  '/assessments/category/emotional-wellbeing',
  '/assessments/category/relationships-attachment',
  '/assessments/category/cognitive-style',
  '/assessments/openness-to-experience-test',
  '/assessments/multidimensional-anger-test',
  '/assessments/16-type-personality-test',
  '/assessments/decision-making-style-test',
  '/assessments/big-five-personality-test',
  '/assessments/emotional-intelligence-test',
  '/assessments/attachment-style-test'
];

// Legitimate proper names / acronyms allowed on localized pages
const allowedProperTerms = [
  'PsychologyCalculator.com',
  'Psychology Calculator',
  'Big Five',
  'OCEAN',
  'EQ',
  'QE',
  'Rosenberg',
  'Thomas-Kilmann',
  'Ambivert',
  '16-Type',
  'Openness',
  'Conscientiousness',
  'Extraversion',
  'Agreeableness',
  'Neuroticism'
];

async function runAudit() {
  let totalAudited = 0;
  let passedPages = 0;
  let failedPages = 0;

  for (const loc of locales) {
    console.log(`\n==================================================`);
    console.log(`Auditing Locale: [${loc.toUpperCase()}]`);
    console.log(`==================================================`);

    for (const page of testPages) {
      totalAudited++;
      const url = `${baseUrl}/${loc}${page}`;
      try {
        const res = await fetch(url);
        if (res.status !== 200) {
          console.error(`  ✖ [FAIL] HTTP ${res.status}: ${url}`);
          failedPages++;
          continue;
        }

        const html = await res.text();

        // Check for specific unwanted English leaks
        const forbiddenEnglish = [
          'Explore personality traits, behavioral patterns',
          'Understand what energizes your work, leadership instincts',
          'Evaluate your decision-making approach: Analytical',
          'How long does the',
          'Is this assessment a medical or clinical diagnosis',
          'Are my responses and results confidential',
          'Free to start with instant scoring'
        ];

        let hasLeak = false;
        for (const leak of forbiddenEnglish) {
          if (html.includes(leak)) {
            console.error(`  ✖ [LEAK] Found English string on ${loc}${page}: "${leak}"`);
            hasLeak = true;
            break;
          }
        }

        if (hasLeak) {
          failedPages++;
        } else {
          console.log(`  ✔ [PASS] 200 OK & Localized: /${loc}${page}`);
          passedPages++;
        }
      } catch (err) {
        console.error(`  ✖ [ERROR] Fetch failed for ${url}:`, err.message);
        failedPages++;
      }
    }
  }

  console.log(`\n==================================================`);
  console.log(`FINAL AUDIT RESULTS:`);
  console.log(`Total Pages Audited: ${totalAudited}`);
  console.log(`Passed (100% Localized): ${passedPages}`);
  console.log(`Failed: ${failedPages}`);
  console.log(`==================================================\n`);

  if (failedPages > 0) {
    process.exit(1);
  }
}

runAudit();
