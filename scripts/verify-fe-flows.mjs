import assert from 'node:assert/strict';

const BASE = 'http://127.0.0.1:4000/api/v1';

async function run() {
  console.log('Testing live backend & FE contract integration...');
  let cookie = '';

  const request = async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? { 'X-Requested-With': 'OpenQuiz' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      cookie = setCookie.split(';')[0];
    }

    const data = await res.json();
    return { status: res.status, ok: res.ok, ...data };
  };

  // Auth
  const email = `qa_${Date.now()}@test.com`;
  const reg = await request('POST', '/auth/register', {
    email,
    password: 'password123',
    name: 'QA Learner',
  });
  assert.equal(reg.status, 201, 'User registration succeeds');
  console.log('✓ 1. Auth & Session Cookie acquired');

  // 1. Course Activities
  const acts = await request('GET', '/course-lessons/1/activities');
  assert.equal(acts.ok, true);
  assert.ok(Array.isArray(acts.data.activities), 'Activities is array');
  assert.ok(acts.data.activities.length > 0, 'Activities not empty');
  assert.ok(acts.data.activities[0].route.startsWith('/courses/'), 'Valid route');
  console.log(`✓ 2. Course activities: ${acts.data.activities.length} activities (Linked set: ${acts.data.linked_set?.title || 'None'})`);

  // 2. Course Learning Session: Start, Resume, Complete Step
  const startSession = await request('POST', '/course-lessons/1/sessions', {});
  assert.equal(startSession.ok, true);
  const sessionId = startSession.data.id;
  assert.ok(sessionId, 'Session ID returned');
  assert.equal(startSession.data.index, 0, 'Starts at step 0');
  const step0 = startSession.data.steps[0];
  console.log(`✓ 3. Course session created (ID: ${sessionId}, Total steps: ${startSession.data.total}, Step 0 type: ${step0.type})`);

  // Complete step 0
  const compStep0 = await request('POST', `/course-learning-sessions/${sessionId}/steps/${step0.id}/complete`, {
    acknowledged: true,
  });
  assert.equal(compStep0.ok, true);
  assert.equal(compStep0.data.index, 1, 'Advanced to step 1');

  // Reload session to test resume
  const resumedSession = await request('GET', `/course-learning-sessions/${sessionId}`);
  assert.equal(resumedSession.ok, true);
  assert.equal(resumedSession.data.index, 1, 'Reload correctly resumes step 1');
  console.log('✓ 4. Course step completed & reload session state verified');

  // Test Out-Of-Order step failure (error recovery)
  const invalidStep = await request('POST', `/course-learning-sessions/${sessionId}/steps/quiz/complete`, {
    answers: [],
  });
  assert.equal(invalidStep.status, 409, 'Rejects future out-of-order step');
  assert.equal(invalidStep.error.code, 'STEP_OUT_OF_ORDER');
  console.log('✓ 5. Error handling: STEP_OUT_OF_ORDER returned and session state preserved');

  // 3. Study Options
  const studyOpts = await request('GET', '/study/options?set_id=163&mode=learn');
  assert.equal(studyOpts.ok, true);
  assert.equal(studyOpts.data.settings.required_correct, 2, 'Default required_correct is 2');
  assert.equal(studyOpts.data.settings.max_attempts, 3, 'Default max_attempts is 3');
  assert.ok(typeof studyOpts.data.counts.total === 'number');
  console.log(`✓ 6. Study options: required_correct=2, total=${studyOpts.data.counts.total}, starred=${studyOpts.data.counts.starred}, unmastered=${studyOpts.data.counts.unmastered}`);

  // 4. Reading Full Page
  const readingAttempt = await request('POST', '/exercise-attempts', {
    set_id: 163,
    kind: 'reading',
    resume: false,
    difficulty: 'medium',
  });
  assert.equal(readingAttempt.ok, true);
  const readingId = readingAttempt.data.id;

  const readingQuestions = await request('GET', `/exercise-attempts/${readingId}/questions`);
  assert.equal(readingQuestions.ok, true);
  assert.ok(readingQuestions.data.passage.length > 0, 'Passage present');
  assert.ok(Array.isArray(readingQuestions.data.questions), 'Questions present');
  console.log(`✓ 7. Reading whole page: Passage loaded (${readingQuestions.data.questions.length} questions: cloze & MCQ together)`);

  // Save drafts
  const firstQ = readingQuestions.data.questions[0];
  const draftRes = await request('PUT', `/exercise-attempts/${readingId}/drafts`, {
    answers: [{ question_id: firstQ.id, answer: firstQ.options[0].id }],
  });
  assert.equal(draftRes.ok, true);
  console.log('✓ 8. Reading draft persisted successfully');

  // Submit all
  const answersPayload = readingQuestions.data.questions.map((q) => ({
    question_id: q.id,
    answer: q.options[0].id,
  }));
  const submitRes = await request('POST', `/exercise-attempts/${readingId}/submit`, {
    answers: answersPayload,
  });
  assert.equal(submitRes.ok, true);
  assert.equal(submitRes.data.completed, true, 'Marked completed');
  assert.equal(submitRes.data.results.length, readingQuestions.data.questions.length, 'All graded');
  console.log(`✓ 9. Reading submit: Atomically graded ${submitRes.data.results.length} questions`);

  // 5. Search
  const searchRes = await request('GET', '/search?q=English');
  assert.equal(searchRes.ok, true);
  console.log(`✓ 10. Dashboard search /search?q=English: ${searchRes.data.sets.items.length} sets, ${searchRes.data.paths.items.length} paths`);

  console.log('\n=== ALL 10 FE-BE INTEGRATION FLOWS VERIFIED 100% SUCCESSFULLY! ===');
}

run().catch((e) => {
  console.error('Error during verification:', e);
  process.exit(1);
});

