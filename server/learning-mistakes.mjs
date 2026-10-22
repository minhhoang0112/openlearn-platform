import {randomUUID,createHash} from 'node:crypto';
import {fail,text,pagination,enumeration} from './validation.mjs';
import {transaction} from './database.mjs';

export function learningMistakeService(db,{clock=()=>new Date()}={}){
  const stamp=()=>clock().toISOString();
  function summary(userId){
    const row=db.prepare('SELECT COUNT(*) total,SUM(resolved_at IS NULL) active_count,SUM(resolved_at IS NOT NULL) resolved_count,SUM(resolved_at IS NULL AND due_at<=?) due_count FROM learning_mistakes WHERE user_id=?').get(stamp(),userId);
    return {...Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v??0])),route:'/mistakes'};
  }
  function recordWrong({userId,lessonId,version,stepId}){
    const at=stamp();
    db.prepare('INSERT INTO learning_mistakes(id,user_id,lesson_id,content_version,step_id,due_at,last_wrong_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,lesson_id,content_version,step_id) DO UPDATE SET wrong_count=wrong_count+1,correct_streak=0,due_at=excluded.due_at,last_wrong_at=excluded.last_wrong_at,resolved_at=NULL').run(randomUUID(),userId,lessonId,version,stepId,at,at);
    return db.prepare('SELECT id FROM learning_mistakes WHERE user_id=? AND lesson_id=? AND content_version=? AND step_id=?').get(userId,lessonId,version,stepId).id;
  }
  function owned(id,user){
    const row=db.prepare('SELECT m.*,l.title,l.content FROM learning_mistakes m JOIN learning_lesson_versions l ON l.lesson_id=m.lesson_id AND l.version=m.content_version WHERE m.id=? AND m.user_id=?').get(id,user.id);
    if(!row)fail(404,'NOT_FOUND','Mistake not found.');
    const body=JSON.parse(row.content),step=body.steps.find(s=>s.id===row.step_id);
    if(!step||step.response_schema!=='choice')fail(409,'UNSUPPORTED_MISTAKE','Bài gốc không có câu hỏi lựa chọn để ôn lại.');
    return {row,body,step};
  }
  function present(value,detail=false){
    const {row,body,step}=value;
    const safe={id:row.id,lesson_id:row.lesson_id,content_version:row.content_version,step_id:row.step_id,lesson_title:row.title,type:step.type,prompt:step.prompt,wrong_count:row.wrong_count,review_count:row.review_count,correct_streak:row.correct_streak,required_correct:2,status:row.resolved_at?'resolved':'active',due_at:row.due_at,due:!row.resolved_at&&row.due_at<=stamp(),last_wrong_at:row.last_wrong_at,last_reviewed_at:row.last_reviewed_at,resolved_at:row.resolved_at};
    if(detail){
      const {answer,explanation,instruction,...question}=step;
      const offset=createHash('sha256').update(row.id).digest()[0]%question.options.length;
      safe.question={...question,options:[...question.options.slice(offset),...question.options.slice(0,offset)]};
      safe.hint=instruction??null;
      safe.media={url:`/api/v1/learning/media/${encodeURIComponent(body.media_id)}`,source:'windows_tts'};
      safe.transcript=body.transcript;safe.translation=body.translation;
    }
    return safe;
  }
  function registerRoutes(route){
    route('GET','/learning/mistakes',c=>{
      const status=enumeration(c.query.get('status')??'active','status',['active','resolved','all']),dueOnly=c.query.get('due_only')??'false';
      if(!['true','false'].includes(dueOnly))fail(400,'VALIDATION_ERROR','due_only must be true or false.');
      const {limit,offset}=pagination(c.query);
      const condition='user_id=? AND (?=\'all\' OR (?=\'active\' AND resolved_at IS NULL) OR (?=\'resolved\' AND resolved_at IS NOT NULL)) AND (?=0 OR (resolved_at IS NULL AND due_at<=?))';
      const args=[c.user.id,status,status,status,dueOnly==='true'?1:0,stamp()];
      const rows=db.prepare(`SELECT id FROM learning_mistakes WHERE ${condition} ORDER BY resolved_at IS NOT NULL,due_at,last_wrong_at DESC,id LIMIT ? OFFSET ?`).all(...args,limit,offset);
      return {items:rows.map(r=>present(owned(r.id,c.user))),total:db.prepare(`SELECT COUNT(*) n FROM learning_mistakes WHERE ${condition}`).get(...args).n,limit,offset,summary:summary(c.user.id)};
    },{summary:'Own real learning mistakes, due/resolved filters and actual counts; no generated errors'});
    route('GET','/learning/mistakes/:id',c=>present(owned(c.params.id,c.user),true),{summary:'Pinned original question and audio for a mistake; expected option hidden until review'});
    route('GET','/learning/mistakes/:id/reviews',c=>{
      owned(c.params.id,c.user);const {limit,offset}=pagination(c.query);
      const rows=db.prepare('SELECT submission_id,response,feedback,created_at FROM learning_mistake_reviews WHERE mistake_id=? ORDER BY created_at DESC,submission_id LIMIT ? OFFSET ?').all(c.params.id,limit,offset);
      return {items:rows.map(r=>({...r,response:JSON.parse(r.response),feedback:JSON.parse(r.feedback)})),total:db.prepare('SELECT COUNT(*) n FROM learning_mistake_reviews WHERE mistake_id=?').get(c.params.id).n,limit,offset};
    },{summary:'Own saved review feedback and answers; opening this history is assistance, not independent recall'});
    route('POST','/learning/mistakes/:id/reviews',c=>transaction(db,()=>{
      const value=owned(c.params.id,c.user),{row,step}=value;
      const submissionId=text(c.body.submission_id,'submission_id',{max:100});
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId))fail(400,'VALIDATION_ERROR','submission_id must be a UUID.');
      const option=c.body.response?.option_id;
      if(!step.options.some(o=>o.id===option))fail(400,'INVALID_RESPONSE','Choose a valid option.');
      const assistance=c.body.assistance_used??[];
      if(!Array.isArray(assistance)||assistance.length>3||new Set(assistance).size!==assistance.length||assistance.some(x=>!['transcript','translation','model'].includes(x)))fail(400,'VALIDATION_ERROR','Invalid assistance_used.');
      const requestHash=createHash('sha256').update(JSON.stringify({option_id:option,assistance_used:[...assistance].sort()})).digest('hex');
      const old=db.prepare('SELECT * FROM learning_mistake_reviews WHERE mistake_id=? AND submission_id=?').get(row.id,submissionId);
      if(old){if(old.request_hash!==requestHash)fail(409,'IDEMPOTENCY_CONFLICT','Submission ID already used for another response.');return {feedback:JSON.parse(old.feedback),mistake:present(value,true),summary:summary(c.user.id),replayed:true};}
      if(row.resolved_at)fail(409,'MISTAKE_RESOLVED','Lỗi này đã được ôn đạt tiêu chí; bạn có thể học lại bài gốc.');
      const at=stamp();if(row.due_at>at)fail(409,'REVIEW_NOT_DUE','Chưa đến lượt ôn tiếp theo.',{due_at:row.due_at});
      const correct=option===step.answer,independent=assistance.length===0;
      const streak=correct&&independent?row.correct_streak+1:0,resolved=streak>=2;
      const nextDue=resolved?null:new Date(clock().getTime()+(correct?86400000:600000)).toISOString();
      const feedback={assessment_status:'graded',correct,independent,expected_option_id:step.answer,explanation:step.explanation,assistance_used:assistance,counts_toward_resolution:correct&&independent,correct_streak:streak,required_correct:2,resolved,message:resolved?'Đã đạt tiêu chí ôn của câu này; đây không phải chứng nhận thành thạo cả bài.':correct&&!independent?'Đã trả lời đúng với hỗ trợ. Ôn lại không hỗ trợ để ghi nhận khả năng tự nhớ.':correct?'Đúng. Lượt nhớ lại tiếp theo sau ít nhất một ngày.':'Xem giải thích và thử lại sau mười phút.'};
      db.prepare('INSERT INTO learning_mistake_reviews VALUES(?,?,?,?,?,?)').run(row.id,submissionId,requestHash,JSON.stringify({option_id:option}),JSON.stringify(feedback),at);
      db.prepare('UPDATE learning_mistakes SET wrong_count=wrong_count+?,review_count=review_count+1,correct_streak=?,due_at=?,last_reviewed_at=?,resolved_at=? WHERE id=?').run(correct?0:1,streak,nextDue,at,resolved?at:null,row.id);
      return {feedback,mistake:present(owned(row.id,c.user),true),summary:summary(c.user.id),replayed:false};
    }),{summary:'Idempotent spaced review; resolve after two unassisted correct recalls on due dates, not repeated clicks'});
  }
  return {registerRoutes,recordWrong,summary};
}
