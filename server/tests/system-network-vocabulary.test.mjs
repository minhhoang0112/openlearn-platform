import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../app.mjs';
import {seedSystemNetworkVocabulary,systemNetworkSource,systemNetworkVocabulary} from '../content/system-network-vocabulary.mjs';

test('system/network course has complete bilingual content and preserves progress on refresh',async()=>{
  const app=createApp({dictionary:{databasePath:null}});
  try{
    const {db}=app;
    await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
    const base='http://127.0.0.1:'+app.server.address().port+'/api/v1';
    const register=await fetch(base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},body:JSON.stringify({email:'system-course@test.invalid',name:'Learner',password:'system course test password'})});
    assert.equal(register.status,201);
    const uid=(await register.json()).data.id;
    const cookie=register.headers.get('set-cookie').split(';')[0];
    seedSystemNetworkVocabulary(db,{ownerId:uid});
    const path=db.prepare('SELECT * FROM learning_paths WHERE source=?').get(systemNetworkSource);
    assert.ok(path);assert.equal(path.visibility,'private');assert.equal(path.owner_id,uid);
    const sets=db.prepare('SELECT s.* FROM path_sets p JOIN study_sets s ON s.id=p.set_id WHERE p.path_id=? ORDER BY p.position').all(path.id);
    assert.equal(sets.length,24);
    assert.deepEqual(sets.map(s=>s.title),systemNetworkVocabulary.sets.map(s=>s.title));
    const words=db.prepare('SELECT w.* FROM words w JOIN path_sets p ON p.set_id=w.set_id WHERE p.path_id=? ORDER BY p.position,w.position').all(path.id);
    assert.equal(words.length,360);assert.equal(new Set(words.map(w=>w.term.toLowerCase())).size,360);
    assert.ok(words.every(w=>w.definition&&w.example&&!w.image_url));
    db.prepare("INSERT INTO word_progress(user_id,word_id,status,starred) VALUES(?,?,'mastered',1)").run(uid,words[0].id);
    seedSystemNetworkVocabulary(db,{ownerId:uid});
    db.prepare('DELETE FROM reference_imports WHERE id=?').run(systemNetworkSource+':user:'+uid);
    seedSystemNetworkVocabulary(db,{ownerId:uid});
    assert.deepEqual(db.prepare('SELECT w.id FROM words w JOIN path_sets p ON p.set_id=w.set_id WHERE p.path_id=? ORDER BY p.position,w.position').all(path.id).map(w=>w.id),words.map(w=>w.id));
    assert.equal(db.prepare('SELECT status FROM word_progress WHERE user_id=? AND word_id=?').get(uid,words[0].id).status,'mastered');
    assert.equal(db.prepare('SELECT count(*) n FROM learning_paths WHERE source=?').get(systemNetworkSource).n,1);
    const get=async route=>{const r=await fetch(base+route,{headers:{cookie}});assert.equal(r.status,200,route);return (await r.json()).data;};
    const listing=await get('/paths?tag=system-network');assert.equal(listing.items[0].id,path.id);
    const detail=await get('/paths/'+path.id);assert.equal(detail.sets.length,24);
    assert.equal(detail.title,'System & Network');
    assert.equal(detail.kind,'vocabulary_collection');
    assert.ok(detail.sets.every(s=>s.collection_id===path.id));
    for(const [index,set] of sets.entries()){
      const detail=await get('/sets/'+set.id);assert.equal(detail.words.length,15);
      for(const [i,word] of detail.words.entries()){
        assert.equal(word.example_translation,systemNetworkVocabulary.sets[index].words[i][3]);
        assert.equal(word.example_source,'prepared');
      }
    }
    const search=await get('/search?q=System');assert.ok(search.paths.items.some(p=>p.id===path.id));
    assert.equal((await get('/paths?filter=mine')).items[0].id,path.id);
    assert.equal((await get('/sets?filter=mine&limit=100')).items.length,24);
    assert.equal((await fetch(base+'/paths/'+path.id)).status,404);
    assert.equal((await fetch(base+'/sets/'+sets[0].id)).status,404);
    const edit=await fetch(base+'/sets/'+sets[0].id,{method:'PATCH',headers:{cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},body:JSON.stringify({description:'Personal editable content'})});
    assert.equal(edit.status,200);
    db.prepare('DELETE FROM path_sets WHERE path_id=? AND set_id=?').run(path.id,sets[0].id);
    assert.equal((await get('/sets/'+sets[0].id)).collection_id,null,'Ungrouped sets stay available as standalone sets');
  }finally{await app.close();}
});
