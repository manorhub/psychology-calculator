const baseUrl = 'https://psychology-saas.manorhub533.workers.dev';

async function testLiveResultExperience() {
  console.log('Testing Premium Result Experience on:', baseUrl);

  // 1. Start assessment
  const startRes = await fetch(`${baseUrl}/api/v1/assessments/asm_big_five/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-session': 'guest_result_premium_test' }
  });
  const startData = await startRes.json();
  const attemptId = startData.data.attemptId;

  // 2. Answer question
  await fetch(`${baseUrl}/api/v1/attempts/${attemptId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-session': 'guest_result_premium_test' },
    body: JSON.stringify({ questionId: 'q_bf_1', optionId: 'opt_q1_5' })
  });

  // 3. Complete attempt
  await fetch(`${baseUrl}/api/v1/attempts/${attemptId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-session': 'guest_result_premium_test' }
  });

  // 4. Fetch result page
  const pageRes = await fetch(`${baseUrl}/results/${attemptId}`, {
    headers: { 'x-guest-session': 'guest_result_premium_test' }
  });

  console.log('Result Page Status:', pageRes.status);
  const html = await pageRes.text();

  const checks = [
    { name: 'YOUR RESULTS ARE READY hero badge', passed: html.includes('YOUR RESULTS ARE READY') },
    { name: 'Result Navigation Bar', passed: html.includes('Result Sections Navigation') },
    { name: 'Dimensional Breakdown', passed: html.includes('Dimensional Breakdown') },
    { name: 'What Your Result Means', passed: html.includes('What Your Result Means') },
    { name: 'Try Reflecting On', passed: html.includes('Try Reflecting On') },
    { name: 'Premium AI Synthesis CTA', passed: html.includes('PREMIUM PSYCHOMETRIC SYNTHESIS') },
    { name: 'Save Result Banner', passed: html.includes('SAVE YOUR ASSESSMENT') },
    { name: 'Google 1-click button in modal', passed: html.includes('Continue with Google') },
    { name: 'Noindex SEO meta tag', passed: html.includes('noindex') }
  ];

  console.log('\n--- Live Result Page Section Verifications ---');
  let allPassed = true;
  for (const c of checks) {
    console.log(`${c.passed ? '✅' : '❌'} ${c.name}: ${c.passed ? 'PASSED' : 'FAILED'}`);
    if (!c.passed) allPassed = false;
  }

  if (allPassed) {
    console.log('\n🎉 ALL PREMIUM RESULT PAGE SECTIONS VERIFIED LIVE AND WORKING 100%!');
  } else {
    throw new Error('Some result page sections failed verification');
  }
}

testLiveResultExperience().catch(console.error);
