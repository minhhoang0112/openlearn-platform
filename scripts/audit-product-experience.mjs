import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createApp} from '../server/app.mjs';
import {contentService} from '../server/content.mjs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core'),origins=[],root=resolve('dist');
const app=createApp({origins});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const upstream=`http://127.0.0.1:${app.server.address().port}`;
const web=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')){const chunks=[];for await(const b of req)chunks.push(b);const body=Buffer.concat(chunks);const r=await fetch(upstream+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
  let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep)||!existsSync(file)||!extname(file))file=resolve(root,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'text/html');res.end(readFileSync(file));
});
web.listen(0,'127.0.0.1');await once(web,'listening');const origin=`http://127.0.0.1:${web.address().port}`;origins.push(origin);
const folder='docs/product-audit';mkdirSync(folder,{recursive:true});
const report={date:'2026-10-25',scope:'isolated seeded account; current production build; no live AI',pages:[],backend:{},page_errors:[],http_errors:[]};let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>report.page_errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http_errors.push({status:r.status(),path:new URL(r.url()).pathname});});await page.route('https://**/*',r=>r.abort());
  const api=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz'},...(body?{data:body}:{})});const v=await r.json();if(!r.ok())throw Error(JSON.stringify(v));return v.data;};
  await api('POST','/auth/register',{email:'product-audit@test.invalid',name:'Product audit',password:'test private password'});
  await api('PUT','/learning/profile',{preferred_days:[1,2,3,4,5,6,7],time_budget_minutes:15});
  const plan15=await api('GET','/learning/today');await api('PUT','/learning/profile',{time_budget_minutes:45});const plan45=await api('GET','/learning/today');
  report.backend.plan_budget={requested_before:15,requested_after:45,returned_before:plan15.budget_minutes,returned_after:plan45.budget_minutes,items:plan45.items,changes_apply:plan45.profile_changes_apply};
  const set=await api('POST','/sets',{title:'Audit beginner set',words:[{term:'hello',definition:'xin chào'}]});
  report.backend.same_day_reviews=[];
  for(let i=0;i<3;i++){
    const s=await api('POST','/study/sessions',{set_id:set.id,mode:'write',settings:{shuffle:false}});
    const answer=s.question.direction==='definition_to_term'?'hello':'xin chào';
    const result=await api('POST',`/study/sessions/${s.id}/answers`,{question_id:s.question.id,answer});report.backend.same_day_reviews.push({correct:result.correct,progress:result.progress});
  }
  report.backend.srs_after_study=await api('GET','/srs/summary');report.backend.v2_progress_after_study=await api('GET','/learning/progress');
  const columns=app.db.prepare('PRAGMA table_info(words)').all().map(x=>x.name);report.backend.word_columns=columns;
  report.backend.content=app.db.prepare(`SELECT COUNT(*) total,SUM(TRIM(COALESCE(example,''))<>'') with_example,SUM(TRIM(COALESCE(phonetic,''))<>'') with_phonetic FROM words`).get();
  const content=contentService(app.db),publicSets=app.db.prepare('SELECT id,visibility,source FROM study_sets').all().filter(s=>s.visibility==='public'&&s.source!=='draft_authored');
  const publicWords=publicSets.flatMap(s=>content.words(s.id,null));
  report.backend.visible_content={scope:'public visible sets after runtime prepared-example enrichment; no personal notes',sets:publicSets.length,words:publicWords.length,examples:publicWords.filter(w=>w.example?.trim()).length,translated_examples:publicWords.filter(w=>w.example_translation?.trim()).length,synonyms:publicWords.filter(w=>w.synonyms?.trim()).length};
  const session=await api('POST','/learning/sessions',{lesson_id:plan15.items.find(i=>i.kind==='lesson').lesson_id,resume:true});
  const routes=[['home','/'],['today','/today'],['program','/my-program'],['library','/my-created'],['practice','/practice'],['selector','/practice/study_learn'],['srs','/repetition-study'],['mistakes','/mistakes'],['progress','/progress'],['listening','/listening'],['set','/study-set/163'],['lesson','/lesson-run/'+session.id]];
  for(const [width,height]of [[1440,1000],[390,844]]){
    await page.setViewportSize({width,height});
    for(const [name,route]of routes){
      await page.goto(origin+route);await page.waitForLoadState('networkidle');
      const data=await page.evaluate(()=>{
        const main=document.querySelector('main')||document.body,visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
        return {document_width:document.documentElement.scrollWidth,viewport:innerWidth,height:document.documentElement.scrollHeight,headings:[...main.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>e.textContent.trim()),buttons:[...main.querySelectorAll('button')].filter(visible).map(e=>e.textContent.trim()||e.getAttribute('aria-label')).slice(0,35),unlabelled_buttons:[...main.querySelectorAll('button')].filter(e=>visible(e)&&!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.getAttribute('title')).length,clipped:[...main.querySelectorAll('h1,h2,h3,button,input,textarea,select')].filter(visible).map(e=>({text:(e.textContent||e.getAttribute('placeholder')||e.tagName).trim().slice(0,80),left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right)})).filter(e=>e.left<0||e.right>innerWidth+2).slice(0,15),text:main.innerText.slice(0,2600)};
      });
      report.pages.push({name,route,width,...data});
      if(['home','today','practice','progress','srs','set','lesson'].includes(name))await page.screenshot({path:`${folder}/${name}-${width}.png`});
    }
    console.log('Audited '+routes.length+' pages at '+width+'px');
  }
  report.completed=true;
}catch(e){report.completed=false;report.error=e.stack;process.exitCode=1;}
finally{writeFileSync(folder+'/evidence.json',JSON.stringify(report,null,2)+'\n');await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();console.log(JSON.stringify({completed:report.completed,error:report.error,pages:report.pages.length,overflow:report.pages.filter(p=>p.document_width>p.width||p.clipped.length).map(p=>({name:p.name,width:p.width,clipped:p.clipped})),backend:report.backend.same_day_reviews,content:report.backend.content,page_errors:report.page_errors,http_errors:report.http_errors}));}
