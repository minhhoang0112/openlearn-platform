import React from 'react';
import {PathCard,SetCard} from '../api/client';
import {useRouter} from '../context/RouterContext';
export const categories = [{slug:'nen-tang',tag:'Nền tảng'},{slug:'toeic',tag:'TOEIC'},{slug:'cong-viec',tag:'Công việc'}];
export function PathCards({items}:{items:PathCard[]}) {
  const {navigate}=useRouter();
  return <div className="grid gap-4 md:grid-cols-2">{items.map(p=><button key={p.id} onClick={()=>navigate(`/learning-path/${p.id}`)} className="text-left bg-white dark:bg-slate-900 border rounded-2xl p-6 space-y-3">
    <h3 className="font-bold text-lg">{p.title}</h3><p className="text-sm text-slate-500">{p.description}</p>
    <p className="text-xs">{p.set_count} bộ thẻ hiện có · Anh → {p.native_language==='vi'?'Việt':'Anh'}</p>
    <p className="text-xs text-slate-500">Học tự do · Không cần gói nâng cấp</p>
  </button>)}</div>;
}
export function SetCards({items}:{items:SetCard[]}) {
  const {navigate}=useRouter();
  return <div className="grid gap-4 md:grid-cols-3">{items.map(s=><button key={s.id} onClick={()=>navigate(`/study-set/${s.id}`)} className="text-left bg-white dark:bg-slate-900 border rounded-2xl p-5 space-y-3">
    <h3 className="font-bold">{s.title}</h3><p className="text-xs text-slate-500">{s.mastered_count}/{s.word_count} từ đã nhớ</p>
    <progress className="w-full accent-indigo-600" value={s.mastered_count} max={Math.max(1,s.word_count)} />
  </button>)}</div>;
}
