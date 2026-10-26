import {randomUUID} from 'node:crypto';
import {fail,integer,text} from './validation.mjs';
import {transaction} from './database.mjs';

export function dailyLearningPlanService(db,profiles,{clock,lesson,program,mistakes,startSession}){
  const dateFor=(date,timezone)=>new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  const due=user=>db.prepare('SELECT COUNT(*) n FROM word_progress WHERE user_id=? AND due_at IS NOT NULL AND due_at<=?').get(user.id,clock().toISOString()).n;
  const active=user=>db.prepare('SELECT id,lesson_id,content_version,state FROM learning_sessions WHERE user_id=? AND completed_at IS NULL ORDER BY updated_at DESC,rowid DESC LIMIT 1').get(user.id);
  const isCompleted=(user,id)=>!!db.prepare('SELECT 1 FROM learning_sessions WHERE user_id=? AND lesson_id=? AND content_version=(SELECT MAX(version) FROM learning_lesson_versions WHERE lesson_id=? AND published=1) AND completed_at IS NOT NULL').get(user.id,id,id);
  function makeItems(user,profile,scheduledDay,budget,revision=0,kept=[],preferredCandidate=null){
    let remaining=budget;const items=[],deferred=[];
    const key=kind=>kept.some(i=>i.id===kind)?`${kind}:r${revision}`:kind;
    const reviewCount=due(user),mistakeCount=mistakes?.summary(user.id).due_count??0;
    for(const [id,count,route,title]of [['srs',reviewCount,'/repetition-study','Ôn từ đến hạn'],['mistakes',mistakeCount,'/mistakes?due_only=true','Ôn câu từng làm sai']]){
      if(!count)continue;
      if(remaining<5){deferred.push({kind:id,reason:'time_budget'});continue;}
      items.push({id:key(id),kind:id==='srs'?'review':'mistake_review',title,route,estimated_minutes:5,initial_due_count:count,reason:'due_review'});remaining-=5;
    }
    let candidate=preferredCandidate??active(user);
    if(!candidate&&scheduledDay){
      for(const id of profile.focus==='system'?['english-foundation','english-it-system']:['english-foundation']){
        if(!db.prepare('SELECT 1 FROM learning_programs WHERE id=?').get(id))continue;
        const available=program(id,user).units.flatMap(u=>u.lessons).find(l=>!l.completed_at&&(l.recommended_prerequisites??[]).every(p=>isCompleted(user,p)));
        if(available){candidate={lesson_id:available.id,content_version:available.version};break;}
      }
    }
    if(candidate){
      const l=lesson(candidate.lesson_id,candidate.content_version),steps=l.body.steps.length,start=candidate.state?JSON.parse(candidate.state).cursor:0;
      const fullMinutes=l.body.estimated_minutes;
      // Keep original task order. Chunking changes today's goal, never lesson grades.
      const count=Math.min(steps-start,Math.floor(remaining*steps/fullMinutes));
      if(count>0){
        const estimate=Math.ceil(count*fullMinutes/steps);
        items.push({id:key('lesson'),kind:'lesson',lesson_id:l.lesson_id,content_version:l.version,title:l.title,estimated_minutes:estimate,session_id:candidate.id??null,reason:candidate.id?'resume_lesson':'next_lesson',completion_scope:'planned_steps',workload:{policy:'step_chunk_v1',start_cursor:start,target_cursor:start+count,planned_steps:count,total_steps:steps,full_lesson_estimated_minutes:fullMinutes}});
      }else deferred.push({kind:'lesson',lesson_id:l.lesson_id,reason:'time_budget'});
    }
    return {items,deferred};
  }
  function ensure(user){
    const profile=profiles.getProfile(user.id),localDate=dateFor(clock(),profile.timezone);
    let row=db.prepare('SELECT * FROM daily_learning_plans WHERE user_id=? AND local_date=?').get(user.id,localDate);
    if(!row){
      const weekday=new Date(localDate+'T12:00:00Z').getUTCDay()||7,scheduledDay=profile.preferred_days.includes(weekday);
      const selected=makeItems(user,profile,scheduledDay,profile.time_budget_minutes);
      const payload={version:2,revision:0,scheduled_day:scheduledDay,preferred_days:profile.preferred_days,focus:profile.focus,...selected,adjustments:[]};
      row={id:randomUUID(),user_id:user.id,local_date:localDate,timezone:profile.timezone,budget_minutes:profile.time_budget_minutes,items:JSON.stringify(payload),created_at:clock().toISOString()};
      db.prepare('INSERT INTO daily_learning_plans VALUES(?,?,?,?,?,?,?)').run(row.id,row.user_id,row.local_date,row.timezone,row.budget_minutes,row.items,row.created_at);
    }
    return row;
  }
  function present(row,user){
    const saved=JSON.parse(row.items),legacy=Array.isArray(saved),raw=legacy?saved:saved.items;let bound=false;
    const items=raw.map(item=>{
      if(item.frozen_complete)return {...item,status:'completed',estimated_remaining_minutes:0};
      if(item.kind==='review'||item.kind==='mistake_review'){
        const count=item.kind==='review'?due(user):mistakes?.summary(user.id).due_count??0;
        return {...item,due_count:count,status:count?'ready':'completed',estimated_remaining_minutes:count?item.estimated_minutes:0};
      }
      let session=item.session_id?db.prepare('SELECT id,state,completed_at FROM learning_sessions WHERE id=? AND user_id=?').get(item.session_id,user.id):null;
      if(!item.session_id){
        session=db.prepare('SELECT id,state,completed_at FROM learning_sessions WHERE user_id=? AND lesson_id=? AND content_version=? AND created_at>=? ORDER BY created_at,rowid LIMIT 1').get(user.id,item.lesson_id,item.content_version,row.created_at);
        if(session){item.session_id=session.id;bound=true;}
      }
      const cursor=session?JSON.parse(session.state).cursor:0,target=item.workload?.target_cursor;
      const done=!!session&&(!!session.completed_at||(target!==undefined&&cursor>=target));
      const remainingMinutes=done?0:item.workload?Math.ceil(Math.max(0,target-Math.max(cursor,item.workload.start_cursor))*item.workload.full_lesson_estimated_minutes/item.workload.total_steps):item.estimated_minutes;
      return {...item,session_id:session?.id??null,route:session?`/lesson-run/${session.id}`:null,status:done?'completed':session?'in_progress':'ready',lesson_completed:!!session?.completed_at,estimated_remaining_minutes:remainingMinutes,completed_planned_steps:Math.max(0,Math.min(item.workload?.planned_steps??cursor,cursor-(item.workload?.start_cursor??0)))};
    });
    if(bound){row.items=JSON.stringify(saved);db.prepare('UPDATE daily_learning_plans SET items=? WHERE id=?').run(row.items,row.id);}
    const current=active(user),completed=items.length>0&&items.every(i=>i.status==='completed'),scheduledDay=legacy?null:saved.scheduled_day;
    return {mistake_summary:mistakes?.summary(user.id)??null,plan_id:row.id,plan_revision:legacy?0:saved.revision??0,planner_policy:legacy?'legacy':saved.version===2?'step_chunk_v1':'legacy',local_date:row.local_date,timezone:row.timezone,budget_minutes:row.budget_minutes,
      scheduled_day:scheduledDay,preferred_days:legacy?null:saved.preferred_days,schedule_policy:legacy?'legacy_unrestricted':'preferred_days',items,
      estimated_remaining_minutes:items.reduce((n,i)=>n+i.estimated_remaining_minutes,0),deferred:legacy?[]:saved.deferred??[],
      resume_session_id:current?.id??null,resume_lesson_id:current?.lesson_id??null,resume_route:current?`/lesson-run/${current.id}`:null,
      status:!items.length?scheduledDay===false?'rest_day':'content_exhausted':completed?'completed':'ready',message:!items.length?scheduledDay===false?'Hôm nay ngoài lịch học chính. Bạn vẫn có thể học tự chọn trong thư viện.':'Chưa có bài phù hợp với thời gian còn lại. Bạn có thể điều chỉnh thời gian hoặc học tự chọn.':null,
      profile_changes_apply:'next_local_day',adjustment_policy:'explicit_remaining_budget',created_at:row.created_at};
  }
  function validatePlan(row,body){
    const saved=JSON.parse(row.items),revision=Array.isArray(saved)?0:saved.revision??0;
    if(text(body.plan_id,'plan_id',{max:100})!==row.id||integer(body.revision,'revision',{min:0})!==revision)fail(409,'PLAN_CHANGED','Kế hoạch đã thay đổi hoặc đã sang ngày mới. Hãy tải lại kế hoạch.',{plan_id:row.id,revision});
    return saved;
  }
  function registerRoutes(route){
    route('GET','/learning/today',c=>transaction(db,()=>present(ensure(c.user),c.user)),{summary:'Stable own local-day plan with budget-sized sequential lesson goals and due reviews'});
    route('POST','/learning/today/adjust',c=>transaction(db,()=>{
      if(Object.keys(c.body).some(k=>!['plan_id','revision','remaining_minutes'].includes(k)))fail(400,'VALIDATION_ERROR','Supply only plan_id, revision and remaining_minutes.');
      const budget=integer(c.body.remaining_minutes,'remaining_minutes',{min:5,max:90}),row=ensure(c.user),saved=validatePlan(row,c.body),before=present(row,c.user);
      const revision=before.plan_revision+1,profile=profiles.getProfile(c.user.id),kept=before.items.filter(i=>i.status==='completed').map(i=>({...i,frozen_complete:true}));
      // The weekly schedule stays frozen. Only unfinished workload is rebuilt.
      const scheduledDay=Array.isArray(saved)?before.scheduled_day!==false:saved.scheduled_day;
      const pendingLesson=before.items.find(i=>i.kind==='lesson'&&!i.lesson_completed);
      const preferred=pendingLesson?.session_id?db.prepare('SELECT id,lesson_id,content_version,state FROM learning_sessions WHERE id=? AND user_id=? AND completed_at IS NULL').get(pendingLesson.session_id,c.user.id):pendingLesson?{lesson_id:pendingLesson.lesson_id,content_version:pendingLesson.content_version}:null;
      const selected=makeItems(c.user,profile,scheduledDay,budget,revision,kept,preferred);
      const payload={version:2,revision,scheduled_day:before.scheduled_day,preferred_days:before.preferred_days,focus:profile.focus,items:[...kept,...selected.items],deferred:selected.deferred,adjustments:[...(Array.isArray(saved)?[]:saved.adjustments??[]),{revision,at:clock().toISOString(),previous_budget_minutes:row.budget_minutes,remaining_minutes:budget}]};
      row.budget_minutes=budget;row.items=JSON.stringify(payload);
      db.prepare('UPDATE daily_learning_plans SET budget_minutes=?,items=? WHERE id=? AND user_id=?').run(budget,row.items,row.id,c.user.id);
      return present(row,c.user);
    }),{summary:'Explicitly resize remaining daily work with revision checking; preserve completed goals, lesson drafts and profile'});
    route('POST','/learning/today/items/:item_id/start',c=>transaction(db,()=>{
      if(Object.keys(c.body).some(k=>!['plan_id','revision'].includes(k)))fail(400,'VALIDATION_ERROR','Supply only plan_id and revision.');
      const row=ensure(c.user);validatePlan(row,c.body);const plan=present(row,c.user),item=plan.items.find(i=>i.id===c.params.item_id);
      if(!item)fail(404,'NOT_FOUND','Daily item not found.');
      if(item.kind!=='lesson')fail(400,'LESSON_REQUIRED','Use the review item route.');
      if(item.status==='completed')fail(409,'DAILY_GOAL_COMPLETED','Phần học hôm nay đã xong. Bạn có thể học thêm ngoài kế hoạch.');
      const result=item.session_id?startSession(c.user,item.lesson_id,item.content_version,item.session_id):startSession(c.user,item.lesson_id,item.content_version);
      const saved=JSON.parse(row.items),raw=Array.isArray(saved)?saved:saved.items;
      raw.find(i=>i.id===item.id).session_id=result.id;row.items=JSON.stringify(saved);db.prepare('UPDATE daily_learning_plans SET items=? WHERE id=?').run(row.items,row.id);
      c.status=result.replayed?200:201;
      return {session:result,plan:present(row,c.user),daily_goal:{plan_id:row.id,item_id:item.id,target_cursor:item.workload?.target_cursor??null}};
    }),{summary:'Start or resume the exact pinned lesson/version for a daily goal without AI or losing existing work'});
  }
  return {registerRoutes};
}
