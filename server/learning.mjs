import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fail,integer,text,normalize} from './validation.mjs';
import {transaction} from './database.mjs';
import {starterPrograms,starterLessons} from './content/learning-v2/curriculum.mjs';

const now=()=>new Date().toISOString();
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stepTypes=new Set(['listen_comprehension','reading_comprehension','vocabulary_in_context','grammar_practice','pronunciation_practice','speaking_task','writing_task','reflection']);
const assets=new Map();
function checkpointSummary(body,results){
  const c=body.checkpoint,ids=c.graded_step_ids;
  const graded=ids.filter(id=>results[id]?.assessment_status==='graded');
  const correct=graded.filter(id=>results[id].correct===true);
  const independent=correct.filter(id=>Array.isArray(results[id].assistance_used)&&results[id].assistance_used.length===0);
  const recommended=[...new Set(ids.filter(id=>!independent.includes(id)).flatMap(id=>c.review_map[id]??[]))];
  return {scope:'local_unit_review',graded_total:ids.length,graded_submitted:graded.length,correct:correct.length,unassisted_correct:independent.length,minimum_correct:c.minimum_correct,passed:graded.length===ids.length&&independent.length>=c.minimum_correct,status:graded.length!==ids.length?'incomplete':independent.length>=c.minimum_correct?'passed':'review_needed',recommended_lesson_ids:recommended,open_tasks_assessment:'self_review',proficiency_estimate:null};
}
function audio(id){
  if(!starterLessons.some(l=>l.media_id===id))fail(404,'NOT_FOUND','Media not found.');
  if(assets.has(id))return assets.get(id);
  const bytes=readFileSync(new URL(`./content/learning-v2/media/${id}.wav`,import.meta.url));
  if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw new Error('Learning media is not a WAV file.');
  let byteRate=0,size=0;
  for(let p=12;p+8<=bytes.length;){
    const name=bytes.toString('ascii',p,p+4),length=bytes.readUInt32LE(p+4);
    if(p+8+length>bytes.length)throw new Error('Incomplete learning audio.');
    if(name==='fmt '&&length>=16)byteRate=bytes.readUInt32LE(p+16);
    if(name==='data')size=length;
    p+=8+length+(length%2);
  }
  if(!byteRate||!size)throw new Error('Learning audio has no playable samples.');
  const value={bytes,metadata:{id,url:`/api/v1/learning/media/${id}`,duration_ms:Math.round(size/byteRate*1000),source:'windows_tts',voice:'Microsoft David Desktop',human_audio_reviewed:false,segments:[]}};
  assets.set(id,value);return value;
}
export function seedLearning(db){
  transaction(db,()=>{
    for(const p of starterPrograms)db.prepare('INSERT INTO learning_programs VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').run(p.id,p.title,p.kind,p.version,p.status);
    for(const lesson of starterLessons){
      audio(lesson.media_id);
      if(!lesson.steps.length||new Set(lesson.steps.map(s=>s.id)).size!==lesson.steps.length||lesson.steps.some(s=>!stepTypes.has(s.type)||s.response_schema==='choice'&&!s.options?.some(o=>o.id===s.answer)))throw new Error('Invalid starter lesson.');
      if(lesson.checkpoint){const c=lesson.checkpoint;if(!Array.isArray(c.graded_step_ids)||!c.graded_step_ids.length||new Set(c.graded_step_ids).size!==c.graded_step_ids.length||!Number.isInteger(c.minimum_correct)||c.minimum_correct<1||c.minimum_correct>c.graded_step_ids.length||c.graded_step_ids.some(id=>!lesson.steps.some(s=>s.id===id&&s.response_schema==='choice')))throw new Error('Invalid checkpoint criteria.');}
      db.prepare('INSERT INTO learning_lesson_versions VALUES(?,?,?,?,?,?,1) ON CONFLICT(lesson_id,version) DO NOTHING').run(lesson.id,lesson.version,lesson.program_id,lesson.title,lesson.position,JSON.stringify(lesson));
    }
  });
}

export function learningService(db,profiles,{seed=true,clock=()=>new Date(),mistakes}={}){
  if(seed)seedLearning(db);
  function lesson(id,version){
    const row=version===undefined?db.prepare('SELECT * FROM learning_lesson_versions WHERE lesson_id=? AND published=1 ORDER BY version DESC LIMIT 1').get(id):db.prepare('SELECT * FROM learning_lesson_versions WHERE lesson_id=? AND version=?').get(id,version);
    if(!row)fail(404,'NOT_FOUND','Learning lesson not found.');
    return {...row,body:JSON.parse(row.content)};
  }
  function own(id,user){
    const row=db.prepare('SELECT * FROM learning_sessions WHERE id=? AND user_id=?').get(id,user.id);
    if(!row)fail(404,'NOT_FOUND','Learning session not found.');
    return {...row,state:JSON.parse(row.state),lesson:lesson(row.lesson_id,row.content_version)};
  }
  function publicStep(step){const {answer,explanation,...safe}=step;return safe;}
  function present(s){
    const body=s.lesson.body,steps=body.steps,state=s.state,current=steps[state.cursor];
    return {id:s.id,lesson_id:s.lesson_id,program_id:s.lesson.program_id,title:s.lesson.title,lesson_kind:body.lesson_kind??'lesson',objectives:body.objectives,content_version:s.content_version,revision:s.revision,status:s.completed_at?'completed':'active',cursor:state.cursor,
      steps:steps.map(step=>({id:step.id,type:step.type,title:step.title,state:Object.hasOwn(state.results,step.id)?'completed':step.id===current?.id?state.feedback?'feedback':state.draft?'draft':'ready':'pending'})),
      current:current?{...publicStep(current),state:state.feedback?'feedback':state.draft?'draft':'ready',draft:state.draft,feedback:state.feedback,media:audio(body.media_id).metadata}:null,
      completed_steps:state.cursor,total_steps:steps.length,media:audio(body.media_id).metadata,transcript:body.transcript,translation:body.translation,provenance:body.provenance,
      results:state.results,summary:s.completed_at?{completed:true,mastered:false,graded_correct:Object.values(state.results).filter(r=>r.assessment_status==='graded'&&r.correct).length,graded_total:Object.values(state.results).filter(r=>r.assessment_status==='graded').length,open_tasks:Object.values(state.results).filter(r=>r.assessment_status==='self_review').length,...(body.checkpoint?{checkpoint:checkpointSummary(body,state.results)}:{})}:null,
      created_at:s.created_at,updated_at:s.updated_at,completed_at:s.completed_at};
  }
  function save(s){
    s.revision++;s.updated_at=now();
    db.prepare('UPDATE learning_sessions SET revision=?,state=?,updated_at=?,completed_at=? WHERE id=?').run(s.revision,JSON.stringify(s.state),s.updated_at,s.completed_at,s.id);
  }
  function revision(s,body){if(integer(body.revision,'revision',{min:0})!==s.revision)fail(409,'REVISION_CONFLICT','Phiên đã thay đổi. Hãy tải lại; giữ nội dung chưa gửi của bạn.',{revision:s.revision});}
  function current(s,body){
    const step=s.lesson.body.steps[s.state.cursor];
    if(!step||body.step_id!==step.id)fail(409,'STEP_OUT_OF_ORDER','Hãy làm bước hiện tại.');return step;
  }
  function validate(step,response,partial=false){
    if(!response||typeof response!=='object'||Array.isArray(response))fail(400,'INVALID_RESPONSE','Supply a response object.');
    if(step.response_schema==='choice'){
      if(partial&&(response.option_id===null||response.option_id===''))return {option_id:null};
      if(!step.options.some(o=>o.id===response.option_id))fail(400,'INVALID_RESPONSE','Choose a valid option.');return {option_id:response.option_id};
    }
    if(step.response_schema==='text'){
      const value=text(response.text,'response.text',{min:partial?0:1,max:3000});
      if(response.self_reviewed!==undefined&&typeof response.self_reviewed!=='boolean')fail(400,'INVALID_RESPONSE','self_reviewed must be boolean.');
      if(!partial&&response.self_reviewed!==true)fail(400,'SELF_REVIEW_REQUIRED','Đọc tiêu chí và xác nhận tự kiểm tra trước khi nộp.');
      return {text:value,self_reviewed:response.self_reviewed===true};
    }
    if(!partial&&response.acknowledged!==true)fail(400,'ACKNOWLEDGEMENT_REQUIRED','Xác nhận đã thực hiện hoạt động.');
    if(response.acknowledged!==undefined&&typeof response.acknowledged!=='boolean')fail(400,'INVALID_RESPONSE','acknowledged must be boolean.');
    return {acknowledged:response.acknowledged===true,...(response.reflection!==undefined?{reflection:text(response.reflection,'reflection',{min:0,max:2000})}:{})};
  }
  function program(id,user){
    const p=db.prepare('SELECT * FROM learning_programs WHERE id=?').get(id);if(!p)fail(404,'NOT_FOUND','Program not found.');
    const lessons=db.prepare('SELECT l.* FROM learning_lesson_versions l WHERE program_id=? AND published=1 AND version=(SELECT MAX(version) FROM learning_lesson_versions WHERE lesson_id=l.lesson_id AND published=1) ORDER BY position,lesson_id').all(id);
    return {...p,lesson_count:lessons.length,units:[{id:id+'-starter',title:'Bài khởi động',lessons:lessons.map(l=>{const b=JSON.parse(l.content),completed=db.prepare('SELECT completed_at FROM learning_sessions WHERE user_id=? AND lesson_id=? AND content_version=? AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1').get(user.id,l.lesson_id,l.version);return {id:l.lesson_id,title:l.title,version:l.version,lesson_kind:b.lesson_kind??'lesson',estimated_minutes:b.estimated_minutes,objectives:b.objectives,recommended_prerequisites:b.recommended_prerequisites,completed_at:completed?.completed_at??null};})}]};
  }
  function due(user){return db.prepare('SELECT COUNT(*) n FROM word_progress WHERE user_id=? AND due_at IS NOT NULL AND due_at<=?').get(user.id,clock().toISOString()).n;}
  function today(user){return transaction(db,()=>{
    const profile=profiles.getProfile(user.id),date=clock(),localDate=new Intl.DateTimeFormat('en-CA',{timeZone:profile.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
    let row=db.prepare('SELECT * FROM daily_learning_plans WHERE user_id=? AND local_date=?').get(user.id,localDate);
    if(!row){
      const weekday=new Date(localDate+'T12:00:00Z').getUTCDay()||7;
      const scheduledDay=profile.preferred_days.includes(weekday);
      const items=[],active=db.prepare('SELECT id,lesson_id,content_version FROM learning_sessions WHERE user_id=? AND completed_at IS NULL ORDER BY updated_at DESC LIMIT 1').get(user.id);
      const dueCount=due(user);if(dueCount)items.push({id:'srs',kind:'review',route:'/repetition-study',estimated_minutes:Math.min(5,profile.time_budget_minutes),initial_due_count:dueCount});
      let candidate=active;
      if(!candidate&&scheduledDay){
        const eligible=profile.focus==='system'?['english-foundation','english-it-system']:['english-foundation'];
        for(const id of eligible){const p=db.prepare('SELECT id FROM learning_programs WHERE id=?').get(id);if(!p)continue;
          const available=program(id,user).units.flatMap(u=>u.lessons).find(l=>!l.completed_at);
          if(available){candidate={lesson_id:available.id,content_version:available.version};break;}
        }
      }
      if(candidate){const l=lesson(candidate.lesson_id,candidate.content_version);items.push({id:'lesson',kind:'lesson',lesson_id:l.lesson_id,content_version:l.version,title:l.title,estimated_minutes:l.body.estimated_minutes,session_id:candidate.id??null});}
      const stamp=now();row={id:randomUUID(),user_id:user.id,local_date:localDate,timezone:profile.timezone,budget_minutes:profile.time_budget_minutes,items:JSON.stringify({version:1,scheduled_day:scheduledDay,preferred_days:profile.preferred_days,items}),created_at:stamp};
      db.prepare('INSERT INTO daily_learning_plans VALUES(?,?,?,?,?,?,?)').run(row.id,row.user_id,row.local_date,row.timezone,row.budget_minutes,row.items,row.created_at);
    }
    const saved=JSON.parse(row.items),legacy=Array.isArray(saved),scheduledDay=legacy?null:saved.scheduled_day;
    const items=(legacy?saved:saved.items).map(item=>{
      if(item.kind==='review'){const count=due(user);return {...item,due_count:count,status:count?'ready':'completed'};}
      const s=item.session_id?db.prepare('SELECT id,completed_at FROM learning_sessions WHERE id=? AND user_id=?').get(item.session_id,user.id):db.prepare('SELECT id,completed_at FROM learning_sessions WHERE user_id=? AND lesson_id=? AND content_version=? ORDER BY updated_at DESC LIMIT 1').get(user.id,item.lesson_id,item.content_version);
      return {...item,session_id:s?.id??null,route:s?`/lesson-run/${s.id}`:null,status:s?.completed_at?'completed':s?'in_progress':'ready'};
    });
    const completed=items.length>0&&items.every(i=>i.status==='completed');
    const active=db.prepare('SELECT id,lesson_id FROM learning_sessions WHERE user_id=? AND completed_at IS NULL ORDER BY updated_at DESC LIMIT 1').get(user.id);
    return {mistake_summary:mistakes?.summary(user.id)??null,plan_id:row.id,local_date:row.local_date,timezone:row.timezone,budget_minutes:row.budget_minutes,scheduled_day:scheduledDay,preferred_days:legacy?null:saved.preferred_days,schedule_policy:legacy?'legacy_unrestricted':'preferred_days',items,resume_session_id:active?.id??null,resume_lesson_id:active?.lesson_id??null,resume_route:active?`/lesson-run/${active.id}`:null,status:!items.length?scheduledDay===false?'rest_day':'content_exhausted':completed?'completed':'ready',message:!items.length?scheduledDay===false?'Hôm nay ngoài lịch học chính. Bạn vẫn có thể học tự chọn trong thư viện.':'Chưa có bài mới phù hợp. Bạn có thể học lại hoặc dùng thư viện; không có bài giả được tạo.':null,profile_changes_apply:'next_local_day',created_at:row.created_at};
  });}
  function registerRoutes(route){
    route('GET','/learning/programs',c=>({items:db.prepare('SELECT * FROM learning_programs ORDER BY kind,id').all().map(p=>{const v=program(p.id,c.user);const {units,...meta}=v;return meta;})}),{summary:'Published pilot programs and actual lesson counts; separate foundation and IT/System tracks'});
    route('GET','/learning/programs/:id',c=>program(c.params.id,c.user),{summary:'Real program lessons, objectives and own completion; no answer keys'});
    route('GET','/learning/today',c=>today(c.user),{summary:'Stable own local-day plan from available content, active sessions and real due reviews'});
    route('GET','/learning/media/:id',c=>{
      const {bytes}=audio(c.params.id);let start=0,end=bytes.length-1,status=200;
      const range=c.req.headers.range;
      if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))fail(416,'INVALID_RANGE','Supply one byte range.');
        if(!match[1])start=Math.max(0,bytes.length-Number(match[2]));else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.length)fail(416,'INVALID_RANGE','Range outside audio.');status=206;c.res.setHeader('Content-Range',`bytes ${start}-${end}/${bytes.length}`);
      }
      c.res.writeHead(status,{'Content-Type':'audio/wav','Accept-Ranges':'bytes','Content-Length':end-start+1});c.res.end(bytes.subarray(start,end+1));
    },{summary:'Authenticated saved English TTS WAV, including range requests; no external AI call'});
    route('POST','/learning/sessions',c=>transaction(db,()=>{
      const l=lesson(text(c.body.lesson_id,'lesson_id',{max:100}));
      if(c.body.resume!==undefined&&typeof c.body.resume!=='boolean')fail(400,'VALIDATION_ERROR','resume must be boolean.');
      if(c.body.resume!==false){const old=db.prepare('SELECT id FROM learning_sessions WHERE user_id=? AND lesson_id=? AND content_version=? AND completed_at IS NULL ORDER BY updated_at DESC LIMIT 1').get(c.user.id,l.lesson_id,l.version);if(old)return {...present(own(old.id,c.user)),replayed:true};}
      const id=randomUUID(),stamp=now();db.prepare('INSERT INTO learning_sessions VALUES(?,?,?,?,0,?,?,?,NULL)').run(id,c.user.id,l.lesson_id,l.version,JSON.stringify({cursor:0,draft:null,feedback:null,results:{}}),stamp,stamp);c.status=201;return {...present(own(id,c.user)),replayed:false};
    }),{summary:'Start/resume own pinned-version lesson session without invoking Gemini'});
    route('GET','/learning/sessions/:id',c=>present(own(c.params.id,c.user)),{summary:'Restore exact V2 lesson step, draft and feedback; no future answer keys'});
    route('PUT','/learning/sessions/:id/draft',c=>transaction(db,()=>{
      const s=own(c.params.id,c.user);revision(s,c.body);const step=current(s,c.body);if(s.state.feedback)fail(409,'ALREADY_SUBMITTED','Read feedback and continue.');
      s.state.draft=validate(step,c.body.response,true);save(s);return present(s);
    }),{summary:'Validate and persist own step draft with optimistic revision control'});
    route('POST','/learning/sessions/:id/submit',c=>transaction(db,()=>{
      const s=own(c.params.id,c.user),submissionId=text(c.body.submission_id,'submission_id',{max:100});
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId))fail(400,'VALIDATION_ERROR','submission_id must be a UUID.');
      const requestHash=hash({step_id:c.body.step_id,response:c.body.response,assistance_used:c.body.assistance_used??[]});
      const previous=db.prepare('SELECT * FROM learning_step_attempts WHERE session_id=? AND submission_id=?').get(s.id,submissionId);
      if(previous){if(previous.request_hash!==requestHash)fail(409,'IDEMPOTENCY_CONFLICT','Submission ID already used for another response.');return {feedback:JSON.parse(previous.feedback),session:present(s),replayed:true};}
      revision(s,c.body);const step=current(s,c.body);if(s.state.feedback)fail(409,'ALREADY_SUBMITTED','This step has already been submitted.');
      const response=validate(step,c.body.response),assistance=c.body.assistance_used??[];
      if(!Array.isArray(assistance)||assistance.length>3||new Set(assistance).size!==assistance.length||assistance.some(x=>!['transcript','translation','model'].includes(x)))fail(400,'VALIDATION_ERROR','Invalid assistance_used.');
      const graded=step.response_schema==='choice',feedback=graded?{assessment_status:'graded',correct:response.option_id===step.answer,expected_option_id:step.answer,explanation:step.explanation}:{assessment_status:'self_review',correct:null,rubric:step.rubric??[],message:'Đã lưu hoạt động tự luyện. Chưa có đánh giá AI hoặc điểm phát âm.'};
      feedback.assistance_used=assistance;
      if(graded&&!feedback.correct&&mistakes)feedback.mistake_id=mistakes.recordWrong({userId:c.user.id,lessonId:s.lesson_id,version:s.content_version,stepId:step.id});
      db.prepare('INSERT INTO learning_step_attempts VALUES(?,?,?,?,?,?,?)').run(s.id,submissionId,requestHash,step.id,JSON.stringify(response),JSON.stringify(feedback),now());
      s.state.draft=response;s.state.feedback=feedback;save(s);
      return {feedback,session:present(s),replayed:false};
    }),{summary:'Grade deterministic tasks or record explicit self-review, atomically and idempotently; never fabricate AI scores'});
    route('POST','/learning/sessions/:id/advance',c=>transaction(db,()=>{
      const s=own(c.params.id,c.user);revision(s,c.body);const step=current(s,c.body);if(!s.state.feedback)fail(409,'SUBMIT_REQUIRED','Submit the current step before continuing.');
      s.state.results[step.id]=s.state.feedback;s.state.cursor++;s.state.draft=null;s.state.feedback=null;
      if(s.state.cursor===s.lesson.body.steps.length)s.completed_at=now();save(s);return present(s);
    }),{summary:'Advance only after saved feedback; completion records activity, not a claim of mastery'});
  }
  return {registerRoutes};
}
