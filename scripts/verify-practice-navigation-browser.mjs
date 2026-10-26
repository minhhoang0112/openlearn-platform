import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createApp} from '../server/app.mjs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core'),origins=[],root=resolve('dist');
const app=createApp({origins});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const upstream=`http://127.0.0.1:${app.server.address().port}`;
const web=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')){const chunks=[];for await(const b of req)chunks.push(b);const body=Buffer.concat(chunks);const r=await fetch(upstream+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
  let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep)||!existsSync(file)||!extname(file))file=resolve(root,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'text/html');res.end(readFileSync(file));
});
web.listen(0,'127.0.0.1');await once(web,'listening');const origin=`http://127.0.0.1:${web.address().port}`;origins.push(origin);
const report={date:'2026-10-25',checks:[],page_errors:[]};let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(8000);page.on('pageerror',e=>report.page_errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  const api=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz'},data:body});const v=await r.json();assert.ok(r.ok(),JSON.stringify(v));return v.data;};
  await api('POST','/auth/register',{email:'navigation@test.invalid',name:'Navigation learner',password:'test private password'});
  const set=await api('POST','/sets',{title:'Navigation test set',words:[{term:'hello',definition:'xin chào'},{term:'thanks',definition:'cảm ơn'}]});
  await page.goto(origin+'/practice');await page.getByRole('heading',{name:'Luyện tập theo kỹ năng & chế độ học'}).waitFor();
  assert.equal(await page.locator('#practice-set-selector').count(),0);report.checks.push('Mode picker contains no inline Step 2');
  await page.getByRole('button',{name:'Nghe – Phát âm',exact:true}).click();
  await page.getByRole('button').filter({has:page.getByRole('heading',{name:'Nghe chép chính tả',exact:true})}).click();
  await page.waitForURL('**/practice/dictation?**');await page.getByRole('heading',{name:'Nghe chép chính tả',exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Luyện tập theo kỹ năng & chế độ học'}).count(),0);report.checks.push('Click mode opens independent set selector, without mode grid');
  const selector=page.url();await page.reload();await page.getByText('Navigation test set',{exact:true}).waitFor();assert.equal(page.url(),selector);report.checks.push('Selector deep link survives refresh');
  await page.getByText('Navigation test set',{exact:true}).click();await page.waitForURL('**/dictation/'+set.id+'?**');assert.equal(new URL(page.url()).searchParams.get('from'),selector.slice(origin.length));
  await page.getByRole('button',{name:'Trở về chọn bộ từ',exact:true}).click();await page.waitForURL(selector);report.checks.push('Exercise returns to the same mode and category');
  await page.getByRole('button',{name:'Từ đã thành thạo',exact:true}).click();await page.waitForURL('**scope=mastered');const scoped=page.url();
  await page.reload();await page.getByRole('heading',{name:'Nghe chép chính tả',exact:true}).waitFor();assert.equal(page.url(),scoped);
  await page.getByRole('button',{name:'Trở về chọn chế độ',exact:true}).click();await page.getByRole('heading',{name:'Luyện tập theo kỹ năng & chế độ học'}).waitFor();assert.equal(new URL(page.url()).searchParams.get('cat'),'Nghe – Phát âm');
  await page.goBack();await page.waitForURL(scoped);await page.goForward();await page.getByRole('heading',{name:'Luyện tập theo kỹ năng & chế độ học'}).waitFor();report.checks.push('Scope, category and browser Back/Forward restore independently');
  await page.getByText('Mở Nghe từng câu & Shadowing',{exact:true}).click();await page.getByRole('button',{name:'Lịch sử các phiên luyện tập'}).click();const history=page.url();
  await page.reload();
  const catalog=await api('GET','/learning/listening');
  const session=await api('POST','/learning/listening/sessions',{lesson_id:catalog.items[0].lesson_id,resume:true});
  await page.goto(origin+'/listening/practice/'+session.id+'?'+new URLSearchParams({source:'practice',from:history.slice(origin.length)}));
  await page.getByRole('button',{name:'Thoát phiên luyện nghe',exact:true}).click();await page.waitForURL(history);report.checks.push('Exit listening session restores its history tab');
  await page.getByRole('button',{name:'Học liệu cá nhân của tôi',exact:false}).click();
  const hub=page.url(),bytes=Buffer.alloc(32044);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(16000,24);bytes.writeUInt32LE(32000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(32000,40);
  await api('POST','/learning/materials',{submission_id:crypto.randomUUID(),title:'Navigation audio',transcript:'Hello.',translation:'Xin chào.',audio:{mime_type:'audio/wav',data:bytes.toString('base64')}});
  await page.reload();await page.getByText('Navigation audio',{exact:true}).click();await page.getByRole('button',{name:'Quay lại Thư viện học liệu',exact:true}).click();await page.waitForURL(hub);report.checks.push('Material detail restores its library and original listening parent');
  await page.getByRole('button',{name:'Trở về Thư viện nghe',exact:true}).click();await page.waitForURL(history);
  await page.getByRole('button',{name:'Trở về Luyện tập',exact:true}).click();await page.getByRole('heading',{name:'Luyện tập theo kỹ năng & chế độ học'}).waitFor();report.checks.push('Listening history and personal materials retain parent and provide Back');
  await page.goto(origin+'/practice/not-a-mode');await page.getByRole('heading',{name:'Không tìm thấy chế độ luyện tập'}).waitFor();await page.getByRole('button',{name:'Trở về chọn chế độ',exact:true}).click();await page.getByRole('heading',{name:'Luyện tập theo kỹ năng & chế độ học'}).waitFor();report.checks.push('Invalid mode offers safe return without unrelated exercises');
  await page.goto(origin+'/practice?mode=study_learn&cat=test');await page.getByRole('heading',{name:'Học từ kết hợp',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Luyện tập theo kỹ năng & chế độ học'}).count(),0);report.checks.push('Old mode links still open the dedicated selector');
  assert.deepEqual(report.page_errors,[]);report.passed=true;
}catch(e){report.passed=false;report.error=e.stack;process.exitCode=1;}
finally{writeFileSync('docs/practice-navigation-validation.json',JSON.stringify(report,null,2)+'\n');await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();console.log(JSON.stringify(report));}
