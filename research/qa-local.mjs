import fs from 'node:fs';
const source=fs.readFileSync('research/index.js','utf8');
const origins=[...new Set(source.match(/https:\/\/[^\s"'`<>\\]+/g)||[])].filter(x=>/api|openquiz/.test(x));
console.log(origins.slice(0,30).join('\n'));
