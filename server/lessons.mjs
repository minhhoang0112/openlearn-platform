import { fail,integer,list,text } from './validation.mjs';
const stepNames=['Flashcard & Phát âm','Học','Nghe chép điền từ','Speaking','Hội thoại'];
export function lessonService(db,content,study,aiConfigured) {
  function lesson(setId,index,user) {
    const set=content.setAccess(setId,user),all=content.words(set.id,user);
    const lessonIndex=integer(index,'lesson_index',{min:1,max:1000});
    const words=all.slice((lessonIndex-1)*5,lessonIndex*5);
    if(!words.length)fail(404,'NOT_FOUND','Lesson not found.');
    const complete=db.prepare('SELECT step_index,completed_at FROM comprehensive_progress WHERE user_id=? AND set_id=? AND lesson_index=?').all(user.id,set.id,lessonIndex);
    return {set_id:set.id,lesson_index:lessonIndex,words,steps:stepNames.map((name,i)=>({index:i+1,name,completed:complete.some(s=>s.step_index===i+1),available:true})),completed:complete.length===5};
  }
  function registerRoutes(route) {
    route('GET','/sets/:id/lessons',c=>{
      const set=content.setAccess(c.params.id,c.user);const words=content.words(set.id,c.user);
      return {set_id:set.id,words_per_lesson:5,step_names:stepNames,lessons:Array.from({length:Math.ceil(words.length/5)},(_,i)=>{const l=lesson(set.id,i+1,c.user);return {index:i+1,word_ids:l.words.map(w=>w.id),terms:l.words.map(w=>w.term),completed_steps:l.steps.filter(s=>s.completed).length,completed:l.completed};})};
    },{summary:'Observed comprehensive plan: five words per lesson, five named steps'});
    route('GET','/sets/:id/lessons/:lesson_index',c=>lesson(c.params.id,c.params.lesson_index,c.user),{summary:'Lesson words, step progress, and provider availability'});
    route('POST','/sets/:id/lessons/:lesson_index/steps/:step_index/start',c=>{
      const l=lesson(c.params.id,c.params.lesson_index,c.user),step=integer(c.params.step_index,'step_index',{max:5});
      if(step>=4){if(!(typeof aiConfigured==='function'?aiConfigured(c.user):aiConfigured))fail(503,'AI_NOT_CONFIGURED','Kết nối AI trong Cài đặt AI để luyện nói và hội thoại.');return {set_id:l.set_id,lesson_index:l.lesson_index,step_index:step,word_ids:l.words.map(w=>w.id),terms:l.words.map(w=>w.term),action:step===4?'speaking':'conversation'};}
      const mode=['flashcard','learn','dictation'][step-1];
      const session=study.start(c.user,{set_id:l.set_id,mode,settings:{word_ids:l.words.map(w=>w.id),limit:5}});
      return {lesson_index:l.lesson_index,step_index:step,session,variant:step===3?'word_dictation':'standard',reference_variant:step===3?'example_gap_fill':'standard'};
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
        if(l.words.some(w=>!transcripts.includes(w.term.toLowerCase())))fail(409,'TARGET_WORDS_MISSING','Speaking attempts must use all target terms.');evidence={feedback_ids:ids};
      }else{
        const id=text(c.body.conversation_id,'conversation_id',{max:100});const convo=db.prepare('SELECT * FROM conversations WHERE id=? AND user_id=? AND set_id=?').get(id,c.user.id,l.set_id);if(!convo)fail(400,'INVALID_STEP_EVIDENCE','Conversation must belong to this account and set.');
        const transcript=db.prepare("SELECT content FROM messages WHERE conversation_id=? AND role='user'").all(id).map(r=>r.content).join(' ').toLowerCase();
        if(l.words.some(w=>!transcript.includes(w.term.toLowerCase())))fail(409,'TARGET_WORDS_MISSING','Use every lesson term in your conversation.');evidence={conversation_id:id};
      }
      db.prepare('INSERT OR IGNORE INTO comprehensive_progress VALUES(?,?,?,?,?,?)').run(c.user.id,l.set_id,l.lesson_index,step,JSON.stringify(evidence),new Date().toISOString());
      return lesson(l.set_id,l.lesson_index,c.user);
    },{summary:'Complete a step using actual server-owned session/AI/conversation evidence'});
  }
  return {registerRoutes};
}
