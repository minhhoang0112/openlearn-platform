import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../app.mjs';
import { schedule } from '../study.mjs';

test('backend end-to-end: auth, ownership, content, grading, SRS, classes and feature flags', async t=>{
  const app=createApp({log:error=>{throw new Error(error);}});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});
  const base=`http://127.0.0.1:${app.server.address().port}/api/v1`;
  function client() {
    let cookie='';
    return async(method,path,body,extra={})=>{
      const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Requested-With':'OpenQuiz',...(cookie?{Cookie:cookie}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
      if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
      return {status:response.status,body:await response.json(),headers:response.headers};
    };
  }
  const alice=client(),bob=client(),guest=client();
  let set,pathId,session,teacherClass;
  await t.test('register/login cookie is HttpOnly; me hides password hashes',async()=>{
    const r=await alice('POST','/auth/register',{email:'alice@example.test',name:'Alice',password:'correct horse battery'});
    assert.equal(r.status,201);assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.equal(r.body.data.password_hash,undefined);
    assert.equal((await alice('GET','/me')).body.data.name,'Alice');
    await bob('POST','/auth/register',{email:'bob@example.test',name:'Bob',password:'another secure password'});
    assert.equal((await guest('GET','/me')).status,401);
    assert.equal((await guest('POST','/auth/login',{email:'alice@example.test',password:'bad'})).status,401);
  });
  await t.test('CSRF/CORS checks and body validation',async()=>{
    assert.equal((await alice('POST','/sets',{title:'bad'},{Origin:'https://attacker.invalid'})).status,403);
    assert.equal((await alice('POST','/sets',{title:'bad'},{'X-Requested-With':''})).status,403);
    assert.equal((await alice('POST','/sets',{title:'invalid',words:[{term:'missing definition'}]})).status,400);
    assert.equal((await alice('GET','/sets?limit=-1')).status,400);
  });
  await t.test('create a private set and prevent cross-account reads/writes',async()=>{
    const r=await alice('POST','/sets',{title:'Private words',words:[{term:'apply',definition:'nộp đơn, áp dụng'},{term:'hire',definition:'thuê'},{term:'expert',definition:'chuyên gia'}]});
    assert.equal(r.status,201);set=r.body.data;
    assert.equal((await bob('GET',`/sets/${set.id}`)).status,404);
    assert.equal((await guest('GET',`/sets/${set.id}`)).status,404);
    assert.equal((await bob('PATCH',`/sets/${set.id}`,{title:'Hacked'})).status,404);
    const listing=await guest('GET','/sets');assert.ok(!listing.body.data.items.some(s=>s.id===set.id));
  });
  await t.test('public set metadata stays protected; bookmarks are idempotent',async()=>{
    assert.equal((await alice('PATCH',`/sets/${set.id}`,{visibility:'public'})).status,200);
    assert.equal((await bob('GET',`/sets/${set.id}`)).status,200);
    assert.equal((await bob('PATCH',`/sets/${set.id}`,{title:'Hacked'})).status,403);
    for(let i=0;i<2;i++)assert.equal((await bob('PUT',`/bookmarks/set/${set.id}`,{saved:true})).status,200);
    assert.equal((await bob('GET','/sets?filter=saved')).body.data.total,1);
  });
  await t.test('create/reorder a path; reject public paths containing private sets',async()=>{
    const r=await alice('POST','/paths',{title:'My path',set_ids:[set.id],visibility:'public'});assert.equal(r.status,201);pathId=r.body.data.id;
    assert.equal((await alice('GET',`/paths/${pathId}`)).body.data.sets[0].id,set.id);
    assert.equal((await alice('PUT',`/paths/${pathId}/sets`,{set_ids:[set.id,set.id]})).status,400);
    const privateSet=(await alice('POST','/sets',{title:'Private'})).body.data;
    assert.equal((await alice('POST','/paths',{title:'Leak',visibility:'public',set_ids:[privateSet.id]})).status,400);
  });
  await t.test('fixed study queue hides expected answers and grades on server',async()=>{
    const r=await bob('POST','/study/sessions',{set_id:set.id,mode:'write',settings:{limit:2}});assert.equal(r.status,201);session=r.body.data;
    assert.equal(session.question.expected,undefined);assert.equal(session.question.prompt,'apply');
    assert.equal((await alice('GET',`/study/sessions/${session.id}`)).status,404);
    const answer=await bob('POST',`/study/sessions/${session.id}/answers`,{question_id:session.question.id,answer:'áp dụng'});
    assert.equal(answer.status,200);assert.equal(answer.body.data.correct,true);assert.equal(answer.body.data.points,10);
    const replay=await bob('POST',`/study/sessions/${session.id}/answers`,{question_id:session.question.id,answer:'wrong'});
    assert.equal(replay.body.data.replayed,true);assert.equal(replay.body.data.correct,true);assert.equal(replay.body.data.session.completed,1);
    session=answer.body.data.session;
    const last=await bob('POST',`/study/sessions/${session.id}/answers`,{question_id:session.question.id,answer:'wrong'});assert.equal(last.body.data.correct,false);assert.equal(last.body.data.session.status,'completed');
  });
  await t.test('SRS is persisted and user-specific; actual points drive ranking',async()=>{
    const p=(await bob('GET',`/sets/${set.id}/progress`)).body.data;assert.equal(p.learning,2);
    assert.equal((await alice('GET',`/sets/${set.id}/progress`)).body.data.new,3);
    const forecast=(await bob('GET','/srs/summary')).body.data;assert.equal(forecast.tracked,2);assert.equal(forecast.forecast.length,14);
    const rank=(await bob('GET','/ranking')).body.data;assert.equal(rank.items[0].name,'Bob');assert.equal(rank.items[0].points,10);
    assert.equal((await bob('GET','/dashboard')).body.data.studying_sets[0].id,set.id);
  });
  await t.test('word stars, ordering, folders, export, and clone',async()=>{
    const words=(await alice('GET',`/sets/${set.id}`)).body.data.words;
    await bob('PATCH',`/words/${words[0].id}/progress`,{starred:true});
    assert.equal((await bob('GET',`/sets/${set.id}`)).body.data.words[0].starred,true);
    assert.equal((await alice('PUT',`/sets/${set.id}/order`,{word_ids:[...words.map(w=>w.id)].reverse()})).status,200);
    const folder=(await bob('POST','/folders',{name:'TOEIC'})).body.data;await bob('PUT',`/folders/${folder.id}/sets`,{set_ids:[set.id]});
    assert.equal((await bob('GET','/folders')).body.data.items[0].set_ids[0],set.id);
    assert.equal((await bob('GET',`/sets/${set.id}/export`)).body.data.words.length,3);
    assert.equal((await bob('POST',`/sets/${set.id}/clone`,{})).status,201);
  });
  await t.test('classes enforce membership and teacher access; submissions require completed sessions',async()=>{
    teacherClass=(await alice('POST','/classes',{name:'TOEIC class'})).body.data;
    assert.equal((await bob('GET',`/classes/${teacherClass.id}`)).status,404);
    assert.equal((await bob('POST','/classes/join',{code:teacherClass.join_code})).status,200);
    const assignment=(await alice('POST',`/classes/${teacherClass.id}/assignments`,{title:'Practice',set_id:set.id,mode:'write'})).body.data;
    assert.equal((await bob('GET',`/classes/${teacherClass.id}/assignments/${assignment.id}/results`)).status,403);
    assert.equal((await bob('POST',`/classes/${teacherClass.id}/assignments/${assignment.id}/submit`,{session_id:session.id})).status,200);
    const results=await alice('GET',`/classes/${teacherClass.id}/assignments/${assignment.id}/results`);assert.equal(results.body.data.items.length,1);assert.equal(results.body.data.items[0].result.correct,1);
  });
  await t.test('unconfigured AI returns a real failure and never fabricates feedback',async()=>{
    assert.equal((await bob('POST','/ai/generate',{set_id:set.id,kind:'speaking_question'})).status,503);
    const caps=(await guest('GET','/capabilities')).body.data;assert.equal(caps.ai.configured,false);assert.equal(caps.payments,false);
    assert.equal((await bob('GET','/ai/history')).body.data.items.length,0);
  });
  await t.test('visible vocabulary is verified separately from extended course content',async()=>{
    const p=(await guest('GET','/paths/14')).body.data;assert.equal(p.expected_set_count,50);assert.equal(p.content_status,'vocabulary_verified');assert.equal(p.sets.length,50);
    const terms=p.sets.flatMap(s=>app.db.prepare('SELECT term FROM words WHERE set_id=?').all(s.id).map(w=>w.term));
    assert.equal(terms.length,600);assert.equal(new Set(terms).size,600);
    assert.equal((await guest('GET','/sets/163')).body.data.words.length,12);
  });
  await t.test('logout revokes the cookie session',async()=>{
    assert.equal((await bob('POST','/auth/logout',{})).status,200);assert.equal((await bob('GET','/me')).status,401);
  });
});

test('SM-2 scheduling: failed recall, first review, and later interval',()=>{
  const at=new Date('2026-10-20T00:00:00Z');
  const first=schedule(null,4,at);assert.equal(first.interval_days,1);assert.equal(first.repetitions,1);
  const second=schedule(first,4,at);assert.equal(second.interval_days,6);
  const third=schedule(second,4,at);assert.equal(third.status,'mastered');assert.ok(third.interval_days>6);
  const failed=schedule(third,1,at);assert.equal(failed.repetitions,0);assert.equal(failed.due_at,'2026-10-20T00:10:00.000Z');
});
