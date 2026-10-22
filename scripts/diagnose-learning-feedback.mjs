// Explicit one-call diagnosis: records shapes/finish reasons, never headers or key.
import {writeFileSync} from 'node:fs';
import {geminiProvider} from '../server/providers.mjs';
if(!process.argv.includes('--live'))throw new Error('Explicit --live required.');
process.loadEnvFile('.env');
const report={model:process.env.GEMINI_MODEL};
const provider=geminiProvider({key:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL,timeoutMs:20000,fetchImpl:async(...args)=>{
  const r=await fetch(...args);report.http_status=r.status;
  const body=await r.clone().json().catch(()=>null),candidate=body?.candidates?.[0];
  report.finish_reason=candidate?.finishReason;report.token_usage=body?.usageMetadata;
  const raw=candidate?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('')||'';report.output_characters=raw.length;
  try{const v=JSON.parse(raw);report.root_keys=Object.keys(v);report.field_types=Object.fromEntries(Object.entries(v).map(([k,v])=>[k,Array.isArray(v)?'array':typeof v]));report.correction_shapes=v.corrections?.map(c=>({keys:Object.keys(c),original_present:'I am student. I study information technology. I want work with computer systems.'.includes(c.original),no_change:c.original===c.corrected}));report.task_relevance=v.task_relevance;}catch{report.output_is_json=false;}
  return r;
}});
try{await provider.generate('learning_feedback',{learner_text:'I am student. I study information technology. I want work with computer systems.',task:{type:'writing_task',prompt:'Write three sentences about yourself, your studies and the job you want.',rubric:['Use I am for a role.','Keep the meaning.']},instruction:'Return concise Vietnamese feedback. Use at most three corrections quoting exact text, three strengths and two next-practice tasks. Do not change personal facts. No scores.'});report.provider_parse_passed=true;}catch(e){report.error_code=e.code;report.error_message=e.message;}
writeFileSync('docs/learning-feedback-diagnostic.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
