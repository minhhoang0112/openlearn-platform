import {randomUUID,createHash} from 'node:crypto';
import {fail,text,integer,pagination} from './validation.mjs';
import {transaction} from './database.mjs';

const maxAudioBytes=8*1024*1024,maxBodyBytes=12*1024*1024;
const types=['audio/wav','audio/mpeg','audio/mp3','audio/webm','audio/ogg','audio/mp4','audio/m4a'];
const defaults=()=>({position_ms:0,rate:1,loop_start_ms:null,loop_end_ms:null,loop_enabled:false,show_transcript:true});
const uuid=value=>{const id=text(value,'submission_id',{max:100});if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))fail(400,'VALIDATION_ERROR','submission_id must be a UUID.');return id.toLowerCase();};
function audioInput(value,declared){
  if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'AUDIO_REQUIRED','Chọn file audio của bạn.');
  let mime=text(value.mime_type,'mime_type',{max:100}).split(';')[0].trim().toLowerCase();
  if(!types.includes(mime))fail(400,'UNSUPPORTED_AUDIO_TYPE','Dùng WAV, MP3, WebM, Ogg hoặc MP4/M4A.');
  const data=text(value.data,'audio_data',{min:16,max:maxBodyBytes});
  if(data.length>Math.ceil(maxAudioBytes/3)*4)fail(413,'AUDIO_TOO_LARGE','File audio tối đa8MiB.');
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(data)||data.length%4)fail(400,'INVALID_AUDIO','Gửi base64 chuẩn, không có tiền tố data URL.');
  const bytes=Buffer.from(data,'base64');
  if(bytes.length>maxAudioBytes)fail(413,'AUDIO_TOO_LARGE','File audio tối đa8MiB.');
  if(bytes.length<44||bytes.toString('base64')!==data)fail(400,'INVALID_AUDIO','File audio chưa hợp lệ.');
  const ascii=(a,b)=>bytes.toString('ascii',a,b);
  const valid=mime==='audio/wav'?ascii(0,4)==='RIFF'&&ascii(8,12)==='WAVE':mime==='audio/webm'?bytes.subarray(0,4).equals(Buffer.from([26,69,223,163])):mime==='audio/ogg'?ascii(0,4)==='OggS':['audio/mp3','audio/mpeg'].includes(mime)?ascii(0,3)==='ID3'||bytes[0]===255&&(bytes[1]&224)===224:ascii(4,8)==='ftyp';
  if(!valid)fail(400,'INVALID_AUDIO','Chữ ký file không khớp MIME.');
  let duration,source='browser_metadata';
  if(mime==='audio/wav'){
    let byteRate=0,size=0;
    for(let p=12;p+8<=bytes.length;){const n=bytes.readUInt32LE(p+4),id=ascii(p,p+4);if(p+8+n>bytes.length)fail(400,'INVALID_AUDIO','WAV chưa đầy đủ.');if(id==='fmt '&&n>=16)byteRate=bytes.readUInt32LE(p+16);if(id==='data')size+=n;p+=8+n+n%2;}
    if(!byteRate||!size)fail(400,'INVALID_AUDIO','WAV không có mẫu âm thanh.');duration=Math.round(size/byteRate*1000);source='wav_header';
  }else duration=declared;
  duration=integer(duration,'duration_ms',{min:200,max:3600000});
  if(mime==='audio/mp3')mime='audio/mpeg';if(mime==='audio/m4a')mime='audio/mp4';
  return {bytes,mime,duration,source,hash:createHash('sha256').update(bytes).digest('hex')};
}
export function learningMaterialService(db,{clock=()=>new Date()}={}){
  const stamp=()=>clock().toISOString();
  const fields='id,title,transcript,translation,source_note,mime_type,length(audio) audio_bytes,duration_ms,duration_source,revision,created_at,updated_at';
  function own(id,user){const row=db.prepare(`SELECT ${fields} FROM learning_materials WHERE id=? AND user_id=?`).get(id,user.id);if(!row)fail(404,'NOT_FOUND','Learning material not found.');return row;}
  function playback(id){const p=db.prepare('SELECT * FROM learning_material_playback WHERE material_id=?').get(id);return {revision:p?.revision??0,...(p?JSON.parse(p.state):defaults()),updated_at:p?.updated_at??null};}
  const present=row=>({...row,audio_url:`/api/v1/learning/materials/${row.id}/audio`,route:`/materials/${row.id}`,playback:playback(row.id),assessment:'not_assessed'});
  function registerRoutes(route){
    route('GET','/learning/materials/capabilities',()=>({max_audio_bytes:maxAudioBytes,max_json_bytes:maxBodyBytes,accepted_mime_types:types,max_duration_ms:3600000,max_transcript_characters:80000,private_only:true,ai_required:false,external_url_import:false}),{summary:'Personal audio/transcript import limits; no external fetching or AI'});
    route('GET','/learning/materials',c=>{
      const {limit,offset}=pagination(c.query),q=text(c.query.get('q')??'','q',{min:0,max:200}),filter=`%${q}%`;
      const rows=db.prepare('SELECT id,title,mime_type,length(audio) audio_bytes,duration_ms,duration_source,revision,substr(transcript,1,160) transcript_excerpt,created_at,updated_at FROM learning_materials WHERE user_id=? AND title LIKE ? ORDER BY updated_at DESC,rowid DESC LIMIT ? OFFSET ?').all(c.user.id,filter,limit,offset);
      return {items:rows.map(present),total:db.prepare('SELECT COUNT(*) n FROM learning_materials WHERE user_id=? AND title LIKE ?').get(c.user.id,filter).n,limit,offset};
    },{summary:'Own private imported listening library and saved playback; never part of the public curriculum'});
    route('POST','/learning/materials',c=>transaction(db,()=>{
      if(Object.keys(c.body).some(k=>!['submission_id','title','transcript','translation','source_note','audio','duration_ms'].includes(k)))fail(400,'VALIDATION_ERROR','Unsupported import field.');
      const idempotency=uuid(c.body.submission_id),title=text(c.body.title,'title',{max:200}),transcript=text(c.body.transcript,'transcript',{min:0,max:80000,fallback:''}),translation=text(c.body.translation,'translation',{min:0,max:80000,fallback:''}),note=text(c.body.source_note,'source_note',{min:0,max:2000,fallback:''}),audio=audioInput(c.body.audio,c.body.duration_ms);
      const hash=createHash('sha256').update(JSON.stringify({title,transcript,translation,note,audio:audio.hash,mime:audio.mime,duration:audio.duration})).digest('hex');
      const old=db.prepare('SELECT id,import_hash FROM learning_materials WHERE user_id=? AND import_id=?').get(c.user.id,idempotency);
      if(old){if(old.import_hash!==hash)fail(409,'IDEMPOTENCY_CONFLICT','UUID này đã dùng cho học liệu khác.');return {...present(own(old.id,c.user)),replayed:true};}
      const id=randomUUID(),at=stamp();
      db.prepare('INSERT INTO learning_materials VALUES(?,?,?,?,?,?,?,?,?,?,0,?,?,?,?)').run(id,c.user.id,title,transcript,translation,note,audio.mime,audio.bytes,audio.duration,audio.source,idempotency,hash,at,at);
      c.status=201;return {...present(own(id,c.user)),replayed:false};
    }),{summary:'Explicit import of own audio and optional transcript, stored privately with UUID retry protection',maxBodyBytes});
    route('GET','/learning/materials/:id',c=>present(own(c.params.id,c.user)),{summary:'Own transcript, optional translation, audio metadata and exact saved playback state'});
    route('GET','/learning/materials/:id/audio',c=>{
      const row=db.prepare('SELECT audio,mime_type FROM learning_materials WHERE id=? AND user_id=?').get(c.params.id,c.user.id);if(!row)fail(404,'NOT_FOUND','Learning material not found.');
      const bytes=Buffer.from(row.audio);let start=0,end=bytes.length-1,status=200;
      if(c.req.headers.range){const r=/^bytes=(\d*)-(\d*)$/.exec(c.req.headers.range);if(!r||(!r[1]&&!r[2]))fail(416,'INVALID_RANGE','Supply one byte range.');if(!r[1])start=Math.max(0,bytes.length-Number(r[2]));else{start=Number(r[1]);if(r[2])end=Math.min(end,Number(r[2]));}if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.length)fail(416,'INVALID_RANGE','Range outside audio.');status=206;c.res.setHeader('Content-Range',`bytes ${start}-${end}/${bytes.length}`);}
      c.res.writeHead(status,{'Content-Type':row.mime_type,'Content-Length':end-start+1,'Accept-Ranges':'bytes'});c.res.end(bytes.subarray(start,end+1));
    },{summary:'Authenticated private audio bytes with Range206; no base64 in metadata responses'});
    route('PATCH','/learning/materials/:id',c=>transaction(db,()=>{
      const row=own(c.params.id,c.user),allowed=['title','transcript','translation','source_note'];
      if(Object.keys(c.body).some(k=>!['revision',...allowed].includes(k))||!allowed.some(k=>c.body[k]!==undefined))fail(400,'VALIDATION_ERROR','Send revision and at least one text field.');
      if(integer(c.body.revision,'revision',{min:0})!==row.revision)fail(409,'REVISION_CONFLICT','Học liệu đã thay đổi. Hãy tải lại.',{revision:row.revision});
      const values=allowed.map(k=>text(c.body[k]??row[k],k,{min:k==='title'?1:0,max:k==='title'?200:k==='source_note'?2000:80000}));
      db.prepare('UPDATE learning_materials SET title=?,transcript=?,translation=?,source_note=?,revision=revision+1,updated_at=? WHERE id=?').run(...values,stamp(),row.id);return present(own(row.id,c.user));
    }),{summary:'Edit own transcript/translation/title with optimistic revision, leaving audio and playback unchanged'});
    route('PUT','/learning/materials/:id/playback',c=>transaction(db,()=>{
      const row=own(c.params.id,c.user),previous=playback(row.id),allowed=['position_ms','rate','loop_start_ms','loop_end_ms','loop_enabled','show_transcript'];
      if(Object.keys(c.body).some(k=>!['revision',...allowed].includes(k))||!allowed.some(k=>c.body[k]!==undefined))fail(400,'VALIDATION_ERROR','Send revision and playback fields.');
      if(integer(c.body.revision,'revision',{min:0})!==previous.revision)fail(409,'REVISION_CONFLICT','Vị trí nghe đã thay đổi. Hãy tải lại.',{revision:previous.revision});
      const state=Object.fromEntries(allowed.map(k=>[k,c.body[k]===undefined?previous[k]:c.body[k]]));
      state.position_ms=integer(state.position_ms,'position_ms',{min:0,max:row.duration_ms});
      if(typeof state.rate!=='number'||!Number.isFinite(state.rate)||state.rate<0.5||state.rate>1.5)fail(400,'VALIDATION_ERROR','rate must be between0.5 and1.5.');
      for(const k of ['loop_enabled','show_transcript'])if(typeof state[k]!=='boolean')fail(400,'VALIDATION_ERROR',`${k} must be boolean.`);
      for(const k of ['loop_start_ms','loop_end_ms'])if(state[k]!==null)state[k]=integer(state[k],k,{min:0,max:row.duration_ms});
      if((state.loop_start_ms===null)!==(state.loop_end_ms===null)||state.loop_start_ms!==null&&state.loop_end_ms-state.loop_start_ms<200||state.loop_enabled&&state.loop_start_ms===null)fail(400,'INVALID_LOOP','Chọn cả A và B, B sau A ít nhất200ms; cần mốc trước khi bật lặp.');
      const at=stamp();db.prepare('INSERT INTO learning_material_playback VALUES(?,?,?,?) ON CONFLICT(material_id) DO UPDATE SET revision=excluded.revision,state=excluded.state,updated_at=excluded.updated_at').run(row.id,previous.revision+1,JSON.stringify(state),at);
      return playback(row.id);
    }),{summary:'Persist actual player position, speed and manually selected A-B loop; no fabricated learning grade'});
    route('DELETE','/learning/materials/:id',c=>transaction(db,()=>{
      own(c.params.id,c.user);db.prepare('DELETE FROM learning_materials WHERE id=? AND user_id=?').run(c.params.id,c.user.id);return {deleted:true};
    }),{summary:'Delete own imported file/text/playback; authored curriculum and lesson evidence are untouched'});
  }
  return {registerRoutes};
}
