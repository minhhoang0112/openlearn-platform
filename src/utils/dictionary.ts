import {api} from '../api/client';
export interface DictionarySense {pos:string;meaning:string;exampleEn?:string;exampleVi?:string;synonyms?:string[]}
export interface DictionaryLookupResult {term:string;phonetic:string;sourceLang:string;targetLang:string;senses:DictionarySense[];relatedWords:string[];isSentence?:boolean;fullTranslation?:string}
export async function lookupDictionaryWord(query:string,sourceLang='auto',targetLang='auto'):Promise<DictionaryLookupResult>{
  if(!['auto','en','vi'].includes(sourceLang)||!['auto','en','vi'].includes(targetLang))throw new Error('Hiện hỗ trợ tra từ Anh – Việt trong thư viện.');
  const result=await api.dictionary(query.trim());
  const exact=result.words.filter(w=>w.term.toLowerCase()===query.trim().toLowerCase());
  const words=exact.length?exact:result.words;
  if(!words.length)throw new Error('Chưa tìm thấy từ này trong thư viện Anh – Việt.');
  const word=words[0];const senses=words.filter(w=>w.term===word.term).filter((w,i,a)=>a.findIndex(v=>v.definition===w.definition)===i).map(w=>({pos:w.part_of_speech,meaning:w.definition,...(w.example?{exampleEn:w.example}:{})}));
  return {term:word.term,phonetic:word.phonetic,sourceLang:'en',targetLang:'vi',senses,relatedWords:[]};
}
