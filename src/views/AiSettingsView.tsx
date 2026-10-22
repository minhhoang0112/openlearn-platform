import React,{useEffect,useState} from 'react';
import {api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {useRouter} from '../context/RouterContext';
export function AiSettingsView(){
  const {refreshCapabilities}=useAuth();const {path,navigate}=useRouter();
  const [provider,setProvider]=useState('gemini');const [model,setModel]=useState('gemini-3.8-flash');const [key,setKey]=useState('');
  const [hasKey,setHasKey]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');
  useEffect(()=>{let active=true;api.request<{provider:string;model:string;key_configured:boolean}>('GET','/settings/ai').then(s=>{if(active){setProvider(s.provider);setModel(s.model);setHasKey(s.key_configured);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  const save=async(test=false)=>{setBusy(true);setError('');setMessage('');try{
    await api.request('PUT','/settings/ai',{provider,model,...(key.trim()?{api_key:key.trim()}: {})});setKey('');
    await refreshCapabilities();
    const current=await api.request<{key_configured:boolean}>('GET','/settings/ai');setHasKey(current.key_configured);
    if(test){const r=await api.request<{reply:string}>('POST','/settings/ai/test',{});setMessage('Kết nối thành công: '+r.reply);}else setMessage('Đã lưu cấu hình AI.');
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const returnTo=new URLSearchParams(path.split('?')[1]||'').get('returnTo');
  return <div className="max-w-2xl mx-auto space-y-5 pb-16"><h1 className="text-2xl font-bold">Cài đặt AI</h1><p>Ứng dụng cá nhân mở toàn bộ tính năng học. Chỉ cần kết nối model để dùng các chức năng AI.</p>
    <label className="block">Nhà cung cấp<select aria-label="Nhà cung cấp AI" className="block border rounded-xl p-3 w-full" value={provider} onChange={e=>{setProvider(e.target.value);setModel(e.target.value==='gemini'?'gemini-3.8-flash':'qwen3:8b');}}><option value="gemini">Gemini API</option><option value="ollama">Ollama trên máy</option></select></label>
    <label className="block">Model<input aria-label="Model AI" className="block border rounded-xl p-3 w-full" value={model} onChange={e=>setModel(e.target.value)}/></label>
    {provider==='gemini'?<><p className="text-sm">Bạn có thể cấu hình GEMINI_API_KEY trong .env thay cho nhập ở đây. Key trong phần này được lưu riêng trên BE theo tài khoản; không trả về trình duyệt.</p><label className="block">API key {hasKey?'(đã cấu hình)':''}<input type="password" aria-label="API key" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} placeholder={hasKey?'Để trống để giữ key hiện tại':'Dán Gemini API key của bạn'} className="block border rounded-xl p-3 w-full"/></label><a className="underline text-sm" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Tạo key trong Google AI Studio</a></>:<p>Ollama cần chạy trên máy tại cổng 11434 và đã tải model bạn chọn. Ứng dụng không tự tải model hoặc tự chuyển sang dịch vụ trả phí.</p>}
    <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={()=>void save()} className="border rounded-xl p-3">Lưu</button><button disabled={busy} onClick={()=>void save(true)} className="bg-slate-900 text-white rounded-xl p-3">{busy?'Đang kiểm tra...':'Lưu và kiểm tra kết nối thật'}</button><button onClick={()=>navigate(returnTo?.startsWith('/')&&!returnTo.startsWith('//')?returnTo:'/') } className="border rounded-xl p-3">Quay lại học</button></div>
    {error&&<p role="alert" className="text-rose-600">{error}</p>}{message&&<p role="status">{message}</p>}
  </div>;
}
