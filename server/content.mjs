import { fail,text,integer,enumeration,list,boolean,pagination } from './validation.mjs';
import { transaction } from './database.mjs';
const now = () => new Date().toISOString();
const langs = ['en','vi','zh','ko','ja','fr','de','es','ru','ar','th','it','pt'];

export function contentService(db) {
  function setAccess(id, user, write = false) {
    const row = db.prepare('SELECT * FROM study_sets WHERE id=?').get(integer(id,'set_id'));
    const shared = !!user && !!row && !!db.prepare('SELECT 1 FROM assignments a JOIN class_members m ON a.class_id=m.class_id WHERE a.set_id=? AND m.user_id=?').get(row.id,user.id);
    if (!row || (row.visibility !== 'public' && row.owner_id !== user?.id && !shared)) fail(404,'NOT_FOUND','Study set not found.');
    if (write && row.owner_id !== user?.id) fail(403,'FORBIDDEN','Only the owner can edit this study set.');
    return row;
  }
  function pathAccess(id, user, write = false) {
    const row = db.prepare('SELECT * FROM learning_paths WHERE id=?').get(integer(id,'path_id'));
    if (!row || (row.visibility !== 'public' && row.owner_id !== user?.id)) fail(404,'NOT_FOUND','Learning path not found.');
    if (write && row.owner_id !== user?.id) fail(403,'FORBIDDEN','Only the owner can edit this learning path.');
    return row;
  }
  function words(setId,user) {
    return db.prepare(`SELECT w.*,COALESCE(n.example,w.example) example,COALESCE(n.translation,'') example_translation,COALESCE(n.synonyms,w.synonyms) synonyms,COALESCE(n.origin,'library') example_source,COALESCE(p.status,'new') status,COALESCE(p.starred,0) starred,p.due_at FROM words w LEFT JOIN word_progress p ON w.id=p.word_id AND p.user_id=? LEFT JOIN word_notes n ON n.word_id=w.id AND n.user_id=? WHERE w.set_id=? ORDER BY w.position,w.id`).all(user?.id ?? -1,user?.id ?? -1,setId).map(w=>({...w,starred:!!w.starred}));
  }
  function card(row,user,kind='set') {
    const saved = !!user && !!db.prepare('SELECT 1 FROM bookmarks WHERE user_id=? AND kind=? AND resource_id=?').get(user.id,kind,row.id);
    const count = kind === 'set' ? db.prepare('SELECT COUNT(*) n FROM words WHERE set_id=?').get(row.id).n : db.prepare(`SELECT COUNT(*) n FROM path_sets ps JOIN study_sets s ON s.id=ps.set_id WHERE ps.path_id=? AND (s.visibility='public' OR s.owner_id=?)`).get(row.id,user?.id??-1).n;
    const author = row.owner_id ? db.prepare('SELECT id,name FROM users WHERE id=?').get(row.owner_id) : {id:null,name:'Reference content'};
    const learned = kind === 'set' && user ? db.prepare(`SELECT COUNT(*) n FROM word_progress p JOIN words w ON p.word_id=w.id WHERE w.set_id=? AND p.user_id=? AND p.status='mastered'`).get(row.id,user.id).n : 0;
    return { ...row,saved,author,[kind==='set'?'word_count':'set_count']:count,...(kind==='set'?{mastered_count:learned}:{}) };
  }
  function validateWord(input) {
    if (!input || typeof input !== 'object') fail(400,'VALIDATION_ERROR','Each word must be an object.');
    const result = {};
    for (const [key,max] of [['term',300],['definition',2000],['part_of_speech',100],['phonetic',200],['example',3000],['synonyms',1000],['image_url',2000]]) result[key] = text(input[key],key,{max,min:key==='term'||key==='definition'?1:0,fallback:key==='term'||key==='definition'?undefined:''});
    if (result.image_url && !/^https:\/\//i.test(result.image_url)) fail(400,'VALIDATION_ERROR','image_url must use HTTPS.');
    return result;
  }
  function addWords(id,rows) {
    const start = db.prepare('SELECT COALESCE(MAX(position),-1)+1 n FROM words WHERE set_id=?').get(id).n;
    const stmt=db.prepare('INSERT INTO words(set_id,term,definition,part_of_speech,phonetic,example,synonyms,image_url,position) VALUES(?,?,?,?,?,?,?,?,?)');
    rows.forEach((w,i)=>stmt.run(id,w.term,w.definition,w.part_of_speech,w.phonetic,w.example,w.synonyms,w.image_url,start+i));
  }
  function createSet(input,user) {
    const title=text(input.title,'title',{max:200});
    const description=text(input.description,'description',{min:0,max:5000,fallback:''});
    const language=enumeration(input.learning_language,'learning_language',langs,'en');
    const native=enumeration(input.native_language,'native_language',langs,'vi');
    const visibility=enumeration(input.visibility,'visibility',['private','public'],'private');
    const tag=text(input.tag,'tag',{min:0,max:100,fallback:''});
    const rows=list(input.words??[],'words').map(validateWord);
    return transaction(db,()=>{
      const result=db.prepare('INSERT INTO study_sets(owner_id,title,description,learning_language,native_language,visibility,tag,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(user.id,title,description,language,native,visibility,tag,now(),now());
      const id=Number(result.lastInsertRowid); addWords(id,rows); return card(setAccess(id,user),user);
    });
  }
  function listing(c,kind) {
    const table=kind==='set'?'study_sets':'learning_paths';
    const {limit,offset}=pagination(c.query); const params=[c.user?.id??-1];
    let where="(r.visibility='public' OR r.owner_id=?)";
    if(kind==='set'){where="(r.visibility='public' OR r.owner_id=? OR EXISTS(SELECT 1 FROM assignments a JOIN class_members m ON a.class_id=m.class_id WHERE a.set_id=r.id AND m.user_id=?))";params.push(c.user?.id??-1);}
    where+=" AND (r.owner_id IS NOT NULL OR r.source <> 'draft_authored')";
    for(const key of ['learning_language','tag']) if(c.query.has(key)){where+=` AND r.${key}=?`;params.push(c.query.get(key));}
    if(c.query.get('q')){where+=' AND (r.title LIKE ? OR r.description LIKE ?)';const q=`%${c.query.get('q').slice(0,200)}%`;params.push(q,q);}
    if(c.query.get('filter')==='mine'){where+=' AND r.owner_id=?';params.push(c.user?.id??-1);}
    if(c.query.get('filter')==='saved'){where+=' AND EXISTS(SELECT 1 FROM bookmarks b WHERE b.resource_id=r.id AND b.kind=? AND b.user_id=?)';params.push(kind,c.user?.id??-1);}
    if(c.query.get('filter')==='studying'){where+=` AND EXISTS(SELECT 1 FROM study_sessions ss WHERE ss.user_id=? AND ${kind==='set'?'ss.set_id=r.id':'ss.set_id IN(SELECT set_id FROM path_sets WHERE path_id=r.id)'})`;params.push(c.user?.id??-1);}
    const total=db.prepare(`SELECT COUNT(*) n FROM ${table} r WHERE ${where}`).get(...params).n;
    return {items:db.prepare(`SELECT r.* FROM ${table} r WHERE ${where} ORDER BY r.updated_at DESC,r.id DESC LIMIT ? OFFSET ?`).all(...params,limit,offset).map(r=>card(r,c.user,kind)),total,limit,offset};
  }
  function registerRoutes(route) {
    route('PUT','/words/:id/notes',c=>{
      const id=integer(c.params.id,'word_id'),word=db.prepare('SELECT * FROM words WHERE id=?').get(id);
      if(!word)fail(404,'NOT_FOUND','Word not found.');setAccess(word.set_id,c.user);
      const example=text(c.body.example,'example',{max:3000}),translation=text(c.body.translation,'translation',{min:0,max:3000,fallback:''}),synonyms=text(c.body.synonyms,'synonyms',{min:0,max:1000,fallback:''});
      db.prepare("INSERT INTO word_notes VALUES(?,?,?,?,?,'manual',?) ON CONFLICT(user_id,word_id) DO UPDATE SET example=excluded.example,translation=excluded.translation,synonyms=excluded.synonyms,origin=excluded.origin,updated_at=excluded.updated_at").run(c.user.id,id,example,translation,synonyms,now());
      return words(word.set_id,c.user).find(w=>w.id===id);
    },{summary:'Save a personal example and translation for any accessible word; no subscription gate'});
    route('GET','/sets',c=>listing(c,'set'),{public:true,summary:'Search/filter sets; filter=mine|saved|studying'});
    route('POST','/sets',c=>{c.status=201;return createSet(c.body,c.user);},{summary:'Create a set with validated vocabulary'});
    route('POST','/sets/import',c=>{c.status=201;return createSet(c.body,c.user);},{summary:'Import normalized vocabulary JSON as a new set'});
    route('GET','/sets/:id',c=>{const row=setAccess(c.params.id,c.user);return {...card(row,c.user),words:words(row.id,c.user)};},{public:true,summary:'Set detail, word list and current user progress'});
    route('GET','/sets/:id/export',c=>{const row=setAccess(c.params.id,c.user);return {...card(row,c.user),words:words(row.id,c.user),format_version:1};},{summary:'Export accessible set as JSON'});
    route('PATCH','/sets/:id',c=>{
      const row=setAccess(c.params.id,c.user,true); const merged={...row,...c.body};
      const title=text(merged.title,'title',{max:200}), description=text(merged.description,'description',{min:0,max:5000}),visibility=enumeration(merged.visibility,'visibility',['private','public']);
      db.prepare('UPDATE study_sets SET title=?,description=?,visibility=?,updated_at=? WHERE id=?').run(title,description,visibility,now(),row.id);
      return card(setAccess(row.id,c.user),c.user);
    },{summary:'Edit owned set metadata or visibility'});
    route('DELETE','/sets/:id',c=>{const row=setAccess(c.params.id,c.user,true);if(db.prepare('SELECT 1 FROM assignments WHERE set_id=? UNION ALL SELECT 1 FROM conversations WHERE set_id=? UNION ALL SELECT 1 FROM generated_content WHERE set_id=? LIMIT 1').get(row.id,row.id,row.id))fail(409,'RESOURCE_IN_USE','This set is referenced by assignments or AI history.');transaction(db,()=>{db.prepare("DELETE FROM bookmarks WHERE kind='word' AND resource_id IN(SELECT id FROM words WHERE set_id=?)").run(row.id);db.prepare('DELETE FROM study_sets WHERE id=?').run(row.id);db.prepare("DELETE FROM bookmarks WHERE kind='set' AND resource_id=?").run(row.id);});return {deleted:true};},{summary:'Delete an owned set; referenced assignments/history return conflict'});
    route('POST','/sets/:id/clone',c=>{const row=setAccess(c.params.id,c.user);c.status=201;return createSet({...row,title:c.body.title||`${row.title} (copy)`,visibility:'private',words:words(row.id,c.user)},c.user);},{summary:'Copy an accessible set into your library'});
    route('POST','/sets/:id/words',c=>{const row=setAccess(c.params.id,c.user,true);const rows=list(c.body.words,'words').map(validateWord);transaction(db,()=>addWords(row.id,rows));return {words:words(row.id,c.user)};},{summary:'Append vocabulary to an owned set'});
    route('PATCH','/sets/:id/words/:word_id',c=>{const row=setAccess(c.params.id,c.user,true);const id=integer(c.params.word_id,'word_id');const old=db.prepare('SELECT * FROM words WHERE id=? AND set_id=?').get(id,row.id);if(!old)fail(404,'NOT_FOUND','Word not found.');const w=validateWord({...old,...c.body});db.prepare('UPDATE words SET term=?,definition=?,part_of_speech=?,phonetic=?,example=?,synonyms=?,image_url=? WHERE id=?').run(w.term,w.definition,w.part_of_speech,w.phonetic,w.example,w.synonyms,w.image_url,id);return db.prepare('SELECT * FROM words WHERE id=?').get(id);},{summary:'Edit a vocabulary entry'});
    route('DELETE','/sets/:id/words/:word_id',c=>{const row=setAccess(c.params.id,c.user,true);const id=integer(c.params.word_id,'word_id');if(db.prepare('SELECT 1 FROM study_sessions WHERE set_id=? LIMIT 1').get(row.id))fail(409,'RESOURCE_IN_USE','This set already has study history. Clone it before removing vocabulary.');const result=db.prepare('DELETE FROM words WHERE id=? AND set_id=?').run(id,row.id);if(!result.changes)fail(404,'NOT_FOUND','Word not found.');db.prepare("DELETE FROM bookmarks WHERE kind='word' AND resource_id=?").run(id);return {deleted:true};},{summary:'Delete a vocabulary entry; preserve referenced study history'});
    route('PUT','/sets/:id/order',c=>{const row=setAccess(c.params.id,c.user,true);const ids=list(c.body.word_ids,'word_ids').map(id=>integer(id,'word_id'));const existing=words(row.id,c.user).map(w=>w.id);if(ids.length!==existing.length||new Set(ids).size!==ids.length||ids.some(id=>!existing.includes(id)))fail(400,'INVALID_ORDER','Provide every word ID exactly once.');transaction(db,()=>ids.forEach((id,i)=>db.prepare('UPDATE words SET position=? WHERE id=? AND set_id=?').run(i,id,row.id)));return {word_ids:ids};},{summary:'Persist vocabulary ordering'});
    route('GET','/paths',c=>listing(c,'path'),{public:true,summary:'Search/filter learning paths'});
    route('POST','/paths',c=>{
      const title=text(c.body.title,'title',{max:200}),description=text(c.body.description,'description',{min:0,max:5000,fallback:''}),visibility=enumeration(c.body.visibility,'visibility',['private','public'],'private');
      const ids=list(c.body.set_ids??[],'set_ids',1000).map(id=>integer(id,'set_id')); if(new Set(ids).size!==ids.length)fail(400,'VALIDATION_ERROR','Duplicate set IDs.');
      ids.forEach(id=>{const s=setAccess(id,c.user);if(visibility==='public'&&s.visibility!=='public')fail(400,'PRIVATE_CONTENT','A public path can only include public sets.');});
      const id=transaction(db,()=>{const r=db.prepare('INSERT INTO learning_paths(owner_id,title,description,learning_language,native_language,visibility,tag,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(c.user.id,title,description,enumeration(c.body.learning_language,'learning_language',langs,'en'),enumeration(c.body.native_language,'native_language',langs,'vi'),visibility,text(c.body.tag,'tag',{min:0,max:100,fallback:''}),now(),now());const id=Number(r.lastInsertRowid);ids.forEach((s,i)=>db.prepare('INSERT INTO path_sets VALUES(?,?,?)').run(id,s,i));return id;});c.status=201;return card(pathAccess(id,c.user),c.user,'path');
    },{summary:'Create an ordered learning path'});
    route('GET','/paths/:id',c=>{const row=pathAccess(c.params.id,c.user);const sets=db.prepare(`SELECT s.* FROM path_sets ps JOIN study_sets s ON ps.set_id=s.id WHERE ps.path_id=? AND(s.visibility='public' OR s.owner_id=?) ORDER BY ps.position`).all(row.id,c.user?.id??-1);return {...card(row,c.user,'path'),sets:sets.map(s=>card(s,c.user))};},{public:true,summary:'Path detail and ordered accessible sets'});
    route('PUT','/paths/:id/sets',c=>{const path=pathAccess(c.params.id,c.user,true);const ids=list(c.body.set_ids,'set_ids',1000).map(id=>integer(id,'set_id'));if(new Set(ids).size!==ids.length)fail(400,'INVALID_ORDER','Duplicate set IDs.');ids.forEach(id=>{const s=setAccess(id,c.user);if(path.visibility==='public'&&s.visibility!=='public')fail(400,'PRIVATE_CONTENT','A public path can only include public sets.');});transaction(db,()=>{db.prepare('DELETE FROM path_sets WHERE path_id=?').run(path.id);ids.forEach((id,i)=>db.prepare('INSERT INTO path_sets VALUES(?,?,?)').run(path.id,id,i));});return {set_ids:ids};},{summary:'Replace/reorder the sets of an owned path'});
    route('PATCH','/paths/:id',c=>{const row=pathAccess(c.params.id,c.user,true);const visibility=enumeration(c.body.visibility,'visibility',['public','private'],row.visibility);if(visibility==='public'&&db.prepare(`SELECT 1 FROM path_sets p JOIN study_sets s ON p.set_id=s.id WHERE p.path_id=? AND s.visibility<>'public'`).get(row.id))fail(400,'PRIVATE_CONTENT','A public path can only include public sets.');db.prepare('UPDATE learning_paths SET title=?,description=?,visibility=?,updated_at=? WHERE id=?').run(text(c.body.title??row.title,'title',{max:200}),text(c.body.description??row.description,'description',{min:0,max:5000}),visibility,now(),row.id);return card(pathAccess(row.id,c.user),c.user,'path');},{summary:'Edit an owned learning path'});
    route('DELETE','/paths/:id',c=>{const row=pathAccess(c.params.id,c.user,true);db.prepare('DELETE FROM learning_paths WHERE id=?').run(row.id);db.prepare("DELETE FROM bookmarks WHERE kind='path' AND resource_id=?").run(row.id);return {deleted:true};},{summary:'Delete an owned learning path'});
    route('PUT','/bookmarks/:kind/:id',c=>{const kind=enumeration(c.params.kind,'kind',['set','path','word']),id=integer(c.params.id,'id');if(kind==='set')setAccess(id,c.user);else if(kind==='path')pathAccess(id,c.user);else{const w=db.prepare('SELECT set_id FROM words WHERE id=?').get(id);if(!w)fail(404,'NOT_FOUND','Word not found.');setAccess(w.set_id,c.user);}const saved=boolean(c.body.saved,'saved');if(saved)db.prepare('INSERT OR IGNORE INTO bookmarks VALUES(?,?,?,?)').run(c.user.id,kind,id,now());else db.prepare('DELETE FROM bookmarks WHERE user_id=? AND kind=? AND resource_id=?').run(c.user.id,kind,id);return {saved};},{summary:'Save/unsave a set, path, or word idempotently'});
    route('GET','/dictionary',c=>{const q=text(c.query.get('q'),'q',{max:200});return {items:db.prepare(`SELECT w.*,s.learning_language,s.native_language FROM words w JOIN study_sets s ON w.set_id=s.id WHERE (s.visibility='public' OR s.owner_id=?) AND(s.owner_id IS NOT NULL OR s.source<>'draft_authored') AND s.learning_language='en' AND s.native_language='vi' AND(w.term LIKE ? OR w.definition LIKE ?) ORDER BY CASE WHEN lower(w.term)=lower(?) THEN 0 ELSE 1 END,w.id LIMIT 30`).all(c.user?.id??-1,`%${q}%`,`%${q}%`,q),source:'local_library'};},{public:true,summary:'Dictionary lookup in accessible local vocabulary'});
  }
  return {setAccess,pathAccess,words,card,createSet,listing,registerRoutes};
}
