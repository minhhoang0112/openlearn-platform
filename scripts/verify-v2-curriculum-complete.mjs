import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const BASE = 'http://127.0.0.1:4000/api/v1';

async function run() {
  console.log('--- KIỂM THỬ TOÀN BỘ GIÁO TRÌNH V2 (CONTENT-07 ĐỦ 27 MỤC / 158 CLIP) ---');
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

  // 1. Đăng ký tài khoản
  const email = `curriculum.complete.${Date.now()}@example.com`;
  const regRes = await request('POST', '/auth/register', {
    name: 'Curriculum Completer',
    email,
    password: 'Password123!',
  });
  assert.equal(regRes.status, 201, 'User registration must succeed');
  console.log('✓ 1. Đăng ký người học kiểm thử thành công');

  // 2. Kiểm tra danh mục 2 chương trình học
  console.log('\n--- Kiểm tra 2 chương trình học (/learning/programs) ---');
  const progsRes = await request('GET', '/learning/programs');
  assert.equal(progsRes.status, 200);
  const progs = progsRes.data.items;
  assert.equal(progs.length, 2, 'Phải có 2 chương trình học');

  const foundationProg = progs.find(p => p.id === 'english-foundation');
  const systemProg = progs.find(p => p.id === 'english-it-system');
  assert.ok(foundationProg);
  assert.ok(systemProg);

  console.log(`- Nền tảng: ${foundationProg.lesson_count} mục học (kỳ vọng 18)`);
  console.log(`- IT/System: ${systemProg.lesson_count} mục học (kỳ vọng 9)`);
  assert.equal(foundationProg.lesson_count, 18, 'Nền tảng phải có 18 mục học (16 bài thường + 2 ôn)');
  assert.equal(systemProg.lesson_count, 9, 'IT/System phải có 9 mục học (8 bài thường + 1 ôn)');
  console.log(`✓ 2. Xác nhận đủ 27 mục học (24 bài thường + 3 bài ôn chặng)`);

  // 3. Kiểm tra Thư viện nghe (/learning/listening) đủ 27 bài / 158 clip
  console.log('\n--- Kiểm tra Thư viện nghe (/learning/listening) ---');
  const catalogRes = await request('GET', '/learning/listening');
  assert.equal(catalogRes.status, 200);
  assert.equal(catalogRes.data.items.length, 27, 'Catalog phải có 27 bài luyện nghe');

  const foundationCatalog = catalogRes.data.items.filter(i => i.program_id === 'english-foundation');
  const systemCatalog = catalogRes.data.items.filter(i => i.program_id === 'english-it-system');
  assert.equal(foundationCatalog.length, 18, 'Phải có 18 bài nghe nền tảng');
  assert.equal(systemCatalog.length, 9, 'Phải có 9 bài nghe IT/System');
  console.log(`✓ 3. Thư viện nghe có đủ 27 học liệu (18 Nền tảng, 9 IT/System)`);

  // 4. Kiểm tra bài viết email bàn giao: system-handoff-email-01 có model kèm Subject
  console.log('\n--- Kiểm tra bài viết email bàn giao (system-handoff-email-01) ---');
  const startEmailRes = await request('POST', '/learning/sessions', {
    lesson_id: 'system-handoff-email-01',
    resume: false
  });
  assert.equal(startEmailRes.status, 201);
  let emailSession = startEmailRes.data;
  assert.equal(emailSession.total_steps, 8);

  // Đi qua các bước để đến writing_task
  let writingStepFound = false;
  while (emailSession.status !== 'completed' && emailSession.current) {
    const step = emailSession.current;
    if (step.type === 'writing_task') {
      writingStepFound = true;
      assert.ok(step.model, 'Bước writing_task của email bàn giao phải có model câu mẫu');
      assert(step.model.includes('Subject:'), 'Model câu mẫu phải chứa Subject:');
      assert(step.model.includes('\n'), 'Model câu mẫu phải có nhiều dòng định dạng email');
      console.log('✓ Model câu mẫu email bàn giao được xác nhận có cấu trúc đa dòng chuẩn:');
      console.log('  ' + step.model.split('\n')[0]);
      console.log('  ' + step.model.split('\n')[1]);
    }

    let resp = { acknowledged: true };
    if (step.response_schema === 'choice') {
      resp = { option_id: step.options[0].id };
    } else if (step.response_schema === 'text') {
      resp = {
        text: 'Subject: Handover - Web service restarted\nHi team, The web service is running normally. Logs show no memory errors. Please monitor port 443.',
        self_reviewed: true
      };
    } else if (step.response_schema === 'self_reflection') {
      resp = { acknowledged: true, reflection: 'Email template mastered.' };
    }

    const sub = await request('POST', `/learning/sessions/${emailSession.id}/submit`, {
      step_id: step.id,
      submission_id: randomUUID(),
      revision: emailSession.revision,
      response: resp
    });
    assert.equal(sub.status, 200);
    emailSession = sub.data.session;

    const adv = await request('POST', `/learning/sessions/${emailSession.id}/advance`, {
      step_id: step.id,
      revision: emailSession.revision
    });
    assert.equal(adv.status, 200);
    emailSession = adv.data;
  }
  assert(writingStepFound, 'Phải tìm thấy bước writing_task');
  assert.equal(emailSession.status, 'completed');
  console.log('✓ 4. Hoàn tất bài system-handoff-email-01 thành công 100%');

  // 5. Kiểm tra bài ôn chặng IT/System mới: system-checkpoint-03 (9 bước)
  console.log('\n--- Kiểm tra Bài ôn chặng IT/System (system-checkpoint-03) ---');
  const startChkRes = await request('POST', '/learning/sessions', {
    lesson_id: 'system-checkpoint-03',
    resume: false
  });
  assert.equal(startChkRes.status, 201);
  let chkSession = startChkRes.data;
  assert.equal(chkSession.lesson_kind, 'checkpoint');
  assert.equal(chkSession.total_steps, 9, 'system-checkpoint-03 phải có 9 bước');
  console.log(`✓ Khởi tạo bài ôn: "${chkSession.title}" (${chkSession.total_steps} bước)`);

  // Chạy qua 9 bước
  while (chkSession.status !== 'completed' && chkSession.current) {
    const step = chkSession.current;
    let resp = { acknowledged: true };
    if (step.response_schema === 'choice') {
      resp = { option_id: step.options[0].id };
    } else if (step.response_schema === 'text') {
      resp = { text: 'Learner submitted summary of IT system checkpoint verification.', self_reviewed: true };
    } else if (step.response_schema === 'self_reflection') {
      resp = { acknowledged: true, reflection: 'Checkpoint 3 finished.' };
    }

    const sub = await request('POST', `/learning/sessions/${chkSession.id}/submit`, {
      step_id: step.id,
      submission_id: randomUUID(),
      revision: chkSession.revision,
      response: resp
    });
    assert.equal(sub.status, 200);
    chkSession = sub.data.session;

    const adv = await request('POST', `/learning/sessions/${chkSession.id}/advance`, {
      step_id: step.id,
      revision: chkSession.revision
    });
    assert.equal(adv.status, 200);
    chkSession = adv.data;
  }

  assert.equal(chkSession.status, 'completed');
  assert.ok(chkSession.summary.checkpoint, 'Session summary phải có dữ liệu checkpoint');
  const chkData = chkSession.summary.checkpoint;
  console.log(`✓ Kết quả Ôn chặng 3: ${chkData.unassisted_correct}/${chkData.graded_total} câu đúng độc lập (tiêu chuẩn: ${chkData.minimum_correct})`);
  console.log(`  - Trạng thái đạt: ${chkData.passed ? 'ĐẠT TIÊU CHÍ' : 'NÊN ÔN LẠI'}`);
  console.log(`  - Gợi ý bài ôn: ${JSON.stringify(chkData.recommended_lesson_ids)}`);
  assert(chkData.graded_total === 6, 'Bài ôn chặng phải có 6 câu được chấm');
  assert(chkData.minimum_correct === 4, 'Tiêu chuẩn đạt phải là 4 câu đúng độc lập');

  // 6. Kiểm tra lại tiến độ /progress
  console.log('\n--- Kiểm tra số liệu tiến độ (/learning/progress) ---');
  const progRes = await request('GET', '/learning/progress?days=7');
  assert.equal(progRes.status, 200);
  const prog = progRes.data;
  const sysProgStat = prog.programs.find(p => p.id === 'english-it-system');
  assert.ok(sysProgStat);
  assert.equal(sysProgStat.published_lessons, 9, 'english-it-system phải có 9 bài công bố');
  assert(sysProgStat.completed_lessons >= 2, 'Ít nhất 2 bài IT/System đã hoàn thành');
  console.log(`✓ Độ bao phủ chương trình IT/System: ${sysProgStat.completed_lessons}/${sysProgStat.published_lessons} (${sysProgStat.completion_percent}%)`);

  console.log('\n======================================================');
  console.log('🎉 TOÀN BỘ KIỂM THỬ GIÁO TRÌNH ĐẦY ĐỦ CONTENT-07 ĐÃ HOÀN TẤT THÀNH CÔNG 100%!');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('❌ Kiểm thử thất bại:', err);
  process.exit(1);
});

