import { randomUUID } from 'node:crypto';
import { fail,text,enumeration,list,integer,boolean } from './validation.mjs';
import {geminiProvider,ollamaProvider} from './providers.mjs';
import {transaction} from './database.mjs';
const now=()=>new Date().toISOString();

// Optional provider gateway; never scrape/reuse the original application's credentials.
// Gateway returns JSON in the documented contract. No fabricated local AI scores.
export function aiService(db,content,{url,key,provider='gateway',geminiKey,model,timeoutMs=60000}={}) {
  const direct=provider==='gemini'?geminiProvider({key:geminiKey,model,timeoutMs}):null;
  const configured=direct?direct.configured:!!url;
  const userConfig=user=>user?db.prepare('SELECT * FROM user_ai_settings WHERE user_id=?').get(user.id):null;
  function selectedProvider(user){const settings=userConfig(user);if(settings?.provider==='gemini')return geminiProvider({key:settings.api_key||geminiKey,model:settings.model,timeoutMs});if(settings?.provider==='ollama')return ollamaProvider({model:settings.model});return direct;}
  function isConfigured(user){const selected=selectedProvider(user);return selected?selected.configured:configured;}
  async function generate(task,input,user) {
    if(!isConfigured(user))fail(503,'AI_NOT_CONFIGURED','Kết nối AI trong Cài đặt AI để sử dụng tính năng này. Không cần nâng cấp tài khoản.');
    const selected=selectedProvider(user);
    if(selected)return selected.generate(task,input);
    let response;
    try { response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(key?{Authorization:`Bearer ${key}`}:{})},body:JSON.stringify({task,input}),signal:AbortSignal.timeout(timeoutMs)}); }
    catch { fail(502,'AI_PROVIDER_UNAVAILABLE','AI provider could not be reached.'); }
    if(!response.ok)fail(502,'AI_PROVIDER_ERROR','AI provider rejected the request.');
    const body=await response.text();
    if(body.length>200000)fail(502,'AI_INVALID_RESPONSE','AI response is too large.');
    try { const result=JSON.parse(body);if(!result||typeof result!=='object'||Array.isArray(result))throw new Error();return result; } catch { fail(502,'AI_INVALID_RESPONSE','AI provider must return a JSON object.'); }
  }
  const pendingDetails=new Map();
  async function ensureLearningDetails(wordId,user,limited=()=>{}){
      const c={params:{id:wordId},user,limited};
      const id=integer(c.params.id,'word_id'),row=db.prepare('SELECT * FROM words WHERE id=?').get(id);
      if(!row)fail(404,'NOT_FOUND','Word not found.');
      const set=content.setAccess(row.set_id,c.user);
      const read=()=>content.words(set.id,c.user).find(w=>w.id===id);
      const word=read();
      if(word.example.trim()&&word.example_translation?.trim())return word;
      const requestKey=c.user.id+':'+id;
      if(pendingDetails.has(requestKey))return pendingDetails.get(requestKey);
      c.limited(`ai:${c.user.id}`,20,60000);
      const work=(async()=>{
        const result=await generate('word_examples',{
          set:{title:set.title,learning_language:set.learning_language,native_language:set.native_language},
          words:[{word_id:id,term:word.term,definition:word.definition,part_of_speech:word.part_of_speech,example:word.example}],
          instruction:'Supply one natural English example in the supplied sense and its accurate Vietnamese translation. If an existing example is supplied, preserve it EXACTLY and translate that sentence. Supply close English synonyms in this sense where appropriate, separated by semicolons; otherwise an empty string. Do not invent synonyms for proper names or numbers.'
        },c.user);
        const value=result.examples?.[0];
        if(result.examples?.length!==1||value?.word_id!==id||typeof value.example!=='string'||!value.example.trim()||value.example.length>3000||typeof value.translation!=='string'||!value.translation.trim()||value.translation.length>3000||typeof value.synonyms!=='string'||value.synonyms.length>1000||(word.example.trim()&&value.example!==word.example))fail(502,'AI_INVALID_RESPONSE','AI chưa trả về ví dụ và bản dịch phù hợp. Hãy thử lại.');
        // A manual edit or another successful generator takes precedence over an older in-flight request.
        const latest=read();
        if(latest.example!==word.example||latest.example_translation!==word.example_translation||latest.synonyms!==word.synonyms)return latest;
        db.prepare("INSERT INTO word_notes VALUES(?,?,?,?,?,'ai',?) ON CONFLICT(user_id,word_id) DO UPDATE SET example=excluded.example,translation=excluded.translation,synonyms=excluded.synonyms,origin=excluded.origin,updated_at=excluded.updated_at").run(c.user.id,id,value.example.trim(),value.translation.trim(),word.synonyms||value.synonyms,now());
        return read();
      })();
      pendingDetails.set(requestKey,work);
      try{return await work;}finally{pendingDetails.delete(requestKey);}
  }
  function registerRoutes(route) {
    route('POST','/words/:id/learning-details',async c=>ensureLearningDetails(c.params.id,c.user,(...args)=>c.limited(...args)),{summary:'Ensure a personal example, Vietnamese translation and synonyms; cached reads do not consume AI limits'});
    route('GET','/settings/ai',c=>{
      const settings=userConfig(c.user),selected=selectedProvider(c.user);
      return {provider:settings?.provider||direct?.name||'gemini',model:settings?.model||model||'gemini-3.8-flash',configured:isConfigured(c.user),key_configured:selected?.name==='ollama'?false:!!(settings?.api_key||geminiKey),configuration_source:settings?'account':direct?'environment':'gateway',supported_providers:['gemini','ollama'],subscription_required:false};
    },{summary:'Own AI settings without exposing API keys'});
    route('PUT','/settings/ai',c=>{
      const old=userConfig(c.user),name=enumeration(c.body.provider,'provider',['gemini','ollama']);
      const chosen=text(c.body.model,'model',{max:150,fallback:old?.provider===name?old.model:name==='gemini'?(model||'gemini-3.8-flash'):'qwen3:8b'});
      if(!(name==='gemini'?/^[\w.-]+$/:/^[\w./:-]+$/).test(chosen))fail(400,'INVALID_MODEL','Tên model không hợp lệ.');
      const secret=c.body.api_key===undefined?(old?.api_key||''):text(c.body.api_key,'api_key',{min:0,max:500});
      db.prepare('INSERT INTO user_ai_settings VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET provider=excluded.provider,model=excluded.model,api_key=excluded.api_key,updated_at=excluded.updated_at').run(c.user.id,name,chosen,secret,now());
      return {provider:name,model:chosen,configured:isConfigured(c.user),key_configured:!!(secret||geminiKey)};
    },{summary:'Save personal Gemini key or local Ollama model on the backend'});
    route('POST','/settings/ai/test',async c=>{
      c.limited(`ai:${c.user.id}`,20,60000);const result=await generate('conversation',{message:'Say hello in one short English sentence.',language:'en',history:[],words:[]},c.user);
      if(typeof result.reply!=='string'||!result.reply.trim())fail(502,'AI_INVALID_RESPONSE','AI không trả lời được phép thử.');
      return {connected:true,reply:result.reply};
    },{summary:'Test the current user provider with a real request'});
    route('POST','/ai/generate',async c=>{
      c.limited(`ai:${c.user.id}`,20,60000);
      const set=content.setAccess(c.body.set_id,c.user);const kind=enumeration(c.body.kind,'kind',['speaking_question','speaking_feedback','speaking_hint','grammar','reading','flashcards','translation','pronunciation','word_examples']);
      let words=content.words(set.id,c.user);
      if(c.body.word_ids!==undefined){const ids=list(c.body.word_ids,'word_ids',20).map(id=>integer(id,'word_id'));if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!words.some(w=>w.id===id)))fail(400,'INVALID_WORDS','Chọn từ trong bộ đang học.');words=words.filter(w=>ids.includes(w.id));}
      if(kind==='word_examples')words=words.slice(0,20);
      const input={set:{title:set.title,learning_language:set.learning_language,native_language:set.native_language},words:words.slice(0,100).map(({id,term,definition,example})=>({word_id:id,term,definition,example})),instruction:text(c.body.instruction,'instruction',{min:0,max:4000,fallback:''}),transcript:text(c.body.transcript,'transcript',{min:0,max:10000,fallback:''})};
      if(kind==='pronunciation'){
        if(!c.body.audio)fail(400,'AUDIO_REQUIRED','Gửi bản ghi âm để nhận phản hồi phát âm.');
        if(selectedProvider(c.user)?.name!=='gemini')fail(501,'AUDIO_PROVIDER_REQUIRED','Chọn Gemini trong Cài đặt AI để xử lý bản ghi âm.');
        const mime=enumeration(c.body.audio.mime_type,'mime_type',['audio/webm','audio/wav','audio/mp3','audio/mpeg','audio/ogg','audio/mp4','audio/m4a','audio/aac']);
        const data=text(c.body.audio.data,'audio_data',{min:16,max:600000});
        if(!/^[A-Za-z0-9+/]+={0,2}$/.test(data)||data.length%4!==0)fail(400,'INVALID_AUDIO','Dữ liệu âm thanh không hợp lệ.');
        input.audio={mime_type:mime==='audio/mp4'?'audio/m4a':mime,data};
      }
      const result=await generate(kind,input,c.user);
      if(kind==='pronunciation'&&(typeof result.feedback!=='string'||typeof result.transcript!=='string'||!Array.isArray(result.improvements)||result.improvements.some(v=>typeof v!=='string')))fail(502,'AI_INVALID_RESPONSE','AI chưa trả về nhận xét âm thanh hợp lệ.');
      if(kind==='word_examples'){
        if(!Array.isArray(result.examples)||result.examples.length!==input.words.length||new Set(result.examples.map(e=>e?.word_id)).size!==input.words.length)fail(502,'AI_INVALID_RESPONSE','AI chưa trả đủ ví dụ cho các từ đã chọn.');
        const normalized=result.examples.map(e=>{
          if(!e||!input.words.some(w=>w.word_id===e.word_id)||typeof e.example!=='string'||!e.example.trim()||e.example.length>3000||typeof e.translation!=='string'||!e.translation.trim()||e.translation.length>3000||(e.synonyms!==undefined&&typeof e.synonyms!=='string'))fail(502,'AI_INVALID_RESPONSE','Ví dụ hoặc bản dịch từ AI không hợp lệ.');
          return {...e,synonyms:(e.synonyms||'').slice(0,1000)};
        });
        transaction(db,()=>{for(const e of normalized)db.prepare("INSERT INTO word_notes VALUES(?,?,?,?,?,'ai',?) ON CONFLICT(user_id,word_id) DO UPDATE SET example=excluded.example,translation=excluded.translation,synonyms=excluded.synonyms,origin=excluded.origin,updated_at=excluded.updated_at").run(c.user.id,e.word_id,e.example.trim(),e.translation.trim(),e.synonyms,now());});
        result.examples=normalized;
      }
      if(kind==='speaking_question'&&typeof result.question!=='string')fail(502,'AI_INVALID_RESPONSE','Provider must return a question string.');
      if(kind==='speaking_feedback'&&typeof result.feedback!=='string')fail(502,'AI_INVALID_RESPONSE','Provider must return a feedback string.');
      if(kind==='speaking_hint'&&(typeof result.hint!=='string'||typeof result.example!=='string'))fail(502,'AI_INVALID_RESPONSE','Provider must return a hint and example.');
      if(kind==='translation'&&typeof result.translation!=='string')fail(502,'AI_INVALID_RESPONSE','Provider must return a translation string.');
      if(kind==='reading'&&(typeof result.passage!=='string'||!Array.isArray(result.questions)))fail(502,'AI_INVALID_RESPONSE','Provider must return passage and questions.');
      if(kind==='grammar'&&typeof result.explanation!=='string')fail(502,'AI_INVALID_RESPONSE','Provider must return an explanation string.');
      if(kind==='flashcards'&&!Array.isArray(result.words))fail(502,'AI_INVALID_RESPONSE','Provider must return words.');
      const questions=kind==='reading'?result.questions:kind==='grammar'?result.exercises:undefined;
      if(questions!==undefined && (!Array.isArray(questions)||questions.length>30||questions.some(q=>
        !q||typeof (q.q||q.question)!=='string'||!Array.isArray(q.options)||q.options.length<2||q.options.length>8||q.options.some(o=>typeof o!=='string')||!Number.isInteger(q.correct)||q.correct<0||q.correct>=q.options.length
      )))fail(502,'AI_INVALID_RESPONSE','Provider returned invalid practice questions or answer indexes.');
      if(kind==='speaking_feedback')result._submission_transcript=input.transcript;
      if(kind.startsWith('speaking_')){result._target_word_ids=input.words.map(w=>w.word_id);result._instruction=input.instruction;result._speaking_question=text(c.body.question,'question',{min:0,max:4000,fallback:''});}
      const id=randomUUID();db.prepare('INSERT INTO generated_content VALUES(?,?,?,?,?,?)').run(id,c.user.id,set.id,kind,JSON.stringify(result),now());c.status=201;return {id,kind,set_id:set.id,result,provider:selectedProvider(c.user)?.name||'configured_gateway'};
    },{summary:'Optional AI gateway: explicit 503 until configured, no simulated scores'});
    route('GET','/ai/history',c=>({items:db.prepare('SELECT id,set_id,kind,created_at FROM generated_content g WHERE user_id=? AND NOT EXISTS(SELECT 1 FROM exercise_attempts e WHERE e.content_id=g.id) ORDER BY created_at DESC LIMIT 100').all(c.user.id)}),{summary:'Current user AI history excluding server-graded exercise answer keys'});
    route('GET','/ai/history/:id',c=>{const row=db.prepare('SELECT * FROM generated_content g WHERE id=? AND user_id=? AND NOT EXISTS(SELECT 1 FROM exercise_attempts e WHERE e.content_id=g.id)').get(c.params.id,c.user.id);if(!row)fail(404,'NOT_FOUND','Generated content not found.');content.setAccess(row.set_id,c.user);return {...row,content:JSON.parse(row.content)};},{summary:'Read owned AI history without exposing exercise answer keys'});
    const busy=new Set();
    const owned=c=>{const row=db.prepare('SELECT * FROM conversations WHERE id=? AND user_id=?').get(c.params.id,c.user.id);if(!row)fail(404,'NOT_FOUND','Conversation not found.');content.setAccess(row.set_id,c.user);return {...row,settings:JSON.parse(row.settings||'{}')};};
    const history=id=>db.prepare('SELECT id,role,content,created_at FROM messages WHERE conversation_id=? ORDER BY id').all(id);
    const inputFor=(row,user)=>{let words=content.words(row.set_id,user);if(row.settings.word_ids)words=row.settings.word_ids.map(id=>words.find(w=>w.id===id)).filter(Boolean);return {language:'en',topic:row.settings.topic||row.title,exam:row.settings.exam||'none',settings:row.settings,words:words.slice(0,100).map(w=>({word_id:w.id,term:w.term,definition:w.definition})),history:history(row.id).slice(-20)};};
    const replyString=result=>{if(typeof result.reply!=='string'||!result.reply.trim()||result.reply.length>20000)fail(502,'AI_INVALID_RESPONSE','Provider must return a non-empty reply.');return result.reply.trim();};
    route('POST','/conversations',c=>{
      const set=content.setAccess(c.body.set_id,c.user),raw=c.body.settings||{};
      const settings={language:enumeration(raw.language,'language',['en'],'en'),exam:enumeration(raw.exam,'exam',['none','toeic'],'none'),topic:text(raw.topic,'topic',{min:0,max:500,fallback:''})};
      for(const key of ['no_vocab_hints','starred_only','unmastered_only','ordered'])settings[key]=raw[key]===undefined?false:boolean(raw[key],key);
      let words=content.words(set.id,c.user);if(settings.starred_only)words=words.filter(w=>w.starred);if(settings.unmastered_only)words=words.filter(w=>w.status!=='mastered');
      if(!words.length)fail(400,'NO_WORDS','Không có từ phù hợp bộ lọc. Hãy đổi bộ lọc.');
      if(!settings.ordered)words=words.map(w=>({w,sort:Math.random()})).sort((a,b)=>a.sort-b.sort).map(v=>v.w);
      settings.word_ids=words.map(w=>w.id);const id=randomUUID(),title=text(c.body.title,'title',{max:200,fallback:settings.topic||set.title});
      db.prepare('INSERT INTO conversations(id,user_id,set_id,title,created_at,settings) VALUES(?,?,?,?,?,?)').run(id,c.user.id,set.id,title,now(),JSON.stringify(settings));c.status=201;return {id,set_id:set.id,title,settings};
    },{summary:'Create a private English conversation with persisted topic, exam and vocabulary filters'});
    route('GET','/conversations',c=>({items:db.prepare('SELECT * FROM conversations WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(c.user.id).map(row=>({...row,settings:JSON.parse(row.settings||'{}')}))}),{summary:'Current user conversation history'});
    route('GET','/conversations/:id',c=>{const row=owned(c);return {...row,messages:history(row.id)};},{summary:'Resume an owned conversation and its messages'});
    route('DELETE','/conversations/:id',c=>{const row=owned(c);if(busy.has(row.id))fail(409,'CONVERSATION_BUSY','Wait for the previous message.');transaction(db,()=>{db.prepare("DELETE FROM generated_content WHERE user_id=? AND kind='conversation_translation' AND json_extract(content,'$.conversation_id')=?").run(c.user.id,row.id);db.prepare('DELETE FROM conversations WHERE id=?').run(row.id);});return {deleted:true};},{summary:'Delete an owned conversation, messages and its cached translations'});
    for(const start of [true,false])route('POST',start?'/conversations/:id/start':'/conversations/:id/messages',async c=>{
      const row=owned(c),message=start?'':text(c.body.message,'message',{max:10000});
      if(busy.has(row.id))fail(409,'CONVERSATION_BUSY','Wait for the previous message.');
      if(start&&history(row.id).length)return {reply:history(row.id).find(m=>m.role==='assistant')?.content||'',replayed:true,messages:history(row.id)};
      c.limited(`ai:${c.user.id}`,20,60000);busy.add(row.id);
      try{
        const reply=replyString(await generate('conversation',{...inputFor(row,c.user),message,action:start?'start':'reply',instruction:start?'Start this role-play with one natural short English opening and a question. No learner message exists yet.':'Reply naturally to the learner. Use the selected topic and target vocabulary. If no_vocab_hints is true, do not list vocabulary hints. If ordered is true, introduce target words in their listed order.'},c.user));
        transaction(db,()=>{if(!start)db.prepare("INSERT INTO messages(conversation_id,role,content,created_at) VALUES(?,'user',?,?)").run(row.id,message,now());db.prepare("INSERT INTO messages(conversation_id,role,content,created_at) VALUES(?,'assistant',?,?)").run(row.id,reply,now());});
        return {reply,replayed:false,messages:history(row.id)};
      }finally{busy.delete(row.id);}
    },{summary:start?'Generate and persist a real assistant opening without a fabricated user turn':'Generate and atomically persist learner message and AI reply; failures preserve history'});
    route('POST','/conversations/:id/hint',async c=>{
      const row=owned(c);c.limited(`ai:${c.user.id}`,20,60000);const result=await generate('conversation_hint',inputFor(row,c.user),c.user);
      if(typeof result.hint!=='string'||!result.hint.trim()||typeof result.example!=='string'||!result.example.trim()||result.hint.length>5000||result.example.length>5000)fail(502,'AI_INVALID_RESPONSE','AI chưa trả về gợi ý hợp lệ.');return result;
    },{summary:'Get a contextual response hint without inserting fake conversation messages'});
    const pendingTranslations=new Map();
    route('POST','/conversations/:id/messages/:message_id/translation',async c=>{
      const row=owned(c),id=integer(c.params.message_id,'message_id'),message=db.prepare('SELECT * FROM messages WHERE id=? AND conversation_id=?').get(id,row.id);if(!message)fail(404,'NOT_FOUND','Message not found.');
      const saved=db.prepare("SELECT content FROM generated_content WHERE user_id=? AND kind='conversation_translation' AND json_extract(content,'$.message_id')=? AND json_extract(content,'$.conversation_id')=? ORDER BY created_at DESC LIMIT 1").get(c.user.id,id,row.id);
      if(saved)return JSON.parse(saved.content);
      const pendingKey=c.user.id+':'+row.id+':'+id;if(pendingTranslations.has(pendingKey))return pendingTranslations.get(pendingKey);
      c.limited(`ai:${c.user.id}`,20,60000);
      const work=(async()=>{
      const result=await generate('translation',{text:message.content,source_language:'en',target_language:'vi',instruction:'Translate this exact conversation message into natural Vietnamese without adding commentary.'},c.user);
      if(typeof result.translation!=='string'||!result.translation.trim()||result.translation.length>20000)fail(502,'AI_INVALID_RESPONSE','AI chưa trả về bản dịch hợp lệ.');
      // Do not recreate cached content if the learner deleted the thread while AI was running.
      if(!db.prepare('SELECT 1 FROM messages WHERE id=? AND conversation_id=?').get(id,row.id))fail(404,'NOT_FOUND','Conversation was deleted.');
      const value={conversation_id:row.id,message_id:id,translation:result.translation};db.prepare('INSERT INTO generated_content VALUES(?,?,?,?,?,?)').run(randomUUID(),c.user.id,row.set_id,'conversation_translation',JSON.stringify(value),now());return value;
      })();pendingTranslations.set(pendingKey,work);try{return await work;}finally{pendingTranslations.delete(pendingKey);}
    },{summary:'Translate and cache an owned message in Vietnamese'});
  }
  const describe=user=>{const settings=userConfig(user);return {provider:settings?.provider||direct?.name||'gateway',model:settings?.model||model||(direct?.name==='gemini'?'gemini-3.8-flash':null)};};
  return {configured,isConfigured,generate,describe,ensureLearningDetails,hasAudio:user=>isConfigured(user)&&selectedProvider(user)?.name==='gemini',registerRoutes};
}
