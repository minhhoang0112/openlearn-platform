import { TOEIC_50_SETS } from '../server/toeic_data.mjs';
import { writeFileSync } from 'node:fs';
const groups = new Map();
for (const set of TOEIC_50_SETS) {
  const signature = set.words.map(w => w[0].trim().toLowerCase()).sort().join('|');
  const group = groups.get(signature) || [];
  group.push({ id: set.id, title: set.title }); groups.set(signature, group);
}
const report = {
  generated_at: new Date().toISOString(), source: 'server/toeic_data.mjs',
  sets: TOEIC_50_SETS.length, word_entries: TOEIC_50_SETS.reduce((n,s)=>n+s.words.length,0),
  unique_terms: new Set(TOEIC_50_SETS.flatMap(s=>s.words.map(w=>w[0].toLowerCase().trim()))).size,
  unique_word_lists: groups.size,
  duplicated_lists: [...groups.values()].filter(g=>g.length>1),
  original_content_verified: false,
};
writeFileSync(new URL('../docs/content-audit.json', import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
