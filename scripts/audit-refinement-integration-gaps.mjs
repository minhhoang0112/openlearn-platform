import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/app.mjs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core'),origins=[],root=resolve('dist'),app=createApp({origins});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const upstream=`http://127.0.0.1:${app.server.address().port}`;
const web=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')){const chunks=[];for await(const b of req)chunks.push(b);const body=Buffer.concat(chunks);const r=await fetch(upstream+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
  let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep)||!existsSync(file)||!extname(file))file=resolve(root,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'text/html');res.end(readFileSync(file));
});
web.listen(0,'127.0.0.1');await once(web,'listening');const origin=`http://127.0.0.1:${web.address().port}`;origins.push(origin);
const report={date:'2026-10-25',contract:app.openapi().info.version,findings:[],page_errors:[]};let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(7000);page.on('pageerror',e=>report.page_errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  const api=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz'},...(body?{data:body}:{})});const v=await r.json();if(!r.ok())throw Error(JSON.stringify(v));return v.data;};
  await api('POST','/auth/register',{email:'integration-gaps@test.invalid',name:'Audit',password:'private integration password'});
  const first=await api('GET','/sets?limit=100&offset=0'),second=await api('GET','/sets?limit=100&offset=100');
  const needle=second.items.find(s=>!first.items.some(t=>t.title.toLowerCase().includes(s.title.toLowerCase())));
  if(!needle)throw Error('No distinct older set fixture');
  const search=await api('GET','/sets?q='+encodeURIComponent(needle.title));
  await page.goto(origin+'/practice/dictation?q='+encodeURIComponent(needle.title));await page.waitForLoadState('networkidle');
  report.findings.push({id:'catalog_search',set_title:needle.title,set_id:needle.id,api_matches:search.total,visible_in_selector:await page.getByText(needle.title,{exact:true}).count(),total_accessible_sets:first.total});
  await api('PUT','/learning/profile',{time_budget_minutes:15,preferred_days:[1,2,3,4,5,6,7]});const plan=await api('GET','/learning/today'),item=plan.items.find(i=>i.kind==='lesson');
  let s=(await api('POST',`/learning/today/items/${item.id}/start`,{plan_id:plan.plan_id,revision:plan.plan_revision})).session;
  while(s.cursor<item.workload.target_cursor){
    const q=s.current,response=q.response_schema==='choice'?{option_id:q.options[0].id}:q.response_schema==='text'?{text:'I am a student. I study every day.',self_reviewed:true}:{acknowledged:true};
    const submitted=await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:q.id,revision:s.revision,submission_id:randomUUID(),response});s=await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:submitted.session.revision});
  }
  await page.goto(origin+`/lesson-run/${s.id}?`+new URLSearchParams({plan_id:plan.plan_id,item_id:item.id,target_cursor:String(item.workload.target_cursor),from:'/today'}));await page.waitForLoadState('networkidle');
  report.findings.push({id:'daily_goal',budget:plan.budget_minutes,planned_steps:item.workload.planned_steps,total_steps:s.total_steps,cursor:s.cursor,plan_status:(await api('GET','/learning/today')).status,daily_finish_button:await page.getByRole('button',{name:/Xong phần hôm nay|Xong buổi hôm nay|Hoàn thành mục tiêu hôm nay/i}).count(),current_screen:(await page.locator('main').innerText()).slice(0,950)});
  report.completed=true;
}catch(e){report.completed=false;report.error=e.stack;process.exitCode=1;}
finally{writeFileSync('docs/refinement-integration-gaps.json',JSON.stringify(report,null,2)+'\n');await browser?.close();web.closeAllConnections();await new Promise(r=>web.close(r));app.server.closeAllConnections();await app.close();console.log(JSON.stringify(report));}
