import React, {useEffect, useState} from 'react';
import {Languages, Loader2, Volume2} from 'lucide-react';
import {api, ApiWord} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {useRouter} from '../context/RouterContext';
import {playAudio} from '../utils/audio';

// StrictMode and multiple views of the same word share one in-flight request.
const pending=new Map<string,Promise<ApiWord>>();
function ensureDetails(wordId:number,userId:number){
  const key=userId+':'+wordId;
  let request=pending.get(key);
  if(!request){
    request=api.request<ApiWord>('POST','/words/'+wordId+'/learning-details',{});
    pending.set(key,request);
    void request.then(()=>pending.delete(key),()=>pending.delete(key));
  }
  return request;
}

export function WordLearningDetails({word,onChange,auto=false,showSynonyms=true}:{word:ApiWord;onChange?:(word:ApiWord)=>void;auto?:boolean;showSynonyms?:boolean}){
  const {user,capabilities}=useAuth();
  const {navigate,path}=useRouter();
  const [local,setLocal]=useState(word);
  const [translated,setTranslated]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{setLocal(word);},[word]);
  useEffect(()=>{setTranslated(false);setError('');},[word.id]);
  useEffect(()=>{
    if(!auto||!user||!capabilities?.ai.configured||(word.example.trim()&&word.example_translation?.trim()))return;
    let active=true;setBusy(true);setError('');
    ensureDetails(word.id,user.id).then(updated=>{if(active){setBusy(false);setLocal(updated);onChange?.(updated);}}).catch(e=>{if(active){setBusy(false);if(!auto)setError((e as Error).message);}});
    return()=>{active=false;};
  },[auto,user?.id,capabilities?.ai.configured,word.id,word.example,word.example_translation]);
  const load=async(showTranslation=false)=>{
    if(!user)return;
    if(!capabilities?.ai.configured){navigate('/settings/ai?returnTo='+encodeURIComponent(path));return;}
    setBusy(true);setError('');
    try{const updated=await ensureDetails(word.id,user.id);setLocal(updated);onChange?.(updated);if(showTranslation)setTranslated(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  const toggleTranslation=()=>{
    if(translated){setTranslated(false);return;}
    if(local.example_translation?.trim())setTranslated(true);else void load(true);
  };
  return <div className="space-y-2 text-sm leading-relaxed" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();}}>
    {showSynonyms&&local.synonyms&&<p className="text-slate-500 dark:text-slate-400 underline decoration-dashed underline-offset-4">{local.synonyms}</p>}
    {local.example&&<div className="flex items-center justify-center gap-2 flex-wrap">
      <p className="italic text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{local.example}</p>
      <span className="inline-flex gap-1 shrink-0">
        <button type="button" aria-label={'Nghe ví dụ cho '+word.term} title="Nghe câu ví dụ" onClick={()=>playAudio(local.example)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><Volume2 className="w-4 h-4"/></button>
        <button type="button" aria-label={'Dịch ví dụ cho '+word.term} title={translated?'Ẩn bản dịch':'Dịch câu ví dụ'} aria-pressed={translated} disabled={busy} onClick={toggleTranslation} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"><Languages className="w-4 h-4"/></button>
      </span>
    </div>}
    {translated&&local.example_translation&&<p role="note" className="text-slate-500 dark:text-slate-400">{local.example_translation}</p>}
    {busy&&<p role="status" className="text-xs text-slate-400 inline-flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/>Đang bổ sung ví dụ và bản dịch...</p>}
    {!busy&&!local.example&&!error&&<button type="button" onClick={()=>void load()} className="text-xs text-indigo-600 underline">{capabilities?.ai.configured?'Xem ví dụ':'Kết nối AI để bổ sung ví dụ'}</button>}
    {error&&<div role="alert" className="text-xs text-rose-600"><p>{error}</p><button type="button" disabled={busy} onClick={()=>void load(translated)} className="underline">Thử lại</button></div>}
  </div>;
}
