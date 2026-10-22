import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../database.mjs';
import {seedScreenshots} from '../seed.mjs';
import {importVisibleReference} from '../reference-content.mjs';
import {readFileSync} from 'node:fs';

test('seeding and reference refresh preserve word IDs, progress, and path membership',()=>{
  const db=openDatabase(':memory:');
  try {
    seedScreenshots(db);
    const reference=JSON.parse(readFileSync(new URL('../content/visible-english.json',import.meta.url),'utf8'));
    for(const path of reference.paths){
      assert.equal(db.prepare('SELECT count(*) n FROM path_sets WHERE path_id=?').get(path.id).n,path.sets.length);
      for(const set of path.sets){
        const id=set.source_id===163?163:10000+set.source_id;
        const actual=db.prepare('SELECT term,definition,part_of_speech,phonetic FROM words WHERE set_id=? ORDER BY position,id').all(id);
        assert.deepEqual(actual.map(w=>({...w})),set.words.map(({term,definition,part_of_speech,phonetic})=>({term,definition,part_of_speech,phonetic})),set.title);
      }
    }
    const words=db.prepare('SELECT id,term FROM words WHERE set_id=163 ORDER BY position').all();
    assert.equal(db.prepare("SELECT count(*) n FROM words WHERE set_id=163 AND example<>''").get().n,3);
    assert.equal(db.prepare("SELECT count(*) n FROM words WHERE set_id=163 AND synonyms<>''").get().n,0);
    db.prepare("INSERT INTO users(email,password_hash,name,created_at) VALUES('audit@test.invalid','unused','Audit',?)").run(new Date().toISOString());
    const user=db.prepare("SELECT id FROM users WHERE email='audit@test.invalid'").get();
    db.prepare("INSERT INTO word_progress(user_id,word_id,status,starred) VALUES(?,?,'learning',1)").run(user.id,words[0].id);
    seedScreenshots(db);seedScreenshots(db);
    assert.deepEqual(db.prepare('SELECT id,term FROM words WHERE set_id=163 ORDER BY position').all(),words);
    assert.equal(db.prepare('SELECT starred FROM word_progress WHERE user_id=? AND word_id=?').get(user.id,words[0].id).starred,1);
    assert.equal(db.prepare('SELECT count(*) n FROM path_sets WHERE path_id=14').get().n,50);
    db.prepare("DELETE FROM reference_imports WHERE id='visible-english-v1'").run();
    importVisibleReference(db);
    assert.deepEqual(db.prepare('SELECT id,term FROM words WHERE set_id=163 ORDER BY position').all(),words);
    assert.equal(db.prepare('SELECT count(*) n FROM path_sets WHERE path_id=14').get().n,50);
  }finally{db.close();}
});
