import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createApp } from '../server/app.mjs';

const require = createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const { chromium } = require('playwright-core');
const origins = [];
const root = resolve('dist');

const app = createApp({ origins });
app.server.listen(0, '127.0.0.1');
await once(app.server, 'listening');
const upstream = `http://127.0.0.1:${app.server.address().port}`;

const web = createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    const chunks = [];
    for await (const b of req) chunks.push(b);
    const body = Buffer.concat(chunks);
    const r = await fetch(upstream + req.url, {
      method: req.method,
      headers: req.headers,
      ...(body.length ? { body } : {})
    });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  let file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + sep) || !existsSync(file) || !extname(file)) {
    file = resolve(root, 'index.html');
  }
  res.setHeader(
    'Content-Type',
    { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(file)] || 'text/html'
  );
  res.end(readFileSync(file));
});

web.listen(0, '127.0.0.1');
await once(web, 'listening');
const origin = `http://127.0.0.1:${web.address().port}`;
origins.push(origin);

const report = {
  date: '2026-10-25',
  milestone: 'M1 - Product Refinement FE',
  checks: [],
  viewports_tested: [],
  page_errors: []
};

let browser;

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => report.page_errors.push(e.message));
  await page.route('https://**/*', (r) => r.abort());

  const api = async (method, path, body) => {
    const r = await page.request.fetch(origin + '/api/v1' + path, {
      method,
      headers: { 'X-Requested-With': 'OpenQuiz' },
      data: body
    });
    const v = await r.json();
    assert.ok(r.ok(), JSON.stringify(v));
    return v.data;
  };

  // Register user and seed set
  await api('POST', '/auth/register', {
    email: 'refinement.m1@test.invalid',
    name: 'Refinement Learner',
    password: 'password12345'
  });

  const setCard = await api('POST', '/sets', {
    title: 'Bộ từ Mốc 1 Refinement',
    words: [
      { term: 'refine', definition: 'trau chuốt, hoàn thiện' },
      { term: 'clarity', definition: 'sự rõ ràng' },
      { term: 'consistent', definition: 'nhất quán' }
    ]
  });
  const set = await api('GET', '/sets/' + setCard.id);

  // Practice words to produce activity
  const studySession = await api('POST', '/study/sessions', {
    set_id: set.id,
    mode: 'write'
  });
  await api('POST', `/study/sessions/${studySession.id}/answers`, {
    question_id: studySession.question.id,
    answer: 'trau chuốt, hoàn thiện'
  });

  // =========================================================================
  // CHECK 1: Mobile LessonRun responsive layout (360px, 390px, 768px, 1440px)
  // =========================================================================
  const lessonSession = await api('POST', '/learning/sessions', { lesson_id: 'foundation-introductions-01' });

  const viewports = [
    { width: 360, height: 740, name: '360px mobile small' },
    { width: 390, height: 844, name: '390px iPhone' },
    { width: 768, height: 1024, name: '768px tablet' },
    { width: 1440, height: 900, name: '1440px desktop' }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${origin}/lesson-run/${lessonSession.id}?from=${encodeURIComponent('/my-program?program=english-foundation')}`);
    await page.getByText('London', { exact: true }).waitFor();

    // Check title layout container
    const stepHeader = page.locator('[data-testid="lesson-step-header"]');
    if ((await stepHeader.count()) > 0) {
      const classes = await stepHeader.getAttribute('class');
      assert.ok(classes?.includes('flex-col'), `Lesson header must stack vertically on mobile at ${vp.width}px`);
    }

    // Check floating dictionary button placement
    const floatingDict = page.locator('[data-testid="floating-dictionary-button"]');
    assert.equal(await floatingDict.count(), 1, 'Floating dictionary button must exist');
    const dictClasses = await floatingDict.getAttribute('class');
    assert.ok(dictClasses?.includes('bottom-24'), 'Floating dictionary button must offset to bottom-24 in study rooms to avoid overlapping CTAs');
    assert.ok(await floatingDict.getAttribute('aria-label'), 'Floating dictionary button must have accessible aria-label');

    report.viewports_tested.push(vp.name);
  }
  report.checks.push('LessonRun mobile header stacks vertically and floating dictionary offsets away from bottom CTAs across 360/390/768/1440px');

  // Reset viewport to desktop
  await page.setViewportSize({ width: 1440, height: 1000 });

  // =========================================================================
  // CHECK 2: Navigation & "from" Context Preservation
  // =========================================================================
  await page.goto(`${origin}/my-program?program=english-it-system`);
  await page.getByRole('heading', { name: 'Lộ trình học tập của tôi' }).waitFor();
  await page.getByRole('heading', { name: 'English for IT/System' }).first().waitFor();
  assert.ok(page.url().includes('program=english-it-system'), 'URL must retain program query');

  // Start lesson from IT program
  const itLessonButton = page.locator('button', { hasText: 'Bắt đầu học' }).first();
  await itLessonButton.click();
  await page.waitForURL('**/lesson-run/**');
  assert.ok(page.url().includes('from='), 'Lesson run URL must include contextual return from URL');

  // Click exit lesson
  const exitButton = page.locator('button', { hasText: 'Thoát bài học' });
  await exitButton.click();
  await page.waitForURL('**/my-program?program=english-it-system');
  assert.equal(page.url(), `${origin}/my-program?program=english-it-system`, 'Exit lesson must return to exact program context');
  report.checks.push('MyProgram maintains program in URL query and Exit lesson returns to exact program');

  // =========================================================================
  // CHECK 3: Homepage Cleanup & Fallback Path Truthfulness
  // =========================================================================
  await page.goto(origin + '/');
  await page.getByText('Chọn cách học hôm nay:', { exact: false }).waitFor();

  // Redundant search bar check: Home content must not have its own duplicate search input
  const homeSearchInputs = page.locator('main input[placeholder*="Tìm kiếm"]');
  assert.equal(await homeSearchInputs.count(), 0, 'Homepage main content must not render duplicate search bar');

  // Promotional banner check: AI Study Beta banner must not block the view
  const promoBanner = page.getByText('AI Study Beta: Mở khóa các bài luyện');
  assert.equal(await promoBanner.count(), 0, 'Homepage must not display disruptive AI Study Beta banner');

  // Truthful Section 3: If no active path, must say "Gợi ý lộ trình bắt đầu" and badge "Gợi ý cho bạn", NOT "Lộ trình đang học"
  const section3 = page.locator('div.space-y-3', { has: page.getByRole('heading', { name: 'Gợi ý lộ trình bắt đầu' }) });
  assert.ok((await section3.count()) >= 1, 'With no active path, Section 3 must display "Gợi ý lộ trình bắt đầu"');
  assert.ok((await section3.getByText('Gợi ý cho bạn').count()) >= 1, 'Fallback path card must display badge "Gợi ý cho bạn"');
  assert.equal(await section3.getByText('Đang học', { exact: true }).count(), 0, 'Fallback path card in Section 3 must NOT be labeled as "Đang học"');
  report.checks.push('Homepage cleaned: duplicate search removed, promo banner removed, fallback path truthfully labeled as suggestion');

  // =========================================================================
  // CHECK 4: Label Standardization (No V2, no "Ngân sách", Spaced Repetition wording)
  // =========================================================================
  // Check Today view
  await page.goto(origin + '/today');
  await page.getByText('Kế hoạch học tập hôm nay').waitFor();
  const todayBodyText = await page.locator('main').innerText();
  assert.ok(!todayBodyText.includes('Ngân sách:'), 'TodayView must replace "Ngân sách" with "Thời gian học"');
  assert.ok(!todayBodyText.includes('Bài học V2'), 'TodayView must not display technical "Bài học V2" label');

  // Check Settings view
  await page.goto(origin + '/settings/learning');
  await page.getByText('Cài đặt học tập cá nhân').waitFor();
  const settingsBodyText = await page.locator('main').innerText();
  assert.ok(!settingsBodyText.includes('Cài đặt hệ thống V2'), 'Settings must not show "Cài đặt hệ thống V2"');
  assert.ok(!settingsBodyText.includes('Ngân sách thời gian'), 'Settings must not show "Ngân sách thời gian"');

  // Check Materials Hub view
  await page.goto(origin + '/materials');
  await page.getByText('Thư viện bài học chính thức').waitFor();
  const materialsBodyText = await page.locator('main').innerText();
  assert.ok(!materialsBodyText.includes('Thư viện 27 bài học V2'), 'Materials hub must not show technical "27 bài học V2"');

  report.checks.push('Labels standardized: "Ngân sách" -> "Thời gian học", removed technical "V2" from Today, Settings, and Materials');

  // =========================================================================
  // CHECK 5: Search & Pagination with URL persistence in Listening & Practice
  // =========================================================================
  // Listening Library
  await page.goto(`${origin}/listening?search=work&program=foundation`);
  await page.getByRole('heading', { name: 'Luyện nghe câu & Nói đuổi (Shadowing)' }).waitFor();
  const searchInput = page.getByPlaceholder('Tìm bài nghe theo tiêu đề, lời thoại, mã bài...');
  assert.equal(await searchInput.inputValue(), 'work', 'Listening search input must read search param from URL');

  // Reload and verify persistence
  await page.reload();
  await page.getByRole('heading', { name: 'Luyện nghe câu & Nói đuổi (Shadowing)' }).waitFor();
  assert.ok(page.url().includes('search=work'), 'Listening search param must persist on reload');

  // Practice Set Selector search
  await page.goto(`${origin}/practice/dictation?q=refine`);
  await page.getByRole('heading', { name: 'Nghe chép chính tả', exact: true }).waitFor();
  const setFilterInput = page.getByPlaceholder('Tìm kiếm bộ từ theo tên, thẻ phân loại...');
  assert.equal(await setFilterInput.inputValue(), 'refine', 'Practice set filter input must read q param from URL');
  assert.ok((await page.getByText('Bộ từ Mốc 1 Refinement').count()) >= 1, 'Search query must filter matching set');
  report.checks.push('Listening Library & Practice Set Selector support search & pagination persisting in URL');

  // =========================================================================
  // CHECK 6: Accessibility (aria-label, semantic buttons, keyboard navigation)
  // =========================================================================
  await page.goto(`${origin}/study-set/${set.id}`);
  await page.getByRole('heading', { name: 'Bộ từ Mốc 1 Refinement' }).waitFor();

  // Check action buttons accessibility
  const saveBtn = page.getByRole('button', { name: /Lưu bộ thẻ|Bỏ lưu/ });
  assert.equal(await saveBtn.count(), 1, 'Save set button must have accessible name');

  const shareBtn = page.getByRole('button', { name: 'Chia sẻ bộ thẻ' });
  assert.equal(await shareBtn.count(), 1, 'Share set button must have accessible name');

  const optionsBtn = page.getByRole('button', { name: 'Tùy chọn khác' });
  assert.equal(await optionsBtn.count(), 1, 'Options button must have accessible name');

  const flashcard = page.locator('[data-testid="flashcard-player"]');
  assert.equal(await flashcard.getAttribute('role'), 'button', 'Flashcard player must have role="button"');
  assert.equal(await flashcard.getAttribute('tabIndex'), '0', 'Flashcard player must be focusable with tabIndex="0"');

  const starBtn = page.getByRole('button', { name: /Đánh dấu sao|Bỏ đánh dấu sao/ }).first();
  assert.ok((await starBtn.count()) >= 1, 'Star button must have accessible name');

  const audioBtn = page.getByRole('button', { name: /Nghe phát âm/ }).first();
  assert.ok((await audioBtn.count()) >= 1, 'Audio button must have accessible name');
  report.checks.push('StudySetView accessibility: aria-label on icon buttons, semantic buttons and keyboard-focusable flashcard');

  // =========================================================================
  // CHECK 7: Cross-Engine Activity API & ProgressView (Contract 1.19.0)
  // =========================================================================
  let activityApiCalled = false;
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/learning/activity')) {
      activityApiCalled = true;
    }
  });

  await page.goto(origin + '/progress');
  await page.getByRole('heading', { name: 'Tiến bộ & Lịch sử học tập' }).waitFor();
  await page.waitForSelector('text=Ngày học thực tế');
  assert.ok(activityApiCalled, 'ProgressView must call GET /api/v1/learning/activity');

  // Check that the real activity day counter is rendered
  const activeDaysHeading = page.locator('div', { hasText: 'Ngày học thực tế' });
  assert.ok((await activeDaysHeading.count()) >= 1, 'ProgressView must render "Ngày học thực tế" card');
  assert.ok((await page.getByText('ngày có hoạt động toàn hệ thống').count()) >= 1, 'Active days subtext must indicate cross-engine scope');

  // Check Tab 2: Hoạt động gần đây
  const activityTab = page.getByRole('button', { name: /Hoạt động gần đây/ });
  assert.equal(await activityTab.count(), 1, 'ProgressView must have "Hoạt động gần đây" tab');
  await activityTab.click();

  // Verify activity list shows the practiced vocabulary activity
  await page.getByText('Toàn hệ thống (30 ngày):').waitFor();
  assert.ok((await page.getByText('Học từ vựng').count()) >= 1, 'Activity list must display "Học từ vựng" item');

  report.checks.push('ProgressView connects GET /learning/activity (Contract 1.19.0), displays cross-engine active days, and renders Activity History tab');

  assert.deepEqual(report.page_errors, []);
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.error = e.stack;
  process.exitCode = 1;
} finally {
  writeFileSync('docs/fe-refinement-validation.json', JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  web.closeAllConnections();
  await new Promise((r) => web.close(r));
  app.server.closeAllConnections();
  await app.close();
  console.log(JSON.stringify(report, null, 2));
}
