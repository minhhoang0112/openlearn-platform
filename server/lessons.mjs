import { fail,integer,list,text } from './validation.mjs';
const stepNames=['Thẻ từ & Phát âm','Học nhớ từ','Nghe chép từ/cụm từ','Luyện nói AI','Hội thoại AI'];
const tokens=value=>value.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
function hasTerm(transcript,term){const source=tokens(transcript),target=tokens(term);return target.length>0&&source.some((_,i)=>target.every((token,j)=>source[i+j]===token));}
export function lessonService(db,content,study,aiConfigured) {
  function lesson(setId,index,user) {
    const set=content.setAccess(setId,user),all=content.words(set.id,user);
    const lessonIndex=integer(index,'lesson_index',{min:1,max:1000});
    const words=all.slice((lessonIndex-1)*5,lessonIndex*5);
    if(!words.length)fail(404,'NOT_FOUND','Lesson not found.');
    const complete=db.prepare('SELECT step_index,evidence,completed_at FROM comprehensive_progress WHERE user_id=? AND set_id=? AND lesson_index=?').all(user.id,set.id,lessonIndex).filter(row=>{const ids=JSON.parse(row.evidence).word_ids;return !ids||ids.length===words.length&&words.every(w=>ids.includes(w.id));});
    const ready=typeof aiConfigured==='function'?aiConfigured(user):!!aiConfigured;
    return {set_id:set.id,lesson_index:lessonIndex,word_count:words.length,words,reviewed_words:words.filter(w=>w.last_reviewed_at).length,mastered_words:words.filter(w=>w.status==='mastered').length,missing_example_ids:words.filter(w=>!w.example.trim()).map(w=>w.id),missing_translation_ids:words.filter(w=>w.example.trim()&&!w.example_translation?.trim()).map(w=>w.id),steps:stepNames.map((name,i)=>({index:i+1,name,completed:complete.some(s=>s.step_index===i+1),completed_at:complete.find(s=>s.step_index===i+1)?.completed_at??null,available:true,requires_ai:i>=3,ai_configured:i>=3?ready:null,srs_effect:i<3?'study_answers':'none'})),completed_steps:complete.length,completed:complete.length===5};
  }
  function registerRoutes(route) {
    route('GET','/sets/:id/lessons',c=>{
      const set=content.setAccess(c.params.id,c.user);const words=content.words(set.id,c.user);
      return {set_id:set.id,words_per_lesson:5,total_words:words.length,step_names:stepNames,lessons:Array.from({length:Math.ceil(words.length/5)},(_,i)=>{const l=lesson(set.id,i+1,c.user);return {index:i+1,word_ids:l.words.map(w=>w.id),terms:l.words.map(w=>w.term),word_count:l.word_count,reviewed_words:l.reviewed_words,mastered_words:l.mastered_words,completed_steps:l.completed_steps,total_steps:5,state:l.completed?'completed':l.completed_steps>0||l.reviewed_words>0?'in_progress':'not_started',completed:l.completed};})};
    },{summary:'Observed comprehensive plan: five words per lesson, five named steps'});
    route('GET','/sets/:id/lessons/:lesson_index',c=>lesson(c.params.id,c.params.lesson_index,c.user),{summary:'Lesson words, step progress, and provider availability'});
    route('POST','/sets/:id/lessons/:lesson_index/steps/:step_index/start',c=>{
      const l=lesson(c.params.id,c.params.lesson_index,c.user),step=integer(c.params.step_index,'step_index',{max:5});
      if(step>=4){if(!(typeof aiConfigured==='function'?aiConfigured(c.user):aiConfigured))fail(503,'AI_NOT_CONFIGURED','Kết nối AI trong Cài đặt AI để luyện nói và hội thoại.');return {set_id:l.set_id,lesson_index:l.lesson_index,step_index:step,word_ids:l.words.map(w=>w.id),terms:l.words.map(w=>w.term),requires_ai:true,srs_effect:'none',action:step===4?'speaking':'conversation'};}
      const mode=['flashcard','learn','dictation'][step-1];
      if(c.body.resume!==undefined&&typeof c.body.resume!=='boolean')fail(400,'VALIDATION_ERROR','resume must be boolean.');
      let session;
      if(c.body.resume!==false){const rows=db.prepare('SELECT id FROM study_sessions WHERE user_id=? AND set_id=? AND mode=? ORDER BY updated_at DESC,rowid DESC LIMIT 100').all(c.user.id,l.set_id,mode);for(const row of rows){const existing=study.access(row.id,c.user),ids=[...new Set(existing.state.questions.map(q=>q.word_id))];if(ids.length===l.words.length&&l.words.every(w=>ids.includes(w.id))){session=study.present(existing);break;}}}
      session??=study.start(c.user,{set_id:l.set_id,mode,settings:{word_ids:l.words.map(w=>w.id),limit:5}});
      return {lesson_index:l.lesson_index,step_index:step,session,requires_ai:false,resumable:true,variant:step===3?'word_dictation':'standard'};
    },{summary:'Start a lesson step with a validated five-word subset'});
    route('POST','/sets/:id/lessons/:lesson_index/steps/:step_index/complete',c=>{
      const l=lesson(c.params.id,c.params.lesson_index,c.user),step=integer(c.params.step_index,'step_index',{max:5});
      let evidence;
      if(step<=3){
        const session=study.access(text(c.body.session_id,'session_id',{max:100}),c.user);
        const ids=[...new Set(session.state.questions.map(q=>q.word_id))];
        if(!session.completed_at||session.set_id!==l.set_id||session.mode!==['flashcard','learn','dictation'][step-1]||ids.length!==l.words.length||l.words.some(w=>!ids.includes(w.id)))fail(409,'INVALID_STEP_EVIDENCE','Provide a completed matching session for exactly these lesson words.');
        evidence={session_id:session.id};
      }else if(step===4){
        const ids=list(c.body.feedback_ids,'feedback_ids',100);
        const transcripts=ids.map(id=>{const row=db.prepare("SELECT content FROM generated_content WHERE id=? AND user_id=? AND set_id=? AND kind='speaking_feedback'").get(text(id,'feedback_id',{max:100}),c.user.id,l.set_id);if(!row)fail(400,'INVALID_STEP_EVIDENCE','Speaking feedback must belong to this account and set.');return JSON.parse(row.content)._submission_transcript||'';}).join(' ').toLowerCase();
        if(l.words.some(w=>!hasTerm(transcripts,w.term)))fail(409,'TARGET_WORDS_MISSING','Speaking attempts must use all target terms.');evidence={feedback_ids:ids};
      }else{
        const id=text(c.body.conversation_id,'conversation_id',{max:100});const convo=db.prepare('SELECT * FROM conversations WHERE id=? AND user_id=? AND set_id=?').get(id,c.user.id,l.set_id);if(!convo)fail(400,'INVALID_STEP_EVIDENCE','Conversation must belong to this account and set.');
        const transcript=db.prepare("SELECT content FROM messages WHERE conversation_id=? AND role='user'").all(id).map(r=>r.content).join(' ').toLowerCase();
        if(l.words.some(w=>!hasTerm(transcript,w.term)))fail(409,'TARGET_WORDS_MISSING','Use every lesson term in your conversation.');evidence={conversation_id:id};
      }
      evidence.word_ids=l.words.map(w=>w.id);
      db.prepare('INSERT INTO comprehensive_progress VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,set_id,lesson_index,step_index) DO UPDATE SET evidence=excluded.evidence,completed_at=excluded.completed_at WHERE comprehensive_progress.evidence<>excluded.evidence').run(c.user.id,l.set_id,l.lesson_index,step,JSON.stringify(evidence),new Date().toISOString());
      return lesson(l.set_id,l.lesson_index,c.user);
    },{summary:'Complete a step using actual server-owned session/AI/conversation evidence'});
  }
  return {registerRoutes};
}
