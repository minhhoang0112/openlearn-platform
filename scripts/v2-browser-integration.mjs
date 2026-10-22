// Real UI on built FE + actual BE + isolated in-memory database. No live AI calls.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createApp} from '../server/app.mjs';
import {starterLessons} from '../server/content/learning-v2/curriculum.mjs';
const require=createRequire(process.env.REA_PACKAGE_JSON||'C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core');
const origins=[],app=createApp({origins}),root=resolve('dist');
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
const upstreamOrigin=`http://127.0.0.1:${app.server.address().port}`;
const report={date:'2026-10-21',database:'isolated_in_memory',checks:[],page_errors:[],server_errors:[],ai_requests:0,limitations:['No physical microphone/speaker verification.','Chrome is testing the built frontend snapshot; Anti may change files afterwards.']};
const web=createServer(async(req,res)=>{
  try{
    if(req.url.startsWith('/api/')){
      if(req.url.includes('/ai/generate'))report.ai_requests++;
      const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);
      const r=await fetch(upstreamOrigin+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});
      if(r.status>=500)report.server_errors.push({path:req.url,status:r.status});
      res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;
    }
    let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root+sep)||!existsSync(file)||!extname(file))file=resolve(root,'index.html');
    res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'text/html');res.end(readFileSync(file));
  }catch(e){res.writeHead(500);res.end('Test server failed');report.server_errors.push({message:e.message});}
});
web.listen(0,'127.0.0.1');await once(web,'listening');const origin=`http://127.0.0.1:${web.address().port}`;origins.push(origin);
let browser,page;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(7000);
  page.on('pageerror',e=>report.page_errors.push(e.message));
  await page.route('https://**/*',route=>route.abort());
  const api=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{data:body})});const v=await r.json();assert.ok(r.ok(),JSON.stringify(v));return v.data;};
  await api('POST','/auth/register',{email:'browser-integration@test.invalid',name:'Browser QA',password:'isolated browser qa password'});
  const initial=await api('POST','/learning/sessions',{lesson_id:'foundation-introductions-01'});const id=initial.id;
  await page.goto(origin+'/lesson-run/'+id);
  await page.getByText('London',{exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('audio')?.readyState>=1);
  assert.ok(await page.locator('audio').first().evaluate(a=>Number.isFinite(a.duration)&&a.duration>5));report.checks.push('Browser decodes actual saved WAV');
  await page.getByRole('button',{name:'Kiểm tra đáp án',exact:true}).click();
  await page.getByRole('button',{name:'Xem trong Sổ lỗi',exact:true}).waitFor();report.checks.push('Wrong UI answer creates server mistake');
  await page.getByRole('button',{name:'Xem trong Sổ lỗi',exact:true}).click();
  await page.getByText('Hanoi',{exact:true}).click();
  const reviewButton=page.getByRole('button',{name:/Kiểm tra đáp án|Nộp đáp án|Nộp bài ôn/}).last();
  await reviewButton.click();
  const mistakes=await api('GET','/learning/mistakes');assert.equal(mistakes.items[0].review_count,1);report.checks.push('Mistake UI submits one real review');
  await page.goto(origin+'/lesson-run/'+id);
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  let session=await api('GET','/learning/sessions/'+id);
  while(session.current){
    const q=session.current;
    if(q.response_schema==='choice')await page.getByText(q.options[0].text,{exact:true}).click();
    if(q.response_schema==='text'){
      await page.locator('textarea').fill('I am a student. I live in Hanoi.');
      await page.getByRole('checkbox').check();
      if(q.type==='writing_task'){
        await page.waitForResponse(r=>r.url().endsWith('/draft')&&r.request().method()==='PUT'&&r.ok());
        await page.reload();await page.locator('textarea').waitFor();
        assert.equal(await page.locator('textarea').inputValue(),'I am a student. I live in Hanoi.');report.checks.push('Writing draft survives actual browser reload');
      }
    }
    await page.getByRole('button',{name:q.type==='reflection'?'Hoàn tất bài học':q.response_schema==='choice'?'Kiểm tra đáp án':'Lưu & Tiếp tục',exact:true}).click();
    await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
    session=await api('GET','/learning/sessions/'+id);
  }
  assert.equal(session.status,'completed');report.checks.push('All seven steps completed through UI');
  await page.goto(origin+'/progress');await page.getByRole('button',{name:/Lịch sử các phiên học/}).click();
  await page.getByRole('button',{name:'Xem bài đã nộp',exact:true}).first().click();
  await page.getByText('I am a student. I live in Hanoi.',{exact:true}).first().waitFor();report.checks.push('Progress history displays original submitted work');
  mkdirSync('docs/anti-reference',{recursive:true});await page.screenshot({path:'docs/anti-reference/local-v2-submitted-work.png'});
  let routine=await api('POST','/learning/sessions',{lesson_id:'foundation-routine-01'});
  await page.goto(origin+'/lesson-run/'+routine.id);
  while(routine.current){
    const q=routine.current;
    if(q.response_schema==='choice')await page.getByText(q.options[0].text,{exact:true}).click();
    if(q.response_schema==='text'){await page.locator('textarea').fill('I get up at seven. I study after class.');await page.getByRole('checkbox').check();}
    await page.getByRole('button',{name:q.type==='reflection'?'Hoàn tất bài học':q.response_schema==='choice'?'Kiểm tra đáp án':'Lưu & Tiếp tục',exact:true}).click();
    await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
    routine=await api('GET','/learning/sessions/'+routine.id);
  }
  assert.equal(routine.total_steps,8);assert.equal(routine.summary.graded_correct,3);
  const progress=await api('GET','/learning/progress');assert.equal(progress.skills.find(s=>s.key==='reading').graded_tasks,1);
  report.checks.push('New eight-step lesson including reading works through existing UI and records actual reading evidence');
  const checkpointId=process.argv.find(a=>a.startsWith('--checkpoint='))?.slice('--checkpoint='.length)??'foundation-checkpoint-01';
  let checkpoint=await api('POST','/learning/sessions',{lesson_id:checkpointId});
  report.checkpoint_lesson_id=checkpointId;
  const checkpointSource=starterLessons.find(l=>l.id===checkpoint.lesson_id);
  await page.goto(origin+'/lesson-run/'+checkpoint.id);
  while(checkpoint.current){
    const q=checkpoint.current;
    if(q.response_schema==='choice'){
      const key=checkpointSource.steps.find(step=>step.id===q.id).answer;
      await page.getByText(q.options.find(o=>o.id===key).text,{exact:true}).click();
    }
    if(q.response_schema==='text'){await page.locator('textarea').fill('I am a student. I study after class. I do not work on Sunday.');await page.getByRole('checkbox').check();}
    await page.getByRole('button',{name:q.type==='reflection'?'Hoàn tất bài học':q.response_schema==='choice'?'Kiểm tra đáp án':'Lưu & Tiếp tục',exact:true}).click();
    await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
    checkpoint=await api('GET','/learning/sessions/'+checkpoint.id);
  }
  assert.equal(checkpoint.total_steps,9);assert.equal(checkpoint.summary.checkpoint.passed,true);
  await page.getByRole('heading',{name:`Chúc mừng! Bạn đã đạt tiêu chí ${checkpoint.title}`,exact:true}).waitFor();
  report.checks.push('Nine-step checkpoint works on existing UI, preserves server result and six graded question keys');
  await page.screenshot({path:'docs/anti-reference/local-v2-checkpoint.png'});
  let email=await api('POST','/learning/sessions',{lesson_id:'system-handoff-email-01',resume:false});
  const emailSource=starterLessons.find(l=>l.id===email.lesson_id);
  while(email.current.type!=='writing_task'){
    const q=email.current,key=emailSource.steps.find(s=>s.id===q.id);
    const response=q.response_schema==='choice'?{option_id:key.answer}:q.response_schema==='text'?{text:'The service is running, but one client is waiting.',self_reviewed:true}:{acknowledged:true};
    const submitted=await api('POST',`/learning/sessions/${email.id}/submit`,{step_id:q.id,revision:email.revision,submission_id:crypto.randomUUID(),response});
    email=await api('POST',`/learning/sessions/${email.id}/advance`,{step_id:q.id,revision:submitted.session.revision});
  }
  await page.goto(origin+'/lesson-run/'+email.id);
  await page.getByRole('button',{name:'Xem câu mẫu tham khảo',exact:true}).click();
  const model=page.getByText('Subject: Test service update',{exact:false});
  await model.waitFor();
  assert.ok(['pre-line','pre-wrap','break-spaces'].includes(await model.evaluate(e=>getComputedStyle(e).whiteSpace)));
  assert.ok((await model.textContent()).includes('\n'));
  await page.screenshot({path:'docs/anti-reference/local-v2-email-model.png'});
  report.checks.push('Specialist email model preserves actual Subject/body line breaks in browser');
  assert.equal(report.ai_requests,0);assert.deepEqual(report.page_errors,[]);assert.deepEqual(report.server_errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.message;if(page){report.visible_text=(await page.locator('body').innerText().catch(()=>'' )).slice(-2200);await page.screenshot({path:'docs/anti-reference/local-v2-integration-failure.png'}).catch(()=>{});}process.exitCode=1;
}finally{
  writeFileSync('docs/v2-browser-integration.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();
}
