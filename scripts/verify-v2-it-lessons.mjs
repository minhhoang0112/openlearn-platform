import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const BASE = 'http://127.0.0.1:4000/api/v1';

async function run() {
  console.log('--- KIỂM THỬ FE / BE: 3 BÀI MỞ RỘNG IT/SYSTEM (CONTENT-05) ---');
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
  const email = `it.specialist.${Date.now()}@example.com`;
  const regRes = await request('POST', '/auth/register', {
    name: 'IT Specialist User',
    email,
    password: 'Password123!',
  });
  assert.equal(regRes.status, 201, 'User registration must succeed');
  console.log('✓ 1. Đăng ký tài khoản kiểm thử thành công');

  // 2. Lấy chi tiết chương trình english-it-system
  const itProgRes = await request('GET', '/learning/programs/english-it-system');
  assert.equal(itProgRes.status, 200);
  const itProg = itProgRes.data;
  console.log(`✓ 2. Lấy thông tin chương trình: "${itProg.title}" (version ${itProg.version}, ${itProg.lesson_count} bài học)`);
  assert.equal(itProg.lesson_count, 4, 'Chương trình english-it-system phải có 4 bài học');

  const expectedLessons = [
    'system-introductions-01',
    'system-files-01',
    'system-service-status-01',
    'system-incident-handoff-01'
  ];

  const actualLessons = [];
  itProg.units.forEach(u => u.lessons.forEach(l => actualLessons.push(l.id)));
  expectedLessons.forEach(id => {
    assert(actualLessons.includes(id), `Lesson ${id} must be in english-it-system`);
  });
  console.log('✓ 3. Xác nhận đầy đủ 4 bài IT/System trong chương trình:', actualLessons.join(', '));

  // 3. Kiểm tra chi tiết 3 bài mới trong thư viện nghe
  console.log('\n--- Kiểm tra 3 bài mới trong Thư viện nghe (/learning/listening) ---');
  const catalogRes = await request('GET', '/learning/listening');
  assert.equal(catalogRes.status, 200);
  assert.equal(catalogRes.data.items.length, 17, 'Catalog phải có tổng cộng 17 bài học');

  for (const lessonId of ['system-files-01', 'system-service-status-01', 'system-incident-handoff-01']) {
    const trackRes = await request('GET', `/learning/listening/${lessonId}`);
    assert.equal(trackRes.status, 200, `Track ${lessonId} must be available`);
    const track = trackRes.data;
    assert.equal(track.program_id, 'english-it-system');
    assert(track.sentence_count > 0, `${lessonId} must have sentences`);
    assert(track.sentences.length > 0, `${lessonId} sentences list must not be empty`);
    console.log(`✓ Học liệu nghe "${track.title}": ${track.sentence_count} câu WAV riêng, giọng: ${track.voice}`);

    // Kiểm tra clip câu đầu tiên
    const firstSentence = track.sentences[0];
    const clipPath = firstSentence.audio_url.replace(/^\/api\/v1/, '');
    const clipRes = await request('GET', clipPath, null, { Range: 'bytes=0-1023' });
    assert.equal(clipRes.status, 206, 'Sentence audio must support HTTP 206 Range');
  }

  // 4. Luyện tập toàn bộ 8 bước của từng bài học mới
  console.log('\n--- Kiểm thử chạy xuyên suốt 8 bước của 3 bài IT/System mới ---');
  for (const lessonId of ['system-files-01', 'system-service-status-01', 'system-incident-handoff-01']) {
    console.log(`\nBắt đầu học bài: ${lessonId}`);
    const startRes = await request('POST', '/learning/sessions', { lesson_id: lessonId, resume: false });
    assert.equal(startRes.status, 201, `Khởi tạo phiên ${lessonId} thành công`);
    let session = startRes.data;
    assert.equal(session.total_steps, 8, `Bài ${lessonId} phải có 8 bước`);

    // Chạy qua tất cả các bước cho đến khi hoàn tất
    while (session.status !== 'completed' && session.current) {
      const step = session.current;
      const stepId = step.id;
      const stepType = step.type;

      // Chuẩn bị payload nộp bài
      let responsePayload = {};
      if (step.response_schema === 'choice') {
        const optionId = step.options && step.options.length > 0 ? step.options[0].id : 'opt1';
        responsePayload = { option_id: optionId };
      } else if (step.response_schema === 'text') {
        responsePayload = {
          text: `Learner submitted response for ${stepId} in ${lessonId}. Everything is running normally.`,
          self_reviewed: true
        };
      } else if (step.response_schema === 'self_reflection') {
        responsePayload = {
          acknowledged: true,
          reflection: 'Remembering key IT terminology.'
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
      if (subRes.status !== 200) {
        console.error('Error submitting step:', stepId, stepType, JSON.stringify(subRes));
      }
      assert.equal(subRes.status, 200, `Submit step ${stepId} (${stepType}) failed`);
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

  // 5. Kiểm tra lại tiến độ /progress
  console.log('\n--- Kiểm tra số liệu tiến độ (/learning/progress) ---');
  const progRes = await request('GET', '/learning/progress?days=7');
  assert.equal(progRes.status, 200);
  const prog = progRes.data;
  console.log(`✓ Đã hoàn tất: ${prog.lifetime.completed_sessions} phiên học, ${prog.lifetime.unique_lessons_completed} bài học riêng biệt.`);
  assert(prog.lifetime.completed_sessions >= 3, 'Ít nhất 3 phiên học đã được hoàn thành');

  const itProgStat = prog.programs.find(p => p.id === 'english-it-system');
  assert.ok(itProgStat, 'english-it-system must be tracked in programs progress');
  assert.equal(itProgStat.completed_lessons, 3, 'english-it-system must have 3 completed lessons');
  console.log(`✓ Độ bao phủ chương trình IT/System: ${itProgStat.completed_lessons}/${itProgStat.published_lessons} (${itProgStat.completion_percent}%)`);

  console.log('\n======================================================');
  console.log('🎉 TOÀN BỘ KIỂM THỬ 3 BÀI IT/SYSTEM MỚI ĐÃ HOÀN TẤT THÀNH CÔNG 100%!');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('❌ Kiểm thử thất bại:', err);
  process.exit(1);
});
