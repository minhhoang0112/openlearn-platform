// Ordinary Playwright navigation fallback for scenarios whose initial full-page
// load never settles. REA passive captures separately establish REA Evidence.
// Never reads cookies, browser storage, auth headers, or private account endpoints.
import { createRequire } from 'node:module';
import { mkdirSync,writeFileSync } from 'node:fs';
const require=createRequire(process.env.REA_PACKAGE_JSON||'C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core');
const url=new URL(process.argv[2]);
if(url.origin!=='https://openquiz.ai')throw new Error('Only the user-selected OpenQuiz origin is allowed.');
const slug=process.argv[3]||url.pathname.replace(/\W+/g,'_')||'home';
if(!/^[\w-]+$/.test(slug))throw new Error('Invalid capture name.');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222',{timeout:10000});
try {
  const page=browser.contexts().flatMap(c=>c.pages()).find(p=>{try{return new URL(p.url()).origin===url.origin;}catch{return false;}});
  if(!page)throw new Error('No authorized OpenQuiz page found.');
  const network=[],pending=[];
  page.on('response',response=>{
    const u=new URL(response.url());
    if(u.origin!=='https://openquiz-be-production.up.railway.app'||!/^\/api\/(words\/wset|learning-paths|user-srs|repetition|courses|speaking-question|speaking-feedback|classes|reading|grammar)/.test(u.pathname))return;
    const item={method:response.request().method(),path:u.pathname,status:response.status()};network.push(item);
    if(response.headers()['content-type']?.includes('application/json'))pending.push(response.json().then(value=>{
      function shape(v,depth=0){if(depth>5)return typeof v;if(v===null)return 'null';if(Array.isArray(v))return {type:'array',length:v.length,item:v.length?shape(v[0],depth+1):null};if(typeof v==='object')return Object.fromEntries(Object.entries(v).slice(0,100).map(([k,val])=>[k,shape(val,depth+1)]));return typeof v;}
      item.response_shape=shape(value);
    }).catch(()=>{}));
  });
  await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:15000}).catch(error=>{if(!error.message.includes('Timeout'))throw error;});
  await page.waitForTimeout(1800);
  if(url.pathname==='/study-set/163')await page.getByRole('heading',{name:'Tuyển dụng & việc làm',exact:true}).waitFor({timeout:12000});
  const action_errors=[];
  for(const selector of process.argv.slice(4)) {
    const locator=selector.startsWith('role:')?page.getByRole('button',{name:selector.slice(5),exact:true}):page.locator(selector);
    try {await locator.click({timeout:6000});await page.waitForTimeout(2200);}catch(error){action_errors.push({selector,message:error.message.split('\n')[0]});break;}
  }
  if(new URL(page.url()).origin!==url.origin)throw new Error('Page left the selected origin.');
  const ui=(await page.locator('body').innerText({timeout:4000})).replace(/Minh Hoàng Công/g,'[current user]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[email]');
  await Promise.allSettled(pending);
  mkdirSync('research/captures',{recursive:true});
  writeFileSync(`research/captures/${slug}.json`,JSON.stringify({source:'ordinary_playwright_not_REA',url:page.url(),captured_at:new Date().toISOString(),ui,network,action_errors},null,2));
  await page.screenshot({path:`research/captures/${slug}.png`,timeout:5000}).catch(()=>{});
  console.log(JSON.stringify({url:page.url(),ui,action_errors,network:network.map(({method,path,status})=>({method,path,status}))}));
} finally {await browser.close();}
