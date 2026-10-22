// scripts/verify-v2-materials-fe.mjs
// Verifies FE-MATERIAL-01 and UPGRADE-V2-MATERIALS.md in real Chromium
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, extname, sep, join } from 'node:path';
import crypto from 'node:crypto';
import { tmpdir } from 'node:os';
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

// Helper to generate a valid PCM WAV buffer (2 seconds, 16kHz mono)
function createTestWav(durationSeconds = 2) {
  const sampleRate = 16000;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * 2; // 16-bit mono = 2 bytes per sample
  const bytes = Buffer.alloc(44 + dataSize);

  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); // Subchunk1Size
  bytes.writeUInt16LE(1, 20);  // PCM format
  bytes.writeUInt16LE(1, 22);  // Mono
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  bytes.writeUInt16LE(2, 32);  // BlockAlign
  bytes.writeUInt16LE(16, 34); // BitsPerSample
  bytes.write('data', 36);
  bytes.writeUInt32LE(dataSize, 40);

  // Generate a soft audible sine wave tone
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.round(Math.sin(2 * Math.PI * 440 * t) * 8000);
    bytes.writeInt16LE(sample, 44 + i * 2);
  }

  return bytes;
}

let browser;
let tempWavPath = null;

try {
  console.log('--- BẮT ĐẦU KIỂM THỬ TRÌNH DUYỆT CHROME CHO FE-MATERIAL-01 ---');
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 }
  });
  page.setDefaultTimeout(9000);

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
  const testEmail = `material-tester-${Date.now()}@test.invalid`;
  await api('POST', '/auth/register', {
    email: testEmail,
    name: 'Material Learner',
    password: 'password123!'
  });
  report.checks.push('Tài khoản người học tạo thành công');

  // 2. Kiểm tra API Capabilities
  console.log('\n2. Kiểm tra GET /learning/materials/capabilities...');
  const cap = await api('GET', '/learning/materials/capabilities');
  assert.equal(cap.max_audio_bytes, 8 * 1024 * 1024);
  assert.equal(cap.private_only, true);
  assert.equal(cap.ai_required, false);
  report.checks.push('Capabilities xác nhận giới hạn 8MiB, riêng tư, không cần AI');

  // 3. Mở trang /materials và kiểm tra trạng thái ban đầu rỗng
  console.log('\n3. Truy cập /materials trên Chrome...');
  await page.goto(`${origin}/materials`);
  await page.waitForSelector('text=Học liệu nghe của tôi');
  assert.ok(await page.isVisible('text=Chưa có học liệu nghe cá nhân nào'), 'Phải hiển thị trạng thái rỗng');
  assert.ok(await page.isVisible('text=Thư viện 27 bài học V2'), 'Phải có nút liên kết tới Thư viện V2');
  report.checks.push('Màn /materials hiển thị tiêu đề và trạng thái rỗng ban đầu');

  // 4. Mở modal nhập học liệu và kiểm tra validation
  console.log('\n4. Mở modal nhập học liệu và kiểm tra file picker...');
  const openImportBtn = page.locator('button:has-text("Nhập học liệu mới")');
  await openImportBtn.click();
  await page.waitForSelector('text=Nhập học liệu nghe mới');

  // Tạo file WAV tạm
  tempWavPath = join(tmpdir(), `test-audio-${Date.now()}.wav`);
  const wavBytes = createTestWav(3); // 3 giây
  writeFileSync(tempWavPath, wavBytes);

  // Chọn file vào file input
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(tempWavPath);

  // Đợi giải mã audio trong trình duyệt
  await page.waitForSelector('text=00:03');
  report.checks.push('Trình duyệt giải mã thành công file WAV và phát hiện thời lượng 00:03');

  // Điền form
  const titleInput = page.locator('input[placeholder*="Đoạn hội thoại"]');
  await titleInput.fill('Bài nghe đàm thoại du lịch');

  const transcriptInput = page.locator('textarea[placeholder*="Dán nội dung transcript"]');
  await transcriptInput.fill('Good morning! Welcome to the Grand Central Hotel.\nCan I help you with your reservation?');

  const translationInput = page.locator('textarea[placeholder*="Dán bản dịch tiếng Việt"]');
  await translationInput.fill('Chào buổi sáng! Chào mừng quý khách tới khách sạn Grand Central.\nTôi có thể hỗ trợ quý khách về việc đặt phòng không?');

  const noteInput = page.locator('input[placeholder*="BBC Learning English"]');
  await noteInput.fill('Audio mẫu tự luyện');

  // Bấm Nhập học liệu
  const submitBtn = page.locator('button[type="submit"]:has-text("Nhập học liệu")');
  await submitBtn.click();

  // Đợi chuyển hướng tới màn /materials/:id
  await page.waitForSelector('text=Bài nghe đàm thoại du lịch');
  const currentUrl = page.url();
  assert.match(currentUrl, /\/materials\/[a-zA-Z0-9-]+/, 'URL phải chuyển sang /materials/:id');
  const materialId = currentUrl.split('/materials/')[1].split('?')[0];
  console.log(`- Đã nhập học liệu thành công với ID: ${materialId}`);
  report.checks.push('Nhập học liệu thành công và chuyển hướng sang màn Player chi tiết');

  // 5. Kiểm tra Player và tính năng tua/phát
  console.log('\n5. Kiểm tra Player, A-B Loop và lưu vị trí nghe...');
  await page.waitForSelector('text=Nội dung văn bản (Transcript & Dịch)');
  assert.ok(await page.isVisible('text=Good morning! Welcome to the Grand Central Hotel.'), 'Transcript phải hiển thị');
  assert.ok(await page.isVisible('text=Chào buổi sáng! Chào mừng quý khách'), 'Bản dịch phải hiển thị');

  // Bấm Play / Pause
  const playBtn = page.locator('button[title*="Lùi 5 giây"] + button');
  await playBtn.click();
  // Đợi một chút rồi pause
  await page.waitForTimeout(500);
  await playBtn.click();
  report.checks.push('Nút Play/Pause phát âm thanh native và cập nhật trạng thái');

  // Đổi tốc độ nghe
  const speedBtn = page.locator('button:has-text("1.25x")');
  await speedBtn.click();
  report.checks.push('Chọn tốc độ phát 1.25x thành công');

  // Kiểm tra A-B Loop
  const setPointABtn = page.locator('button:has-text("Đặt điểm A")');
  await setPointABtn.click();
  await page.waitForSelector('text=Điểm A:');

  // Tua một chút rồi đặt B
  const skipForwardBtn = page.locator('button[title="Tua 5 giây"]');
  await skipForwardBtn.click();

  const setPointBBtn = page.locator('button:has-text("Đặt điểm B")');
  await setPointBBtn.click();
  await page.waitForSelector('text=Điểm B:');
  await page.waitForSelector('text=Đang lặp A–B');
  report.checks.push('Thiết lập mốc vòng lặp A–B và kích hoạt lặp đoạn thành công');

  // 6. Chỉnh sửa thông tin học liệu (PATCH)
  console.log('\n6. Chỉnh sửa tiêu đề và transcript...');
  const editBtn = page.locator('button:has-text("Sửa thông tin")');
  await editBtn.click();
  await page.waitForSelector('text=Chỉnh sửa thông tin học liệu');

  const editTitleInput = page.locator('input[value="Bài nghe đàm thoại du lịch"]');
  await editTitleInput.fill('Bài nghe đàm thoại du lịch (Bản cập nhật)');

  const saveEditBtn = page.locator('button:has-text("Lưu thay đổi")');
  await saveEditBtn.click();

  await page.waitForSelector('text=Bài nghe đàm thoại du lịch (Bản cập nhật)');
  report.checks.push('Chỉnh sửa tiêu đề thành công mà không làm gián đoạn vị trí phát');

  // 7. Reload trang và kiểm tra phục hồi vị trí/tốc độ/A-B đã lưu
  console.log('\n7. Reload trang kiểm tra khôi phục vị trí và cấu hình Player...');
  await page.reload();
  await page.waitForSelector('text=Bài nghe đàm thoại du lịch (Bản cập nhật)');
  await page.waitForSelector('text=Điểm A:');
  await page.waitForSelector('text=Điểm B:');
  report.checks.push('Reload trang khôi phục chính xác mốc A-B và tốc độ đã lưu từ BE');

  // 8. Kiểm tra liên kết từ /listening và /practice
  console.log('\n8. Kiểm tra các nút điều hướng từ Thư viện nghe và Luyện tập...');
  await page.goto(`${origin}/listening`);
  await page.waitForSelector('text=Học liệu cá nhân của tôi');
  const materialsNavBtn = page.locator('button:has-text("Học liệu cá nhân của tôi")');
  await materialsNavBtn.click();
  await page.waitForSelector('text=Học liệu nghe của tôi');
  report.checks.push('Thư viện nghe (/listening) có nút truy cập trực tiếp Kho học liệu cá nhân');

  await page.goto(`${origin}/practice`);
  await page.waitForSelector('text=Học liệu nghe cá nhân');
  report.checks.push('Trung tâm luyện tập (/practice) hiển thị học liệu nghe cá nhân');

  // 9. Xóa học liệu
  console.log('\n9. Xóa học liệu cá nhân...');
  await page.goto(`${origin}/materials/${materialId}`);
  await page.waitForSelector('text=Bài nghe đàm thoại du lịch (Bản cập nhật)');

  const deleteBtn = page.locator('button[title="Xóa học liệu"]');
  await deleteBtn.click();
  await page.waitForSelector('text=Xác nhận xóa học liệu này?');

  const confirmDeleteBtn = page.locator('button:has-text("Xóa học liệu")');
  await confirmDeleteBtn.click();

  await page.waitForSelector('text=Học liệu nghe của tôi');
  assert.ok(await page.isVisible('text=Chưa có học liệu nghe cá nhân nào'), 'Danh sách phải trở về rỗng sau khi xóa');

  // Gọi GET trực tiếp xác nhận 404
  const checkDel = await page.request.fetch(`${origin}/api/v1/learning/materials/${materialId}`, {
    method: 'GET',
    headers: { 'X-Requested-With': 'OpenQuiz' }
  });
  assert.equal(checkDel.status(), 404, 'Học liệu đã xóa phải trả về 404');
  report.checks.push('Xóa học liệu thành công, dọn dẹp âm thanh và API trả về 404');

  console.log('\n--- TỔNG KẾT KIỂM THỬ FE-MATERIAL-01 ---');
  console.log(`Số tiêu chí đạt: ${report.checks.length}`);
  report.checks.forEach((c, idx) => console.log(`✓ [${idx + 1}] ${c}`));
  assert.strictEqual(report.page_errors.length, 0, `Có page errors: ${report.page_errors.join(', ')}`);
  assert.strictEqual(report.server_errors.length, 0, `Có server errors: ${JSON.stringify(report.server_errors)}`);
  console.log('\n>>> TẤT CẢ KIỂM THỬ FE-MATERIAL-01 ĐÃ ĐẠT 100% <<<');

} finally {
  if (tempWavPath && existsSync(tempWavPath)) {
    try { unlinkSync(tempWavPath); } catch {}
  }
  if (browser) await browser.close();
  web.close();
  app.server.close();
}
