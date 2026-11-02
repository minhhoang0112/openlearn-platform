import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {once} from 'node:events';
import {createApp} from '../server/app.mjs';
const require=createRequire(new URL('../package.json',import.meta.url));
const {chromium}=require('playwright-core');
const origins=[],app=createApp({origins});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
const root=resolve('dist'),apiOrigin=`http://127.0.0.1:${app.server.address().port}`;
const web=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')){const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);const upstream=await fetch(apiOrigin+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});res.writeHead(upstream.status,Object.fromEntries(upstream.headers));res.end(Buffer.from(await upstream.arrayBuffer()));return;}
  let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+sep)||!existsSync(file)||!extname(file))file=resolve(root,'index.html');
  res.setHeader('Content-Type',extname(file)==='.js'?'text/javascript':extname(file)==='.css'?'text/css':'text/html');res.end(readFileSync(file));
});
web.listen(0,'127.0.0.1');await once(web,'listening');const origin=`http://127.0.0.1:${web.address().port}`;origins.push(origin);
const report={checked_at:new Date().toISOString(),checks:[],page_errors:[]};let browser,page;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);page.on('pageerror',e=>report.page_errors.push(e.message));await page.route('https://**/*',r=>r.abort());await page.addInitScript(()=>{window.speechSynthesis.speak=()=>{};window.speechSynthesis.cancel=()=>{};});
 const call=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz','Content-Type':'application/json'},...(body?{data:body}:{})});const e=await r.json();assert.ok(r.ok(),JSON.stringify(e));return e.data;};
 await call('POST','/auth/register',{email:'grading-browser@test.invalid',name:'Learner',password:'long browser test password'});
 await call('PATCH','/me',{settings:{study:{learn:{learning_engine:'segmented_v2',direction:'term_to_definition',question_types:['write'],shuffle:false,auto_audio:false,auto_advance_on_correct:true}}}});
 const set=await call('POST','/sets',{title:'Grading UI fixture',words:[{term:'apply',definition:'nộp đơn, áp dụng',example:'Please apply today.',example_translation:'Hãy nộp đơn hôm nay.'}]});
 await page.goto(origin+'/study/'+set.id);const input=page.getByRole('textbox',{name:'Câu trả lời',exact:true});await input.waitFor();await input.fill('áp dụng, nộp đơn');await input.press('Enter');await page.getByText('✓ Câu trả lời của bạn đúng!',{exact:true}).waitFor();report.checks.push('Reordered Vietnamese senses are accepted with green feedback');
 await page.waitForFunction(()=>{const el=document.querySelector('input[aria-label="Câu trả lời"]');return el&&!el.disabled&&el.value==='';});
 await input.fill('ap dung, nop don');await input.press('Enter');await page.getByText('Đúng nghĩa · Cần chú ý cách viết',{exact:true}).waitFor();assert.ok(await page.getByText('Đúng nghĩa · Cần chú ý cách viết',{exact:true}).evaluate(el=>el.closest('.border-amber-300')!==null));
 await page.waitForTimeout(1500);assert.equal(await page.getByRole('heading',{name:'Hoàn thành phiên học',exact:true}).count(),0);await page.getByRole('button',{name:'Tiếp tục (Enter)',exact:true}).waitFor();report.checks.push('Missing Vietnamese accents show accepted yellow feedback and do not auto-advance past the explanation');
 const id=app.db.prepare('SELECT id FROM study_sessions ORDER BY rowid DESC LIMIT 1').get().id;const state=await call('GET','/study/sessions/'+id);assert.equal(state.completed_words,1);report.checks.push('Accepted missing accents count toward BE practice mastery rather than being marked wrong');
 await page.getByRole('button',{name:'Tôi trả lời sai',exact:true}).click();await page.getByText(/Chưa đúng/).first().waitFor();assert.equal((await call('GET','/study/sessions/'+id)).completed_words,0);report.checks.push('Manual self-correction still reverses an accepted yellow answer');
 await page.goto(origin+'/study/'+set.id+'?direction=vi-en');await input.waitFor();await input.fill('aply');await input.press('Enter');await page.getByText('Gần đúng · Cần sửa cách viết',{exact:true}).waitFor();await page.getByText(/Chưa tính là đúng/).waitFor();
 const newest=app.db.prepare('SELECT id FROM study_sessions ORDER BY rowid DESC LIMIT 1').get().id;assert.equal((await call('GET','/study/sessions/'+newest)).completed_words,0);report.checks.push('English typo gets a distinct yellow not-yet-correct state and remains eligible for review');
 assert.deepEqual(report.page_errors,[]);report.passed=true;await page.screenshot({path:'.tmp/vocabulary-grading-yellow.png',fullPage:true});
}catch(e){report.passed=false;report.error=e.stack;process.exitCode=1;if(page)console.log((await page.locator('body').innerText()).slice(-1400));}
finally{writeFileSync('docs/vocabulary-grading-browser-validation.json',JSON.stringify(report,null,2)+'\n');await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();console.log(JSON.stringify(report));}
