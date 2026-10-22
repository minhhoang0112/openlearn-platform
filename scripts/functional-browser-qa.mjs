// Isolated application behavior checks. The provider fixture is deterministic;
// live-model quality is checked separately and never inferred from this fixture.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createApp} from '../server/app.mjs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core');
let failOnce=true;
const gateway=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;
  const {task,input}=JSON.parse(raw);
  if(task==='conversation'&&input.message==='fail once'&&failOnce){failOnce=false;res.writeHead(503);res.end('{}');return;}
  const result=task==='conversation'?{reply:'Tell me about your profile and the job you want.'}:task==='conversation_hint'?{hint:'Describe your recent work experience.',example:'I updated my profile yesterday.'}:task==='translation'?{translation:'Hãy kể về hồ sơ của bạn và công việc bạn muốn.'}:task==='speaking_question'?{question:'When did you update your profile?'}:task==='speaking_hint'?{hint:'Use the simple past tense.',example:'I updated my profile yesterday.'}:task==='speaking_feedback'?{feedback:'Your sentence is clear. The past tense is appropriate here.'}:task==='reading'?{passage:'I updated my profile today. The company will hire new staff. I apply for a job every week.',questions:[{q:'What did I update?',options:['My profile','My car','My address'],correct:0,explanation:'The first sentence says profile.'},{q:'Who will hire staff?',options:['The company','A school','Nobody'],correct:0,explanation:'The company will hire new staff.'}]}:null;
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
});
gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
const origins=[],app=createApp({origins,ai:{url:`http://127.0.0.1:${gateway.address().port}`}});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
const apiOrigin=`http://127.0.0.1:${app.server.address().port}`,root=resolve('dist');
const web=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
    const upstream=await fetch(apiOrigin+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});
    res.writeHead(upstream.status,Object.fromEntries(upstream.headers));res.end(Buffer.from(await upstream.arrayBuffer()));return;
  }
  let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+sep)||!existsSync(file)||!extname(file))file=resolve(root,'index.html');
  res.setHeader('Content-Type',extname(file)==='.js'?'text/javascript':extname(file)==='.css'?'text/css':'text/html');res.end(readFileSync(file));
});
web.listen(0,'127.0.0.1');await once(web,'listening');const origin=`http://127.0.0.1:${web.address().port}`;origins.push(origin);
let browser,page;const report={provider:'controlled_gateway_fixture',checks:[],errors:[]};
try{
  browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>report.errors.push(e.message));
  const api=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{data:body})});const value=await r.json();assert.ok(r.ok(),JSON.stringify(value));return value.data;};
  await api('POST','/auth/register',{email:'functional-browser@test.invalid',name:'Functional QA',password:'functional qa private password'});
  const set=await api('POST','/sets',{title:'Functional QA vocabulary',words:[{term:'profile',definition:'lý lịch',example:'She updated her profile today.',synonyms:'biography; resume'},{term:'hire',definition:'thuê',example:'We hire new staff.'},{term:'apply',definition:'ứng tuyển',example:'I apply for a job.'}]});
  const details=await api('GET','/sets/'+set.id);
  for(const word of details.words)await api('PUT','/words/'+word.id+'/notes',{example:word.example,translation:'Câu dịch kiểm thử cho '+word.term,synonyms:word.synonyms});

  await api('POST','/exercise-attempts',{set_id:set.id,kind:'grammar_order',original_order:true});
  await page.goto(origin+'/grammar/'+set.id);
  const selected=page.getByLabel('Câu đang sắp xếp',{exact:true});await selected.waitFor();
  await page.getByRole('button',{name:'She',exact:true}).click();
  await page.getByRole('button',{name:'Lưu bài',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:/Lịch sử \(/}).click();
  await page.getByRole('button').filter({hasText:'Đang ở câu'}).first().click();
  await selected.getByRole('button',{name:'She',exact:true}).waitFor();
  report.checks.push('grammar token draft and bookmark survive reload and resume');
  await selected.getByRole('button',{name:'She',exact:true}).click();
  assert.equal(await selected.getByRole('button').count(),0);
  for(const token of ['She','updated','her','profile','today.'])await page.getByRole('button',{name:token,exact:true}).click();
  await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
  await page.getByText('✓ Chính xác!',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Dịch nghĩa',exact:true}).click();
  await page.getByText('Câu dịch kiểm thử cho profile',{exact:true}).waitFor();
  await page.screenshot({path:'docs/anti-reference/local-grammar-feedback.png'});
  await page.getByRole('button',{name:'Tiếp tục (Enter)',exact:true}).click();
  report.checks.push('grammar remove/reorder/check/translation/next are server-backed');

  await page.goto(origin+'/reading/'+set.id);
  await page.getByRole('heading',{name:/Ngân hàng từ/}).waitFor();
  const readingId=app.db.prepare("SELECT a.id FROM exercise_attempts a JOIN generated_content g ON g.id=a.content_id WHERE g.kind='reading' LIMIT 1").get().id;
  const reading=await api('GET','/exercise-attempts/'+readingId+'/questions');assert.ok(reading.questions.length>=5);
  for(const [index,q] of reading.questions.filter(q=>q.type==='cloze').entries())await page.getByRole('button',{name:q.options[index].text,exact:true}).first().click();
  for(const field of await page.locator('fieldset').all())await field.locator('label').first().click();
  await page.getByRole('button',{name:'Kiểm tra đáp án',exact:true}).click();
  await page.getByText(/Kết quả:/).first().waitFor();
  assert.equal((await api('GET','/exercise-attempts/'+readingId+'/questions')).completed,true);
  await page.reload();await page.getByText(/Kết quả:/).first().waitFor();
  report.checks.push('reading actual cloze and comprehension grade and persist completion');

  await page.goto(origin+'/conversation/'+set.id);
  await page.getByPlaceholder('Tự động theo bộ từ').fill('Job interview');
  await page.getByRole('button',{name:'Bắt đầu cuộc hội thoại',exact:true}).click();
  await page.getByText('Tell me about your profile and the job you want.',{exact:true}).waitFor();
  let thread=(await api('GET','/conversations')).items[0];
  let saved=await api('GET','/conversations/'+thread.id);assert.equal(saved.messages.length,1);assert.equal(saved.messages[0].role,'assistant');assert.equal(saved.settings.topic,'Job interview');
  await page.getByRole('button',{name:'Dịch nghĩa',exact:true}).first().click();
  await page.getByText('Hãy kể về hồ sơ của bạn và công việc bạn muốn.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Ẩn bản dịch',exact:true}).first().click();
  assert.equal(await page.getByText('Hãy kể về hồ sơ của bạn và công việc bạn muốn.',{exact:true}).count(),0);
  await page.getByLabel('Tin nhắn',{exact:true}).fill('fail once');
  await page.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();
  await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('Tin nhắn',{exact:true}).inputValue(),'fail once');
  assert.equal((await api('GET','/conversations/'+thread.id)).messages.length,1);
  await page.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();
  await page.getByLabel('Tin nhắn',{exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('textarea[aria-label="Tin nhắn"]')?.value==='');
  assert.equal((await api('GET','/conversations/'+thread.id)).messages.length,3);
  await page.getByRole('button',{name:'Bí ý tưởng? Xem gợi ý',exact:true}).click();
  await page.getByRole('button',{name:'Dùng câu này',exact:true}).click();
  assert.equal(await page.getByLabel('Tin nhắn',{exact:true}).inputValue(),'I updated my profile yesterday.');
  await page.screenshot({path:'docs/anti-reference/local-conversation.png'});
  report.checks.push('conversation setup/opening/translation/hint and failure-safe retry persist actual messages');
  await page.reload();await page.getByRole('button',{name:/Lịch sử \(/}).click();
  await page.getByRole('button',{name:thread.title,exact:true}).click();
  await page.getByLabel('Tin nhắn',{exact:true}).waitFor();
  assert.equal(await page.getByText('fail once',{exact:true}).count(),1);
  report.checks.push('conversation history resumes after reload');

  await page.goto(origin+'/ai-study/'+set.id);
  await page.getByRole('button',{name:'Tạo câu hỏi',exact:true}).click();
  await page.getByText(/When did you update your profile\?/).waitFor();
  await page.getByRole('button',{name:'Xem gợi ý',exact:true}).click();
  await page.getByText(/Use the simple past tense/).waitFor();
  await page.getByLabel('Câu trả lời',{exact:true}).fill('I updated my profile yesterday.');
  await page.getByRole('button',{name:'Nhận phản hồi AI',exact:true}).click();
  await page.getByText('Your sentence is clear. The past tense is appropriate here.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Từ tiếp theo',exact:true}).click();
  await page.getByRole('heading',{name:'hire',exact:true}).waitFor();
  await page.getByRole('button',{name:/Lịch sử \(/}).click();
  await page.getByRole('button',{name:/^Phản hồi/}).first().click();
  await page.getByRole('heading',{name:'profile',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Câu trả lời',{exact:true}).inputValue(),'I updated my profile yesterday.');
  await page.screenshot({path:'docs/anti-reference/local-speaking-feedback.png'});
  report.checks.push('Speaking question/hint/feedback and history restore target word and learner response');
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report));
}catch(e){report.errors.push(e.message);if(page){console.log(JSON.stringify({url:page.url(),text:(await page.locator('body').innerText()).slice(-2500)}));await page.screenshot({path:'research/captures/functional-qa-failure.png'});}throw e;
}finally{
  writeFileSync('docs/functional-browser-qa.json',JSON.stringify(report,null,2)+'\n');
  await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();gateway.closeAllConnections();await new Promise(r=>gateway.close(r));
}
