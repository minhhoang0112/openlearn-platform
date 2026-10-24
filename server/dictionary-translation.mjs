import {fail,text,enumeration} from './validation.mjs';

function decode(value){return value.replace(/&(amp|lt|gt|quot|apos|#39|#\d+|#x[0-9a-f]+);/gi,(raw,key)=>{const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};if(named[key.toLowerCase()])return named[key.toLowerCase()];const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):raw;});}
export function dictionaryTranslationService(local,{fetchImpl=fetch,timeoutMs=8000,clock=()=>Date.now()}={}){
  const cache=new Map(),pending=new Map();
  function registerRoutes(route){
    route('POST','/dictionary/translate',async c=>{
      const q=text(c.body.q,'q',{max:1000}).normalize('NFKC');
      const requestedSource=enumeration(c.body.source_lang,'source_lang',['en','vi','auto'],'en'),requestedTarget=enumeration(c.body.target_lang,'target_lang',['en','vi','auto'],'vi');
      const hasVietnamese=/[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/iu.test(q);
      const source=requestedSource==='auto'?(hasVietnamese?'vi':requestedTarget==='en'?'vi':'en'):requestedSource,target=requestedTarget==='auto'?(source==='en'?'vi':'en'):requestedTarget;
      const base={term:q,phonetic:'',sourceLang:source,targetLang:target,relatedWords:[],isSentence:/\s/.test(q),query:q};
      if(source===target)return {...base,senses:[{pos:'',meaning:q}],fullTranslation:q,source:'identity',cached:false,external_request:false};
      // Only exact English entries qualify; substring suggestions are never definitions.
      if(source==='en'&&target==='vi'&&q.length<=200){const found=local.lookup(q,c.user);if(found.found)return {...base,phonetic:found.entries.find(e=>e.phonetic)?.phonetic??'',senses:found.entries.map(e=>({pos:e.part_of_speech,meaning:e.definition,exampleEn:e.example||undefined,exampleVi:e.example_translation||undefined})),source:'local_exact',cached:false,external_request:false};}
      if(Buffer.byteLength(q,'utf8')>500)fail(400,'TRANSLATION_TEXT_TOO_LONG','Mỗi lần dịch tối đa500byte UTF-8. Hãy chia đoạn dài thành các câu ngắn.');
      const key=JSON.stringify([c.user.id,source,target,q]),saved=cache.get(key);
      if(saved&&saved.until>clock())return {...saved.value,cached:true,external_request:false};
      if(pending.has(key))return pending.get(key);
      c.limited('dictionary:'+c.user.id,20,60000);
      const work=(async()=>{
        const url=new URL('https://api.mymemory.translated.net/get');url.searchParams.set('q',q);url.searchParams.set('langpair',source+'|'+target);
        let response;try{response=await fetchImpl(url,{signal:AbortSignal.timeout(timeoutMs),redirect:'error'});}catch{fail(503,'TRANSLATION_UNAVAILABLE','Không kết nối được dịch vụ dịch trực tuyến. Kiểm tra Internet rồi thử lại.');}
        if(response.status===429)fail(429,'TRANSLATION_RATE_LIMITED','Dịch vụ dịch đang hết hạn mức. Thử lại sau; đây không phải quota Gemini.');
        if(!response.ok)fail(503,'TRANSLATION_UNAVAILABLE','Dịch vụ dịch trực tuyến tạm thời không phản hồi.');
        let json;try{json=await response.json();}catch{fail(502,'TRANSLATION_INVALID_RESPONSE','Dịch vụ chưa trả về bản dịch hợp lệ.');}
        if(json.quotaFinished||Number(json.responseStatus)===429)fail(429,'TRANSLATION_RATE_LIMITED','Dịch vụ dịch đang hết hạn mức. Thử lại sau; đây không phải quota Gemini.');
        if(Number(json.responseStatus)!==200||typeof json.responseData?.translatedText!=='string'||!json.responseData.translatedText.trim()||json.responseData.translatedText.length>10000)fail(502,'TRANSLATION_INVALID_RESPONSE','Dịch vụ chưa trả về bản dịch hợp lệ.');
        const translated=decode(json.responseData.translatedText.trim());
        const value={...base,senses:[{pos:'',meaning:translated}],fullTranslation:translated,source:'mymemory',cached:false,external_request:true};
        if(cache.size>=500)cache.delete(cache.keys().next().value);cache.set(key,{until:clock()+86400000,value});return value;
      })();pending.set(key,work);try{return await work;}finally{pending.delete(key);}
    },{summary:'Translate entered word/phrase/short sentence EN↔VI: exact local entries first, then MyMemory with bounded private cache; never substitutes a similar word or calls Gemini'});
  }
  return {registerRoutes};
}
