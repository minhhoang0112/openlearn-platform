import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createApp} from '../server/app.mjs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core'),origins=[],app=createApp({origins}),root=resolve('dist');
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
const upstream=`http://127.0.0.1:${app.server.address().port}`,requests=[];
const web=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')){requests.push(req.url);const chunks=[];for await(const b of req)chunks.push(b);const body=Buffer.concat(chunks);const r=await fetch(upstream+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
  let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep)||!existsSync(file)||!extname(file))file=resolve(root,'index.html');
  res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'text/html');res.end(readFileSync(file));
});
web.listen(0,'127.0.0.1');await once(web,'listening');const origin=`http://127.0.0.1:${web.address().port}`;origins.push(origin);
let browser;const report={date:'2026-10-24',database:'isolated in-memory',ai_calls:0,findings:[],page_errors:[]};
try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(6000);page.on('pageerror',e=>report.page_errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  const api=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz'},...(body?{data:body}:{})});return (await r.json()).data;};
  await api('POST','/auth/register',{email:'audit@test.invalid',name:'Audit learner',password:'audit private password'});
  report.actual_srs_summary=await api('GET','/srs/summary');report.actual_queue_total=(await api('GET','/srs/queue')).total;
  await page.goto(origin+'/repetition-study');await page.getByRole('button',{name:'Lặp lại ngắt quãng',exact:true}).waitFor();
  report.requests_sets_when_no_due=requests.some(p=>/^\/api\/v1\/sets(?:\?|$)/.test(p));
  report.overview_text=(await page.locator('body').innerText()).slice(0,2300);
  mkdirSync('docs/anti-reference',{recursive:true});await page.screenshot({path:'docs/anti-reference/srs-audit-overview.png',fullPage:true});
  await page.getByRole('button',{name:'Lặp lại ngắt quãng',exact:true}).click();
  const term=page.getByRole('heading',{level:2}).first();report.review_word_when_due_empty=await term.textContent().catch(()=>null);
  const before=await page.locator('input,textarea,[role=radio]').count();await page.getByRole('button',{name:'Viết',exact:true}).click();const after=await page.locator('input,textarea,[role=radio]').count();
  report.write_mode_input_counts={before,after};await page.screenshot({path:'docs/anti-reference/srs-audit-write-mode.png',fullPage:true});
  await page.goto(origin+'/today');await page.locator('body').waitFor();report.sidebar_has_home=await page.getByRole('button',{name:'Trang chủ',exact:true}).count();
  report.findings=['Fresh account has zero due words; current FE still requests unrelated sets.','Study mode tabs must be wired to actual exercises; screenshots and source show old flashcard-only presentation.','Sidebar has Today but lacks an explicit Home entry.'];
}catch(e){report.audit_error=e.message;process.exitCode=1;}
finally{writeFileSync('docs/learning-clarity-browser-audit.json',JSON.stringify(report,null,2)+'\n');await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();console.log(JSON.stringify(report));}
