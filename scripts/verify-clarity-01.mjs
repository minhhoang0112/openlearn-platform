import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createApp } from '../server/app.mjs';

const require = createRequire(
  'C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json'
);
const { chromium } = require('playwright-core');

const origins = [];
const app = createApp({ origins });
const root = resolve('dist');

app.server.listen(0, '127.0.0.1');
await once(app.server, 'listening');
const upstream = `http://127.0.0.1:${app.server.address().port}`;

const apiRequests = [];

const web = createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    const chunks = [];
    for await (const b of req) chunks.push(b);
    const bodyBuf = Buffer.concat(chunks);
    let parsedBody = null;
    if (bodyBuf.length) {
      try {
        parsedBody = JSON.parse(bodyBuf.toString('utf8'));
      } catch {
        parsedBody = bodyBuf.toString('utf8');
      }
    }
    apiRequests.push({
      method: req.method,
      url: req.url,
      body: parsedBody,
    });
    const r = await fetch(upstream + req.url, {
      method: req.method,
      headers: req.headers,
      ...(bodyBuf.length ? { body: bodyBuf } : {}),
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
    ({ '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] || 'text/html'
  );
  res.end(readFileSync(file));
});

web.listen(0, '127.0.0.1');
await once(web, 'listening');
const origin = `http://127.0.0.1:${web.address().port}`;
origins.push(origin);

let browser;
const report = {
  date: '2026-10-24',
  criteria: {},
  page_errors: [],
};

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
      ...(body ? { data: body } : {}),
    });
    const json = await r.json();
    return { status: r.status(), ...json };
  };

  // Register fresh learner
  await api('POST', '/auth/register', {
    email: 'clarity-verify@test.invalid',
    name: 'Clarity Learner',
    password: 'clarity private password',
  });

  // =========================================================================
  // CRITERION 1 & 5: Fresh account on /repetition-study + Sidebar navigation
  // =========================================================================
  apiRequests.length = 0;
  await page.goto(origin + '/repetition-study');
  await page.getByTestId('srs-due-count').waitFor();
  await page.waitForTimeout(300);

  const calledSetsOnFreshSrs = apiRequests.some((r) => /^\/api\/v1\/sets(?:\?|$)/.test(r.url));
  const overviewText = await page.locator('body').innerText();
  const hasFake305 = overviewText.includes('305');
  const hasFakePremium = overviewText.includes('OpenQuiz Premium') || overviewText.includes('OpenLearn Premium');
  const hasFakeSaveSettingsBtn = (await page.getByRole('button', { name: /Lưu cài đặt/i }).count()) > 0;

  // Check sidebar has both Trang chủ and Học hôm nay
  const sidebarHomeCount = await page.getByRole('button', { name: 'Trang chủ', exact: true }).count();
  const sidebarTodayCount = await page.getByRole('button', { name: 'Học hôm nay', exact: true }).count();

  // Switch to "Lặp lại ngắt quãng" review mode when due=0 -> must show empty completion state, NOT a random set card
  await page.getByRole('button', { name: /Lặp lại ngắt quãng/i }).first().click();
  await page.getByTestId('srs-empty-state').waitFor();

  mkdirSync('docs/anti-reference', { recursive: true });
  await page.screenshot({ path: 'docs/anti-reference/clarity-01-empty-srs.png', fullPage: true });

  assert.equal(calledSetsOnFreshSrs, false, 'Fresh SRS overview must not call /api/v1/sets as fallback');
  assert.equal(hasFake305, false, 'SRS overview must not contain fake 305 fallback');
  assert.equal(hasFakePremium, false, 'SRS overview must not contain fake Premium card');
  assert.equal(hasFakeSaveSettingsBtn, false, 'SRS overview must not contain fake settings save form');
  assert.ok(sidebarHomeCount >= 1, 'Sidebar must have explicit Trang chủ button');
  assert.ok(sidebarTodayCount >= 1, 'Sidebar must have explicit Học hôm nay button');

  report.criteria.criterion_1_fresh_srs = {
    passed: true,
    called_sets_fallback: calledSetsOnFreshSrs,
    has_fake_305: hasFake305,
    has_fake_premium: hasFakePremium,
    has_fake_save_settings: hasFakeSaveSettingsBtn,
  };

  // =========================================================================
  // CRITERION 5 (continued): Home (/), Today (/today), and Practice (/practice)
  // =========================================================================
  await page.getByRole('button', { name: 'Trang chủ', exact: true }).first().click();
  await page.waitForURL(origin + '/');
  await page.getByText('Chọn cách học hôm nay:').waitFor();

  await page.getByRole('button', { name: 'Học hôm nay', exact: true }).first().click();
  await page.waitForURL(origin + '/today');
  await page.getByText('Trang chủ & Kho từ vựng').waitFor();

  await page.getByRole('button', { name: 'Luyện tập', exact: true }).first().click();
  await page.waitForURL(origin + '/practice');
  await page.getByText('1. Học liệu nghe độc lập').waitFor();
  await page.getByText('2. Bài luyện theo bộ từ').waitFor();
  // Ensure no mode is pre-selected before user clicks
  await page.getByText('Bước 2: Hãy bấm chọn một chế độ bài luyện ở mục 2 phía trên trước').waitFor();

  report.criteria.criterion_5_navigation_and_practice = {
    passed: true,
    sidebar_home_count: sidebarHomeCount,
    sidebar_today_count: sidebarTodayCount,
  };

  // =========================================================================
  // CRITERION 2, 3, 4, 6, 7: Seed 2 sets, test due mastered words, synonyms, rating, 409 conflict, and scoped mode launches
  // =========================================================================
  const setA = (
    await api('POST', '/sets', {
      title: 'Bộ Từ A - Gia Đình',
      words: [
        { term: 'mother', definition: 'mẹ', synonyms: 'father; unknownsynonymxyz' },
        { term: 'father', definition: 'bố' },
      ],
    })
  ).data;
  const setB = (
    await api('POST', '/sets', {
      title: 'Bộ Từ B - Công Việc',
      words: [{ term: 'teacher', definition: 'giáo viên' }],
    })
  ).data;

  const wordsA = (await api('GET', `/sets/${setA.id}`)).data.words;
  const wordsB = (await api('GET', `/sets/${setB.id}`)).data.words;
  const userRow = app.db.prepare("SELECT id FROM users WHERE email='clarity-verify@test.invalid'").get();

  // Initialize progress for wordsA[0] (mastered but due!), wordsA[1] (learning, future due), wordsB[0] (learning, due)
  await api('PATCH', `/words/${wordsA[0].id}/progress`, { quality: 4 });
  await api('PATCH', `/words/${wordsA[1].id}/progress`, { quality: 4 });
  await api('PATCH', `/words/${wordsB[0].id}/progress`, { quality: 4 });

  app.db
    .prepare("UPDATE word_progress SET status='mastered', due_at='2026-01-01T00:00:00Z' WHERE user_id=? AND word_id=?")
    .run(userRow.id, wordsA[0].id);
  app.db
    .prepare("UPDATE word_progress SET status='learning', due_at='2099-01-01T00:00:00Z' WHERE user_id=? AND word_id=?")
    .run(userRow.id, wordsA[1].id);
  app.db
    .prepare("UPDATE word_progress SET status='learning', repetitions=0, due_at='2026-01-01T00:00:00Z' WHERE user_id=? AND word_id=?")
    .run(userRow.id, wordsB[0].id);

  // Add synonyms & example to wordsA[0] via notes
  await api('PUT', `/words/${wordsA[0].id}/notes`, {
    example: 'My mother is a wonderful person.',
    translation: 'Mẹ tôi là một người tuyệt vời.',
    synonyms: 'father; unknownsynonymxyz',
  });

  // Reload /repetition-study -> due=2 (wordsA[0] which is mastered+due, and wordsB[0] which is learning+due)
  apiRequests.length = 0;
  await page.goto(origin + '/repetition-study');
  await page.getByRole('button', { name: /Lặp lại ngắt quãng/i }).first().click();
  await page.getByTestId('srs-flashcard').waitFor();

  // Check scope filter pills: "Cần ôn (2)", "Đang theo dõi (3)", "Thuần thục (1)"
  await page.getByRole('button', { name: /Cần ôn \(2\)/ }).waitFor();
  await page.getByRole('button', { name: /Đang theo dõi \(3\)/ }).waitFor();
  await page.getByRole('button', { name: /Thuần thục \(1\)/ }).waitFor();

  // Verify Criterion 7 & 6 on flashcard back: flip the card (mother)
  const currentHeading = await page.getByTestId('srs-flashcard').getByRole('heading', { level: 2 }).textContent();
  assert.equal(currentHeading?.trim(), 'mother', 'Mastered word that is due must be included in due queue');

  // Click card to flip
  await page.getByTestId('srs-flashcard').click();
  await page.getByText('My mother is a wonderful person.').waitFor();

  // Check that flipping the card made 0 AI calls (only allow_ai: false if any learning-details call was made)
  const aiCallsAfterFlip = apiRequests.filter(
    (r) =>
      (r.url.includes('/learning-details') && r.body?.allow_ai !== false) ||
      r.url.includes('/ai/')
  );
  assert.equal(aiCallsAfterFlip.length, 0, 'Flipping flashcard must trigger 0 AI calls');

  // Toggle translation -> 0 AI calls
  await page.getByRole('button', { name: 'Dịch ví dụ cho mother', exact: true }).click();
  await page.getByText('Mẹ tôi là một người tuyệt vời.').waitFor();

  // Click synonym "father" -> opens popover without flipping card back, looks up dictionary
  const synFatherBtn = page.getByRole('button', { name: 'Từ đồng nghĩa father', exact: true });
  await synFatherBtn.click();
  const popoverRegion = page.getByRole('region', { name: 'Chi tiết từ đồng nghĩa father' });
  await popoverRegion.waitFor();
  await popoverRegion.getByText('bố', { exact: true }).waitFor();

  // Press Escape -> closes popover
  await page.keyboard.press('Escape');
  assert.equal(await popoverRegion.count(), 0, 'Escape must close synonym popover');

  // Click synonym "unknownsynonymxyz" -> must show "Chưa có nghĩa lưu sẵn", NOT parent word's definition ("mẹ")
  const synUnknownBtn = page.getByRole('button', { name: 'Từ đồng nghĩa unknownsynonymxyz', exact: true });
  await synUnknownBtn.click();
  const unknownPopover = page.getByRole('region', { name: 'Chi tiết từ đồng nghĩa unknownsynonymxyz' });
  await unknownPopover.waitFor();
  await unknownPopover.getByText('Chưa có nghĩa lưu sẵn').waitFor();
  await page.keyboard.press('Escape');

  report.criteria.criterion_6_and_7_examples_and_synonyms = {
    passed: true,
    ai_calls_on_flip_and_toggle: aiCallsAfterFlip.length,
  };

  // Test Criterion 4: Rate card (mother) -> sends expected_last_reviewed_at, removes mother from due queue, advances to "teacher" without skipping!
  await page.getByRole('button', { name: /Tốt/i }).click();
  await page.getByTestId('srs-flashcard').getByRole('heading', { level: 2, name: 'teacher' }).waitFor();

  // Now simulate another tab reviewing "teacher" in DB before clicking rate in current tab -> 409 REVIEW_CHANGED
  await api('PATCH', `/words/${wordsB[0].id}/progress`, { quality: 4 });
  await page.getByRole('button', { name: /Tốt/i }).click();
  await page.getByText('Từ này vừa được ôn ở phiên khác. Đã tải lại lịch ôn.').waitFor();

  report.criteria.criterion_2_and_4_srs_queue_and_rating = {
    passed: true,
  };

  // =========================================================================
  // CRITERION 3: Mode tabs in /repetition-study launch real exercises scoped to word_ids
  // =========================================================================
  // Make wordsA[0] due again so we have 1 due word in Set A
  app.db
    .prepare("UPDATE word_progress SET status='learning', due_at='2026-01-01T00:00:00Z' WHERE user_id=? AND word_id=?")
    .run(userRow.id, wordsA[0].id);

  await page.goto(origin + '/repetition-study');
  await page.getByRole('button', { name: /Lặp lại ngắt quãng/i }).first().click();
  await page.getByRole('button', { name: 'Viết', exact: true }).click();
  await page.getByText('Bộ Từ A - Gia Đình').waitFor();

  await page.screenshot({ path: 'docs/anti-reference/clarity-01-srs-write-selector.png', fullPage: true });

  // Click "Bắt đầu Viết (1 từ)" on Set A -> opens /study/:set?word_ids=...&review_scope=due&study_mode=write
  apiRequests.length = 0;
  await page.getByRole('button', { name: /Bắt đầu Viết \(1 từ\)/i }).click();
  await page.waitForURL(new RegExp(`/study/${setA.id}\\?`));

  // Wait for POST /study/sessions and verify payload has settings.word_ids=[wordsA[0].id] and settings.due_only=true
  await page.getByLabel('Câu trả lời').waitFor();
  const sessionReq = apiRequests.find((r) => r.method === 'POST' && r.url === '/api/v1/study/sessions');
  assert.ok(sessionReq, 'Write mode launch must call POST /api/v1/study/sessions');
  assert.deepEqual(sessionReq.body.settings.word_ids, [wordsA[0].id], 'Write mode must pass exact word_ids');
  assert.equal(sessionReq.body.settings.due_only, true, 'Due scope must set due_only: true');

  // Also verify Reading mode mount does NOT call POST /exercise-attempts with AI automatically
  apiRequests.length = 0;
  await page.goto(origin + `/reading/${setA.id}?word_ids=${wordsA[0].id}&review_scope=due`);
  await page.getByText('Luyện vận dụng từ đến hạn — không thay lượt ôn nhớ').waitFor();
  await page.getByRole('button', { name: /(?:Tạo bài đọc hiểu bằng AI|Kết nối AI để tạo bài đọc hiểu)/i }).waitFor();
  const readingPostOnMount = apiRequests.filter(
    (r) => r.method === 'POST' && r.url.startsWith('/api/v1/exercise-attempts')
  );
  assert.equal(readingPostOnMount.length, 0, 'ReadingExercise mount must not POST /exercise-attempts automatically');

  report.criteria.criterion_3_scoped_mode_launches = {
    passed: true,
    study_session_payload: sessionReq.body,
    reading_post_on_mount: readingPostOnMount.length,
  };

  assert.equal(report.page_errors.length, 0, `Unexpected page errors: ${report.page_errors.join('; ')}`);
} finally {
  writeFileSync('docs/clarity-01-verification.json', JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  web.closeAllConnections();
  await new Promise((r) => web.close(r));
  app.server.closeAllConnections();
  await app.close();
  console.log(JSON.stringify(report, null, 2));
}

