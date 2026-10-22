// scripts/verify-v2-listening-flow.mjs
// Verifies LISTEN-01 / FE-LISTEN / UPGRADE-V2-LISTENING.md
import assert from 'node:assert';
import crypto from 'node:crypto';

const API_BASE = 'http://127.0.0.1:4000/api/v1';

async function registerTestUser(prefix = 'listen') {
  const email = `${prefix}.${Date.now()}@example.com`;
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'OpenQuiz' },
    body: JSON.stringify({ email, password: 'Password123!', name: 'Listening Practice Tester' })
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

async function runListeningVerification() {
  console.log('--- BẮT ĐẦU KIỂM THỬ FE-LISTEN / LISTEN-01: LUYỆN NGHE & SHADOWING ---');

  const { cookie } = await registerTestUser('listening.user');

  // 1. GET /learning/listening catalog
  console.log('\n1. Kiểm tra GET /learning/listening (Danh mục học liệu nghe)...');
  const catalogRes = await apiRequest('/learning/listening', { method: 'GET' }, cookie);
  assert(catalogRes.ok, 'Failed to fetch listening catalog');
  assert(Array.isArray(catalogRes.data.items), 'Catalog must contain items array');
  assert(catalogRes.data.items.length >= 9, `Catalog items should be at least 9, got ${catalogRes.data.items.length}`);
  console.log(`✓ Danh mục có ${catalogRes.data.items.length} học liệu khả dụng.`);
  
  const sampleLesson = catalogRes.data.items.find(i => i.lesson_id === 'foundation-introductions-01');
  assert(sampleLesson, 'Lesson foundation-introductions-01 must be present');
  assert.strictEqual(sampleLesson.sentence_practice_available, true, 'Practice must be available');
  assert(sampleLesson.sentence_count > 0, 'Sentence count must be > 0');
  console.log(`✓ Lesson '${sampleLesson.lesson_id}': ${sampleLesson.sentence_count} câu, audio: ${sampleLesson.full_audio_url}`);

  // 2. GET /learning/listening/:lesson_id track detail
  console.log('\n2. Kiểm tra GET /learning/listening/:lesson_id (Chi tiết bài nghe & từng câu)...');
  const trackRes = await apiRequest(`/learning/listening/${sampleLesson.lesson_id}`, { method: 'GET' }, cookie);
  assert(trackRes.ok, 'Failed to fetch listening track');
  const track = trackRes.data;
  assert.strictEqual(track.sentence_source, 'separately_synthesized_sentence');
  assert.strictEqual(track.aligned_to_full_audio, false);
  assert(Array.isArray(track.sentences) && track.sentences.length === track.sentence_count);
  assert(track.guidance && track.guidance.length > 0);
  console.log(`✓ Track có ${track.sentences.length} câu WAV riêng, thời lượng duration_ms thật.`);
  const firstSentence = track.sentences[0];
  console.log(`- Câu 1 [${firstSentence.id}]: "${firstSentence.text}" (${firstSentence.duration_ms}ms)`);

  // 3. Audio streaming Range / 206 test
  console.log('\n3. Kiểm tra streaming audio WAV (hỗ trợ HTTP 206 / Range)...');
  const audioUrl = `${API_BASE}/learning/listening/media/${sampleLesson.lesson_id}/${track.content_version}/${firstSentence.id}`;
  const audioRes = await fetch(audioUrl, {
    headers: {
      'Cookie': cookie,
      'Range': 'bytes=0-1023'
    }
  });
  assert(audioRes.status === 206 || audioRes.status === 200, `Audio request failed with status: ${audioRes.status}`);
  const audioBlob = await audioRes.arrayBuffer();
  assert(audioBlob.byteLength > 0, 'Audio response must not be empty');
  console.log(`✓ Lấy audio WAV thành công, status: ${audioRes.status}, nhận ${audioBlob.byteLength} bytes.`);

  // 4. Start listening session
  console.log('\n4. Khởi tạo phiên luyện nghe (POST /learning/listening/sessions)...');
  const startSessionRes = await apiRequest('/learning/listening/sessions', {
    method: 'POST',
    body: JSON.stringify({
      lesson_id: sampleLesson.lesson_id,
      resume: true,
      settings: {
        mode: 'listen_repeat',
        rate: 0.9,
        target_repetitions: 2
      }
    })
  }, cookie);
  assert(startSessionRes.ok, `Failed to start session: ${JSON.stringify(startSessionRes.error)}`);
  let session = startSessionRes.data;
  assert(session.id, 'Session must have id');
  assert.strictEqual(session.status, 'active');
  assert.strictEqual(session.cursor, 0);
  assert.strictEqual(session.settings.mode, 'listen_repeat');
  assert.strictEqual(session.settings.rate, 0.9);
  assert.strictEqual(session.settings.target_repetitions, 2);
  assert(session.current, 'Must have current sentence');
  assert.strictEqual(session.current.id, firstSentence.id);
  console.log(`✓ Tạo phiên ${session.id}: cursor=0, revision=${session.revision}, câu: "${session.current.text}"`);

  // 5. Complete sentence 1 with repetitions and self-review
  console.log('\n5. Nộp câu 1 với 2 lượt lặp và tự đánh giá...');
  const subId1 = crypto.randomUUID();
  const comp1Res = await apiRequest(`/learning/listening/sessions/${session.id}/sentences/${firstSentence.id}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      revision: session.revision,
      submission_id: subId1,
      repetitions: 2,
      self_reviewed: true,
      reflection: 'Phát âm chuẩn âm cuối.'
    })
  }, cookie);
  assert(comp1Res.ok, `Complete sentence 1 failed: ${JSON.stringify(comp1Res.error)}`);
  session = comp1Res.data.session;
  assert.strictEqual(session.cursor, 1);
  assert.strictEqual(session.results[firstSentence.id].repetitions, 2);
  assert.strictEqual(session.results[firstSentence.id].assessment, 'self_reported');
  assert.strictEqual(session.results[firstSentence.id].pronunciation_assessed, false);
  assert.strictEqual(session.results[firstSentence.id].skipped, false);
  console.log(`✓ Câu 1 nộp thành công! Revision mới: ${session.revision}, Cursor tiến tới: ${session.cursor}`);

  // 5b. Test Idempotency with same submission_id
  console.log('\n5b. Kiểm tra tính Idempotent khi gửi lại cùng submission_id...');
  const replayRes = await apiRequest(`/learning/listening/sessions/${session.id}/sentences/${firstSentence.id}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      revision: session.revision,
      submission_id: subId1,
      repetitions: 2,
      self_reviewed: true,
      reflection: 'Phát âm chuẩn âm cuối.'
    })
  }, cookie);
  assert(replayRes.ok, 'Replay should return 200');
  assert.strictEqual(replayRes.data.replayed, true, 'Should indicate replayed: true');
  console.log('✓ Idempotency hoạt động: replayed = true, không nhân đôi kết quả.');

  // 6. Test skipping sentence 2
  console.log('\n6. Bỏ qua câu 2 (Skip sentence)...');
  const secondSentence = session.current;
  assert(secondSentence, 'Second sentence must exist');
  const subId2 = crypto.randomUUID();
  const skipRes = await apiRequest(`/learning/listening/sessions/${session.id}/sentences/${secondSentence.id}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      revision: session.revision,
      submission_id: subId2,
      skip: true
    })
  }, cookie);
  assert(skipRes.ok, `Skip failed: ${JSON.stringify(skipRes.error)}`);
  session = skipRes.data.session;
  assert.strictEqual(session.results[secondSentence.id].skipped, true);
  assert.strictEqual(session.results[secondSentence.id].repetitions, 0);
  console.log(`✓ Câu 2 bỏ qua thành công! Cursor tiến tới: ${session.cursor}`);

  // 7. Complete the rest of the sentences to finish the session
  console.log('\n7. Hoàn tất các câu còn lại để kết thúc phiên...');
  while (session.status === 'active' && session.current) {
    const cur = session.current;
    const subId = crypto.randomUUID();
    const compRes = await apiRequest(`/learning/listening/sessions/${session.id}/sentences/${cur.id}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        revision: session.revision,
        submission_id: subId,
        repetitions: 2,
        self_reviewed: true
      })
    }, cookie);
    assert(compRes.ok, `Complete failed on sentence ${cur.id}: ${JSON.stringify(compRes.error)}`);
    session = compRes.data.session;
  }
  assert.strictEqual(session.status, 'completed', 'Session status must be completed');
  assert.strictEqual(session.current, null, 'Current must be null upon completion');
  assert(session.summary, 'Summary must exist');
  assert.strictEqual(session.summary.skipped_sentences, 1, 'Exactly 1 sentence was skipped');
  assert(session.summary.practised_sentences > 0, 'Practised sentences must be > 0');
  assert(session.summary.repetitions_self_reported > 0, 'Repetitions must be > 0');
  assert.strictEqual(session.summary.mastered, false, 'Mastered must be false');
  assert.strictEqual(session.summary.pronunciation_assessed, false, 'Pronunciation assessed must be false');
  console.log(`✓ Phiên hoàn tất! Tổng kết:`);
  console.log(`  - Đã luyện: ${session.summary.practised_sentences} câu`);
  console.log(`  - Bỏ qua: ${session.summary.skipped_sentences} câu`);
  console.log(`  - Lượt tự nhắc lại: ${session.summary.repetitions_self_reported} lượt`);
  console.log(`  - Tự đánh giá: mastered=${session.summary.mastered}, pronunciation_assessed=${session.summary.pronunciation_assessed}`);

  // 8. Verify GET /learning/progress reflects listening_practice
  console.log('\n8. Kiểm tra GET /learning/progress hiển thị listening_practice...');
  const progressRes = await apiRequest('/learning/progress', { method: 'GET' }, cookie);
  assert(progressRes.ok, 'Failed to fetch progress');
  const lp = progressRes.data.listening_practice;
  assert(lp, 'listening_practice object must be present in progress');
  assert.strictEqual(lp.completed_sessions, 1, 'Completed sessions should be 1');
  assert.strictEqual(lp.practised_sentences, session.summary.practised_sentences);
  assert.strictEqual(lp.skipped_sentences, session.summary.skipped_sentences);
  assert.strictEqual(lp.repetitions_self_reported, session.summary.repetitions_self_reported);
  assert.strictEqual(lp.assessment, 'self_reported');
  assert.strictEqual(lp.listening_accuracy, null);
  assert.strictEqual(lp.pronunciation_score, null);
  console.log(`✓ Tiến bộ ghi nhận chính xác: ${lp.practised_sentences} câu, ${lp.repetitions_self_reported} lượt nhắc lại, ${lp.completed_sessions} phiên hoàn tất.`);

  // 9. Verify GET /learning/listening/sessions (Lịch sử phiên nghe)
  console.log('\n9. Kiểm tra GET /learning/listening/sessions (Lịch sử các phiên nghe)...');
  const sessionsRes = await apiRequest('/learning/listening/sessions', { method: 'GET' }, cookie);
  assert(sessionsRes.ok, 'Failed to get sessions');
  assert(sessionsRes.data.items.length >= 1, 'Should have at least 1 session');
  const histItem = sessionsRes.data.items[0];
  assert.strictEqual(histItem.id, session.id);
  assert.strictEqual(histItem.status, 'completed');
  console.log(`✓ Lịch sử phiên ghi nhận đúng phiên ${histItem.id} trạng thái '${histItem.status}'.`);

  console.log('\n=============================================================');
  console.log('🎉 TOÀN BỘ 9/9 KIỂM THỬ FE-LISTEN / LISTEN-01 ĐÃ HOÀN TẤT VÀ ĐẠT!');
  console.log('=============================================================');
}

runListeningVerification().catch((err) => {
  console.error('❌ Kiểm thử thất bại:', err);
  process.exit(1);
});
