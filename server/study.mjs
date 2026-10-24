import { randomUUID, randomInt } from 'node:crypto';
import { fail,integer,enumeration,boolean,normalize,pagination } from './validation.mjs';
import { transaction } from './database.mjs';
const now=()=>new Date().toISOString();
const sentenceNormalize=value=>normalize(value).replace(/[.,!?;:…]+$/gu,'').replace(/[‘’]/g,"'");
const memoryLevel=p=>p.status==='new'?0:p.repetitions===0?1:p.repetitions===1?2:p.repetitions===2?3:4;
export const studyModes=['flashcard','learn','write','dictation','quiz','exam','match','comprehensive'];
function shuffle(items) { const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=randomInt(i+1);[copy[i],copy[j]]=[copy[j],copy[i]];}return copy; }

// An independent, deterministic SM-2-based scheduler. The original server's algorithm is unknown.
export function schedule(previous,quality,at=new Date()) {
  const ease=Math.max(1.3,(previous?.ease??2.5)+0.1-(5-quality)*(0.08+(5-quality)*0.02));
  const repetitions=quality<3?0:(previous?.repetitions??0)+1;
  const interval=quality<3?0:repetitions===1?1:repetitions===2?6:Math.max(1,Math.round((previous?.interval_days??1)*ease));
  return {ease,repetitions,interval_days:interval,status:repetitions>=3?'mastered':'learning',due_at:new Date(at.getTime()+(quality<3?600000:interval*86400000)).toISOString(),last_reviewed_at:at.toISOString()};
}
export function studyService(db,content) {
  function applyReview(userId,wordId,quality) {
    const old=db.prepare('SELECT * FROM word_progress WHERE user_id=? AND word_id=?').get(userId,wordId);
    const at=new Date(Math.max(Date.now(),(Date.parse(old?.last_reviewed_at??'')||0)+1));
    const p=schedule(old,quality,at);
    db.prepare(`INSERT INTO word_progress(user_id,word_id,status,repetitions,interval_days,ease,due_at,last_reviewed_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id,word_id) DO UPDATE SET status=excluded.status,repetitions=excluded.repetitions,interval_days=excluded.interval_days,ease=excluded.ease,due_at=excluded.due_at,last_reviewed_at=excluded.last_reviewed_at`).run(userId,wordId,p.status,p.repetitions,p.interval_days,p.ease,p.due_at,p.last_reviewed_at);
    return p;
  }
  function access(sessionId,user) {
    const row=db.prepare('SELECT * FROM study_sessions WHERE id=? AND user_id=?').get(sessionId,user.id);
    if(!row)fail(404,'NOT_FOUND','Study session not found.');content.setAccess(row.set_id,user);
    return {...row,state:JSON.parse(row.state)};
  }
  function mastery(row,answers=db.prepare('SELECT question_id,word_id,correct FROM study_answers WHERE session_id=? ORDER BY id').all(row.id)) {
    const threshold=row.mode==='learn'?(row.state.settings.required_correct??1):1;
    const groups=new Map(),byId=new Map(row.state.questions.map(q=>[q.id,q]));
    for(const q of row.state.questions){const key=q.word_id+':'+(q.direction||'default');if(!groups.has(key))groups.set(key,{word_id:q.word_id,direction:q.direction||'default',correct_streak:0});}
    for(const answer of answers){const q=byId.get(answer.question_id);if(!q)continue;const group=groups.get(q.word_id+':'+(q.direction||'default'));group.correct_streak=answer.correct?group.correct_streak+1:0;}
    return [...groups.values()].map(g=>({...g,required_correct:threshold,complete:g.correct_streak>=threshold}));
  }
  function present(row) {
    const {questions,cursor,settings}=row.state;
    const q=row.mode==='match'?questions.find(question=>!db.prepare('SELECT 1 FROM study_answers WHERE session_id=? AND question_id=?').get(row.id,question.id)):questions[cursor];
    const answers=db.prepare('SELECT question_id,word_id,correct FROM study_answers WHERE session_id=? ORDER BY id').all(row.id);
    const answered={correct:answers.filter(a=>a.correct).length};
    const unique=[...new Set(questions.map(q=>q.word_id))];
    const wordMastery=mastery(row,answers);
    const mastered=unique.filter(wordId=>wordMastery.filter(g=>g.word_id===wordId).every(g=>g.complete)).length;
    return {id:row.id,set_id:row.set_id,mode:row.mode,settings,status:row.completed_at?'completed':'active',total:questions.length,completed:cursor,correct:answered.correct,total_words:unique.length,completed_words:mastered,word_mastery:wordMastery,retry_limit_reached:!!row.state.retry_limit_reached,question:q?{id:q.id,word_id:q.word_id,type:q.type,prompt:q.prompt,phonetic:q.phonetic,part_of_speech:q.part_of_speech,options:q.options,speech_text:q.speech_text,direction:q.direction,answer_mode:q.answer_mode,dictation_content:q.dictation_content}:null,created_at:row.created_at,updated_at:row.updated_at,completed_at:row.completed_at};
  }
  function makeQuestions(words,mode,settings) {
    let selected=settings.shuffle?shuffle(words):words;
    if(settings.word_ids)selected=selected.filter(w=>settings.word_ids.includes(w.id));
    if(settings.starred_only)selected=selected.filter(w=>w.starred);
    if(settings.unmastered_only)selected=selected.filter(w=>w.status!=='mastered');
    if(settings.due_only)selected=selected.filter(w=>w.due_at&&w.due_at<=now());
    if(!selected.length)fail(409,'NO_WORDS','No vocabulary matches these settings.');
    selected=selected.slice(0,settings.limit);
    if(mode==='match')return selected.map(w=>({id:randomUUID(),word_id:w.id,type:'match',prompt:w.term,expected:w.definition,accepted:[normalize(w.definition)]}));
    if(mode==='dictation'&&settings.dictation_content==='example'){
      const missing=selected.filter(w=>!w.example?.trim());
      if(missing.length)fail(409,'EXAMPLES_REQUIRED','Create examples for the selected words before sentence dictation.',{word_ids:missing.map(w=>w.id)});
    }
    const modes=mode==='comprehensive'?['quiz','write','dictation']:[mode];
    const questions=[];
    for(const selectedType of modes) for(const [index,w] of selected.entries()) {
      const directions=mode==='learn'&&settings.direction==='both'?['term_to_definition','definition_to_term']:[settings.direction];
      for(const [directionIndex,direction] of directions.entries()){
      const type=selectedType==='learn'?settings.question_types[(index*directions.length+directionIndex)%settings.question_types.length]:selectedType==='exam'?(index%2===0?'write':'quiz'):selectedType;
      const termAnswer=type==='dictation'||direction==='definition_to_term';
      const sentence=type==='dictation'&&settings.dictation_content==='example';
      const expected=sentence?w.example:settings.answer_mode==='synonyms'?w.synonyms:termAnswer?w.term:w.definition;
      const accepted=[expected,...(sentence||termAnswer&&settings.answer_mode!=='synonyms'?[]:expected.split(/[;,]/)),...(settings.accept_synonyms&&settings.answer_mode==='meaning'&&type!=='dictation'?(w.synonyms||'').split(/[;,]/):[])].map(sentence?sentenceNormalize:normalize).filter(Boolean);
      if(!accepted.length)fail(409,'NO_SYNONYMS','Synonym mode requires synonyms for every selected word.');
      const q={id:randomUUID(),word_id:w.id,type,prompt:type==='dictation'?null:settings.answer_mode==='synonyms'?w.term:termAnswer?w.definition:w.term,expected,accepted,phonetic:w.phonetic,part_of_speech:w.part_of_speech,direction,answer_mode:settings.answer_mode,dictation_content:sentence?'example':'word'};
      q.speech_text=sentence?w.example:w.term;
      if(type==='quiz') {
        const distractors=[...new Set(shuffle(words.filter(v=>v.id!==w.id)).map(v=>settings.answer_mode==='synonyms'?v.synonyms:termAnswer?v.term:v.definition))].filter(v=>v?.trim()&&!v.split(/[;,]/).some(part=>accepted.includes(normalize(part)))&&!accepted.includes(normalize(v))).slice(0,3);
        if(!distractors.length)fail(409,'NOT_ENOUGH_OPTIONS','Quiz mode requires at least two distinct answers.');
        q.options=shuffle([expected,...distractors]).map(value=>({id:randomUUID(),text:value}));q.expected_option_id=q.options.find(o=>o.text===expected).id;
      }
      questions.push(q);
      }
    }
    return questions;
  }
  function addRetry(row,q){
    if(row.mode!=='learn'||!row.state.settings.adaptive)return;
    if(mastery(row).find(g=>g.word_id===q.word_id&&g.direction===(q.direction||'default'))?.complete)return;
    if(row.state.questions.slice(row.state.cursor).some(item=>item.id!==q.id&&item.word_id===q.word_id&&item.direction===q.direction))return;
    const attempts=row.state.questions.filter(item=>item.word_id===q.word_id&&item.direction===q.direction).length;
    if(attempts<row.state.settings.max_attempts)row.state.questions.push({...q,id:randomUUID(),retry_of:q.retry_of||q.id});
    else row.state.retry_limit_reached=true;
  }
  function summary(user,setId,pathId) {
    const params=[user.id];let where='p.user_id=?';
    if(setId){content.setAccess(setId,user);where+=' AND w.set_id=?';params.push(Number(setId));}
    if(pathId){content.pathAccess(pathId,user);where+=' AND w.set_id IN(SELECT set_id FROM path_sets WHERE path_id=?)';params.push(Number(pathId));}
    where+=" AND(s.visibility='public' OR s.owner_id=? OR EXISTS(SELECT 1 FROM assignments a JOIN class_members m ON a.class_id=m.class_id WHERE a.set_id=s.id AND m.user_id=?))";params.push(user.id,user.id);
    const rows=db.prepare(`SELECT p.* FROM word_progress p JOIN words w ON p.word_id=w.id JOIN study_sets s ON s.id=w.set_id WHERE ${where}`).all(...params);
    return {due:rows.filter(r=>r.due_at&&r.due_at<=now()).length,learning:rows.filter(r=>r.status==='learning').length,mastered:rows.filter(r=>r.status==='mastered').length,tracked:rows.length,memory_levels:['Chưa nhớ','Cần học','Hay quên','Nhớ tạm','Nhớ sâu'].map((label,level)=>({level,label,count:rows.filter(r=>memoryLevel(r)===level).length})),forecast:Array.from({length:14},(_,i)=>{const date=new Date(Date.now()+i*86400000).toISOString().slice(0,10);return {date,count:rows.filter(r=>r.due_at?.startsWith(date)).length};})};
  }
  function registerRoutes(route) {
    route('GET','/study/options',c=>{
      const mode=enumeration(c.query.get('mode')||'learn','mode',studyModes),setId=c.query.get('set_id');
      let words=[];if(setId){const set=content.setAccess(setId,c.user);words=content.words(set.id,c.user);}
      const defaults={direction:'term_to_definition',answer_mode:'meaning',question_types:['write'],required_correct:mode==='learn'?2:1,max_attempts:3,adaptive:mode==='learn',starred_only:false,unmastered_only:false,shuffle:false,accept_synonyms:false,auto_advance_on_correct:false,auto_audio:mode==='dictation',audio_rate:0.9,voice_uri:'',dictation_content:'word'};
      const raw=JSON.parse(c.user.settings).study?.[mode],saved=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
      return {mode,defaults,saved,settings:{...defaults,...saved},directions:['term_to_definition','definition_to_term','both'],answer_modes:['meaning','synonyms','speech'],question_types:['write','quiz'],counts:{total:words.length,starred:words.filter(w=>w.starred).length,unmastered:words.filter(w=>w.status!=='mastered').length},subscription_required:false};
    },{summary:'Effective study defaults, saved preferences and actual filter counts for FE settings'});
    route('POST','/study/sessions',c=>{const result=start(c.user,c.body);c.status=201;return result;},{summary:'Start a server-graded study session with fixed questions'});
    route('GET','/study/sessions',c=>{const {limit,offset}=pagination(c.query);return {items:db.prepare('SELECT id FROM study_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(c.user.id,limit,offset).map(r=>present(access(r.id,c.user))),limit,offset};},{summary:'Study history and resumable sessions'});
    route('GET','/study/sessions/:id',c=>present(access(c.params.id,c.user)),{summary:'Resume a session without revealing unsubmitted answers'});
    route('POST','/study/sessions/:id/answers',c=>transaction(db,()=>{
      const row=access(c.params.id,c.user); const questionId=typeof c.body.question_id==='string'?c.body.question_id:'';
      if(row.mode==='exam')fail(409,'BATCH_SUBMISSION_REQUIRED','Use the exam submit endpoint.');
      const q=row.state.questions.find(q=>q.id===questionId);
      if(!q)fail(400,'INVALID_QUESTION','Question does not belong to this session.');
      const existing=db.prepare('SELECT * FROM study_answers WHERE session_id=? AND question_id=?').get(row.id,q.id);
      if(existing)return {correct:!!existing.correct,expected:q.expected,replayed:true,session:present(row)};
      if(row.completed_at||(row.mode!=='match'&&row.state.questions[row.state.cursor].id!==q.id))fail(409,'QUESTION_OUT_OF_ORDER','Answer the current question first.');
      if(typeof c.body.answer!=='string'||c.body.answer.length>4000)fail(400,'VALIDATION_ERROR','answer must be a string of at most 4000 characters.');
      let correct=q.type==='flashcard'?boolean(c.body.known,'known'):q.type==='quiz'?c.body.option_id===q.expected_option_id:q.accepted.includes(q.dictation_content==='example'?sentenceNormalize(c.body.answer):normalize(c.body.answer));
      if(c.body.skip===true)correct=false;
      row.state.review_snapshots??={};row.state.review_snapshots[q.id]=db.prepare('SELECT * FROM word_progress WHERE user_id=? AND word_id=?').get(c.user.id,q.word_id)||null;
      db.prepare('INSERT INTO study_answers(session_id,question_id,word_id,answer,correct,created_at) VALUES(?,?,?,?,?,?)').run(row.id,q.id,q.word_id,c.body.answer,Number(correct),now());
      const progress=applyReview(c.user.id,q.word_id,correct?4:1);
      let points=0;
      if(correct&&!db.prepare("SELECT 1 FROM activity WHERE user_id=? AND kind='word_correct' AND resource_id=? AND created_at>=?").get(c.user.id,String(q.word_id),now().slice(0,10))){points=10;const reward=db.prepare('INSERT INTO activity(user_id,kind,resource_id,points,created_at) VALUES(?,?,?,?,?)').run(c.user.id,'word_correct',String(q.word_id),points,now());row.state.rewards??={};row.state.rewards[q.id]=Number(reward.lastInsertRowid);}
      addRetry(row,q);
      row.state.cursor++;const completed=row.state.cursor===row.state.questions.length?now():null;
      db.prepare('UPDATE study_sessions SET state=?,updated_at=?,completed_at=? WHERE id=?').run(JSON.stringify(row.state),now(),completed,row.id);
      return {correct,expected:q.expected,progress,points,replayed:false,session:present(access(row.id,c.user))};
    }),{summary:'Grade an answer; retries are idempotent; update SRS and real points'});
    route('POST','/study/sessions/:id/answers/:question_id/correction',c=>transaction(db,()=>{
      const row=access(c.params.id,c.user),q=row.state.questions.find(item=>item.id===c.params.question_id);
      if(row.mode==='exam'||!q)fail(400,'INVALID_QUESTION','This answer cannot be self-corrected.');
      const answer=db.prepare('SELECT * FROM study_answers WHERE session_id=? AND question_id=?').get(row.id,q.id);
      if(!answer)fail(409,'ANSWER_REQUIRED','Submit the answer first.');
      row.state.corrections??={};
      if(row.state.corrections[q.id])return {correct:false,expected:q.expected,replayed:true,session:present(row)};
      if(!answer.correct) return {correct:false,expected:q.expected,replayed:true,session:present(row)};
      const last=db.prepare('SELECT question_id FROM study_answers WHERE session_id=? ORDER BY id DESC LIMIT 1').get(row.id);
      if(last.question_id!==q.id)fail(409,'CORRECTION_TOO_LATE','Only the most recent answer can be corrected.');
      const later=db.prepare('SELECT 1 FROM study_answers a JOIN study_sessions s ON a.session_id=s.id WHERE s.user_id=? AND a.word_id=? AND a.id>? LIMIT 1').get(c.user.id,q.word_id,answer.id);
      if(later)fail(409,'CORRECTION_TOO_LATE','This word has already been reviewed again.');
      if(!Object.hasOwn(row.state.review_snapshots||{},q.id))fail(409,'LEGACY_ANSWER','This older session does not retain the review snapshot required for safe correction.');
      const before=row.state.review_snapshots[q.id];
      if(before)db.prepare('UPDATE word_progress SET status=?,repetitions=?,interval_days=?,ease=?,due_at=?,last_reviewed_at=? WHERE user_id=? AND word_id=?').run(before.status,before.repetitions,before.interval_days,before.ease,before.due_at,before.last_reviewed_at,c.user.id,q.word_id);
      else {
        const starred=db.prepare('SELECT starred FROM word_progress WHERE user_id=? AND word_id=?').get(c.user.id,q.word_id)?.starred||0;
        db.prepare('DELETE FROM word_progress WHERE user_id=? AND word_id=?').run(c.user.id,q.word_id);
        if(starred)db.prepare("INSERT INTO word_progress(user_id,word_id,status,starred) VALUES(?,?,'new',1)").run(c.user.id,q.word_id);
      }
      const progress=applyReview(c.user.id,q.word_id,1);
      db.prepare('UPDATE study_answers SET correct=0 WHERE id=?').run(answer.id);
      if(row.state.rewards?.[q.id])db.prepare('DELETE FROM activity WHERE id=? AND user_id=?').run(row.state.rewards[q.id],c.user.id);
      row.state.corrections[q.id]={at:now(),from_correct:true};addRetry(row,q);
      db.prepare('INSERT INTO activity(user_id,kind,resource_id,points,created_at) VALUES(?,?,?,?,?)').run(c.user.id,'answer_self_correction',row.id+':'+q.id,0,now());
      const completed=row.state.cursor>=row.state.questions.length?now():null;
      db.prepare('UPDATE study_sessions SET state=?,updated_at=?,completed_at=? WHERE id=?').run(JSON.stringify(row.state),now(),completed,row.id);
      return {correct:false,expected:q.expected,progress,points:0,replayed:false,session:present(access(row.id,c.user))};
    }),{summary:'Mark the latest answer wrong once; repair SRS/reward and audit the correction'});
    route('GET','/study/sessions/:id/questions',c=>{
      const row=access(c.params.id,c.user);if(row.mode!=='exam')fail(409,'WRONG_MODE','Batch questions are available for exams only.');
      return {session:present(row),questions:row.state.questions.map(({expected,expected_option_id,accepted,...question})=>question)};
    },{summary:'Exam questions without answer keys, for the all-questions test screen'});
    route('POST','/study/sessions/:id/submit',c=>transaction(db,()=>{
      const row=access(c.params.id,c.user);if(row.mode!=='exam')fail(409,'WRONG_MODE','Batch submission is available for exams only.');
      if(row.completed_at)return {replayed:true,session:present(row),results:db.prepare('SELECT question_id,correct FROM study_answers WHERE session_id=? ORDER BY id').all(row.id)};
      const answers=c.body.answers;
      if(!Array.isArray(answers)||answers.length!==row.state.questions.length||new Set(answers.map(a=>a?.question_id)).size!==answers.length)fail(400,'INVALID_ANSWERS','Supply one answer for every question; use an empty string to skip.');
      const results=[];
      for(const q of row.state.questions){
        const answer=answers.find(a=>a?.question_id===q.id);if(!answer||typeof answer.answer!=='string'||answer.answer.length>4000)fail(400,'INVALID_ANSWERS','Unknown question ID or invalid answer.');
        const correct=q.type==='quiz'?answer.option_id===q.expected_option_id:q.accepted.includes(normalize(answer.answer));
        db.prepare('INSERT INTO study_answers(session_id,question_id,word_id,answer,correct,created_at) VALUES(?,?,?,?,?,?)').run(row.id,q.id,q.word_id,answer.answer,Number(correct),now());
        applyReview(c.user.id,q.word_id,correct?4:1);
        if(correct&&!db.prepare("SELECT 1 FROM activity WHERE user_id=? AND kind='word_correct' AND resource_id=? AND created_at>=?").get(c.user.id,String(q.word_id),now().slice(0,10)))db.prepare('INSERT INTO activity(user_id,kind,resource_id,points,created_at) VALUES(?,?,?,?,?)').run(c.user.id,'word_correct',String(q.word_id),10,now());
        results.push({question_id:q.id,correct,expected:q.expected});
      }
      row.state.cursor=row.state.questions.length;
      db.prepare('UPDATE study_sessions SET state=?,updated_at=?,completed_at=? WHERE id=?').run(JSON.stringify(row.state),now(),now(),row.id);
      return {replayed:false,session:present(access(row.id,c.user)),results};
    }),{summary:'Submit a complete exam atomically; server grades every answer once'});
    route('GET','/study/sessions/:id/match',c=>{const row=access(c.params.id,c.user);if(row.mode!=='match')fail(409,'WRONG_MODE','This is not a matching session.');return {terms:shuffle(row.state.questions.map(q=>({id:q.id,text:q.prompt}))),definitions:shuffle(row.state.questions.map(q=>({id:q.id,text:q.expected})))};},{summary:'Matching game pairs for a match session'});
    route('GET','/srs/summary',c=>summary(c.user,c.query.get('set_id'),c.query.get('path_id')),{summary:'Due counts, memory states, and a 14-day UTC forecast'});
    route('GET','/me/words',c=>{
      const {limit,offset}=pagination(c.query),params=[c.user.id,c.user.id,c.user.id];let where="p.user_id=? AND p.last_reviewed_at IS NOT NULL AND(s.visibility='public' OR s.owner_id=? OR EXISTS(SELECT 1 FROM assignments a JOIN class_members m ON a.class_id=m.class_id WHERE a.set_id=s.id AND m.user_id=?))";
      if(c.query.get('q')){where+=' AND(w.term LIKE ? OR w.definition LIKE ?)';params.push(`%${c.query.get('q').slice(0,200)}%`,`%${c.query.get('q').slice(0,200)}%`);}
      if(c.query.get('status')){where+=' AND p.status=?';params.push(enumeration(c.query.get('status'),'status',['new','learning','mastered']));}
      if(c.query.get('learning_language')){where+=' AND s.learning_language=?';params.push(c.query.get('learning_language'));}
      const total=db.prepare(`SELECT COUNT(*) n FROM word_progress p JOIN words w ON w.id=p.word_id JOIN study_sets s ON s.id=w.set_id WHERE ${where}`).get(...params).n;
      const items=db.prepare(`SELECT w.*,p.status,p.starred,p.repetitions,p.interval_days,p.ease,p.due_at,p.last_reviewed_at,s.title set_title,s.learning_language FROM word_progress p JOIN words w ON w.id=p.word_id JOIN study_sets s ON s.id=w.set_id WHERE ${where} ORDER BY p.last_reviewed_at DESC,w.id LIMIT ? OFFSET ?`).all(...params,limit,offset).map(r=>({...r,starred:!!r.starred,memory_level:memoryLevel(r)}));
      return {items,total,limit,offset};
    },{summary:'All vocabulary actually reviewed by this account, with memory-level metadata'});
    route('GET','/srs/queue',c=>{
      const {limit,offset}=pagination(c.query);const params=[c.user.id,now(),c.user.id,c.user.id];let where="p.user_id=? AND p.due_at<=? AND(s.visibility='public' OR s.owner_id=? OR EXISTS(SELECT 1 FROM assignments a JOIN class_members m ON a.class_id=m.class_id WHERE a.set_id=s.id AND m.user_id=?))";
      if(c.query.get('set_id')){content.setAccess(c.query.get('set_id'),c.user);where+=' AND w.set_id=?';params.push(Number(c.query.get('set_id')));}
      if(c.query.get('path_id')){content.pathAccess(c.query.get('path_id'),c.user);where+=' AND w.set_id IN(SELECT set_id FROM path_sets WHERE path_id=?)';params.push(Number(c.query.get('path_id')));}
      const total=db.prepare(`SELECT COUNT(*) n FROM word_progress p JOIN words w ON w.id=p.word_id JOIN study_sets s ON s.id=w.set_id WHERE ${where}`).get(...params).n;const cache=new Map();const items=db.prepare(`SELECT w.*,p.status,p.starred,p.repetitions,p.due_at,p.last_reviewed_at,p.interval_days,p.ease FROM word_progress p JOIN words w ON w.id=p.word_id JOIN study_sets s ON s.id=w.set_id WHERE ${where} ORDER BY p.due_at,w.id LIMIT ? OFFSET ?`).all(...params,limit,offset).map(row=>{if(!cache.has(row.set_id))cache.set(row.set_id,new Map(content.words(row.set_id,c.user).map(w=>[w.id,w])));return {...row,...cache.get(row.set_id).get(row.id)};});return {items,total,limit,offset};
    },{summary:'Paginated due review queue, optionally scoped to a set/path'});
    route('PATCH','/words/:id/progress',c=>{const id=integer(c.params.id,'word_id');const w=db.prepare('SELECT * FROM words WHERE id=?').get(id);if(!w)fail(404,'NOT_FOUND','Word not found.');content.setAccess(w.set_id,c.user);if(c.body.quality!==undefined){const quality=integer(c.body.quality,'quality',{min:1,max:5});return transaction(db,()=>{const old=db.prepare('SELECT last_reviewed_at FROM word_progress WHERE user_id=? AND word_id=?').get(c.user.id,id);if(Object.hasOwn(c.body,'expected_last_reviewed_at')&&c.body.expected_last_reviewed_at!==(old?.last_reviewed_at??null))fail(409,'REVIEW_CHANGED','Từ này vừa được ôn ở phiên khác. Hãy tải lại lịch ôn.');return applyReview(c.user.id,id,quality);});}const previous=db.prepare('SELECT * FROM word_progress WHERE user_id=? AND word_id=?').get(c.user.id,id);const status=enumeration(c.body.status,'status',['new','learning','mastered'],previous?.status??'new');const starred=c.body.starred===undefined?!!previous?.starred:boolean(c.body.starred,'starred');db.prepare(`INSERT INTO word_progress(user_id,word_id,status,starred) VALUES(?,?,?,?) ON CONFLICT(user_id,word_id) DO UPDATE SET status=excluded.status,starred=excluded.starred`).run(c.user.id,id,status,Number(starred));return db.prepare('SELECT * FROM word_progress WHERE user_id=? AND word_id=?').get(c.user.id,id);},{summary:'Persist star/manual memory status separately from graded reviews'});
    route('GET','/sets/:id/progress',c=>{const set=content.setAccess(c.params.id,c.user);const words=content.words(set.id,c.user);return {set_id:set.id,total:words.length,new:words.filter(w=>w.status==='new').length,learning:words.filter(w=>w.status==='learning').length,mastered:words.filter(w=>w.status==='mastered').length,words};},{summary:'Progress screen grouped into new/learning/mastered vocabulary'});
    route('POST','/sets/:id/progress/reset',c=>{const set=content.setAccess(c.params.id,c.user);if(c.body.confirm!==true)fail(400,'CONFIRM_REQUIRED','Set confirm=true to reset your progress.');db.prepare('DELETE FROM word_progress WHERE user_id=? AND word_id IN(SELECT id FROM words WHERE set_id=?)').run(c.user.id,set.id);return {reset:true};},{summary:'Explicitly reset only your progress in a set'});
  }
  function start(user,body) {
    const set=content.setAccess(body.set_id,user);
    if(set.content_status.startsWith('unavailable'))fail(409,'CONTENT_UNAVAILABLE','Bộ từ này đang được đối chiếu vì dữ liệu trùng hoặc sai chủ đề.');
    const mode=enumeration(body.mode,'mode',studyModes,'learn');const input=body.settings??{};
    const settings={shuffle:input.shuffle===undefined?false:boolean(input.shuffle,'shuffle'),starred_only:input.starred_only===undefined?false:boolean(input.starred_only,'starred_only'),unmastered_only:input.unmastered_only===undefined?false:boolean(input.unmastered_only,'unmastered_only'),due_only:input.due_only===undefined?false:boolean(input.due_only,'due_only'),direction:enumeration(input.direction,'direction',['term_to_definition','definition_to_term','both'],mode==='exam'?'definition_to_term':'term_to_definition'),answer_mode:enumeration(input.answer_mode,'answer_mode',['meaning','synonyms','speech'],'meaning'),dictation_content:enumeration(input.dictation_content,'dictation_content',['word','example'],'word'),adaptive:input.adaptive===undefined?mode==='learn':boolean(input.adaptive,'adaptive'),max_attempts:integer(input.max_attempts??3,'max_attempts',{max:5}),auto_audio:input.auto_audio===undefined?false:boolean(input.auto_audio,'auto_audio'),audio_rate:input.audio_rate??1,voice_uri:typeof input.voice_uri==='string'?input.voice_uri.slice(0,300):'',limit:integer(input.limit??100,'limit',{max:500})};
    if(typeof settings.audio_rate!=='number'||!Number.isFinite(settings.audio_rate)||settings.audio_rate<0.5||settings.audio_rate>1.5)fail(400,'VALIDATION_ERROR','audio_rate must be between 0.5 and 1.5.');
    settings.question_types=input.question_types??['write'];
    if(!Array.isArray(settings.question_types)||!settings.question_types.length||settings.question_types.length>2||new Set(settings.question_types).size!==settings.question_types.length||settings.question_types.some(type=>!['write','quiz'].includes(type)))fail(400,'VALIDATION_ERROR','question_types must select write, quiz, or both without duplicates.');
    settings.accept_synonyms=input.accept_synonyms===undefined?false:boolean(input.accept_synonyms,'accept_synonyms');
    settings.auto_advance_on_correct=input.auto_advance_on_correct===undefined?false:boolean(input.auto_advance_on_correct,'auto_advance_on_correct');
    settings.required_correct=mode==='learn'?integer(input.required_correct??1,'required_correct',{max:3}):1;
    if(settings.required_correct>settings.max_attempts)fail(400,'VALIDATION_ERROR','max_attempts must be at least required_correct.');
    if(settings.answer_mode==='speech'){settings.direction='definition_to_term';settings.question_types=['write'];}
    if(input.word_ids!==undefined){if(!Array.isArray(input.word_ids)||input.word_ids.length>500)fail(400,'VALIDATION_ERROR','word_ids must be an array of at most 500 IDs.');settings.word_ids=input.word_ids.map(id=>integer(id,'word_id'));const all=content.words(set.id,user).map(w=>w.id);if(new Set(settings.word_ids).size!==settings.word_ids.length||settings.word_ids.some(id=>!all.includes(id)))fail(400,'VALIDATION_ERROR','word_ids must belong to this set without duplicates.');}
    const questions=makeQuestions(content.words(set.id,user),mode,settings),id=randomUUID();
    db.prepare('INSERT INTO study_sessions(id,user_id,set_id,mode,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(id,user.id,set.id,mode,JSON.stringify({questions,cursor:0,settings}),now(),now());return present(access(id,user));
  }
  return {registerRoutes,access,present,summary,applyReview,start};
}
