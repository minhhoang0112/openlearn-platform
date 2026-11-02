// Safe diagnostics: never print credentials, provider error bodies, or user content.
import {existsSync,writeFileSync} from 'node:fs';
import {geminiProvider} from '../server/providers.mjs';
import {routingEnvironment} from '../server/ai-routing.mjs';
if(existsSync('.env'))process.loadEnvFile('.env');
const env=process.env,config=routingEnvironment(env),keys=String(env.GEMINI_API_KEY||'').split(',').map(x=>x.trim()).filter(Boolean);
const modelOverride=process.argv.find(x=>x.startsWith('--fast-model='))?.slice(13);
const targets=[{connection:'primary',key:keys[0],model:env.GEMINI_MODEL||'gemini-3.8-flash'},
  {connection:'secondary',key:config.secondaryKey||keys[1],model:modelOverride||config.fastModel}];
const report={checked_at:new Date().toISOString(),synthetic_generation:process.argv.includes('--generate'),connections:[]};
for(const target of targets) {
  const only=process.argv.find(x=>x.startsWith('--connection='))?.slice(13);if(only&&target.connection!==only)continue;
  const item={connection:target.connection,configured:!!target.key,model:target.model};report.connections.push(item);
  if(!target.key)continue;
  try{
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',{headers:{'x-goog-api-key':target.key},signal:AbortSignal.timeout(15000)});
    item.discovery_http=r.status;
    if(!r.ok)continue;
    const data=await r.json();item.model_available=!!data.models?.some(m=>m.name==='models/'+target.model&&m.supportedGenerationMethods?.includes('generateContent'));
    if(item.model_available&&report.synthetic_generation){
      const start=Date.now();
      await geminiProvider({key:target.key,model:target.model,timeoutMs:20000}).generate('translation',{text:'Good morning.',source_language:'en',target_language:'vi'});
      item.generation_ok=true;item.elapsed_ms=Date.now()-start;
    }
  }catch(error){item.generation_ok=false;item.error_code=error.code||'CONNECTION_FAILED';item.provider_http=Number(error.message?.match(/\((\d{3})\)/)?.[1])||null;}
}
report.distinct_credentials=!!targets[0].key&&!!targets[1].key&&targets[0].key!==targets[1].key;
writeFileSync('docs/ai-routing-provider-check.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
