import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const BASE = 'http://127.0.0.1:4000/api/v1';

async function run() {
  console.log('--- Starting V2 Mistakes Notebook & Spaced Review E2E Verification ---');
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
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      cookie = setCookie.split(';')[0];
    }

    const json = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, headers: res.headers, ...json };
  };

  // 1. Register test user
  const email = `mistake_v2_${Date.now()}@test.com`;
  const reg = await request('POST', '/auth/register', {
    email,
    password: 'password123',
    name: 'V2 Mistake Scholar',
  });
  assert.equal(reg.status, 201, 'User registered successfully');
  console.log('✓ 1. Test user registered and session cookie stored');

  // 2. Fetch initial mistakes (should be empty)
  const initialMistakes = await request('GET', '/learning/mistakes');
  assert.equal(initialMistakes.status, 200);
  assert.equal(initialMistakes.data.items.length, 0);
  assert.equal(initialMistakes.data.summary.total, 0);
  assert.equal(initialMistakes.data.summary.active_count, 0);
  assert.equal(initialMistakes.data.summary.due_count, 0);
  assert.equal(initialMistakes.data.summary.resolved_count, 0);
  console.log('✓ 2. Initial mistakes notebook is completely clean (0 mistakes)');

  // 3. Start a Foundation Lesson Session
  const todayRes = await request('GET', '/learning/today');
  assert.equal(todayRes.status, 200);
  const lessonId = todayRes.data.items[0].lesson_id;
  assert.ok(lessonId, 'Found planned lesson');

  const sessionStart = await request('POST', '/learning/sessions', {
    lesson_id: lessonId,
    resume: true,
  });
  assert.equal(sessionStart.status, 201);
  let currentSession = sessionStart.data;
  assert.ok(currentSession.id);
  const step0 = currentSession.current;
  assert.equal(step0.response_schema, 'choice');
  console.log(`✓ 3. Lesson started: "${currentSession.title}" (Step 1: ${step0.title})`);

  // 4. Submit Step 1 with an INCORRECT option ('b' instead of 'a')
  const wrongOption = step0.options.find(o => o.id !== 'a')?.id || 'b';
  const submitRes = await request('POST', `/learning/sessions/${currentSession.id}/submit`, {
    step_id: step0.id,
    revision: currentSession.revision,
    submission_id: randomUUID(),
    response: { option_id: wrongOption },
  });
  assert.equal(submitRes.status, 200);
  currentSession = submitRes.data.session;
  const feedback = submitRes.data.feedback;
  assert.equal(feedback.assessment_status, 'graded');
  assert.equal(feedback.correct, false, 'Submitted answer is wrong');
  assert.ok(feedback.mistake_id, 'BE automatically created a mistake record and returned feedback.mistake_id');
  const mistakeId = feedback.mistake_id;
  console.log(`✓ 4. Wrong answer submitted; feedback.mistake_id returned: ${mistakeId}`);

  // 5. Verify Mistakes List & Summary
  const mistakesRes = await request('GET', '/learning/mistakes');
  assert.equal(mistakesRes.status, 200);
  assert.equal(mistakesRes.data.total, 1);
  assert.equal(mistakesRes.data.items.length, 1);
  assert.equal(mistakesRes.data.summary.total, 1);
  assert.equal(mistakesRes.data.summary.active_count, 1);
  assert.equal(mistakesRes.data.summary.due_count, 1);
  assert.equal(mistakesRes.data.summary.resolved_count, 0);

  const item = mistakesRes.data.items[0];
  assert.equal(item.id, mistakeId);
  assert.equal(item.wrong_count, 1);
  assert.equal(item.review_count, 0);
  assert.equal(item.correct_streak, 0);
  assert.equal(item.required_correct, 2);
  assert.equal(item.status, 'active');
  assert.equal(item.due, true, 'First wrong encounter is immediately due for review');
  console.log('✓ 5. GET /learning/mistakes returned 1 item with due: true, streak: 0/2, wrong_count: 1');

  // 6. Verify Today Plan includes updated mistake_summary
  const todayAfter = await request('GET', '/learning/today');
  assert.equal(todayAfter.status, 200);
  assert.ok(todayAfter.data.mistake_summary);
  assert.equal(todayAfter.data.mistake_summary.total, 1);
  assert.equal(todayAfter.data.mistake_summary.due_count, 1);
  assert.equal(todayAfter.data.mistake_summary.active_count, 1);
  console.log('✓ 6. GET /learning/today contains matching mistake_summary widget data');

  // 7. Verify Mistake Detail
  const detailRes = await request('GET', `/learning/mistakes/${mistakeId}`);
  assert.equal(detailRes.status, 200);
  const detail = detailRes.data;
  assert.equal(detail.id, mistakeId);
  assert.ok(detail.question);
  assert.ok(detail.question.options.length >= 2);
  assert.ok(detail.media?.url);
  assert.ok(detail.transcript);
  assert.ok(detail.translation);
  console.log(`✓ 7. GET /learning/mistakes/${mistakeId} retrieved complete question detail, WAV media, and transcript`);

  // 8. Submit unassisted review with CORRECT answer ('a')
  const reviewSubmissionId = randomUUID();
  const reviewRes = await request('POST', `/learning/mistakes/${mistakeId}/reviews`, {
    submission_id: reviewSubmissionId,
    response: { option_id: 'a' },
    assistance_used: [],
  });
  assert.equal(reviewRes.status, 200);
  const revFeedback = reviewRes.data.feedback;
  assert.equal(revFeedback.assessment_status, 'graded');
  assert.equal(revFeedback.correct, true, 'Answer is correct');
  assert.equal(revFeedback.independent, true, 'Review recall was independent (no assistance)');
  assert.equal(revFeedback.counts_toward_resolution, true);
  assert.equal(revFeedback.correct_streak, 1);
  assert.equal(revFeedback.required_correct, 2);
  assert.equal(revFeedback.resolved, false, 'Requires 2 consecutive independent correct recalls');
  assert.equal(reviewRes.data.mistake.due, false, 'Mistake is no longer due; next interval scheduled');
  assert.ok(reviewRes.data.mistake.due_at, 'due_at is scheduled in future (24 hours)');
  console.log('✓ 8. Unassisted correct review submitted: streak increased to 1/2, due: false');

  // 9. Verify Spacing rule: immediate re-submission returns 409 REVIEW_NOT_DUE
  const immediateRetry = await request('POST', `/learning/mistakes/${mistakeId}/reviews`, {
    submission_id: randomUUID(),
    response: { option_id: 'a' },
    assistance_used: [],
  });
  assert.equal(immediateRetry.status, 409, 'BE correctly rejects review before due interval');
  assert.equal(immediateRetry.error.code, 'REVIEW_NOT_DUE');
  assert.ok(immediateRetry.error.details.due_at, 'due_at returned in error details');
  console.log('✓ 9. Spaced repetition enforced: immediate review correctly blocked with 409 REVIEW_NOT_DUE');

  // 10. Verify Idempotent Replay: exact same submission_id & payload returns replayed: true without penalty
  const replayRes = await request('POST', `/learning/mistakes/${mistakeId}/reviews`, {
    submission_id: reviewSubmissionId,
    response: { option_id: 'a' },
    assistance_used: [],
  });
  assert.equal(replayRes.status, 200);
  assert.equal(replayRes.data.replayed, true, 'Idempotent replay handled cleanly');
  assert.equal(replayRes.data.mistake.review_count, 1, 'Review count not incremented twice on replay');
  console.log('✓ 10. Idempotent submission replay verified (replayed: true, review_count: 1)');

  // 11. Verify Review History
  const historyRes = await request('GET', `/learning/mistakes/${mistakeId}/reviews`);
  assert.equal(historyRes.status, 200);
  assert.equal(historyRes.data.total, 1);
  assert.equal(historyRes.data.items.length, 1);
  assert.equal(historyRes.data.items[0].submission_id, reviewSubmissionId);
  assert.equal(historyRes.data.items[0].response.option_id, 'a');
  assert.equal(historyRes.data.items[0].feedback.correct, true);
  console.log('✓ 11. GET /learning/mistakes/:id/reviews lists past attempts accurately');

  // 12. Advance session to step 2 (Grammar Choice) and test assisted review
  // Advance through step 0 (already submitted)
  const adv0 = await request('POST', `/learning/sessions/${currentSession.id}/advance`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
  });
  assert.equal(adv0.status, 200);
  currentSession = adv0.data;
  assert.equal(currentSession.current.type, 'vocabulary_in_context');

  // Submit step 1 (vocabulary_in_context)
  const sub1 = await request('POST', `/learning/sessions/${currentSession.id}/submit`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
    submission_id: randomUUID(),
    response: { acknowledged: true },
  });
  assert.equal(sub1.status, 200);
  currentSession = sub1.data.session;

  // Advance to step 2
  const adv1 = await request('POST', `/learning/sessions/${currentSession.id}/advance`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
  });
  assert.equal(adv1.status, 200);
  currentSession = adv1.data;
  assert.equal(currentSession.current.type, 'grammar_practice');
  assert.equal(currentSession.current.response_schema, 'choice');

  // Answer grammar question incorrectly (choose 'study' instead of 'am')
  const step2WrongOpt = currentSession.current.options.find(o => o.id === 'study')?.id || currentSession.current.options[1].id;
  const submitStep2 = await request('POST', `/learning/sessions/${currentSession.id}/submit`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
    submission_id: randomUUID(),
    response: { option_id: step2WrongOpt },
  });
  assert.equal(submitStep2.status, 200);
  assert.equal(submitStep2.data.feedback.correct, false);
  assert.ok(submitStep2.data.feedback.mistake_id);
  const mistake2Id = submitStep2.data.feedback.mistake_id;
  const expectedOpt2 = submitStep2.data.feedback.expected_option_id;
  assert.equal(expectedOpt2, 'am');
  console.log(`✓ 12. Second mistake recorded from Grammar step: ${mistake2Id} (Expected: ${expectedOpt2})`);

  // 13. Submit review for mistake 2 WITH assistance ('transcript')
  const assistedRev = await request('POST', `/learning/mistakes/${mistake2Id}/reviews`, {
    submission_id: randomUUID(),
    response: { option_id: expectedOpt2 },
    assistance_used: ['transcript'],
  });
  assert.equal(assistedRev.status, 200);
  assert.equal(assistedRev.data.feedback.correct, true);
  assert.equal(assistedRev.data.feedback.independent, false, 'Assisted review is NOT independent');
  assert.equal(assistedRev.data.feedback.counts_toward_resolution, false, 'Assisted review does not count toward resolution');
  assert.equal(assistedRev.data.feedback.correct_streak, 0, 'Streak remains 0 when assistance was used');
  console.log('✓ 13. Assisted review verified: correct with assistance resets/keeps streak at 0');

  // 14. Check updated summary with multiple items
  const finalMistakes = await request('GET', '/learning/mistakes');
  assert.equal(finalMistakes.status, 200);
  assert.equal(finalMistakes.data.summary.total, 2);
  assert.equal(finalMistakes.data.summary.active_count, 2);
  assert.equal(finalMistakes.data.summary.due_count, 0, 'Both mistakes are now spaced out');
  console.log('✓ 14. Final mistakes summary reflects 2 active mistakes, 0 due currently');

  console.log('\n======================================================');
  console.log('ALL 14 E2E V2 MISTAKES & SPACED REVIEW TESTS PASSED! 🎉');
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('\n❌ E2E Mistake Verification failed:\n', err);
  process.exit(1);
});
