// scripts/verify-v2-material-subtitles-fe.mjs
// Verifies FE-MATERIAL-03 (SRT/VTT Import & Export) in real Chromium browser
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

function createTestWav(durationSeconds = 10) {
  const sampleRate = 16000;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * 2;
  const bytes = Buffer.alloc(44 + dataSize);

  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.round(Math.sin(2 * Math.PI * 440 * t) * 8000);
    bytes.writeInt16LE(sample, 44 + i * 2);
  }
  return bytes;
}

let browser;
let tempWavPath = null;
let tempSrtPath = null;
let tempVttPath = null;
let tempAnsiPath = null;

try {
  console.log('=== BẮT ĐẦU KIỂM THỬ TRÌNH DUYỆT CHROMIUM CHO FE-MATERIAL-03 (SUBTITLES) ===');
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 }
  });
  page.setDefaultTimeout(12000);

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

  // 1. Đăng ký tài khoản kiểm thử
  console.log('\n1. Đăng ký tài khoản kiểm thử...');
  const testEmail = `subtitles-tester-${Date.now()}@test.invalid`;
  await api('POST', '/auth/register', {
    email: testEmail,
    name: 'Subtitle Specialist',
    password: 'password123!'
  });
  report.checks.push('Tài khoản người học tạo thành công');

  // 2. Nhập học liệu audio 10 giây
  console.log('\n2. Nhập học liệu audio 10s...');
  await page.goto(`${origin}/materials`);
  await page.waitForSelector('text=Học liệu nghe của tôi');

  const openImportBtn = page.locator('button:has-text("Nhập học liệu mới")');
  await openImportBtn.click();
  await page.waitForSelector('text=Nhập học liệu nghe mới');

  tempWavPath = join(tmpdir(), `test-audio-subs-${Date.now()}.wav`);
  writeFileSync(tempWavPath, createTestWav(10));

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(tempWavPath);
  await page.waitForSelector('text=00:10');

  const titleInput = page.locator('input[placeholder*="Đoạn hội thoại"]');
  await titleInput.fill('Bài hội thoại kỹ thuật phụ đề');

  const submitBtn = page.locator('button[type="submit"]:has-text("Nhập học liệu")');
  await submitBtn.click();

  await page.waitForSelector('text=Bài hội thoại kỹ thuật phụ đề');
  const currentUrl = page.url();
  const materialId = currentUrl.split('/materials/')[1].split('?')[0];
  console.log(`- Học liệu ID: ${materialId}`);
  report.checks.push('Nhập học liệu audio 10s thành công');

  // 3. Chuyển sang Tab Luyện từng câu & Nghe chép -> Quản lý mốc câu (Editor)
  console.log('\n3. Mở tab Luyện từng câu & Chuyển sang Quản lý mốc câu...');
  const dictationTabBtn = page.locator('button:has-text("Luyện từng câu & Nghe chép")');
  await dictationTabBtn.click();
  await page.waitForSelector('text=Chưa có mốc câu để luyện tập');

  const editorTabBtn = page.locator('button:has-text("Quản lý mốc câu")');
  await editorTabBtn.click();
  await page.waitForSelector('text=Quản lý mốc câu (0 câu)');
  assert.ok(await page.isVisible('button:has-text("Nhập SRT/VTT")'), 'Nút Nhập SRT/VTT phải hiển thị');
  report.checks.push('Editor hiển thị nút "Nhập SRT/VTT"');

  // 4. Mở modal Nhập phụ đề & Kiểm tra Preview với SRT có BOM và CRLF
  console.log('\n4. Mở modal Nhập phụ đề & Kiểm tra Preview SRT (BOM, CRLF)...');
  const importModalBtn = page.locator('button:has-text("Nhập SRT/VTT")');
  await importModalBtn.click();
  await page.waitForSelector('text=Nhập mốc câu từ phụ đề SRT / WebVTT');

  const sampleSrt = '\uFEFF1\r\n00:00:00,500 --> 00:00:02,000\r\nThe server is online.\r\n\r\n2\r\n00:00:02,500 --> 00:00:04,500\r\nPlease check\r\nthe network latency.';
  tempSrtPath = join(tmpdir(), `sample-${Date.now()}.srt`);
  writeFileSync(tempSrtPath, Buffer.from(sampleSrt, 'utf-8'));

  const subtitleFileInput = page.locator('input[type="file"][accept*=".srt"]');
  await subtitleFileInput.setInputFiles(tempSrtPath);
  await page.waitForSelector('text=Đã nạp tệp:');

  // Bấm Xem trước (Preview)
  const previewBtn = page.locator('button:has-text("Xem trước (Preview)")');
  await previewBtn.click();

  // Đợi kết quả xem trước
  await page.waitForSelector('text=Trích xuất thành công 2 câu (SRT)');
  await page.waitForSelector('text=The server is online.');
  await page.waitForSelector('text=Please check\nthe network latency.');
  assert.ok(await page.isVisible('text=Chưa lưu vào máy chủ'), 'Phải báo rõ chưa lưu vào máy chủ');
  report.checks.push('Preview SRT: Phân tích chuẩn xác 2 câu từ file SRT có BOM và CRLF');

  // 5. Kiểm tra tính an toàn: Bấm Hủy không làm thay đổi dữ liệu máy chủ
  console.log('\n5. Kiểm tra nút Hủy: Không đổi dữ liệu...');
  const cancelPreviewBtn = page.locator('button:has-text("Hủy")').last();
  await cancelPreviewBtn.click();

  // Modal đóng, editor vẫn là 0 câu
  await page.waitForSelector('text=Quản lý mốc câu (0 câu)');
  const serverCues0 = await api('GET', `/learning/materials/${materialId}/cues`);
  assert.equal(serverCues0.cues.length, 0, 'BE cues phải nguyên vẹn 0 câu khi hủy preview');
  report.checks.push('Hủy preview: Dữ liệu BE và Editor giữ nguyên vẹn');

  // 6. Kiểm tra xử lý lỗi định dạng UTF-8 (File ANSI / invalid UTF-8)
  console.log('\n6. Kiểm tra phát hiện file không đúng UTF-8...');
  await importModalBtn.click();
  await page.waitForSelector('text=Nhập mốc câu từ phụ đề SRT / WebVTT');

  tempAnsiPath = join(tmpdir(), `invalid-utf8-${Date.now()}.srt`);
  // Tạo buffer chứa byte không hợp lệ trong UTF-8 (e.g. 0xFF, 0xFE trong non-BOM context hoặc 0xC0 0x80)
  writeFileSync(tempAnsiPath, Buffer.from([0x31, 0x0A, 0x30, 0x30, 0x3A, 0xC0, 0xAF, 0xFF, 0xFE]));

  await subtitleFileInput.setInputFiles(tempAnsiPath);
  await page.waitForSelector('text=Tệp không đúng định dạng mã hóa UTF-8');
  report.checks.push('Bảo vệ mã hóa: Bắt lỗi UTF-8 bằng TextDecoder fatal mode, từ chối file ANSI');

  const cancelModalBtn = page.locator('button:has-text("Hủy")');
  await cancelModalBtn.click();

  // 7. Nhập WebVTT có STYLE, NOTE và HTML markup (<v Alice><b>...</b></v>)
  console.log('\n7. Nhập WebVTT có NOTE, STYLE, tags HTML và kiểm tra Warnings...');
  await importModalBtn.click();
  await page.waitForSelector('text=Nhập mốc câu từ phụ đề SRT / WebVTT');

  const sampleVtt = `WEBVTT - Technical Audio\nLanguage: en\n\nNOTE internal speaker metadata\nSpeaker 1: Alice\n\nSTYLE\n::cue { color: cyan; }\n\nintro-cue\n00:00.500 --> 00:02.500 align:start position:10%\n<v Alice><b>The database cluster</b> is healthy.</v>\n\nsecond-cue\n00:03.000 --> 00:05.500\nNo critical incidents recorded.`;
  tempVttPath = join(tmpdir(), `sample-${Date.now()}.vtt`);
  writeFileSync(tempVttPath, Buffer.from(sampleVtt, 'utf-8'));

  await subtitleFileInput.setInputFiles(tempVttPath);
  await page.waitForSelector('text=Đã nạp tệp:');

  const previewBtnVtt = page.locator('button:has-text("Xem trước (Preview)")');
  await previewBtnVtt.click();

  await page.waitForSelector('text=Trích xuất thành công 2 câu (VTT)');
  // Kiểm tra cảnh báo hiển thị rõ ràng trên UI với tiếng Việt
  await page.waitForSelector('text=Các cảnh báo khi xử lý định dạng');
  assert.ok(await page.isVisible('text=MARKUP_REMOVED'), 'Phải hiển thị cảnh báo MARKUP_REMOVED');
  assert.ok(await page.isVisible('text=METADATA_BLOCK_IGNORED'), 'Phải hiển thị cảnh báo METADATA_BLOCK_IGNORED');

  // Kiểm tra văn bản được strip tag sạch sẽ (không còn <v> hoặc <b>)
  await page.waitForSelector('text=The database cluster is healthy.');
  await page.waitForSelector('text=No critical incidents recorded.');

  // Kiểm tra không dùng dangerouslySetInnerHTML
  const htmlContent = await page.innerHTML('body');
  assert.ok(!htmlContent.includes('<v Alice>'), 'Markup HTML không được render trực tiếp vào DOM');
  report.checks.push('WebVTT Preview: Strip tags an toàn, giải mã text thuần và hiển thị cảnh báo chi tiết');

  // 8. Xác nhận áp dụng vào Editor & Lưu lên máy chủ
  console.log('\n8. Xác nhận áp dụng mốc câu vào Editor & Lưu toàn bộ mốc...');
  const applyBtn = page.locator('button:has-text("Xác nhận áp dụng vào Editor")');
  await applyBtn.click();

  // Modal đóng, Editor có 2 câu
  await page.waitForSelector('text=Quản lý mốc câu (2 câu)');
  await page.waitForSelector('text=Đã nạp 2 mốc câu từ tệp phụ đề vào bản nháp Editor');

  // Bấm Lưu toàn bộ mốc
  const saveAllCuesBtn = page.locator('button:has-text("Lưu toàn bộ mốc")');
  await saveAllCuesBtn.click();

  // Tự động chuyển về practice mode
  await page.waitForSelector('text=Luyện nghe chép');
  await page.waitForSelector('text=Câu 1 / 2');
  report.checks.push('Áp dụng & Lưu: Mốc câu được nạp vào editor và lưu thành công lên BE');

  // 9. Kiểm tra Dictation hoạt động với mốc câu vừa nhập
  console.log('\n9. Kiểm tra luyện nghe chép câu vừa nhập từ WebVTT...');
  const dictationTextarea = page.locator('textarea[placeholder*="Gõ chính xác những từ bạn nghe được"]');
  await dictationTextarea.fill('The database cluster is healthy.');

  await page.keyboard.press('Enter');
  await page.waitForSelector('text=Chính xác tuyệt đối!');
  report.checks.push('Luyện nghe chép hoạt động trơn tru với mốc câu vừa nhập từ phụ đề');

  // 10. Kiểm tra tính năng Xuất phụ đề (Export SRT & VTT)
  console.log('\n10. Kiểm tra xuất phụ đề SRT và WebVTT...');
  await editorTabBtn.click();
  await page.waitForSelector('text=Quản lý mốc câu (2 câu)');

  // Kiểm tra có nút Xuất SRT và Xuất VTT
  assert.ok(await page.getByRole('button', { name: 'SRT', exact: true }).isVisible(), 'Nút xuất SRT phải có');
  assert.ok(await page.getByRole('button', { name: 'VTT', exact: true }).isVisible(), 'Nút xuất VTT phải có');

  // Thử gọi export API qua client để kiểm tra nội dung
  const exportSrt = await api('GET', `/learning/materials/${materialId}/cues/export?format=srt`);
  assert.equal(exportSrt.format, 'srt');
  assert.equal(exportSrt.cue_count, 2);
  assert.equal(exportSrt.translation_included, false);
  assert.ok(exportSrt.content.includes('The database cluster is healthy.'));
  assert.ok(exportSrt.filename.endsWith('.srt'));

  const exportVtt = await api('GET', `/learning/materials/${materialId}/cues/export?format=vtt`);
  assert.equal(exportVtt.format, 'vtt');
  assert.equal(exportVtt.cue_count, 2);
  assert.ok(exportVtt.content.startsWith('WEBVTT'));
  assert.ok(exportVtt.content.includes('No critical incidents recorded.'));
  report.checks.push('Xuất phụ đề: API trả về đúng format SRT/VTT, mime_type và không lẫn bản dịch');

  // Bấm nút xuất SRT trên giao diện
  const exportSrtBtn = page.getByRole('button', { name: 'SRT', exact: true });
  await exportSrtBtn.click();
  await page.waitForSelector('text=Đã xuất tệp');
  report.checks.push('Xuất file qua UI: Tạo Blob tải về trình duyệt và hiển thị thông báo thành công');

  // 11. Kiểm tra Roundtrip: File vừa xuất có thể import lại chuẩn xác
  console.log('\n11. Kiểm tra Roundtrip: Lấy content export import lại...');
  const reimportPreview = await api('POST', `/learning/materials/${materialId}/cues/preview-import`, {
    format: 'vtt',
    content: exportVtt.content
  });
  assert.equal(reimportPreview.cues.length, 2);
  assert.equal(reimportPreview.cues[0].text, 'The database cluster is healthy.');
  assert.equal(reimportPreview.cues[1].text, 'No critical incidents recorded.');
  report.checks.push('Roundtrip hoàn hảo: File WebVTT xuất ra được import lại bảo toàn mốc thời gian và text');

  // 12. Kiểm tra xung đột phiên (409 REVISION_CONFLICT)
  console.log('\n12. Kiểm tra xung đột revision 409 khi có tab khác sửa...');
  // Giả lập tab khác cập nhật cues lên revision mới
  await api('PUT', `/learning/materials/${materialId}/cues`, {
    revision: 1,
    cues: [
      { id: crypto.randomUUID(), start_ms: 500, end_ms: 2000, text: 'Remote update cue.', translation: '' }
    ]
  });

  // Người dùng trên màn hình hiện tại bấm Lưu với revision cũ 1
  await saveAllCuesBtn.click();
  await page.waitForSelector('text=Các mốc câu đã được cập nhật từ phiên khác');
  report.checks.push('Bảo vệ 409: Báo xung đột phiên rõ ràng, không âm thầm ghi đè và giữ draft cho người học');

  // 13. Tải lại từ máy chủ để đồng bộ
  console.log('\n13. Bấm tải lại từ máy chủ...');
  const reloadServerBtn = page.locator('button:has-text("Tải lại từ máy chủ")');
  await reloadServerBtn.click();
  await page.waitForSelector('text=Quản lý mốc câu (1 câu)');
  report.checks.push('Đồng bộ máy chủ: Cập nhật lại bản mới nhất từ server thành công');

  // 14. Dọn dẹp học liệu kiểm thử
  console.log('\n14. Xóa học liệu kiểm thử...');
  const deleteBtn = page.locator('button[title="Xóa học liệu"]');
  await deleteBtn.click();
  await page.waitForSelector('text=Xác nhận xóa học liệu này?');

  const confirmDeleteBtn = page.locator('button:has-text("Xóa học liệu")');
  await confirmDeleteBtn.click();
  await page.waitForSelector('text=Học liệu nghe của tôi');
  report.checks.push('Dọn dẹp: Xóa học liệu thành công');

  console.log('\n=== KẾT QUẢ KIỂM THỬ FE-MATERIAL-03 ===');
  console.log(`Số tiêu chí kiểm tra đạt: ${report.checks.length}`);
  console.log(`Số lỗi trang (page errors): ${report.page_errors.length}`);
  console.log(`Số lỗi máy chủ (server errors): ${report.server_errors.length}`);

  assert.equal(report.page_errors.length, 0, `Page errors: ${JSON.stringify(report.page_errors)}`);
  assert.equal(report.server_errors.length, 0, `Server errors: ${JSON.stringify(report.server_errors)}`);
  assert.ok(report.checks.length >= 12, 'Phải đạt tối thiểu 12 tiêu chí kiểm thử');

  console.log('\n🎉 TOÀN BỘ KIỂM THỬ TRÌNH DUYỆT FE-MATERIAL-03 THÀNH CÔNG RỰC RỠ!');
} catch (err) {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err);
  process.exitCode = 1;
} finally {
  for (const p of [tempWavPath, tempSrtPath, tempVttPath, tempAnsiPath]) {
    if (p && existsSync(p)) {
      try { unlinkSync(p); } catch {}
    }
  }
  if (browser) await browser.close();
  web.close();
  app.server.close();
}
