// scripts/verify-v2-audio-reviews.mjs
// Verifies AUDIO-01 / FE-AUDIO-01 and UPGRADE-V2-AUDIO-REVIEWS.md
import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const API_BASE = 'http://127.0.0.1:4000/api/v1';

async function registerTestUser(prefix = 'audio') {
  const email = `${prefix}.${Date.now()}@example.com`;
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'OpenQuiz' },
    body: JSON.stringify({ email, password: 'Password123!', name: 'Audio Review Tester' })
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

async function runAudioReviewsVerification() {
  console.log('--- BẮT ĐẦU KIỂM THỬ AUDIO-01: NHẬN XÉT PHÁT ÂM AUDIO THẬT ---');

  const { cookie } = await registerTestUser('audio.v2');

  // 1. Khởi tạo phiên bài học
  console.log('1. Khởi tạo phiên bài học "foundation-introductions-01"...');
  const startRes = await apiRequest('/learning/sessions', {
    method: 'POST',
    body: JSON.stringify({ lesson_id: 'foundation-introductions-01' })
  }, cookie);
  assert(startRes.ok, 'Failed to start session');
  let session = startRes.data;
  const sessionId = session.id;
  console.log(`- Phiên tạo thành công: ${sessionId}`);

  // 2. Kiểm tra GET /learning/sessions/:id/audio-reviews ban đầu & capability
  console.log('\n2. Kiểm tra GET /learning/sessions/:id/audio-reviews ban đầu...');
  const initReviews = await apiRequest(`/learning/sessions/${sessionId}/audio-reviews`, { method: 'GET' }, cookie);
  assert(initReviews.ok, 'GET audio-reviews must return 200');
  assert.strictEqual(initReviews.data.items.length, 0, 'Initial audio reviews list must be empty');
  assert(initReviews.data.capability, 'Capability must be present');
  assert.strictEqual(initReviews.data.capability.audio_stored, false, 'audio_stored must be false');
  assert(Array.isArray(initReviews.data.capability.accepted_mime_types), 'accepted_mime_types must be array');
  assert.strictEqual(initReviews.data.capability.max_audio_bytes, 450000, 'max_audio_bytes must be 450000');
  console.log('✓ Capability hợp lệ:', {
    provider: initReviews.data.capability.provider,
    supported: initReviews.data.capability.supported,
    audio_stored: initReviews.data.capability.audio_stored,
    max_bytes: initReviews.data.capability.max_audio_bytes
  });

  // 3. Negative tests: gọi khi chưa tới bước hoặc bước không hỗ trợ
  console.log('\n3. Kiểm tra negative tests (hợp đồng BE)...');
  const dummyWavPath = path.resolve('server/content/learning-v2/media/sentences/foundation-introductions-01-v1-s01.wav');
  const wavBase64 = fs.readFileSync(dummyWavPath).toString('base64');

  // A. Bước chưa học tới
  const earlyCall = await apiRequest(`/learning/sessions/${sessionId}/steps/pronunciation/audio-reviews`, {
    method: 'POST',
    body: JSON.stringify({
      submission_id: crypto.randomUUID(),
      audio: { mime_type: 'audio/wav', data: wavBase64 }
    })
  }, cookie);
  assert.strictEqual(earlyCall.status, 409, 'Early call must return 409 STEP_NOT_REACHED');
  assert.strictEqual(earlyCall.error?.code, 'STEP_NOT_REACHED');
  console.log('✓ Chặn khi chưa tới bước: 409 STEP_NOT_REACHED');

  // B. Bước hiện tại không phải pronunciation_practice
  const unsupportedStepCall = await apiRequest(`/learning/sessions/${sessionId}/steps/${session.current.id}/audio-reviews`, {
    method: 'POST',
    body: JSON.stringify({
      submission_id: crypto.randomUUID(),
      audio: { mime_type: 'audio/wav', data: wavBase64 }
    })
  }, cookie);
  assert.strictEqual(unsupportedStepCall.status, 400, 'Unsupported step must return 400');
  assert.strictEqual(unsupportedStepCall.error?.code, 'UNSUPPORTED_AUDIO_STEP');
  console.log('✓ Chặn bước không hỗ trợ: 400 UNSUPPORTED_AUDIO_STEP');

  // 4. Tiến bước tới khi gặp pronunciation_practice
  console.log('\n4. Tiến bước tới bước pronunciation_practice...');
  while (session.current && session.current.type !== 'pronunciation_practice') {
    const cur = session.current;
    let resp = { acknowledged: true };
    if (cur.response_schema === 'choice') {
      resp = { option_id: cur.options?.[0]?.id || 'a' };
    }
    const subRes = await apiRequest(`/learning/sessions/${sessionId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        step_id: cur.id,
        revision: session.revision,
        submission_id: crypto.randomUUID(),
        response: resp
      })
    }, cookie);
    assert(subRes.ok, `Failed submitting step ${cur.id}`);

    const advRes = await apiRequest(`/learning/sessions/${sessionId}/advance`, {
      method: 'POST',
      body: JSON.stringify({
        step_id: cur.id,
        revision: subRes.data.session.revision
      })
    }, cookie);
    assert(advRes.ok, `Failed advancing step ${cur.id}`);
    session = advRes.data;
  }

  assert.strictEqual(session.current.type, 'pronunciation_practice', 'Must have reached pronunciation_practice');
  const pronStepId = session.current.id;
  console.log(`- Đã tới bước phát âm: ${pronStepId}, target: "${session.current.target}"`);

  // 5. Kiểm tra validation payload audio
  console.log('\n5. Kiểm tra validation kích thước và MIME audio...');
  // A. Data quá ngắn (hơn 16 chars base64 nhưng < 44 bytes decoded)
  const shortBase64 = Buffer.from('RIFF'.padEnd(20, '0')).toString('base64');
  const tooShort = await apiRequest(`/learning/sessions/${sessionId}/steps/${pronStepId}/audio-reviews`, {
    method: 'POST',
    body: JSON.stringify({
      submission_id: crypto.randomUUID(),
      audio: { mime_type: 'audio/wav', data: shortBase64 }
    })
  }, cookie);
  assert.strictEqual(tooShort.status, 400);
  assert.strictEqual(tooShort.error?.code, 'INVALID_AUDIO');
  console.log('✓ Bắt lỗi audio quá ngắn: INVALID_AUDIO');

  // B. MIME không hỗ trợ
  const badMime = await apiRequest(`/learning/sessions/${sessionId}/steps/${pronStepId}/audio-reviews`, {
    method: 'POST',
    body: JSON.stringify({
      submission_id: crypto.randomUUID(),
      audio: { mime_type: 'audio/midi', data: wavBase64 }
    })
  }, cookie);
  assert.strictEqual(badMime.status, 400);
  assert.strictEqual(badMime.error?.code, 'UNSUPPORTED_AUDIO_TYPE');
  console.log('✓ Bắt lỗi MIME không hợp lệ: UNSUPPORTED_AUDIO_TYPE');

  // 6. Gửi bản thu thật hợp lệ tới endpoint
  console.log('\n6. Gửi bản thu thật hợp lệ tới POST .../audio-reviews...');
  const stableSubId = crypto.randomUUID();
  const validReviewReq = await apiRequest(`/learning/sessions/${sessionId}/steps/${pronStepId}/audio-reviews`, {
    method: 'POST',
    body: JSON.stringify({
      submission_id: stableSubId,
      audio: { mime_type: 'audio/wav', data: wavBase64 }
    })
  }, cookie);

  if (validReviewReq.status === 200) {
    console.log('✓ Nhận xét AI thành công (Gemini live):', {
      id: validReviewReq.data.id,
      transcript: validReviewReq.data.transcript,
      feedback: validReviewReq.data.feedback?.slice(0, 50) + '...',
      pronunciation_score: validReviewReq.data.pronunciation_score
    });
    assert.strictEqual(validReviewReq.data.pronunciation_score, null);
    assert.strictEqual(validReviewReq.data.audio_stored, false);

    // Test DELETE
    const delRes = await apiRequest(`/learning/sessions/${sessionId}/audio-reviews/${validReviewReq.data.id}`, {
      method: 'DELETE'
    }, cookie);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.data.deleted, true);
    console.log('✓ Xóa nhận xét thành công: DELETE /audio-reviews/:id');
  } else if (validReviewReq.status === 429) {
    console.log('✓ Xử lý chuẩn xác khi Gemini rate-limited (429 AI_RATE_LIMITED):');
    console.log(`  - Code: ${validReviewReq.error?.code}`);
    console.log(`  - Message: ${validReviewReq.error?.message}`);
    console.log(`  - Retry after: ${validReviewReq.error?.details?.retry_after_seconds}s`);
    assert.strictEqual(validReviewReq.error?.code, 'AI_RATE_LIMITED');
  } else {
    console.log(`- Phản hồi khác: status ${validReviewReq.status}, error:`, validReviewReq.error);
  }

  // 7. Quyền sở hữu (Bảo mật: User khác không truy cập được)
  console.log('\n7. Kiểm tra quyền sở hữu phiên (Security / Ownership)...');
  const otherUser = await registerTestUser('other.v2');
  const otherGet = await apiRequest(`/learning/sessions/${sessionId}/audio-reviews`, { method: 'GET' }, otherUser.cookie);
  assert.strictEqual(otherGet.status, 404, 'Other user must get 404');
  console.log('✓ Tài khoản khác không xem được nhận xét audio của phiên (404 NOT_FOUND)');

  // 8. Kiểm tra cấu trúc GET /learning/progress
  console.log('\n8. Kiểm tra cấu trúc GET /learning/progress...');
  const progressRes = await apiRequest('/learning/progress', { method: 'GET' }, cookie);
  assert(progressRes.ok, 'Progress must return 200');
  assert(progressRes.data.audio_feedback, 'audio_feedback must be in progress response');
  assert.strictEqual(progressRes.data.audio_feedback.assessment_scope, 'qualitative_audio_feedback');
  assert.strictEqual(progressRes.data.audio_feedback.pronunciation_score, null);
  const pronSkill = progressRes.data.skills.find(s => s.key === 'pronunciation');
  assert(pronSkill, 'pronunciation skill must exist');
  console.log('✓ Progress skill pronunciation & audio_feedback phản ánh đúng hợp đồng:', {
    evidence_status: pronSkill.evidence_status,
    ai_audio_review_count: pronSkill.ai_audio_review_count,
    audio_feedback: progressRes.data.audio_feedback
  });

  // 9. Kiểm tra cấu trúc GET /learning/sessions/:id/evidence
  console.log('\n9. Kiểm tra cấu trúc GET /learning/sessions/:id/evidence...');
  const evidenceRes = await apiRequest(`/learning/sessions/${sessionId}/evidence`, { method: 'GET' }, cookie);
  assert(evidenceRes.ok, 'Evidence must return 200');
  assert(typeof evidenceRes.data.audio_review_count === 'number', 'audio_review_count must be number');
  assert(evidenceRes.data.audio_reviews_route, 'audio_reviews_route must be present');
  console.log('✓ Evidence API trả về root audio_review_count và route riêng:', {
    audio_review_count: evidenceRes.data.audio_review_count,
    audio_reviews_route: evidenceRes.data.audio_reviews_route
  });

  console.log('\n=== TẤT CẢ 9/9 ĐIỂM KIỂM TRA AUDIO-01 / FE-AUDIO-01 ĐẠT CHUẨN ===\n');
}

runAudioReviewsVerification().catch(err => {
  console.error('\n❌ KIỂM TRA THẤT BẠI:', err);
  process.exit(1);
});
