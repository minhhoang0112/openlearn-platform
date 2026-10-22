// scripts/verify-v2-checkpoint-flow.mjs
// Verifies Checkpoint flow for CONTENT-02 / UPGRADE-V2-CHECKPOINT.md
import assert from 'node:assert';
import crypto from 'node:crypto';

const API_BASE = 'http://127.0.0.1:4000/api/v1';

async function registerTestUser(prefix = 'chk') {
  const email = `${prefix}.${Date.now()}@example.com`;
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'OpenQuiz' },
    body: JSON.stringify({ email, password: 'Password123!', name: 'Checkpoint Tester' })
  });
  assert(res.status === 200 || res.status === 201, `Register failed: ${res.statusText}`);
  const cookie = res.headers.get('set-cookie');
  return { email, cookie };
}

async function apiRequest(endpoint, options = {}, cookie = '') {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'OpenQuiz',
      ...(cookie ? { 'Cookie': cookie } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data: data.data, error: data.error };
}

async function runCheckpointVerification() {
  console.log('--- BẮT ĐẦU KIỂM THỬ FE-02 / CONTENT-02 CHECKPOINT FLOW ---');

  const { cookie } = await registerTestUser('chk.verify');

  // 1. Catalog Check
  console.log('1. Kiểm tra danh mục chương trình english-foundation...');
  const progRes = await apiRequest('/learning/programs/english-foundation', { method: 'GET' }, cookie);
  assert(progRes.ok, 'Failed to fetch english-foundation');
  const lessons = progRes.data.units[0].lessons;
  console.log(`- Tổng số bài học: ${lessons.length} (kỳ vọng: >= 8)`);
  assert(lessons.length >= 8, 'english-foundation must have at least 8 lessons');

  const checkpointLesson = lessons.find(l => l.id === 'foundation-checkpoint-01');
  assert(checkpointLesson, 'foundation-checkpoint-01 must exist');
  assert.strictEqual(checkpointLesson.lesson_kind, 'checkpoint', 'lesson_kind must be checkpoint');
  console.log(`✓ Bài ôn chặng tìm thấy: "${checkpointLesson.title}" (lesson_kind: ${checkpointLesson.lesson_kind})`);

  // 2. Failure / Review Needed Scenario
  console.log('\n2. Kiểm thử luồng bài ôn chặng: Trường hợp KHÔNG ĐẠT tiêu chí (review_needed)...');
  const startRes1 = await apiRequest('/learning/sessions', {
    method: 'POST',
    body: JSON.stringify({ lesson_id: 'foundation-checkpoint-01' })
  }, cookie);
  assert(startRes1.ok, 'Failed to start checkpoint session');
  let session1 = startRes1.data;
  assert.strictEqual(session1.lesson_kind, 'checkpoint');
  assert.strictEqual(session1.total_steps, 9);
  console.log(`- Khởi tạo phiên bài ôn chặng: ${session1.id} (9 bước)`);

  // Intentionally answer all choice questions with option 0 without assistance (yielding only 2/6 correct)
  for (let stepIdx = 0; stepIdx < 9; stepIdx++) {
    const cur = session1.current;
    assert(cur, `Step ${stepIdx} must have current`);
    let response;
    if (cur.response_schema === 'choice') {
      response = { option_id: cur.options[0].id };
    } else if (cur.response_schema === 'text') {
      response = { text: 'Alex intro test', self_reviewed: true };
    } else {
      response = { acknowledged: true, reflection: 'review test' };
    }

    const sub = await apiRequest(`/learning/sessions/${session1.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        step_id: cur.id,
        revision: session1.revision,
        submission_id: crypto.randomUUID(),
        response,
        assistance_used: []
      })
    }, cookie);
    assert(sub.ok, `Submit step ${cur.id} failed`);
    session1 = sub.data.session;

    const adv = await apiRequest(`/learning/sessions/${session1.id}/advance`, {
      method: 'POST',
      body: JSON.stringify({
        step_id: cur.id,
        revision: session1.revision
      })
    }, cookie);
    assert(adv.ok, `Advance step ${cur.id} failed`);
    session1 = adv.data;
  }

  assert.strictEqual(session1.status, 'completed', 'Session must be completed');
  assert(session1.summary, 'Session summary must exist');
  assert(session1.summary.checkpoint, 'summary.checkpoint must exist');
  const chk1 = session1.summary.checkpoint;

  console.log('- Kết quả Checkpoint 1:');
  console.log(`  + Total: ${chk1.graded_total}, Correct: ${chk1.correct}, Unassisted: ${chk1.unassisted_correct}`);
  console.log(`  + Minimum required: ${chk1.minimum_correct}`);
  console.log(`  + Passed: ${chk1.passed} (Kỳ vọng: false)`);
  console.log(`  + Status: ${chk1.status} (Kỳ vọng: review_needed)`);
  console.log(`  + Recommended review lessons: ${JSON.stringify(chk1.recommended_lesson_ids)}`);

  assert.strictEqual(chk1.passed, false, 'Checkpoint must NOT pass when unassisted < minimum');
  assert.strictEqual(chk1.status, 'review_needed', 'Status must be review_needed');
  assert(chk1.unassisted_correct < chk1.minimum_correct, 'Unassisted must be below minimum');
  assert(chk1.recommended_lesson_ids.length > 0, 'Must provide recommended lessons to review');
  console.log('✓ Xác minh thành công: Khi unassisted < 4, passed=false và có gợi ý bài ôn.');

  // Test starting one of the recommended review lessons
  const recommendedId = chk1.recommended_lesson_ids[0];
  console.log(`- Thử nghiệm học bài được đề xuất: ${recommendedId}...`);
  const reviewLessonStart = await apiRequest('/learning/sessions', {
    method: 'POST',
    body: JSON.stringify({ lesson_id: recommendedId, resume: false })
  }, cookie);
  assert(reviewLessonStart.ok, 'Starting recommended review lesson must succeed');
  assert.strictEqual(reviewLessonStart.data.lesson_id, recommendedId);
  console.log(`✓ Mở bài ôn ${recommendedId} thành công (session: ${reviewLessonStart.data.id})`);

  // Verify original checkpoint session was not overwritten
  const verifyOriginal = await apiRequest(`/learning/sessions/${session1.id}`, { method: 'GET' }, cookie);
  assert(verifyOriginal.ok);
  assert.strictEqual(verifyOriginal.data.status, 'completed');
  assert.strictEqual(verifyOriginal.data.summary.checkpoint.passed, false);
  console.log('✓ Bản nộp của bài ôn chặng cũ được giữ nguyên vẹn, không bị sửa đổi.');

  // 3. Passing Scenario
  console.log('\n3. Kiểm thử luồng bài ôn chặng: Trường hợp ĐẠT tiêu chí (passed)...');
  const startRes2 = await apiRequest('/learning/sessions', {
    method: 'POST',
    body: JSON.stringify({ lesson_id: 'foundation-checkpoint-01', resume: false })
  }, cookie);
  assert(startRes2.ok, 'Failed to start fresh checkpoint session');
  let session2 = startRes2.data;

  const correctAnswers = {
    'listen-time': 'nine',
    'listen-place': 'under',
    'grammar-be': 'am',
    'grammar-negative': 'study',
    'read-place': 'library',
    'read-day': 'no'
  };

  for (let stepIdx = 0; stepIdx < 9; stepIdx++) {
    const cur = session2.current;
    assert(cur, `Step ${stepIdx} must have current`);
    let response;
    if (cur.response_schema === 'choice') {
      response = { option_id: correctAnswers[cur.id] };
    } else if (cur.response_schema === 'text') {
      response = { text: 'My name is Alex. I am a student.', self_reviewed: true };
    } else {
      response = { acknowledged: true, reflection: 'Completed unit 1 review thoroughly.' };
    }

    const sub = await apiRequest(`/learning/sessions/${session2.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        step_id: cur.id,
        revision: session2.revision,
        submission_id: crypto.randomUUID(),
        response,
        assistance_used: []
      })
    }, cookie);
    assert(sub.ok, `Submit step ${cur.id} failed`);
    session2 = sub.data.session;

    const adv = await apiRequest(`/learning/sessions/${session2.id}/advance`, {
      method: 'POST',
      body: JSON.stringify({
        step_id: cur.id,
        revision: session2.revision
      })
    }, cookie);
    assert(adv.ok, `Advance step ${cur.id} failed`);
    session2 = adv.data;
  }

  assert.strictEqual(session2.status, 'completed');
  assert(session2.summary.checkpoint, 'Checkpoint summary must exist');
  const chk2 = session2.summary.checkpoint;

  console.log('- Kết quả Checkpoint 2:');
  console.log(`  + Total: ${chk2.graded_total}, Correct: ${chk2.correct}, Unassisted: ${chk2.unassisted_correct}`);
  console.log(`  + Minimum required: ${chk2.minimum_correct}`);
  console.log(`  + Passed: ${chk2.passed} (Kỳ vọng: true)`);
  console.log(`  + Status: ${chk2.status} (Kỳ vọng: passed)`);
  console.log(`  + Open tasks assessment: ${chk2.open_tasks_assessment} (Kỳ vọng: self_review)`);

  assert.strictEqual(chk2.passed, true, 'Checkpoint must pass when 6/6 unassisted');
  assert.strictEqual(chk2.status, 'passed', 'Status must be passed');
  assert.strictEqual(chk2.unassisted_correct, 6);
  assert.strictEqual(chk2.open_tasks_assessment, 'self_review', 'Must state self_review, not fake AI grading');
  console.log('✓ Xác minh thành công: 6/6 đúng độc lập -> passed=true, status="passed".');

  console.log('\n--- TOÀN BỘ CÁC BƯỚC KIỂM THỬ CHECKPOINT HOÀN TẤT THÀNH CÔNG 100% ---');
}

runCheckpointVerification().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
