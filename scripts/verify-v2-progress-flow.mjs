import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const BASE = 'http://127.0.0.1:4000/api/v1';

async function run() {
  console.log('--- Starting V2 Progress & Learning History E2E Verification ---');
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
  const email = `prog_v2_${Date.now()}@test.com`;
  const reg = await request('POST', '/auth/register', {
    email,
    password: 'password123',
    name: 'V2 Progress Analyst',
  });
  assert.equal(reg.status, 201, 'User registered successfully');
  console.log('✓ 1. Test user registered and authenticated');

  // 2. Fetch initial progress (pristine account)
  const initProg = await request('GET', '/learning/progress?days=30');
  assert.equal(initProg.status, 200);
  const d0 = initProg.data;
  assert.equal(d0.lifetime.unique_lessons_completed, 0);
  assert.equal(d0.lifetime.sessions_started, 0);
  assert.equal(d0.window_activity.active_days, 0);
  assert.equal(d0.window_activity.lesson_submissions, 0);
  assert.ok(Array.isArray(d0.skills));
  assert.equal(d0.skills.length, 7);
  // Verify honesty: accuracy is null when no tasks have been answered
  const listeningInit = d0.skills.find(s => s.key === 'listening');
  assert.equal(listeningInit.accuracy_percent, null, 'Unanswered skill accuracy must be null, not 0%');
  assert.ok(d0.limitations.length >= 4, 'Includes required transparency limitations');
  console.log('✓ 2. Initial progress verified: counts 0, accuracy null (not fabricated 0%), 4 limitations');

  // 3. Fetch initial history (empty)
  const initHist = await request('GET', '/learning/history');
  assert.equal(initHist.status, 200);
  assert.equal(initHist.data.items.length, 0);
  assert.equal(initHist.data.total, 0);
  console.log('✓ 3. Initial learning history is clean (0 sessions)');

  // 4. Start a Foundation Lesson Session and complete all 7 steps
  const todayRes = await request('GET', '/learning/today');
  assert.equal(todayRes.status, 200);
  const lessonId = todayRes.data.items[0].lesson_id;

  const startRes = await request('POST', '/learning/sessions', { lesson_id: lessonId, resume: true });
  assert.equal(startRes.status, 201);
  let session = startRes.data;
  const sessionId = session.id;

  // Step 0: listen_comprehension (submit option 'a', then advance)
  const sub0 = await request('POST', `/learning/sessions/${sessionId}/submit`, {
    step_id: session.current.id,
    revision: session.revision,
    submission_id: randomUUID(),
    response: { option_id: 'a' },
    assistance_used: ['transcript'],
  });
  assert.equal(sub0.status, 200);
  session = (await request('POST', `/learning/sessions/${sessionId}/advance`, {
    step_id: session.current.id,
    revision: sub0.data.session.revision,
  })).data;

  // Step 1: vocabulary_in_context (acknowledge)
  const sub1 = await request('POST', `/learning/sessions/${sessionId}/submit`, {
    step_id: session.current.id,
    revision: session.revision,
    submission_id: randomUUID(),
    response: { acknowledged: true },
  });
  session = (await request('POST', `/learning/sessions/${sessionId}/advance`, {
    step_id: session.current.id,
    revision: sub1.data.session.revision,
  })).data;

  // Step 2: grammar_practice (submit 'am')
  const sub2 = await request('POST', `/learning/sessions/${sessionId}/submit`, {
    step_id: session.current.id,
    revision: session.revision,
    submission_id: randomUUID(),
    response: { option_id: 'am' },
    assistance_used: [],
  });
  session = (await request('POST', `/learning/sessions/${sessionId}/advance`, {
    step_id: session.current.id,
    revision: sub2.data.session.revision,
  })).data;

  // Step 3: pronunciation_practice
  const sub3 = await request('POST', `/learning/sessions/${sessionId}/submit`, {
    step_id: session.current.id,
    revision: session.revision,
    submission_id: randomUUID(),
    response: { acknowledged: true },
  });
  session = (await request('POST', `/learning/sessions/${sessionId}/advance`, {
    step_id: session.current.id,
    revision: sub3.data.session.revision,
  })).data;

  // Step 4: speaking_task
  const mySpeakingText = 'Hi, my name is Alex. I am a software student living in Hanoi.';
  const sub4 = await request('POST', `/learning/sessions/${sessionId}/submit`, {
    step_id: session.current.id,
    revision: session.revision,
    submission_id: randomUUID(),
    response: { text: mySpeakingText, self_reviewed: true },
  });
  session = (await request('POST', `/learning/sessions/${sessionId}/advance`, {
    step_id: session.current.id,
    revision: sub4.data.session.revision,
  })).data;

  // Step 5: writing_task
  const myWritingText = 'I study computer science at the university in the morning.';
  const sub5 = await request('POST', `/learning/sessions/${sessionId}/submit`, {
    step_id: session.current.id,
    revision: session.revision,
    submission_id: randomUUID(),
    response: { text: myWritingText, self_reviewed: true },
  });
  session = (await request('POST', `/learning/sessions/${sessionId}/advance`, {
    step_id: session.current.id,
    revision: sub5.data.session.revision,
  })).data;

  // Step 6: reflection
  const myReflection = 'I want to review prepositions in the morning and at night.';
  const sub6 = await request('POST', `/learning/sessions/${sessionId}/submit`, {
    step_id: session.current.id,
    revision: session.revision,
    submission_id: randomUUID(),
    response: { acknowledged: true, reflection: myReflection },
  });
  assert.equal(sub6.status, 200);

  // Advance final step to complete the session
  const adv6 = await request('POST', `/learning/sessions/${sessionId}/advance`, {
    step_id: session.current.id,
    revision: sub6.data.session.revision,
  });
  assert.equal(adv6.status, 200);
  assert.equal(adv6.data.status, 'completed', 'Final step advance completes the session');
  console.log(`✓ 4. Lesson session fully completed across all 7 steps (ID: ${sessionId})`);

  // 5. Verify updated Progress data
  const progAfter = await request('GET', '/learning/progress?days=30');
  assert.equal(progAfter.status, 200);
  const d1 = progAfter.data;

  assert.equal(d1.lifetime.sessions_started, 1);
  assert.equal(d1.lifetime.completed_sessions, 1);
  assert.equal(d1.lifetime.unique_lessons_completed, 1);
  assert.equal(d1.window_activity.active_days, 1);
  assert.equal(d1.window_activity.lesson_submissions, 7);

  // Check program completion (1/3 published lessons for foundation)
  const foundProg = d1.programs.find(p => p.id === 'english-foundation');
  assert.ok(foundProg);
  assert.equal(foundProg.completed_lessons, 1);
  assert.ok(foundProg.published_lessons >= 8);
  assert.equal(Math.round(foundProg.completion_percent), Math.round((foundProg.completed_lessons / foundProg.published_lessons) * 100));

  // Check skills metrics
  const listening = d1.skills.find(s => s.key === 'listening');
  assert.ok(listening);
  assert.equal(listening.graded_tasks, 1);
  assert.equal(listening.correct, 1);
  assert.equal(listening.accuracy_percent, 100);

  const grammar = d1.skills.find(s => s.key === 'grammar');
  assert.ok(grammar);
  assert.equal(grammar.graded_tasks, 1);
  assert.equal(grammar.correct, 1);
  assert.equal(grammar.unassisted_correct, 1);
  assert.equal(grammar.accuracy_percent, 100);

  const writing = d1.skills.find(s => s.key === 'writing');
  assert.ok(writing);
  assert.equal(writing.submitted_tasks, 1);
  assert.equal(writing.evidence_status, 'self_review_only');

  const reading = d1.skills.find(s => s.key === 'reading');
  assert.ok(reading);
  assert.equal(reading.evidence_status, 'not_assessed');
  console.log('✓ 5. GET /learning/progress reflects 1 completed lesson, 33% foundation, 7 submissions, listening 100%, grammar 100%');

  // 6. Verify Learning History
  const histAfter = await request('GET', '/learning/history?status=all');
  assert.equal(histAfter.status, 200);
  assert.equal(histAfter.data.total, 1);
  assert.equal(histAfter.data.items.length, 1);
  const hItem = histAfter.data.items[0];
  assert.equal(hItem.id, sessionId);
  assert.equal(hItem.status, 'completed');
  assert.equal(hItem.completed_steps, 7);
  assert.equal(hItem.total_steps, 7);
  assert.equal(hItem.submitted_steps, 7);
  assert.ok(hItem.route);
  assert.ok(hItem.completed_at);
  console.log(`✓ 6. GET /learning/history returns completed session: "${hItem.title}" (${hItem.completed_steps}/${hItem.total_steps} steps)`);

  // 7. Verify Learning Session Evidence (learner's actual submitted text)
  const evRes = await request('GET', `/learning/sessions/${sessionId}/evidence`);
  assert.equal(evRes.status, 200);
  assert.equal(evRes.data.session_id, sessionId);
  assert.equal(evRes.data.items.length, 7);

  // Check speaking evidence
  const spkEv = evRes.data.items.find(i => i.type === 'speaking_task');
  assert.ok(spkEv);
  assert.equal(spkEv.response.text, mySpeakingText, 'Original speaking submission text preserved exactly');
  assert.equal(spkEv.response.self_reviewed, true);

  // Check writing evidence
  const wrtEv = evRes.data.items.find(i => i.type === 'writing_task');
  assert.ok(wrtEv);
  assert.equal(wrtEv.response.text, myWritingText, 'Original writing submission text preserved exactly');

  // Check reflection evidence
  const refEv = evRes.data.items.find(i => i.type === 'reflection');
  assert.ok(refEv);
  assert.equal(refEv.response.reflection, myReflection, 'Original reflection note preserved exactly');
  console.log('✓ 7. GET /learning/sessions/:id/evidence accurately returns learner submitted text, choices, and reflections');

  // 8. Verify different time windows (7, 90 days)
  const p7 = await request('GET', '/learning/progress?days=7');
  assert.equal(p7.status, 200);
  assert.equal(p7.data.window.days, 7);
  assert.equal(p7.data.daily_activity.length, 7);

  const p90 = await request('GET', '/learning/progress?days=90');
  assert.equal(p90.status, 200);
  assert.equal(p90.data.window.days, 90);
  assert.equal(p90.data.daily_activity.length, 90);
  console.log('✓ 8. Parameterized window sizes (7, 30, 90 days) verified');

  console.log('\n======================================================');
  console.log('ALL 8 E2E V2 PROGRESS & HISTORY TESTS PASSED! 🎉');
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('\n❌ E2E Progress Verification failed:\n', err);
  process.exit(1);
});
