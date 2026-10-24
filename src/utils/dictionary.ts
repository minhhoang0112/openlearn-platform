import {api} from '../api/client';
export interface DictionarySense {pos:string;meaning:string;exampleEn?:string;exampleVi?:string;synonyms?:string[]}
export interface DictionaryLookupResult {term:string;phonetic:string;sourceLang:string;targetLang:string;senses:DictionarySense[];relatedWords:string[];isSentence?:boolean;fullTranslation?:string;source?:string;cached?:boolean;external_request?:boolean}
export async function lookupDictionaryWord(query:string,sourceLang='auto',targetLang='auto'):Promise<DictionaryLookupResult>{
  if(!['auto','en','vi'].includes(sourceLang)||!['auto','en','vi'].includes(targetLang))throw new Error('Hiện hỗ trợ dịch Anh ↔ Việt.');
  return api.request<DictionaryLookupResult>('POST','/dictionary/translate',{q:query.trim(),source_lang:sourceLang,target_lang:targetLang});
}
