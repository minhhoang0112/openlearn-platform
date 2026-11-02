import React,{useEffect,useState} from 'react';
import {api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {useRouter} from '../context/RouterContext';
import {sanitizeInternalPath} from '../utils/navigationContext';
type AiRoute={task:string;model:string;route:string;connection:string;configured:boolean;waiting:number;running:number;cooldown_seconds:number};
type AiSettings={provider:string;model:string;key_configured:boolean;configuration_source:string;routing?:{policy:string;routes:AiRoute[]}|null};
const routeNames:Record<string,string>={fast:'Ví dụ, dịch và gợi ý',standard:'Hội thoại và soạn bài',feedback:'Nhận xét bài nói, bài viết',audio:'Nhận xét ghi âm',personal:'Model cá nhân'};
export function AiSettingsView(){
  const {refreshCapabilities}=useAuth();const {path,navigate}=useRouter();
  const [provider,setProvider]=useState('gemini');const [model,setModel]=useState('gemini-3.8-flash');const [key,setKey]=useState('');
  const [hasKey,setHasKey]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');
  const [settings,setSettings]=useState<AiSettings|null>(null);
  const applySettings=(s:AiSettings)=>{setSettings(s);setProvider(s.provider);setModel(s.model);setHasKey(s.key_configured);};
  useEffect(()=>{let active=true;api.request<AiSettings>('GET','/settings/ai').then(s=>{if(active)applySettings(s);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  const useShared=async()=>{setBusy(true);setError('');setMessage('');try{
    await api.request('DELETE','/settings/ai');setKey('');
    applySettings(await api.request<AiSettings>('GET','/settings/ai'));await refreshCapabilities();setMessage('Đã chuyển sang cấu hình AI chung của web.');
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const save=async(test=false)=>{setBusy(true);setError('');setMessage('');try{
    await api.request('PUT','/settings/ai',{provider,model,...(key.trim()?{api_key:key.trim()}: {})});setKey('');
    await refreshCapabilities();
    applySettings(await api.request<AiSettings>('GET','/settings/ai'));
    if(test){const r=await api.request<{reply:string}>('POST','/settings/ai/test',{});setMessage('Kết nối thành công: '+r.reply);}else setMessage('Đã lưu cấu hình AI.');
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const qIndex=path.indexOf('?');
  const rawReturnTo=qIndex>=0?new URLSearchParams(path.slice(qIndex+1)).get('returnTo'):null;
  const safeReturnTo=sanitizeInternalPath(rawReturnTo);
  return <div className="max-w-2xl mx-auto space-y-5 pb-16"><h1 className="text-2xl font-bold">Cài đặt AI</h1><p>Ứng dụng cá nhân mở toàn bộ tính năng học. Chỉ cần kết nối model để dùng các chức năng AI.</p>
    {settings&&<section aria-label="Phân công AI" className="rounded-2xl border border-indigo-200 dark:border-indigo-900 p-4 space-y-3">
      <h2 className="font-bold">{settings.routing?.policy==='task_routing_v1'?'Đang tự chọn model theo công việc':'Đang dùng cấu hình AI riêng'}</h2>
      {settings.routing&&<ul className="space-y-2 text-sm">{settings.routing.routes.filter((r,i,all)=>all.findIndex(x=>x.route===r.route)===i).map(r=><li key={r.route} className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 break-words">
        <strong>{routeNames[r.route]||r.route}</strong><div>{r.model} · {r.connection==='secondary'?'Kết nối phụ':r.connection==='personal'?'Kết nối cá nhân':'Kết nối chính'}</div>
        <div className="text-xs mt-1">{!r.configured?'Chưa có key':r.cooldown_seconds>0?`Tạm nghỉ ${r.cooldown_seconds}s sau lỗi hạn mức`:r.running||r.waiting?`Đang xử lý: ${r.running} · Chờ: ${r.waiting}`:'Đã cấu hình — chưa xác nhận quota hiện tại'}</div>
      </li>)}</ul>}
      <p className="text-xs text-slate-500">Trạng thái tại lúc tải trang. Ví dụ và bản dịch đã lưu được dùng lại. Hết quota sẽ báo lỗi và chờ, không tự đổi project hoặc nâng sang model trả phí.</p>
      {settings.configuration_source==='account'&&<><p className="text-sm">Cấu hình riêng đang ưu tiên hơn phân công chung. Chuyển về cấu hình chung sẽ xóa thiết lập model/key riêng đã lưu của tài khoản này.</p><button disabled={busy} onClick={()=>void useShared()} className="border rounded-xl p-3 font-semibold">Dùng phân công AI chung</button></>}
    </section>}
    <h2 className="font-bold">Thiết lập model riêng (tùy chọn)</h2><p className="text-sm text-slate-500">Bấm Lưu bên dưới sẽ dùng model này cho mọi tác vụ AI của tài khoản, thay cho phân công chung.</p>
    <label className="block">Nhà cung cấp<select aria-label="Nhà cung cấp AI" className="block border rounded-xl p-3 w-full" value={provider} onChange={e=>{setProvider(e.target.value);setModel(e.target.value==='gemini'?'gemini-3.8-flash':'qwen3:8b');}}><option value="gemini">Gemini API</option><option value="ollama">Ollama trên máy</option></select></label>
    <label className="block">Model<input aria-label="Model AI" className="block border rounded-xl p-3 w-full" value={model} onChange={e=>setModel(e.target.value)}/></label>
    {provider==='gemini'?<><p className="text-sm">Bạn có thể cấu hình GEMINI_API_KEY trong .env thay cho nhập ở đây. Key trong phần này được lưu riêng trên BE theo tài khoản; không trả về trình duyệt.</p><label className="block">API key {hasKey?'(đã cấu hình)':''}<input type="password" aria-label="API key" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} placeholder={hasKey?'Để trống để giữ key hiện tại':'Dán Gemini API key của bạn'} className="block border rounded-xl p-3 w-full"/></label><a className="underline text-sm" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Tạo key trong Google AI Studio</a></>:<p>Ollama cần chạy trên máy tại cổng 11434 và đã tải model bạn chọn. Ứng dụng không tự tải model hoặc tự chuyển sang dịch vụ trả phí.</p>}
    <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={()=>void save()} className="border rounded-xl p-3">Lưu</button><button disabled={busy} onClick={()=>void save(true)} className="bg-slate-900 text-white rounded-xl p-3">{busy?'Đang kiểm tra...':'Lưu và kiểm tra kết nối thật'}</button><button data-testid="ai-settings-return" onClick={()=>navigate(safeReturnTo||'/')} className="border rounded-xl p-3">Quay lại học</button></div>
    {error&&<p role="alert" className="text-rose-600">{error}</p>}{message&&<p role="status">{message}</p>}
  </div>;
}
