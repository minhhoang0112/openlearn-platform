import {normalize} from './validation.mjs';

const canonical=value=>normalize(value).replace(/[‘’]/g,"'").replace(/[.,;:…]+$/gu,'').trim();
const parts=value=>[...new Set(value.split(/[;,\n]+/u).map(canonical).filter(Boolean))];
const verdict=(correct,status,reason,message)=>({correct,verdict:status,reason,message});
const wrong=()=>verdict(false,'incorrect','different_answer','Câu trả lời chưa khớp nghĩa hoặc từ cần học.');

// Accept absent Vietnamese marks, not contradictory marks: nghi -> nghĩ is
// omission; nghỉ -> nghĩ changes an existing tone and is not automatically right.
function missingMarks(typed,expected){
 const units=s=>Array.from(s.normalize('NFC')).map(c=>({base:c==='đ'?'d':c.normalize('NFD').replace(/\p{M}/gu,''),marks:c==='đ'?['stroke']:Array.from(c.normalize('NFD')).filter(x=>/\p{M}/u.test(x))}));
 const a=units(typed),b=units(expected);return a.length===b.length&&a.every((x,i)=>x.base===b[i].base&&x.marks.every(m=>b[i].marks.includes(m)));
}
function oneEdit(a,b){
 if(a===b||Math.max(a.length,b.length)<5||Math.max(a.length,b.length)>80||Math.abs(a.length-b.length)>1)return false;
 let i=0;while(i<a.length&&i<b.length&&a[i]===b[i])i++;
 if(a.length===b.length)return a.slice(i+1)===b.slice(i+1)||(a[i]===b[i+1]&&a[i+1]===b[i]&&a.slice(i+2)===b.slice(i+2));
 return a.length>b.length?a.slice(i+1)===b.slice(i):a.slice(i)===b.slice(i+1);
}

export function gradeWrittenVocabulary(q,answer){
 if(q.type==='match')return (q.accepted||[]).includes(normalize(answer))?verdict(true,'exact','exact','Ghép đúng.'):wrong();
 // Listening/spelling tasks deliberately keep the exact transcription rule.
 if(q.type==='dictation'){
  const norm=value=>q.dictation_content==='example'?normalize(value).replace(/[.,!?;:…]+$/gu,'').replace(/[‘’]/g,"'"):normalize(value);
  return (q.accepted||[]).includes(norm(answer))?verdict(true,'exact','exact','Câu trả lời chính xác.'):wrong();
 }
 const typed=canonical(answer),accepted=[...new Set((q.accepted||[q.expected]).filter(x=>typeof x==='string').map(canonical).filter(Boolean))];
 if(!typed)return wrong();
 if(accepted.includes(typed))return verdict(true,'exact','accepted_answer','Câu trả lời đúng.');
 const alternatives=[...new Set(accepted.flatMap(parts))],provided=parts(typed);
 if(provided.length&&provided.every(p=>alternatives.includes(p)))return verdict(true,'equivalent','meaning_order','Đúng nghĩa; thứ tự các nghĩa không ảnh hưởng kết quả.');
 const vietnamese=q.answer_language?q.answer_language==='vi':q.answer_mode!=='synonyms'&&q.answer_mode!=='speech'&&q.direction!=='definition_to_term';
 if(vietnamese&&provided.length&&provided.every(p=>alternatives.some(target=>missingMarks(p,target))))return verdict(true,'close','missing_vietnamese_marks','Đúng nghĩa, đã chấp nhận dù thiếu dấu tiếng Việt. Xem lại cách viết có dấu bên dưới.');
 if(provided.length&&provided.every(p=>alternatives.some(target=>p===target||oneEdit(p,target))))return verdict(false,'close','possible_typo','Gần đúng, có thể bạn gõ nhầm ký tự. Chưa tính là đúng; hãy đối chiếu đáp án và luyện lại.');
 return wrong();
}
