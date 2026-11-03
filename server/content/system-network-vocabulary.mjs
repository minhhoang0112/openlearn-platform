import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transaction} from '../database.mjs';

// Independently authored text only. Rows: term, Vietnamese sense, English example, Vietnamese example.
const raw=readFileSync(new URL('./system-network-vocabulary.json',import.meta.url),'utf8');
const pronunciationRaw=readFileSync(new URL('./system-network-pronunciation.json',import.meta.url),'utf8');
const pronunciation=JSON.parse(pronunciationRaw).entries;
export const systemNetworkVocabulary=JSON.parse(raw);
export const systemNetworkSource='openlearn:system-network:v1';
const digest=createHash('sha256').update(raw).update(pronunciationRaw).digest('hex');
const examples=new Map();
const keys=new Set(),terms=new Set();
for(const set of systemNetworkVocabulary.sets){
  if(!/^[a-z0-9-]+$/.test(set.key)||keys.has(set.key)||!set.words.length)throw Error('Invalid system/network topic');
  keys.add(set.key);
  for(const row of set.words){
    if(row.length!==4||row.some(s=>typeof s!=='string'||!s.trim()))throw Error('Incomplete system/network vocabulary row');
    const term=row[0].toLowerCase();
    if(!pronunciation[row[0]]?.part_of_speech||!pronunciation[row[0]]?.phonetic)throw Error('Missing system/network pronunciation: '+row[0]);
    if(terms.has(term))throw Error('Duplicate system/network term: '+term);
    terms.add(term);examples.set(term+'\0'+row[2],row[3]);
  }
}

export function systemNetworkExampleTranslation(word){
  return examples.get(String(word.term).toLowerCase()+'\0'+String(word.example).trim());
}

export function seedSystemNetworkVocabulary(db,{ownerId,movePublic=false}={}){
  if(!Number.isSafeInteger(ownerId)||!db.prepare('SELECT id FROM users WHERE id=?').get(ownerId))throw Error('An existing ownerId is required to create this personal course.');
  const importId=systemNetworkSource+':user:'+ownerId;
  db.exec('CREATE TABLE IF NOT EXISTS reference_imports(id TEXT PRIMARY KEY,digest TEXT NOT NULL,imported_at TEXT NOT NULL)');
  if(db.prepare('SELECT digest FROM reference_imports WHERE id=?').get(importId)?.digest===digest)return;
  transaction(db,()=>{
    const now=new Date().toISOString();
    // Allocate IDs normally: never overwrite an existing user's path or study set.
    let path=db.prepare('SELECT id FROM learning_paths WHERE owner_id=? AND source=? ORDER BY id LIMIT 1').get(ownerId,systemNetworkSource);
    if(!path&&movePublic){
      path=db.prepare('SELECT id FROM learning_paths WHERE owner_id IS NULL AND source=? ORDER BY id LIMIT 1').get(systemNetworkSource);
      if(path)db.prepare("UPDATE learning_paths SET owner_id=?,visibility='private' WHERE id=?").run(ownerId,path.id);
    }
    if(!path){
      const result=db.prepare("INSERT INTO learning_paths(owner_id,title,description,learning_language,native_language,visibility,tag,source,content_status,expected_set_count,created_at,updated_at) VALUES(?,?,?,'en','vi','private','system-network',?,'complete',?,?,?)").run(ownerId,systemNetworkVocabulary.title,systemNetworkVocabulary.description,systemNetworkSource,systemNetworkVocabulary.sets.length,now,now);
      path={id:Number(result.lastInsertRowid)};
    }else db.prepare('UPDATE learning_paths SET title=?,description=?,expected_set_count=?,updated_at=? WHERE id=?').run(systemNetworkVocabulary.title,systemNetworkVocabulary.description,systemNetworkVocabulary.sets.length,now,path.id);
    systemNetworkVocabulary.sets.forEach((topic,index)=>{
      const source=systemNetworkSource+':'+topic.key;
      const description='Từ vựng System & Network · '+topic.title+'. 15 mục có nghĩa và ví dụ Anh–Việt soạn sẵn. Học theo thứ tự bộ hoặc chọn chủ đề đang cần; không cần AI để tạo ví dụ.';
      let set=db.prepare('SELECT id FROM study_sets WHERE owner_id=? AND source=? ORDER BY id LIMIT 1').get(ownerId,source);
      if(!set&&movePublic){
        set=db.prepare('SELECT id FROM study_sets WHERE owner_id IS NULL AND source=? ORDER BY id LIMIT 1').get(source);
        if(set)db.prepare("UPDATE study_sets SET owner_id=?,visibility='private' WHERE id=?").run(ownerId,set.id);
      }
      if(!set){
        const result=db.prepare("INSERT INTO study_sets(owner_id,title,description,learning_language,native_language,visibility,tag,source,content_status,created_at,updated_at) VALUES(?,?,?,'en','vi','private','system-network',?,'complete',?,?)").run(ownerId,topic.title,description,source,now,now);
        set={id:Number(result.lastInsertRowid)};
      }else db.prepare('UPDATE study_sets SET title=?,description=?,updated_at=? WHERE id=?').run(topic.title,description,now,set.id);
      for(const [position,[term,definition,example]] of topic.words.entries()){
        const {part_of_speech,phonetic}=pronunciation[term];
        const old=db.prepare('SELECT id FROM words WHERE set_id=? AND term=? COLLATE NOCASE ORDER BY id LIMIT 1').get(set.id,term);
        if(old)db.prepare('UPDATE words SET definition=?,example=?,part_of_speech=?,phonetic=?,position=? WHERE id=?').run(definition,example,part_of_speech,phonetic,position,old.id);
        else db.prepare('INSERT INTO words(set_id,term,definition,example,part_of_speech,phonetic,position) VALUES(?,?,?,?,?,?,?)').run(set.id,term,definition,example,part_of_speech,phonetic,position);
      }
      // Keep word IDs and all personal notes / progress on content updates.
      db.prepare('INSERT INTO path_sets(path_id,set_id,position) VALUES(?,?,?) ON CONFLICT(path_id,set_id) DO UPDATE SET position=excluded.position').run(path.id,set.id,index);
    });
    db.prepare('INSERT INTO reference_imports(id,digest,imported_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET digest=excluded.digest,imported_at=excluded.imported_at').run(importId,digest,now);
  });
}
