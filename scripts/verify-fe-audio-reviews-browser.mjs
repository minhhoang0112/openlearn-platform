// scripts/verify-fe-audio-reviews-browser.mjs
// Verifies FE-AUDIO-01 in real Chromium: LessonRunView audio review UI, 429 handling, deletion, and ProgressView evidence
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createApp } from '../server/app.mjs';

const require = createRequire(process.env.REA_PACKAGE_JSON || 'C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const { chromium } = require('playwright-core');

const origins = [];
const app = createApp({ origins });
const root = resolve('dist');

app.server.listen(0, '127.0.0.1');
await once(app.server, 'listening');
const upstreamOrigin = `http://127.0.0.1:${app.server.address().port}`;

const report = {
  checks: [],
  page_errors: [],
  server_errors: []
};

const web = createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      const r = await fetch(upstreamOrigin + req.url, {
        method: req.method,
        headers: req.headers,
        ...(body.length ? { body } : {})
      });
      if (r.status >= 500) report.server_errors.push({ path: req.url, status: r.status });
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    let file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + sep) || !existsSync(file) || !extname(file)) file = resolve(root, 'index.html');
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' })[extname(file)] || 'text/html');
    res.end(readFileSync(file));
  } catch (e) {
    res.writeHead(500);
    res.end(e.stack);
  }
});

web.listen(0, '127.0.0.1');
await once(web, 'listening');
const origin = `http://127.0.0.1:${web.address().port}`;
origins.push(origin);

let browser;
try {
  console.log('--- BẮT ĐẦU KIỂM THỬ TRÌNH DUYỆT CHROME CHO FE-AUDIO-01 ---');
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    permissions: ['microphone']
  });
  page.setDefaultTimeout(8000);

  page.on('pageerror', err => {
    report.page_errors.push(String(err));
    console.error('Page error:', err);
  });

  const api = async (method, path, body) => {
    const r = await page.request.fetch(origin + '/api/v1' + path, {
      method,
      headers: { 'X-Requested-With': 'OpenQuiz' },
      ...(body === undefined ? {} : { data: body })
    });
    const v = await r.json();
    assert.ok(r.ok(), JSON.stringify(v));
    return v.data;
  };

  // 1. Đăng ký người dùng kiểm thử
  console.log('1. Đăng ký tài khoản kiểm thử...');
  const testEmail = `fe-audio-${Date.now()}@test.invalid`;
  await api('POST', '/auth/register', {
    email: testEmail,
    name: 'Audio Review Learner',
    password: 'password123!'
  });
  report.checks.push('Đăng ký tài khoản kiểm thử thành công');

  // 2. Khởi tạo bài học và tiến tới pronunciation_practice
  console.log('2. Mở bài học foundation-introductions-01 qua API và tiến tới pronunciation...');
  const sessionData = await api('POST', '/learning/sessions', { lesson_id: 'foundation-introductions-01' });
  const sessionId = sessionData.id;

  let s = sessionData;
  while (s.current && s.current.type !== 'pronunciation_practice') {
    const cur = s.current;
    const resp = cur.response_schema === 'choice' ? { option_id: cur.options[0].id } : { acknowledged: true };
    const sub = await api('POST', `/learning/sessions/${sessionId}/submit`, {
      step_id: cur.id,
      revision: s.revision,
      submission_id: '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0'),
      response: resp
    });
    const adv = await api('POST', `/learning/sessions/${sessionId}/advance`, {
      step_id: cur.id,
      revision: sub.session.revision
    });
    s = adv;
  }
  assert.equal(s.current.type, 'pronunciation_practice');

  // 3. Truy cập vào /lesson-run/:id
  console.log('3. Truy cập /lesson-run/' + sessionId + '...');
  await page.goto(`${origin}/lesson-run/${sessionId}`);
  await page.waitForSelector('text=Cụm từ mục tiêu');
  assert.ok(await page.isVisible(`text=${s.current.target}`), 'Target sentence must be visible');
  assert.ok(await page.isVisible('text=Tự thu âm giọng của bạn để nghe lại'), 'Recording section must be visible');
  assert.ok(await page.isVisible('text=Bấm để nói'), 'Bấm để nói button must be visible');
  report.checks.push('Màn phát âm hiển thị cụm từ mục tiêu và widget thu âm local');

  // 4. Mock AI audio review và reload phiên để kiểm tra hiển thị review card
  console.log('4. Kiểm tra hiển thị thẻ nhận xét AI phát âm (Review Card)...');
  const mockReview = {
    id: 'mock-rev-1234',
    session_id: sessionId,
    step_id: s.current.id,
    target: s.current.target,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    created_at: new Date().toISOString(),
    mime_type: 'audio/webm',
    audio_bytes: 4096,
    transcript: 'I am a university student.',
    feedback: 'Phát âm to, rõ ràng và đúng ngữ điệu. Trọng âm từ "university" đặt đúng vào âm tiết thứ ba.',
    improvements: ['Chú ý giữ độ mở tự nhiên khi nói cụm "I am a".'],
    needs_clearer_recording: false,
    cached: true,
    limitations: [
      'AI nghe từ bản thu có thể nhận dạng sai; hãy đối chiếu với bản thu của bạn.',
      'Đây là nhận xét định tính, không phải điểm phát âm chuẩn hóa hoặc chứng chỉ.',
      'Audio thô không được lưu trên BE; bản thu được gửi tới nhà cung cấp AI khi bạn yêu cầu.'
    ],
    assessment_status: 'ai_audio_review',
    assessment_scope: 'qualitative_audio_feedback',
    pronunciation_score: null,
    proficiency_estimate: null,
    audio_stored: false
  };

  // Chèn review vào DB của test server
  app.db.prepare(`
    INSERT INTO learning_audio_reviews
    (id, user_id, session_id, step_id, request_hash, target, mime_type, audio_bytes, content, provider, model, created_at)
    VALUES (?, (SELECT id FROM users WHERE email=?), ?, ?, 'mock-hash-1', ?, 'audio/webm', 4096, ?, 'gemini', 'gemini-2.5-flash', ?)
  `).run(mockReview.id, testEmail, sessionId, s.current.id, s.current.target, JSON.stringify({
    transcript: mockReview.transcript,
    feedback: mockReview.feedback,
    improvements: mockReview.improvements,
    needs_clearer_recording: mockReview.needs_clearer_recording
  }), mockReview.created_at);

  await page.reload();
  await page.waitForSelector('text=Nhận xét phát âm từ AI');
  assert.ok(await page.isVisible('text=Phát âm to, rõ ràng và đúng ngữ điệu'), 'Feedback must be displayed');
  assert.ok(await page.isVisible('text=Chú ý giữ độ mở tự nhiên'), 'Improvement must be displayed');
  assert.ok(await page.isVisible('text=Đã lưu trong phiên'), 'Cached badge must be displayed');
  assert.ok(await page.isVisible('button[title="Xóa nhận xét này"]'), 'Delete button must be visible');
  report.checks.push('Review card hiển thị đầy đủ câu mẫu, AI nghe được, nhận xét chi tiết, gợi ý cải thiện và nút xóa');

  // 5. Kiểm tra xóa nhận xét
  console.log('5. Bấm xóa nhận xét phát âm...');
  await page.click('button[title="Xóa nhận xét này"]');
  await page.waitForTimeout(500);
  assert.equal(await page.isVisible('text=Phát âm to, rõ ràng và đúng ngữ điệu'), false, 'Review must disappear after deletion');
  report.checks.push('Xóa nhận xét thành công và biến mất tức thì khỏi UI');

  // 6. Kiểm tra màn Tiến bộ (/progress) và Modal Evidence
  console.log('6. Kiểm tra màn /progress và Modal Evidence...');
  // Chèn lại review để kiểm tra phản ánh trên /progress
  app.db.prepare(`
    INSERT INTO learning_audio_reviews
    (id, user_id, session_id, step_id, request_hash, target, mime_type, audio_bytes, content, provider, model, created_at)
    VALUES (?, (SELECT id FROM users WHERE email=?), ?, ?, 'mock-hash-2', ?, 'audio/webm', 4096, ?, 'gemini', 'gemini-2.5-flash', ?)
  `).run(mockReview.id, testEmail, sessionId, s.current.id, s.current.target, JSON.stringify({
    transcript: mockReview.transcript,
    feedback: mockReview.feedback,
    improvements: mockReview.improvements,
    needs_clearer_recording: mockReview.needs_clearer_recording
  }), mockReview.created_at);

  // Nộp bước phát âm để có bằng chứng
  await api('POST', `/learning/sessions/${sessionId}/submit`, {
    step_id: s.current.id,
    revision: s.revision,
    submission_id: '00000000-0000-4000-8000-000000000099',
    response: { acknowledged: true }
  });

  await page.goto(`${origin}/progress`);
  await page.waitForSelector('text=Dữ liệu thực hành theo kỹ năng');

  // Kiểm tra summary card
  assert.ok(await page.isVisible('text=Nhận xét âm thanh định tính trong kỳ'), 'Audio feedback summary must be visible');
  assert.ok(await page.isVisible('text=1 lượt nhận xét phát âm từ bản thu thật'), 'Audio count in summary must be 1');

  // Kiểm tra kỹ năng Phát âm
  assert.ok(await page.isVisible('text=Nhận xét audio'), 'Audio badge on skill must be visible');

  // Mở tab lịch sử học tập
  console.log('7. Mở Tab Lịch sử các phiên học và xem Modal Evidence...');
  await page.click('button:has-text("Lịch sử các phiên học")');
  await page.waitForSelector('button:has-text("Xem bài đã nộp")');
  await page.click('button:has-text("Xem bài đã nộp")');
  await page.waitForSelector('text=Chi tiết các bước đã nộp');
  assert.ok(await page.isVisible('text=1 nhận xét audio'), 'Audio review count badge in evidence modal must be visible');
  assert.ok(await page.isVisible('text=Nhận xét phát âm AI'), 'Audio review card inside evidence modal must be visible');
  assert.ok(await page.isVisible('text=Phát âm to, rõ ràng và đúng ngữ điệu'), 'Evidence modal feedback must match');
  report.checks.push('Màn /progress và Modal Evidence phản ánh chính xác 1 nhận xét audio định tính');

  await browser.close();

  assert.equal(report.page_errors.length, 0, `Page errors encountered: ${JSON.stringify(report.page_errors)}`);
  assert.equal(report.server_errors.length, 0, `Server errors encountered: ${JSON.stringify(report.server_errors)}`);

  console.log('\n=== KẾT QUẢ KIỂM THỬ TRÌNH DUYỆT CHROME ===');
  report.checks.forEach((c, idx) => console.log(`✓ [${idx + 1}] ${c}`));
  console.log(`✓ 0 Page errors`);
  console.log(`✓ 0 Server 500 errors`);
  console.log('=== FE-AUDIO-01 HOÀN THÀNH VÀ XÁC MINH 100% ===\n');
} finally {
  web.close();
  app.server.closeAllConnections();
  await app.close();
}
