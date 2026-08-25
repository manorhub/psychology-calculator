const baseUrl = 'https://psychology-saas.manorhub533.workers.dev';

async function testGuestAIReportRestriction() {
  console.log('Testing Guest AI Report Protection on:', baseUrl);

  // 1. Start attempt as guest
  const startRes = await fetch(`${baseUrl}/api/v1/assessments/asm_big_five/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-session': 'guest_sec_test' }
  });
  const startData = await startRes.json();
  const attemptId = startData.data.attemptId;

  // 2. Save answer and complete
  await fetch(`${baseUrl}/api/v1/attempts/${attemptId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-session': 'guest_sec_test' },
    body: JSON.stringify({ questionId: 'q_bf_1', optionId: 'opt_q1_5' })
  });

  await fetch(`${baseUrl}/api/v1/attempts/${attemptId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-session': 'guest_sec_test' }
  });

  // 3. Attempt to generate AI report as unauthenticated guest
  const genRes = await fetch(`${baseUrl}/api/v1/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-session': 'guest_sec_test' },
    body: JSON.stringify({ attemptId })
  });
  const genData = await genRes.json();

  console.log('API Status Code:', genRes.status);
  console.log('API Response:', JSON.stringify(genData, null, 2));

  if (genRes.status === 401 && genData.error?.code === 'UNAUTHORIZED') {
    console.log('✅ PASS: Guest is strictly blocked from generating AI report without login & credits!');
  } else {
    console.error('❌ FAIL: Guest was not blocked properly!');
  }
}

testGuestAIReportRestriction().catch(console.error);
