import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {starterPrograms,starterLessons} from '../server/content/learning-v2/curriculum.mjs';
const manifest=JSON.parse(readFileSync(new URL('../server/content/learning-v2/sentence-manifest.json',import.meta.url),'utf8'));
const programs=starterPrograms.map(program=>{
  const lessons=starterLessons.filter(l=>l.program_id===program.id).sort((a,b)=>a.position-b.position).map(l=>{
    const entry=manifest.find(m=>m.lesson_id===l.id&&m.content_version===l.version);
    const full=existsSync(new URL(`../server/content/learning-v2/media/${l.media_id}.wav`,import.meta.url));
    const clips=entry?.sentences.every(s=>existsSync(new URL(`../server/content/learning-v2/media/sentences/${l.id}-v${l.version}-${s.id}.wav`,import.meta.url)))??false;
    return {id:l.id,title:l.title,position:l.position,content_version:l.version,lesson_kind:l.lesson_kind??'lesson',objectives:l.objectives,recommended_prerequisites:l.recommended_prerequisites,steps:l.steps.length,graded_tasks:l.steps.filter(s=>s.response_schema==='choice').length,audio_file_present:full,sentence_audio_files_present:clips,sentence_count:entry?.sentences.length??0};
  });
  return {...program,regular_lessons:lessons.filter(l=>l.lesson_kind==='lesson').length,checkpoints:lessons.filter(l=>l.lesson_kind==='checkpoint').length,lessons};
});
const items=programs.flatMap(p=>p.lessons);
const report={source:'local_authored_starter_content',contract:'1.10.0',regular_lessons:items.filter(l=>l.lesson_kind==='lesson').length,checkpoints:items.filter(l=>l.lesson_kind==='checkpoint').length,total_items:items.length,sentence_clips:items.reduce((n,l)=>n+l.sentence_count,0),human_audio_reviewed:false,programs};
if(items.some(l=>!l.audio_file_present||!l.sentence_audio_files_present))throw new Error('Missing curriculum media.');
writeFileSync('docs/learning-curriculum-inventory.json',JSON.stringify(report,null,2)+'\n');
writeFileSync('docs/LEARNING-CURRICULUM.md','# Giáo trình phiên bản đầu — danh mục từ nội dung BE\n\nĐủ 24 bài thường + 3 ôn chặng, 158 clip từng câu. Đủ số lượng biên soạn không đồng nghĩa đã đánh giá trình độ hoặc duyệt audio bởi người thật. Chương trình vẫn gắn nhãn pilot trong API. Không có đáp án trong tài liệu này.\n\n'+programs.map(p=>`## ${p.title}\n\n${p.regular_lessons} bài thường, ${p.checkpoints} ôn chặng.\n\n| ID | Bài | Loại | Bước | Câu chấm | Clip |\n| --- | --- | --- | --- | --- | --- |\n`+p.lessons.map(l=>`| ${l.id} | ${l.title} | ${l.lesson_kind} | ${l.steps} | ${l.graded_tasks} | ${l.sentence_count} |`).join('\n')).join('\n\n')+'\n');
console.log(`Exported ${report.regular_lessons} lessons, ${report.checkpoints} reviews, ${report.sentence_clips} clips; no answer keys.`);
