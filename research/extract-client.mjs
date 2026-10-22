import fs from 'node:fs';
const source = fs.readFileSync('research/index.js', 'utf8');
const patterns = ['/words/wsets', '/learning-paths/', '/study', '/quiz', '/courses/', '/classes', '/user-words', '/srs', '/speaking', '/conversation', '/auth/'];
const sections = patterns.map(pattern => {
  let position = -1, count = 0;
  const matches = [];
  while ((position = source.indexOf(pattern, position + 1)) !== -1 && count++ < 14) matches.push(source.slice(Math.max(0, position - 90), position + 300));
  return { pattern, matches };
});
fs.writeFileSync('research/client-endpoints.json', JSON.stringify(sections, null, 2));
console.log(JSON.stringify(sections));
