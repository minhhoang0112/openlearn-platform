import {fail,list,integer} from './validation.mjs';
import {transaction} from './database.mjs';

export function learningPhraseService(db,{clock=()=>new Date()}={}){
  function collection(user){
    const row=db.prepare('SELECT s.* FROM learning_phrase_collections c JOIN study_sets s ON s.id=c.set_id WHERE c.user_id=?').get(user.id);
    if(row&&(row.owner_id!==user.id||row.visibility!=='private'))fail(409,'PHRASE_COLLECTION_CHANGED','Bộ cụm từ đã thay đổi quyền truy cập. Hãy đặt lại chế độ riêng tư trước khi lưu thêm.');
    return row;
  }
  function source(id,stepId,user){
    const s=db.prepare('SELECT s.*,l.content FROM learning_sessions s JOIN learning_lesson_versions l ON l.lesson_id=s.lesson_id AND l.version=s.content_version WHERE s.id=? AND s.user_id=?').get(id,user.id);
    if(!s)fail(404,'NOT_FOUND','Learning session not found.');
    const body=JSON.parse(s.content),index=body.steps.findIndex(q=>q.id===stepId),step=body.steps[index];
    if(!step)fail(404,'NOT_FOUND','Lesson step not found.');
    if(step.type!=='vocabulary_in_context'||!Array.isArray(step.phrases))fail(400,'UNSUPPORTED_PHRASE_STEP','Chỉ lưu cụm từ từ bước Từ/cụm trong ngữ cảnh.');
    if(index>JSON.parse(s.state).cursor)fail(409,'STEP_NOT_REACHED','Học tới bước cụm từ trước khi lưu.');
    return {session:s,body,step};
  }
  function savedLink(s,index,user){
    const row=db.prepare('SELECT w.*,p.status,p.repetitions,p.due_at,p.last_reviewed_at FROM learning_phrase_links l JOIN words w ON w.id=l.word_id JOIN study_sets c ON c.id=w.set_id LEFT JOIN word_progress p ON p.word_id=w.id AND p.user_id=l.user_id WHERE l.user_id=? AND l.lesson_id=? AND l.content_version=? AND l.step_id=? AND l.phrase_index=? AND c.owner_id=? AND c.visibility=\'private\'').get(user.id,s.session.lesson_id,s.session.content_version,s.step.id,index,user.id);
    return row??null;
  }
  function preview(s,user){
    return s.step.phrases.map((p,i)=>{const saved=savedLink(s,i,user);return {phrase_index:i,text:p.text,translation:p.translation,saved:!!saved,word_id:saved?.id??null,set_id:saved?.set_id??null,route:saved?`/study-set/${saved.set_id}`:null};});
  }
  function library(user){
    const set=collection(user);if(!set)return {set_id:null,route:null,review_route:'/repetition-study',word_count:0,source_links:0,due_count:0};
    return {set_id:set.id,title:set.title,route:`/study-set/${set.id}`,review_route:'/repetition-study',
      word_count:db.prepare('SELECT COUNT(*) n FROM words WHERE set_id=?').get(set.id).n,
      source_links:db.prepare('SELECT COUNT(*) n FROM learning_phrase_links WHERE user_id=?').get(user.id).n,
      due_count:db.prepare('SELECT COUNT(*) n FROM word_progress p JOIN words w ON w.id=p.word_id WHERE p.user_id=? AND w.set_id=? AND p.due_at<=?').get(user.id,set.id,clock().toISOString()).n};
  }
  function registerRoutes(route){
    route('GET','/learning/phrase-library',c=>library(c.user),{summary:'Own private phrase collection and actual SRS due count; no automatic imports or AI'});
    route('GET','/learning/sessions/:id/steps/:step_id/phrases',c=>{
      const s=source(c.params.id,c.params.step_id,c.user);collection(c.user);
      return {lesson_id:s.session.lesson_id,content_version:s.session.content_version,step_id:s.step.id,items:preview(s,c.user),library:library(c.user)};
    },{summary:'Pinned lesson phrases and whether each was explicitly saved to the learner collection'});
    route('POST','/learning/sessions/:id/steps/:step_id/phrases',c=>transaction(db,()=>{
      if(Object.keys(c.body).some(k=>k!=='phrase_indexes'))fail(400,'VALIDATION_ERROR','Chỉ gửi phrase_indexes; nội dung lấy từ bài đã lưu trên BE.');
      const s=source(c.params.id,c.params.step_id,c.user),indexes=list(c.body.phrase_indexes,'phrase_indexes',20).map(i=>integer(i,'phrase_index',{min:0,max:s.step.phrases.length-1}));
      if(!indexes.length||new Set(indexes).size!==indexes.length)fail(400,'VALIDATION_ERROR','Chọn ít nhất một cụm, không trùng chỉ số.');
      let set=collection(c.user);const at=clock().toISOString();
      if(!set){
        const id=Number(db.prepare("INSERT INTO study_sets(owner_id,title,description,learning_language,native_language,visibility,tag,source,content_status,created_at,updated_at) VALUES(?,?,?,'en','vi','private','Learning V2','learning_v2','complete',?,?)").run(c.user.id,'Cụm từ từ bài học của tôi','Các cụm từ bạn chủ động lưu từ bài học; ôn qua bộ thẻ và SRS hiện có.',at,at).lastInsertRowid);
        db.prepare('INSERT INTO learning_phrase_collections VALUES(?,?)').run(c.user.id,id);set=collection(c.user);
      }
      let added=0,linked=0,existing=0,reused=0;
      for(const i of indexes){
        if(savedLink(s,i,c.user)){existing++;continue;}
        if(db.prepare('SELECT 1 FROM learning_phrase_links WHERE user_id=? AND lesson_id=? AND content_version=? AND step_id=? AND phrase_index=?').get(c.user.id,s.session.lesson_id,s.session.content_version,s.step.id,i))fail(409,'PHRASE_LINK_CHANGED','Cụm đã lưu đang nằm trong bộ có quyền truy cập khác. Hãy kiểm tra bộ thẻ của bạn trước.');
        const p=s.step.phrases[i];
        // Preserve manual edits; only exact term/definition pairs are reused across lessons.
        let word=db.prepare('SELECT * FROM words WHERE set_id=? AND term=? AND definition=? ORDER BY id LIMIT 1').get(set.id,p.text,p.translation);
        if(!word){
          const sentences=s.body.transcript.match(/[^.!?]+[.!?]+|[^.!?]+$/g)??[];
          const example=sentences.map(t=>t.trim()).find(t=>t.toLowerCase().includes(p.text.toLowerCase()))??'';
          const position=db.prepare('SELECT COALESCE(MAX(position),-1)+1 n FROM words WHERE set_id=?').get(set.id).n;
          const wordId=Number(db.prepare("INSERT INTO words(set_id,term,definition,example,position) VALUES(?,?,?,?,?)").run(set.id,p.text,p.translation,example,position).lastInsertRowid);
          word=db.prepare('SELECT * FROM words WHERE id=?').get(wordId);added++;
        }else reused++;
        db.prepare('INSERT INTO learning_phrase_links VALUES(?,?,?,?,?,?,?)').run(c.user.id,s.session.lesson_id,s.session.content_version,s.step.id,i,word.id,at);linked++;
        db.prepare("INSERT INTO word_progress(user_id,word_id,status,repetitions,interval_days,ease,due_at) VALUES(?,?,'new',0,0,2.5,?) ON CONFLICT(user_id,word_id) DO NOTHING").run(c.user.id,word.id,at);
      }
      if(added)db.prepare('UPDATE study_sets SET updated_at=? WHERE id=?').run(at,set.id);
      return {added_count:added,linked_count:linked,already_saved_count:existing,reused_count:reused,items:preview(s,c.user),library:library(c.user)};
    }),{summary:'Explicitly save selected lesson phrases into own private study set and existing SRS, idempotently and without marking mastery'});
  }
  return {registerRoutes};
}
