import {enumeration,integer,pagination,fail} from './validation.mjs';
import {presentLearningFeedback} from './learning-feedback.mjs';

const skillDefinitions=[
  ['listening','Nghe','listen_comprehension'],['grammar','Ngữ pháp','grammar_practice'],
  ['vocabulary','Từ/cụm trong ngữ cảnh','vocabulary_in_context'],['pronunciation','Phát âm','pronunciation_practice'],
  ['speaking','Nói','speaking_task'],['writing','Viết','writing_task'],['reading','Đọc hiểu','reading_comprehension']
];
const zero=()=>({submitted_tasks:0,distinct_tasks:0,graded_tasks:0,correct:0,unassisted_graded:0,unassisted_correct:0,assisted_graded:0,assisted_correct:0,unknown_support:0,self_review_tasks:0,last_practised_at:null});
const rate=(a,b)=>b?Math.round(a/b*10000)/100:null;
const dateKey=(value,timezone)=>new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(value);

export function learningProgressService(db,profiles,mistakes,{clock=()=>new Date(),listening}={}){
  function progress(user,days){
    const timezone=profiles.getProfile(user.id).timezone,instant=clock(),today=dateKey(instant,timezone);
    const start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-days+1);
    const first=start.toISOString().slice(0,10),cutoff=new Date(start.getTime()-36*3600000).toISOString();
    const calendar=new Map();
    for(let i=0;i<days;i++){const date=new Date(start);date.setUTCDate(date.getUTCDate()+i);const key=date.toISOString().slice(0,10);calendar.set(key,{date:key,lesson_submissions:0,mistake_reviews:0});}
    const skills=skillDefinitions.map(([key,label,type])=>({key,label,type,...zero()})),seen=new Map(skills.map(s=>[s.key,new Set()]));
    const rows=db.prepare('SELECT a.*,s.lesson_id,s.content_version,l.content FROM learning_step_attempts a JOIN learning_sessions s ON s.id=a.session_id JOIN learning_lesson_versions l ON l.lesson_id=s.lesson_id AND l.version=s.content_version WHERE s.user_id=? AND a.created_at>=? AND a.created_at<=? ORDER BY a.created_at').all(user.id,cutoff,instant.toISOString());
    let totalSubmissions=0;
    for(const row of rows){
      const day=calendar.get(dateKey(new Date(row.created_at),timezone));if(!day)continue;day.lesson_submissions++;totalSubmissions++;
      const step=JSON.parse(row.content).steps.find(s=>s.id===row.step_id),skill=skills.find(s=>s.type===step?.type);if(!skill)continue;
      const feedback=JSON.parse(row.feedback);skill.submitted_tasks++;seen.get(skill.key).add(JSON.stringify([row.lesson_id,row.content_version,row.step_id]));skill.last_practised_at=row.created_at;
      if(feedback.assessment_status==='graded'){
        skill.graded_tasks++;if(feedback.correct===true)skill.correct++;
        if(!Array.isArray(feedback.assistance_used))skill.unknown_support++;
        else if(feedback.assistance_used.length){skill.assisted_graded++;if(feedback.correct===true)skill.assisted_correct++;}
        else{skill.unassisted_graded++;if(feedback.correct===true)skill.unassisted_correct++;}
      }else if(feedback.assessment_status==='self_review')skill.self_review_tasks++;
    }
    const aiFeedback={reviews_created:0,writing:0,speaking_transcript:0,last_created_at:null};
    const audioFeedback={reviews_created:0,last_created_at:null,assessment_scope:'qualitative_audio_feedback',pronunciation_score:null};
    for(const row of db.prepare('SELECT created_at FROM learning_audio_reviews WHERE user_id=? AND created_at>=? AND created_at<=? ORDER BY created_at').all(user.id,cutoff,instant.toISOString())){
      if(!calendar.has(dateKey(new Date(row.created_at),timezone)))continue;
      audioFeedback.reviews_created++;audioFeedback.last_created_at=row.created_at;
    }
    for(const row of db.prepare('SELECT content,created_at FROM learning_ai_feedback WHERE user_id=? AND created_at>=? AND created_at<=? ORDER BY created_at').all(user.id,cutoff,instant.toISOString())){
      if(!calendar.has(dateKey(new Date(row.created_at),timezone)))continue;
      const modality=JSON.parse(row.content).modality;aiFeedback.reviews_created++;aiFeedback.last_created_at=row.created_at;
      if(modality==='writing_text')aiFeedback.writing++;if(modality==='speaking_transcript')aiFeedback.speaking_transcript++;
    }
    for(const skill of skills){
      skill.distinct_tasks=seen.get(skill.key).size;skill.accuracy_percent=rate(skill.correct,skill.graded_tasks);skill.unassisted_accuracy_percent=rate(skill.unassisted_correct,skill.unassisted_graded);
      skill.ai_feedback_count=skill.key==='writing'?aiFeedback.writing:skill.key==='speaking'?aiFeedback.speaking_transcript:0;
      skill.ai_audio_review_count=skill.key==='pronunciation'?audioFeedback.reviews_created:0;
      skill.evidence_status=skill.graded_tasks?'graded_practice':skill.self_review_tasks?'self_review_only':'not_assessed';delete skill.type;
      if(skill.ai_audio_review_count)skill.evidence_status='ai_audio_feedback';
    }
    const reviews=db.prepare('SELECT r.feedback,r.created_at FROM learning_mistake_reviews r JOIN learning_mistakes m ON m.id=r.mistake_id WHERE m.user_id=? AND r.created_at>=? AND r.created_at<=?').all(user.id,cutoff,instant.toISOString());
    const reviewStats={submitted:0,correct:0,unassisted_correct:0};
    for(const row of reviews){const day=calendar.get(dateKey(new Date(row.created_at),timezone));if(!day)continue;
      day.mistake_reviews++;reviewStats.submitted++;const f=JSON.parse(row.feedback);if(f.correct)reviewStats.correct++;if(f.correct&&f.independent)reviewStats.unassisted_correct++;
    }
    const counts=db.prepare('SELECT COUNT(*) sessions_started,SUM(completed_at IS NULL) active_sessions,SUM(completed_at IS NOT NULL) completed_sessions,COUNT(DISTINCT CASE WHEN completed_at IS NOT NULL THEN lesson_id END) unique_lessons_completed FROM learning_sessions WHERE user_id=?').get(user.id);
    const programs=db.prepare('SELECT * FROM learning_programs ORDER BY kind,id').all().map(p=>{
      const lessons=db.prepare('SELECT l.lesson_id,l.version,EXISTS(SELECT 1 FROM learning_sessions s WHERE s.user_id=? AND s.lesson_id=l.lesson_id AND s.content_version=l.version AND s.completed_at IS NOT NULL) completed FROM learning_lesson_versions l WHERE l.program_id=? AND l.published=1 AND l.version=(SELECT MAX(version) FROM learning_lesson_versions WHERE lesson_id=l.lesson_id AND published=1)').all(user.id,p.id);
      const completed=lessons.filter(l=>l.completed).length;
      return {id:p.id,title:p.title,kind:p.kind,status:p.status,published_lessons:lessons.length,completed_lessons:completed,completion_percent:rate(completed,lessons.length)};
    });
    return {scope:'learning_v2',timezone,generated_at:instant.toISOString(),window:{days,from_local_date:first,to_local_date:today},lifetime:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,v??0])),programs,skills,
      window_activity:{lesson_submissions:totalSubmissions,mistake_reviews:reviewStats.submitted,active_days:[...calendar.values()].filter(d=>d.lesson_submissions||d.mistake_reviews).length},daily_activity:[...calendar.values()],review_practice:reviewStats,mistakes:mistakes.summary(user.id),ai_feedback:aiFeedback,audio_feedback:audioFeedback,listening_practice:listening?.summary(user.id)??null,
      limitations:['Số liệu này tính các bài trong lộ trình mới và lượt ôn Sổ lỗi; chưa gồm mọi công cụ luyện tập khác.','Tỷ lệ đúng chỉ phản ánh những câu đã làm, không phải trình độ tiếng Anh tổng thể.','Nói và viết có thể nhận nhận xét AI riêng khi bạn yêu cầu; nhận xét này không tạo điểm chuẩn hóa hoặc đánh giá phát âm.','Chưa đo thời gian học thực tế hoặc ước tính trình độ, điểm chứng chỉ.']};
  }
  function registerRoutes(route){
    route('GET','/learning/progress',c=>progress(c.user,integer(c.query.get('days')??30,'days',{min:1,max:90})),{summary:'Own evidence-based V2 progress by local date; no fabricated skill or proficiency scores'});
    route('GET','/learning/history',c=>{
      const status=enumeration(c.query.get('status')??'all','status',['all','active','completed']),programId=c.query.get('program_id')??'',{limit,offset}=pagination(c.query);
      if(programId&&!db.prepare('SELECT 1 FROM learning_programs WHERE id=?').get(programId))fail(404,'NOT_FOUND','Program not found.');
      const condition="s.user_id=? AND (?='all' OR (?='active' AND s.completed_at IS NULL) OR (?='completed' AND s.completed_at IS NOT NULL)) AND (?='' OR l.program_id=?)";
      const args=[c.user.id,status,status,status,programId,programId];
      const rows=db.prepare(`SELECT s.*,l.title,l.program_id,l.content,(SELECT COUNT(*) FROM learning_step_attempts a WHERE a.session_id=s.id) submitted_steps FROM learning_sessions s JOIN learning_lesson_versions l ON l.lesson_id=s.lesson_id AND l.version=s.content_version WHERE ${condition} ORDER BY s.updated_at DESC,s.id LIMIT ? OFFSET ?`).all(...args,limit,offset);
      return {items:rows.map(r=>({id:r.id,lesson_id:r.lesson_id,content_version:r.content_version,program_id:r.program_id,title:r.title,status:r.completed_at?'completed':'active',completed_steps:JSON.parse(r.state).cursor,total_steps:JSON.parse(r.content).steps.length,submitted_steps:r.submitted_steps,route:`/lesson-run/${r.id}`,created_at:r.created_at,updated_at:r.updated_at,completed_at:r.completed_at})),total:db.prepare(`SELECT COUNT(*) n FROM learning_sessions s JOIN learning_lesson_versions l ON l.lesson_id=s.lesson_id AND l.version=s.content_version WHERE ${condition}`).get(...args).n,limit,offset};
    },{summary:'Own resumable/completed V2 session history with real step counts and pinned content versions'});
    route('GET','/learning/sessions/:id/evidence',c=>{
      const s=db.prepare('SELECT s.*,l.content FROM learning_sessions s JOIN learning_lesson_versions l ON l.lesson_id=s.lesson_id AND l.version=s.content_version WHERE s.id=? AND s.user_id=?').get(c.params.id,c.user.id);
      if(!s)fail(404,'NOT_FOUND','Learning session not found.');
      const body=JSON.parse(s.content),rows=db.prepare('SELECT step_id,response,feedback,created_at FROM learning_step_attempts WHERE session_id=? ORDER BY created_at,step_id').all(s.id);
      const ai=new Map(db.prepare('SELECT * FROM learning_ai_feedback WHERE session_id=? AND user_id=?').all(s.id,c.user.id).map(row=>[row.step_id,presentLearningFeedback(row)]));
      const audioCounts=new Map(db.prepare('SELECT step_id,COUNT(*) n FROM learning_audio_reviews WHERE session_id=? AND user_id=? GROUP BY step_id').all(s.id,c.user.id).map(r=>[r.step_id,r.n]));
      return {session_id:s.id,lesson_id:s.lesson_id,content_version:s.content_version,audio_review_count:[...audioCounts.values()].reduce((n,v)=>n+v,0),audio_reviews_route:`/api/v1/learning/sessions/${s.id}/audio-reviews`,items:rows.map(r=>{const step=body.steps.find(step=>step.id===r.step_id);return {step_id:r.step_id,type:step?.type??null,title:step?.title??null,prompt:step?.prompt??null,options:step?.options??null,response:JSON.parse(r.response),feedback:JSON.parse(r.feedback),submitted_at:r.created_at,ai_feedback:ai.get(r.step_id)??null,audio_review_count:audioCounts.get(r.step_id)??0};})};
    },{summary:'Read own submitted writing/transcripts and graded evidence after reload; no future answer keys'});
  }
  return {registerRoutes};
}
