import {createHash} from 'node:crypto';
import {fail,text,integer,pagination} from './validation.mjs';
import {transaction} from './database.mjs';

const maxCues=200,maxText=2000,maxTotalText=80000,maxTokens=500;
const uuid=(value,field)=>{const id=text(value,field,{max:100});if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))fail(400,'VALIDATION_ERROR',`${field} must be a UUID.`);return id.toLowerCase();};
const words=value=>value.normalize('NFKC').toLowerCase().replace(/[’‘ʼ]/g,"'").match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu)??[];
export const materialCueLimits={max_cues:maxCues,max_cue_text_characters:maxText,max_total_text_characters:maxTotalText,max_comparison_tokens:maxTokens,min_cue_duration_ms:200,alignment:'manual',ai_required:false};

export function validateMaterialCues(values,duration){
  if(!Array.isArray(values)||values.length>maxCues)fail(400,'VALIDATION_ERROR',`cues must be an array with at most ${maxCues} items.`);
  const ids=new Set();let end=0,total=0;
  return values.map((raw,index)=>{
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['id','start_ms','end_ms','text','translation'].includes(k)))fail(400,'VALIDATION_ERROR','Invalid cue fields.',{cue_index:index});
    const id=uuid(raw.id,'cue.id'),start=integer(raw.start_ms,'start_ms',{min:0,max:duration}),stop=integer(raw.end_ms,'end_ms',{min:0,max:duration});
    if(ids.has(id)||start<end||stop-start<200)fail(400,'INVALID_CUE','Mã câu phải riêng biệt; các câu đúng thứ tự, không chồng nhau và dài ít nhất200ms.',{cue_index:index});
    const target=text(raw.text,'text',{max:maxText}),translation=text(raw.translation,'translation',{min:0,max:maxText,fallback:''});
    const tokens=words(target);if(!tokens.length||tokens.length>maxTokens)fail(400,'VALIDATION_ERROR',`Câu phải có từ1 đến${maxTokens} từ sau chuẩn hóa.`,{cue_index:index});
    total+=target.length+translation.length;if(total>maxTotalText)fail(400,'VALIDATION_ERROR','Total cue text is too long.');
    ids.add(id);end=stop;return {id,start_ms:start,end_ms:stop,text:target,translation};
  });
}

// Exact token comparison, with LCS highlighting only. No fuzzy matching or AI calls.
function compare(expected,answer){
  const a=words(expected),b=words(answer),grid=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
  for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)grid[i][j]=a[i]===b[j]?1+grid[i+1][j+1]:Math.max(grid[i+1][j],grid[i][j+1]);
  const matchedA=new Set(),matchedB=new Set();let i=0,j=0;
  while(i<a.length&&j<b.length){if(a[i]===b[j]){matchedA.add(i++);matchedB.add(j++);}else if(grid[i+1][j]>=grid[i][j+1])i++;else j++;}
  return {matches:a.length===b.length&&matchedA.size===a.length,expected_tokens:a.map((token,index)=>({token,matched:matchedA.has(index)})),answer_tokens:b.map((token,index)=>({token,matched:matchedB.has(index)}))};
}

export function materialCueService(db,{clock=()=>new Date()}={}){
  const stamp=()=>clock().toISOString();
  function own(id,user){const m=db.prepare('SELECT id,duration_ms FROM learning_materials WHERE id=? AND user_id=?').get(id,user.id);if(!m)fail(404,'NOT_FOUND','Learning material not found.');return m;}
  function current(id){const row=db.prepare('SELECT * FROM learning_material_cues WHERE material_id=?').get(id);return {revision:row?.revision??0,cues:row?JSON.parse(row.cues):[],updated_at:row?.updated_at??null};}
  const limits=materialCueLimits;
  function registerRoutes(route){
    route('GET','/learning/materials/:id/cues',c=>{const m=own(c.params.id,c.user);return {material_id:m.id,duration_ms:m.duration_ms,...current(m.id),limits};},{summary:'Own manually timed transcript cues, independent of player and metadata revisions'});
    route('PUT','/learning/materials/:id/cues',c=>transaction(db,()=>{
      const m=own(c.params.id,c.user),old=current(m.id);
      if(Object.keys(c.body).some(k=>!['revision','cues'].includes(k)))fail(400,'VALIDATION_ERROR','Send only revision and cues.');
      if(integer(c.body.revision,'revision',{min:0})!==old.revision)fail(409,'REVISION_CONFLICT','Các câu đã thay đổi. Hãy tải lại trước khi lưu.',{revision:old.revision});
      const cues=validateMaterialCues(c.body.cues,m.duration_ms);
      db.prepare('INSERT INTO learning_material_cues VALUES(?,?,?,?) ON CONFLICT(material_id) DO UPDATE SET revision=excluded.revision,cues=excluded.cues,updated_at=excluded.updated_at').run(m.id,old.revision+1,JSON.stringify(cues),stamp());
      return {material_id:m.id,duration_ms:m.duration_ms,...current(m.id),limits};
    }),{summary:'Atomically replace own manual A-B sentence timings with optimistic revision; no automatic alignment'});
    route('POST','/learning/materials/:id/dictation-attempts',c=>transaction(db,()=>{
      const m=own(c.params.id,c.user);
      if(Object.keys(c.body).some(k=>!['submission_id','cues_revision','cue_id','answer','revealed','give_up'].includes(k)))fail(400,'VALIDATION_ERROR','Unsupported dictation field.');
      const id=uuid(c.body.submission_id,'submission_id'),cueId=uuid(c.body.cue_id,'cue_id'),revision=integer(c.body.cues_revision,'cues_revision',{min:0});
      const answer=text(c.body.answer,'answer',{min:0,max:maxText,fallback:''}),revealed=c.body.revealed??false,giveUp=c.body.give_up??false;
      const answerTokens=words(answer);
      if(typeof revealed!=='boolean'||typeof giveUp!=='boolean'||!giveUp&&!answerTokens.length||answerTokens.length>maxTokens)fail(400,'VALIDATION_ERROR','Nhập câu trả lời tối đa500 từ hoặc chọn Tôi không biết.');
      const hash=createHash('sha256').update(JSON.stringify({cueId,revision,answer,revealed,giveUp})).digest('hex');
      const existing=db.prepare('SELECT request_hash,result FROM learning_material_dictations WHERE material_id=? AND submission_id=?').get(m.id,id);
      if(existing){if(hash!==existing.request_hash)fail(409,'IDEMPOTENCY_CONFLICT','UUID đã dùng cho câu trả lời khác.');return {...JSON.parse(existing.result),replayed:true};}
      const source=current(m.id);
      if(revision!==source.revision)fail(409,'REVISION_CONFLICT','Các câu đã thay đổi. Hãy tải lại bài.',{revision:source.revision});
      const cue=source.cues.find(v=>v.id===cueId);if(!cue)fail(404,'CUE_NOT_FOUND','Không tìm thấy câu trong học liệu.');
      const {matches,...diff}=compare(cue.text,answer),correct=matches&&!giveUp;
      const result={material_id:m.id,submission_id:id,cues_revision:revision,cue:{...cue},answer,correct,assisted:revealed,gave_up:giveUp,independent_correct:correct&&!revealed,assessment:'exact_text_comparison',comparison:'case_punctuation_insensitive_words; apostrophes_preserved',...diff,created_at:stamp()};
      db.prepare('INSERT INTO learning_material_dictations VALUES(?,?,?,?,?)').run(m.id,id,hash,JSON.stringify(result),result.created_at);
      c.status=201;return {...result,replayed:false};
    }),{summary:'Server-checked personal sentence dictation with immutable cue snapshot and UUID retry; no AI or proficiency grade'});
    route('GET','/learning/materials/:id/dictation-attempts',c=>{
      const m=own(c.params.id,c.user),{limit,offset}=pagination(c.query);
      const rows=db.prepare('SELECT result FROM learning_material_dictations WHERE material_id=? ORDER BY created_at DESC,rowid DESC LIMIT ? OFFSET ?').all(m.id,limit,offset);
      const stats=db.prepare("SELECT COUNT(*) attempts,COALESCE(SUM(json_extract(result,'$.independent_correct')=1),0) independent_correct,COALESCE(SUM(json_extract(result,'$.assisted')=1),0) assisted,COALESCE(SUM(json_extract(result,'$.gave_up')=1),0) gave_up FROM learning_material_dictations WHERE material_id=?").get(m.id);
      return {items:rows.map(r=>JSON.parse(r.result)),total:stats.attempts,limit,offset,summary:stats,assessment:'exact_text_comparison',mastery_assessed:false};
    },{summary:'Own dictation history with original cue snapshots; counts are attempts, not mastered skills'});
  }
  return {registerRoutes};
}
