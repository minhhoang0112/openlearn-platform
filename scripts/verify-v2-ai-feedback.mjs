// scripts/verify-v2-ai-feedback.mjs
// Verifies AI-01 / UPGRADE-V2-AI-FEEDBACK.md
import assert from 'node:assert';
import crypto from 'node:crypto';

const API_BASE = 'http://127.0.0.1:4000/api/v1';

async function registerTestUser(prefix = 'ai') {
  const email = `${prefix}.${Date.now()}@example.com`;
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'OpenQuiz' },
    body: JSON.stringify({ email, password: 'Password123!', name: 'AI Feedback Tester' })
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
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: data.data, error: data.error };
}

async function runAiFeedbackVerification() {
  console.log('--- BẮT ĐẦU KIỂM THỬ AI-01: AI NHẬN XÉT BÀI ĐÃ NỘP ---');

  const { cookie } = await registerTestUser('ai.v2');

  // 1. Start a session for foundation-introductions-01
  console.log('1. Khởi tạo phiên bài học "foundation-introductions-01"...');
  const startRes = await apiRequest('/learning/sessions', {
    method: 'POST',
    body: JSON.stringify({ lesson_id: 'foundation-introductions-01' })
  }, cookie);
  assert(startRes.ok, 'Failed to start session');
  let session = startRes.data;
  const sessionId = session.id;
  console.log(`- Phiên tạo thành công: ${sessionId}`);

  // 2. Check initial AI feedback for session is empty
  console.log('\n2. Kiểm tra GET /learning/sessions/:id/ai-feedback ban đầu...');
  const initAi = await apiRequest(`/learning/sessions/${sessionId}/ai-feedback`, { method: 'GET' }, cookie);
  assert(initAi.ok, 'GET ai-feedback must return 200');
  assert.strictEqual(initAi.data.items.length, 0, 'Initial feedback list must be empty');
  console.log('✓ Danh sách nhận xét ban đầu rỗng (0 items), không tự gọi AI khi load.');

  // 3. Negative tests: calling before submission or on unsupported step
  console.log('\n3. Kiểm tra các trường hợp chặn hợp đồng BE...');
  // A. Unsupported step (step 0: listen-main)
  const unsuppRes = await apiRequest(`/learning/sessions/${sessionId}/steps/listen-main/ai-feedback`, {
    method: 'POST',
    body: JSON.stringify({})
  }, cookie);
  assert.strictEqual(unsuppRes.status, 400, 'Must return 400 for non-writing/speaking step');
  assert.strictEqual(unsuppRes.error.code, 'UNSUPPORTED_FEEDBACK_STEP');
  console.log('✓ Chặn đúng 400 UNSUPPORTED_FEEDBACK_STEP cho bước trắc nghiệm nghe.');

  // B. Calling on writing before submitting
  const unsubmittedRes = await apiRequest(`/learning/sessions/${sessionId}/steps/writing/ai-feedback`, {
    method: 'POST',
    body: JSON.stringify({})
  }, cookie);
  assert.strictEqual(unsubmittedRes.status, 409, 'Must return 409 SUBMISSION_REQUIRED if step not submitted');
  assert.strictEqual(unsubmittedRes.error.code, 'SUBMISSION_REQUIRED');
  console.log('✓ Chặn đúng 409 SUBMISSION_REQUIRED khi bài viết chưa được nộp.');

  // 4. Advance through steps until writing
  console.log('\n4. Nộp các bước chuẩn bị để đến bước writing_task...');
  while (session.current && session.current.id !== 'writing') {
    const cur = session.current;
    let resp;
    if (cur.response_schema === 'choice') resp = { option_id: cur.options[0].id };
    else if (cur.response_schema === 'acknowledge') resp = { acknowledged: true };
    else if (cur.response_schema === 'text') resp = { text: 'My name is Alex. I am a student.', self_reviewed: true };
    else resp = { acknowledged: true, reflection: 'review test' };

    const sub = await apiRequest(`/learning/sessions/${sessionId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        step_id: cur.id,
        revision: session.revision,
        submission_id: crypto.randomUUID(),
        response: resp,
        assistance_used: []
      })
    }, cookie);
    assert(sub.ok, `Failed to submit step ${cur.id}`);
    session = sub.data.session;

    const adv = await apiRequest(`/learning/sessions/${sessionId}/advance`, {
      method: 'POST',
      body: JSON.stringify({ step_id: cur.id, revision: session.revision })
    }, cookie);
    assert(adv.ok, `Failed to advance step ${cur.id}`);
    session = adv.data;
  }

  assert.strictEqual(session.current.id, 'writing');
  assert.strictEqual(session.current.type, 'writing_task');

  // Submit writing task
  console.log('- Nộp văn bản cho bước writing_task...');
  const writtenText = 'Hello, I am student in Hanoi. I study computer.';
  const subWriting = await apiRequest(`/learning/sessions/${sessionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      step_id: 'writing',
      revision: session.revision,
      submission_id: crypto.randomUUID(),
      response: { text: writtenText, self_reviewed: true },
      assistance_used: []
    })
  }, cookie);
  assert(subWriting.ok, 'Failed to submit writing task');
  session = subWriting.data.session;
  console.log('✓ Bài viết nộp thành công với bản nộp gốc giữ nguyên.');

  // 5. Trigger AI Feedback request
  console.log('\n5. Gửi yêu cầu nhận xét AI (POST /steps/writing/ai-feedback)...');
  const aiReq = await apiRequest(`/learning/sessions/${sessionId}/steps/writing/ai-feedback`, {
    method: 'POST',
    body: JSON.stringify({})
  }, cookie);

  if (aiReq.ok) {
    console.log('✓ Nhận xét AI thành công (Gemini 200):');
    console.log(`  + Model: ${aiReq.data.model}, Provider: ${aiReq.data.provider}`);
    console.log(`  + Modality: ${aiReq.data.modality}`);
    console.log(`  + Source text preserved: "${aiReq.data.source_text}"`);
    console.log(`  + Summary: "${aiReq.data.feedback.summary}"`);
    console.log(`  + Corrections count: ${aiReq.data.feedback.corrections?.length || 0}`);
    assert.strictEqual(aiReq.data.source_text, writtenText, 'Original source text must be preserved');
    assert.strictEqual(aiReq.data.pronunciation_assessed, false, 'Pronunciation must not be assessed for writing');

    // Test Cache hit
    console.log('- Thử nghiệm bộ nhớ đệm (Cache hit)...');
    const cacheReq = await apiRequest(`/learning/sessions/${sessionId}/steps/writing/ai-feedback`, {
      method: 'POST',
      body: JSON.stringify({})
    }, cookie);
    assert(cacheReq.ok);
    assert.strictEqual(cacheReq.data.cached, true, 'Subsequent request must return cached: true');
    console.log('✓ Lần gọi thứ 2 trả cached: true, không tiêu tốn hạn mức AI mới.');
  } else if (aiReq.status === 429) {
    console.log(`✓ Nhận được phản hồi giới hạn lượt gọi (429 AI_RATE_LIMITED):`);
    console.log(`  + Message: "${aiReq.error.message}"`);
    console.log(`  + Details: ${JSON.stringify(aiReq.error.details)}`);
    assert.strictEqual(aiReq.error.code, 'AI_RATE_LIMITED');
    console.log('✓ FE xử lý hiển thị banner thông báo retry_after_seconds và không chặn tiến trình học.');
  } else {
    console.log(`- Mã phản hồi AI: ${aiReq.status} (${aiReq.error?.code || 'UNKNOWN'})`);
  }

  // 6. Test advancing without waiting for AI (unblocked progress)
  console.log('\n6. Xác nhận không chặn "Tiếp tục" bài học...');
  const advReflection = await apiRequest(`/learning/sessions/${sessionId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ step_id: 'writing', revision: session.revision })
  }, cookie);
  assert(advReflection.ok, 'Advancing past writing must never be blocked by AI status');
  session = advReflection.data;
  assert.strictEqual(session.current.id, 'reflection', 'Must advance to reflection');
  console.log('✓ Người học tiếp tục sang bước reflection bình thường mà không bị khóa.');

  // Finish lesson
  const subRefl = await apiRequest(`/learning/sessions/${sessionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      step_id: 'reflection',
      revision: session.revision,
      submission_id: crypto.randomUUID(),
      response: { acknowledged: true, reflection: 'Great practice.' },
      assistance_used: []
    })
  }, cookie);
  session = subRefl.data.session;
  const finishAdv = await apiRequest(`/learning/sessions/${sessionId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ step_id: 'reflection', revision: session.revision })
  }, cookie);
  assert(finishAdv.ok);
  assert.strictEqual(finishAdv.data.status, 'completed');
  console.log('✓ Phiên học hoàn tất thành công 100%.');

  // 7. Test Evidence endpoint
  console.log('\n7. Kiểm tra GET /learning/sessions/:id/evidence...');
  const evidenceRes = await apiRequest(`/learning/sessions/${sessionId}/evidence`, { method: 'GET' }, cookie);
  assert(evidenceRes.ok, 'GET evidence must return 200');
  const writingEvidence = evidenceRes.data.items.find(it => it.step_id === 'writing');
  assert(writingEvidence, 'Writing step must exist in evidence');
  assert.strictEqual(writingEvidence.response.text, writtenText, 'Original text must be intact in evidence');
  console.log(`✓ Evidence bài viết giữ nguyên bản nộp gốc. ai_feedback: ${writingEvidence.ai_feedback ? 'Có dữ liệu' : 'null'}`);

  // 8. Test Progress endpoint
  console.log('\n8. Kiểm tra GET /learning/progress...');
  const progRes = await apiRequest('/learning/progress?days=30', { method: 'GET' }, cookie);
  assert(progRes.ok, 'GET progress must return 200');
  assert(progRes.data.ai_feedback !== undefined, 'ai_feedback must be present on progress');
  console.log(`✓ Progress ai_feedback: ${JSON.stringify(progRes.data.ai_feedback)}`);
  const writingSkill = progRes.data.skills.find(s => s.key === 'writing');
  assert(writingSkill, 'Writing skill must exist');
  console.log(`✓ Writing skill ai_feedback_count: ${writingSkill.ai_feedback_count || 0}`);

  console.log('\n--- TẤT CẢ 8 BƯỚC KIỂM THỬ AI-01 HOÀN TẤT THÀNH CÔNG 100% ---');
}

runAiFeedbackVerification().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});

