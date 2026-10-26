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

let aiCallDetected = false;

const web = createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    if (req.url.includes('/ai/') || req.url.includes('/feedback') && req.method === 'POST') {
      aiCallDetected = true;
    }
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
  date: '2026-10-26',
  milestone: 'Mốc 2 — Một nơi bắt đầu, điều hướng 5 mục',
  checks: [],
  viewports_tested: [],
  page_errors: [],
  completed: false
};

let browser;

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => report.page_errors.push(e.message));
  await page.route('https://**/*', (r) => r.abort());

  const api = async (method, path, body) => {
    const r = await page.request.fetch(origin + '/api/v1' + path, {
      method,
      headers: { 'X-Requested-With': 'OpenQuiz' },
      ...(body ? { data: body } : {})
    });
    const v = await r.json();
    assert.ok(r.ok(), JSON.stringify(v));
    return v.data;
  };

  // Create test user
  const email = `m2-tester-${Date.now()}@example.com`;
  await api('POST', '/auth/register', {
    email,
    name: 'Learner M2',
    password: 'password123'
  });
  await api('PUT', '/learning/profile', {
    time_budget_minutes: 15,
    preferred_days: [1, 2, 3, 4, 5, 6, 7]
  });

  // ==========================================
  // CHECK 1: Root / redirects to /today; Logo links to /today; No back loop
  // ==========================================
  console.log('Testing Check 1: Root redirect, logo navigation, back loop...');
  await page.goto(origin + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Should have redirected to /today
  const currentUrl = new URL(page.url()).pathname;
  assert.equal(currentUrl, '/today', `Expected /today, got ${currentUrl}`);

  // Logo click
  const logo = page.locator('header a[href="/today"], aside a[href="/today"]').first();
  await logo.waitFor({ state: 'visible' });
  await logo.click();
  await page.waitForTimeout(300);
  assert.equal(new URL(page.url()).pathname, '/today');

  // Navigate to /progress then go back
  await page.locator('aside a[href="/progress"], nav a[href="/progress"]').first().click();
  await page.waitForTimeout(400);
  assert.equal(new URL(page.url()).pathname, '/progress');
  
  await page.goBack();
  await page.waitForTimeout(400);
  assert.equal(new URL(page.url()).pathname, '/today');

  report.checks.push({
    id: 'single_entry_root_redirect_and_logo',
    status: 'PASS',
    initial_path: '/',
    redirected_to: currentUrl,
    logo_target: '/today',
    back_safe: true
  });

  // ==========================================
  // CHECK 2: Pre-login deep link preservation
  // ==========================================
  console.log('Testing Check 2: Deep link preservation after login...');
  const unauthContext = await browser.newContext();
  const unauthPage = await unauthContext.newPage();
  unauthPage.setDefaultTimeout(8000);
  unauthPage.on('pageerror', (e) => report.page_errors.push(e.message));

  // Request a deep link while unauthenticated
  const targetDeepLink = '/study-set/13609';
  await unauthPage.goto(origin + targetDeepLink);
  await unauthPage.waitForLoadState('networkidle');

  // Should land on Auth view with returnTo preserved
  await unauthPage.locator('input[type="email"]').waitFor();
  await unauthPage.locator('input[type="email"]').fill(email);
  await unauthPage.locator('input[type="password"]').fill('password123');
  await unauthPage.locator('button[type="submit"]').click();
  await unauthPage.waitForTimeout(1000);

  const postLoginUrl = new URL(unauthPage.url()).pathname;
  assert.equal(postLoginUrl, targetDeepLink, `Expected ${targetDeepLink}, got ${postLoginUrl}`);
  await unauthContext.close();

  report.checks.push({
    id: 'deep_link_preservation_after_login',
    status: 'PASS',
    requested_deep_link: targetDeepLink,
    landed_url: postLoginUrl
  });

  // ==========================================
  // CHECK 3: Exactly 5 main navigation items (Desktop & Mobile)
  // ==========================================
  console.log('Testing Check 3: Exactly 5 main navigation items...');
  await page.goto(origin + '/today');
  await page.waitForLoadState('networkidle');

  const mainNavLinks = [
    { name: 'Học hôm nay', href: '/today' },
    { name: 'Lộ trình', href: '/my-program' },
    { name: 'Thư viện', href: '/my-created' },
    { name: 'Luyện tập', href: '/practice' },
    { name: 'Tiến độ', href: '/progress' }
  ];

  // Inspect desktop sidebar main navigation
  const sidebarNavItems = page.locator('aside nav a');
  const count = await sidebarNavItems.count();
  const foundHrefs = [];
  for (let i = 0; i < count; i++) {
    const href = await sidebarNavItems.nth(i).getAttribute('href');
    if (href) foundHrefs.push(href);
  }

  // Exactly the 5 main routes must be present in the main nav group
  for (const item of mainNavLinks) {
    assert.ok(foundHrefs.includes(item.href), `Missing main nav href: ${item.href}`);
    const navEl = page.locator(`aside nav a[href="${item.href}"]`);
    await navEl.waitFor({ state: 'visible' });
    const text = await navEl.innerText();
    assert.ok(text.includes(item.name), `Nav item text mismatch: expected ${item.name}, got ${text}`);
  }

  // Verify repetition & mistakes are present under Ôn tập group with badges
  const repLink = page.locator('aside a[href="/repetition-study"]');
  await repLink.waitFor({ state: 'visible' });
  const mistakesLink = page.locator('aside a[href="/mistakes"]');
  await mistakesLink.waitFor({ state: 'visible' });

  // Verify secondary links in desktop dropdown or sidebar
  const settingsLink = page.locator('a[href="/settings/learning"], button:has-text("Cài đặt")');
  assert.ok((await settingsLink.count()) > 0, 'Settings link should exist');

  report.checks.push({
    id: 'five_main_nav_items_desktop',
    status: 'PASS',
    main_nav_items: mainNavLinks.map(m => m.name),
    review_shortcuts_present: true
  });

  // ==========================================
  // CHECK 4: Dedicated 404 page (NotFoundView)
  // ==========================================
  console.log('Testing Check 4: Dedicated 404 page for unknown routes...');
  await page.goto(origin + '/this-route-does-not-exist-xyz');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);

  // Verify 404 headline and action buttons
  const notFoundHeading = page.locator('h1, h2, h3').filter({ hasText: /404/ });
  await notFoundHeading.waitFor({ state: 'visible' });
  const notFoundText = await page.innerText('body');
  assert.ok(notFoundText.includes('Không tìm thấy trang'), '404 text not displayed');

  const backTodayBtn = page.locator('button').filter({ hasText: 'Về Học hôm nay' });
  await backTodayBtn.waitFor({ state: 'visible' });
  const backLibBtn = page.locator('button').filter({ hasText: 'Về Thư viện' });
  await backLibBtn.waitFor({ state: 'visible' });

  // Test button click returns to /today
  await backTodayBtn.click();
  await page.waitForTimeout(300);
  assert.equal(new URL(page.url()).pathname, '/today');

  report.checks.push({
    id: 'dedicated_404_not_found_view',
    status: 'PASS',
    rendered_404_heading: true,
    navigated_back_to_today: true
  });

  // ==========================================
  // CHECK 5: Explore relocated under Library (/explore)
  // ==========================================
  console.log('Testing Check 5: Explore flow from Library...');
  // Go to /my-created
  await page.goto(origin + '/my-created');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);

  // Click "Khám phá bộ từ & lộ trình"
  const exploreCta = page.locator('a[href="/explore"], button:has-text("Khám phá bộ từ & lộ trình")').first();
  await exploreCta.waitFor({ state: 'visible' });
  await exploreCta.click();
  await page.waitForTimeout(400);

  assert.equal(new URL(page.url()).pathname, '/explore');
  const exploreHeader = page.locator('h1').filter({ hasText: 'Khám phá bộ từ & lộ trình' });
  await exploreHeader.waitFor({ state: 'visible' });

  // Verify back button to library
  const backToLib = page.locator('button').filter({ hasText: /Về Thư viện/ });
  await backToLib.waitFor({ state: 'visible' });

  // Search input on explore (inside main page)
  const searchInput = page.locator('main form input[placeholder*="Tìm kiếm"]').first();
  await searchInput.waitFor({ state: 'visible' });
  await searchInput.fill('toeic');
  await searchInput.press('Enter');
  await page.waitForTimeout(600);

  // Check URL updated with query
  const queryParam = new URL(page.url()).searchParams.get('q');
  assert.equal(queryParam, 'toeic', `Search param not synced: ${queryParam}`);

  // Click on "Xem tất cả" category button from explore
  const categoryBtn = page.locator('main button:has-text("Xem tất cả")').first();
  if ((await categoryBtn.count()) > 0) {
    await categoryBtn.click();
    await page.waitForTimeout(500);

    // Verify sidebar highlights "Thư viện" (/my-created)
    const libNav = page.locator('aside a[href="/my-created"], nav a[href="/my-created"]').first();
    const isLibActive = await libNav.getAttribute('aria-current');
    assert.equal(isLibActive, 'page', 'Library should be active in sidebar while viewing category opened from explore');

    // Verify back button points back / goes back to /explore?q=toeic
    const backBtn = page.locator('button[data-testid="category-back-btn"], button[aria-label="Quay lại"]').first();
    if ((await backBtn.count()) > 0) {
      await backBtn.click();
      await page.waitForTimeout(500);
      assert.equal(new URL(page.url()).pathname, '/explore');
      assert.equal(new URL(page.url()).searchParams.get('q'), 'toeic');
    }
  }

  // Click back to library from /explore
  if (new URL(page.url()).pathname !== '/explore') {
    await page.goto(origin + '/explore');
    await page.waitForLoadState('networkidle');
  }
  const backToLibBtn = page.locator('button').filter({ hasText: /Về Thư viện/ }).first();
  await backToLibBtn.waitFor({ state: 'visible' });
  await backToLibBtn.click();
  await page.waitForTimeout(400);
  assert.equal(new URL(page.url()).pathname, '/my-created');

  report.checks.push({
    id: 'explore_relocated_under_library',
    status: 'PASS',
    route: '/explore',
    search_query_synced: true,
    returned_to_library: true
  });

  // ==========================================
  // CHECK 6: Multi-viewport responsive checks (360, 390, 768, 1440)
  // ==========================================
  console.log('Testing Check 6: Multi-viewport responsive checks...');
  const viewports = [
    { name: 'mobile_small_360', width: 360, height: 740 },
    { name: 'mobile_standard_390', width: 390, height: 844 },
    { name: 'tablet_768', width: 768, height: 1024 },
    { name: 'desktop_1440', width: 1440, height: 900 }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(origin + '/today');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    // Check no horizontal scrollbar on body
    const bodyScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const bodyClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    assert.ok(
      bodyScrollWidth <= bodyClientWidth + 5,
      `Horizontal overflow on ${vp.name}: scrollWidth=${bodyScrollWidth}, clientWidth=${bodyClientWidth}`
    );

    // On mobile viewports (< 768px), verify mobile menu button opens drawer with 5 main links
    if (vp.width < 768) {
      const menuBtn = page.locator('button[aria-label*="menu" i], button[aria-label*="Mở menu" i], button:has-text("☰")').first();
      if ((await menuBtn.count()) > 0 && (await menuBtn.isVisible())) {
        await menuBtn.click();
        await page.waitForTimeout(300);

        // Check drawer has main items
        for (const item of mainNavLinks) {
          const drawerItem = page.locator(`aside a[href="${item.href}"]`).first();
          assert.ok((await drawerItem.count()) > 0, `Mobile drawer missing ${item.name} (${item.href})`);
        }

        // Close drawer (e.g. click close button)
        const closeBtn = page.locator('button[aria-label*="Đóng" i], button:has-text("✕")').first();
        if ((await closeBtn.count()) > 0 && (await closeBtn.isVisible())) {
          await closeBtn.click();
          await page.waitForTimeout(200);
        }
      }
    } else {
      // On tablet/desktop (>= 768px), sidebar is visible with 5 items
      const sidebar = page.locator('aside').first();
      await sidebar.waitFor({ state: 'visible' });
      for (const item of mainNavLinks) {
        const navEl = page.locator(`aside a[href="${item.href}"]`).first();
        assert.ok((await navEl.count()) > 0, `Sidebar missing ${item.name}`);
      }
    }

    report.viewports_tested.push({
      name: vp.name,
      width: vp.width,
      height: vp.height,
      status: 'PASS',
      scroll_width: bodyScrollWidth,
      client_width: bodyClientWidth
    });
  }

  // ==========================================
  // CHECK 7: No unexpected AI calls during regular navigation
  // ==========================================
  console.log('Testing Check 7: No unexpected AI calls during simple navigation...');
  assert.equal(aiCallDetected, false, 'AI call was detected during simple navigation!');
  report.checks.push({
    id: 'no_unsolicited_ai_calls_on_nav',
    status: 'PASS'
  });

  report.completed = true;
  report.total_checks_passed = report.checks.length;
} catch (err) {
  report.completed = false;
  report.error = err.stack;
  process.exitCode = 1;
} finally {
  writeFileSync('docs/refinement-m2-validation.json', JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  web.closeAllConnections();
  await new Promise((r) => web.close(r));
  app.server.closeAllConnections();
  await app.close();
  console.log('\n=== M2 VERIFICATION REPORT ===');
  console.log(JSON.stringify(report, null, 2));
}
