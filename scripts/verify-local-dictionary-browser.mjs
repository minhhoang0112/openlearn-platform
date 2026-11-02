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
const report={checked_at:new Date().toISOString(),checks:[],page_errors:[],external_requests:0,text_only:true};let browser,page;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);page.on('pageerror',e=>report.page_errors.push(e.message));await page.route('https://**/*',r=>{report.external_requests++;return r.abort();});
 await page.addInitScript(()=>{window.speechSynthesis.speak=()=>{};window.speechSynthesis.cancel=()=>{};});
 const call=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz','Content-Type':'application/json'},...(body?{data:body}:{})});const e=await r.json();assert.ok(r.ok(),JSON.stringify(e));return e.data;};
 await call('POST','/auth/register',{email:'dictionary-browser@test.invalid',name:'Learner',password:'long browser test password'});
 const set=await call('POST','/sets',{title:'Dictionary fixture',words:[{term:'apprentice',definition:'người học việc',part_of_speech:'noun',synonyms:'intern; seek',example:'The apprentice is learning.',example_translation:'Người học việc đang học.'}]});
 await page.goto(origin+'/study-set/'+set.id);await page.getByRole('button',{name:'Lật thẻ',exact:true}).click();
 await page.getByTestId('synonym-chip-intern').first().click();await page.getByText('thực tập sinh; người thực tập',{exact:true}).waitFor();assert.equal(await page.getByText('Chưa có nghĩa lưu sẵn trong từ điển nội bộ',{exact:true}).count(),0);report.checks.push('Clicked intern synonym immediately shows a useful Vietnamese noun sense');
 await page.getByTestId('synonym-chip-seek').first().click();await page.getByText('Tìm, đi tìm, tìm kiếm, cố tìm cho được.',{exact:true}).waitFor();await page.getByRole('link',{name:'Wiktionary · CC-BY-SA-4.0',exact:true}).waitFor();report.checks.push('Synonym popover uses imported dictionary and displays attribution');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('openquiz:open-dictionary',{detail:{query:'tail'}})));await page.getByRole('heading',{name:'tail',exact:true}).waitFor();await page.getByText('Đuôi (thú vật, chim, cá... ).',{exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'detail',exact:true}).count(),0);report.checks.push('Global dictionary resolves tail exactly from local data, never detail');
 await page.getByRole('button',{name:'Lưu thành bộ thẻ',exact:true}).first().click();await page.getByText('Đã thêm',{exact:true}).waitFor();const saved=await call('GET','/sets?q='+encodeURIComponent('Tra cứu: tail'));const row=saved.items.find(x=>x.title==='Tra cứu: tail');assert.ok(row);const detail=await call('GET','/sets/'+row.id);assert.ok(detail.description.includes('vi.wiktionary.org/wiki/tail'));assert.ok(detail.description.includes('CC-BY-SA-4.0'));report.checks.push('Saved flashcard preserves Wiktionary source and license in set description');
 const search=page.getByRole('textbox',{name:'Từ hoặc câu cần dịch'});await search.fill('seek');await search.press('Enter');await page.getByRole('heading',{name:'seek',exact:true}).waitFor();await page.getByText('Tìm, đi tìm, tìm kiếm, cố tìm cho được.',{exact:true}).last().waitFor();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));report.checks.push('Long dictionary meanings wrap on a narrow viewport');
 assert.deepEqual(report.page_errors,[]);assert.equal(report.external_requests,0);report.passed=true;await page.screenshot({path:'.tmp/dictionary-local-browser.png',fullPage:true});
}catch(e){report.passed=false;report.error=e.stack;process.exitCode=1;if(page)console.log((await page.locator('body').innerText()).slice(-1600));}
finally{writeFileSync('docs/dictionary-browser-validation.json',JSON.stringify(report,null,2)+'\n');await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();console.log(JSON.stringify(report));}
