import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.mjs';
import {parseMaterialSubtitles} from '../material-subtitles.mjs';

const srt='1\r\n00:00:00,500 --> 00:00:02,000\r\nThe server is online.\r\n\r\n2\r\n00:00:02,500 --> 00:00:04,000\r\nPlease check\r\nthe network.';
async function fixture(t){
  const app=createApp();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(async()=>{app.server.closeAllConnections();await app.close();});
  function client(){let cookie='';return async(method,path,body)=>{const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};}
  const api=client();await api('POST','/auth/register',{email:'subs@test.invalid',name:'Learner',password:'test private password'});
  const b=Buffer.alloc(160044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);
  const m=(await api('POST','/learning/materials',{submission_id:randomUUID(),title:'My dialogue',audio:{mime_type:'audio/wav',data:b.toString('base64')}})).data;
  return {api,app,client,path:`/learning/materials/${m.id}`,id:m.id};
}

test('SRT/VTT preview imports actual supplied timestamps and plain multiline text with no DB writes or AI',async t=>{
  const {api,app,path}=await fixture(t);
  const preview=await api('POST',path+'/cues/preview-import',{format:'srt',content:'\uFEFF'+srt});assert.equal(preview.status,200);const draft=preview.data;
  assert.equal(draft.saved,false);assert.equal(draft.revision,0);assert.equal(draft.alignment,'supplied_timestamps');assert.equal(draft.translation_generated,false);
  assert.equal(draft.cues[0].start_ms,500);assert.equal(draft.cues[0].end_ms,2000);assert.equal(draft.cues[1].text,'Please check\nthe network.');assert.equal(draft.cues[1].translation,'');
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM learning_material_cues').get().n,0);assert.equal((await api('GET',path+'/cues')).data.revision,0);
  const saved=await api('PUT',path+'/cues',{revision:draft.revision,cues:draft.cues});assert.equal(saved.data.revision,1);
  await api('POST',path+'/cues/preview-import',{format:'srt',content:srt});assert.deepEqual((await api('GET',path+'/cues')).data.cues,saved.data.cues);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM generated_content').get().n,0);
});

test('VTT subset handles cue IDs, metadata, styling and entities as plain text and explains discarded formatting',()=>{
  const vtt='WEBVTT - sample\nLanguage: en\n\nNOTE private note\nignored\n\nSTYLE\n::cue { color:red }\n\nintro\n00:00.500 --> 00:02.000 align:start\n<v Alice><b>Tom &amp; I</b> use &lt;server&gt;.</v>\n\n00:02.500 --> 00:04.000\nIt&#39;s online.';
  const result=parseMaterialSubtitles(vtt,'vtt',5000);assert.equal(result.cues.length,2);assert.equal(result.cues[0].text,'Tom & I use <server>.');assert.equal(result.cues[1].text,"It's online.");
  assert.deepEqual(result.warnings.map(v=>v.code).sort(),['CUE_SETTINGS_IGNORED','HEADER_METADATA_IGNORED','MARKUP_REMOVED','METADATA_BLOCK_IGNORED']);assert.equal(result.warnings.find(v=>v.code==='METADATA_BLOCK_IGNORED').count,2);
});

test('malformed, overlapping, oversized and out-of-file captions are rejected without replacing saved cues',async t=>{
  const {api,path}=await fixture(t);const draft=(await api('POST',path+'/cues/preview-import',{format:'srt',content:srt})).data;await api('PUT',path+'/cues',{revision:0,cues:draft.cues});
  for(const [format,content] of [['srt','not a subtitle'],['vtt','00:00.000 --> 00:01.000\nHello.'],['vtt','WEBVTT\n00:00.000 --> 00:01.000\nHello.'],['srt',srt.replace('00:00:02,500','00:00:01,000')],['srt',srt.replace('00:00:04,000','00:00:06,000')],['srt',srt.replace('00:00:00,500','00:60:00,500')],['srt',srt.replace('00:00:02,000','00:00:00,550')],['srt',srt.replace('The server is online.','')],['srt','x'.repeat(200001)],['vtt','WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00.000,MPEGTS:0\n\n00:00.000 --> 00:01.000\nHello.'],['srt',srt+'\u0000']]){
    const r=await api('POST',path+'/cues/preview-import',{format,content});assert.equal(r.status,400,content.slice(0,100));
  }
  assert.equal((await api('POST',path+'/cues/preview-import',{format:'srt',content:srt,url:'https://example.invalid'})).status,400);
  assert.equal((await api('GET',path+'/cues')).data.revision,1);assert.deepEqual((await api('GET',path+'/cues')).data.cues,draft.cues);
  const huge=Array.from({length:201},(_,i)=>`${i+1}\n00:00:00,000 --> 00:00:01,000\nHello.`).join('\n\n');assert.throws(()=>parseMaterialSubtitles(huge,'srt',5000),/200/);
});

test('explicit confirmation protects against stale drafts; subtitle export roundtrips saved English text and timings privately',async t=>{
  const {api,client,path}=await fixture(t),draft=(await api('POST',path+'/cues/preview-import',{format:'srt',content:srt})).data;
  await api('PUT',path+'/cues',{revision:0,cues:draft.cues.map((v,i)=>({...v,text:i===0?'Use <server> & check.':v.text,translation:'Bản dịch riêng.'}))});
  assert.equal((await api('PUT',path+'/cues',{revision:draft.revision,cues:draft.cues})).status,409);
  const expected=(await api('GET',path+'/cues')).data.cues;
  for(const format of ['srt','vtt']){
    const output=(await api('GET',path+'/cues/export?format='+format)).data;assert.equal(output.revision,1);assert.equal(output.cue_count,2);assert.equal(output.translation_included,false);assert.ok(output.filename.endsWith('.'+format));assert.ok(!output.content.includes('Bản dịch'));
    const roundtrip=parseMaterialSubtitles(output.content,format,5000).cues;assert.deepEqual(roundtrip.map(({id,...v})=>v),expected.map(({id,translation,...v})=>({...v,translation:''})));
  }
  const bob=client();await bob('POST','/auth/register',{email:'bob-subs@test.invalid',name:'Bob',password:'other private password'});
  assert.equal((await bob('POST',path+'/cues/preview-import',{format:'srt',content:srt})).status,404);assert.equal((await bob('GET',path+'/cues/export')).status,404);assert.equal((await client()('GET',path+'/cues/export')).status,401);
  assert.equal((await api('GET',path+'/cues/export?format=html')).status,400);
  await api('PUT',path+'/cues',{revision:1,cues:[{...expected[0],text:'First paragraph.\n\nSecond paragraph.'}]});
  assert.equal((await api('GET',path+'/cues/export')).error.code,'UNSUPPORTED_SUBTITLE');assert.equal((await api('GET',path+'/cues')).data.cues[0].text,'First paragraph.\n\nSecond paragraph.');
  await api('DELETE',path);assert.equal((await api('GET',path+'/cues/export')).status,404);
});
