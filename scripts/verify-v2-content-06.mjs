import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const BASE = 'http://127.0.0.1:4000/api/v1';

async function run() {
  console.log('--- KIỂM THỬ FE / BE: 3 BÀI NỀN TẢNG MỚI (CONTENT-06) ---');
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

  // 1. Đăng ký tài khoản kiểm thử
  const email = `content06.tester.${Date.now()}@example.com`;
  const regRes = await request('POST', '/auth/register', {
    name: 'Content 06 Tester',
    email,
    password: 'Password123!',
  });
  assert.equal(regRes.status, 201, 'User registration must succeed');
  console.log('✓ 1. Đăng ký tài khoản kiểm thử thành công');

  // 2. Lấy chi tiết chương trình english-foundation
  const foundProgRes = await request('GET', '/learning/programs/english-foundation');
  assert.equal(foundProgRes.status, 200);
  const foundProg = foundProgRes.data;
  console.log(`✓ 2. Chương trình Nền tảng: "${foundProg.title}" (version ${foundProg.version}, ${foundProg.lesson_count} mục học)`);
  assert(foundProg.lesson_count >= 16, `english-foundation phải có ít nhất 16 bài học, hiện có ${foundProg.lesson_count}`);

  const expectedLessons = [
    'foundation-quantities-01',
    'foundation-frequency-01',
    'foundation-clarification-01'
  ];

  const actualLessons = [];
  foundProg.units.forEach(u => u.lessons.forEach(l => actualLessons.push(l.id)));
  expectedLessons.forEach(id => {
    assert(actualLessons.includes(id), `Bài ${id} phải có trong english-foundation`);
  });
  console.log('✓ 3. Xác nhận đầy đủ 3 bài CONTENT-06 trong lộ trình Nền tảng:', expectedLessons.join(', '));

  // 3. Kiểm tra Thư viện nghe (/learning/listening)
  console.log('\n--- Kiểm tra Thư viện nghe (/learning/listening) ---');
  const catalogRes = await request('GET', '/learning/listening');
  assert.equal(catalogRes.status, 200);
  assert.equal(catalogRes.data.items.length, 20, 'Catalog phải có tổng cộng 20 bài học');
  console.log(`✓ Danh mục luyện nghe có đầy đủ 20 học liệu.`);

  for (const lessonId of expectedLessons) {
    const trackRes = await request('GET', `/learning/listening/${lessonId}`);
    assert.equal(trackRes.status, 200, `Track ${lessonId} must be available`);
    const track = trackRes.data;
    assert.equal(track.program_id, 'english-foundation');
    assert(track.sentence_count > 0, `${lessonId} must have sentences`);
    console.log(`✓ Học liệu nghe "${track.title}": ${track.sentence_count} câu WAV riêng, giọng: ${track.voice}`);

    // Kiểm tra Range 206 WAV audio
    const firstSentence = track.sentences[0];
    const clipPath = firstSentence.audio_url.replace(/^\/api\/v1/, '');
    const clipRes = await request('GET', clipPath, null, { Range: 'bytes=0-1023' });
    assert.equal(clipRes.status, 206, 'Sentence audio must support HTTP 206 Range');
  }

  // 4. Luyện tập xuyên suốt 8 bước cho từng bài mới
  console.log('\n--- Kiểm thử chạy xuyên suốt 8 bước của 3 bài CONTENT-06 mới ---');
  let mistakesRecorded = 0;

  for (const lessonId of expectedLessons) {
    console.log(`\nBắt đầu học bài: ${lessonId}`);
    const startRes = await request('POST', '/learning/sessions', { lesson_id: lessonId, resume: false });
    assert.equal(startRes.status, 201, `Khởi tạo phiên ${lessonId} thành công`);
    let session = startRes.data;
    assert.equal(session.total_steps, 8, `Bài ${lessonId} phải có 8 bước`);

    // Chạy qua tất cả các bước
    while (session.status !== 'completed' && session.current) {
      const step = session.current;
      const stepId = step.id;
      const stepType = step.type;

      // Chuẩn bị payload nộp bài
      let responsePayload = {};
      if (step.response_schema === 'choice') {
        // Cố tình trả lời sai ở bài đầu tiên tại bước grammar_practice để kiểm tra Sổ lỗi
        if (lessonId === 'foundation-quantities-01' && stepType === 'grammar_practice' && mistakesRecorded === 0) {
          // Chọn đáp án sai có chủ đích
          const wrongOpt = step.options.find(o => o.id === 'wrong' || o.id.includes('wrong') || o.id === 'are') || step.options[step.options.length - 1];
          responsePayload = { option_id: wrongOpt.id };
        } else {
          const optionId = step.options && step.options.length > 0 ? step.options[0].id : 'opt1';
          responsePayload = { option_id: optionId };
        }
      } else if (step.response_schema === 'text') {
        responsePayload = {
          text: `Learner submitted response for ${stepId} in ${lessonId}. Daily communication practice text.`,
          self_reviewed: true
        };
      } else if (step.response_schema === 'self_reflection') {
        responsePayload = {
          acknowledged: true,
          reflection: 'Remembering quantities, habits, and polite clarification.'
        };
      } else {
        responsePayload = {
          acknowledged: true
        };
      }

      // Nộp bước học
      const subRes = await request('POST', `/learning/sessions/${session.id}/submit`, {
        step_id: stepId,
        submission_id: randomUUID(),
        revision: session.revision,
        response: responsePayload
      });
      assert.equal(subRes.status, 200, `Submit step ${stepId} (${stepType}) failed`);
      
      // Kiểm tra nếu có lỗi sai được ghi nhận vào Sổ lỗi
      if (subRes.data.feedback && subRes.data.feedback.mistake_id) {
        mistakesRecorded++;
        console.log(`  -> Câu sai được tự động ghi nhận vào Sổ lỗi: mistake_id = ${subRes.data.feedback.mistake_id}`);
      }

      session = subRes.data.session;

      // Chuyển tiếp bước tiếp theo
      const advRes = await request('POST', `/learning/sessions/${session.id}/advance`, {
        step_id: stepId,
        revision: session.revision
      });
      assert.equal(advRes.status, 200, `Advance step ${stepId} failed`);
      session = advRes.data;
    }

    assert.equal(session.status, 'completed', `Phiên ${lessonId} phải đạt status 'completed'`);
    console.log(`✓ Hoàn tất bài ${lessonId} thành công! (Kết quả: ${session.summary.graded_correct}/${session.summary.graded_total} câu đúng, ${session.summary.open_tasks} bài tự luyện)`);

    // Kiểm tra xem bằng chứng bài nộp giữ nguyên bản gốc
    const evidenceRes = await request('GET', `/learning/sessions/${session.id}/evidence`);
    assert.equal(evidenceRes.status, 200);
    assert(evidenceRes.data.items.length === 8, 'Evidence phải lưu đủ 8 bước');
  }

  // 5. Kiểm tra Sổ lỗi (/learning/mistakes)
  console.log('\n--- Kiểm tra Sổ lỗi (/learning/mistakes) ---');
  const mistakesRes = await request('GET', '/learning/mistakes');
  assert.equal(mistakesRes.status, 200);
  assert(mistakesRes.data.items.length >= 1, 'Sổ lỗi phải ghi nhận ít nhất 1 câu sai');
  console.log(`✓ Sổ lỗi ghi nhận thành công ${mistakesRes.data.items.length} mục cần ôn tập.`);

  // 6. Kiểm tra lại tiến độ /progress
  console.log('\n--- Kiểm tra số liệu tiến độ (/learning/progress) ---');
  const progRes = await request('GET', '/learning/progress?days=7');
  assert.equal(progRes.status, 200);
  const prog = progRes.data;
  console.log(`✓ Đã hoàn tất: ${prog.lifetime.completed_sessions} phiên học, ${prog.lifetime.unique_lessons_completed} bài học riêng biệt.`);
  assert(prog.lifetime.completed_sessions >= 3, 'Ít nhất 3 phiên học đã được hoàn thành');

  const foundProgStat = prog.programs.find(p => p.id === 'english-foundation');
  assert.ok(foundProgStat, 'english-foundation must be tracked in programs progress');
  assert.equal(foundProgStat.completed_lessons, 3, 'english-foundation must have 3 completed lessons in this test');
  console.log(`✓ Số bài Nền tảng hoàn thành ghi nhận chính xác: ${foundProgStat.completed_lessons}/${foundProgStat.published_lessons}`);

  console.log('\n======================================================');
  console.log('🎉 TOÀN BỘ KIỂM THỬ 3 BÀI CONTENT-06 ĐÃ HOÀN TẤT THÀNH CÔNG 100%!');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('❌ Kiểm thử thất bại:', err);
  process.exit(1);
});

