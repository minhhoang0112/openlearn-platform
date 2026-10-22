// Local release smoke on isolated test databases; no .env or live AI provider.
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const scripts=[
  'verify-v2-material-subtitles-fe.mjs',
  'verify-v2-material-cues-fe.mjs',
  'v2-browser-integration.mjs',
  'v2-browser-listening.mjs',
  'verify-v2-phrases-fe.mjs',
  'study-browser-qa.mjs',
  'functional-browser-qa.mjs'
];
const report={date:new Date().toISOString(),scope:'Built frontend snapshot; isolated local test databases, no live AI calls',suites:[]};
for(const name of scripts){
  const started=Date.now(),r=spawnSync(process.execPath,[`scripts/${name}`],{encoding:'utf8',timeout:90000,windowsHide:true});
  const output=(r.stdout??'')+(r.stderr??'');
  const result={script:name,passed:r.status===0,milliseconds:Date.now()-started,...(r.status===0?{}:{failure:output.slice(-2500),error:r.error?.message})};
  report.suites.push(result);console.log(JSON.stringify(result));
}
report.passed=report.suites.every(v=>v.passed);
writeFileSync('docs/release-browser-validation.json',JSON.stringify(report,null,2)+'\n');
process.exitCode=report.passed?0:1;
