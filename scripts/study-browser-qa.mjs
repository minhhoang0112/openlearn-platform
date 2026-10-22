import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {once} from 'node:events';
import {createApp} from '../server/app.mjs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
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
const report={checks:[],errors:[],audio:'Speech synthesis invocation observed with a browser spy; no microphone or audible-output claim.'};let browser,page;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{window.__spoken=[];window.speechSynthesis.speak=utterance=>window.__spoken.push({text:utterance.text,rate:utterance.rate});window.speechSynthesis.cancel=()=>{};});
  const api=async(method,path,body)=>{const response=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body?{data:body}:{})});const envelope=await response.json();assert.ok(response.ok(),JSON.stringify(envelope));return envelope.data;};
  await api('POST','/auth/register',{name:'Browser learner',email:'study-browser@example.test',password:'a long browser password'});
  const set=await api('POST','/sets',{title:'Study browser fixture',words:[{term:'hire',definition:'thuê, mướn; nhân viên',synonyms:'employ; recruit',example:'We hire new staff.'},{term:'apply',definition:'nộp đơn; áp dụng',synonyms:'request; use',example:'Please apply today.'}]});
  const words=(await api('GET',`/sets/${set.id}`)).words;
  await api('PATCH',`/words/${words[0].id}/progress`,{starred:true});
  await page.goto(origin+'/study/'+set.id);await page.getByRole('heading',{name:'hire',exact:true}).waitFor();
  await page.keyboard.press('Control');assert.equal(await page.evaluate(()=>window.__spoken.at(-1).text),'hire');
  const spokenCount=await page.evaluate(()=>window.__spoken.length);await page.getByRole('textbox',{name:'Câu trả lời',exact:true}).fill('thuê');await page.keyboard.press('Control+a');
  assert.equal(await page.evaluate(()=>window.__spoken.length),spokenCount);report.checks.push('standalone Ctrl plays term; Ctrl+A does not trigger audio');
  await page.keyboard.press('Enter');await page.getByText('✓ Câu trả lời của bạn đúng!',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Tôi trả lời sai',exact:true}).click();await page.getByText(/Chưa đúng/).first().waitFor();
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM activity WHERE kind='answer_self_correction'").get().n,1);report.checks.push('Enter grades partial Vietnamese meaning; self-correction repairs server state');
  await page.keyboard.press('Enter');await page.getByRole('heading',{name:'apply',exact:true}).waitFor();
  const id=await page.evaluate(()=>Object.entries(sessionStorage).find(([key])=>key.startsWith('oq-study:'))[1]);await page.reload();await page.getByRole('heading',{name:'apply',exact:true}).waitFor();
  const resumed=await api('GET',`/study/sessions/${id}`);assert.equal(resumed.completed,1);assert.equal(resumed.total,3);report.checks.push('adaptive queue and cursor survive reload');
  await page.getByRole('button',{name:'Cài đặt',exact:true}).click();await page.getByRole('radio',{name:'Luyện cả hai chiều (Cần 2 lần đúng mỗi chiều)',exact:true}).check();await page.getByLabel('Chỉ học từ đánh dấu sao',{exact:false}).check();await page.getByRole('button',{name:'Áp dụng',exact:true}).click();
  await page.getByRole('heading',{name:'hire',exact:true}).waitFor();const profile=await api('GET','/me');assert.equal(profile.settings.study.learn.direction,'both');assert.equal(profile.settings.study.learn.starred_only,true);
  const filteredId=await page.evaluate(()=>Object.entries(sessionStorage).find(([key])=>key.startsWith('oq-study:'))[1]);const filtered=await api('GET',`/study/sessions/${filteredId}`);assert.equal(filtered.total,2);assert.equal(filtered.total_words,1);report.checks.push('settings persist on backend and change real filtered two-direction queue');
  mkdirSync('docs/anti-reference',{recursive:true});await page.screenshot({path:'docs/anti-reference/local-study-question.png',fullPage:true});
  await page.getByRole('textbox',{name:'Câu trả lời',exact:true}).fill('thuê');await page.keyboard.press('Enter');await page.getByText('✓ Câu trả lời của bạn đúng!',{exact:true}).waitFor();await page.screenshot({path:'docs/anti-reference/local-study-feedback.png',fullPage:true});
  await page.goto(origin+'/dictation/'+set.id);await page.getByRole('button',{name:'Phát âm thanh nghe chép',exact:true}).waitFor();await page.getByRole('button',{name:'Cài đặt',exact:true}).click();await page.getByText('Nghe chép ví dụ',{exact:true}).click();await page.getByRole('button',{name:'Áp dụng',exact:true}).click();
  await page.getByText(/^Nghe chép ví dụ$/i).waitFor();await page.getByRole('button',{name:'Phát âm thanh nghe chép',exact:true}).click();assert.equal(await page.evaluate(()=>window.__spoken.at(-1).text),'We hire new staff.');
  await page.getByRole('textbox',{name:'Câu trả lời',exact:true}).fill('we hire new staff');await page.keyboard.press('Enter');await page.getByText('✓ Câu trả lời của bạn đúng!',{exact:true}).waitFor();report.checks.push('sentence dictation plays actual example and grades the full sentence');
  await page.screenshot({path:'docs/anti-reference/local-study-dictation.png',fullPage:true});
  await page.evaluate(()=>{for(const key of Object.keys(sessionStorage))if(key.startsWith('oq-study:'))sessionStorage.removeItem(key);});
  await page.goto(origin+'/study/'+set.id);await page.getByRole('heading',{name:'hire',exact:true}).waitFor();await page.getByRole('button',{name:'Cài đặt',exact:true}).click();
  await page.getByRole('radio',{name:'Hỏi tiếng Anh, trả lời tiếng Việt',exact:true}).check();await page.getByLabel('Chỉ học từ đánh dấu sao',{exact:false}).uncheck();await page.getByLabel('Điền từ (Fill in the blank)',{exact:true}).uncheck();await page.getByLabel('Trắc nghiệm 4 đáp án',{exact:true}).check();await page.getByLabel('Tự động tiếp tục khi trả lời đúng',{exact:false}).check();
  await page.screenshot({path:'docs/anti-reference/local-study-settings.png',fullPage:true});await page.getByRole('button',{name:'Áp dụng',exact:true}).click();
  await page.getByRole('button',{name:'thuê, mướn; nhân viên',exact:true}).click();await page.keyboard.press('Enter');await page.getByText('✓ Câu trả lời của bạn đúng!',{exact:true}).waitFor();await page.getByRole('heading',{name:'apply',exact:true}).waitFor();report.checks.push('quiz control changes real questions; selected option Enter grades; correct answer advances after delay');
  await page.getByRole('button',{name:'Cài đặt',exact:true}).click();page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Reset tiến độ học',exact:true}).click();assert.ok(app.db.prepare('SELECT COUNT(*) n FROM word_progress WHERE word_id=?').get(words[0].id).n>0);
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Reset tiến độ học',exact:true}).click();await page.getByRole('heading',{name:'hire',exact:true}).waitFor();assert.equal(app.db.prepare('SELECT COUNT(*) n FROM word_progress WHERE word_id IN(?,?)').get(...words.map(word=>word.id)).n,0);report.checks.push('reset cancelled leaves progress; confirmed reset removes progress and starts new session');
  await page.getByRole('button',{name:'thuê, mướn; nhân viên',exact:true}).click();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Tôi trả lời sai',exact:true}).click();await page.getByText(/Chưa đúng/).first().waitFor();await page.waitForTimeout(1400);await page.getByText(/Chưa đúng/).first().waitFor();assert.equal(await page.getByRole('heading',{name:'hire',exact:true}).count(),1);report.checks.push('self-correction cancels pending automatic advance');
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report));
}catch(error){report.errors.push(error.message);if(page){console.log(JSON.stringify({url:page.url(),text:(await page.locator('body').innerText()).slice(-2200)}));await page.screenshot({path:'research/captures/study-browser-failure.png',fullPage:true});}throw error;}
finally{writeFileSync('docs/study-browser-qa.json',JSON.stringify(report,null,2)+'\n');await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();}
