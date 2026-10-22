import {randomUUID} from 'node:crypto';
import {fail,text,enumeration} from './validation.mjs';
import {validateMaterialCues,materialCueLimits} from './material-cues.mjs';

const maxCharacters=200000;
function timestamp(value,format){
  const pattern=format==='srt'?/^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/:/^(?:(\d{2,}):)?(\d{2}):(\d{2})\.(\d{3})$/;
  const match=pattern.exec(value);if(!match||Number(match[2])>59||Number(match[3])>59)fail(400,'INVALID_SUBTITLE','Timestamp chưa hợp lệ.');
  const result=((Number(match[1]??0)*60+Number(match[2]))*60+Number(match[3]))*1000+Number(match[4]);
  if(!Number.isSafeInteger(result))fail(400,'INVALID_SUBTITLE','Timestamp quá lớn.');return result;
}
const entities={amp:'&',lt:'<',gt:'>',nbsp:' ',lrm:'',rlm:'',quot:'"',apos:"'"};
function plain(source,warn){
  // Convert styling to plain text, never HTML. Decode entities once, after stripping.
  let value=source.replace(/<[^>\n]*>/g,()=>{warn('MARKUP_REMOVED');return '';});
  value=value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|nbsp|lrm|rlm|quot|apos);/gi,(all,key)=>{
    if(key[0]!=='#')return entities[key.toLowerCase()];
    const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):all;
  });
  if(value.includes('\u0000'))fail(400,'INVALID_SUBTITLE','Không hỗ trợ ký tự NUL.');
  return value.trim();
}
export function parseMaterialSubtitles(source,format,duration){
  const warnings=new Map(),warn=code=>warnings.set(code,(warnings.get(code)??0)+1);
  const input=text(source,'content',{max:maxCharacters}).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  if(input.includes('\u0000'))fail(400,'INVALID_SUBTITLE','Không hỗ trợ ký tự NUL.');
  const blocks=input.split(/\n[\t ]*\n+/),cues=[];
  if(format==='vtt'){
    const header=blocks.shift().split('\n');
    if(!/^WEBVTT(?:[\t ].*)?$/.test(header[0])||header.some(v=>v.includes('-->')))fail(400,'INVALID_SUBTITLE','VTT cần WEBVTT và dòng trống trước câu đầu.');
    if(header.some(v=>/X-TIMESTAMP-MAP/i.test(v)))fail(400,'UNSUPPORTED_SUBTITLE','Chưa hỗ trợ X-TIMESTAMP-MAP. Hãy dùng timestamp khớp file audio.');
    if(header.length>1)warn('HEADER_METADATA_IGNORED');
  }else if(/^WEBVTT/.test(input))fail(400,'INVALID_SUBTITLE','File là VTT; hãy chọn định dạng VTT.');
  for(const block of blocks){
    const lines=block.trim().split('\n');if(!lines[0])continue;
    if(format==='vtt'&&/^(NOTE(?:[\t ]|$)|STYLE$|REGION$)/.test(lines[0])){warn('METADATA_BLOCK_IGNORED');continue;}
    const index=lines[0].includes('-->')?0:1;
    if(index===1&&(format==='srt'&&!/^\d+$/.test(lines[0])||!lines[1]?.includes('-->')))fail(400,'INVALID_SUBTITLE','Không tìm thấy dòng thời gian.',{cue_index:cues.length});
    const timing=/^(\S+)[\t ]+-->[\t ]+(\S+)(.*)$/.exec(lines[index]);
    if(!timing)fail(400,'INVALID_SUBTITLE','Dòng thời gian chưa hợp lệ.',{cue_index:cues.length});
    if(timing[3].trim()){if(format==='srt')fail(400,'UNSUPPORTED_SUBTITLE','Chưa hỗ trợ tọa độ SRT.');warn('CUE_SETTINGS_IGNORED');}
    const target=plain(lines.slice(index+1).join('\n'),warn);
    cues.push({id:randomUUID(),start_ms:timestamp(timing[1],format),end_ms:timestamp(timing[2],format),text:target,translation:''});
    if(cues.length>materialCueLimits.max_cues)fail(400,'VALIDATION_ERROR','Tối đa200 câu phụ đề mỗi học liệu.');
  }
  if(!cues.length)fail(400,'INVALID_SUBTITLE','File không có câu phụ đề.');
  return {cues:validateMaterialCues(cues,duration),warnings:[...warnings].map(([code,count])=>({code,count}))};
}
const encode=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function time(ms,format){const h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60;return [h,m,s].map(v=>String(v).padStart(2,'0')).join(':')+(format==='srt'?',':'.')+String(ms%1000).padStart(3,'0');}

export function materialSubtitleService(db){
  function own(id,user){const m=db.prepare('SELECT id,duration_ms FROM learning_materials WHERE id=? AND user_id=?').get(id,user.id);if(!m)fail(404,'NOT_FOUND','Learning material not found.');return m;}
  function current(id){const r=db.prepare('SELECT revision,cues FROM learning_material_cues WHERE material_id=?').get(id);return {revision:r?.revision??0,cues:r?JSON.parse(r.cues):[]};}
  function registerRoutes(route){
    route('POST','/learning/materials/:id/cues/preview-import',c=>{
      const m=own(c.params.id,c.user);
      if(Object.keys(c.body).some(k=>!['format','content'].includes(k)))fail(400,'VALIDATION_ERROR','Send only format and content.');
      const format=enumeration(c.body.format,'format',['srt','vtt']),parsed=parseMaterialSubtitles(c.body.content,format,m.duration_ms);
      return {material_id:m.id,format,revision:current(m.id).revision,...parsed,saved:false,alignment:'supplied_timestamps',translation_generated:false,limits:{...materialCueLimits,max_subtitle_characters:maxCharacters}};
    },{summary:'Preview private SRT/VTT as draft cues; validates supplied timings but never writes, aligns audio or calls AI'});
    route('GET','/learning/materials/:id/cues/export',c=>{
      const m=own(c.params.id,c.user),format=enumeration(c.query.get('format')??'vtt','format',['srt','vtt']),source=current(m.id);
      if(source.cues.some(cue=>/\r|\n[\t ]*\n|\u0000/.test(cue.text)))fail(400,'UNSUPPORTED_SUBTITLE','Hãy bỏ dòng trống, ký tự CR hoặc NUL bên trong câu trước khi xuất phụ đề.');
      const content=(format==='vtt'?'WEBVTT\n\n':'')+source.cues.map((cue,index)=>(format==='srt'?`${index+1}\n`:'')+`${time(cue.start_ms,format)} --> ${time(cue.end_ms,format)}\n${encode(cue.text)}`).join('\n\n')+(source.cues.length?'\n':'');
      return {material_id:m.id,revision:source.revision,format,content,mime_type:format==='vtt'?'text/vtt;charset=utf-8':'application/x-subrip;charset=utf-8',filename:`material-${m.id}.${format}`,cue_count:source.cues.length,translation_included:false};
    },{summary:'Export saved own cue text and original timestamps as SRT/VTT inside a JSON envelope; no private audio included'});
  }
  return {registerRoutes};
}
