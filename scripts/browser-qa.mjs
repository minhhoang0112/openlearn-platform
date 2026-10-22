import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {once} from 'node:events';
import {createApp} from '../server/app.mjs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core');
const origins=[];const app=createApp({origins});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
const apiOrigin=`http://127.0.0.1:${app.server.address().port}`;
const root=resolve('dist');
const web=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const body=Buffer.concat(chunks);
    const upstream=await fetch(apiOrigin+req.url,{method:req.method,headers:req.headers,...(body.length?{body}: {})});
    res.writeHead(upstream.status,Object.fromEntries(upstream.headers));res.end(Buffer.from(await upstream.arrayBuffer()));return;
  }
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep))file=resolve(root,'index.html');
  if(!existsSync(file)||!extname(file))file=resolve(root,'index.html');
  res.setHeader('Content-Type',extname(file)==='.js'?'text/javascript':extname(file)==='.css'?'text/css':'text/html');
  res.end(readFileSync(file));
});
web.listen(0,'127.0.0.1');await once(web,'listening');const origin=`http://127.0.0.1:${web.address().port}`;origins.push(origin);
let browser,page;const report={checks:[],errors:[]};
try{
  browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(origin);await page.getByRole('button',{name:'Đăng ký tài khoản',exact:true}).click();
  await page.locator('input[type=email]').fill('browser-qa@example.test');await page.locator('input[type=password]').fill('browser qa password');
  await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
  await page.getByRole('heading',{name:'Lộ trình đang học',exact:true}).waitFor();report.checks.push('register + authenticated dashboard');
  await page.goto(origin+'/category/toeic');await page.getByRole('heading',{name:'600 Essential words for the TOEIC Exam',exact:true}).waitFor();report.checks.push('TOEIC catalog reads actual API');
  await page.goto(origin+'/learning-path/14');await page.getByRole('heading',{name:'Danh sách 50 bộ thẻ hiện có',exact:true}).waitFor();report.checks.push('50 actual TOEIC sets');
  await page.goto(origin+'/study/163');await page.getByPlaceholder('Nhập câu trả lời của bạn...').fill('incorrect');
  await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
  // Original prompt remains while feedback is visible, then next explicitly advances.
  await page.getByText('nộp đơn, áp dụng',{exact:false}).first().waitFor();
  await page.getByRole('button',{name:/Tiếp tục/}).first().click();report.checks.push('server grading + explicit feedback transition');
  await page.goto(origin+'/game/match/163');await page.getByRole('button',{name:'apply',exact:true}).waitFor();
  await page.getByRole('button',{name:'apply',exact:true}).click();await page.getByRole('button',{name:'nộp đơn, áp dụng',exact:true}).click();
  await page.getByRole('button',{name:'apply',exact:true}).waitFor({state:'detached'});report.checks.push('matching pair stored on server');
  await page.goto(origin+'/exam/163');await page.getByRole('button',{name:'Nộp bài thi',exact:true}).waitFor();
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Nộp bài thi',exact:true}).click();
  await page.getByRole('button',{name:'Làm lại bài thi',exact:true}).waitFor();report.checks.push('exam batch submission + real result shape');
  await page.goto(origin+'/study-set/163');await page.getByText('background',{exact:true}).first().waitFor();
  assert.equal(await page.getByText('Example sentence locked for registered learners.',{exact:false}).count(),0);
  assert.equal(await page.locator('.blur-xs').count(),0);
  const row=page.locator('div').filter({has:page.getByText('background',{exact:true})}).filter({has:page.getByRole('button',{name:'Tự viết ví dụ',exact:true})}).last();
  await row.getByRole('button',{name:'Tự viết ví dụ',exact:true}).click();
  await page.getByRole('textbox',{name:'Ví dụ cho background',exact:true}).fill('She has a strong background in sales.');
  await page.getByRole('button',{name:'Lưu ví dụ',exact:true}).click();
  await page.getByText('She has a strong background in sales.',{exact:true}).waitFor();
  await page.reload();await page.getByText('She has a strong background in sales.',{exact:true}).waitFor();report.checks.push('examples beyond third row are open, editable and persist');
  await page.goto(origin+'/courses');await page.getByRole('button',{name:/A1/}).first().click();
  await page.getByRole('button',{name:/Hello & Goodbye/}).click();
  await page.getByRole('heading',{name:'Hello & Goodbye',exact:true}).waitFor();
  await page.getByRole('button',{name:'Bài tập',exact:true}).click();await page.getByRole('group').first().waitFor();report.checks.push('personal course opens actual lesson and graded practice');
  await page.goto(origin+'/comprehensive/163');await page.getByRole('button',{name:'Bài 1 · 0/5',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'4. Speaking',exact:true}).isEnabled(),true);report.checks.push('all comprehensive steps selectable without tier or prerequisite');
  await page.goto(origin+'/ai-study/163');await page.getByRole('button',{name:'Tạo câu hỏi',exact:true}).click();
  await page.getByRole('heading',{name:'Cài đặt AI',exact:true}).waitFor();report.checks.push('AI setup is actionable, no disabled paid feature gate');
  await page.screenshot({path:'research/captures/local-audit-qa.png',fullPage:true});
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report));
}catch(error){
  report.errors.push(error.message);
  if(page){console.log(JSON.stringify({url:page.url(),headings:await page.locator('h1,h2').allTextContents(),alerts:await page.locator('[role=alert]').allTextContents(),visible_text:(await page.locator('body').innerText()).slice(0,1200)}));await page.screenshot({path:'research/captures/local-qa-failure.png',fullPage:true});}
  throw error;
}finally{
  writeFileSync('docs/browser-qa.json',JSON.stringify(report,null,2)+'\n');
  await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();
}
