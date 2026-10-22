import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../app.mjs';

test('learning profiles isolate accounts, retain study preferences, reject invalid changes atomically and never auto-enroll system',async t=>{
  const app=createApp({seed:false});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});
  function client(){let cookie='';return async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
    return {status:r.status,...await r.json()};
  };}
  const alice=client(),bob=client();
  assert.equal((await alice('GET','/learning/profile')).status,401);
  for(const [api,email]of [[alice,'profile-a@test.invalid'],[bob,'profile-b@test.invalid']])await api('POST','/auth/register',{email,name:'Learner',password:'private test password 123'});
  const initial=(await alice('GET','/learning/profile')).data;
  assert.equal(initial.is_default,true);assert.equal(initial.focus,'general');assert.equal(initial.program_id,null);
  await alice('PATCH','/me',{settings:{theme:'dark',study:{learn:{required_correct:2}}}});
  const saved=(await alice('PUT','/learning/profile',{time_budget_minutes:15,focus:'system',preferred_days:[7,2],timezone:'Asia/Ho_Chi_Minh'})).data;
  assert.equal(saved.is_default,false);assert.deepEqual(saved.preferred_days,[2,7]);assert.equal(saved.program_id,null);
  assert.equal((await bob('GET','/learning/profile')).data.focus,'general');
  const me=(await alice('GET','/me')).data;assert.equal(me.settings.theme,'dark');assert.equal(me.settings.study.learn.required_correct,2);
  for(const bad of [{time_budget_minutes:20},{preferred_days:[]},{preferred_days:[1,1]},{preferred_days:[8]},{timezone:'Asia/Unknown'},{timezone:'+07:00'},{focus:'medical'},{program_id:'fake-course'},{focus:'general',preferred_days:[0]}]){
    assert.equal((await alice('PUT','/learning/profile',bad)).status,400);
    assert.deepEqual((await alice('GET','/learning/profile')).data,saved);
  }
  await alice('PATCH','/me',{settings:{theme:'light'}});
  assert.equal((await alice('GET','/learning/profile')).data.focus,'system');
  const partial=(await alice('PUT','/learning/profile',{time_budget_minutes:45})).data;
  assert.equal(partial.focus,'system');assert.deepEqual(partial.preferred_days,[2,7]);
});
