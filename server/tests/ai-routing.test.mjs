import test from 'node:test';
import assert from 'node:assert/strict';
import {createGeminiRouter,routingEnvironment} from '../ai-routing.mjs';
import {ApiError} from '../validation.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('static task assignment uses separate models/keys; personal override and metadata are exact',async()=>{
  const calls=[];const router=createGeminiRouter({key:'primary-secret',secondaryKey:'secondary-secret',model:'main',fastModel:'small',feedbackModel:'review',audioModel:'audio',providerFactory:options=>({generate:async task=>{calls.push({...options,task});return {translation:'xin chào'};}})});
  await router.generate('translation',{text:'hello'},1);await router.generate('reading',{},1);await router.generate('learning_feedback',{},1);await router.generate('pronunciation',{},1);
  assert.deepEqual(calls.map(c=>[c.key,c.model]),[['secondary-secret','small'],['primary-secret','main'],['primary-secret','review'],['primary-secret','audio']]);
  const personal=router.forAccount({api_key:'private-secret',model:'personal-model'});await personal.generate('translation',{},1);
  assert.equal(calls.at(-1).key,'private-secret');assert.equal(calls.at(-1).model,'personal-model');
  assert.equal(router.describe('learning_feedback').model,'review');assert.equal(personal.status().policy,'personal_model');
  for(const secret of ['primary-secret','secondary-secret','private-secret'])assert.ok(!JSON.stringify(router.status()).includes(secret));
});
test('duplicate pending calls join, translation cache is user-scoped and expires, new exercises stay fresh',async()=>{
  let calls=0,now=0;const gate=deferred();const router=createGeminiRouter({key:'test',cacheTtlMs:20,clock:()=>now,providerFactory:()=>({generate:async()=>{calls++;await gate.promise;return {translation:'saved'};}})});
  const a=router.generate('translation',{text:'hi'},1),b=router.generate('translation',{text:'hi'},1);gate.resolve();
  const [x,y]=await Promise.all([a,b]);x.translation='changed';assert.equal(y.translation,'saved');assert.equal(calls,1);
  assert.equal((await router.generate('translation',{text:'hi'},1)).translation,'saved');assert.equal(calls,1);
  await router.generate('translation',{text:'hi'},2);assert.equal(calls,2);now=21;await router.generate('translation',{text:'hi'},1);assert.equal(calls,3);
  await router.generate('reading',{},1);await router.generate('reading',{},1);assert.equal(calls,5);
});
test('same project serializes calls while separate assigned projects can run concurrently',async()=>{
  const gates={main:deferred(),fast:deferred()};const calls=[];
  const router=createGeminiRouter({key:'main',secondaryKey:'fast',providerFactory:({key})=>({generate:async(task)=>{calls.push([key,task]);await gates[key].promise;return {};}})});
  const a=router.generate('reading',{},1),b=router.generate('grammar',{},1),c=router.generate('translation',{},1);
  await new Promise(r=>setImmediate(r));assert.equal(calls.length,2);assert.equal(router.status().routes.find(r=>r.task==='grammar').waiting,1);
  gates.fast.resolve();await c;assert.equal(calls.length,2);gates.main.resolve();await Promise.all([a,b]);assert.equal(calls.length,3);
});
test('429 pauses only assigned connection, drains queued calls without rotating keys and recovers',async()=>{
  let now=0;const calls=[];const router=createGeminiRouter({key:'main',secondaryKey:'fast',clock:()=>now,providerFactory:({key})=>({generate:async()=>{calls.push(key);if(key==='fast'&&now===0)throw new ApiError(429,'AI_RATE_LIMITED','quota',{retry_after_seconds:10});return {};}})});
  const settled=await Promise.allSettled([router.generate('translation',{text:'a'},1),router.generate('translation',{text:'b'},1)]);
  assert.ok(settled.every(r=>r.status==='rejected'&&r.reason.code==='AI_RATE_LIMITED'));assert.deepEqual(calls,['fast']);
  await router.generate('reading',{},1);assert.deepEqual(calls,['fast','main']);
  now=11000;await router.generate('translation',{text:'a'},1);assert.deepEqual(calls,['fast','main','fast']);
});
test('queue bound, timeout and failures free slots, failed results are never cached',async()=>{
  const gate=deferred();let calls=0;const router=createGeminiRouter({key:'test',maxQueue:1,queueTimeoutMs:15,providerFactory:()=>({generate:async()=>{calls++;if(calls===1)await gate.promise;if(calls===2)throw new ApiError(502,'AI_INVALID_RESPONSE','bad');return {};}})});
  const a=router.generate('reading',{id:1},1);await new Promise(r=>setImmediate(r));
  const b=router.generate('reading',{id:2},1);const rejected=assert.rejects(b,e=>e.code==='AI_QUEUE_TIMEOUT');
  await assert.rejects(router.generate('reading',{id:3},1),e=>e.code==='AI_QUEUE_FULL');await rejected;gate.resolve();await a;
  await assert.rejects(router.generate('translation',{},1),e=>e.code==='AI_INVALID_RESPONSE');await router.generate('translation',{},1);assert.equal(calls,3);
});
test('legacy comma credentials are assigned, not rotated; missing secondary uses primary',async()=>{
  const calls=[];const factory=({key})=>({generate:async()=>{calls.push(key);return {};}});
  const router=createGeminiRouter({key:'one,two',providerFactory:factory});await router.generate('translation',{},1);await router.generate('reading',{},1);assert.deepEqual(calls,['two','one']);
  await createGeminiRouter({key:'one',providerFactory:factory}).generate('translation',{},1);assert.equal(calls.at(-1),'one');
  assert.equal(routingEnvironment({GEMINI_SECONDARY_API_KEY:'second'}).secondaryKey,'second');
  await assert.rejects(createGeminiRouter().generate('reading',{},1),e=>e.code==='AI_NOT_CONFIGURED');
});
