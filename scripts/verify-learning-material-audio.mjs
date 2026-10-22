// Native browser media smoke test, not acceptance of the not-yet-built Materials UI.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/app.mjs';
const require=createRequire(process.env.REA_PACKAGE_JSON||'C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core');
const origins=[],app=createApp({origins}),report={database:'isolated_in_memory',checks:[],product_material_ui_tested:false,ai_requests:0,passed:false};
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const origin=`http://127.0.0.1:${app.server.address().port}`;origins.push(origin);let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();
  const api=async(method,path,body)=>{const r=await page.request.fetch(origin+'/api/v1'+path,{method,headers:{'X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{data:body})});const v=await r.json();assert.ok(r.ok(),JSON.stringify(v));return v.data;};
  await api('POST','/auth/register',{email:'material-browser@test.invalid',name:'Audio QA',password:'private native media password'});
  const bytes=readFileSync('server/content/learning-v2/media/sentences/foundation-introductions-01-v1-s02.wav');
  const material=await api('POST','/learning/materials',{submission_id:randomUUID(),title:'Native audio validation',transcript:"I'm a university student.",audio:{mime_type:'audio/wav',data:bytes.toString('base64')}});
  report.checks.push('Authenticated private import succeeds using actual WAV samples');
  await page.goto(origin+'/api/v1/health');
  await page.evaluate(url=>{const audio=document.createElement('audio');audio.src=url;audio.controls=true;document.body.replaceChildren(audio);},origin+material.audio_url);
  await page.waitForFunction(()=>document.querySelector('audio')?.readyState>=1);
  const duration=await page.locator('audio').evaluate(a=>a.duration*1000);assert.ok(Math.abs(duration-material.duration_ms)<100);
  report.checks.push('Chrome decodes imported audio; actual duration agrees with WAV header');
  const range=await page.request.get(origin+material.audio_url,{headers:{Range:'bytes=0-43'}});assert.equal(range.status(),206);assert.deepEqual(await range.body(),bytes.subarray(0,44));
  report.checks.push('Private audio byte-range response contains exact original header');
  const state=await api('PUT',`/learning/materials/${material.id}/playback`,{revision:0,position_ms:700,rate:0.8,loop_start_ms:200,loop_end_ms:1100,loop_enabled:true});
  const restored=await api('GET',`/learning/materials/${material.id}`);assert.deepEqual(restored.playback,state);
  await page.locator('audio').evaluate((a,p)=>{a.currentTime=p.position_ms/1000;a.playbackRate=p.rate;},restored.playback);
  await page.waitForFunction(()=>Math.abs(document.querySelector('audio').currentTime-0.7)<0.1);
  assert.equal(await page.locator('audio').evaluate(a=>a.playbackRate),0.8);
  report.checks.push('Saved playback position/speed and manual A-B markers round-trip and can be applied to browser audio');
  await api('DELETE',`/learning/materials/${material.id}`);
  assert.equal((await page.request.get(origin+material.audio_url)).status(),404);
  report.checks.push('Deleting material revokes audio access without affecting authored curriculum');
  report.passed=true;
}catch(e){report.error=e.message;process.exitCode=1;}
finally{writeFileSync('docs/material-audio-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser?.close();app.server.closeAllConnections();await app.close();}
