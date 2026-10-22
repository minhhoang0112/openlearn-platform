import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const BASE = 'http://127.0.0.1:4000/api/v1';

async function run() {
  console.log('--- Testing New 8-Step Lesson with Reading Comprehension (foundation-routine-01) ---');
  let cookie = '';

  const request = async (method, path, body, customHeaders = {}) => {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? { 'X-Requested-With': 'OpenQuiz' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...customHeaders,
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      cookie = setCookie.split(';')[0];
    }

    const json = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, headers: res.headers, ...json };
  };

  // 1. Register test user
  const email = `reading_test_${Date.now()}@test.com`;
  const reg = await request('POST', '/auth/register', {
    email,
    password: 'password123',
    name: 'Reading Learner',
  });
  assert.equal(reg.status, 201);
  console.log('✓ 1. Test user registered and authenticated');

  // 2. Start session for 'foundation-routine-01' (Một ngày học tập)
  const start = await request('POST', '/learning/sessions', {
    lesson_id: 'foundation-routine-01',
    resume: true,
  });
  assert.equal(start.status, 201);
  let session = start.data;
  assert.equal(session.total_steps, 8, 'Has 8 integrated steps');
  console.log(`✓ 2. Session started: "${session.title}" (Total steps: ${session.total_steps})`);

  // Verify that one of the steps is 'reading_comprehension'
  const hasReading = session.steps.some(s => s.type === 'reading_comprehension');
  assert.ok(hasReading, 'Session steps include reading_comprehension');

  // Go through all steps until completion
  while (session.status === 'active' && session.current) {
    const cur = session.current;
    const stepType = cur.type;
    const rev = session.revision;
    const sId = session.id;

    let responsePayload = {};
    if (cur.response_schema === 'choice') {
      // Pick first option
      responsePayload = { option_id: cur.options[0].id };
    } else if (cur.response_schema === 'acknowledge') {
      responsePayload = { acknowledged: true };
    } else if (cur.response_schema === 'text') {
      responsePayload = { text: 'I study in the morning and work in the afternoon.', self_reviewed: true };
    } else if (cur.response_schema === 'self_reflection') {
      responsePayload = { acknowledged: true, reflection: 'Tự tin với các cấu trúc thời gian và lịch trình.' };
    }

    // Submit step
    const subRes = await request('POST', `/learning/sessions/${sId}/submit`, {
      step_id: cur.id,
      revision: rev,
      submission_id: randomUUID(),
      response: responsePayload,
    });
    assert.equal(subRes.status, 200, `Step ${cur.title} (${stepType}) submitted`);

    // Advance step
    const advRes = await request('POST', `/learning/sessions/${sId}/advance`, {
      step_id: cur.id,
      revision: subRes.data.session.revision,
    });
    assert.equal(advRes.status, 200, `Step ${cur.title} advanced`);
    session = advRes.data;
    console.log(`  - Completed step: ${cur.title} (${stepType})`);
  }

  assert.equal(session.status, 'completed', 'All 8 steps completed successfully');
  console.log('✓ 3. 8-step lesson with reading comprehension completed 100%');

  // 4. Verify that GET /learning/progress reflects reading comprehension evidence!
  const progRes = await request('GET', '/learning/progress?days=30');
  assert.equal(progRes.status, 200);
  const readingSkill = progRes.data.skills.find(s => s.key === 'reading');
  assert.ok(readingSkill);
  assert.ok(readingSkill.graded_tasks >= 1, 'Reading now has at least 1 graded task');
  assert.ok(readingSkill.accuracy_percent !== null, 'Reading accuracy is no longer null');
  assert.equal(readingSkill.evidence_status, 'graded_practice', 'Reading status transitioned to graded_practice');
  console.log(`✓ 4. Reading skill in progress analytics updated: ${readingSkill.correct}/${readingSkill.graded_tasks} graded, accuracy: ${readingSkill.accuracy_percent}% (evidence_status: ${readingSkill.evidence_status})`);

  // 5. Verify GET /learning/sessions/:id/evidence includes the reading comprehension step
  const evRes = await request('GET', `/learning/sessions/${session.id}/evidence`);
  assert.equal(evRes.status, 200);
  assert.equal(evRes.data.items.length, 8);
  const readingEvidence = evRes.data.items.find(i => i.type === 'reading_comprehension');
  assert.ok(readingEvidence, 'Reading step is present in session evidence');
  assert.ok(readingEvidence.prompt);
  assert.ok(readingEvidence.response?.option_id);
  assert.ok(readingEvidence.feedback);
  console.log(`✓ 5. Evidence for reading comprehension verified: prompt "${readingEvidence.prompt.slice(0, 40)}..." -> choice option: ${readingEvidence.response.option_id}`);

  console.log('\n================================================================');
  console.log('ALL 5 E2E TESTS FOR NEW 8-STEP READING LESSON PASSED! 🎉');
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('\n❌ E2E Reading Lesson Verification failed:\n', err);
  process.exit(1);
});

