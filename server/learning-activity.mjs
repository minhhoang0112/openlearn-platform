import {integer,pagination} from './validation.mjs';

// Read existing persisted evidence instead of creating a second progress store.
// Namespaced primary keys keep rewards, reloads and retry requests out of totals.
const evidenceSql=`
SELECT 'study:'||a.id id,s.user_id,a.created_at occurred_at,'vocabulary' kind,t.title,'/study-set/'||s.set_id route,a.word_id
FROM study_answers a JOIN study_sessions s ON s.id=a.session_id JOIN study_sets t ON t.id=s.set_id
UNION ALL
SELECT 'lesson:'||a.session_id||':'||a.submission_id,s.user_id,a.created_at,'lesson',l.title,'/lesson-run/'||s.id,NULL
FROM learning_step_attempts a JOIN learning_sessions s ON s.id=a.session_id JOIN learning_lesson_versions l ON l.lesson_id=s.lesson_id AND l.version=s.content_version
UNION ALL
SELECT 'mistake:'||r.mistake_id||':'||r.submission_id,m.user_id,r.created_at,'mistake','Ôn Sổ lỗi','/mistakes',NULL
FROM learning_mistake_reviews r JOIN learning_mistakes m ON m.id=r.mistake_id
UNION ALL
SELECT 'listening:'||e.session_id||':'||e.submission_id,s.user_id,e.created_at,'listening',l.title,'/listening/practice/'||s.id,NULL
FROM listening_practice_events e JOIN listening_practice_sessions s ON s.id=e.session_id JOIN learning_lesson_versions l ON l.lesson_id=s.lesson_id AND l.version=s.content_version WHERE json_extract(e.result,'$.skipped')=0
UNION ALL
SELECT 'material:'||d.material_id||':'||d.submission_id,m.user_id,d.created_at,'material_dictation',m.title,'/materials/'||m.id,NULL
FROM learning_material_dictations d JOIN learning_materials m ON m.id=d.material_id
UNION ALL
SELECT 'conversation:'||m.id,c.user_id,m.created_at,'conversation',c.title,'/conversation/'||c.set_id,NULL
FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE m.role='user'
UNION ALL
SELECT 'exercise:'||e.id,e.user_id,e.completed_at,'exercise',s.title,'/study-set/'||g.set_id,NULL
FROM exercise_attempts e JOIN generated_content g ON g.id=e.content_id JOIN study_sets s ON s.id=g.set_id WHERE e.completed_at IS NOT NULL
UNION ALL
SELECT 'course:'||s.id,s.user_id,s.completed_at,'course',l.title,'/courses/'||p.course_id||'/lesson/'||l.id,NULL
FROM course_learning_sessions s JOIN course_lessons l ON l.id=s.lesson_id JOIN course_parts p ON p.id=l.part_id WHERE s.completed_at IS NOT NULL
UNION ALL
SELECT 'audio-review:'||r.id,r.user_id,r.created_at,'audio_feedback',l.title,'/lesson-run/'||s.id,NULL
FROM learning_audio_reviews r JOIN learning_sessions s ON s.id=r.session_id JOIN learning_lesson_versions l ON l.lesson_id=s.lesson_id AND l.version=s.content_version
UNION ALL
SELECT 'ai-review:'||r.id,r.user_id,r.created_at,'ai_feedback',l.title,'/lesson-run/'||s.id,NULL
FROM learning_ai_feedback r JOIN learning_sessions s ON s.id=r.session_id JOIN learning_lesson_versions l ON l.lesson_id=s.lesson_id AND l.version=s.content_version
UNION ALL
SELECT 'speaking:'||g.id,g.user_id,g.created_at,'speaking_feedback',s.title,'/ai-study/'||s.id,NULL
FROM generated_content g JOIN study_sets s ON s.id=g.set_id WHERE g.kind IN ('speaking_feedback','pronunciation')
UNION ALL
SELECT 'rating:'||a.id,a.user_id,a.created_at,'srs_rating','Ôn thẻ ghi nhớ','/repetition-study',CAST(a.resource_id AS INTEGER)
FROM activity a WHERE a.kind='srs_rating'`;

export function learningActivityService(db,profiles,{clock=()=>new Date()}={}){
  function activity(user,{days,limit,offset}){
    const timezone=profiles.getProfile(user.id).timezone,instant=clock();
    const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'});
    const dateKey=date=>formatter.format(date),today=dateKey(instant),start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-days+1);
    const calendar=new Map();
    for(let i=0;i<days;i++){const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);const date=d.toISOString().slice(0,10);calendar.set(date,{date,activity_count:0});}
    const cutoff=new Date(start.getTime()-36*3600000).toISOString();
    const rows=db.prepare(`SELECT * FROM (${evidenceSql}) WHERE user_id=? AND occurred_at>=? AND occurred_at<=? ORDER BY occurred_at DESC,id DESC`).all(user.id,cutoff,instant.toISOString());
    const items=[],byKind={},wordIds=new Set();
    for(const row of rows){
      const day=calendar.get(dateKey(new Date(row.occurred_at)));if(!day)continue;
      day.activity_count++;byKind[row.kind]=(byKind[row.kind]||0)+1;
      if(row.word_id!==null)wordIds.add(row.word_id);
      const {user_id,...item}=row;items.push(item);
    }
    return {scope:'cross_engine_activity',timezone,generated_at:instant.toISOString(),window:{days,from_local_date:start.toISOString().slice(0,10),to_local_date:today},
      summary:{active_days:[...calendar.values()].filter(d=>d.activity_count>0).length,total_activities:items.length,distinct_words_practised:wordIds.size,by_kind:byKind},
      daily_activity:[...calendar.values()],items:items.slice(offset,offset+limit),total:items.length,limit,offset,
      limitations:['Hoạt động là lần nộp hoặc đánh giá đã lưu, không phải số bài đã thành thạo hay số phút học.','Chỉ mở trang, bật audio hoặc lưu vị trí nghe chưa được tính là hoạt động học.','Lượt tự đánh giá thẻ trực tiếp trước khi có nhật ký srs_rating không có lịch sử đầy đủ; không tự dựng lại từ trạng thái hiện tại.','Lượt nộp và hoàn tất khóa học cũ không có course_learning_sessions chưa được tổng hợp.']};
  }
  function registerRoutes(route){route('GET','/learning/activity',c=>activity(c.user,{days:integer(c.query.get('days')??30,'days',{min:1,max:90}),...pagination(c.query)}),{summary:'Own persisted activity across learning engines by local date; separate from V2 skill assessment'});}
  return {registerRoutes};
}
