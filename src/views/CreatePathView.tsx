import React,{useEffect,useState} from 'react';
import {api,PathCard,SetCard} from '../api/client';
import {useRouter} from '../context/RouterContext';
import {categories} from '../components/ContentCards';
export function CreatePathView(){
  const {navigate}=useRouter();const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [tag,setTag]=useState('Nền tảng');
  const [sets,setSets]=useState<SetCard[]>([]);const [selected,setSelected]=useState<SetCard[]>([]);const [q,setQ]=useState('');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{let active=true;api.getSets('mine').then(d=>{if(active)setSets(d.items);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  const search=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{setSets((await api.search(q)).sets);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const save=async()=>{setBusy(true);setError('');try{const path=await api.request<PathCard>('POST','/paths',{title,description,tag,learning_language:'en',native_language:'vi',visibility:'private',set_ids:selected.map(s=>s.id)});navigate('/learning-path/'+path.id);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const move=(index:number,delta:number)=>setSelected(previous=>{const next=[...previous];[next[index],next[index+delta]]=[next[index+delta],next[index]];return next;});
  return <div className="max-w-3xl mx-auto space-y-5"><h1 className="text-2xl font-bold">Tạo lộ trình tiếng Anh</h1>{error&&<p role="alert">{error}</p>}
    <input aria-label="Tên lộ trình" placeholder="Tên lộ trình" value={title} onChange={e=>setTitle(e.target.value)} className="w-full border rounded-xl p-3"/>
    <textarea aria-label="Mô tả" placeholder="Mô tả" value={description} onChange={e=>setDescription(e.target.value)} className="w-full border rounded-xl p-3"/>
    <select aria-label="Danh mục" value={tag} onChange={e=>setTag(e.target.value)} className="border rounded-xl p-3">{categories.map(c=><option key={c.slug}>{c.tag}</option>)}</select>
    <h2 className="font-bold">Các bộ đã chọn theo thứ tự</h2>{selected.map((s,i)=><div key={s.id} className="flex gap-3 border rounded-xl p-3"><span className="flex-1">{i+1}. {s.title}</span><button disabled={i===0} onClick={()=>move(i,-1)}>↑</button><button disabled={i===selected.length-1} onClick={()=>move(i,1)}>↓</button><button onClick={()=>setSelected(a=>a.filter(t=>t.id!==s.id))}>Bỏ</button></div>)}
    <form onSubmit={search} className="flex gap-3"><input aria-label="Tìm bộ từ" value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm bộ từ để thêm" className="flex-1 border rounded-xl p-3"/><button disabled={busy}>Tìm</button></form>
    <div className="space-y-2">{sets.map(s=><button key={s.id} disabled={selected.some(t=>t.id===s.id)} onClick={()=>setSelected(a=>[...a,s])} className="block w-full text-left border rounded-xl p-3 disabled:opacity-40">+ {s.title} · {s.word_count} từ</button>)}</div>
    <p className="text-sm text-slate-500">Lộ trình được lưu riêng trong tài khoản của bạn.</p><button disabled={busy||!title.trim()||!selected.length} onClick={()=>void save()} className="bg-slate-900 text-white p-3 rounded-xl disabled:opacity-40">Lưu lộ trình</button>
  </div>;
}
