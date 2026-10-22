import React,{useState} from 'react';
import {api,ApiWord} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {useRouter} from '../context/RouterContext';
import {WordLearningDetails} from './WordLearningDetails';
export function WordExample({word,onChange}:{word:ApiWord;onChange:(word:ApiWord)=>void}){
  const {capabilities}=useAuth();const {path,navigate}=useRouter();
  const [editing,setEditing]=useState(false);const [example,setExample]=useState(word.example);const [translation,setTranslation]=useState(word.example_translation||'');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const generate=async()=>{if(!capabilities?.ai.configured){navigate('/settings/ai?returnTo='+encodeURIComponent(path));return;}setBusy(true);setError('');try{
    const response=await api.request<{result:{examples:{example:string;translation:string;synonyms:string}[]}}>('POST','/ai/generate',{set_id:word.set_id,kind:'word_examples',word_ids:[word.id]});
    const value=response.result.examples[0];onChange({...word,example:value.example,example_translation:value.translation,synonyms:value.synonyms,example_source:'ai'});setExample(value.example);setTranslation(value.translation);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const save=async()=>{setBusy(true);setError('');try{const saved=await api.request<ApiWord>('PUT','/words/'+word.id+'/notes',{example,translation,synonyms:word.synonyms});onChange(saved);setEditing(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  return <div className="space-y-1 mt-2 text-sm text-left">
    <WordLearningDetails key={word.id} word={word} onChange={onChange}/>
    <div className="flex flex-wrap gap-3 text-xs text-indigo-600"><button disabled={busy} onClick={()=>void generate()}>{busy?'Đang tạo...':word.example?'Tạo ví dụ khác bằng AI':'Tạo ví dụ bằng AI'}</button><button disabled={busy} onClick={()=>{setExample(word.example);setTranslation(word.example_translation||'');setEditing(e=>!e);}}>{editing?'Đóng':'Tự viết ví dụ'}</button></div>
    {editing&&<div className="space-y-2"><textarea aria-label={'Ví dụ cho '+word.term} value={example} onChange={e=>setExample(e.target.value)} placeholder="Câu ví dụ tiếng Anh" className="border rounded-lg p-2 w-full"/><input aria-label={'Bản dịch cho '+word.term} value={translation} onChange={e=>setTranslation(e.target.value)} placeholder="Bản dịch tiếng Việt" className="border rounded-lg p-2 w-full"/><button disabled={busy||!example.trim()} onClick={()=>void save()} className="border rounded-lg p-2">Lưu ví dụ</button></div>}
    {error&&<p role="alert" className="text-rose-600 text-xs">{error}</p>}
  </div>;
}
