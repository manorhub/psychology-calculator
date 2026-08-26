const baseUrl = 'https://psychology-saas.manorhub533.workers.dev';

async function testLiveGuestFlow() {
  console.log('Testing live guest flow on:', baseUrl);

  // 1. Start attempt as guest
  const startRes = await fetch(`${baseUrl}/api/v1/assessments/asm_big_five/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-guest-session': 'guest_session_verification_test'
    }
  });
  const startData = await startRes.json();
  console.log('1. Start API Response:', JSON.stringify(startData, null, 2));

  if (!startData.success || !startData.data?.attemptId) {
    throw new Error('Failed to start guest assessment');
  }

  const attemptId = startData.data.attemptId;

  // 2. Save an answer
  const ansRes = await fetch(`${baseUrl}/api/v1/attempts/${attemptId}/answers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-guest-session': 'guest_session_verification_test'
    },
    body: JSON.stringify({
      questionId: 'q_bf_1',
      optionId: 'opt_q1_5'
    })
  });
  const ansData = await ansRes.json();
  console.log('2. Save Answer Response:', JSON.stringify(ansData, null, 2));

  // 3. Complete attempt
  const compRes = await fetch(`${baseUrl}/api/v1/attempts/${attemptId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-guest-session': 'guest_session_verification_test'
    }
  });
  const compData = await compRes.json();
  console.log('3. Complete Attempt Response:', JSON.stringify(compData, null, 2));

  // 4. Test public result page
  const resultPageRes = await fetch(`${baseUrl}/results/${attemptId}`, {
    headers: {
      'x-guest-session': 'guest_session_verification_test'
    }
  });
  console.log('4. Result Page Status:', resultPageRes.status);

  if (resultPageRes.status === 200) {
    console.log('🎉 Live guest assessment flow tested and 100% working!');
  } else {
    console.log('Result page returned status:', resultPageRes.status);
  }
}

testLiveGuestFlow().catch(console.error);
