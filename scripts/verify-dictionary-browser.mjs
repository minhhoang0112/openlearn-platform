import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createApp} from '../server/app.mjs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core'),origins=[],root=resolve('dist');let calls=0;
const app=createApp({origins,dictionary:{fetchImpl:async url=>{calls++;const q=new URL(url).searchParams.get('q');if(q==='offline')throw Error('offline');return Response.json({responseStatus:200,responseData:{translatedText:q==='tail'?'đuôi, đoạn cuối':'tìm kiếm'}});}}});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const upstream=`http://127.0.0.1:${app.server.address().port}`;
const web=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')){const chunks=[];for await(const b of req)chunks.push(b);const body=Buffer.concat(chunks);const r=await fetch(upstream+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
  let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep)||!existsSync(file)||!extname(file))file=resolve(root,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'text/html');res.end(readFileSync(file));
});
web.listen(0,'127.0.0.1');await once(web,'listening');const origin=`http://127.0.0.1:${web.address().port}`;origins.push(origin);
const report={date:'2026-10-24',provider:'controlled translation fixture; no Gemini',checks:[],page_errors:[]};let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(7000);page.on('pageerror',e=>report.page_errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  const api=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz'},data:body});const v=await r.json();assert.ok(r.ok(),JSON.stringify(v));return v.data;};
  await api('POST','/auth/register',{email:'dictionary-ui@test.invalid',name:'Dictionary learner',password:'test private password'});
  await api('POST','/sets',{title:'Wrong substring',words:[{term:'detail',definition:'chi tiết'}]});
  await page.goto(origin);await page.getByRole('button',{name:/Tra từ/}).first().click();
  const input=page.getByRole('textbox',{name:'Từ hoặc câu cần dịch'});await input.fill('tail');await input.press('Enter');
  await page.getByText('đuôi, đoạn cuối',{exact:true}).waitFor();report.checks.push('tail returns its online translation although local detail exists');
  await page.getByText(/Bản dịch tự động từ MyMemory/).waitFor();report.checks.push('UI identifies machine translation and Internet/provider limits');
  const count=calls;await input.press('Enter');await page.getByText(/Đã lưu tạm/).waitFor();assert.equal(calls,count);report.checks.push('Repeated lookup uses cache, not another provider request');
  await input.fill('seek');await input.press('Enter');await page.getByText('tìm kiếm',{exact:true}).waitFor();report.checks.push('Unstored seek translates without a vocabulary card or Gemini key');
  await input.fill('offline');await input.press('Enter');await page.getByRole('alert').filter({hasText:/Không kết nối/}).waitFor();report.checks.push('Network failure is an honest error, never another word definition');
  assert.deepEqual(report.page_errors,[]);report.passed=true;
}catch(e){report.passed=false;report.error=e.message;process.exitCode=1;}
finally{writeFileSync('docs/dictionary-browser-validation.json',JSON.stringify(report,null,2)+'\n');await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();console.log(JSON.stringify(report));}
