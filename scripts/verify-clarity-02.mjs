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

// Mock AI Gateway Server for deterministic AI testing & 429 simulation
let aiGatewayCalls = [];
let simulateAi429 = false;

const mockAiServer = createServer(async (req, res) => {
  const chunks = [];
  for await (const b of req) chunks.push(b);
  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  aiGatewayCalls.push(payload);

  if (simulateAi429) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Too many AI requests' } }));
    return;
  }

  const { task, input } = payload;
  let responseObj = {};

  if (task === 'speaking_question') {
    const terms = (input?.words || []).map((w) => w.term).join(', ');
    responseObj = {
      question: `How do you apply ${terms} in your daily work?`,
    };
  } else if (task === 'speaking_feedback') {
    responseObj = {
      feedback: `Nhận xét AI: Câu trả lời rất rõ ràng và tự nhiên cho nội dung "${input?.transcript || ''}".`,
    };
  } else if (task === 'speaking_hint') {
    responseObj = {
      hint: 'Hãy nêu ví dụ thực tế tại công ty.',
      example: 'Our brand welcomes every candidate with a fair salary, clear deadline, and flexible schedule.',
    };
  } else if (task === 'conversation') {
    const terms = (input?.words || []).map((w) => w.term).slice(0, 3).join(', ');
    responseObj = {
      reply: `Hello! Let's discuss ${terms || 'your work'}. What do you think?`,
    };
  } else if (task === 'reading') {
    const w0 = input?.words?.[0]?.term || 'brand';
    const w1 = input?.words?.[1]?.term || 'candidate';
    responseObj = {
      passage: `Every strong ${w0} looks for a talented ${w1} to join the team and grow together.`,
      questions: [
        {
          q: `What does a strong ${w0} look for?`,
          options: [`A talented ${w1}`, 'A random tourist', 'Nothing at all', 'Only machines'],
          correct: 0,
          explanation: `The passage explicitly states that every strong ${w0} looks for a talented ${w1}.`,
        },
      ],
    };
  } else if (task === 'translation') {
    responseObj = {
      translation: 'Bản dịch tiếng Việt: Mỗi thương hiệu mạnh đều tìm kiếm một ứng viên tài năng để cùng phát triển.',
    };
  } else if (task === 'word_examples') {
    responseObj = {
      examples: (input?.words || []).map((w) => ({
        word_id: w.word_id,
        example: w.example || `This is an example with ${w.term}.`,
        translation: `Đây là câu ví dụ với ${w.term}.`,
        synonyms: 'associate; peer',
      })),
    };
  } else {
    responseObj = { reply: 'OK' };
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(responseObj));
});

mockAiServer.listen(0, '127.0.0.1');
await once(mockAiServer, 'listening');
const mockAiUrl = `http://127.0.0.1:${mockAiServer.address().port}`;

const origins = [];
const app = createApp({
  origins,
  ai: { provider: 'gateway', url: mockAiUrl },
});
const root = resolve('dist');

app.server.listen(0, '127.0.0.1');
await once(app.server, 'listening');
const upstream = `http://127.0.0.1:${app.server.address().port}`;

const apiRequests = [];
let simulateTranslation429 = false;

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

    if (simulateTranslation429 && req.method === 'POST' && req.url.includes('/translation')) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: {
            code: 'RATE_LIMITED',
            message: 'Bạn đã gửi quá nhiều yêu cầu AI. Vui lòng thử lại sau ít phút.',
          },
        })
      );
      return;
    }

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
  contract_version: '1.17.0',
  criteria: {},
  page_errors: [],
};

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => report.page_errors.push(e.message));
  await page.route('https://**/*', (r) => r.abort());

  // Spy on speechSynthesis.speak in browser context
  await page.addInitScript(() => {
    window.__spokenTexts = [];
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel = () => {};
      window.speechSynthesis.speak = (utterance) => {
        window.__spokenTexts.push(utterance?.text || '');
      };
    } else {
      window.speechSynthesis = {
        cancel: () => {},
        speak: (utterance) => {
          window.__spokenTexts.push(utterance?.text || '');
        },
        getVoices: () => [],
      };
    }
    if (typeof window.SpeechSynthesisUtterance === 'undefined') {
      window.SpeechSynthesisUtterance = function (text) {
        this.text = text;
      };
    }
  });

  const api = async (method, path, body) => {
    const r = await page.request.fetch(origin + '/api/v1' + path, {
      method,
      headers: { 'X-Requested-With': 'OpenQuiz' },
      ...(body ? { data: body } : {}),
    });
    const json = await r.json();
    return { status: r.status(), ...json };
  };

  // Register User A
  await api('POST', '/auth/register', {
    email: 'clarity02-a@test.invalid',
    name: 'Learner A',
    password: 'clarity02-password-a',
  });
  const userARow = app.db.prepare("SELECT id FROM users WHERE email='clarity02-a@test.invalid'").get();

  mkdirSync('docs/anti-reference', { recursive: true });

  // =========================================================================
  // CRITERION G.1: Set progress & CTAs across LearningPath, Home, MyCreated
  // =========================================================================
  const set1 = (
    await api('POST', '/sets', {
      title: 'Bộ 1 - Chưa Học (4 từ)',
      words: [
        { term: 'agenda', definition: 'chương trình họp', example: 'Check the meeting agenda.' },
        { term: 'budget', definition: 'ngân sách', example: 'We approved the annual budget.' },
        { term: 'client', definition: 'khách hàng', example: 'The client signed the contract.' },
        { term: 'invoice', definition: 'hóa đơn', example: 'Please send the invoice today.' },
      ],
    })
  ).data;

  const set2 = (
    await api('POST', '/sets', {
      title: 'Bộ 2 - Cuối Lộ Trình (2 từ)',
      words: [
        { term: 'revenue', definition: 'doanh thu', example: 'Our revenue grew this quarter.' },
        { term: 'profit', definition: 'lợi nhuận', example: 'Net profit exceeded expectations.' },
      ],
    })
  ).data;

  const set2Words = (await api('GET', `/sets/${set2.id}`)).data.words;
  // Study only 1 word in Set 2 so Set 1 is not_started (0/4) and Set 2 is in_progress (1/2)
  await api('PATCH', `/words/${set2Words[0].id}/progress`, { quality: 4 });

  const customPath = (
    await api('POST', '/paths', {
      title: 'Lộ Trình Kiểm Thử Tiến Độ (2 Bộ)',
      description: 'Kiểm tra tiến độ từng bộ từ thực tế',
      set_ids: [set1.id, set2.id],
    })
  ).data;

  await page.goto(`${origin}/learning-path/${customPath.id}`);
  await page.getByTestId(`set-state-badge-${set1.id}`).waitFor();

  const set1Badge = (await page.getByTestId(`set-state-badge-${set1.id}`).textContent())?.trim();
  const set1ProgressText = (await page.getByTestId(`set-progress-text-${set1.id}`).textContent())?.trim();
  const set1PrimaryCta = (await page.getByTestId(`set-primary-cta-${set1.id}`).textContent())?.trim();

  const set2Badge = (await page.getByTestId(`set-state-badge-${set2.id}`).textContent())?.trim();
  const set2ProgressText = (await page.getByTestId(`set-progress-text-${set2.id}`).textContent())?.trim();
  const set2PrimaryCta = (await page.getByTestId(`set-primary-cta-${set2.id}`).textContent())?.trim();
  const set2CardText = await page.getByTestId(`path-set-card-${set2.id}`).innerText();

  assert.equal(set1Badge, 'Chưa học', 'Set 1 must show Chưa học');
  assert.ok(set1ProgressText?.includes('0/4 từ đã luyện · 0 đã nhớ'), 'Set 1 must show 0/4 progress');
  assert.equal(set1PrimaryCta, 'Học bộ', 'Set 1 primary CTA must be Học bộ');

  assert.equal(set2Badge, 'Đang học', 'Set 2 must show Đang học');
  assert.ok(set2ProgressText?.includes('1/2 từ đã luyện · 0 đã nhớ'), 'Set 2 must show 1/2 progress');
  assert.equal(set2PrimaryCta, 'Tiếp tục', 'Set 2 primary CTA must be Tiếp tục');
  assert.ok(set2CardText.includes('2 từ'), 'Set 2 at end of path must show 2 từ');
  assert.ok(!set2CardText.includes('12 từ'), 'Set 2 must never fallback to 12 từ');

  await page.screenshot({ path: 'docs/anti-reference/clarity-02-path-progress.png', fullPage: true });

  // Verify /my-created shows the exact same progress badge & text
  await page.goto(`${origin}/my-created`);
  await page.getByTestId(`set-state-badge-${set1.id}`).waitFor();
  assert.equal((await page.getByTestId(`set-state-badge-${set1.id}`).textContent())?.trim(), 'Chưa học');
  assert.equal((await page.getByTestId(`set-state-badge-${set2.id}`).textContent())?.trim(), 'Đang học');
  assert.ok((await page.getByTestId(`set-progress-text-${set2.id}`).textContent())?.includes('1/2 từ đã luyện · 0 đã nhớ'));

  report.criteria.g1_set_progress_and_ctas = {
    passed: true,
    set1: { badge: set1Badge, progress: set1ProgressText, cta: set1PrimaryCta },
    set2: { badge: set2Badge, progress: set2ProgressText, cta: set2PrimaryCta },
  };

  // =========================================================================
  // CRITERION G.2 & G.3: Comprehensive Lesson (6 words -> 5 + 1), resume, restart, AI steps 4 & 5
  // =========================================================================
  const compSet = (
    await api('POST', '/sets', {
      title: 'Bộ Học Kết Hợp 6 Từ',
      words: [
        {
          term: 'brand',
          definition: 'thương hiệu',
          phonetic: '/brænd/',
          part_of_speech: 'noun',
          example: 'They built a global brand.',
          synonyms: 'submit, register; job seeker',
        },
        {
          term: 'candidate',
          definition: 'ứng viên',
          phonetic: '/ˈkændɪdət/',
          part_of_speech: 'noun',
          example: 'Each candidate interviewed today.',
        },
        {
          term: 'salary',
          definition: 'tiền lương',
          phonetic: '/ˈsæləri/',
          part_of_speech: 'noun',
          example: 'The company offers a competitive salary.',
        },
        {
          term: 'deadline',
          definition: 'hạn chót',
          phonetic: '/ˈdedlaɪn/',
          part_of_speech: 'noun',
          example: 'We met the project deadline.',
        },
        {
          term: 'schedule',
          definition: 'lịch trình',
          phonetic: '/ˈʃedjuːl/',
          part_of_speech: 'noun',
          example: 'My schedule is full this week.',
        },
        {
          term: 'promotion',
          definition: 'sự thăng tiến',
          phonetic: '/prəˈməʊʃn/',
          part_of_speech: 'noun',
          example: 'She earned a well-deserved promotion.',
        },
      ],
    })
  ).data;

  const compWords = (await api('GET', `/sets/${compSet.id}`)).data.words;
  // Save Vietnamese translation for "brand" so we can also test 0-AI-call translation & synonyms
  await api('PUT', `/words/${compWords[0].id}/notes`, {
    example: 'They built a global brand.',
    translation: 'Họ đã xây dựng một thương hiệu toàn cầu.',
    synonyms: 'submit, register; job seeker',
  });

  await page.goto(`${origin}/comprehensive/${compSet.id}`);
  await page.getByTestId('lesson-card-1').waitFor();
  await page.getByTestId('lesson-card-2').waitFor();

  const lesson1StepsText = (await page.getByTestId('lesson-1-steps').textContent())?.trim();
  const lesson1WordsText = (await page.getByTestId('lesson-1-words').textContent())?.trim();
  const lesson2WordsText = (await page.getByTestId('lesson-2-words').textContent())?.trim();

  assert.equal(lesson1StepsText, '0/5 bước', 'Lesson 1 must start at 0/5 bước');
  assert.ok(lesson1WordsText?.includes('0/5 từ'), 'Lesson 1 must show 5 words');
  assert.ok(lesson2WordsText?.includes('0/1 từ'), 'Lesson 2 must show 1 word');

  // Start Lesson 1 Step 1 (flashcard)
  await page.getByTestId('start-step-1').click();
  await page.getByTestId('session-runner-active').waitFor();

  // Flip flashcard to verify full learning details inside SessionRunner
  await page.getByRole('button', { name: 'Thẻ lật từ vựng' }).click();
  await page.getByText('Nghĩa tiếng Việt').waitFor();

  // Rate 1st card as "Đã nhớ (2)" -> completed_words becomes 1/5
  await page.getByRole('button', { name: 'Đã nhớ (2)' }).click();
  await page.waitForTimeout(250);
  const progressBeforeReload = await page.getByTestId('session-runner-active').innerText();
  assert.ok(progressBeforeReload.includes('Đã hoàn thành: 1 / 5 từ'), 'Runner must show 1 / 5 words completed before reload');

  // Reload page -> must resume Lesson 1 Step 1 at 1 / 5 words!
  await page.reload();
  await page.getByTestId('session-runner-active').waitFor();
  const progressAfterReload = await page.getByTestId('session-runner-active').innerText();
  assert.ok(progressAfterReload.includes('Đã hoàn thành: 1 / 5 từ'), 'Reloading must resume active step session at 1 / 5 words');

  // Complete remaining 4 flashcards in Step 1
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Thẻ lật từ vựng' }).click();
    await page.getByText('Nghĩa tiếng Việt').waitFor();
    await page.getByRole('button', { name: 'Đã nhớ (2)' }).click();
    await page.getByText('Nghĩa tiếng Việt').waitFor({ state: 'detached' });
  }
  await page.getByTestId('save-step-button').waitFor();

  // Test "Luyện lại bước này" button -> restarts Step 1 fresh (0 / 5 words)
  await page.getByTestId('restart-step-button').click();
  await page.getByTestId('session-runner-active').waitFor();
  const progressAfterRestart = await page.getByTestId('session-runner-active').innerText();
  assert.ok(progressAfterRestart.includes('Đã hoàn thành: 0 / 5 từ'), 'Clicking restart must create a fresh session at 0 / 5 words');

  // Complete all 5 flashcards again and save Step 1
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Thẻ lật từ vựng' }).click();
    await page.getByText('Nghĩa tiếng Việt').waitFor();
    await page.getByRole('button', { name: 'Đã nhớ (2)' }).click();
    await page.getByText('Nghĩa tiếng Việt').waitFor({ state: 'detached' });
  }
  await page.getByTestId('save-step-button').waitFor();
  await page.getByTestId('save-step-button').click();
  await page.getByTestId('save-step-button').waitFor({ state: 'detached' });

  // Now Lesson 1 is at 1/5 bước and Step 2 is active
  await page.getByTestId('lesson-1-steps').waitFor();
  assert.equal((await page.getByTestId('lesson-1-steps').textContent())?.trim(), '1/5 bước');

  // Test unconfigured AI does not block Steps 1-3, and Step 4 shows connect AI prompt
  app.db
    .prepare('INSERT INTO user_ai_settings VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET provider=excluded.provider,model=excluded.model,api_key=excluded.api_key')
    .run(userARow.id, 'gemini', 'gemini-3.8-flash', '', new Date().toISOString());

  await page.reload();
  await page.getByTestId('start-step-4').waitFor();
  await page.getByTestId('start-step-4').click();
  await page.getByTestId('ai-step-unconfigured').waitFor();
  // Step 2 is still accessible when AI is unconfigured
  await page.getByTestId('start-step-2').click();
  await page.getByTestId('session-runner-active').waitFor();

  // Re-enable mock AI gateway by removing custom empty gemini key
  app.db.prepare('DELETE FROM user_ai_settings WHERE user_id=?').run(userARow.id);
  await page.reload();
  await page.getByTestId('start-step-4').waitFor();
  await page.getByTestId('start-step-4').click();

  // Verify Step 4 (Luyện nói AI) only scopes to the 5 words of Lesson 1 (brand, candidate, salary, deadline, schedule)
  await page.getByTestId('lesson-speaking-step').waitFor();
  const speakingPanelText = await page.getByTestId('lesson-speaking-step').innerText();
  assert.ok(speakingPanelText.includes('brand') && speakingPanelText.includes('schedule'), 'Step 4 must show Lesson 1 words');
  assert.ok(!speakingPanelText.includes('promotion'), 'Step 4 must NOT include Lesson 2 word (promotion)');

  aiGatewayCalls = [];
  apiRequests.length = 0;
  await page.getByRole('button', { name: /Tạo câu hỏi gợi ý bằng AI/i }).click();
  await page.getByText(/How do you apply/i).waitFor();

  const speakingGenCall = apiRequests.find((r) => r.method === 'POST' && r.url === '/api/v1/ai/generate');
  assert.ok(speakingGenCall, 'Step 4 must call POST /api/v1/ai/generate');
  assert.deepEqual(
    speakingGenCall.body.word_ids,
    compWords.slice(0, 5).map((w) => w.id),
    'Step 4 must pass only the 5 word_ids of Lesson 1'
  );

  // Test whole-word matching: "brandish" must NOT match "brand"
  await page.getByLabel('Bài nói').fill('They brandish weapons.');
  const brandChipClass1 = await page.getByTestId('speaking-target-word-brand').getAttribute('class');
  assert.ok(!brandChipClass1?.includes('bg-emerald-50'), '"brandish" must not count as whole word "brand"');

  // Fill answer with all 5 target words of Lesson 1
  await page
    .getByLabel('Bài nói')
    .fill('Our brand welcomes every candidate with a fair salary, clear deadline, and flexible schedule.');
  const brandChipClass2 = await page.getByTestId('speaking-target-word-brand').getAttribute('class');
  assert.ok(brandChipClass2?.includes('bg-emerald-50'), 'Whole word "brand" must be detected');

  // Submit for AI feedback -> verify feedback stays visible until clicking complete-speaking-step
  await page.getByTestId('submit-speaking-ai').click();
  await page.getByTestId('speaking-ai-feedback').waitFor();
  await page.waitForTimeout(400);
  assert.equal(
    await page.getByTestId('speaking-ai-feedback').isVisible(),
    true,
    'AI feedback in Step 4 must remain visible until learner clicks save/continue'
  );

  await page.screenshot({ path: 'docs/anti-reference/clarity-02-lesson-speaking-feedback.png', fullPage: true });

  // Now click "Lưu bước học và tiếp tục" -> completes Step 4
  await page.getByTestId('complete-speaking-step').click();
  await page.getByTestId('complete-speaking-step').waitFor({ state: 'detached' });
  assert.equal((await page.getByTestId('lesson-1-steps').textContent())?.trim(), '2/5 bước');

  // Open Step 5 (Hội thoại AI) -> auto-starts conversation scoped to Lesson 1 words
  apiRequests.length = 0;
  await page.getByTestId('start-step-5').click();
  await page.getByTestId('lesson-conversation-step').waitFor();
  await page.getByText(/Hello! Let's discuss/i).waitFor();

  const convCreateCall = apiRequests.find((r) => r.method === 'POST' && r.url === '/api/v1/conversations');
  assert.ok(convCreateCall, 'Step 5 must call POST /api/v1/conversations');
  assert.deepEqual(
    convCreateCall.body.settings.word_ids,
    compWords.slice(0, 5).map((w) => w.id),
    'Step 5 conversation must pass only the 5 word_ids of Lesson 1'
  );

  // Send a message missing target words ("They brandish swords") and try completing -> must handle 409 TARGET_WORDS_MISSING gracefully
  await page.getByLabel('Tin nhắn hội thoại').fill('They brandish swords.');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await page.getByText('They brandish swords.').waitFor();

  await page.getByTestId('complete-conversation-step').click();
  await page.getByTestId('conversation-missing-terms-alert').waitFor();
  assert.equal(
    await page.getByText('They brandish swords.').isVisible(),
    true,
    '409 TARGET_WORDS_MISSING must not lose conversation messages'
  );

  // Now send message with all 5 Lesson 1 words and complete Step 5
  await page
    .getByLabel('Tin nhắn hội thoại')
    .fill('Our brand welcomes every candidate with a fair salary, clear deadline, and flexible schedule.');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await page
    .getByText('Our brand welcomes every candidate with a fair salary, clear deadline, and flexible schedule.')
    .waitFor();

  await page.getByTestId('complete-conversation-step').click();
  await page.getByTestId('complete-conversation-step').waitFor({ state: 'detached' });
  assert.equal((await page.getByTestId('lesson-1-steps').textContent())?.trim(), '3/5 bước');

  report.criteria.g2_and_g3_comprehensive_lesson = {
    passed: true,
    lesson_1_words: 5,
    lesson_2_words: 1,
    resumed_after_reload: true,
    restarted_cleanly: true,
    scoped_word_ids: compWords.slice(0, 5).map((w) => w.id),
  };

  // =========================================================================
  // CRITERION G.4: Synonyms splitting, single-item TTS, dictionary lookup, fixed portal popover (0px shift), user isolation
  // =========================================================================
  // Seed a dictionary word "submit" in a public set so /dictionary/entry?q=submit finds a definition
  await api('POST', '/sets', {
    title: 'Từ Điển Đồng Nghĩa',
    words: [{ term: 'submit', definition: 'nộp, đệ trình', phonetic: '/səbˈmɪt/', part_of_speech: 'verb' }],
  });

  await page.goto(`${origin}/study-set/${compSet.id}`);
  await page.getByTestId('flashcard-player').waitFor();

  // Check vocabulary list item for "brand" which has synonyms: "submit, register; job seeker"
  const brandWordId = compWords[0].id;
  const exampleEl = page.getByTestId(`word-example-sentence-${brandWordId}`);
  await exampleEl.waitFor();

  // Verify 3 separate synonym buttons: submit, register, job seeker
  const btnSubmit = page.getByTestId('synonym-chip-submit');
  const btnRegister = page.getByTestId('synonym-chip-register');
  const btnJobSeeker = page.getByTestId('synonym-chip-job seeker');
  assert.equal(await btnSubmit.count(), 1, 'Must render separate button for submit');
  assert.equal(await btnRegister.count(), 1, 'Must render separate button for register');
  assert.equal(await btnJobSeeker.count(), 1, 'Must render separate button for job seeker');

  // Scroll btnSubmit into view first so clicking it doesn't auto-scroll the window
  await btnSubmit.scrollIntoViewIfNeeded();
  // Measure example sentence offsetTop and boundingBox top + scrollY BEFORE clicking synonym
  const topBefore = await exampleEl.evaluate((el) => Math.round(el.getBoundingClientRect().top + window.scrollY));
  await page.evaluate(() => {
    window.__spokenTexts = [];
  });
  apiRequests.length = 0;

  await btnSubmit.click();
  await page.getByTestId('synonym-popover').waitFor();
  await page.getByTestId('synonym-popover').getByText('nộp, đệ trình').waitFor();

  // Measure example sentence bounding box top + scrollY AFTER popover opens
  const topAfter = await exampleEl.evaluate((el) => Math.round(el.getBoundingClientRect().top + window.scrollY));
  const spokenTexts = await page.evaluate(() => window.__spokenTexts);
  const dictEntryCalled = apiRequests.some((r) => r.url.startsWith('/api/v1/dictionary/entry?q=submit'));

  assert.equal(Math.abs(topAfter - topBefore), 0, 'Synonym popover must not shift example sentence layout (0px delta)');
  assert.deepEqual(spokenTexts, ['submit'], 'Clicking synonym must speak ONLY that single synonym item');
  assert.equal(dictEntryCalled, true, 'Clicking synonym must call GET /api/v1/dictionary/entry?q=submit');

  await page.screenshot({ path: 'docs/anti-reference/clarity-02-synonym-popover.png', fullPage: true });
  await page.keyboard.press('Escape');

  // Also test on Flashcard back: clicking synonym must NOT flip flashcard back to front
  await page.getByTestId('flashcard-player').click();
  await page.getByText('Mặt sau (Nghĩa)').waitFor();
  await page.getByTestId('synonym-chip-submit').first().click();
  await page.getByTestId('synonym-popover').waitFor();
  await page.getByText('Mặt sau (Nghĩa)').waitFor();
  await page.keyboard.press('Escape');

  // Verify User B isolation on /dictionary/entry
  // Add a private word "secretterm" to User A's private set (Set 1 is private by default)
  await api('POST', `/sets/${set1.id}/words`, {
    term: 'secretterm',
    definition: 'nghĩa bí mật chỉ riêng User A có',
    example: 'A secretterm example.',
  });
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  const regB = await pageB.request.fetch(origin + '/api/v1/auth/register', {
    method: 'POST',
    headers: { 'X-Requested-With': 'OpenQuiz' },
    data: {
      email: 'clarity02-b@test.invalid',
      name: 'Learner B',
      password: 'clarity02-password-b',
    },
  });
  assert.equal(regB.status(), 201);
  const dictResB = await (
    await pageB.request.fetch(origin + '/api/v1/dictionary/entry?q=secretterm', {
      headers: { 'X-Requested-With': 'OpenQuiz' },
    })
  ).json();
  assert.equal(dictResB.data.found, false, 'User B must NOT see User A private word in /dictionary/entry');
  await contextB.close();

  report.criteria.g4_synonyms_and_popover = {
    passed: true,
    synonym_buttons: ['submit', 'register', 'job seeker'],
    spoken_texts: spokenTexts,
    layout_shift_px: Math.abs(topAfter - topBefore),
    dictionary_entry_called: dictEntryCalled,
    user_b_isolated: !dictResB.data.found,
  };

  // =========================================================================
  // CRITERION G.5: Contextual navigation, active sidebar, breadcrumbs, deeplinks, /settings/ai?returnTo roundtrip
  // =========================================================================
  // 1) /practice -> select Ngữ pháp & Trật tự câu -> click set -> /grammar/:id
  await page.goto(`${origin}/practice`);
  await page.getByRole('heading', { name: 'Ngữ pháp & Trật tự câu' }).click();
  await page.getByText('Bộ Học Kết Hợp 6 Từ').first().click();
  await page.waitForURL(new RegExp(`/grammar/${compSet.id}\\?`));

  // Verify sidebar active item is "Luyện tập"
  const activePracticeNav = page.locator('aside button[aria-current="page"]', { hasText: 'Luyện tập' });
  assert.ok((await activePracticeNav.count()) >= 1, 'Sidebar must highlight Luyện tập when entering /grammar from /practice');

  // Verify breadcrumb and contextual back button ("Về Luyện tập")
  const backBtnText1 = (await page.getByTestId('contextual-back-button').textContent())?.trim();
  assert.equal(backBtnText1, 'Về Luyện tập', 'Back button from /practice entry must say Về Luyện tập');
  await page.getByTestId('contextual-back-button').click();
  await page.waitForURL(new RegExp(`/practice\\?mode=grammar`));
  // Verify "Ngữ pháp & Trật tự câu" is still selected on /practice
  await page.getByText('Chọn bộ từ để bắt đầu:').waitFor();

  // 2) /learning-path/:id -> Xem bộ -> /study-set/:id -> Kết hợp -> /comprehensive/:id
  await page.goto(`${origin}/learning-path/${customPath.id}`);
  await page.getByTestId(`set-view-cta-${set1.id}`).click();
  await page.waitForURL(new RegExp(`/study-set/${set1.id}\\?`));
  assert.equal((await page.getByTestId('contextual-back-button').textContent())?.trim(), 'Về lộ trình');

  await page.getByRole('button', { name: /Kết hợp/i }).click();
  await page.waitForURL(new RegExp(`/comprehensive/${set1.id}\\?`));
  assert.equal((await page.getByTestId('contextual-back-button').textContent())?.trim(), 'Về bộ từ');

  // Roundtrip through /settings/ai?returnTo=... preserving full query context
  const compUrlWithContext = new URL(page.url()).pathname + new URL(page.url()).search;
  await page.goto(`${origin}/settings/ai?returnTo=${encodeURIComponent(compUrlWithContext)}`);
  await page.getByTestId('ai-settings-return').click();
  await page.waitForURL(new RegExp(`/comprehensive/${set1.id}\\?`));
  assert.ok(page.url().includes(`path_id=${customPath.id}`), 'Returning from /settings/ai must preserve path_id query context');

  // Click "Về bộ từ" -> returns to /study-set/:id with path context intact -> click "Về lộ trình" -> returns to /learning-path/:id
  await page.getByTestId('contextual-back-button').click();
  await page.waitForURL(new RegExp(`/study-set/${set1.id}\\?`));
  await page.getByTestId('contextual-back-button').click();
  await page.waitForURL(`${origin}/learning-path/${customPath.id}`);

  // 3) Direct deeplinks without query params
  await page.goto(`${origin}/study-set/${set1.id}`);
  assert.equal((await page.getByTestId('contextual-back-button').textContent())?.trim(), 'Về Thư viện');

  await page.goto(`${origin}/grammar/${compSet.id}`);
  assert.equal((await page.getByTestId('contextual-back-button').textContent())?.trim(), 'Quay lại bộ từ');

  report.criteria.g5_contextual_navigation_and_breadcrumbs = {
    passed: true,
  };

  // =========================================================================
  // CRITERION G.6: Saved example translation (0 AI calls), Reading translation (1 AI call then 0 on reload + 429 safety), Grammar fallback to order
  // =========================================================================
  // 6a) Saved example translation on /study-set/:compSet -> 0 AI calls
  await page.goto(`${origin}/study-set/${compSet.id}`);
  const toggleBrandTransBtn = page.getByRole('button', { name: 'Dịch ví dụ cho brand', exact: true });
  await toggleBrandTransBtn.waitFor();
  aiGatewayCalls = [];
  await toggleBrandTransBtn.click();
  await page.getByTestId(`word-example-translation-${brandWordId}`).waitFor();
  assert.equal(aiGatewayCalls.length, 0, 'Toggling saved example translation must make 0 AI calls');

  // 6b) Reading exercise translation: generate reading passage -> select answer -> translate once (1 AI call) -> reload (0 AI calls) -> 429 test
  await page.goto(`${origin}/reading/${compSet.id}`);
  await page.getByRole('button', { name: /Tạo bài đọc hiểu bằng AI/i }).click();
  await page.getByTestId('toggle-reading-translation').waitFor();

  // Select first option on Question 1 (clicking the label wrapping the sr-only radio)
  const firstOptionRadio = page.locator('fieldset input[type="radio"]').first();
  await page.locator('fieldset label').first().click();
  assert.equal(await firstOptionRadio.isChecked(), true);

  // Open reading translation panel -> not cached yet, 0 AI calls until clicking confirm
  aiGatewayCalls = [];
  await page.getByTestId('toggle-reading-translation').click();
  await page.getByTestId('generate-reading-translation').waitFor();
  assert.equal(aiGatewayCalls.length, 0, 'Opening reading translation toggle before confirming must make 0 AI calls');

  // Simulate 429 first to verify page does not blank and selected radio answer stays checked!
  simulateTranslation429 = true;
  await page.getByTestId('generate-reading-translation').click();
  await page.getByTestId('reading-translation-error').waitFor();
  assert.equal(await firstOptionRadio.isChecked(), true, '429 error must not lose selected reading answers');
  simulateTranslation429 = false;

  // Now click "Nhờ AI dịch bài đọc" with AI working -> 1 AI call, displays translation
  aiGatewayCalls = [];
  await page.getByTestId('generate-reading-translation').click();
  await page.getByTestId('reading-passage-translation').waitFor();
  assert.equal(aiGatewayCalls.length, 1, 'Generating reading passage translation must make exactly 1 AI call');

  await page.screenshot({ path: 'docs/anti-reference/clarity-02-reading-translation.png', fullPage: true });

  // Reload page and click "Bản dịch bài đọc" -> 0 AI calls!
  aiGatewayCalls = [];
  await page.reload();
  await page.getByTestId('toggle-reading-translation').waitFor();
  await page.getByTestId('toggle-reading-translation').click();
  await page.getByTestId('reading-passage-translation').waitFor();
  assert.equal(aiGatewayCalls.length, 0, 'Viewing cached reading translation after reload must make 0 AI calls');

  // 6c) Grammar exercise on set1 (which has English examples but 0 Vietnamese translations)
  await page.goto(`${origin}/grammar/${set1.id}`);
  // By default, "Sắp xếp câu" (order) is selected and loads immediately without error
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).waitFor();

  // Open Cài đặt, check "Dịch câu" and click "Áp dụng và bắt đầu bài mới" -> shows TRANSLATIONS_REQUIRED fallback panel
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.getByLabel('Dịch câu').check();
  await page.getByRole('button', { name: 'Áp dụng và bắt đầu bài mới', exact: true }).click();
  await page.getByTestId('grammar-error-banner').waitFor();
  await page.getByTestId('grammar-fallback-order').waitFor();

  // Click "Chuyển về Sắp xếp câu" -> immediately creates order exercise without AI!
  aiGatewayCalls = [];
  await page.getByTestId('grammar-fallback-order').click();
  await page.getByTestId('grammar-error-banner').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).waitFor();
  assert.equal(aiGatewayCalls.length, 0, 'Fallback to Sắp xếp câu (order) must make 0 AI calls');

  report.criteria.g6_translations_and_grammar_fallback = {
    passed: true,
  };

  assert.equal(report.page_errors.length, 0, `Unexpected page errors: ${report.page_errors.join('; ')}`);
} finally {
  writeFileSync('docs/clarity-02-verification.json', JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  web.closeAllConnections();
  await new Promise((r) => web.close(r));
  mockAiServer.closeAllConnections();
  await new Promise((r) => mockAiServer.close(r));
  app.server.closeAllConnections();
  await app.close();
  console.log(JSON.stringify(report, null, 2));
}
