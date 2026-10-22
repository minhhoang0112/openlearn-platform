// scripts/verify-v2-phrases-fe.mjs
// Verifies FE-PHRASE-01 and FE-AUDIO-02 implementation
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import crypto from 'node:crypto';
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
  console.log('--- BẮT ĐẦU KIỂM THỬ FE-PHRASE-01 VÀ FE-AUDIO-02 ---');
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
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'OpenQuiz'
      },
      ...(body ? { data: JSON.stringify(body) } : {})
    });
    const json = await r.json().catch(() => ({}));
    return { status: r.status(), ok: r.ok(), data: json.data, error: json.error };
  };

  // 1. Đăng ký tài khoản kiểm thử
  console.log('1. Đăng ký tài khoản kiểm thử...');
  const email = `phrase.test.${Date.now()}@example.com`;
  const regRes = await api('POST', '/auth/register', {
    email,
    password: 'Password123!',
    name: 'Phrase & Audio Review Tester'
  });
  assert(regRes.ok, 'Đăng ký thất bại');
  report.checks.push('Tài khoản kiểm thử tạo thành công');

  // 2. Kiểm tra GET /learning/phrase-library khi chưa lưu cụm từ nào
  console.log('\n2. Kiểm tra GET /learning/phrase-library ban đầu...');
  const libInit = await api('GET', '/learning/phrase-library');
  assert(libInit.ok, 'GET phrase-library phải 200');
  assert.strictEqual(libInit.data.set_id, null, 'set_id ban đầu phải là null');
  assert.strictEqual(libInit.data.word_count, 0, 'word_count ban đầu phải là 0');
  report.checks.push('Library ban đầu rỗng, không tự tạo bộ khi chỉ xem');

  // 3. Khởi tạo phiên học và tiến tới bước vocabulary_in_context
  console.log('\n3. Khởi tạo phiên bài học "foundation-introductions-01"...');
  const sessRes = await api('POST', '/learning/sessions', { lesson_id: 'foundation-introductions-01' });
  assert(sessRes.ok, 'Tạo session thất bại');
  let session = sessRes.data;
  const sessionId = session.id;

  // Bước 0: listen_comprehension -> submit & advance sang bước 1: vocabulary_in_context
  const opt0 = session.current.options?.[0]?.id ?? 0;
  const sub0 = await api('POST', `/learning/sessions/${sessionId}/submit`, {
    step_id: session.current.id,
    revision: session.revision,
    response: { option_id: opt0 },
    submission_id: crypto.randomUUID()
  });
  assert(sub0.ok, `Submit bước 0 thất bại: ${JSON.stringify(sub0.error || sub0.data)}`);
  session = sub0.data.session;
  const adv0 = await api('POST', `/learning/sessions/${sessionId}/advance`, {
    step_id: session.current.id,
    revision: session.revision
  });
  assert(adv0.ok, `Advance bước 0 thất bại: ${JSON.stringify(adv0.error || adv0.data)}`);
  session = adv0.data;
  assert.strictEqual(session.current.type, 'vocabulary_in_context', 'Bước hiện tại phải là vocabulary_in_context');
  const stepId = session.current.id;
  console.log(`- Đã tới bước vocabulary_in_context: step_id="${stepId}"`);

  // 4. Kiểm tra API GET /learning/sessions/:id/steps/:step_id/phrases
  console.log('\n4. Kiểm tra GET phrases cho bước hiện tại...');
  const phrasesRes = await api('GET', `/learning/sessions/${sessionId}/steps/${stepId}/phrases`);
  assert(phrasesRes.ok, 'GET phrases phải 200');
  assert(Array.isArray(phrasesRes.data.items), 'items phải là mảng');
  assert(phrasesRes.data.items.length >= 2, 'Cần ít nhất 2 cụm từ');
  assert(phrasesRes.data.items.every(it => it.saved === false), 'Ban đầu các cụm từ chưa được lưu');
  console.log(`- Tìm thấy ${phrasesRes.data.items.length} cụm từ trong bước học`);
  report.checks.push(`GET step phrases trả về ${phrasesRes.data.items.length} cụm từ`);

  // 5. Kiểm tra giao diện LessonRunView tại bước vocabulary_in_context trong Chrome
  console.log('\n5. Mở LessonRunView trên Chrome để kiểm tra UI FE-PHRASE-01...');
  await page.goto(`${origin}/lesson-run/${sessionId}`);
  await page.waitForSelector('text=Lưu vào bộ ôn riêng & Hệ thống lặp lại SRS');

  // Kiểm tra có các nút 'Chọn tất cả', 'Bỏ chọn' và danh sách cụm từ
  const selectAllBtn = page.locator('button:has-text("Chọn tất cả")');
  const deselectAllBtn = page.locator('button:has-text("Bỏ chọn")');
  await assert.doesNotReject(selectAllBtn.waitFor({ state: 'visible' }), 'Phải có nút Chọn tất cả');
  await assert.doesNotReject(deselectAllBtn.waitFor({ state: 'visible' }), 'Phải có nút Bỏ chọn');

  // Kiểm tra nút Lưu cụm từ
  const saveBtn = page.locator('button:has-text("Lưu vào bộ ôn")');
  await assert.doesNotReject(saveBtn.waitFor({ state: 'visible' }), 'Phải có nút Lưu vào bộ ôn');
  report.checks.push('Giao diện chọn/lưu cụm từ hiển thị đầy đủ trong LessonRunView');

  // 6. Thực hiện lưu cụm từ qua UI hoặc API và xác thực
  console.log('\n6. Lưu cụm từ qua POST API và xác minh tính lặp/bộ thẻ...');
  const postSaveRes = await api('POST', `/learning/sessions/${sessionId}/steps/${stepId}/phrases`, {
    phrase_indexes: [0, 1]
  });
  assert(postSaveRes.ok, 'POST phrases phải 200');
  assert.strictEqual(postSaveRes.data.added_count, 2, 'added_count phải là 2');
  assert.strictEqual(postSaveRes.data.linked_count, 2, 'linked_count phải là 2');
  assert.strictEqual(postSaveRes.data.already_saved_count, 0, 'already_saved_count phải là 0');
  assert(postSaveRes.data.library.set_id > 0, 'set_id bộ thẻ mới phải tồn tại');
  assert.strictEqual(postSaveRes.data.library.word_count, 2, 'word_count bộ thẻ phải là 2');
  const setId = postSaveRes.data.library.set_id;
  report.checks.push('Lưu 2 cụm từ tạo thành công bộ thẻ riêng và liên kết');

  // Kiểm tra lưu lại (idempotent / duplicate check)
  const dupSaveRes = await api('POST', `/learning/sessions/${sessionId}/steps/${stepId}/phrases`, {
    phrase_indexes: [0, 1]
  });
  assert(dupSaveRes.ok, 'POST lưu lại phải 200');
  assert.strictEqual(dupSaveRes.data.added_count, 0, 'Lưu lại không thêm thẻ mới');
  assert.strictEqual(dupSaveRes.data.linked_count, 0, 'Lưu lại không thêm liên kết mới');
  assert.strictEqual(dupSaveRes.data.already_saved_count, 2, 'already_saved_count phải là 2');
  report.checks.push('Lưu trùng lặp không sinh thẻ dư thừa (idempotent)');

  // 7. Reload trang LessonRunView để kiểm tra trạng thái 'Đã lưu' hiển thị trên UI
  console.log('\n7. Reload LessonRunView và kiểm tra nhãn "Đã lưu vào bộ thẻ"...');
  await page.reload();
  await page.waitForSelector('text=Lưu vào bộ ôn riêng & Hệ thống lặp lại SRS');
  const savedBadges = page.locator('text=Đã lưu vào bộ thẻ');
  const savedCount = await savedBadges.count();
  assert(savedCount >= 2, `Phải có ít nhất 2 huy hiệu "Đã lưu vào bộ thẻ", thực tế: ${savedCount}`);

  // Kiểm tra nút Xem trong bộ thẻ
  const viewSetBtn = page.locator('button:has-text("Xem trong bộ thẻ")');
  await assert.doesNotReject(viewSetBtn.first().waitFor({ state: 'visible' }), 'Phải có nút mở bộ từ vựng');
  report.checks.push('Giao diện LessonRunView hiển thị chính xác huy hiệu Đã lưu và nút Xem trong bộ thẻ');

  // 8. Kiểm tra bộ thẻ và thẻ có mặt trong SRS
  console.log('\n8. Kiểm tra bộ thẻ và thẻ trong hệ thống SRS...');
  const setDetails = await api('GET', `/sets/${setId}`);
  assert(setDetails.ok, 'GET sets/:id phải 200');
  assert.strictEqual(setDetails.data.visibility, 'private', 'Bộ thẻ cụm từ V2 phải ở chế độ private');
  assert.strictEqual(setDetails.data.words.length, 2, 'Bộ thẻ phải có đúng 2 thẻ');

  const srsQueue = await api('GET', '/srs/queue');
  assert(srsQueue.ok, 'GET /srs/queue phải 200');
  const inQueue = srsQueue.data.items.filter(w => w.set_id === setId);
  assert(inQueue.length >= 2, 'Các thẻ mới lưu phải vào ngay hàng đợi SRS do due_at = now');
  report.checks.push('Các thẻ cụm từ đã vào hàng đợi ôn tập ngắt quãng (SRS)');

  // 9. Kiểm tra trang /practice hiển thị V2 Phrase Library Card
  console.log('\n9. Điều hướng tới /practice và kiểm tra thẻ Bộ cụm từ V2...');
  await page.goto(`${origin}/practice`);
  await page.waitForSelector('text=Bộ cụm từ V2');
  const phraseLibTitle = page.locator('text=Cụm từ từ bài học của tôi').first();
  await assert.doesNotReject(phraseLibTitle.waitFor({ state: 'visible' }), 'Phải có tiêu đề Cụm từ từ bài học của tôi');
  const openSetBtn = page.locator('button:has-text("Xem bộ từ")');
  await assert.doesNotReject(openSetBtn.waitFor({ state: 'visible' }), 'Phải có nút Xem bộ từ');
  const srsBtn = page.locator('button:has-text("Ôn tập ngay")');
  await assert.doesNotReject(srsBtn.waitFor({ state: 'visible' }), 'Phải có nút Ôn tập ngay');
  report.checks.push('Trang /practice hiển thị thẻ Bộ cụm từ V2 đầy đủ thông tin và nút điều hướng');

  // 10. KIỂM THỬ FE-AUDIO-02:
  // Bug A: Newest-first audio review restoration
  console.log('\n10. Kiểm thử FE-AUDIO-02 Bug A: Newest-first review selection...');
  // Tiến bài học tới bước pronunciation_practice
  // Bước 1 -> submit (acknowledge) & advance sang bước 2
  const sub1 = await api('POST', `/learning/sessions/${sessionId}/submit`, {
    step_id: session.current.id,
    revision: session.revision,
    response: { acknowledged: true },
    submission_id: crypto.randomUUID()
  });
  assert(sub1.ok, `Submit bước 1 thất bại: ${JSON.stringify(sub1.error || sub1.data)}`);
  session = sub1.data.session;
  const adv1 = await api('POST', `/learning/sessions/${sessionId}/advance`, {
    step_id: session.current.id,
    revision: session.revision
  });
  assert(adv1.ok, `Advance bước 1 thất bại: ${JSON.stringify(adv1.error || adv1.data)}`);
  session = adv1.data;

  // Bước 2: grammar_practice -> submit choice & advance sang bước 3
  const opt2 = session.current.options?.[0]?.id ?? 0;
  const sub2 = await api('POST', `/learning/sessions/${sessionId}/submit`, {
    step_id: session.current.id,
    revision: session.revision,
    response: { option_id: opt2 },
    submission_id: crypto.randomUUID()
  });
  assert(sub2.ok, `Submit bước 2 thất bại: ${JSON.stringify(sub2.error || sub2.data)}`);
  session = sub2.data.session;
  const adv2 = await api('POST', `/learning/sessions/${sessionId}/advance`, {
    step_id: session.current.id,
    revision: session.revision
  });
  assert(adv2.ok, `Advance bước 2 thất bại: ${JSON.stringify(adv2.error || adv2.data)}`);
  session = adv2.data;
  assert.strictEqual(session.current.type, 'pronunciation_practice', 'Bước hiện tại phải là pronunciation_practice');
  const pronStepId = session.current.id;

  // Chèn 2 nhận xét audio vào DB bằng cách gọi app.db trực tiếp
  const olderDate = new Date(Date.now() - 60000).toISOString();
  const newerDate = new Date().toISOString();
  const olderReviewId = 'rev-older-' + Date.now();
  const newerReviewId = 'rev-newer-' + Date.now();

  app.db.prepare(`
    INSERT INTO learning_audio_reviews
    (id, user_id, session_id, step_id, request_hash, target, mime_type, audio_bytes, content, provider, model, created_at)
    VALUES
    (?, (SELECT id FROM users WHERE email=?), ?, ?, 'hash-older', ?, 'audio/webm', 4096, ?, 'gemini', 'gemini-2.5-flash', ?),
    (?, (SELECT id FROM users WHERE email=?), ?, ?, 'hash-newer', ?, 'audio/webm', 4096, ?, 'gemini', 'gemini-2.5-flash', ?)
  `).run(
    olderReviewId, email, sessionId, pronStepId, session.current.target || 'target text',
    JSON.stringify({
      transcript: 'older transcript',
      feedback: 'Nhận xét bản thu cũ',
      improvements: ['cần cải thiện cũ'],
      needs_clearer_recording: false
    }),
    olderDate,
    newerReviewId, email, sessionId, pronStepId, session.current.target || 'target text',
    JSON.stringify({
      transcript: 'newer transcript',
      feedback: 'Nhận xét bản thu MỚI NHẤT',
      improvements: ['cần cải thiện mới'],
      needs_clearer_recording: false
    }),
    newerDate
  );

  // Mở LessonRunView và kiểm tra xem UI hiển thị nhận xét MỚI NHẤT hay bản cũ
  await page.goto(`${origin}/lesson-run/${sessionId}`);
  await page.waitForSelector('text=Nhận xét bản thu MỚI NHẤT');
  report.checks.push('FE-AUDIO-02 Bug A: LessonRunView hiển thị đúng nhận xét MỚI NHẤT (newest-first không bị bản cũ đè)');

  // Bấm nút xóa nhận xét hiện tại và kiểm tra tải lại nhận xét cũ
  const deleteBtn = page.locator('button[title="Xóa nhận xét này"]');
  await deleteBtn.click();
  // Đợi cho bản cũ hiển thị
  await page.waitForSelector('text=Nhận xét bản thu cũ');
  report.checks.push('FE-AUDIO-02 Bug A: Xóa nhận xét mới nhất đã khôi phục hiển thị nhận xét trước đó');

  // 11. Kiểm thử FE-AUDIO-02 Bug B: Session switching race guard
  console.log('\n11. Kiểm thử FE-AUDIO-02 Bug B: Guard session switching...');
  // Tạo session 2
  const sess2Res = await api('POST', '/learning/sessions', { lesson_id: 'foundation-time-01' });
  assert(sess2Res.ok, 'Tạo session 2 thất bại');
  const session2Id = sess2Res.data.id;

  // Điều hướng nhanh sang session 2
  await page.goto(`${origin}/lesson-run/${session2Id}`);
  await page.waitForSelector('text=Nghe hiểu');
  // Đảm bảo không có rò rỉ review của session 1
  const leakedReview = page.locator('text=Nhận xét bản thu cũ');
  const countLeaked = await leakedReview.count();
  assert.strictEqual(countLeaked, 0, 'Review của session cũ không được rò rỉ sang session mới');
  report.checks.push('FE-AUDIO-02 Bug B: Chuyển phiên học không rò rỉ review phiên cũ');

  console.log('\n--- TỔNG KẾT KIỂM THỬ ---');
  console.log(`Số tiêu chí đạt: ${report.checks.length}`);
  report.checks.forEach((c, idx) => console.log(`✓ [${idx + 1}] ${c}`));
  assert.strictEqual(report.page_errors.length, 0, `Có page errors: ${report.page_errors.join(', ')}`);
  assert.strictEqual(report.server_errors.length, 0, `Có server errors: ${JSON.stringify(report.server_errors)}`);
  console.log('\n>>> TẤT CẢ KIỂM THỬ FE-PHRASE-01 & FE-AUDIO-02 ĐÃ ĐẠT 100% <<<');

} finally {
  if (browser) await browser.close();
  web.close();
  app.server.close();
}
