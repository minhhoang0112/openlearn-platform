import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {once} from 'node:events';
import {createApp} from '../server/app.mjs';
const {chromium}=createRequire(new URL('../package.json',import.meta.url))('playwright-core');
const origins=[],app=createApp({origins,dictionary:{databasePath:null}});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
const root=resolve('dist'),upstream='http://127.0.0.1:'+app.server.address().port;
const web=createServer(async(req,res)=>{
 if(req.url.startsWith('/api/')){const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);const r=await fetch(upstream+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
 let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep)||!existsSync(file)||!extname(file))file=resolve(root,'index.html');
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'}[extname(file)])||'text/html');res.end(readFileSync(file));
});web.listen(0,'127.0.0.1');await once(web,'listening');const origin='http://127.0.0.1:'+web.address().port;origins.push(origin);
const report={checked_at:new Date().toISOString(),checks:[],page_errors:[]};let browser,page;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['microphone']});page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.page_errors.push(e.message));await page.route('https://**/*',r=>r.abort());
 await page.addInitScript(()=>{
  window.__guidedSpoken=[];window.speechSynthesis.speak=u=>window.__guidedSpoken.push(u.text);window.speechSynthesis.cancel=()=>{};
  window.SpeechRecognition=class{start(){setTimeout(()=>{this.onresult?.({results:[[{transcript:window.__guidedTarget||'Hello, Anna.'}]]});this.onend?.();},350);}stop(){}abort(){}};
 });
 const call=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz','Content-Type':'application/json'},...(body?{data:body}:{})});const e=await r.json();assert.ok(r.ok(),JSON.stringify(e));return e.data;};
 await call('POST','/auth/register',{email:'guided-browser@test.invalid',name:'Guided learner',password:'long guided browser password'});
 const course=(await call('GET','/courses')).items.find(c=>c.competence==='A1'),map=await call('GET',`/courses/${course.id}/guided-map`);
 await page.goto(origin+'/courses');await page.getByRole('heading',{name:'Khóa học',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Khóa học',exact:true}).getAttribute('aria-current'),'page');
 await page.getByRole('button',{name:'Sổ từ vựng phần 1',exact:true}).click();await page.getByRole('dialog',{name:'Sổ từ vựng',exact:true}).waitFor();await page.getByRole('button',{name:'Nghe từ hello',exact:true}).click();assert.ok(await page.evaluate(()=>window.__guidedSpoken.includes('hello')));await page.getByRole('button',{name:'Đóng sổ từ vựng',exact:true}).click();
 await page.getByTestId('guided-lesson-'+map.lessons[1].id).click();await page.getByText(/Hoàn thành bài phía trước/).waitFor();assert.equal(await page.getByRole('button',{name:'Bắt đầu học',exact:true}).count(),0);await page.getByRole('button',{name:'Đóng',exact:true}).click();
 report.checks.push('Dedicated sidebar, 30-lesson map, real prerequisite message and spoken part vocabulary');
 await page.getByTestId('guided-course-continue').click();await page.getByTestId('guided-task').waitFor();
 let wrong=false,mic=false,reloaded=false;
 for(let guard=0;guard<100;guard++){
  const row=app.db.prepare("SELECT * FROM course_learning_sessions WHERE json_extract(state,'$.engine')='guided_course_v2' ORDER BY created_at DESC LIMIT 1").get();
  if(row.completed_at)break;
  const state=JSON.parse(row.state),task=state.steps[state.index];
  await page.waitForFunction(id=>document.querySelector('[data-testid="guided-task"]')?.getAttribute('data-task-id')===id,task.id);
  const advance=async()=>{await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.waitForFunction(id=>document.querySelector('[data-testid="guided-task"]')?.getAttribute('data-task-id')!==id,task.id);};
  if(state.pending){await advance();continue;}
  if(['intro','card'].includes(task.type)){await advance();continue;}
  const bad=!wrong&&task.type==='choice';
  if(task.type==='choice'){
   const option=task.options.find(o=>bad?o.id!==task.correct_option_id:o.id===task.correct_option_id);await page.getByRole('button',{name:option.text,exact:true}).click();if(bad)wrong=true;
  }else if(task.type==='arrange')for(const id of task.expected)await page.getByTestId('guided-token-'+id).click();
  else{
   if(task.type==='listen'){await page.getByRole('button',{name:'Nghe câu',exact:true}).click();await page.waitForFunction(text=>window.__guidedSpoken.includes(text),task.english);}
   if(task.type==='speak'&&!mic){
    await page.evaluate(text=>{window.__guidedTarget=text;},task.expected);
    await page.getByRole('button',{name:'Nói qua mic',exact:true}).click();await page.waitForFunction(()=>!!document.querySelector('audio[src^="blob:"]'));
    await page.waitForFunction(text=>document.querySelector('input[aria-label="Câu trả lời"]').value===text,task.expected);mic=true;
   }else await page.getByRole('textbox',{name:'Câu trả lời',exact:true}).fill(task.expected);
  }
  await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await page.getByRole('status').waitFor();
  if(bad&&!reloaded){await page.reload();await page.getByText(/Chưa đúng\. Xem câu mẫu/).waitFor();reloaded=true;report.checks.push('Wrong answer feedback and exact task survive reload without completing the lesson');}
  await advance();
 }
 await page.getByRole('heading',{name:'Bạn đã hoàn thành bài này!',exact:true}).waitFor();assert.ok(wrong&&mic&&reloaded);
 report.checks.push('All seven activity types, mistake retries, real local recording playback, simulated speech transcript and listening TTS work end to end');
 await page.getByRole('button',{name:'Học bài tiếp theo',exact:true}).click();await page.getByRole('heading',{name:map.lessons[1].title,exact:true}).waitFor();
 await page.getByRole('button',{name:'Về bản đồ khóa học',exact:true}).click();await page.getByTestId('guided-lesson-'+map.lessons[0].id).waitFor();
 assert.match(await page.getByTestId('guided-lesson-'+map.lessons[0].id).innerText(),/Đã hoàn thành/);
 await page.screenshot({path:'.tmp/guided-course-map-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.reload();await page.getByTestId('guided-course-continue').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.getByTestId('guided-course-continue').click();await page.getByTestId('guided-task').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:'.tmp/guided-course-lesson-mobile.png',fullPage:true});
 report.checks.push('Next-lesson unlock, course return and 390px mobile map/lesson have no horizontal overflow');
 await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/my-program');await page.getByRole('link',{name:'Lộ trình',exact:true}).waitFor();
 await page.goto(origin+'/');await page.getByRole('heading',{name:'Khám phá bộ từ & lộ trình',exact:true}).waitFor();
 report.checks.push('Existing program route and original homepage remain accessible');
 assert.deepEqual(report.page_errors,[]);report.passed=true;
}catch(e){report.passed=false;report.error=e.stack;process.exitCode=1;if(page){console.log((await page.locator('body').innerText()).slice(-1600));await page.screenshot({path:'.tmp/guided-course-failure.png',fullPage:true});}}
finally{mkdirSync('docs',{recursive:true});writeFileSync('docs/guided-courses-browser-validation.json',JSON.stringify(report,null,2)+'\n');await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));await app.close();console.log(JSON.stringify(report));}
