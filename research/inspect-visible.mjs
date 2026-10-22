import {createRequire} from 'node:module';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('https://openquiz.ai/'));
  await page.reload({waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForTimeout(2500);
  console.log(JSON.stringify({url:page.url(),buttons:(await page.locator('button').allTextContents()).filter(s=>s.trim()).slice(-20)}));
} finally {await browser.close();}
