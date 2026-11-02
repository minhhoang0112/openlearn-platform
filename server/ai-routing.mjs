import {createHash} from 'node:crypto';
import {geminiProvider} from './providers.mjs';
import {fail} from './validation.mjs';

export const TASK_ROUTES = Object.freeze({
  translation:'fast',word_examples:'fast',speaking_hint:'fast',conversation_hint:'fast',speaking_question:'fast',
  conversation:'standard',communication_reply:'standard',communication_summary:'feedback',grammar:'standard',reading:'standard',flashcards:'standard',
  learning_feedback:'feedback',speaking_feedback:'feedback',pronunciation:'audio',
});
const hash=value=>createHash('sha256').update(value).digest('hex');
const firstKey=value=>String(value||'').split(',').map(x=>x.trim()).find(Boolean)||'';

// Static task assignment. A quota error never changes the assigned credential/model.
export function createGeminiRouter({key,secondaryKey,model='gemini-3.8-flash',fastModel='gemini-3.5-flash-lite',feedbackModel=model,audioModel=model,
  timeoutMs=60000,queueTimeoutMs=20000,maxQueue=20,cacheTtlMs=300000,providerFactory=geminiProvider,clock=Date.now}={}) {
  const legacyKeys=String(key||'').split(',').map(x=>x.trim()).filter(Boolean);
  const primary=firstKey(key),secondary=firstKey(secondaryKey)||legacyKeys[1]||'';
  const lanes={fast:{key:secondary||primary,model:fastModel},standard:{key:primary,model},feedback:{key:primary,model:feedbackModel},audio:{key:primary,model:audioModel}};
  const groups=new Map(),providers=new Map(),pending=new Map(),cache=new Map();
  const counters={provider_requests:0,completed:0,failed:0,cache_hits:0,joined_requests:0};
  const groupFor=credential=>{
    const id=hash(credential);
    if(!groups.has(id))groups.set(id,{running:0,queue:[],cooldownUntil:0});
    return groups.get(id);
  };
  function quota(group) {
    const seconds=Math.ceil((group.cooldownUntil-clock())/1000);
    if(seconds>0)fail(429,'AI_RATE_LIMITED',`Kết nối AI đang tạm nghỉ sau lỗi hạn mức. Thử lại sau khoảng ${seconds} giây.`,{retry_after_seconds:seconds});
  }
  async function acquire(group) {
    quota(group);
    if(!group.running){group.running=1;return;}
    if(group.queue.length>=maxQueue)fail(503,'AI_QUEUE_FULL','AI đang có nhiều yêu cầu chờ. Hãy thử lại sau.');
    await new Promise((resolve,reject)=>{
      const item={resolve,reject,timer:null};
      item.timer=setTimeout(()=>{
        const i=group.queue.indexOf(item);if(i>=0)group.queue.splice(i,1);
        try{fail(503,'AI_QUEUE_TIMEOUT','Yêu cầu chờ AI quá lâu. Hãy thử lại.');}catch(error){reject(error);}
      },queueTimeoutMs);
      group.queue.push(item);
    });
  }
  function release(group) {
    const item=group.queue.shift();
    if(item){clearTimeout(item.timer);item.resolve();}else group.running=0;
  }
  function selection(task,account) {
    const lane=TASK_ROUTES[task];if(!lane)fail(400,'UNSUPPORTED_AI_TASK','Unsupported AI task.');
    return account?{key:firstKey(account.api_key)||primary,model:account.model||model,lane:'personal'}:{...lanes[lane],lane};
  }
  function providerFor(target) {
    const id=hash(target.key)+'/'+target.model;
    if(!providers.has(id)) {
      if(providers.size>=100)providers.delete(providers.keys().next().value);
      providers.set(id,providerFactory({key:target.key,model:target.model,timeoutMs}));
    }
    return providers.get(id);
  }
  async function generate(task,input,scope,account) {
    const target=selection(task,account);
    if(!target.key)fail(503,'AI_NOT_CONFIGURED','Chưa cấu hình kết nối AI cho tác vụ này.');
    const requestId=hash(JSON.stringify([scope,target.key,target.model,task,input]));
    const saved=cache.get(requestId);
    if(saved&&saved.expires>clock()){counters.cache_hits++;return structuredClone(saved.value);}
    if(saved)cache.delete(requestId);
    if(pending.has(requestId)){counters.joined_requests++;return structuredClone(await pending.get(requestId));}
    const work=(async()=>{
      const group=groupFor(target.key);await acquire(group);
      try{
        quota(group);counters.provider_requests++;
        const result=await providerFor(target).generate(task,input);
        counters.completed++;
        // Persisted examples and exercises remain owned by their existing services.
        // Only exact translations have a short additional in-memory cache here.
        if(task==='translation'&&typeof result.translation==='string'&&result.translation.trim()) {
          if(cache.size>=500)cache.delete(cache.keys().next().value);
          cache.set(requestId,{value:structuredClone(result),expires:clock()+cacheTtlMs});
        }
        return result;
      } catch(error) {
        counters.failed++;
        if(error.code==='AI_RATE_LIMITED')group.cooldownUntil=clock()+1000*Math.max(1,Math.min(86400,Number(error.details?.retry_after_seconds)||60));
        throw error;
      } finally {release(group);}
    })();
    pending.set(requestId,work);
    try{return structuredClone(await work);}finally{pending.delete(requestId);}
  }
  const describe=(task='conversation',account)=>{
    const target=selection(task,account);return {provider:'gemini',model:target.model,route:target.lane};
  };
  function status(account) {
    return {policy:account?'personal_model':'task_routing_v1',quota_failover:false,cache:'exact_translation_5m_and_existing_saved_content',
      routes:Object.entries(TASK_ROUTES).map(([task])=>{
        const target=selection(task,account),group=groups.get(hash(target.key));
        return {task,...describe(task,account),configured:!!target.key,connection:account?'personal':target.lane==='fast'&&secondary?'secondary':'primary',
          waiting:group?.queue.length||0,running:group?.running||0,cooldown_seconds:Math.max(0,Math.ceil(((group?.cooldownUntil||0)-clock())/1000))};
      })};
  }
  const forAccount=account=>({name:'gemini',configured:!!(firstKey(account?.api_key)||primary),
    generate:(task,input,scope)=>generate(task,input,scope,account),describe:task=>describe(task,account),status:()=>status(account)});
  return {...forAccount(null),forAccount,status,describe};
}

export function routingEnvironment(env) {
  return {secondaryKey:env.GEMINI_SECONDARY_API_KEY||env.API_Them,fastModel:env.GEMINI_FAST_MODEL||'gemini-3.5-flash-lite',
    feedbackModel:env.GEMINI_FEEDBACK_MODEL||env.GEMINI_MODEL,audioModel:env.GEMINI_AUDIO_MODEL||env.GEMINI_MODEL};
}
