import test from 'node:test';
import assert from 'node:assert/strict';
import {geminiProvider} from '../providers.mjs';
test('Gemini adapter: real request shape, server-only header, JSON and quota errors',async()=>{
  let request;
  const provider=geminiProvider({key:'test-secret',fetchImpl:async(url,options)=>{request={url,...options};return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({feedback:'Use the past tense.'})}]}}]});}});
  assert.deepEqual(await provider.generate('speaking_feedback',{transcript:'I apply yesterday'}),{feedback:'Use the past tense.'});
  assert.match(request.url,/gemini-3\.8-flash:generateContent$/);
  assert.equal(request.headers['x-goog-api-key'],'test-secret');
  assert.ok(!request.url.includes('test-secret'));
  assert.equal(JSON.parse(request.body).generationConfig.responseMimeType,'application/json');
  assert.match(JSON.parse(request.body).systemInstruction.parts[0].text,/Never invent pronunciation scores/);
  await assert.rejects(()=>geminiProvider().generate('grammar',{}),e=>e.code==='AI_NOT_CONFIGURED');
  await assert.rejects(()=>geminiProvider({key:'test',fetchImpl:async()=>new Response('',{status:429})}).generate('grammar',{}),e=>e.code==='AI_RATE_LIMITED');
  await assert.rejects(()=>geminiProvider({key:'test',fetchImpl:async()=>Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]})}).generate('grammar',{}),e=>e.code==='AI_INVALID_RESPONSE');
});
test('Gemini quota response reports retry guidance without exposing credentials',async()=>{
  const provider=geminiProvider({key:'test-secret',fetchImpl:async()=>Response.json({error:{details:[{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:'12.5s'}]}},{status:429})});
  await assert.rejects(()=>provider.generate('conversation',{}),e=>e.code==='AI_RATE_LIMITED'&&e.details.retry_after_seconds===13&&!JSON.stringify(e).includes('test-secret'));
});
test('Gemini retries transient overload and sends audio as inline data',async()=>{
  let attempts=0,body;
  const provider=geminiProvider({key:'test-only',fetchImpl:async(_url,options)=>{
    body=JSON.parse(options.body);
    if(++attempts===1)return new Response('',{status:503});
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({transcript:'Hello',feedback:'Clear greeting',improvements:[]})}]}}]});
  }});
  const audio={mime_type:'audio/webm',data:'YXVkaW8='};
  assert.equal((await provider.generate('pronunciation',{audio,term:'hello'})).transcript,'Hello');
  assert.equal(attempts,2);
  assert.deepEqual(body.contents[0].parts[1],{inlineData:{mimeType:'audio/webm',data:audio.data}});
  assert.equal(JSON.parse(body.contents[0].parts[0].text).audio,undefined);
});
