import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createApp} from '../server/app.mjs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core'),origins=[],root=resolve('dist'),app=createApp({origins});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const upstream=`http://127.0.0.1:${app.server.address().port}`;
const web=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')){const chunks=[];for await(const b of req)chunks.push(b);const body=Buffer.concat(chunks);const r=await fetch(upstream+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
  let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep)||!existsSync(file)||!extname(file))file=resolve(root,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'text/html');res.end(readFileSync(file));
});
web.listen(0,'127.0.0.1');await once(web,'listening');const origin=`http://127.0.0.1:${web.address().port}`;origins.push(origin);
const report={date:'2026-10-26',checks:[],page_errors:[]};let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext(),email='auth-context@test.invalid',password='private auth context password';
  const r=await context.request.post(origin+'/api/v1/auth/register',{headers:{'X-Requested-With':'OpenQuiz'},data:{email,password,name:'Learner'}});assert.ok(r.ok());await context.close();
  const deep='/study-set/13609?'+new URLSearchParams({source:'library',from:'/explore?q=toeic'});
  const cases=[[deep,deep],['/practice/dictation?'+new URLSearchParams({cat:'Ôn nhớ từ',scope:'library',from:'/explore'}),null],['/auth?'+new URLSearchParams({returnTo:'/my-program?program=english-it-system'}),'/my-program?program=english-it-system'],['/?q=School','/?q=School'],['/','/']];
  for(const [input,expected]of cases){
    const c=await browser.newContext(),page=await c.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>report.page_errors.push(e.message));await page.route('https://**/*',r=>r.abort());
    await page.goto(origin+input);await page.locator('input[type=email]').fill(email);await page.locator('input[type=password]').fill(password);await page.locator('button[type=submit]').click();
    const target=expected??input;await page.waitForURL(url=>url.pathname+url.search===target);await page.waitForLoadState('networkidle');assert.equal(new URL(page.url()).pathname+new URL(page.url()).search,target);
    report.checks.push({input,destination:target});
    if(input==='/'){
      const desktop=page.locator('aside').filter({visible:true});
      await desktop.getByRole('link',{name:'Trang chủ',exact:true}).waitFor();
      await desktop.getByRole('link',{name:'Học hôm nay',exact:true}).click();await page.waitForURL('**/today');
      await page.locator('a[title="OpenLearn - Trang chủ"]').click();await page.waitForURL(url=>url.pathname==='/');
      report.checks.push({input:'Trang chủ → Học hôm nay → logo',destination:'/'});
      const search=page.getByPlaceholder('Tìm kiếm bộ từ hoặc lộ trình khám phá...');
      let searches=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/v1/search')searches++;});
      await search.fill('School and Education');await search.press('Enter');
      await page.getByRole('heading',{name:/Kết quả tìm kiếm cho/}).waitFor();
      assert.equal(searches,1,'One request per submitted search');
      await page.getByText('[B1 Level] School and Education',{exact:true}).first().click();
      await page.waitForURL('**/study-set/**');
      await page.getByRole('button',{name:'Về Trang chủ',exact:true}).click();
      await page.waitForURL(url=>url.pathname==='/'&&url.search.includes('q='));
      await page.getByRole('heading',{name:/Kết quả tìm kiếm cho/}).waitFor();
      await page.locator('a[title="OpenLearn - Trang chủ"]').click();
      await page.waitForURL(url=>url.pathname==='/'&&!url.search);await page.waitForLoadState('networkidle');
      assert.equal(await search.inputValue(),'');
      assert.equal(await page.getByRole('heading',{name:/Kết quả tìm kiếm cho/}).count(),0);
      report.checks.push({input:'Root search → bộ từ → Về Trang chủ → logo clears old results',destination:'/'});
      const pathUrl='/learning-path/20269?'+new URLSearchParams({source:'library',from:'/?q=foundation'});
      await page.goto(origin+pathUrl);
      await page.getByRole('button',{name:'Về Trang chủ',exact:true}).waitFor();
      await page.getByRole('button',{name:'Xem bộ',exact:true}).first().click();
      await page.getByTestId('contextual-back-button').click();
      await page.waitForURL(url=>url.pathname+url.search===pathUrl);
      await page.getByRole('button',{name:'Về Trang chủ',exact:true}).click();
      await page.waitForURL(url=>url.pathname+url.search==='/?q=foundation');
      report.checks.push({input:'Trang chủ → lộ trình → bộ từ → lộ trình → Trang chủ giữ truy vấn',destination:'/?q=foundation'});
      await page.goto(origin+'/');await page.waitForLoadState('networkidle');
      for(const width of [360,390,768,1440]){
        await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      }
      report.checks.push({input:'Trang chủ không tràn ngang ở 360/390/768/1440px',destination:'/'});
      await page.setViewportSize({width:1440,height:1000});
      await page.goto(origin+'/explore');await page.waitForLoadState('networkidle');
      assert.ok(await page.locator('a[title="OpenLearn - Trang chủ"]').isVisible());
      await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Mở menu điều hướng'}).click();
      await page.getByRole('link',{name:'Trang chủ',exact:true}).filter({visible:true}).click();await page.waitForURL(url=>url.pathname==='/');
      report.checks.push({input:'Mobile menu → Trang chủ; /explore compatibility',destination:'/'});
    }
    await c.close();
  }
  assert.deepEqual(report.page_errors,[]);report.passed=true;
}catch(e){report.passed=false;report.error=e.stack;process.exitCode=1;}
finally{writeFileSync('docs/auth-context-validation.json',JSON.stringify(report,null,2)+'\n');await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();console.log(JSON.stringify(report));}
