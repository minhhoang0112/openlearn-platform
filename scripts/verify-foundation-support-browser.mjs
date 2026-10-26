import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
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
const report={date:'2026-10-26',contract:app.openapi().info.version,checks:[],page_errors:[],ai_calls:0};let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(8000);page.on('pageerror',e=>report.page_errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  let opens=0;page.on('request',r=>{const p=new URL(r.url()).pathname;if(p.endsWith('/support/open'))opens++;if(r.method()==='POST'&&(p.includes('/ai/generate')||p.includes('/ai-feedback')||p.includes('/audio-reviews')))report.ai_calls++;});
  const api=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz'},...(body?{data:body}:{})});const v=await r.json();assert.ok(r.ok(),JSON.stringify(v));return v.data;};
  await api('POST','/auth/register',{email:'support-ui@test.invalid',name:'Learner',password:'private support UI password'});
  const start=id=>api('POST','/learning/sessions',{lesson_id:id,resume:false});let s=await start('foundation-introductions-01');
  await page.goto(origin+'/lesson-run/'+s.id);await page.getByText('Hanoi',{exact:true}).click();
  const check=page.getByRole('button',{name:/Kiểm tra đáp án/});assert.equal(await check.isEnabled(),true);
  await page.getByRole('button',{name:'Kiến thức cho bài này',exact:true}).click();const panel=page.getByTestId('lesson-learning-support');await panel.waitFor();
  await panel.locator('summary').filter({hasText:'Từ và cụm trong bài'}).click();await panel.locator('dl').getByText('Tôi là sinh viên.',{exact:true}).waitFor();
  assert.equal(await check.isEnabled(),true);report.checks.push('Bilingual support opens before answering without clearing the selected option');
  const count=opens;await page.getByRole('button',{name:'Đóng kiến thức cho bài này',exact:true}).click();await page.getByRole('button',{name:'Kiến thức cho bài này',exact:true}).click();assert.equal(opens,count);report.checks.push('Closing and reopening the current-step support uses the loaded pack');
  await check.click();await page.waitForLoadState('networkidle');s=await api('GET','/learning/sessions/'+s.id);assert.ok(s.current.feedback.assistance_used.includes('learning_support'));assert.equal(s.cursor,0);report.checks.push('A supported answer remains on its step and is recorded as assisted');
  const advance=async current=>{
    const q=current.current,response=q.response_schema==='choice'?{option_id:q.options[0].id}:q.response_schema==='text'?{text:'I study English.',self_reviewed:true}:{acknowledged:true};
    const submitted=current.current.feedback?{session:current}:await api('POST',`/learning/sessions/${current.id}/submit`,{step_id:q.id,revision:current.revision,submission_id:randomUUID(),response});
    return api('POST',`/learning/sessions/${current.id}/advance`,{step_id:q.id,revision:submitted.session.revision});
  };
  while(s.current.id!=='writing')s=await advance(s);
  await page.goto(origin+'/lesson-run/'+s.id);const input=page.locator('textarea').first();
  const saved=page.waitForResponse(r=>r.url().endsWith('/draft')&&r.request().method()==='PUT');await input.fill('My name is Mai. I live in Hue.');await saved;
  await page.getByRole('button',{name:'Kiến thức cho bài này',exact:true}).click();await panel.waitFor();assert.equal(await input.inputValue(),'My name is Mai. I live in Hue.');
  await page.reload();assert.equal(await input.inputValue(),'My name is Mai. I live in Hue.');assert.equal((await api('GET','/learning/sessions/'+s.id)).learning_support.used_before_submission,true);report.checks.push('Opening support preserves writing draft and assistance across reload');
  for(const id of ['foundation-time-01','foundation-help-01','foundation-routine-01']){
    const lesson=await start(id);await page.goto(origin+'/lesson-run/'+lesson.id);await page.getByRole('button',{name:'Kiến thức cho bài này',exact:true}).click();await panel.waitFor();assert.ok((await panel.innerText()).length>200);
  }
  report.checks.push('All four foundation lessons expose their authored support in the real runner');
  mkdirSync('docs/product-audit',{recursive:true});
  for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:900});await panel.locator('summary').filter({hasText:'Ngữ pháp dễ hiểu'}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`docs/product-audit/m3-support-${width}.png`});}
  report.checks.push('Support fits 360/390/768/1440px without horizontal page overflow');
  const outside=await start('system-introductions-01');await page.goto(origin+'/lesson-run/'+outside.id);await page.waitForLoadState('networkidle');assert.equal(await page.getByRole('button',{name:'Kiến thức cho bài này',exact:true}).count(),0);report.checks.push('Unsupported lessons retain their existing runner without unrelated notes');
  assert.equal(report.ai_calls,0);assert.deepEqual(report.page_errors,[]);report.passed=true;
}catch(e){report.passed=false;report.error=e.stack;process.exitCode=1;}
finally{writeFileSync('docs/foundation-support-browser-validation.json',JSON.stringify(report,null,2)+'\n');await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();console.log(JSON.stringify(report));}
