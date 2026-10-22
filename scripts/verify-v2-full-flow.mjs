import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const BASE = 'http://127.0.0.1:4000/api/v1';

async function run() {
  console.log('Testing Full V2 Learning Flow (E2E Integration)...');
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

    if (res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      return { status: res.status, ok: res.ok, headers: res.headers, ...data };
    }

    const buffer = await res.arrayBuffer();
    return { status: res.status, ok: res.ok, headers: res.headers, buffer };
  };

  // 1. Register test user
  const email = `v2_e2e_${Date.now()}@test.com`;
  const reg = await request('POST', '/auth/register', {
    email,
    password: 'password123',
    name: 'V2 System Engineer',
  });
  assert.equal(reg.status, 201, 'User registered');
  console.log('✓ 1. User registered and session cookie acquired');

  // 2. Set profile focus to system
  const profileRes = await request('PUT', '/learning/profile', {
    time_budget_minutes: 30,
    focus: 'system',
    preferred_days: [1, 2, 3, 4, 5],
  });
  assert.equal(profileRes.status, 200);
  assert.equal(profileRes.data.focus, 'system');
  console.log('✓ 2. Profile configured with focus: system, budget: 30m');

  // 3. Programs Catalog
  const programsRes = await request('GET', '/learning/programs');
  assert.equal(programsRes.status, 200);
  assert.ok(programsRes.data.items.length >= 2, 'Has foundation and IT/system programs');
  const itProg = programsRes.data.items.find(p => p.id === 'english-it-system');
  assert.ok(itProg, 'Found english-it-system');
  console.log(`✓ 3. Programs retrieved: ${programsRes.data.items.map(p => p.title).join(', ')}`);

  // 4. Program Detail
  const itDetail = await request('GET', `/learning/programs/${itProg.id}`);
  assert.equal(itDetail.status, 200);
  assert.ok(itDetail.data.units.length > 0);
  const itLesson = itDetail.data.units[0].lessons[0];
  assert.equal(itLesson.id, 'system-introductions-01');
  assert.equal(itLesson.completed_at, null, 'Lesson initially uncompleted');
  console.log(`✓ 4. Program detail retrieved: ${itLesson.title} (${itLesson.estimated_minutes}m)`);

  // 5. Today's Plan
  const todayRes = await request('GET', '/learning/today');
  assert.equal(todayRes.status, 200);
  assert.equal(todayRes.data.status, 'ready');
  assert.ok(todayRes.data.items.length > 0);
  const plannedLesson = todayRes.data.items.find(i => i.kind === 'lesson');
  assert.ok(plannedLesson, 'Planned lesson item exists');
  console.log(`✓ 5. Today plan generated: ${todayRes.data.items.length} items for date ${todayRes.data.local_date} (Planned: ${plannedLesson.lesson_id})`);

  // 6. Start Planned Lesson Session
  const sessionStart = await request('POST', '/learning/sessions', {
    lesson_id: plannedLesson.lesson_id,
    resume: true,
  });
  assert.equal(sessionStart.status, 201);
  const session = sessionStart.data;
  assert.ok(session.id, 'Session ID created');
  assert.equal(session.cursor, 0);
  assert.equal(session.status, 'active');
  assert.equal(session.total_steps, 7, 'Has 7 integrated steps');
  console.log(`✓ 6. Session started: ${session.title} (ID: ${session.id}, Total steps: ${session.total_steps})`);

  // 7. Verify WAV media audio & Range 206
  const mediaUrl = session.media.url;
  assert.ok(mediaUrl, 'Media URL exists');
  const audioSample = await request('GET', mediaUrl.replace('/api/v1', ''), null, {
    Range: 'bytes=0-1023',
  });
  assert.equal(audioSample.status, 206, 'Audio supports Range 206 partial content');
  assert.equal(audioSample.headers.get('content-type'), 'audio/wav');
  console.log(`✓ 7. Real WAV audio validated with Range 206 (Duration: ${session.media.duration_ms}ms)`);

  // 8. Step-by-Step execution of all 7 steps
  let currentSession = session;

  // Step 0: listen_comprehension (choice)
  assert.equal(currentSession.current.type, 'listen_comprehension');
  const opt0 = currentSession.current.options[0].id;
  // Save draft
  const draft0 = await request('PUT', `/learning/sessions/${currentSession.id}/draft`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
    response: { option_id: opt0 },
  });
  assert.equal(draft0.status, 200);
  currentSession = draft0.data;

  // Submit step 0
  const sub0 = await request('POST', `/learning/sessions/${currentSession.id}/submit`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
    submission_id: randomUUID(),
    response: { option_id: opt0 },
    assistance_used: ['transcript'],
  });
  assert.equal(sub0.status, 200);
  assert.ok(sub0.data.feedback);
  assert.equal(sub0.data.session.cursor, 0, 'Cursor remains at step 0 for feedback review');
  currentSession = sub0.data.session;

  // Advance step 0
  const adv0 = await request('POST', `/learning/sessions/${currentSession.id}/advance`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
  });
  assert.equal(adv0.status, 200);
  currentSession = adv0.data;
  assert.equal(currentSession.cursor, 1);
  console.log('✓ 8a. Step 0 (listen_comprehension) draft, submit, and advance passed');

  // Step 1: vocabulary_in_context (acknowledge)
  assert.equal(currentSession.current.type, 'vocabulary_in_context');
  const sub1 = await request('POST', `/learning/sessions/${currentSession.id}/submit`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
    submission_id: randomUUID(),
    response: { acknowledged: true },
  });
  assert.equal(sub1.status, 200);
  currentSession = sub1.data.session;
  const adv1 = await request('POST', `/learning/sessions/${currentSession.id}/advance`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
  });
  assert.equal(adv1.status, 200);
  currentSession = adv1.data;
  assert.equal(currentSession.cursor, 2);
  console.log('✓ 8b. Step 1 (vocabulary_in_context) acknowledged and advanced');

  // Step 2: grammar_practice (choice)
  assert.equal(currentSession.current.type, 'grammar_practice');
  const opt2 = currentSession.current.options[0].id;
  const sub2 = await request('POST', `/learning/sessions/${currentSession.id}/submit`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
    submission_id: randomUUID(),
    response: { option_id: opt2 },
  });
  assert.equal(sub2.status, 200);
  currentSession = sub2.data.session;
  const adv2 = await request('POST', `/learning/sessions/${currentSession.id}/advance`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
  });
  assert.equal(adv2.status, 200);
  currentSession = adv2.data;
  assert.equal(currentSession.cursor, 3);
  console.log('✓ 8c. Step 2 (grammar_practice) submitted and advanced');

  // Step 3: pronunciation_practice (self_reflection)
  assert.equal(currentSession.current.type, 'pronunciation_practice');
  const sub3 = await request('POST', `/learning/sessions/${currentSession.id}/submit`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
    submission_id: randomUUID(),
    response: { acknowledged: true },
  });
  assert.equal(sub3.status, 200);
  currentSession = sub3.data.session;
  const adv3 = await request('POST', `/learning/sessions/${currentSession.id}/advance`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
  });
  assert.equal(adv3.status, 200);
  currentSession = adv3.data;
  assert.equal(currentSession.cursor, 4);
  console.log('✓ 8d. Step 3 (pronunciation_practice) recorded and advanced');

  // Step 4: speaking_task (text)
  assert.equal(currentSession.current.type, 'speaking_task');
  const sub4 = await request('POST', `/learning/sessions/${currentSession.id}/submit`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
    submission_id: randomUUID(),
    response: { text: 'Hi, I am Linh. I am a student. I study computer systems.', self_reviewed: true },
    assistance_used: ['model'],
  });
  assert.equal(sub4.status, 200);
  currentSession = sub4.data.session;
  const adv4 = await request('POST', `/learning/sessions/${currentSession.id}/advance`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
  });
  assert.equal(adv4.status, 200);
  currentSession = adv4.data;
  assert.equal(currentSession.cursor, 5);
  console.log('✓ 8e. Step 4 (speaking_task) self-reviewed and advanced');

  // Step 5: writing_task (text)
  assert.equal(currentSession.current.type, 'writing_task');
  const sub5 = await request('POST', `/learning/sessions/${currentSession.id}/submit`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
    submission_id: randomUUID(),
    response: { text: 'I am a university student. I study information technology. I want to work with computer systems.', self_reviewed: true },
  });
  assert.equal(sub5.status, 200);
  currentSession = sub5.data.session;
  const adv5 = await request('POST', `/learning/sessions/${currentSession.id}/advance`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
  });
  assert.equal(adv5.status, 200);
  currentSession = adv5.data;
  assert.equal(currentSession.cursor, 6);
  console.log('✓ 8f. Step 5 (writing_task) text submitted and advanced');

  // Step 6: reflection (final step)
  assert.equal(currentSession.current.type, 'reflection');
  const sub6 = await request('POST', `/learning/sessions/${currentSession.id}/submit`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
    submission_id: randomUUID(),
    response: { acknowledged: true, reflection: 'Tự tin với các mẫu câu giới thiệu chuyên ngành.' },
  });
  assert.equal(sub6.status, 200);
  currentSession = sub6.data.session;
  const adv6 = await request('POST', `/learning/sessions/${currentSession.id}/advance`, {
    step_id: currentSession.current.id,
    revision: currentSession.revision,
  });
  assert.equal(adv6.status, 200);
  currentSession = adv6.data;
  assert.equal(currentSession.status, 'completed');
  assert.equal(currentSession.current, null);
  assert.ok(currentSession.completed_at);
  assert.equal(currentSession.summary.completed, true);
  console.log(`✓ 8g. Step 6 (reflection) completed! Session finalized with ${currentSession.summary.graded_correct}/${currentSession.summary.graded_total} graded questions, ${currentSession.summary.open_tasks} open tasks.`);

  // 9. Verify Today Plan reflects completion
  const todayAfter = await request('GET', '/learning/today');
  assert.equal(todayAfter.status, 200);
  const lessonItem = todayAfter.data.items.find(i => i.kind === 'lesson');
  assert.equal(lessonItem.status, 'completed', 'Today plan marks lesson as completed');
  console.log('✓ 9. GET /learning/today confirms lesson item status is completed');

  // 10. Verify Program Detail reflects completed_at
  const progDetailAfter = await request('GET', `/learning/programs/${currentSession.program_id}`);
  assert.equal(progDetailAfter.status, 200);
  const lessonAfter = progDetailAfter.data.units[0].lessons.find(l => l.id === currentSession.lesson_id);
  assert.ok(lessonAfter?.completed_at, 'Lesson completed_at timestamp is persisted');
  console.log(`✓ 10. GET /learning/programs/${currentSession.program_id} confirms completed_at timestamp: ${lessonAfter.completed_at}`);

  // 11. Also test the IT/System pilot lesson directly (system-introductions-01)
  console.log('\nTesting IT/System Specialist Pilot Lesson (system-introductions-01)...');
  const itSessionStart = await request('POST', '/learning/sessions', {
    lesson_id: 'system-introductions-01',
    resume: true,
  });
  assert.equal(itSessionStart.status, 201);
  let itSession = itSessionStart.data;
  assert.equal(itSession.lesson_id, 'system-introductions-01');
  assert.equal(itSession.program_id, 'english-it-system');

  // Step 0: listen
  const itOpt0 = itSession.current.options[0].id;
  const itSub0 = await request('POST', `/learning/sessions/${itSession.id}/submit`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
    submission_id: randomUUID(),
    response: { option_id: itOpt0 },
  });
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/advance`, {
    step_id: itSession.current.id,
    revision: itSub0.data.session.revision,
  })).data;

  // Step 1: vocab
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/submit`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
    submission_id: randomUUID(),
    response: { acknowledged: true },
  })).data.session;
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/advance`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
  })).data;

  // Step 2: grammar
  const itOpt2 = itSession.current.options[0].id;
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/submit`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
    submission_id: randomUUID(),
    response: { option_id: itOpt2 },
  })).data.session;
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/advance`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
  })).data;

  // Step 3: pronunciation
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/submit`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
    submission_id: randomUUID(),
    response: { acknowledged: true },
  })).data.session;
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/advance`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
  })).data;

  // Step 4: speaking
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/submit`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
    submission_id: randomUUID(),
    response: { text: 'Hi, I study information technology and work with Linux servers.', self_reviewed: true },
  })).data.session;
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/advance`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
  })).data;

  // Step 5: writing
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/submit`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
    submission_id: randomUUID(),
    response: { text: 'I am a 4th year student. I study computer systems and networks. I want to be a system engineer.', self_reviewed: true },
  })).data.session;
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/advance`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
  })).data;

  // Step 6: reflection
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/submit`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
    submission_id: randomUUID(),
    response: { acknowledged: true, reflection: 'Đã nắm vững cách mô tả chuyên ngành IT.' },
  })).data.session;
  itSession = (await request('POST', `/learning/sessions/${itSession.id}/advance`, {
    step_id: itSession.current.id,
    revision: itSession.revision,
  })).data;

  assert.equal(itSession.status, 'completed');
  assert.equal(itSession.summary.completed, true);
  console.log(`✓ 11. IT/System specialist lesson (system-introductions-01) fully completed! (${itSession.summary.graded_correct}/${itSession.summary.graded_total} graded questions, ${itSession.summary.open_tasks} open tasks).`);

  const itProgAfter = await request('GET', '/learning/programs/english-it-system');
  assert.ok(itProgAfter.data.units[0].lessons[0].completed_at);
  console.log(`✓ 12. GET /learning/programs/english-it-system confirms completed_at: ${itProgAfter.data.units[0].lessons[0].completed_at}`);

  console.log('\n🎉 ALL 12 E2E STEPS (BOTH FOUNDATION & IT/SYSTEM PILOTS) VERIFIED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
