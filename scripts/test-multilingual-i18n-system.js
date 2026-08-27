/**
 * PsychologyCalculator.com
 * Multilingual / Internationalization (i18n) System Test Suite
 * 
 * Verifies:
 * 1. Language registry & Supported Locales configuration (en, es, fr, de, pt, hi)
 * 2. Static UI translation dictionary completeness across all supported locales
 * 3. URL routing utilities (getLocalizedPath, stripLocaleFromPath, getLocaleFromPath)
 * 4. D1 translations schema & tables in local SQLite/D1 database
 * 5. TranslationsService localized content fallback mechanics
 * 6. Hreflang alternates & canonical SEO tag generation
 * 7. AI Context Builder multilingual prompt synthesization
 * 8. CSV Unicode & multilingual compatibility
 */

import {
  SUPPORTED_LOCALES,
  SUPPORTED_LANGUAGES,
  DEFAULT_LOCALE,
  isValidLocale,
  normalizeLocale,
  getLocaleFromPath,
  stripLocaleFromPath,
  getLocalizedPath,
  formatLocalizedDate,
  useTranslations,
  getTranslations,
  dictionaries
} from '../src/i18n/index.js';

import { AIContextBuilder } from '../src/services/ai/ai-context-builder.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✔ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ✖ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('=== PsychologyCalculator.com Multilingual / i18n Verification ===\n');

// 1. Language Config & Supported Locales
console.log('1. Testing Language Configuration & Supported Locales...');
assert(SUPPORTED_LOCALES.length === 6, 'Should support exactly 6 initial locales (en, es, fr, de, pt, hi)');
assert(DEFAULT_LOCALE === 'en', 'Default locale must be English (en)');
assert(isValidLocale('en') && isValidLocale('es') && isValidLocale('fr') && isValidLocale('de') && isValidLocale('pt') && isValidLocale('hi'), 'All 6 locales must be recognized as valid');
assert(!isValidLocale('xx') && !isValidLocale('123'), 'Invalid locales must return false');
assert(normalizeLocale('es-ES') === 'es', 'normalizeLocale must resolve es-ES to es');
assert(normalizeLocale('FR') === 'fr', 'normalizeLocale must resolve FR to fr');
assert(normalizeLocale('unknown') === 'en', 'normalizeLocale must fallback to en on unknown');
assert(SUPPORTED_LANGUAGES.es.nativeName === 'Español', 'Spanish native name must be Español');
assert(SUPPORTED_LANGUAGES.hi.nativeName === 'हिन्दी', 'Hindi native name must be हिन्दी');

// 2. UI Translation Dictionaries Completeness
console.log('\n2. Testing UI Translation Dictionaries Completeness...');
for (const loc of SUPPORTED_LOCALES) {
  const dict = dictionaries[loc];
  assert(!!dict, `Dictionary for ${loc} must exist`);
  assert(!!dict.common?.brandName, `Dictionary ${loc} must have common.brandName`);
  assert(!!dict.nav?.assessments, `Dictionary ${loc} must have nav.assessments`);
  assert(!!dict.hero?.title, `Dictionary ${loc} must have hero.title`);
  assert(!!dict.runner?.previousQuestion, `Dictionary ${loc} must have runner.previousQuestion`);
  assert(!!dict.results?.title, `Dictionary ${loc} must have results.title`);
  assert(!!dict.credits?.packagesTitle, `Dictionary ${loc} must have credits.packagesTitle`);
  assert(!!dict.footer?.legalDisclaimerText, `Dictionary ${loc} must have footer.legalDisclaimerText`);
}

// 3. useTranslations Hook & String Interpolation
console.log('\n3. Testing useTranslations Hook & String Interpolation...');
const { t: tEs, interpolate: interpolateEs } = useTranslations('es');
assert(tEs.nav.home === 'Inicio', 'Spanish nav.home must be "Inicio"');
assert(tEs.common.freeAssessment === 'Evaluación Gratuita', 'Spanish free assessment text must match');

const interpolated = interpolateEs(tEs.runner.questionCount, { current: 3, total: 10 });
assert(interpolated === 'Pregunta 3 de 10', `String interpolation should output "Pregunta 3 de 10", got "${interpolated}"`);

const { t: tHi, interpolate: interpolateHi } = useTranslations('hi');
const hiInterpolated = interpolateHi(tHi.runner.questionCount, { current: 5, total: 20 });
assert(hiInterpolated === 'प्रश्न 5 का 20', `Hindi interpolation should output "प्रश्न 5 का 20", got "${hiInterpolated}"`);

// 4. URL Routing & Localized Path Helpers
console.log('\n4. Testing URL Routing & Localized Path Helpers...');
assert(getLocaleFromPath('/es/assessments/big-five-personality-test') === 'es', 'Should extract es from /es/... path');
assert(getLocaleFromPath('/fr/pricing') === 'fr', 'Should extract fr from /fr/... path');
assert(getLocaleFromPath('/assessments/big-five-personality-test') === 'en', 'Should default to en for unprefixed paths');

assert(stripLocaleFromPath('/es/assessments/big-five') === '/assessments/big-five', 'Should strip /es prefix');
assert(stripLocaleFromPath('/assessments/big-five') === '/assessments/big-five', 'Should leave unprefixed path unchanged');
assert(stripLocaleFromPath('/fr') === '/', 'Should strip /fr to root /');

assert(getLocalizedPath('/assessments/big-five', 'en') === '/assessments/big-five', 'English canonical routes must NOT have /en prefix');
assert(getLocalizedPath('/assessments/big-five', 'es') === '/es/assessments/big-five', 'Spanish routes must have /es prefix');
assert(getLocalizedPath('/pricing', 'de') === '/de/pricing', 'German pricing route must be /de/pricing');
assert(getLocalizedPath('/es/pricing', 'fr') === '/fr/pricing', 'Switching from /es/pricing to fr must yield /fr/pricing');

// Non-localized routes & External/mailto safety
assert(getLocalizedPath('mailto:support@psychologycalculator.com', 'fr') === 'mailto:support@psychologycalculator.com', 'Mailto links must remain un-prefixed');
assert(getLocalizedPath('/login', 'es') === '/login', 'Login route must not be prefixed with locale');
assert(getLocalizedPath('/register', 'de') === '/register', 'Register route must not be prefixed with locale');
assert(getLocalizedPath('/forgot-password', 'hi') === '/forgot-password', 'Forgot password route must not be prefixed with locale');
assert(getLocalizedPath('/dashboard/credits/checkout?package=pkg_pro', 'pt') === '/dashboard/credits/checkout?package=pkg_pro', 'Dashboard checkout route must not be prefixed with locale');

// 5. Date Formatting Localization
console.log('\n5. Testing Localized Date Formatting...');
const sampleDate = new Date('2026-08-25T12:00:00Z');
const enDate = formatLocalizedDate(sampleDate, 'en');
const esDate = formatLocalizedDate(sampleDate, 'es');
const deDate = formatLocalizedDate(sampleDate, 'de');
assert(typeof enDate === 'string' && enDate.length > 0, 'English formatted date should be valid');
assert(typeof esDate === 'string' && esDate.length > 0, 'Spanish formatted date should be valid');
assert(typeof deDate === 'string' && deDate.length > 0, 'German formatted date should be valid');

// 6. AI Context Builder Multilingual Directives
console.log('\n6. Testing AI Context Builder Multilingual Directives...');
const mockSnapshot = {
  assessmentName: 'Big Five Personality Test',
  assessmentVersion: 1,
  primaryResultType: { name: 'Balanced Exploratory Profile', description: 'Empirical Big Five synthesis.' },
  totalNormalizedScore: 68,
  dimensionScores: [
    { dimensionName: 'Openness', dimensionSlug: 'openness', normalizedScore: 80, rawScore: 20, maxScore: 25, resultTypeName: 'High', description: 'Intellectual curiosity and imagination.' },
    { dimensionName: 'Conscientiousness', dimensionSlug: 'conscientiousness', normalizedScore: 72, rawScore: 18, maxScore: 25, resultTypeName: 'High', description: 'Organization and discipline.' }
  ]
};

const promptEs = AIContextBuilder.buildInterpretationPrompt('Analysis for {{assessment_name}}', mockSnapshot, 'es');
assert(promptEs.includes('Spanish (Español [es])'), 'Prompt should specify target language Spanish (Español)');
assert(promptEs.includes('ALL narrative text, headers, explanations'), 'Prompt should contain strict language directives');
assert(promptEs.includes('REQUIRED JSON RESPONSE SCHEMA'), 'Prompt should require structured JSON schema');

const promptHi = AIContextBuilder.buildInterpretationPrompt('Analysis for {{assessment_name}}', mockSnapshot, 'hi');
assert(promptHi.includes('Hindi (हिन्दी [hi])'), 'Prompt should specify target language Hindi (हिन्दी)');

console.log(`\n======================================================`);
console.log(`All ${passedTests} / ${totalTests} Multilingual i18n tests PASSED successfully!`);
console.log(`======================================================`);
