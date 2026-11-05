import {randomUUID,createHash} from 'node:crypto';
import {toeicUnits,toeicPhases,toeicPronunciation} from './content/toeic-foundation.mjs';
import {toeicComprehension,toeicDialogues} from './content/toeic-foundation-comprehension.mjs';
import {toeicPartOfSpeech,toeicPosVersion} from './content/toeic-foundation-pos.mjs';
import {transaction} from './database.mjs';
import {fail,text,integer,enumeration,pagination} from './validation.mjs';
import {gradeWrittenVocabulary} from './vocabulary-grading.mjs';
import {scheduleReview} from './study.mjs';

export const TOEIC_ENGINE='toeic_foundation_v1';
const source='openlearn:toeic-foundation:v1',modules=['grammar','vocabulary','listening','reading'];
const stamp=()=>new Date().toISOString();
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const version=hash({toeicUnits,toeicPronunciation,toeicComprehension,toeicDialogues,toeicPosVersion,engine:TOEIC_ENGINE});
const shuffle=xs=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const sentence=x=>x.normalize('NFKC').toLowerCase().replace(/[‘’]/g,"'").replace(/\bi'm\b/g,'i am').replace(/\b(you|we|they)'re\b/g,'$1 are').replace(/\b(he|she|it)'s\b/g,'$1 is').replace(/\bdon't\b/g,'do not').replace(/\bdoesn't\b/g,'does not').replace(/\bdidn't\b/g,'did not').replace(/\bcan't\b/g,'cannot').replace(/[^\p{L}\p{N}' ]/gu,' ').replace(/\s+/g,' ').trim();
const choices=(answers,correct)=>({options:shuffle(answers.map((label,i)=>({id:String(i),text:label}))),correct_option_id:String(correct),expected:answers[correct]});
const catalog=()=>({id:'toeic-foundation',title:'TOEIC — Từ nền tảng',engine:TOEIC_ENGINE,content_version:version,phases:toeicPhases,
 total_units:40,total_checkpoints:8,vocabulary_items:540,unique_terms:new Set(toeicUnits.flatMap(u=>u.lex.map(w=>w[0].toLowerCase()))).size,
 modules:[...modules,'pronunciation'],core_modules:modules,assessment:'practice_not_score_prediction',audio:'client_tts',ai_required:false,
 description:'Xây lại nền tảng trước khi luyện các dạng bài TOEIC Listening & Reading. Tám chặng theo thứ tự, không phải thời hạn bắt buộc.',
 supplemental:{title:'Bộ từ TOEIC hiện có',href:'/learning-path/14',counts_toward_completion:false}});

// Additive, stable IDs. No learner progress, notes or owned collections are replaced.
function seedContent(db){
 if(db.prepare('SELECT content FROM course_lessons WHERE id IN (SELECT l.id FROM course_lessons l JOIN course_parts p ON p.id=l.part_id JOIN courses c ON c.id=p.course_id WHERE c.source=?) LIMIT 1').get(source)?.content?.includes(version))return;
 transaction(db,()=>{
  let course=db.prepare('SELECT id FROM courses WHERE source=? AND owner_id IS NULL').get(source);
  if(!course)course={id:Number(db.prepare("INSERT INTO courses(title,language,competence,visibility,source,created_at) VALUES(?,'en','TOEIC_FOUNDATION','public',?,?)").run(catalog().title,source,stamp()).lastInsertRowid)};
  for(const phase of toeicPhases.filter(p=>p.status==='implemented')){
   let part=db.prepare('SELECT id FROM course_parts WHERE course_id=? AND position=?').get(course.id,phase.id-1);
   if(!part)part={id:Number(db.prepare('INSERT INTO course_parts(course_id,title,position) VALUES(?,?,?)').run(course.id,phase.title,phase.id-1).lastInsertRowid)};
   const entries=toeicUnits.filter(u=>u.phase===phase.id).flatMap((u,i)=>[u,...((i+1)%5===0?[{id:'checkpoint-'+u.week,title:'Ôn tập chặng '+u.week,week:u.week,checkpoint:true}]:[])]);
   entries.forEach((u,position)=>{
    const content=JSON.stringify({origin:'toeic_foundation',toeic_unit_id:u.id,content_version:version,week:u.week,checkpoint:!!u.checkpoint,questions:[]});
    const old=db.prepare("SELECT id FROM course_lessons WHERE part_id=? AND json_extract(content,'$.toeic_unit_id')=?").get(part.id,u.id);
    if(old)db.prepare("UPDATE course_lessons SET title=?,position=?,content=?,content_status='complete' WHERE id=?").run(u.title,position,content,old.id);
    else db.prepare("INSERT INTO course_lessons(part_id,title,position,content,content_status) VALUES(?,?,?,?,'complete')").run(part.id,u.title,position,content);
    if(u.checkpoint)return;
    let set=db.prepare('SELECT id FROM study_sets WHERE source=? AND owner_id IS NULL').get(source+':'+u.id);
    if(!set)set={id:Number(db.prepare("INSERT INTO study_sets(title,description,learning_language,native_language,visibility,tag,source,created_at,updated_at) VALUES(?,?,'en','vi','public','toeic-foundation',?,?,?)").run(u.title,'Từ vựng thuộc khóa TOEIC — Từ nền tảng. Ví dụ và giải thích xem trong bài học.',source+':'+u.id,stamp(),stamp()).lastInsertRowid)};
    u.lex.forEach(([term,vi],i)=>{
     const oldWord=db.prepare('SELECT id FROM words WHERE set_id=? AND term=?').get(set.id,term);
     // POS follows the authored context. IPA/examples are never guessed from spelling.
     const pos=toeicPartOfSpeech(u.id,term);
     if(oldWord)db.prepare('UPDATE words SET definition=?,part_of_speech=?,position=? WHERE id=?').run(vi,pos,i,oldWord.id);
     else db.prepare('INSERT INTO words(set_id,term,definition,part_of_speech,position) VALUES(?,?,?,?,?)').run(set.id,term,vi,pos,i);
    });
   });
  }
 });
}

export function toeicFoundationService(db,{seed=true}={}){
 if(seed)seedContent(db);
 function lesson(id){const row=db.prepare("SELECT l.* FROM course_lessons l JOIN course_parts p ON p.id=l.part_id JOIN courses c ON c.id=p.course_id WHERE c.source=? AND json_extract(l.content,'$.toeic_unit_id')=?").get(source,id);if(!row)fail(404,'NOT_FOUND','Không tìm thấy bài TOEIC.');return row;}
 function unit(id){const u=toeicUnits.find(u=>u.id===id);if(!u)fail(404,'NOT_FOUND','Không tìm thấy bài TOEIC.');return u;}
 function words(u){return db.prepare('SELECT w.id,w.term,w.definition,w.part_of_speech,w.phonetic FROM words w JOIN study_sets s ON s.id=w.set_id WHERE s.source=? ORDER BY w.position').all(source+':'+u.id);}
 function settings(user){return JSON.parse(db.prepare('SELECT settings FROM users WHERE id=?').get(user.id).settings).toeic_foundation??{enrolled_at:null,daily_minutes:60,new_words_per_day:10,target_score:null};}
 function sessions(user){
  // Roadmap reads metadata only, not every historical question/answer bank.
  return db.prepare("SELECT id,lesson_id,user_id,updated_at,completed_at,json_extract(state,'$.unit_id') unit_id,json_extract(state,'$.module') module,json_extract(state,'$.content_version') content_version,json_extract(state,'$.revision') revision,json_extract(state,'$.outcome') outcome FROM course_learning_sessions WHERE user_id=? AND json_extract(state,'$.engine')=? ORDER BY updated_at DESC,id").all(user.id,TOEIC_ENGINE).map(r=>({...r,s:{unit_id:r.unit_id,module:r.module,content_version:r.content_version,revision:r.revision,outcome:r.outcome}}));
 }
 function roadmap(user){
  const history=sessions(user),profile=settings(user);let unlocked=!!profile.enrolled_at;
  const items=[];
  for(let week=1;week<=8;week++){
   for(const u of toeicUnits.filter(u=>u.week===week)){
    const completed=modules.filter(m=>history.some(r=>r.s.unit_id===u.id&&r.s.module===m&&r.completed_at&&r.s.outcome==='passed'));
    const active=history.filter(r=>r.s.unit_id===u.id&&!r.completed_at&&r.s.content_version===version);
    const done=completed.length===modules.length;
    items.push({id:u.id,title:u.title,phase:u.phase,week,vocabulary_items:u.lex.length,core_modules:modules,completed_modules:completed,
     status:done?'completed':unlocked?(active.length?'in_progress':'available'):'locked',unlocked:unlocked||done,
     active_sessions:active.map(r=>({id:r.id,module:r.s.module,revision:r.s.revision})),optional_modules:['pronunciation']});
    unlocked=unlocked&&done;
   }
   const id='checkpoint-'+week,passed=history.some(r=>r.s.unit_id===id&&r.completed_at&&r.s.outcome==='passed');
   const active=history.find(r=>r.s.unit_id===id&&!r.completed_at&&r.s.content_version===version);
   const last=history.find(r=>r.s.unit_id===id&&r.completed_at&&r.s.content_version===version);
   items.push({id,title:'Ôn tập chặng '+week,phase:week<=4?1:2,week,checkpoint:true,status:passed?'completed':!unlocked?'locked':active?'in_progress':last?'needs_review':'available',unlocked:unlocked||passed,session_id:active?.id??null,pass_ratio:.8});
   unlocked=unlocked&&passed;
  }
  return {course:catalog(),profile,items,completed_units:items.filter(x=>!x.checkpoint&&x.status==='completed').length,next:items.find(x=>x.unlocked&&x.status!=='completed')??null};
 }
 function vocabularyTask(u,w,write=false){
  if(write)return {type:'vocabulary_write',prompt:'Viết nghĩa tiếng Việt của “'+w.term+'”. Có thể đổi thứ tự các nghĩa.',expected:w.definition,word_id:w.id,english:w.term,explanation:w.term+' — '+w.definition};
  const answers=[w.definition,...shuffle([...new Set(u.lex.map(x=>x[1]))].filter(x=>x!==w.definition)).slice(0,3)];
  return {type:'choice',prompt:'Chọn nghĩa của “'+w.term+'”.',english:w.term,word_id:w.id,...choices(answers,0),explanation:w.term+' — '+w.definition};
 }
 const grammarTask=u=>({type:'choice',passage:u.pairs.map(p=>p[0]).join(' '),prompt:u.question,...choices(u.options,u.correct),explanation:u.explanation});
 const comprehensionTask=(u,listening=false)=>{
  const q=toeicComprehension[u.id],passage=u.pairs.map(p=>p[0]).join(' ');
  return {type:listening?'listen_choice':'choice',...(listening?{speech_text:passage}:{passage}),prompt:q.prompt,...choices(q.options,0),explanation:q.options[0]+' — Đối chiếu các câu đã học: '+passage};
 };
 const readingTask=(u,index)=>({type:'choice',passage:u.pairs.map(p=>p[0]).join(' '),prompt:'Trong đoạn trên, câu “'+u.pairs[index][0]+'” có nghĩa gì?',...choices(u.pairs.map(p=>p[1]),index),explanation:u.pairs[index].join(' — ')});
 const listeningTask=(u,index)=>({type:'dictation',prompt:'Nghe và viết câu tiếng Anh. Có thể nghe lại trước khi trả lời.',speech_text:u.pairs[index][0],expected:u.pairs[index][0],explanation:u.pairs[index].join(' — ')});
 function build(id,module){
  let tasks=[];
  if(module==='checkpoint'){
   const week=Number(id.split('-')[1]);
   for(const u of toeicUnits.filter(u=>u.week===week)){
    const w=shuffle(words(u))[0],index=Math.floor(Math.random()*u.pairs.length);
    tasks.push(grammarTask(u),vocabularyTask(u,w),comprehensionTask(u),listeningTask(u,index));
   }
   tasks=shuffle(tasks);
  }else{
   const u=unit(id);
   if(module==='vocabulary'){
    const list=shuffle(words(u));
    tasks.push(...list.map(w=>vocabularyTask(u,w)),...shuffle(list).map(w=>vocabularyTask(u,w,true)));
   }else if(module==='grammar'){
    tasks.push(grammarTask(u),...u.pairs.map(([en,vi])=>({type:'arrange',prompt:'Sắp xếp câu mang nghĩa: '+vi,tokens:shuffle(en.split(/\s+/).map((text,i)=>({id:String(i),text}))),expected:en,explanation:en+' — '+vi})));
   }else if(module==='listening'){
    tasks=[comprehensionTask(u,true),...u.pairs.map((_,i)=>listeningTask(u,i))];
    if(Number(u.id.split('-')[1])%5===0)tasks.push(...toeicDialogues.find(d=>d.week===u.week).turns.map(([speaker,en,vi])=>({type:'dictation',prompt:'Hội thoại ngắn — nghe lượt '+speaker+' rồi viết câu tiếng Anh.',speech_text:en,expected:en,explanation:en+' — '+vi})));
   }
   else if(module==='reading')tasks=[comprehensionTask(u),...u.pairs.map((_,i)=>readingTask(u,i))];
   else{
    const guide=toeicPronunciation.find(g=>g.week===u.week);
    tasks=guide.pairs.map((p,i)=>({type:'listen_choice',prompt:'Nghe rồi chọn từ / cụm vừa nghe.',speech_text:p[0],...choices(guide.pairs.map(p=>p[0]),i),explanation:p.join(' — ')}));
   }
  }
  return {engine:TOEIC_ENGINE,content_version:version,unit_id:id,module,tasks:tasks.map((t,i)=>({...t,id:String(i+1)})),index:0,revision:0,completed:{},pending:null,assisted:false,first_correct:0,attempts:0,base_total:tasks.length,outcome:null,srs_applied:{},errors:[]};
 }
 function owned(id,user){
  const row=db.prepare('SELECT * FROM course_learning_sessions WHERE id=? AND user_id=?').get(id,user.id);if(!row)fail(404,'NOT_FOUND','Không tìm thấy phiên học của bạn.');
  const s=JSON.parse(row.state);if(s.engine!==TOEIC_ENGINE)fail(409,'WRONG_ENGINE','Dùng API đúng chế độ học.');
  if(s.content_version!==version)fail(409,'CONTENT_CHANGED','Nội dung đã cập nhật. Bắt đầu lượt mới; lịch sử cũ vẫn được giữ.');
  return {row,s};
 }
 function view(row,s){
  const task=s.tasks[s.index];let current=null;
  if(task){const {expected,correct_option_id,explanation,speech_text,...safe}=task;current={...safe,can_listen:!!(speech_text||task.english),assisted:s.assisted};}
  return {id:row.id,engine:TOEIC_ENGINE,unit_id:s.unit_id,module:s.module,content_version:version,revision:s.revision,status:row.completed_at?s.outcome:'active',
   current,feedback:s.pending,index:s.index,total:s.tasks.length,base_total:s.base_total,completed_questions:Object.keys(s.completed).length,
   first_correct:s.first_correct,first_attempt_ratio:s.first_correct/s.base_total,attempts:s.attempts,completed_at:row.completed_at??null,
   pass_ratio:s.module==='checkpoint'?.8:null,mastery_label:'module_completed_not_long_term_retention'};
 }
 function save(row,s){
  s.revision++;const now=stamp();
  if(s.index===s.tasks.length){row.completed_at=now;s.outcome=s.module==='checkpoint'&&s.first_correct<Math.ceil(.8*s.base_total)?'needs_review':'passed';}
  db.prepare('UPDATE course_learning_sessions SET state=?,updated_at=?,completed_at=? WHERE id=?').run(JSON.stringify(s),now,row.completed_at??null,row.id);
 }
 function checkRevision(s,body){if(body.revision!==s.revision)fail(409,'STALE_REVISION','Phiên học đã đổi. Tải lại trước khi thao tác.');}
 function reviewWord(userId,wordId,quality){
  const old=db.prepare('SELECT * FROM word_progress WHERE user_id=? AND word_id=?').get(userId,wordId);
  const p=scheduleReview(old,quality,new Date(Math.max(Date.now(),(Date.parse(old?.last_reviewed_at??'')||0)+1)));
  db.prepare('INSERT INTO word_progress(user_id,word_id,status,repetitions,interval_days,ease,due_at,last_reviewed_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id,word_id) DO UPDATE SET status=excluded.status,repetitions=excluded.repetitions,interval_days=excluded.interval_days,ease=excluded.ease,due_at=excluded.due_at,last_reviewed_at=excluded.last_reviewed_at').run(userId,wordId,p.status,p.repetitions,p.interval_days,p.ease,p.due_at,p.last_reviewed_at);
 }
 function start(c,id,module){return transaction(db,()=>{
  const map=roadmap(c.user),item=map.items.find(x=>x.id===id);if(!item)fail(404,'NOT_FOUND','Không tìm thấy bài.');
  if(!map.profile.enrolled_at)fail(409,'ENROLL_REQUIRED','Bắt đầu khóa TOEIC trước.');
  if(!item.unlocked)fail(409,'UNIT_LOCKED','Hoàn thành các phần bắt buộc và ôn tập của chặng trước.');
  lesson(id);
  if(c.body.resume!==false){const previous=sessions(c.user).find(r=>r.s.unit_id===id&&r.s.module===module&&!r.completed_at&&r.s.content_version===version);if(previous){const v=owned(previous.id,c.user);return view(v.row,v.s);}}
  const s=build(id,module),now=stamp(),row={id:randomUUID(),user_id:c.user.id,lesson_id:lesson(id).id,completed_at:null};
  db.prepare('INSERT INTO course_learning_sessions VALUES(?,?,?,?,?,?,?)').run(row.id,row.user_id,row.lesson_id,JSON.stringify(s),now,now,null);c.status=201;return view(row,s);
 });}
 function registerRoutes(route){
  route('GET','/toeic-foundation',()=>catalog(),{public:true,summary:'TOEIC foundation curriculum: phases 1–2, authored content, no predicted test score'});
  route('GET','/toeic-foundation/roadmap',c=>roadmap(c.user),{summary:'Own TOEIC modules, prerequisites and recommended next unit'});
  route('GET','/toeic-foundation/today',c=>{
   const map=roadmap(c.user),due=db.prepare("SELECT count(*) n FROM word_progress wp JOIN words w ON w.id=wp.word_id JOIN study_sets s ON s.id=w.set_id WHERE wp.user_id=? AND s.source LIKE ? AND wp.due_at<=?").get(c.user.id,source+':%',stamp()).n;
   const next=map.next,module=next?.checkpoint?'checkpoint':next?modules.find(m=>!next.completed_modules.includes(m)):null;
   return {profile:map.profile,next:next?{...next,recommended_module:module}:null,due_words:due,completed_units:map.completed_units,total_units:40,
    suggested_minutes:{review:Math.round(map.profile.daily_minutes*.2),next_unit:Math.round(map.profile.daily_minutes*.6),listening:map.profile.daily_minutes-Math.round(map.profile.daily_minutes*.2)-Math.round(map.profile.daily_minutes*.6)},calendar_deadline:null};
  },{summary:'One next action, flexible time budget and TOEIC-specific due words'});
  route('POST','/toeic-foundation/enroll',c=>transaction(db,()=>{
   const all=JSON.parse(db.prepare('SELECT settings FROM users WHERE id=?').get(c.user.id).settings),old=settings(c.user);
   all.toeic_foundation={...old,enrolled_at:old.enrolled_at??stamp()};db.prepare('UPDATE users SET settings=? WHERE id=?').run(JSON.stringify(all),c.user.id);return all.toeic_foundation;
  }),{summary:'Opt in to TOEIC foundation without resetting any earlier progress'});
  route('PUT','/toeic-foundation/profile',c=>transaction(db,()=>{
   const allowed=['daily_minutes','new_words_per_day','target_score'];if(Object.keys(c.body).some(k=>!allowed.includes(k)))fail(400,'VALIDATION_ERROR','Có trường thiết lập không được hỗ trợ.');
   const all=JSON.parse(db.prepare('SELECT settings FROM users WHERE id=?').get(c.user.id).settings),p=settings(c.user);
   if(c.body.daily_minutes!==undefined)p.daily_minutes=enumeration(c.body.daily_minutes,'daily_minutes',[30,45,60,90,120]);
   if(c.body.new_words_per_day!==undefined)p.new_words_per_day=integer(c.body.new_words_per_day,'new_words_per_day',{min:10,max:15});
   if(c.body.target_score!==undefined)p.target_score=c.body.target_score===null?null:integer(c.body.target_score,'target_score',{min:10,max:990});
   all.toeic_foundation=p;db.prepare('UPDATE users SET settings=? WHERE id=?').run(JSON.stringify(all),c.user.id);return p;
  }),{summary:'Change own TOEIC study preferences; preserve completed work and other user settings'});
  route('GET','/toeic-foundation/units/:id',c=>{
   const u=unit(c.params.id);return {id:u.id,title:u.title,phase:u.phase,week:u.week,rule:u.rule,vocabulary:words(u),phrases:u.pairs.map(([english,vietnamese])=>({english,vietnamese})),dialogue:Number(u.id.split('-')[1])%5===0?toeicDialogues.find(d=>d.week===u.week):null,pronunciation:toeicPronunciation.find(g=>g.week===u.week),core_modules:modules,optional_modules:['pronunciation'],preview:true};
  },{summary:'Bilingual TOEIC teaching material; no assessment answer bank'});
  route('GET','/toeic-foundation/vocabulary',c=>{
   const {limit,offset}=pagination(c.query),phase=c.query.get('phase'),week=c.query.get('week'),due=c.query.get('due');
   if(phase!==null)integer(phase,'phase',{max:2});if(week!==null)integer(week,'week',{max:8});if(due!==null&&due!=='true')fail(400,'VALIDATION_ERROR','due chỉ nhận true.');
   const selected=toeicUnits.filter(u=>(phase===null||u.phase===Number(phase))&&(week===null||u.week===Number(week)));
   if(!selected.length)return {items:[],total:0,limit,offset};
   const from=' FROM words w JOIN study_sets s ON s.id=w.set_id LEFT JOIN word_progress wp ON wp.word_id=w.id AND wp.user_id=? WHERE s.source IN ('+selected.map(()=>'?').join(',')+')'+(due?' AND wp.due_at<=?':'');
   const args=[c.user.id,...selected.map(u=>source+':'+u.id),...(due?[stamp()]:[])];
   const total=db.prepare('SELECT count(*) n'+from).get(...args).n;
   const rows=db.prepare('SELECT w.id,w.term,w.definition,w.part_of_speech,w.phonetic,s.source,wp.status,wp.due_at,wp.repetitions'+from+' ORDER BY s.source,w.position,w.id LIMIT ? OFFSET ?').all(...args,limit,offset);
   const items=rows.map(({source:setSource,status,due_at,repetitions,...w})=>{const u=unit(setSource.slice((source+':').length));return {...w,unit_id:u.id,phase:u.phase,week:u.week,progress:{status:status??'new',due_at:due_at??null,repetitions:repetitions??0}};});
   return {items,total,limit,offset};
  },{summary:'Paginated TOEIC vocabulary with own SRS state; filter phase, week or due=true'});
  route('POST','/toeic-foundation/units/:id/sessions',c=>start(c,c.params.id,enumeration(c.body.module,'module',[...modules,'pronunciation'])),{summary:'Start/resume an unlocked TOEIC module; server controls all learning state'});
  route('POST','/toeic-foundation/checkpoints/:week/sessions',c=>start(c,'checkpoint-'+integer(c.params.week,'week',{max:8}),'checkpoint'),{summary:'Weekly 20-question checkpoint; 80% first-pass plus error remediation required'});
  route('GET','/toeic-foundation/sessions/:id',c=>{const {row,s}=owned(c.params.id,c.user);return view(row,s);},{summary:'Own resumable TOEIC current question and pending feedback only'});
  route('POST','/toeic-foundation/review/sessions',c=>transaction(db,()=>{
   if(!settings(c.user).enrolled_at)fail(409,'ENROLL_REQUIRED','Bắt đầu khóa TOEIC trước.');
   if(c.body.resume!==false){const previous=sessions(c.user).find(r=>r.s.module==='review'&&!r.completed_at&&r.s.content_version===version);if(previous){const v=owned(previous.id,c.user);return view(v.row,v.s);}}
   const limit=integer(c.body.limit??20,'limit',{max:30});
   const due=db.prepare("SELECT w.id,w.term,w.definition,s.source FROM word_progress wp JOIN words w ON w.id=wp.word_id JOIN study_sets s ON s.id=w.set_id WHERE wp.user_id=? AND s.source LIKE ? AND wp.due_at<=? ORDER BY wp.due_at,w.id LIMIT ?").all(c.user.id,source+':%',stamp(),limit);
   if(!due.length)fail(409,'NO_DUE_WORDS','Chưa có từ TOEIC đến hạn. Có thể luyện lại bài đã mở.');
   const first=unit(due[0].source.slice((source+':').length));
   const s={engine:TOEIC_ENGINE,content_version:version,unit_id:'review',module:'review',tasks:shuffle(due).map((w,i)=>({...vocabularyTask(first,w,true),id:String(i+1)})),index:0,revision:0,completed:{},pending:null,assisted:false,first_correct:0,attempts:0,base_total:due.length,outcome:null,srs_applied:{},errors:[]};
   const now=stamp(),row={id:randomUUID(),user_id:c.user.id,lesson_id:lesson(first.id).id,completed_at:null};
   db.prepare('INSERT INTO course_learning_sessions VALUES(?,?,?,?,?,?,?)').run(row.id,row.user_id,row.lesson_id,JSON.stringify(s),now,now,null);c.status=201;return view(row,s);
  }),{summary:'Owned TOEIC due-word review, maximum 30, with normal SRS and no course-unlock credit'});
  route('POST','/toeic-foundation/sessions/:id/listen',c=>{
   const {row,s}=owned(c.params.id,c.user);checkRevision(s,c.body);if(row.completed_at)fail(409,'SESSION_COMPLETED','Phiên học đã kết thúc.');
   const task=s.tasks[s.index],speech=task.speech_text??task.english;if(!speech)fail(409,'NO_AUDIO','Bước này không có âm thanh.');
   return {text:speech,lang:'en-US',audio_source:'client_tts',assessment:'not_pronunciation_scoring'};
  },{summary:'Current English TTS text only; does not move or grade the session'});
  route('POST','/toeic-foundation/sessions/:id/help',c=>transaction(db,()=>{
   const {row,s}=owned(c.params.id,c.user);checkRevision(s,c.body);if(row.completed_at||s.pending)fail(409,'STEP_FINISHED','Bước đã trả lời hoặc phiên đã kết thúc.');
   s.assisted=true;const t=s.tasks[s.index];save(row,s);return {...view(row,s),help:{answer:t.expected,explanation:t.explanation,requires_unassisted_retry:true}};
  }),{summary:'Reveal current explanation; assisted answers must be retried without help'});
  route('POST','/toeic-foundation/sessions/:id/answer',c=>transaction(db,()=>{
   const {row,s}=owned(c.params.id,c.user);checkRevision(s,c.body);if(row.completed_at)fail(409,'SESSION_COMPLETED','Phiên học đã kết thúc.');
   const t=s.tasks[s.index],key=t.retry_of??t.id;
   if(c.body.action==='continue'){
    if(!s.pending)fail(409,'ANSWER_REQUIRED','Trả lời trước khi tiếp tục.');
    if(s.pending.correct&&!s.pending.assisted)s.completed[key]=true;
    else{if(s.tasks.length>=500)fail(409,'RETRY_LIMIT','Hãy xem lại bài và bắt đầu lượt luyện mới.');s.tasks.push({...t,id:randomUUID(),retry_of:key});}
    s.index++;s.pending=null;s.assisted=false;save(row,s);return view(row,s);
   }
   if(s.pending)fail(409,'FEEDBACK_PENDING','Đọc nhận xét rồi bấm Tiếp tục.');
   let correct=false,verdict='incorrect';
   if(t.options){const selected=text(c.body.option_id,'option_id',{max:30});if(!t.options.some(o=>o.id===selected))fail(400,'INVALID_OPTION','Lựa chọn không hợp lệ.');correct=selected===t.correct_option_id;}
   else if(t.type==='arrange'){
    if(!Array.isArray(c.body.token_ids)||c.body.token_ids.length!==t.tokens.length||new Set(c.body.token_ids).size!==t.tokens.length||c.body.token_ids.some(id=>!t.tokens.some(x=>x.id===id)))fail(400,'INVALID_TOKENS','Phải dùng mỗi mảnh câu đúng một lần.');
    correct=sentence(c.body.token_ids.map(id=>t.tokens.find(x=>x.id===id).text).join(' '))===sentence(t.expected);
   }else{
    const answer=text(c.body.answer,'answer',{max:2000});
    if(t.type==='vocabulary_write'){const grade=gradeWrittenVocabulary({expected:t.expected,answer_language:'vi'},answer);correct=grade.correct;verdict=grade.verdict;}
    else correct=sentence(answer)===sentence(t.expected);
   }
   if(verdict==='incorrect'&&correct)verdict='correct';
   s.attempts++;if(!t.retry_of&&correct&&!s.assisted)s.first_correct++;
   s.pending={correct,verdict,assisted:s.assisted,expected:t.expected,explanation:t.explanation,requires_retry:!correct||s.assisted};
   if(!correct||s.assisted)s.errors.push({task_id:key,type:t.type,prompt:t.prompt,word_id:t.word_id??null});
   // Only productive, unassisted vocabulary checks update global retention, once per base task.
   if(t.type==='vocabulary_write'&&!s.assisted&&!s.srs_applied[key]){reviewWord(c.user.id,t.word_id,correct?4:1);s.srs_applied[key]=true;}
   save(row,s);return view(row,s);
  }),{summary:'Grade one current response atomically, persist feedback and retry mistakes; guard stale revision'});
  route('GET','/toeic-foundation/mistakes',c=>{
   const {limit,offset}=pagination(c.query);
   const from=" FROM course_learning_sessions s,json_each(s.state,'$.errors') e WHERE s.user_id=? AND json_extract(s.state,'$.engine')=?";
   const total=db.prepare('SELECT count(*) n'+from).get(c.user.id,TOEIC_ENGINE).n;
   const items=db.prepare("SELECT s.id session_id,json_extract(s.state,'$.unit_id') unit_id,json_extract(s.state,'$.module') module,e.value error,json_extract(s.state,'$.completed') completed"+from+' ORDER BY s.updated_at DESC,s.id,e.key LIMIT ? OFFSET ?').all(c.user.id,TOEIC_ENGINE,limit,offset).map(r=>{const e=JSON.parse(r.error);return {...e,unit_id:r.unit_id,module:r.module,session_id:r.session_id,resolved:!!JSON.parse(r.completed)[e.task_id]};});
   return {items,total,limit,offset};
  },{summary:'Own TOEIC learning mistakes and remediation state; no other learner data'});
 }
 return {registerRoutes};
}
