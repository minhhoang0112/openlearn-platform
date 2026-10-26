import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/app.mjs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core'),origins=[],root=resolve('dist'),app=createApp({origins});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const upstream=`http://127.0.0.1:${app.server.address().port}`;
const web=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')){const chunks=[];for await(const b of req)chunks.push(b);const body=Buffer.concat(chunks);const r=await fetch(upstream+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
  let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep)||!existsSync(file)||!extname(file))file=resolve(root,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'text/html');res.end(readFileSync(file));
});
web.listen(0,'127.0.0.1');await once(web,'listening');const origin=`http://127.0.0.1:${web.address().port}`;origins.push(origin);
const report={date:'2026-10-26',checks:[],page_errors:[]};let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(7000);page.on('pageerror',e=>report.page_errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  const api=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz'},...(body?{data:body}:{})});const v=await r.json();assert.ok(r.ok(),JSON.stringify(v));return v.data;};
  await api('POST','/auth/register',{email:'goal-guards@test.invalid',name:'Learner',password:'private goal guard password'});
  await api('PUT','/learning/profile',{time_budget_minutes:15,preferred_days:[1,2,3,4,5,6,7]});const plan=await api('GET','/learning/today'),item=plan.items.find(i=>i.kind==='lesson');
  let genericStarts=0;page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/v1/learning/sessions')genericStarts++;});
  const failure=r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'SERVICE_UNAVAILABLE',message:'Không mở được kế hoạch thử nghiệm'}})});
  await page.route('**/learning/today/items/**/start',failure);
  await page.goto(origin+'/today');await page.getByRole('button',{name:'Bắt đầu bài học',exact:true}).click();await page.getByText('Không mở được kế hoạch thử nghiệm',{exact:true}).waitFor();assert.equal(genericStarts,0);report.checks.push('Failed daily start shows error without silently starting a different generic lesson');
  await page.unroute('**/learning/today/items/**/start',failure);
  let s=(await api('POST',`/learning/today/items/${item.id}/start`,{plan_id:plan.plan_id,revision:plan.plan_revision})).session;
  const url=goalItem=>origin+`/lesson-run/${s.id}?`+new URLSearchParams({plan_id:plan.plan_id,item_id:goalItem,target_cursor:'0',from:'/today'});
  await page.goto(url(item.id));await page.waitForLoadState('networkidle');assert.equal(await page.getByTestId('finish-today-goal-button').count(),0);report.checks.push('Forged target_cursor=0 cannot claim daily completion before any work');
  await page.goto(url('wrong-item'));await page.getByText(/Mục tiêu ngày đã thay đổi/).waitFor();assert.equal(await page.getByTestId('finish-today-goal-button').count(),0);report.checks.push('A mismatched plan item offers recovery instead of a false completion');
  while(s.cursor<item.workload.target_cursor){
    const q=s.current,response=q.response_schema==='choice'?{option_id:q.options[0].id}:q.response_schema==='text'?{text:'I am a student. I study every day.',self_reviewed:true}:{acknowledged:true};
    const submitted=await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:q.id,revision:s.revision,submission_id:randomUUID(),response});s=await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:submitted.session.revision});
  }
  await page.goto(url(item.id));await page.getByTestId('finish-today-goal-button').waitFor();
  const goalText=page.getByText(new RegExp(`Mục tiêu ngày đã đạt.*\\(${item.workload.target_cursor}\\s*/\\s*${s.total_steps} bước\\)`));await goalText.waitFor();report.checks.push('Real completed daily goal is confirmed using the server target, ignoring stale URL value');
  assert.deepEqual(report.page_errors,[]);report.passed=true;
}catch(e){report.passed=false;report.error=e.stack;process.exitCode=1;}
finally{writeFileSync('docs/daily-goal-guards-validation.json',JSON.stringify(report,null,2)+'\n');await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();console.log(JSON.stringify(report));}
