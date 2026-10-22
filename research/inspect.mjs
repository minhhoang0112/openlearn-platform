import fs from 'node:fs';
const s=fs.readFileSync('research/index.js','utf8');
for(const p of ['curated','learning-path','/courses','/paths','supabase','api.openquiz','Vocabulary in Use','path:']) {
 let i=-1,n=0; while((i=s.toLowerCase().indexOf(p.toLowerCase(),i+1))>=0&&n++<8) console.log(p,s.slice(Math.max(0,i-120),i+240));
}
