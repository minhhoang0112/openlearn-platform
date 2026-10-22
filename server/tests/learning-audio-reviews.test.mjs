import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.mjs';
import {openDatabase} from '../database.mjs';
import {starterLessons} from '../content/learning-v2/curriculum.mjs';

const recording={mime_type:'audio/wav',data:readFileSync(new URL('../content/learning-v2/media/sentences/foundation-introductions-01-v1-s01.wav',import.meta.url)).toString('base64')};
const reply={transcript:"Hi, I'm Linh.",feedback:'Bản thu nghe được. Câu đã nói khác câu mẫu; hãy thử lại đúng câu mục tiêu.',improvements:['Nghe câu mẫu rồi thu lại.'],score:100};
async function fixture(t,{result=()=>reply,ai,database=':memory:'}={}){
  const originalFetch=globalThis.fetch,requests=[];
  globalThis.fetch=async(url,options)=>{
    if(String(url).startsWith('https://generativelanguage.googleapis.com/')){
      requests.push(JSON.parse(options.body));const value=await result();
      if(value instanceof Response)return value;
      return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]}),{status:200,headers:{'Content-Type':'application/json'}});
    }return originalFetch(url,options);
  };
  const app=createApp({database,ai:ai??{provider:'gemini',geminiKey:'test-only-not-a-real-key',model:'gemini-test'}});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{globalThis.fetch=originalFetch;app.server.closeAllConnections();await app.close();});
  function client(){let cookie='';return async(method,path,body)=>{
    const r=await originalFetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};
  };}
  const api=client();await api('POST','/auth/register',{email:'audio-review@test.invalid',name:'Learner',password:'private audio password'});
  let session=(await api('POST','/learning/sessions',{lesson_id:'foundation-introductions-01'})).data;
  const source=starterLessons.find(l=>l.id===session.lesson_id);
  async function reach(){while(session.current.type!=='pronunciation_practice'){
    const q=session.current,key=source.steps.find(s=>s.id===q.id),response=q.response_schema==='choice'?{option_id:key.answer}:{acknowledged:true};
    const r=(await api('POST',`/learning/sessions/${session.id}/submit`,{step_id:q.id,revision:session.revision,submission_id:randomUUID(),response})).data;
    session=(await api('POST',`/learning/sessions/${session.id}/advance`,{step_id:q.id,revision:r.session.revision})).data;
  }return session;}
  return {app,api,client,requests,reach,get session(){return session;}};
}
const reviewPath=s=>`/learning/sessions/${s.id}/steps/pronunciation/audio-reviews`;

test('real audio bytes reach Gemini with server target; cached aliases survive retry and feedback never changes grades or stores raw audio',async t=>{
  const f=await fixture(t),s=await f.reach(),before=JSON.stringify(s);
  const body={submission_id:randomUUID(),audio:recording},r=await f.api('POST',reviewPath(s),body);
  assert.equal(r.status,200,JSON.stringify(r));const a=r.data;
  assert.equal(a.target,s.current.target);assert.equal(a.transcript,reply.transcript);assert.notEqual(a.transcript,a.target);
  assert.equal(a.pronunciation_score,null);assert.equal(a.audio_stored,false);assert.equal(a.score,undefined);
  const input=JSON.parse(f.requests[0].contents[0].parts[0].text);assert.equal(input.target,s.current.target);
  assert.deepEqual(f.requests[0].contents[0].parts[1].inlineData,{mimeType:'audio/wav',data:recording.data});
  assert.equal((await f.api('POST',reviewPath(s),body)).data.cached,true);
  const alias={...body,submission_id:randomUUID()};assert.equal((await f.api('POST',reviewPath(s),alias)).data.id,a.id);
  const changed=Buffer.from(recording.data,'base64');changed[changed.length-1]^=1;
  assert.equal((await f.api('POST',reviewPath(s),{...alias,audio:{...recording,data:changed.toString('base64')}})).error.code,'IDEMPOTENCY_CONFLICT');
  assert.equal(f.requests.length,1);
  assert.equal(JSON.stringify((await f.api('GET',`/learning/sessions/${s.id}`)).data),before);
  const stored=f.app.db.prepare('SELECT * FROM learning_audio_reviews').get();assert.equal(JSON.stringify(stored).includes(recording.data),false);
  const progress=(await f.api('GET','/learning/progress')).data,p=progress.skills.find(s=>s.key==='pronunciation');
  assert.equal(p.ai_audio_review_count,1);assert.equal(p.evidence_status,'ai_audio_feedback');assert.equal(p.accuracy_percent,null);
  assert.equal(progress.audio_feedback.reviews_created,1);
  const evidence=(await f.api('GET',`/learning/sessions/${s.id}/evidence`)).data;assert.equal(evidence.audio_review_count,1);
  const bob=f.client();await bob('POST','/auth/register',{email:'other-audio@test.invalid',name:'Other',password:'private other password'});
  assert.equal((await bob('GET',`/learning/sessions/${s.id}/audio-reviews`)).status,404);
  assert.equal((await bob('POST',reviewPath(s),body)).status,404);
  assert.equal((await bob('DELETE',`/learning/sessions/${s.id}/audio-reviews/${a.id}`)).status,404);
  await f.api('PUT','/settings/ai',{provider:'ollama',model:'test-local'});
  assert.equal((await f.api('GET',`/learning/sessions/${s.id}/audio-reviews`)).data.capability.supported,false);
  assert.equal((await f.api('POST',reviewPath(s),body)).data.id,a.id,'cached review remains readable after switching providers');
  assert.equal(f.requests.length,1);
  assert.equal((await f.api('DELETE',`/learning/sessions/${s.id}/audio-reviews/${a.id}`)).status,200);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM learning_audio_review_requests').get().n,0);
  assert.equal((await f.api('GET','/learning/progress')).data.audio_feedback.reviews_created,0);
});

test('future steps, unsupported tasks, bad containers and text-only requests never spend an AI call',async t=>{
  const f=await fixture(t),body={submission_id:randomUUID(),audio:recording};
  assert.equal((await f.api('POST',reviewPath(f.session),body)).error.code,'STEP_NOT_REACHED');
  const s=await f.reach();
  for(const value of [{}, {audio:recording,submission_id:'bad'}, {...body,target:'Override'}, {...body,audio:{mime_type:'audio/wav',data:Buffer.from('a'.repeat(80)).toString('base64')}}, {...body,audio:{...recording,mime_type:'audio/mpeg'}}, {...body,audio:{...recording,data:'data:audio/wav;base64,'+recording.data}}])assert.equal((await f.api('POST',reviewPath(s),value)).status,400);
  assert.equal((await f.api('POST',reviewPath(s).replace('/pronunciation/','/writing/'),body)).error.code,'UNSUPPORTED_AUDIO_STEP');
  assert.equal(f.requests.length,0);
});

test('parallel identical recordings share one call, UUID conflicts are rejected in flight and failures remain retryable',async t=>{
  let release,started;const ready=new Promise(r=>started=r),gate=new Promise(r=>release=r);
  const f=await fixture(t,{result:async()=>{started();await gate;return reply;}}),s=await f.reach();
  const body={submission_id:randomUUID(),audio:recording};
  const first=f.api('POST',reviewPath(s),body);await ready;
  const changed=Buffer.from(recording.data,'base64');changed[changed.length-1]^=1;
  const conflict=await f.api('POST',reviewPath(s),{...body,audio:{...recording,data:changed.toString('base64')}});
  assert.equal(conflict.error.code,'IDEMPOTENCY_CONFLICT');
  const same=f.api('POST',reviewPath(s),body),alias=f.api('POST',reviewPath(s),{...body,submission_id:randomUUID()});release();
  const rows=await Promise.all([first,same,alias]);assert.ok(rows.every(r=>r.status===200));assert.equal(new Set(rows.map(r=>r.data.id)).size,1);
  assert.equal(f.requests.length,1);assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM learning_audio_reviews').get().n,1);
});

test('invalid provider output is not cached; unclear audio remains an honest request to re-record',async t=>{
  let count=0;const f=await fixture(t,{result:()=>++count===1?{feedback:12}: {transcript:'',feedback:'Chưa nghe rõ. Hãy thu lại ở nơi yên tĩnh.',improvements:[]}}),s=await f.reach(),body={submission_id:randomUUID(),audio:recording};
  assert.equal((await f.api('POST',reviewPath(s),body)).error.code,'AI_INVALID_RESPONSE');
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM learning_audio_reviews').get().n,0);
  const r=await f.api('POST',reviewPath(s),body);assert.equal(r.data.needs_clearer_recording,true);assert.equal(r.data.pronunciation_score,null);
  assert.equal(count,2);
});

test('no configured provider and non-audio provider report capability without fabricated feedback or AI use',async t=>{
  const f=await fixture(t,{ai:{}}),s=await f.reach(),body={submission_id:randomUUID(),audio:recording};
  assert.equal((await f.api('GET',`/learning/sessions/${s.id}/audio-reviews`)).data.capability.supported,false);
  assert.equal((await f.api('POST',reviewPath(s),body)).error.code,'AI_NOT_CONFIGURED');
  await f.api('PUT','/settings/ai',{provider:'ollama',model:'test-local'});
  assert.equal((await f.api('POST',reviewPath(s),body)).error.code,'AUDIO_PROVIDER_REQUIRED');assert.equal(f.requests.length,0);
});

test('provider quota errors preserve retry guidance and remain retryable with the original UUID',async t=>{
  let calls=0;const f=await fixture(t,{result:()=>++calls===1?new Response(JSON.stringify({error:{details:[{retryDelay:'41s'}]}}),{status:429}):reply}),s=await f.reach(),body={submission_id:randomUUID(),audio:recording};
  const limited=await f.api('POST',reviewPath(s),body);assert.equal(limited.status,429);assert.equal(limited.error.code,'AI_RATE_LIMITED');assert.equal(limited.error.details.retry_after_seconds,41);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM learning_audio_reviews').get().n,0);
  assert.equal((await f.api('POST',reviewPath(s),body)).status,200);assert.equal(calls,2);
  assert.equal((await f.api('POST',reviewPath(s),body)).data.cached,true);assert.equal(calls,2);
});

test('audio reviews persist across DB reopen; deleting a session during a request never recreates feedback',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'oq-audio-')),path=join(dir,'test.sqlite');
  let release,started;const ready=new Promise(r=>started=r),gate=new Promise(r=>release=r);let delayed=false;
  t.after(()=>release?.());
  const f=await fixture(t,{database:path,result:async()=>{if(delayed){started();await gate;}return reply;}}),s=await f.reach();
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  await f.api('POST',reviewPath(s),{submission_id:randomUUID(),audio:recording});
  const db=openDatabase(path);try{assert.equal(db.prepare('SELECT COUNT(*) n FROM learning_audio_reviews').get().n,1);assert.equal(db.prepare('PRAGMA user_version').get().user_version,14);}finally{db.close();}
  delayed=true;const changed=Buffer.from(recording.data,'base64');changed[changed.length-1]^=1;
  const pending=f.api('POST',reviewPath(s),{submission_id:randomUUID(),audio:{...recording,data:changed.toString('base64')}});await ready;
  f.app.db.prepare('DELETE FROM learning_sessions WHERE id=?').run(s.id);release();assert.equal((await pending).status,404);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM learning_audio_reviews').get().n,0);
});
