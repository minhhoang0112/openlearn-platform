import {readFileSync,existsSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {enumeration,integer,text,fail,pagination} from './validation.mjs';
import {transaction} from './database.mjs';
const manifests=JSON.parse(readFileSync(new URL('./content/learning-v2/sentence-manifest.json',import.meta.url),'utf8'));
const mediaCache=new Map();
function practiceSummary(state){
  const values=Object.values(state.results);
  return {practised_sentences:values.filter(r=>!r.skipped).length,skipped_sentences:values.filter(r=>r.skipped).length,repetitions_self_reported:values.reduce((n,r)=>n+r.repetitions,0),mastered:false,pronunciation_assessed:false};
}
function clipFile(entry,sentence){return new URL(`./content/learning-v2/media/sentences/${entry.lesson_id}-v${entry.content_version}-${sentence.id}.wav`,import.meta.url);}
function readClip(entry,sentence){
  const file=clipFile(entry,sentence),key=file.href;if(mediaCache.has(key))return mediaCache.get(key);
  let bytes;try{bytes=readFileSync(file);}catch{fail(503,'AUDIO_UNAVAILABLE','Chưa có file audio của câu này. Bài học gốc vẫn dùng được.');}
  if(bytes.length<44||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')fail(503,'AUDIO_UNAVAILABLE','File audio chưa hợp lệ.');
  let byteRate=0,size=0;
  for(let p=12;p+8<=bytes.length;){const n=bytes.readUInt32LE(p+4),id=bytes.toString('ascii',p,p+4);if(p+8+n>bytes.length)fail(503,'AUDIO_UNAVAILABLE','File audio chưa đầy đủ.');if(id==='fmt '&&n>=16)byteRate=bytes.readUInt32LE(p+16);if(id==='data')size=n;p+=8+n+(n%2);}
  if(!byteRate||!size)fail(503,'AUDIO_UNAVAILABLE','Audio không có dữ liệu phát được.');
  const value={bytes,duration_ms:Math.round(size/byteRate*1000)};mediaCache.set(key,value);return value;
}
export function listeningPracticeService(db,{clock=()=>new Date()}={}){
  const stamp=()=>clock().toISOString();
  function lesson(id,version){
    const row=version===undefined?db.prepare('SELECT * FROM learning_lesson_versions WHERE lesson_id=? AND published=1 ORDER BY version DESC LIMIT 1').get(id):db.prepare('SELECT * FROM learning_lesson_versions WHERE lesson_id=? AND version=?').get(id,version);
    if(!row)fail(404,'NOT_FOUND','Listening material not found.');return {...row,body:JSON.parse(row.content)};
  }
  const manifest=l=>manifests.find(m=>m.lesson_id===l.lesson_id&&m.content_version===l.version);
  function metadata(l){
    const m=manifest(l),ready=!!m&&m.sentences.every(s=>existsSync(clipFile(m,s)));
    return {lesson_id:l.lesson_id,content_version:l.version,program_id:l.program_id,title:l.title,lesson_kind:l.body.lesson_kind??'lesson',source:'windows_tts',voice:m?.voice??null,sentence_practice_available:ready,sentence_count:ready?m.sentences.length:0,full_audio_url:`/api/v1/learning/media/${encodeURIComponent(l.body.media_id)}`,full_translation:l.body.translation,transcript:l.body.transcript};
  }
  function track(l){
    const meta=metadata(l);if(!meta.sentence_practice_available)fail(409,'SENTENCE_AUDIO_NOT_READY','Chưa chuẩn bị đủ clip từng câu cho phiên bản bài này.');
    const m=manifest(l);
    return {...meta,sentence_source:'separately_synthesized_sentence',aligned_to_full_audio:false,sentences:m.sentences.map(s=>({id:s.id,text:s.text,translation:null,audio_url:`/api/v1/learning/listening/media/${encodeURIComponent(l.lesson_id)}/${l.version}/${s.id}`,duration_ms:readClip(m,s).duration_ms})),guidance:['Nghe câu trước khi xem chữ, nếu cần.','Nghe–dừng–nhắc lại; khi đã hiểu có thể nói bám theo.','Có thể thu âm và nghe lại trên trình duyệt.','Tự xác nhận lượt luyện; ứng dụng chưa chấm phát âm ở đây.']};
  }
  function own(id,user){
    const row=db.prepare('SELECT * FROM listening_practice_sessions WHERE id=? AND user_id=?').get(id,user.id);if(!row)fail(404,'NOT_FOUND','Listening practice session not found.');
    return {...row,state:JSON.parse(row.state),track:track(lesson(row.lesson_id,row.content_version))};
  }
  function view(s){
    return {id:s.id,lesson_id:s.lesson_id,content_version:s.content_version,title:s.track.title,revision:s.revision,status:s.completed_at?'completed':'active',settings:s.state.settings,cursor:s.state.cursor,total_sentences:s.track.sentences.length,current:s.track.sentences[s.state.cursor]??null,track:s.track,results:s.state.results,
      summary:practiceSummary(s.state),created_at:s.created_at,updated_at:s.updated_at,completed_at:s.completed_at};
  }
  function summary(userId){
    const rows=db.prepare('SELECT id,state,updated_at,completed_at FROM listening_practice_sessions WHERE user_id=? ORDER BY updated_at DESC,rowid DESC').all(userId);
    const out={sessions_started:rows.length,completed_sessions:0,active_sessions:0,practised_sentences:0,skipped_sentences:0,repetitions_self_reported:0,last_practised_at:null,resume_session_id:null,resume_route:null,route:'/listening',assessment:'self_reported',listening_accuracy:null,pronunciation_score:null};
    for(const row of rows){
      if(row.completed_at)out.completed_sessions++;else{out.active_sessions++;if(!out.resume_session_id){out.resume_session_id=row.id;out.resume_route=`/listening/practice/${row.id}`;}}
      const values=Object.values(JSON.parse(row.state).results);
      out.practised_sentences+=values.filter(r=>!r.skipped).length;out.skipped_sentences+=values.filter(r=>r.skipped).length;out.repetitions_self_reported+=values.reduce((n,r)=>n+r.repetitions,0);
    }
    out.last_practised_at=db.prepare("SELECT MAX(e.created_at) at FROM listening_practice_events e JOIN listening_practice_sessions s ON s.id=e.session_id WHERE s.user_id=? AND json_extract(e.result,'$.skipped')=0").get(userId).at??null;
    return out;
  }
  function registerRoutes(route){
    route('GET','/learning/listening',()=>({items:db.prepare('SELECT l.lesson_id,l.version FROM learning_lesson_versions l WHERE published=1 AND version=(SELECT MAX(version) FROM learning_lesson_versions WHERE lesson_id=l.lesson_id AND published=1) ORDER BY program_id,position,lesson_id').all().map(r=>metadata(lesson(r.lesson_id,r.version)))}),{summary:'Saved English listening materials with real sentence availability; no AI or guessed timestamps'});
    // Register history before the generic :lesson_id route.
    route('GET','/learning/listening/sessions',c=>{
      const {limit,offset}=pagination(c.query),id=c.query.get('lesson_id')??'';
      const rows=db.prepare("SELECT s.id,s.lesson_id,s.content_version,s.created_at,s.updated_at,s.completed_at,s.state,l.title FROM listening_practice_sessions s JOIN learning_lesson_versions l ON l.lesson_id=s.lesson_id AND l.version=s.content_version WHERE s.user_id=? AND (?='' OR s.lesson_id=?) ORDER BY s.updated_at DESC,s.rowid DESC LIMIT ? OFFSET ?").all(c.user.id,id,id,limit,offset);
      return {items:rows.map(({state,...r})=>{const saved=JSON.parse(state);return {...r,settings:saved.settings,cursor:saved.cursor,summary:practiceSummary(saved),route:`/listening/practice/${r.id}`,status:r.completed_at?'completed':'active'};}),total:db.prepare("SELECT COUNT(*) n FROM listening_practice_sessions WHERE user_id=? AND (?='' OR lesson_id=?)").get(c.user.id,id,id).n,limit,offset};
    },{summary:'Own saved sentence-listening/shadowing session history'});
    route('GET','/learning/listening/:lesson_id',c=>track(lesson(c.params.lesson_id)),{summary:'Full transcript/translation and separately synthesized sentence WAVs; not aligned cuts of the full recording'});
    route('GET','/learning/listening/media/:lesson_id/:version/:sentence_id',c=>{
      const l=lesson(c.params.lesson_id,integer(c.params.version,'version')),m=manifest(l),s=m?.sentences.find(s=>s.id===c.params.sentence_id);if(!s)fail(404,'NOT_FOUND','Sentence audio not found.');
      const {bytes}=readClip(m,s);let start=0,end=bytes.length-1,status=200;
      if(c.req.headers.range){const r=/^bytes=(\d*)-(\d*)$/.exec(c.req.headers.range);if(!r||(!r[1]&&!r[2]))fail(416,'INVALID_RANGE','Supply one byte range.');if(!r[1])start=Math.max(0,bytes.length-Number(r[2]));else{start=Number(r[1]);if(r[2])end=Math.min(end,Number(r[2]));}if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.length)fail(416,'INVALID_RANGE','Range outside audio.');status=206;c.res.setHeader('Content-Range',`bytes ${start}-${end}/${bytes.length}`);}
      c.res.writeHead(status,{'Content-Type':'audio/wav','Content-Length':end-start+1,'Accept-Ranges':'bytes'});c.res.end(bytes.subarray(start,end+1));
    },{summary:'Authenticated versioned sentence WAV with range support and real samples'});
    route('POST','/learning/listening/sessions',c=>transaction(db,()=>{
      const l=lesson(text(c.body.lesson_id,'lesson_id',{max:100}));track(l);
      const raw=c.body.settings??{};if(!raw||typeof raw!=='object'||Array.isArray(raw))fail(400,'VALIDATION_ERROR','settings must be an object.');
      const settings={mode:enumeration(raw.mode,'mode',['listen_repeat','shadowing'],'listen_repeat'),rate:raw.rate??0.9,target_repetitions:integer(raw.target_repetitions??2,'target_repetitions',{min:1,max:5})};
      if(typeof settings.rate!=='number'||!Number.isFinite(settings.rate)||settings.rate<0.5||settings.rate>1.5)fail(400,'VALIDATION_ERROR','rate must be between 0.5 and 1.5.');
      if(c.body.resume!==undefined&&typeof c.body.resume!=='boolean')fail(400,'VALIDATION_ERROR','resume must be boolean.');
      if(c.body.resume!==false){const old=db.prepare("SELECT id FROM listening_practice_sessions WHERE user_id=? AND lesson_id=? AND content_version=? AND completed_at IS NULL AND json_extract(state,'$.settings.mode')=? AND json_extract(state,'$.settings.rate')=? AND json_extract(state,'$.settings.target_repetitions')=? ORDER BY updated_at DESC,rowid DESC LIMIT 1").get(c.user.id,l.lesson_id,l.version,settings.mode,settings.rate,settings.target_repetitions);if(old)return {...view(own(old.id,c.user)),replayed:true};}
      const id=randomUUID(),at=stamp();db.prepare('INSERT INTO listening_practice_sessions VALUES(?,?,?,?,0,?,?,?,NULL)').run(id,c.user.id,l.lesson_id,l.version,JSON.stringify({settings,cursor:0,results:{}}),at,at);c.status=201;return {...view(own(id,c.user)),replayed:false};
    }),{summary:'Start/resume own listening or shadowing practice without grading or AI requests'});
    route('GET','/learning/listening/sessions/:id',c=>view(own(c.params.id,c.user)),{summary:'Resume exact saved sentence, settings and self-reported practice'});
    route('POST','/learning/listening/sessions/:id/sentences/:sentence_id/complete',c=>transaction(db,()=>{
      const s=own(c.params.id,c.user),submissionId=text(c.body.submission_id,'submission_id',{max:100});
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId))fail(400,'VALIDATION_ERROR','submission_id must be a UUID.');
      const hash=createHash('sha256').update(JSON.stringify({sentence_id:c.params.sentence_id,skip:c.body.skip??false,repetitions:c.body.repetitions,self_reviewed:c.body.self_reviewed,reflection:c.body.reflection})).digest('hex');
      const old=db.prepare('SELECT * FROM listening_practice_events WHERE session_id=? AND submission_id=?').get(s.id,submissionId);
      if(old){if(old.request_hash!==hash)fail(409,'IDEMPOTENCY_CONFLICT','Submission ID already used for another completion.');return {session:view(s),result:JSON.parse(old.result),replayed:true};}
      if(integer(c.body.revision,'revision',{min:0})!==s.revision)fail(409,'REVISION_CONFLICT','Phiên đã thay đổi. Hãy tải lại.',{revision:s.revision});
      const current=s.track.sentences[s.state.cursor];if(!current||current.id!==c.params.sentence_id)fail(409,'SENTENCE_OUT_OF_ORDER','Hãy luyện hoặc bỏ qua câu hiện tại.');
      if(c.body.skip!==undefined&&typeof c.body.skip!=='boolean')fail(400,'VALIDATION_ERROR','skip must be boolean.');
      const skipped=c.body.skip===true,repetitions=skipped?0:integer(c.body.repetitions,'repetitions',{min:1,max:20});
      if(!skipped&&c.body.self_reviewed!==true)fail(400,'SELF_REVIEW_REQUIRED','Xác nhận đã tự luyện/nghe lại, không phải điểm AI.');
      if(!skipped&&repetitions<s.state.settings.target_repetitions)fail(400,'INSUFFICIENT_REPETITIONS','Chưa đủ số lượt luyện đã chọn. Có thể luyện thêm hoặc bỏ qua.');
      const result={sentence_id:current.id,skipped,repetitions,reflection:text(c.body.reflection,'reflection',{min:0,max:2000,fallback:''}),assessment:'self_reported',pronunciation_assessed:false};
      const at=stamp();db.prepare('INSERT INTO listening_practice_events VALUES(?,?,?,?,?,?)').run(s.id,submissionId,current.id,hash,JSON.stringify(result),at);
      s.state.results[current.id]=result;s.state.cursor++;s.revision++;s.updated_at=at;if(s.state.cursor===s.track.sentences.length)s.completed_at=at;
      db.prepare('UPDATE listening_practice_sessions SET state=?,revision=?,updated_at=?,completed_at=? WHERE id=?').run(JSON.stringify(s.state),s.revision,at,s.completed_at,s.id);
      return {session:view(s),result,replayed:false};
    }),{summary:'Save explicit self-reported sentence practice or skip, with revisions and idempotency; never invent a pronunciation score'});
  }
  return {registerRoutes,summary};
}
