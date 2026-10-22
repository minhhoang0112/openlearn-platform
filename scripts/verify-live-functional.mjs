// Small real-provider smoke test on an isolated database; never prints secrets.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createApp} from '../server/app.mjs';
process.loadEnvFile('.env');
const model=process.env.GEMINI_MODEL;
const app=createApp({ai:{provider:'gemini',geminiKey:process.env.GEMINI_API_KEY,model}});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
const base=`http://127.0.0.1:${app.server.address().port}/api/v1`;let cookie='';
const selected=new Set(process.argv.slice(2));
const wants=name=>!selected.size||selected.has(name);
const report=selected.size&&existsSync('docs/live-functional-validation.json')?JSON.parse(readFileSync('docs/live-functional-validation.json','utf8')):{date:'2026-10-21',provider:'gemini',model,checks:[],errors:[]};
for(const check of report.checks)check.model??=report.model;
report.model=model;report.checked_at=new Date().toISOString();
report.errors=[];
async function api(method,path,body){
  const r=await fetch(base+path,{method,headers:{Cookie:cookie,'X-Requested-With':'OpenQuiz','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
  const envelope=await r.json();if(!r.ok)throw new Error(envelope.error?.code+': '+envelope.error?.message);
  return envelope.data;
}
try{
  await api('POST','/auth/register',{email:'live-functional@test.invalid',password:'isolated live learning check',name:'Live functional check'});
  const set=await api('POST','/sets',{title:'Work and job applications',words:[{term:'profile',definition:'hồ sơ',example:'She updated her profile today.'},{term:'hire',definition:'thuê nhân viên',example:'We hire new staff.'},{term:'apply',definition:'ứng tuyển',example:'I apply for a job.'}]});
  const words=(await api('GET','/sets/'+set.id)).words;
  for(const w of words)await api('PUT','/words/'+w.id+'/notes',{example:w.example,translation:{profile:'Cô ấy đã cập nhật hồ sơ hôm nay.',hire:'Chúng tôi tuyển nhân viên mới.',apply:'Tôi ứng tuyển một công việc.'}[w.term]});
  const grammar=await api('POST','/exercise-attempts',{set_id:set.id,kind:'grammar_order',difficulty:'hard',resume:false,original_order:true});
  assert.equal(grammar.question.tokens.length,grammar.question.required_token_count+2);assert.equal(grammar.question.expected,undefined);
  report.checks.push({flow:'grammar_persisted_examples',passed:true,provider_call:false});
  if(wants('reading')){
  const reading=await api('POST','/exercise-attempts',{set_id:set.id,kind:'reading',difficulty:'easy',resume:false});
  assert.ok(reading.passage.includes('__[1]__'));assert.ok(reading.total>=4);
  report.checks.push({flow:'reading_real_gemini_cloze_and_comprehension',passed:true,questions:reading.total});
  }
  if(wants('conversation')){
  const thread=await api('POST','/conversations',{set_id:set.id,settings:{language:'en',exam:'toeic',topic:'A job interview',ordered:true}});
  const started=await api('POST','/conversations/'+thread.id+'/start',{});
  assert.equal(started.messages.length,1);assert.equal(started.messages[0].role,'assistant');assert.ok(started.messages[0].content.trim());
  report.checks.push({flow:'conversation_real_opening',passed:true});
  const hint=await api('POST','/conversations/'+thread.id+'/hint',{});assert.ok(hint.hint.trim());assert.ok(hint.example.trim());
  report.checks.push({flow:'conversation_real_hint',passed:true});
  const translated=await api('POST',`/conversations/${thread.id}/messages/${started.messages[0].id}/translation`,{});assert.ok(translated.translation.trim());
  report.checks.push({flow:'conversation_real_translation',passed:true});
  }
  if(wants('speaking')){
  const speaking=await api('POST','/ai/generate',{set_id:set.id,kind:'speaking_hint',word_ids:[words[0].id],question:'When did you update your profile?',instruction:'Suggest a short natural answer using profile.'});assert.ok(speaking.result.hint.trim());assert.ok(speaking.result.example.trim());
  report.checks.push({flow:'speaking_real_hint',passed:true});
  }
  console.log(JSON.stringify(report));
}catch(e){report.errors.push(e.message);throw e;}finally{
  report.checks=[...new Map(report.checks.map(c=>[c.flow,c])).values()];
  for(const check of report.checks)check.model??=model;
  writeFileSync('docs/live-functional-validation.json',JSON.stringify(report,null,2)+'\n');app.server.closeAllConnections();await app.close();
}
