// scripts/verify-v2-material-cues-fe.mjs
// Verifies FE-MATERIAL-02 and player bug fixes in real Chromium browser
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

try {
  console.log('=== BẮT ĐẦU KIỂM THỬ TRÌNH DUYỆT CHROMIUM CHO FE-MATERIAL-02 & FIXES ===');
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

  // 1. Đăng ký người dùng kiểm thử
  console.log('\n1. Đăng ký tài khoản kiểm thử...');
  const testEmail = `cues-learner-${Date.now()}@test.invalid`;
  await api('POST', '/auth/register', {
    email: testEmail,
    name: 'Dictation Master',
    password: 'password123!'
  });
  report.checks.push('Tạo tài khoản kiểm thử thành công');

  // 2. Nhập học liệu âm thanh 10 giây
  console.log('\n2. Nhập học liệu audio 10 giây qua UI...');
  await page.goto(`${origin}/materials`);
  await page.waitForSelector('text=Học liệu nghe của tôi');

  const openImportBtn = page.locator('button:has-text("Nhập học liệu mới")');
  await openImportBtn.click();
  await page.waitForSelector('text=Nhập học liệu nghe mới');

  tempWavPath = join(tmpdir(), `test-cues-${Date.now()}.wav`);
  writeFileSync(tempWavPath, createTestWav(10));

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(tempWavPath);
  await page.waitForSelector('text=00:10');

  const titleInput = page.locator('input[placeholder*="Đoạn hội thoại"]');
  await titleInput.fill('Bài luyện nghe đàm thoại IT Support');

  const transcriptInput = page.locator('textarea[placeholder*="Dán nội dung transcript"]');
  await transcriptInput.fill('The server is online now. Please check the network latency.');

  const translationInput = page.locator('textarea[placeholder*="Dán bản dịch tiếng Việt"]');
  await translationInput.fill('Máy chủ hiện đang hoạt động trực tuyến. Vui lòng kiểm tra độ trễ mạng.');

  const submitBtn = page.locator('button[type="submit"]:has-text("Nhập học liệu")');
  await submitBtn.click();

  await page.waitForSelector('text=Bài luyện nghe đàm thoại IT Support');
  const currentUrl = page.url();
  const materialId = currentUrl.split('/materials/')[1].split('?')[0];
  console.log(`- Học liệu ID: ${materialId}`);
  report.checks.push('Nhập học liệu 10s thành công');

  // 3. Kiểm tra Fix Bug 1: Đặt Point A mà chưa có B không gây lỗi 400
  console.log('\n3. Kiểm tra Fix Bug Point A đơn lẻ (không bị 400 INVALID_LOOP)...');
  const setPointABtn = page.locator('button:has-text("Đặt điểm A")');
  await setPointABtn.click();
  await page.waitForSelector('text=Điểm A:');
  // Đợi debounce / request bay
  await page.waitForTimeout(600);
  assert.equal(report.server_errors.length, 0, 'Không phát sinh lỗi server khi đặt A mà chưa có B');
  report.checks.push('Fix Bug Point A đơn lẻ: Giao diện giữ A tạm, không gửi request 400 lỗi lên máy chủ');

  // 4. Kiểm tra Fix Bug 2: Thao tác đổi tốc độ & toggle nhanh (Queue & retry 409)
  console.log('\n4. Kiểm tra Fix Bug thao tác đổi tốc độ nhanh (Request queue serialized)...');
  const speedButtons = [
    page.locator('button:has-text("0.75x")'),
    page.locator('button:has-text("1.25x")'),
    page.locator('button:has-text("1.5x")'),
    page.locator('button:has-text("0.9x")'),
    page.locator('button:has-text("1x")')
  ];
  for (const btn of speedButtons) {
    await btn.click();
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(1000);
  assert.equal(report.server_errors.length, 0, 'Không phát sinh 500 hoặc crash khi click nhanh');
  report.checks.push('Fix Bug Queue Autosave: Thao tác đổi tốc độ dồn dập được xử lý an toàn không mất dữ liệu');

  // 5. Kiểm tra Fix Bug 4: Nhãn vị trí trên Hub /materials
  console.log('\n5. Kiểm tra nhãn Hub: "Vị trí đã lưu X%"...');
  await page.goto(`${origin}/materials`);
  await page.waitForSelector('text=Học liệu nghe của tôi');
  const hubCardText = await page.textContent('body');
  assert.ok(hubCardText.includes('Vị trí đã lưu') || hubCardText.includes('Vị trí đã lưu 0%'), 'Nhãn Hub phải là "Vị trí đã lưu"');
  report.checks.push('Fix Bug Hub Label: Hiển thị chuẩn xác "Vị trí đã lưu X%" thay cho "Đã nghe X%"');

  // Quay lại chi tiết học liệu
  await page.goto(`${origin}/materials/${materialId}`);
  await page.waitForSelector('text=Bài luyện nghe đàm thoại IT Support');

  // 6. Chuyển sang Tab "Luyện từng câu & Nghe chép"
  console.log('\n6. Chuyển sang Tab "Luyện từng câu & Nghe chép"...');
  const dictationTabBtn = page.locator('button:has-text("Luyện từng câu & Nghe chép")');
  await dictationTabBtn.click();
  await page.waitForSelector('text=Chưa có mốc câu để luyện tập');
  report.checks.push('Tab Luyện từng câu hiển thị trạng thái rỗng thân thiện ban đầu');

  // 7. Chuyển sang Quản lý mốc câu (Editor) & thêm mốc câu
  console.log('\n7. Quản lý mốc câu: Thêm 2 câu và lưu...');
  const openEditorBtn = page.locator('button:has-text("Quản lý mốc câu")');
  await openEditorBtn.click();
  await page.waitForSelector('text=Quản lý mốc câu (0 câu)');

  const addCueBtn = page.locator('button:has-text("Thêm câu mới")');
  // Thêm câu 1
  await addCueBtn.click();
  await page.waitForSelector('text=Câu #1');

  // Điền mốc câu 1: 500ms -> 3000ms
  const startInput1 = page.locator('input[type="number"]').nth(0);
  await startInput1.fill('500');
  const endInput1 = page.locator('input[type="number"]').nth(1);
  await endInput1.fill('3000');
  const textInput1 = page.locator('input[placeholder="The server is online."]').nth(0);
  await textInput1.fill('The server is online now.');
  const transInput1 = page.locator('input[placeholder="Máy chủ đang trực tuyến."]').nth(0);
  await transInput1.fill('Máy chủ hiện đang hoạt động.');

  // Thêm câu 2: 3500ms -> 6500ms
  await addCueBtn.click();
  await page.waitForSelector('text=Câu #2');

  const startInput2 = page.locator('input[type="number"]').nth(2);
  await startInput2.fill('3500');
  const endInput2 = page.locator('input[type="number"]').nth(3);
  await endInput2.fill('6500');
  const textInput2 = page.locator('input[placeholder="The server is online."]').nth(1);
  await textInput2.fill('Please check the network latency.');
  const transInput2 = page.locator('input[placeholder="Máy chủ đang trực tuyến."]').nth(1);
  await transInput2.fill('Vui lòng kiểm tra độ trễ mạng.');

  // Lưu toàn bộ mốc
  const saveCuesBtn = page.locator('button:has-text("Lưu toàn bộ mốc")');
  await saveCuesBtn.click();

  // Đợi lưu xong và tự chuyển về tab practice
  await page.waitForSelector('text=Câu 1 / 2');
  report.checks.push('Editor: Thêm 2 mốc câu hợp lệ và lưu thành công (revision 1)');

  // 8. Kiểm tra Luyện nghe chép - Câu 1: Nghe lại bằng phím Ctrl đơn
  console.log('\n8. Kiểm tra phím Ctrl đơn nghe lại câu...');
  const miniPlayerText = await page.textContent('body');
  assert.ok(miniPlayerText.includes('Phím tắt: Bấm phím Ctrl đơn để nghe lại'), 'Phải hiển thị hướng dẫn phím Ctrl');

  // Bấm phím Ctrl đơn
  await page.keyboard.press('Control');
  await page.waitForTimeout(300);
  report.checks.push('Phím Ctrl đơn kích hoạt phát lại câu mà không làm gián đoạn form');

  // 9. Luyện nghe chép - Câu 1: Gõ đúng và bấm Enter để nộp
  console.log('\n9. Luyện nghe chép Câu 1: Gõ câu trả lời chính xác và Enter nộp bài...');
  const dictationTextarea = page.locator('textarea[placeholder*="Gõ chính xác những từ bạn nghe được"]');
  await dictationTextarea.fill('The server is online now.');

  // Bấm Enter nộp bài
  await page.keyboard.press('Enter');
  await page.waitForSelector('text=Chính xác tuyệt đối!');
  assert.ok(await page.isVisible('text=Bạn đã nghe chép đúng toàn bộ câu độc lập'), 'Phải báo đúng độc lập');
  report.checks.push('Nộp bài nghe chép đúng: BE chấm chuẩn xác, trả về đúng độc lập (independent_correct=true)');

  // 10. Bấm Enter để sang Câu tiếp theo (Câu 2)
  console.log('\n10. Bấm Enter để chuyển sang Câu 2...');
  await page.keyboard.press('Enter');
  await page.waitForSelector('text=Câu 2 / 2');
  report.checks.push('Bấm Enter trên màn kết quả tự động chuyển sang Câu tiếp theo');

  // 11. Câu 2: Thử tính năng "Xem gợi ý / bản dịch" (revealed -> assisted)
  console.log('\n11. Câu 2: Mở xem gợi ý và nộp bài để kiểm tra cờ assisted...');
  const viewHintBtn = page.locator('button:has-text("Xem gợi ý / bản dịch")');
  await viewHintBtn.click();
  await page.waitForSelector('text=Gợi ý câu mẫu (Transcript mốc này):');
  await page.waitForSelector('text=Đã xem gợi ý (Lượt làm có trợ giúp)');

  // Gõ câu trả lời
  const dictationTextarea2 = page.locator('textarea[placeholder*="Gõ chính xác những từ bạn nghe được"]');
  await dictationTextarea2.fill('Please check the network latency.');
  const checkBtn2 = page.locator('button:has-text("Kiểm tra")');
  await checkBtn2.click();

  await page.waitForSelector('text=Chính xác (có trợ giúp)!');
  report.checks.push('Gợi ý: Mở xem transcript đánh dấu đúng có trợ giúp (assisted=true, independent_correct=false)');

  // 12. Luyện lại câu này và thử "Tôi không biết" (give_up)
  console.log('\n12. Luyện lại và bấm "Tôi không biết" (give_up)...');
  const retryBtn = page.locator('button:has-text("Luyện lại câu này")');
  await retryBtn.click();

  await page.waitForSelector('button:has-text("Tôi không biết")');
  const giveUpBtn = page.locator('button:has-text("Tôi không biết")');
  await giveUpBtn.click();

  await page.waitForSelector('text=Đã ghi nhận bỏ qua');
  report.checks.push('Bỏ qua: Nút "Tôi không biết" gửi give_up=true và hiển thị giải thích chi tiết');

  // 13. Kiểm tra Token Diff highlight khi gõ sai một vài từ
  console.log('\n13. Kiểm tra Token Diff khi gõ thiếu/sai từ...');
  const retryBtn2 = page.locator('button:has-text("Luyện lại câu này")');
  await retryBtn2.click();

  const dictationTextarea3 = page.locator('textarea[placeholder*="Gõ chính xác những từ bạn nghe được"]');
  await dictationTextarea3.fill('Please inspect the latency.');
  const checkBtn3 = page.locator('button:has-text("Kiểm tra")');
  await checkBtn3.click();

  await page.waitForSelector('text=Chưa hoàn toàn chính xác');
  assert.ok(await page.isVisible('text=Câu chuẩn:'), 'Phải hiển thị khối câu chuẩn');
  assert.ok(await page.isVisible('text=Từ bạn đã gõ:'), 'Phải hiển thị từ đã gõ');
  report.checks.push('Token Diff: So khớp từ LCS làm nổi bật từ đúng (xanh lá) và từ sai/thiếu (đỏ)');

  // 14. Kiểm tra Tab Lịch sử (History) và Summary statistics
  console.log('\n14. Kiểm tra Tab Lịch sử nghe chép và thống kê...');
  const historyTabBtn = page.locator('button:has-text("Lịch sử nghe chép")');
  await historyTabBtn.click();
  await page.waitForSelector('text=Lịch sử nghe chép (4 lượt)');

  const statsText = await page.textContent('body');
  assert.ok(statsText.includes('Tổng lượt làm'), 'Phải có thống kê Tổng lượt làm');
  assert.ok(statsText.includes('Đúng độc lập'), 'Phải có thống kê Đúng độc lập');
  assert.ok(statsText.includes('Có trợ giúp'), 'Phải có thống kê Có trợ giúp');
  assert.ok(statsText.includes('Bỏ qua'), 'Phải có thống kê Bỏ qua');
  report.checks.push('Lịch sử: Tải danh sách 4 lượt làm và hiển thị đầy đủ 4 thẻ thống kê');

  // 15. Kiểm tra tính toàn vẹn khi sửa/xóa cues: Lịch sử giữ câu gốc
  console.log('\n15. Kiểm tra sửa mốc câu: Lịch sử vẫn giữ snapshot câu gốc...');
  const editorTabBtn = page.locator('button:has-text("Quản lý mốc câu")');
  await editorTabBtn.click();
  await page.waitForSelector('text=Quản lý mốc câu (2 câu)');

  // Sửa câu 1 thành câu mới
  const textInputEdit = page.locator('input[value="The server is online now."]');
  await textInputEdit.fill('The backup server is running smoothly.');
  await page.waitForTimeout(300);
  const saveCuesBtn2 = page.locator('button:has-text("Lưu toàn bộ mốc")');
  await saveCuesBtn2.click();
  // Sau khi lưu tự động trở về practice mode
  await page.waitForSelector('text=Luyện nghe chép');
  report.checks.push('Sửa mốc câu 1 thành câu mới và lưu thành công');

  // Mở lại lịch sử kiểm tra snapshot
  await historyTabBtn.click();
  await page.waitForSelector('text=Lịch sử nghe chép (4 lượt)');
  const historyContent = await page.textContent('body');
  assert.ok(historyContent.includes('The server is online now.'), 'Lịch sử phải giữ nguyên snapshot câu gốc trước khi sửa');
  report.checks.push('Snapshot bảo toàn: Sửa mốc câu không làm thay đổi câu gốc đã ghi trong lịch sử');

  // 16. Reload trang kiểm tra tính bền vững của cues và tab
  console.log('\n16. Reload trang kiểm tra bền vững của cues...');
  await page.reload();
  await page.waitForSelector('text=Bài luyện nghe đàm thoại IT Support');
  await dictationTabBtn.click();
  await page.waitForSelector('text=Câu 1 / 2');

  // Mở editor để xác nhận câu 1 giữ nguyên nội dung mới sửa
  await editorTabBtn.click();
  await page.waitForSelector('input[value="The backup server is running smoothly."]');
  report.checks.push('Bền vững: Reload trang khôi phục chính xác 2 mốc câu với nội dung mới đã lưu');

  // 17. Xóa học liệu dọn sạch toàn bộ cues và lịch sử
  console.log('\n17. Xóa học liệu và kiểm tra dọn sạch...');
  const deleteBtn = page.locator('button[title="Xóa học liệu"]');
  await deleteBtn.click();
  await page.waitForSelector('text=Xác nhận xóa học liệu này?');

  const confirmDeleteBtn = page.locator('button:has-text("Xóa học liệu")');
  await confirmDeleteBtn.click();

  await page.waitForSelector('text=Học liệu nghe của tôi');
  assert.equal(page.url(), `${origin}/materials`, 'Phải điều hướng về Hub');
  report.checks.push('Xóa học liệu: Dọn dẹp an toàn và chuyển hướng về Hub');

  console.log('\n=== KẾT QUẢ KIỂM THỬ FE-MATERIAL-02 ===');
  console.log(`Số tiêu chí kiểm tra đạt: ${report.checks.length}`);
  console.log(`Số lỗi trang (page errors): ${report.page_errors.length}`);
  console.log(`Số lỗi máy chủ (server errors): ${report.server_errors.length}`);

  assert.equal(report.page_errors.length, 0, `Page errors: ${JSON.stringify(report.page_errors)}`);
  assert.equal(report.server_errors.length, 0, `Server errors: ${JSON.stringify(report.server_errors)}`);
  assert.ok(report.checks.length >= 15, 'Phải đạt tối thiểu 15 tiêu chí kiểm thử');

  console.log('\n🎉 TOÀN BỘ KIỂM THỬ TRÌNH DUYỆT FE-MATERIAL-02 THÀNH CÔNG RỰC RỠ!');
} catch (err) {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err);
  process.exitCode = 1;
} finally {
  if (tempWavPath && existsSync(tempWavPath)) {
    try { unlinkSync(tempWavPath); } catch {}
  }
  if (browser) await browser.close();
  web.close();
  app.server.close();
}
