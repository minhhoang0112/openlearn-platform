import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createApp} from '../server/app.mjs';
const require=createRequire(new URL('../package.json',import.meta.url));
const {chromium}=require('playwright-core'),origins=[],root=resolve('dist');
const app=createApp({origins,ai:{provider:'gemini',geminiKey:'test-primary',secondaryKey:'test-secondary',model:'test-main',fastModel:'test-fast',providerFactory:()=>({generate:async()=>({reply:'Hello'})})}});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const upstream=`http://127.0.0.1:${app.server.address().port}`;
const web=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')){const chunks=[];for await(const b of req)chunks.push(b);const body=Buffer.concat(chunks);const r=await fetch(upstream+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
  let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep)||!existsSync(file)||!extname(file))file=resolve(root,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'text/html');res.end(readFileSync(file));
});
web.listen(0,'127.0.0.1');await once(web,'listening');const origin=`http://127.0.0.1:${web.address().port}`;origins.push(origin);
let browser;const errors=[];
try{
  browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext();
  const r=await context.request.post(origin+'/api/v1/auth/register',{headers:{'X-Requested-With':'OpenQuiz'},data:{email:'routing@test.invalid',password:'test routing password',name:'Learner'}});assert.ok(r.ok());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.goto(origin+'/settings/ai');const panel=page.getByRole('region',{name:'Phân công AI'});
  await panel.getByText('Đang tự chọn model theo công việc').waitFor();
  assert.ok((await panel.innerText()).includes('test-fast · Kết nối phụ'));
  assert.ok((await panel.innerText()).includes('test-main · Kết nối chính'));
  assert.ok(!(await page.content()).includes('test-primary'));
  await page.getByRole('textbox',{name:'Model AI',exact:true}).fill('test-personal');
  await page.getByRole('button',{name:'Lưu',exact:true}).click();await panel.getByText('Đang dùng cấu hình AI riêng').waitFor();
  assert.ok((await panel.innerText()).includes('test-personal'));
  await page.getByRole('button',{name:'Dùng phân công AI chung'}).click();await panel.getByText('Đang tự chọn model theo công việc').waitFor();
  await page.reload();await panel.getByText('Đang tự chọn model theo công việc').waitFor();
  for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);}
  assert.deepEqual(errors,[]);console.log('PASS: shared routes, key privacy, personal override, reset, reload, 4 viewport widths; no page errors. Mock provider only.');
}finally{await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();}
