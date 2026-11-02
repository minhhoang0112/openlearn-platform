import {CommunicationRoom} from '../components/communication/CommunicationRoom';
import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,MessageCircle,Brain,Loader2} from 'lucide-react';
import {communicationApi as api,CommunicationCapabilities,CommunicationMemory,CommunicationSession,Scenario} from '../api/communication';
import {useRouter} from '../context/RouterContext';

const levelNames:Record<string,string>={beginner:'Tôi mới bắt đầu',A1:'A1 · Câu đơn giản',A2:'A2 · Chuyện hằng ngày',B1:'B1 · Trao đổi ý kiến',B2:'B2 · Thảo luận',C1:'C1 · Diễn đạt nâng cao'};
const modeNames:Record<string,string>={guided:'Học cùng tôi',roleplay:'Đóng vai tình huống',free:'Trò chuyện tự do'};
const buttonBase='inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border disabled:opacity-50 disabled:cursor-not-allowed';
const button=buttonBase+' border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800';
const primary=buttonBase+' bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-700';
const field='w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3 text-sm';
const card='rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';
const errorText=(e:unknown)=>(e as Error).message||'Chưa xử lý được. Hãy thử lại.';

export function CommunicationView(){
  const {path}=useRouter(),id=/^\/communication\/([\w-]+)$/.exec(path.split('?')[0])?.[1];
  return id?<CommunicationRoom key={id} id={id} memoryPanel={<MemoryPanel sourceId={id}/>}/>:<CommunicationHome/>;
}
function CommunicationHome(){
  const {path,navigate}=useRouter();const [tab,setTab]=useState(path.includes('tab=history')?'history':'start');
  const [scenarios,setScenarios]=useState<Scenario[]>([]),[caps,setCaps]=useState<CommunicationCapabilities|null>(null),[scenario,setScenario]=useState('introductions'),[level,setLevel]=useState('beginner'),[mode,setMode]=useState('guided'),[memory,setMemory]=useState(true);
  const [items,setItems]=useState<CommunicationSession[]>([]),[total,setTotal]=useState(0),[q,setQ]=useState(''),[offset,setOffset]=useState(0),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const createId=useRef(crypto.randomUUID());
  useEffect(()=>{Promise.all([api.catalog(),api.capabilities()]).then(([c,s])=>{setScenarios(c.scenarios);setCaps(s);}).catch(e=>setError(errorText(e)));},[]);
  useEffect(()=>{if(tab!=='history')return;let active=true;setLoading(true);const timer=setTimeout(()=>{api.sessions(q,offset).then(r=>{if(active){setItems(r.items);setTotal(r.total);setError('');}}).catch(e=>{if(active)setError(errorText(e));}).finally(()=>{if(active)setLoading(false);});},250);return()=>{active=false;clearTimeout(timer);};},[tab,q,offset]);
  async function create(){setBusy(true);setError('');try{const s=await api.create({submission_id:createId.current,scenario,level,mode,use_memory:memory});navigate('/communication/'+s.id);}catch(e){setError(errorText(e));}finally{setBusy(false);}}
  function change(){createId.current=crypto.randomUUID();}
  return <div className="max-w-5xl mx-auto space-y-6 pb-12">
    <button className="text-sm flex items-center gap-2 text-slate-500" onClick={()=>navigate('/')}><ArrowLeft size={16}/> Về Trang chủ</button>
    <header className="space-y-3"><span className="inline-flex items-center gap-2 text-indigo-600 text-sm font-semibold"><MessageCircle size={18}/> Mỗi ngày một cuộc trò chuyện</span><h1 className="text-3xl font-bold tracking-tight">Giao tiếp AI</h1><p className="text-slate-500 max-w-2xl">Tập nói với một người bạn biết hướng dẫn. Bắt đầu bằng câu ngắn, hỏi lại khi chưa hiểu và dùng tiếng Việt lúc bí từ.</p></header>
    <nav aria-label="Mục giao tiếp" className="flex flex-wrap gap-2">{[['start','Bắt đầu luyện'],['history','Lịch sử trò chuyện'],['memory','AI nhớ gì về tôi']].map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)} className={tab===key?primary:button}>{label}</button>)}</nav>
    {error&&<p role="alert" className="rounded-xl bg-rose-50 text-rose-700 p-4">{error}</p>}
    {tab==='start'&&<>
      <section className={card+' p-5 space-y-5'}><div className="grid sm:grid-cols-2 gap-4"><label className="text-sm font-semibold space-y-2"><span>Mức hỗ trợ</span><select className={field} value={level} onChange={e=>{setLevel(e.target.value);change();}}>{Object.entries(levelNames).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label className="text-sm font-semibold space-y-2"><span>Cách luyện</span><select className={field} value={mode} onChange={e=>{setMode(e.target.value);change();}}>{Object.entries(modeNames).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
      <div className="grid sm:grid-cols-2 gap-3">{scenarios.map(s=><button key={s.id} aria-pressed={s.id===scenario} onClick={()=>{setScenario(s.id);change();}} className={'rounded-xl border p-4 text-left '+(scenario===s.id?'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30':'border-slate-200 dark:border-slate-700')}><span className="font-bold block">{s.title}</span><span className="text-sm text-slate-500 block mt-1">{s.goal}</span></button>)}</div>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={memory} onChange={e=>{setMemory(e.target.checked);change();}} className="mt-1"/><span>Dùng các ghi nhớ tôi đã lưu và tổng kết phiên trước để nối tiếp việc học. Tắt mục này để phiên không tham khảo hoặc cung cấp ngữ cảnh cho phiên sau; lịch sử vẫn được lưu.</span></label>
      <div className="flex flex-wrap items-center gap-4"><button className={primary} disabled={busy||!scenarios.length} onClick={()=>void create()}>{busy?<Loader2 size={18} className="animate-spin"/>:<MessageCircle size={18}/>} Vào phòng luyện</button><p className="text-sm text-slate-500">Xem mẫu câu trước; chỉ bật mic khi bạn sẵn sàng.</p></div></section>
      <div className="grid sm:grid-cols-3 gap-3 text-sm text-slate-500"><p className={card+' p-4'}><strong className="block text-slate-800 dark:text-slate-200 mb-1">1. Có điểm tựa</strong>Mẫu câu có nghĩa tiếng Việt, trợ giúp khi chưa biết trả lời.</p><p className={card+' p-4'}><strong className="block text-slate-800 dark:text-slate-200 mb-1">2. Nói chuyện thật</strong>Mic hai chiều, nghe AI trả lời và nói chen khi cần.</p><p className={card+' p-4'}><strong className="block text-slate-800 dark:text-slate-200 mb-1">3. Tiếp tục ngày mai</strong>Lưu lịch sử, tổng kết và những điều chính bạn muốn AI nhớ.</p></div>
      {caps&&!caps.voice.configured&&<p className="text-sm text-amber-700">Thoại Live chưa được cấu hình trên máy chủ. Bạn vẫn có thể mở phòng và luyện bằng chữ khi AI văn bản đã kết nối.</p>}
    </>}
    {tab==='history'&&<section className="space-y-4"><label className="block text-sm">Tìm trong tiêu đề hoặc nội dung<input className={field+' mt-2'} value={q} onChange={e=>{setQ(e.target.value);setOffset(0);}} placeholder="Ví dụ: giới thiệu, server..."/></label>{loading?<p role="status">Đang tải lịch sử...</p>:items.length===0?<p className={card+' p-8 text-slate-500'}>Chưa có cuộc trò chuyện phù hợp. Chọn Bắt đầu luyện để tạo phiên đầu tiên.</p>:<div className="grid sm:grid-cols-2 gap-3">{items.map(s=><button key={s.id} onClick={()=>navigate('/communication/'+s.id)} className={card+' p-5 text-left hover:border-indigo-400'}><strong>{s.title}</strong><p className="text-sm text-slate-500 mt-2">{levelNames[s.level]} · {s.turn_count} lượt · {s.status==='finished'?'Đã kết thúc':'Có thể tiếp tục'}</p><p className="text-xs text-slate-400 mt-2">{new Date(s.updated_at).toLocaleString('vi-VN')}</p></button>)}</div>}<div className="flex items-center justify-between gap-2 text-sm"><button className={button} disabled={!offset||loading} onClick={()=>setOffset(o=>o-12)}>Trước</button><span>{total?`${offset+1}–${Math.min(offset+12,total)} / ${total}`:'0 phiên'}</span><button className={button} disabled={offset+12>=total||loading} onClick={()=>setOffset(o=>o+12)}>Sau</button></div></section>}
    {tab==='memory'&&<MemoryPanel/>}
  </div>;
}

function MemoryPanel({sourceId}:{sourceId?:string}){
  const [items,setItems]=useState<CommunicationMemory[]>([]),[content,setContent]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[edit,setEdit]=useState<string|null>(null);
  const load=()=>api.memories().then(r=>setItems(r.items));useEffect(()=>{load().catch(e=>setError(errorText(e)));},[]);
  async function save(){if(!content.trim())return;setBusy(true);setError('');try{if(edit)await api.editMemory(edit,content);else await api.addMemory(content,sourceId);setContent('');setEdit(null);await load();}catch(e){setError(errorText(e));}finally{setBusy(false);}}
  return <section className={card+' p-5 space-y-4'} aria-label="Ghi nhớ học tập"><h2 className="font-bold flex gap-2 items-center"><Brain size={20}/> AI nhớ gì về tôi</h2><p className="text-sm text-slate-500">Bạn quyết định thông tin nào được ghi nhớ: mục tiêu, điều muốn luyện hoặc sở thích. AI còn tham khảo tối đa ba tổng kết gần đây của các phiên có bật ghi nhớ. Không tự biến lời đóng vai thành thông tin cá nhân.</p>{error&&<p role="alert" className="text-rose-600">{error}</p>}<label className="block text-sm">{edit?'Sửa ghi nhớ':'Điều tôi muốn AI nhớ'}<textarea className={field+' mt-2'} maxLength={500} value={content} onChange={e=>setContent(e.target.value)} placeholder="Mình mới bắt đầu, muốn luyện giới thiệu bản thân để đi phỏng vấn."/></label><div className="flex gap-2"><button className={primary} disabled={busy||!content.trim()} onClick={()=>void save()}>Lưu ghi nhớ</button>{edit&&<button className={button} onClick={()=>{setEdit(null);setContent('');}}>Hủy sửa</button>}</div><ul className="space-y-2">{items.map(m=><li key={m.id} className="border-t border-slate-100 dark:border-slate-800 py-3"><p className="break-words">{m.content}</p><p className="text-xs text-slate-400 mt-1">{m.source_session_id?'Có nguồn từ cuộc trò chuyện; xóa phiên sẽ xóa ghi nhớ này.':'Bạn tự lưu trong hồ sơ.'}</p><div className="flex gap-4 mt-2 text-sm"><button onClick={()=>{setEdit(m.id);setContent(m.content);}}>Sửa</button><button className="text-rose-600" disabled={busy} onClick={()=>{setBusy(true);api.deleteMemory(m.id).then(load).catch(e=>setError(errorText(e))).finally(()=>setBusy(false));}}>Xóa</button></div></li>)}</ul>{!items.length&&<p className="text-sm text-slate-400">Chưa có ghi nhớ do bạn lưu.</p>}</section>;
}

