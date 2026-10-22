import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transaction} from './database.mjs';
import {authoredExample} from './content/authored-examples.mjs';
// These three examples are visible in the user's attached screenshot.
const screenshotExamples={apply:'You should apply for the job before the deadline.','apply for':'He decided to apply for a job at the new company.',apprentice:'The apprentice learned carpentry skills from his master.'};

export function importVisibleReference(db) {
  const raw=readFileSync(new URL('./content/visible-english.json',import.meta.url),'utf8');
  const library=JSON.parse(raw);
  const digest=createHash('sha256').update('reference-import-v4\0').update(raw).digest('hex');
  db.exec('CREATE TABLE IF NOT EXISTS reference_imports(id TEXT PRIMARY KEY,digest TEXT NOT NULL,imported_at TEXT NOT NULL)');
  if(db.prepare('SELECT digest FROM reference_imports WHERE id=?').get('visible-english-v1')?.digest===digest)return;
  transaction(db,()=>{
    const now=new Date().toISOString();
    for(const path of library.paths) {
      if(!path.sets.length)throw new Error('Reference path has no visible vocabulary');
      const existingPath=db.prepare('SELECT owner_id FROM learning_paths WHERE id=?').get(path.id);
      if(existingPath?.owner_id)throw new Error('Reference path ID conflicts with user content');
      db.prepare(`INSERT INTO learning_paths(id,title,description,learning_language,native_language,visibility,tag,source,content_status,expected_set_count,created_at,updated_at) VALUES(?,?,?,'en','vi','public',?,?,'vocabulary_verified',?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,tag=excluded.tag,source=excluded.source,content_status=excluded.content_status,expected_set_count=excluded.expected_set_count,updated_at=excluded.updated_at`).run(path.id,path.title,'Học tiếng Anh theo chủ đề với flashcards, luyện nhớ, nghe chép và giao tiếp cùng AI.',path.tag,path.source_url,path.expected_set_count,now,now);
      const links=[];
      for(const set of path.sets) {
        const id=set.source_id===163?163:10000+set.source_id;
        const old=db.prepare('SELECT owner_id FROM study_sets WHERE id=?').get(id);
        if(old?.owner_id)throw new Error('Reference set ID conflicts with user content');
        db.prepare(`INSERT INTO study_sets(id,title,description,learning_language,native_language,visibility,tag,source,content_status,created_at,updated_at) VALUES(?,?,?,'en','vi','public',?,?,'vocabulary_verified',?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,tag=excluded.tag,source=excluded.source,content_status=excluded.content_status,updated_at=excluded.updated_at`).run(id,set.title,'Bộ từ Anh–Việt với các chế độ học tự do và ví dụ cá nhân.',path.tag,set.source_url,now,now);
        const previous=db.prepare('SELECT id,term,position FROM words WHERE set_id=? ORDER BY position,id').all(id);
        const used=new Set();
        for(const [position,w] of set.words.entries()) {
          const existing=previous.find(row=>!used.has(row.id)&&row.position===position&&row.term.toLowerCase()===w.term.toLowerCase())||previous.find(row=>!used.has(row.id)&&row.term.toLowerCase()===w.term.toLowerCase());
          if(existing)used.add(existing.id);
          const example=set.source_id===163?(screenshotExamples[w.term]||''):authoredExample(w,set.title);
          if(existing)db.prepare("UPDATE words SET definition=?,part_of_speech=?,phonetic=?,example=?,synonyms='',position=? WHERE id=?").run(w.definition,w.part_of_speech,w.phonetic,example,position,existing.id);
          else db.prepare('INSERT INTO words(set_id,term,definition,part_of_speech,phonetic,example,position) VALUES(?,?,?,?,?,?,?)').run(id,w.term,w.definition,w.part_of_speech,w.phonetic,example,position);
        }
        links.push(id);
      }
      // Replace only reference path membership; old words and learner history remain intact.
      db.prepare('DELETE FROM path_sets WHERE path_id=?').run(path.id);
      links.forEach((id,pos)=>db.prepare('INSERT INTO path_sets(path_id,set_id,position) VALUES(?,?,?)').run(path.id,id,pos));
    }
    db.prepare('INSERT INTO reference_imports VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET digest=excluded.digest,imported_at=excluded.imported_at').run('visible-english-v1',digest,now);
  });
}
