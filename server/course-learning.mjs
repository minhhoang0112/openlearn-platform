import {randomUUID,createHash} from 'node:crypto';
import {fail,text,normalize} from './validation.mjs';
import {transaction} from './database.mjs';
import {gradeCourseLesson} from './course-grading.mjs';
const now=()=>new Date().toISOString();
const digest=lesson=>createHash('sha256').update(lesson.content||'').digest('hex');
const publicQuestion=({answer,correct_option_id,...question})=>question;
function transcriptText(value){
  return normalize(value).replace(/[‘’]/g,"'")
    .replace(/\bi'm\b/g,'i am').replace(/\byou're\b/g,'you are').replace(/\bwe're\b/g,'we are').replace(/\bthey're\b/g,'they are')
    .replace(/\bwhat's\b/g,'what is').replace(/\bit's\b/g,'it is').replace(/\bthat's\b/g,'that is').replace(/\bdon't\b/g,'do not').replace(/\bcan't\b/g,'cannot')
    .replace(/[^\p{L}\p{N}' ]/gu,' ').replace(/\s+/g,' ').trim();
}
export function courseLearningService(db,courses){
  function owned(id,user){
    const row=db.prepare('SELECT * FROM course_learning_sessions WHERE id=? AND user_id=?').get(id,user.id);
    if(!row)fail(404,'NOT_FOUND','Course learning session not found.');
    const lesson=courses.lessonAccess(row.lesson_id,user),state=JSON.parse(row.state);
    if(state.content_digest!==digest(lesson))fail(409,'COURSE_LESSON_CHANGED','Nội dung bài đã thay đổi. Hãy bắt đầu một lượt học mới.');
    return {row,lesson,state};
  }
  function view(value){
    const {row,lesson,state}=value;
    const steps=state.steps.map(step=>({...step,questions:step.questions?.map(publicQuestion),completed:!!state.completed[step.id],result:state.completed[step.id]||state.feedback[step.id]||null}));
    return {id:row.id,course_id:lesson.course_id,lesson_id:lesson.id,title:lesson.title,instruction:state.instruction,index:state.index,total:steps.length,status:row.completed_at?'completed':'active',steps,current:steps[state.index]||null,quiz_draft:state.quiz_draft||[],grade:state.grade||null,created_at:row.created_at,updated_at:row.updated_at,completed_at:row.completed_at};
  }
  function save(value){
    const stamp=now(),completed=value.state.index===value.state.steps.length?stamp:null;
    db.prepare('UPDATE course_learning_sessions SET state=?,updated_at=?,completed_at=? WHERE id=?').run(JSON.stringify(value.state),stamp,completed,value.row.id);
    value.row.updated_at=stamp;value.row.completed_at=completed;
  }
  function build(lesson){
    const body=JSON.parse(lesson.content||'{}');
    if(!Array.isArray(body.questions)||!body.questions.length)fail(409,'CONTENT_NOT_IMPORTED','Bài học chưa có câu hỏi để chấm.');
    const phrases=body.phrases||[];if(!Array.isArray(phrases)||phrases.length>100)fail(409,'INVALID_LESSON_CONTENT','Danh sách mẫu câu không hợp lệ.');
    const steps=[];
    phrases.forEach((p,i)=>{
      if(typeof p.text!=='string'||!p.text.trim()||typeof p.translation!=='string')fail(409,'INVALID_LESSON_CONTENT','Mẫu câu hoặc bản dịch chưa đầy đủ.');
      const phrase={text:p.text.trim(),translation:p.translation};
      steps.push({id:`phrase-${i+1}`,type:'vocab',title:'Nghe và học mẫu câu',english:phrase.text,vietnamese:phrase.translation,phrases:[phrase]});
      steps.push({id:`speech-${i+1}`,type:'speaking',title:'Luyện nói lại mẫu câu',english:phrase.text,vietnamese:phrase.translation,assessment:'transcript_match'});
    });
    steps.push({id:'quiz',type:'quiz',title:'Bài tập của bài học',questions:body.questions});
    return {content_digest:digest(lesson),instruction:body.instruction||'',steps,index:0,completed:{},feedback:{},quiz_draft:[]};
  }
  function registerRoutes(route){
    route('POST','/course-lessons/:id/sessions',c=>{
      const lesson=courses.lessonAccess(c.params.id,c.user);if(!lesson.content)fail(409,'CONTENT_NOT_IMPORTED','Lesson content has not been imported.');
      if(c.body.resume!==false){
        const old=db.prepare('SELECT id,state FROM course_learning_sessions WHERE user_id=? AND lesson_id=? AND completed_at IS NULL ORDER BY updated_at DESC LIMIT 1').get(c.user.id,lesson.id);
        if(old&&JSON.parse(old.state).content_digest===digest(lesson))return {...view(owned(old.id,c.user)),replayed:true};
      }
      const stamp=now(),id=randomUUID();db.prepare('INSERT INTO course_learning_sessions VALUES(?,?,?,?,?,?,?)').run(id,c.user.id,lesson.id,JSON.stringify(build(lesson)),stamp,stamp,null);
      c.status=201;return {...view(owned(id,c.user)),replayed:false};
    },{summary:'Build a real course lesson flow from its phrases/questions, or resume the saved step'});
    route('GET','/course-learning-sessions',c=>{
      const rows=db.prepare("SELECT s.id,s.lesson_id,s.updated_at,s.completed_at,l.title,p.course_id FROM course_learning_sessions s JOIN course_lessons l ON l.id=s.lesson_id JOIN course_parts p ON p.id=l.part_id JOIN courses c ON c.id=p.course_id WHERE s.user_id=? AND(c.visibility='public' OR c.owner_id=?) ORDER BY s.updated_at DESC LIMIT 100").all(c.user.id,c.user.id);
      return {items:rows.filter(r=>!c.query.has('lesson_id')||r.lesson_id===Number(c.query.get('lesson_id')))};
    },{summary:'Own resumable course lesson history'});
    route('GET','/course-learning-sessions/:id',c=>view(owned(c.params.id,c.user)),{summary:'Resume exact course step and feedback without answer keys'});
    route('PUT','/course-learning-sessions/:id/draft',c=>{
      const v=owned(c.params.id,c.user),step=v.state.steps[v.state.index];if(step?.type!=='quiz')fail(409,'WRONG_STEP','Lưu đáp án tại bước bài tập.');
      if(!Array.isArray(c.body.answers)||c.body.answers.length>step.questions.length)fail(400,'INVALID_ANSWERS','Supply a partial answer list.');
      const seen=new Set();
      const answers=c.body.answers.map(a=>{const q=step.questions.find(q=>q.id===a?.question_id);if(!q||seen.has(q.id))fail(400,'INVALID_ANSWERS','Unknown or duplicate question.');seen.add(q.id);if(q.type==='choice'){if(a.option_id!==null&&a.option_id!==''&&!q.options.some(o=>o.id===a.option_id))fail(400,'INVALID_ANSWERS','Invalid option.');return {question_id:q.id,option_id:a.option_id};}if(typeof a.answer!=='string'||a.answer.length>3000)fail(400,'INVALID_ANSWERS','Invalid text answer.');return {question_id:q.id,answer:a.answer};});
      v.state.quiz_draft=answers;save(v);return view(v);
    },{summary:'Persist a private course quiz draft before grading'});
    route('POST','/course-learning-sessions/:id/steps/:step_id/complete',c=>transaction(db,()=>{
      const v=owned(c.params.id,c.user),id=c.params.step_id;
      if(Object.hasOwn(v.state.completed,id))return {...view(v),feedback:v.state.completed[id],replayed:true};
      const step=v.state.steps[v.state.index];if(!step||step.id!==id)fail(409,'STEP_OUT_OF_ORDER','Hãy hoàn thành bước hiện tại trước.');
      let feedback;
      if(step.type==='quiz'){
        const grade=gradeCourseLesson(db,v.lesson,c.user,{answers:c.body.answers,retry:true});v.state.grade=grade;
        feedback={kind:'quiz',score:grade.score,total:grade.total,completed:true};
      }else if(step.type==='speaking'){
        if(c.body.skip===true)feedback={kind:'transcript_match',matched:false,skipped:true,completed:true};
        else{
          const transcript=text(c.body.transcript,'transcript',{max:3000}),matched=transcriptText(transcript)===transcriptText(step.english);
          feedback={kind:'transcript_match',matched,transcript,completed:matched,message:matched?'Các từ nhận dạng khớp câu mẫu.':'Các từ nhận dạng chưa khớp câu mẫu. Bạn có thể nghe lại, nói lại hoặc bỏ qua; đây không phải điểm phát âm.'};
          if(!matched){v.state.feedback[id]=feedback;save(v);return {...view(v),feedback,replayed:false};}
        }
      }else{
        if(c.body.acknowledged!==true)fail(400,'ACKNOWLEDGEMENT_REQUIRED','Xác nhận đã xem/nghe mẫu câu trước khi tiếp tục.');
        feedback={kind:'acknowledged',completed:true};
      }
      v.state.completed[id]=feedback;delete v.state.feedback[id];v.state.index++;save(v);
      return {...view(v),feedback,replayed:false};
    }),{summary:'Complete the current course step; speech checks transcript only, final quiz grades on server atomically'});
  }
  return {registerRoutes};
}
