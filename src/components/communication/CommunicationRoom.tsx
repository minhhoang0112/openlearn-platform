import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,Brain,Check,ChevronDown,Download,Headphones,Loader2,Mic,MicOff,MoreHorizontal,PhoneOff,Send,Settings2,Square,Trash2,Volume2,X} from 'lucide-react';
import {communicationApi as api,CommunicationCapabilities,CommunicationSession,CommunicationTurn} from '../../api/communication';
import {useCommunicationVoice} from '../../hooks/useCommunicationVoice';
import {useRouter} from '../../context/RouterContext';

const base='inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border disabled:opacity-50 disabled:cursor-not-allowed';
const button=base+' border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800';
const primary=base+' border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700';
const field='w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm';
const labels:Record<string,string>={beginner:'Mới bắt đầu',A1:'A1',A2:'A2',B1:'B1',B2:'B2',C1:'C1'};
const errorText=(e:unknown)=>(e as Error).message||'Chưa xử lý được. Hãy thử lại.';
type Replay={id:number;url:string};

export function CommunicationRoom({id,memoryPanel}:{id:string;memoryPanel:React.ReactNode}){
  const {navigate}=useRouter();
  const [session,setSession]=useState<CommunicationSession|null>(null),[caps,setCaps]=useState<CommunicationCapabilities|null>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[draft,setDraft]=useState(''),[livePending,setLivePending]=useState(false);
  const [panel,setPanel]=useState<'settings'|'support'|'memory'|'summary'|null>(null),[confirmDelete,setConfirmDelete]=useState(false),[showTranslations,setShowTranslations]=useState(true);
  const [hint,setHint]=useState<{text:string;translation:string}|null>(null),[replay,setReplay]=useState<Replay|null>(null),[audioLoading,setAudioLoading]=useState<number|null>(null),[unseen,setUnseen]=useState(false);
  const draftRef=useRef(draft);draftRef.current=draft;
  const pending=useRef<{id:string;text:string}|null>(null),scroll=useRef<HTMLDivElement>(null),follow=useRef(true),audioElement=useRef<HTMLAudioElement>(null),audioCache=useRef(new Map<number,string>()),audioRequest=useRef(0);
  const voice=useCommunicationVoice(id,t=>{
    setSession(s=>s?{...s,turns:[...s.turns.filter(x=>x.id!==t.id),t].sort((a,b)=>a.id-b.id),turn_count:s.turn_count+(s.turns.some(x=>x.id===t.id)?0:1)}:s);
    if(t.source==='live_text'||t.source==='help'){setLivePending(false);if(t.content===draftRef.current)setDraft('');}
  });
  const calling=voice.phase!=='idle';
  const load=()=>api.session(id).then(setSession);
  const stopReplay=()=>{audioRequest.current++;audioElement.current?.pause();voice.resumeAfterPlayback();setReplay(null);setAudioLoading(null);};
  useEffect(()=>{
    let active=true;Promise.all([api.session(id),api.capabilities()]).then(([s,c])=>{if(active){setSession(s);setCaps(c);}}).catch(e=>{if(active)setError(errorText(e));});
    const resize=()=>document.documentElement.style.setProperty('--communication-vh',`${window.visualViewport?.height||window.innerHeight}px`);
    resize();window.visualViewport?.addEventListener('resize',resize);
    return()=>{active=false;audioRequest.current++;audioElement.current?.pause();for(const url of audioCache.current.values())URL.revokeObjectURL(url);audioCache.current.clear();window.visualViewport?.removeEventListener('resize',resize);document.documentElement.style.removeProperty('--communication-vh');};
  },[id]);
  useEffect(()=>{if(!voice.connected)setLivePending(false);},[voice.connected]);
  useEffect(()=>{if(!livePending)return;const timer=setTimeout(()=>{setLivePending(false);setError('Chưa có xác nhận lưu yêu cầu. Tải lại lịch sử trước khi gửi lại.');},10000);return()=>clearTimeout(timer);},[livePending]);
  useEffect(()=>{if(follow.current){scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:'smooth'});setUnseen(false);}else setUnseen(true);},[session?.turns.length,voice.input,voice.output]);
  useEffect(()=>{if(audioElement.current)audioElement.current.playbackRate=voice.rate;},[voice.rate,replay]);
  useEffect(()=>{if(!replay||!audioElement.current)return;const el=audioElement.current as HTMLAudioElement&{setSinkId?:(id:string)=>Promise<void>};if(el.setSinkId)void el.setSinkId(voice.outputDevice).catch(()=>setError('Chưa chuyển được loa cho câu nghe lại. Hãy chọn thiết bị khác.'));},[voice.outputDevice,replay]);
  async function run(fn:()=>Promise<unknown>){setBusy(true);setError('');try{await fn();}catch(e){setError(errorText(e));try{await load();}catch{}}finally{setBusy(false);}}
  async function send(e:React.FormEvent){e.preventDefault();const text=draft.trim();if(!text||busy||livePending)return;stopReplay();follow.current=true;
    if(voice.connected){voice.interrupt();if(voice.sendText(text))setLivePending(true);else setError('Chưa gửi được. Câu của bạn vẫn được giữ trong khung nhập.');return;}
    if(!pending.current||pending.current.text!==text)pending.current={id:crypto.randomUUID(),text};const request=pending.current;
    await run(async()=>{const r=await api.message(id,request.id,request.text);setSession(r.session);setHint(r.hint||null);if(draftRef.current.trim()===text)setDraft('');pending.current=null;});
  }
  async function help(action:string,turnId?:number){if(busy||livePending||voice.phase==='connecting')return;stopReplay();follow.current=true;setError('');
    if(voice.connected){voice.interrupt();if(voice.sendHelp(action,turnId))setLivePending(true);else setError('Chưa gửi được yêu cầu hướng dẫn.');return;}
    await run(async()=>{const r=await api.help(id,action,turnId);setSession(r.session);setHint(r.hint||null);});
  }
  async function listen(turn:CommunicationTurn){if(audioLoading===turn.id){stopReplay();return;}stopReplay();const request=++audioRequest.current;setError('');setAudioLoading(turn.id);voice.pauseForPlayback();
    try{
      let url=audioCache.current.get(turn.id);
      if(!url){const r=await api.audio(id,turn.id);if(request!==audioRequest.current)return;const bytes=Uint8Array.from(atob(r.data),c=>c.charCodeAt(0));url=URL.createObjectURL(new Blob([bytes],{type:r.mime_type}));audioCache.current.set(turn.id,url);}
      if(request!==audioRequest.current)return;setReplay({id:turn.id,url});setAudioLoading(null);
    }catch(e){if(request===audioRequest.current){setAudioLoading(null);setError(errorText(e));voice.resumeAfterPlayback();}}
  }
  async function playReplay(el:HTMLAudioElement){voice.pauseForPlayback();el.playbackRate=voice.rate;try{await el.play();}catch{setError('Nhấn nút Phát trong khung nghe lại để bật tiếng.');}}
  async function exportHistory(){const data=await api.export(id),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`openlearn-conversation-${id}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  if(!session)return <div className="h-full flex flex-col items-start gap-4"><button className={button} onClick={()=>navigate('/communication')}><ArrowLeft size={16}/> Về Giao tiếp AI</button><p role={error?'alert':'status'}>{error||'Đang mở phòng...'}</p></div>;
  const assistant=session.turns.filter(t=>t.role==='assistant').at(-1);
  const status=voice.localPlayback?'Đang nghe lại · Mic tạm dừng':({idle:'Bạn có thể nhập chữ hoặc bật mic',connecting:'Đang kết nối...',listening:voice.muted?'Mic đã tắt':'Đang nghe bạn',thinking:'Alex đang nghĩ',speaking:'Alex đang nói'})[voice.phase];
  return <div className="h-full min-h-0 flex flex-col max-w-6xl mx-auto gap-2" data-testid="communication-room">
    <header className="shrink-0 flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
      <button aria-label="Về lịch sử giao tiếp" className={button+' shrink-0'} onClick={()=>{stopReplay();voice.stop();navigate('/communication?tab=history');}}><ArrowLeft size={17}/></button>
      <div className="min-w-0 flex-1"><h1 className="font-bold text-base sm:text-lg truncate">{session.title}</h1><p className="text-xs text-slate-500 truncate">Alex · {labels[session.level]} · Cứ nói tiếng Việt khi cần</p></div>
      <button aria-label="Mẫu câu và gợi ý" title="Mẫu câu và gợi ý" className={button} onClick={()=>setPanel('support')}><Headphones size={17}/><span className="hidden lg:inline">Gợi ý</span></button>
      <button aria-label="Cài đặt cuộc gọi" title="Cài đặt cuộc gọi" className={button} onClick={()=>setPanel('settings')}><Settings2 size={17}/></button>
      <details className="relative"><summary aria-label="Tùy chọn cuộc trò chuyện" className={button+' cursor-pointer list-none'}><MoreHorizontal size={17}/></summary><div className="absolute right-0 top-full mt-2 z-20 w-60 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 p-2 shadow-xl flex flex-col gap-1 text-left">
        <button className={button} onClick={()=>setPanel('summary')}>Tổng kết buổi luyện</button><button className={button} onClick={()=>setPanel('memory')}>Ghi nhớ học tập</button>
        <button className={button} disabled={busy||calling} onClick={()=>void run(exportHistory)}><Download size={15}/> Xuất lịch sử</button>
        <button className={button+' text-rose-600'} disabled={busy||calling} onClick={()=>setConfirmDelete(true)}><Trash2 size={15}/> Xóa cuộc trò chuyện</button>
      </div></details>
    </header>
    <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1"><span>Hỏi, nhờ giải thích hoặc cùng luyện một ý nhỏ.</span><label className="inline-flex items-center gap-1"><input type="checkbox" checked={showTranslations} onChange={e=>setShowTranslations(e.target.checked)}/> Hiện nghĩa đã có</label></div>
    <div ref={scroll} role="region" aria-label="Cuộc trò chuyện" className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-5 space-y-4" onScroll={()=>{const el=scroll.current;if(el)follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<120;}}>
      {session.turn_count>session.turns.length&&<button className={button+' mx-auto flex'} disabled={busy} onClick={()=>void run(async()=>{follow.current=false;const oldHeight=scroll.current?.scrollHeight||0,r=await api.turns(id,session.turns[0].id);setSession(s=>s?{...s,turns:[...r.items,...s.turns],turn_count:r.total}:s);requestAnimationFrame(()=>{if(scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight-oldHeight;});})}>Xem các lượt trước</button>}
      {session.turns.map(t=><Turn key={t.id} turn={t} sessionId={id} showTranslation={showTranslations} audioLoading={audioLoading===t.id} listening={replay?.id===t.id} listen={()=>void listen(t)} explain={()=>void help('explain',t.id)} onTranslation={translation=>setSession(s=>s?{...s,turns:s.turns.map(x=>x.id===t.id?{...x,translation}:x)}:s)}/>)}
      {(voice.input||voice.output)&&<div className="text-sm text-slate-500 border border-dashed border-indigo-200 rounded-xl p-3"><p className="text-xs mb-1">Đang nhận lời thoại · Bản chép tạm</p>{voice.input&&<p>Bạn: {voice.input}</p>}{voice.output&&<p>Alex: {voice.output}</p>}</div>}
      {(busy||livePending)&&<p role="status" className="flex gap-2 items-center text-sm text-indigo-500"><Loader2 size={15} className="animate-spin"/>{livePending?'Đang lưu yêu cầu...':'Alex đang trả lời...'}</p>}
    </div>
    <footer role="region" className="shrink-0 space-y-2 bg-slate-50 dark:bg-slate-950" aria-label="Điều khiển cuộc gọi">
      {unseen&&<button className={button+' mx-auto flex py-1 text-xs'} onClick={()=>{follow.current=true;setUnseen(false);scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:'smooth'});}}>Tin mới <ChevronDown size={14}/></button>}
      {(error||voice.error||voice.speakerError)&&<div role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-3 py-2 text-xs max-h-20 overflow-auto"><span className="flex-1">{error||voice.error||voice.speakerError}{voice.speakerError&&<button className="underline ml-2" onClick={voice.resumeSpeaker}>Bật lại loa</button>}</span>{error&&<button aria-label="Đóng thông báo" onClick={()=>setError('')}><X size={14}/></button>}<button className="underline shrink-0" disabled={busy||calling} onClick={()=>void run(load)}>Tải lại lịch sử</button></div>}
      {(replay||audioLoading)&&<div className="flex items-center gap-2 rounded-xl border border-indigo-200 p-2 bg-indigo-50 dark:bg-indigo-950/30"><span className="text-xs shrink-0">{audioLoading?'Đang chuẩn bị giọng...':'Nghe lại'}</span>{replay&&<audio aria-label="Giọng đọc nghe lại" ref={el=>{audioElement.current=el;if(el&&el.src!==replay.url){el.src=replay.url;void playReplay(el);}}} controls className="min-w-0 h-8 flex-1" onPlay={voice.pauseForPlayback} onPause={voice.resumeAfterPlayback} onEnded={stopReplay}/>}<button aria-label="Đóng nghe lại" onClick={stopReplay} className="shrink-0 p-1"><X size={16}/></button></div>}
      <div className="flex items-center flex-wrap gap-2">
        {calling?<><button className={button+' text-rose-600'} onClick={()=>{stopReplay();voice.stop();void run(load);}}><PhoneOff size={16}/><span>Dừng cuộc gọi</span></button><button className={button} disabled={!voice.connected||voice.localPlayback} onClick={()=>voice.setMuted(!voice.muted)}>{voice.muted?<MicOff size={16}/>:<Mic size={16}/>}<span className="sr-only sm:not-sr-only">{voice.muted?'Bật mic':'Tắt mic'}</span></button><button className={button} disabled={!voice.connected} onClick={voice.interrupt} aria-label="Dừng phát"><Square size={15}/></button></>:<button className={primary} disabled={busy||!caps?.voice.configured||session.status!=='active'} onClick={()=>{stopReplay();setError('');void voice.start();}}><Mic size={17}/> Bắt đầu gọi thoại</button>}
        <span role="status" className="text-xs text-slate-500 flex-1 min-w-0">{status}</span>{calling&&<meter aria-label="Âm lượng microphone" min={0} max={1} value={voice.level} className="w-14 sm:w-20"/>}
      </div>
      {session.status==='active'?<form onSubmit={send} className="space-y-2"><div className="flex items-end gap-2"><label className="sr-only" htmlFor="communication-message">Nói qua mic hoặc nhập câu của bạn</label><textarea id="communication-message" className={field+' resize-none min-h-10 max-h-20'} rows={1} maxLength={4000} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit();}}} disabled={busy||livePending||voice.phase==='connecting'} placeholder="Cứ nói tiếng Việt: Mình chưa hiểu câu này..."/><button type="submit" className={primary+' shrink-0'} disabled={busy||livePending||voice.phase==='connecting'||!draft.trim()||(!voice.connected&&!caps?.text.configured)} aria-label="Gửi"><Send size={17}/></button></div>
        <div className="flex flex-wrap gap-2"><button type="button" className={button+' py-1.5 text-xs'} disabled={busy||livePending||voice.phase==='connecting'||!assistant} onClick={()=>void help('explain')}>Tôi chưa hiểu</button><button type="button" className={button+' py-1.5 text-xs'} disabled={busy||livePending||voice.phase==='connecting'||!assistant} onClick={()=>void help('suggest')}>Giúp tôi trả lời</button><button type="button" className={button+' py-1.5 text-xs'} disabled={busy||livePending||voice.phase==='connecting'} onClick={()=>void help('easier')}>Nói dễ hơn</button></div>
      </form>:<button className={primary} disabled={busy} onClick={()=>void run(async()=>setSession(await api.resume(id)))}>Tiếp tục cuộc trò chuyện</button>}
      {!calling&&<p className="text-[10px] text-slate-400">Khi bật mic: âm thanh gửi Gemini, web lưu bản chép lời. Nghe lại dùng giọng đã nhận nếu còn trong bộ nhớ; câu khác tạo giọng một lần.</p>}
    </footer>
    {panel&&<Panel title={panel==='settings'?'Cài đặt cuộc gọi':panel==='support'?'Mẫu câu và gợi ý':panel==='memory'?'Ghi nhớ học tập':'Tổng kết buổi luyện'} close={()=>setPanel(null)}>
      {error&&<p role="alert" className="text-sm text-rose-600 mb-3">{error}</p>}
      {panel==='settings'&&<div className="space-y-4"><p className="text-sm text-slate-500">Bạn có thể hỏi hoàn toàn bằng tiếng Việt. AI theo ý bạn, tình huống là gợi ý bắt đầu.</p><label className="block text-sm">Microphone<select aria-label="Chọn microphone" className={field+' mt-1'} value={voice.inputDevice} disabled={calling} onChange={e=>voice.setInputDevice(e.target.value)}><option value="">Microphone mặc định</option>{voice.devices.filter(d=>d.kind==='audioinput'&&d.deviceId&&d.deviceId!=='default').map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label||`Mic ${i+1}`}</option>)}</select></label><label className="block text-sm">Loa / tai nghe<select aria-label="Chọn loa" className={field+' mt-1'} value={voice.outputDevice} disabled={!('setSinkId' in HTMLMediaElement.prototype)} onChange={e=>voice.setOutputDevice(e.target.value)}><option value="">Loa mặc định</option>{voice.devices.filter(d=>d.kind==='audiooutput'&&d.deviceId&&d.deviceId!=='default').map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label||`Loa ${i+1}`}</option>)}</select></label><button className={button} onClick={()=>void voice.refreshDevices()}>Tải lại danh sách thiết bị</button><label className="block text-sm">Tốc độ nghe<select aria-label="Tốc độ nghe" className={field+' mt-1'} value={voice.rate} onChange={e=>voice.setRate(Number(e.target.value))}>{[0.7,0.85,0.9,1,1.1].map(v=><option key={v} value={v}>{v}×</option>)}</select></label><button className={button} disabled={!voice.connected} onClick={voice.resumeSpeaker}>Bật lại loa</button><p className="text-xs text-slate-500">{voice.notice||'Mic đang tắt.'} Tối đa {caps?.voice.max_session_minutes||20} phút mỗi cuộc gọi. Web không lưu file ghi âm của bạn.</p></div>}
      {panel==='support'&&<div className="space-y-4"><p className="text-sm text-slate-500">{session.scenario_detail.goal} Có thể đổi chủ đề hoặc nhờ AI soạn nội dung bất kỳ lúc nào.</p>{session.scenario_detail.phrases.map(([en,vi])=><div key={en} className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 p-3"><strong>{en}</strong><p className="text-sm text-slate-500 mt-1">{vi}</p></div>)}{hint&&<div className="border rounded-xl p-3"><h3 className="font-bold mb-2">Một cách trả lời có thể thử</h3><p>{hint.text}</p><p className="text-sm text-slate-500">{hint.translation}</p></div>}<button className={primary} onClick={()=>{setPanel(null);void help('suggest');}}>Nhờ Alex giúp theo câu đang nói</button></div>}
      {panel==='memory'&&<fieldset disabled={calling||busy}>{calling&&<p className="text-sm mb-3">Dừng cuộc gọi trước khi sửa ghi nhớ.</p>}{memoryPanel}</fieldset>}
      {panel==='summary'&&<div className="space-y-4">{session.summary?<><h2 className="font-bold">Điều mang theo sau buổi luyện</h2><p>{session.summary.summary}</p><ul className="space-y-2">{session.summary.phrases.map((p,i)=><li key={i}><strong>{p.text}</strong> — {p.translation}</li>)}</ul><p>{session.summary.next_practice}</p></>:<p className="text-sm text-slate-500">Kết thúc và xin nhận xét khi bạn muốn. Bạn có thể tiếp tục lại phiên này sau.</p>}<div className="flex flex-col gap-2"><button className={button} disabled={busy||calling} onClick={()=>void run(async()=>{stopReplay();setSession(await api.finish(id));setPanel(null);})}>Kết thúc buổi luyện</button><button className={primary} disabled={busy||calling||!session.turns.some(t=>t.role==='user')} onClick={()=>void run(async()=>setSession(await api.finish(id,true)))}>Kết thúc và nhận tổng kết AI</button></div>{busy&&<p role="status">Đang xử lý...</p>}<p className="text-xs text-slate-400">Tổng kết dựa trên tối đa 60 lượt gần nhất; không phải điểm thi hoặc đánh giá phát âm.</p></div>}
    </Panel>}
    {confirmDelete&&<Panel title="Xác nhận xóa" close={()=>setConfirmDelete(false)}><p className="mb-4">Xóa cuộc trò chuyện, tổng kết và các ghi nhớ có nguồn từ phiên này?</p><div className="flex gap-2"><button className={button} onClick={()=>setConfirmDelete(false)}>Giữ lại</button><button className={button+' text-rose-600'} disabled={busy} onClick={()=>void run(async()=>{stopReplay();await api.remove(id);navigate('/communication?tab=history');})}>Xóa vĩnh viễn</button></div></Panel>}
  </div>;
}

function Turn({turn:t,sessionId,showTranslation,audioLoading,listening,listen,explain,onTranslation}:{turn:CommunicationTurn;sessionId:string;showTranslation:boolean;audioLoading:boolean;listening:boolean;listen:()=>void;explain:()=>void;onTranslation:(value:string)=>void}){
  const [translating,setTranslating]=useState(false),[error,setError]=useState(''),[revealed,setRevealed]=useState(false);
  async function translate(){setRevealed(true);if(t.translation)return;setTranslating(true);setError('');try{onTranslation((await api.translation(sessionId,t.id)).translation);}catch(e){setError(errorText(e));}finally{setTranslating(false);}}
  const requestedHelp=t.source==='help',content=requestedHelp?t.content.split('\nCâu mình đang cần giúp')[0]:t.content;
  return <article className={'rounded-2xl p-3 sm:p-4 max-w-[94%] sm:max-w-[88%] break-words '+(t.role==='user'?'ml-auto bg-indigo-600 text-white':'bg-slate-100 dark:bg-slate-800')}>
    <div className="text-[11px] flex flex-wrap gap-1.5 items-center opacity-65 mb-1"><strong>{t.role==='user'?'Bạn':'Alex'}</strong>{requestedHelp&&<span>· Yêu cầu hướng dẫn</span>}{t.source==='prepared'&&<span>· Gợi ý mở đầu</span>}{t.status!=='final'&&<span>· {t.status==='interrupted'?'Đã bị ngắt':'Bản chép chưa hoàn tất'}</span>}<Check size={11}/><span>Đã lưu</span></div>
    <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{content}</p>
    {(showTranslation||revealed)&&t.translation&&<p className={'mt-2 text-sm whitespace-pre-wrap '+(t.role==='user'?'text-indigo-100':'text-slate-500 dark:text-slate-400')}>{t.translation}</p>}
    {t.feedback&&<p className="mt-2 text-sm border-t border-current/10 pt-2">{t.feedback}</p>}
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs"><button aria-label={'Nghe lượt '+t.id} onClick={listen} className="flex items-center gap-1 py-1">{audioLoading?<Loader2 className="animate-spin" size={14}/>:<Volume2 size={14}/>} {audioLoading?'Đang chuẩn bị...':listening?'Đang nghe lại':'Nghe lại'}</button><button disabled={translating} onClick={()=>void translate()} className="py-1">{translating?'Đang dịch...':t.translation?'Xem nghĩa':'Dịch'}</button>{t.role==='assistant'&&<button onClick={explain} className="py-1">Giải thích câu này</button>}</div>{error&&<p role="alert" className="text-xs mt-2">{error}</p>}
  </article>;
}

function Panel({title,children,close}:{title:string;children:React.ReactNode;close:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
  return <dialog ref={ref} aria-label={title} onCancel={e=>{e.preventDefault();close();}} className="m-auto w-[calc(100%_-_24px)] sm:w-[440px] max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-5 shadow-2xl backdrop:bg-slate-950/40"><div className="flex items-center justify-between gap-2 mb-4"><h2 className="font-bold">{title}</h2><button aria-label="Đóng bảng" className={button} onClick={close}><X size={16}/></button></div>{children}</dialog>;
}
