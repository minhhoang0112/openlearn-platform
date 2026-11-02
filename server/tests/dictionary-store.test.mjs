import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {join,dirname,resolve,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {buildDictionary,openDictionary} from '../dictionary-store.mjs';
import {createApp} from '../app.mjs';

async function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'openlearn-lexicon-')),path=join(dir,'fixture.sqlite');
 const dispose=()=>{if(dirname(resolve(dir))!==resolve(tmpdir())||!basename(dir).startsWith('openlearn-lexicon-'))throw Error('Unexpected fixture directory');rmSync(dir,{recursive:true,force:true});};
 const rows=[{word:'tail',lang_code:'en',pos:'noun',sounds:[{ipa:'/teɪl/',audio:'must-not-download.ogg',ogg_url:'https://invalid.test/audio.ogg'}],senses:[{glosses:['đuôi'],examples:[{text:'A long tail.',translation:'Một cái đuôi dài.'}]}],forms:[{form:'tails'}]},{word:'seek',lang_code:'en',pos:'verb',senses:[{glosses:['tìm kiếm']}]},{word:'tail',lang_code:'en',pos:'noun',senses:[{glosses:['đuôi']}]},{word:'queue',lang_code:'fr',pos:'noun',senses:[{glosses:['must not import']}] }];
 const stats=await buildDictionary(rows.map(r=>JSON.stringify(r)),path,{source:'fixture',license:'CC-BY-SA-4.0'});return {path,stats,dispose};
}
test('text dictionary imports English senses/examples/IPA, deduplicates and resolves explicit forms without storing media',async t=>{
 const f=await fixture(t);assert.equal(f.stats.headwords,2);assert.equal(f.stats.senses,2);
 const store=openDictionary({databasePath:f.path});t.after(()=>{store.close();f.dispose();});
 const tail=store.lookup(' TAIL ').entries[0];assert.equal(tail.definition,'đuôi');assert.equal(tail.phonetic,'/teɪl/');assert.equal(tail.example_translation,'Một cái đuôi dài.');assert.equal(tail.source,'wiktionary_vi');assert.ok(tail.source_url.includes('/tail#'));assert.ok(!JSON.stringify(tail).includes('audio'));
 const plural=store.lookup('tails');assert.equal(plural.kind,'form');assert.equal(plural.entries[0].matched_term,'tail');
 assert.equal(store.lookup('ail'),null);assert.equal(store.lookup('queue'),null);assert.equal(store.lookup('tail; seek'),null);
});
test('both synonym detail and translation routes use the installed dictionary offline, retaining exact query and attribution',async t=>{
 const f=await fixture(t);let external=0;const app=createApp({seed:false,dictionary:{databasePath:f.path,fetchImpl:()=>{external++;throw Error('offline');}}});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(async()=>{app.server.closeAllConnections();await app.close();f.dispose();});
 let cookie='';const call=async(method,path,body)=>{const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1`+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body?{body:JSON.stringify(body)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const e=await r.json();assert.ok(r.ok,JSON.stringify(e));return e.data;};
 await call('POST','/auth/register',{email:'lexicon@test.invalid',name:'Learner',password:'long test password'});
 const detail=await call('GET','/dictionary/entry?q=seek');assert.equal(detail.found,true);assert.equal(detail.dictionary.available,true);assert.equal(detail.entries[0].definition,'tìm kiếm');
 const translated=await call('POST','/dictionary/translate',{q:'tail'});assert.equal(translated.term,'tail');assert.equal(translated.senses[0].meaning,'đuôi');assert.ok(translated.senses[0].sourceUrl.includes('/tail#'));assert.equal(translated.external_request,false);
 const plural=await call('POST','/dictionary/translate',{q:'tails'});assert.equal(plural.term,'tails');assert.equal(plural.senses[0].matchedTerm,'tail');assert.equal(plural.senses[0].lookupKind,'form');assert.equal(external,0);
});
