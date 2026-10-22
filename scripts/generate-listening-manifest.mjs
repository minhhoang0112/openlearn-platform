import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {starterLessons} from '../server/content/learning-v2/curriculum.mjs';
const file=new URL('../server/content/learning-v2/sentence-manifest.json',import.meta.url);
const saved=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];
for(const lesson of starterLessons){
  const pieces=lesson.transcript.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[];
  if(!/^[a-z0-9-]+$/.test(lesson.id)||!pieces.length||pieces.length>99)throw new Error('Invalid sentence source.');
  const item={lesson_id:lesson.id,content_version:lesson.version,source:'separately_synthesized_sentence',voice:'Microsoft David Desktop',sentences:pieces.map((text,i)=>({id:'s'+String(i+1).padStart(2,'0'),text}))};
  const previous=saved.find(s=>s.lesson_id===item.lesson_id&&s.content_version===item.content_version);
  if(previous&&JSON.stringify(previous)!==JSON.stringify(item))throw new Error('Sentence source changed without a new content version: '+lesson.id);
  if(!previous)saved.push(item);
}
writeFileSync(file,JSON.stringify(saved,null,2)+'\n');
console.log(`Prepared ${saved.length} versioned listening tracks, ${saved.reduce((n,s)=>n+s.sentences.length,0)} sentences.`);
