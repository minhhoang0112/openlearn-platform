import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
const captured=JSON.parse(readFileSync('research/captures/visible-toeic-vocabulary.json','utf8'));
for(const s of captured.sets){
  const url=new URL(s.source_url);url.search='';url.hash='';
  s.source_url=url.href;s.source_id=Number(url.pathname.split('/').pop());
  for(const w of s.words)if(!/^\/.*\/$/.test(w.phonetic))w.phonetic='';
}
if(captured.sets.length!==50||captured.sets.some(s=>s.words.length!==12))throw new Error('TOEIC capture must contain all 50 sets and 600 visible entries');
if(new Set(captured.sets.map(s=>s.source_id)).size!==50)throw new Error('Source IDs must be unique');
const library={version:1,captured_at:captured.captured_at,method:captured.source,excluded:captured.excluded,paths:[{id:14,title:'600 Essential words for the TOEIC Exam',tag:'TOEIC',source_url:captured.path_url,expected_set_count:50,sets:captured.sets.sort((a,b)=>a.position-b.position)}]};
const extraFile='research/captures/visible-foundation-work.json';
if(existsSync(extraFile)){
  const extra=JSON.parse(readFileSync(extraFile,'utf8'));
  if(extra.paths.length!==9||extra.paths.some(p=>p.sets.length!==p.expected_set_count))throw new Error('Nền tảng/Công việc capture is not complete');
  for(const p of extra.paths){p.sets.sort((a,b)=>a.position-b.position);library.paths.push(p);}
}
mkdirSync('server/content',{recursive:true});
writeFileSync('server/content/visible-english.json',JSON.stringify(library,null,2)+'\n');
const allWords=library.paths.flatMap(p=>p.sets.flatMap(s=>s.words));
const report={paths:library.paths.length,sets:library.paths.reduce((n,p)=>n+p.sets.length,0),entries:allWords.length,unique_terms:new Set(allWords.map(w=>w.term.toLowerCase())).size,original_extended_content_imported:false,scope:'English vocabulary with Vietnamese definitions',items:library.paths.map(p=>({id:p.id,title:p.title,tag:p.tag,source_url:p.source_url,sets:p.sets.length,entries:p.sets.reduce((n,s)=>n+s.words.length,0),partial_sets:p.sets.filter(s=>s.reported_word_count&&s.words.length<s.reported_word_count).map(s=>({title:s.title,observed:s.words.length,reported:s.reported_word_count}))}))};
writeFileSync('docs/verified-content-inventory.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
