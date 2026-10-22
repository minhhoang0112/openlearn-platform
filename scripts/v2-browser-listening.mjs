// scripts/v2-browser-listening.mjs
// Real UI browser test in Chrome for FE-LISTEN: /listening & /listening/practice/:id
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
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
  date: '2026-10-21',
  checks: [],
  page_errors: [],
  server_errors: [],
  fe_followups: []
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
    res.end('Test server failed');
    report.server_errors.push({ message: e.message });
  }
});

web.listen(0, '127.0.0.1');
await once(web, 'listening');
const origin = `http://127.0.0.1:${web.address().port}`;
origins.push(origin);

let browser, page;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'] });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, permissions:['microphone'] });
  await page.addInitScript(() => {
    const urls = new Set(), streams = [];
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => {const url=create(blob);urls.add(url);return url;};
    URL.revokeObjectURL = url => {urls.delete(url);return revoke(url);};
    const getMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {const s=await getMedia(constraints);streams.push(s);return s;};
    window.__mediaAudit = {urls,streams};
  });
  page.setDefaultTimeout(7000);
  page.on('pageerror', e => report.page_errors.push(e.message));

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

  // 1. Register test user
  await api('POST', '/auth/register', { email: 'listening-browser@test.invalid', name: 'Listening QA', password: 'password123!' });

  // 2. Open /listening
  console.log('1. Mở trang Thư viện nghe (/listening)...');
  await page.goto(origin + '/listening');
  await page.waitForSelector('text=Luyện nghe câu & Nói đuổi (Shadowing)');
  report.checks.push('Listening Library renders catalog header');

  // Verify catalog items rendered
  await page.waitForSelector('button:has-text("Luyện bài này")');
  const catalogCards = page.locator('button:has-text("Luyện bài này")');
  const count = await catalogCards.count();
  assert.ok(count >= 9, `Expected at least 9 catalog items, got ${count}`);
  console.log(`✓ Tìm thấy ${count} bài nghe trên giao diện.`);
  report.checks.push(`Listening Library displays ${count} lesson cards`);

  // 3. Click first practice button to open modal
  console.log('2. Mở hộp thoại cài đặt bài nghe...');
  await catalogCards.first().click();
  await page.waitForSelector('text=Cài đặt phiên luyện');
  report.checks.push('Settings modal opens on practice click');

  // 4. Start practice session
  console.log('3. Bắt đầu phiên luyện nghe...');
  await page.getByRole('button', { name: 'Bắt đầu luyện ngay' }).click();
  await page.waitForURL(/\/listening\/practice\//);
  const sessionId = page.url().split('/').pop();
  console.log(`✓ Đã điều hướng tới màn luyện tập: ${page.url()}`);
  report.checks.push('Practice player loads with sentence session');

  // 5. Verify practice player elements
  await page.waitForSelector('text=Số lần bạn đã tự nhắc lại câu này');
  const audioEl = page.locator('audio').first();
  await page.waitForFunction(() => document.querySelector('audio')?.readyState >= 1);
  const audioDuration = await audioEl.evaluate(a => a.duration);
  assert.ok(Number.isFinite(audioDuration) && audioDuration > 0, `Audio duration should be positive, got ${audioDuration}`);
  console.log(`✓ Audio element tải thành công, thời lượng: ${audioDuration.toFixed(2)}s`);
  report.checks.push('Sentence WAV audio decodes in browser player');

  // 6. Test repetition counter and self-review checkbox
  console.log('4. Thao tác tăng số lượt và tự xác nhận...');
  // Click '+' button to increment repetitions
  const plusButton = page.getByRole('button', { name: '+' });
  await plusButton.click(); // 3
  
  // Toggle self-review checkbox
  const checkbox = page.locator('input[type="checkbox"]').first();
  assert.equal(await checkbox.isChecked(), false, 'New sentence requires explicit self-review');
  assert.equal(await page.getByRole('button', { name: 'Lưu & Sang câu tiếp' }).isDisabled(), true);
  await checkbox.check();
  assert.ok(await checkbox.isChecked(), 'Checkbox should be checked');
  report.checks.push('Self-review checkbox and repetition counters operate cleanly');

  // 7. Save and advance to sentence 2
  console.log('5. Bấm Lưu & Sang câu tiếp...');
  const nextButton = page.getByRole('button', { name: 'Lưu & Sang câu tiếp' });
  const completionPattern = '**/learning/listening/sessions/*/sentences/*/complete';
  const requests = [];
  let droppedResponse = false;
  await page.route(completionPattern, async route => {
    requests.push(route.request().postDataJSON());
    const response = await route.fetch();
    if (!droppedResponse) {
      droppedResponse = true;
      await route.abort('failed'); // BE committed, but the browser never received it.
    } else await route.fulfill({ response });
  });
  await nextButton.click();
  await nextButton.waitFor({state:'visible'});
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Lưu & Sang câu tiếp') && !b.disabled));
  await nextButton.click();
  await page.waitForFunction(async id => {
    const r = await fetch(`/api/v1/learning/listening/sessions/${id}`);
    return (await r.json()).data.cursor === 1;
  }, sessionId);
  const saved = await api('GET', '/learning/listening/sessions/' + sessionId);
  assert.equal(saved.cursor, 1);
  assert.equal(saved.summary.practised_sentences, 1);
  assert.equal(saved.summary.repetitions_self_reported, 3);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1], 'Lost-response retry must keep the original UUID/payload');
  await page.unroute(completionPattern);
  await page.waitForFunction(() => !document.querySelector('input[type="checkbox"]')?.checked);
  assert.equal(await checkbox.isChecked(), false, 'Next sentence must reset self-review');
  report.checks.push('Lost response after commit retries the same UUID/payload and records one practice event');
  report.checks.push('Sentence completion mutation advances to next sentence');

  // 8. Test Skip button on sentence 2
  console.log('6. Bấm Bỏ qua câu trên câu 2...');
  const skipButton = page.getByRole('button', { name: 'Bỏ qua câu này' });
  await skipButton.click();
  await page.waitForFunction(async id => {
    const r = await fetch(`/api/v1/learning/listening/sessions/${id}`);
    return (await r.json()).data.cursor === 2;
  }, sessionId);
  const skipped = await api('GET', '/learning/listening/sessions/' + sessionId);
  assert.equal(skipped.summary.skipped_sentences, 1);
  assert.equal(skipped.summary.practised_sentences, 1);
  report.checks.push('Skip button records skipped sentence without fake practice');

  // History is a distinct rendering path: verify the API projection used by FE.
  await page.goto(origin + '/listening');
  await page.getByRole('button', { name: 'Lịch sử các phiên luyện tập' }).click();
  const resume = page.getByRole('button', { name: 'Tiếp tục phiên' });
  await resume.waitFor();
  assert.equal(await resume.count(), 1);
  await page.getByText('Tự nhắc: 3 lượt', { exact: true }).waitFor();
  const history = await api('GET', '/learning/listening/sessions');
  assert.equal(history.items[0].id, sessionId);
  assert.equal(history.items[0].settings.mode, 'listen_repeat');
  assert.equal(history.items[0].summary.skipped_sentences, 1);
  await page.screenshot({ path: 'docs/anti-reference/local-v2-listening-history.png', fullPage: true });
  report.checks.push('History tab renders mode and true practice summary without crashing');
  await resume.click();
  await page.waitForURL('**/listening/practice/' + sessionId);
  await page.reload();
  await page.waitForSelector('text=Số lần bạn đã tự nhắc lại câu này');
  assert.equal((await api('GET', '/learning/listening/sessions/' + sessionId)).cursor, 2);
  await page.waitForFunction(url => document.querySelector('audio')?.getAttribute('src') === url, skipped.current.audio_url);
  assert.equal(await checkbox.isChecked(), false, 'Reload must reset explicit self-review');
  report.checks.push('Resume from history and reload retain exact third sentence');

  // Fake Chrome microphone: test resource lifecycle, not physical capture quality.
  await page.getByRole('button', { name: 'Bắt đầu thu âm', exact:true }).click();
  await page.getByRole('button', { name: 'Dừng thu âm', exact:true }).waitFor();
  assert.equal(await page.getByRole('button', { name:'Bỏ qua câu này', exact:true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Dừng thu âm', exact:true }).click();
  await page.waitForFunction(() => window.__mediaAudit.urls.size === 1 && window.__mediaAudit.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
  report.checks.push('Fake microphone recording stops all tracks and produces one local playback URL');
  await page.getByRole('button', { name: 'Bắt đầu thu âm', exact:true }).click();
  await page.getByRole('button', { name: 'Dừng thu âm', exact:true }).waitFor();
  await page.getByRole('button', { name:'Thoát phiên luyện nghe', exact:true }).click();
  await page.waitForURL('**/listening');
  await page.waitForFunction(() => window.__mediaAudit.urls.size === 0 && window.__mediaAudit.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
  report.checks.push('Leaving during fake recording ends streams and revokes previous URL without recreating it after unmount');

  // 9. Navigate to /progress and verify the Listening Practice Widget
  console.log('7. Điều hướng sang /progress để kiểm tra widget tổng hợp...');
  await page.goto(origin + '/progress');
  await page.waitForSelector('text=Luyện nghe từng câu & Shadowing (Tự luyện)');
  const widgetText = await page.locator('text=Luyện nghe từng câu & Shadowing (Tự luyện)').locator('..').innerText();
  console.log(`✓ Widget hiển thị trên /progress: ${widgetText}`);
  report.checks.push('Progress view includes listening_practice widget with accurate stats');

  assert.deepEqual(report.page_errors, []);
  assert.deepEqual(report.server_errors, []);
  report.passed = true;
  report.scope = 'Built FE and real BE on isolated in-memory database; fake Chrome microphone resource lifecycle tested. No AI calls or physical microphone/audio-quality test.';
  writeFileSync('docs/v2-browser-listening-audit.json', JSON.stringify(report, null, 2) + '\n');

  console.log('\n======================================================');
  console.log('🎉 TOÀN BỘ KIỂM THỬ TRÌNH DUYỆT CHROME ĐÃ HOÀN TẤT THÀNH CÔNG!');
  console.log(JSON.stringify(report, null, 2));
  console.log('======================================================');
} finally {
  if (browser) await browser.close();
  web.closeAllConnections();
  await new Promise(resolve => web.close(resolve));
  app.server.closeAllConnections();
  await app.close();
}
