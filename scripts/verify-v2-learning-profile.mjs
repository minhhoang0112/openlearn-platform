import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:4000/api/v1';

async function run() {
  console.log('Testing V2 Learning Profile contract & API integration...');
  let cookie = '';

  const request = async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? { 'X-Requested-With': 'OpenQuiz' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      cookie = setCookie.split(';')[0];
    }

    const data = await res.json();
    return { status: res.status, ok: res.ok, ...data };
  };

  // 1. Auth & Default Profile
  const email1 = `v2_user_${Date.now()}@test.com`;
  const reg1 = await request('POST', '/auth/register', {
    email: email1,
    password: 'password123',
    name: 'V2 IT Learner',
  });
  assert.equal(reg1.status, 201, 'User 1 registered');
  console.log('✓ 1. User 1 registered and authenticated');

  const defaultProfile = await request('GET', '/learning/profile');
  assert.equal(defaultProfile.status, 200);
  assert.equal(defaultProfile.data.is_default, true);
  assert.equal(defaultProfile.data.time_budget_minutes, 30);
  assert.equal(defaultProfile.data.focus, 'general');
  assert.equal(defaultProfile.data.timezone, 'Asia/Ho_Chi_Minh');
  assert.deepEqual(defaultProfile.data.preferred_days, [1, 2, 3, 4, 5]);
  assert.equal(defaultProfile.data.program_id, null);
  assert.equal(defaultProfile.data.updated_at, null);
  console.log('✓ 2. GET /learning/profile returns correct defaults (general, 30m, Asia/Ho_Chi_Minh, days 1-5)');

  // 2. PUT /learning/profile update
  const updateRes = await request('PUT', '/learning/profile', {
    time_budget_minutes: 45,
    focus: 'system',
    preferred_days: [1, 3, 5, 6],
  });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.data.is_default, false);
  assert.equal(updateRes.data.time_budget_minutes, 45);
  assert.equal(updateRes.data.focus, 'system');
  assert.deepEqual(updateRes.data.preferred_days, [1, 3, 5, 6]);
  assert.ok(updateRes.data.updated_at, 'updated_at is ISO string');
  console.log('✓ 3. PUT /learning/profile updates focus to system, budget to 45m, custom days');

  // 3. Verify GET returns updated data
  const getUpdated = await request('GET', '/learning/profile');
  assert.equal(getUpdated.status, 200);
  assert.equal(getUpdated.data.focus, 'system');
  assert.equal(getUpdated.data.time_budget_minutes, 45);
  assert.deepEqual(getUpdated.data.preferred_days, [1, 3, 5, 6]);
  assert.equal(getUpdated.data.is_default, false);
  console.log('✓ 4. GET /learning/profile confirms persistence');

  // 4. Validation tests
  const invalidTime = await request('PUT', '/learning/profile', { time_budget_minutes: 20 });
  assert.equal(invalidTime.status, 400);

  const invalidFocus = await request('PUT', '/learning/profile', { focus: 'medical' });
  assert.equal(invalidFocus.status, 400);

  const invalidDaysEmpty = await request('PUT', '/learning/profile', { preferred_days: [] });
  assert.equal(invalidDaysEmpty.status, 400);

  const invalidDaysOut = await request('PUT', '/learning/profile', { preferred_days: [8] });
  assert.equal(invalidDaysOut.status, 400);

  const invalidKey = await request('PUT', '/learning/profile', { program_id: 2 });
  assert.equal(invalidKey.status, 400);
  console.log('✓ 5. Server strict validation rejects invalid budget, focus, empty days, and program_id modification');

  // 5. Account isolation
  cookie = ''; // Clear cookie
  const email2 = `v2_other_${Date.now()}@test.com`;
  const reg2 = await request('POST', '/auth/register', {
    email: email2,
    password: 'password123',
    name: 'General Learner',
  });
  assert.equal(reg2.status, 201);
  const otherProfile = await request('GET', '/learning/profile');
  assert.equal(otherProfile.status, 200);
  assert.equal(otherProfile.data.focus, 'general', 'User 2 retains default general focus');
  assert.equal(otherProfile.data.is_default, true);
  console.log('✓ 6. Profile isolation verified: other accounts remain default general');

  // 6. Verify built assets contain the new views
  const distHtml = fs.readFileSync('dist/index.html', 'utf8');
  assert.ok(distHtml.length > 0, 'dist/index.html exists');
  const jsFiles = fs.readdirSync('dist/assets').filter(f => f.endsWith('.js'));
  assert.ok(jsFiles.length > 0, 'Bundle JS file exists');
  const bundleContent = fs.readFileSync(`dist/assets/${jsFiles[0]}`, 'utf8');
  assert.ok(bundleContent.includes('Cài đặt lộ trình') || bundleContent.includes('Hồ sơ học tập'), 'LearningSettingsView bundled');
  assert.ok(bundleContent.includes('Luyện tập theo kỹ năng') || bundleContent.includes('Trung tâm kỹ năng'), 'PracticeView bundled');
  console.log('✓ 7. Frontend bundle successfully incorporates LearningSettingsView, PracticeView and V2 navigation');

  console.log('\n🎉 ALL V2 LEARNING PROFILE & FRONTEND CONTRACT TESTS PASSED!');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

