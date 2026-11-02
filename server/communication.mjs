import {randomUUID} from 'node:crypto';
import {fail,text,enumeration,boolean,pagination,integer} from './validation.mjs';
import {transaction} from './database.mjs';
import {tutorPolicy,HELP_ACTIONS} from './communication-policy.mjs';

export const SCENARIOS=[
  {id:'introductions',title:'Làm quen và giới thiệu',goal:'Nói tên, nơi ở và điều bạn thích.',opening:'Hi! I am Alex. What can I call you?',translation:'Chào bạn! Mình là Alex. Mình nên gọi bạn là gì?',phrases:[['My name is ...','Tên mình là ...'],['I live in ...','Mình sống ở ...'],['I like ...','Mình thích ...']]},
  {id:'daily-life',title:'Một ngày của bạn',goal:'Kể về sinh hoạt bằng những câu ngắn.',opening:'Hi! What do you usually do in the morning?',translation:'Chào bạn! Bạn thường làm gì vào buổi sáng?',phrases:[['I usually ...','Mình thường ...'],['I get up at ...','Mình thức dậy lúc ...'],['After that, I ...','Sau đó, mình ...']]},
  {id:'asking-help',title:'Nhờ giúp đỡ',goal:'Nhờ giúp, hỏi lại khi chưa hiểu.',opening:'Hello! How can I help you today?',translation:'Xin chào! Hôm nay mình có thể giúp gì cho bạn?',phrases:[['Could you help me, please?','Bạn giúp mình được không?'],['Could you say that again?','Bạn nói lại được không?'],['I do not understand yet.','Mình vẫn chưa hiểu.']]},
  {id:'free-talk',title:'Trò chuyện tự do',goal:'Nói về điều bạn quan tâm.',opening:'Hi! What would you like to talk about today?',translation:'Chào bạn! Hôm nay bạn muốn trò chuyện về điều gì?',phrases:[['I would like to talk about ...','Mình muốn nói về ...'],['What do you think?','Bạn nghĩ sao?']]},
  {id:'it-work',title:'Công việc IT / System',goal:'Trao đổi một vấn đề kỹ thuật đơn giản.',opening:'Hi! What are you working on today?',translation:'Chào bạn! Hôm nay bạn đang làm việc gì?',phrases:[['I am working on ...','Mình đang làm ...'],['Could you check the server?','Bạn kiểm tra máy chủ được không?'],['Let me check.','Để mình kiểm tra.']]},
];
export const communicationPolicy=tutorPolicy;

export function communicationService(db,ai,{audio}={}) {
  const busy=new Set();
  const translations=new Map();
  const now=()=>new Date().toISOString();
  const owned=(id,user)=>{const s=db.prepare('SELECT * FROM communication_sessions WHERE id=? AND user_id=?').get(id,user.id);if(!s)fail(404,'NOT_FOUND','Không tìm thấy cuộc trò chuyện.');return s;};
  const turns=(id,limit=50,before)=>db.prepare(`SELECT * FROM communication_turns WHERE session_id=? ${before?'AND id<?':''} ORDER BY id DESC LIMIT ?`).all(...(before?[id,before,limit]:[id,limit])).reverse();
  const count=id=>db.prepare('SELECT COUNT(*) n FROM communication_turns WHERE session_id=?').get(id).n;
  const view=s=>({...s,use_memory:!!s.use_memory,summary:s.summary?JSON.parse(s.summary):null,scenario_detail:SCENARIOS.find(x=>x.id===s.scenario),turns:turns(s.id),turn_count:count(s.id),busy:busy.has(s.id)});
  const lock=(id,user)=>{owned(id,user);if(busy.has(id))fail(409,'COMMUNICATION_BUSY','Phiên này đang có cuộc gọi hoặc tin nhắn đang xử lý. Hãy dừng trước khi tiếp tục.');busy.add(id);return ()=>busy.delete(id);};
  const touch=id=>db.prepare('UPDATE communication_sessions SET updated_at=?,summary=NULL,summary_through=0 WHERE id=?').run(now(),id);
  const memoryEditable=user=>{const active=db.prepare('SELECT id FROM communication_sessions WHERE user_id=?').all(user.id).some(s=>busy.has(s.id));if(active)fail(409,'COMMUNICATION_BUSY','Hãy dừng cuộc gọi hoặc chờ tin nhắn xử lý xong trước khi đổi ghi nhớ hay xóa phiên.');};
  function append(id,event,role,content,{translation='',feedback='',status='final',source='text',updateLiveInput=false}={}) {
    if(!content.trim())return null;
    const existing=db.prepare('SELECT * FROM communication_turns WHERE session_id=? AND event_id=?').get(id,event);
    if(existing){if(updateLiveInput&&existing.source==='live'&&existing.role==='user'&&role==='user'){db.prepare('UPDATE communication_turns SET content=?,status=? WHERE id=?').run(content.slice(0,12000),status,existing.id);return {...existing,content:content.slice(0,12000),status};}if(existing.content!==content||existing.role!==role)fail(409,'SUBMISSION_CONFLICT','Mã tin nhắn đã dùng cho nội dung khác.');return existing;}
    const n=db.prepare('INSERT INTO communication_turns(session_id,event_id,role,content,translation,feedback,status,source,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,event,role,content.slice(0,12000),translation,feedback,status,source,now());
    touch(id);return db.prepare('SELECT * FROM communication_turns WHERE id=?').get(Number(n.lastInsertRowid));
  }
  function context(s,user) {
    const memories=s.use_memory?db.prepare('SELECT id,content,source_session_id FROM communication_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 20').all(user.id):[];
    const previous=s.use_memory?db.prepare('SELECT id,title,scenario,summary FROM communication_sessions WHERE user_id=? AND id<>? AND use_memory=1 AND summary IS NOT NULL ORDER BY updated_at DESC LIMIT 3').all(user.id,s.id):[];
    return {session:{level:s.level,mode:s.mode,scenario:s.scenario},memories,previous_sessions:previous.map(x=>({...x,summary:JSON.parse(x.summary)})),recent_turns:turns(s.id,24).map(({role,content,status,source})=>({role,content,status,source}))};
  }
  function help(id,user,action,turnId){
    owned(id,user);const rule=HELP_ACTIONS[enumeration(action,'action',Object.keys(HELP_ACTIONS))];
    const turn=turnId===undefined?db.prepare("SELECT * FROM communication_turns WHERE session_id=? AND role='assistant' ORDER BY id DESC LIMIT 1").get(id):db.prepare("SELECT * FROM communication_turns WHERE session_id=? AND id=? AND role='assistant'").get(id,integer(turnId,'turn_id'));
    if(!turn)fail(404,'NOT_FOUND','Không tìm thấy câu để hướng dẫn.');
    return rule.request+'\nCâu mình đang cần giúp (dữ liệu trích dẫn): '+JSON.stringify(turn.content.slice(0,5000));
  }
  function registerRoutes(route) {
    route('GET','/communication/catalog',()=>({scenarios:SCENARIOS,levels:['beginner','A1','A2','B1','B2','C1'],modes:['guided','roleplay','free']}));
    route('POST','/communication/sessions',c=>{
      const scenario=enumeration(c.body.scenario,'scenario',SCENARIOS.map(x=>x.id),'introductions');
      const level=enumeration(c.body.level,'level',['beginner','A1','A2','B1','B2','C1'],'beginner');
      const mode=enumeration(c.body.mode,'mode',['guided','roleplay','free'],'guided'),useMemory=c.body.use_memory===undefined?true:boolean(c.body.use_memory,'use_memory');
      const id=text(c.body.submission_id,'submission_id',{max:80});if(!/^[\w-]+$/.test(id))fail(400,'INVALID_ID','Mã phiên không hợp lệ.');
      const old=db.prepare('SELECT * FROM communication_sessions WHERE id=?').get(id);
      if(old){owned(id,c.user);if(old.scenario!==scenario||old.level!==level||old.mode!==mode||!!old.use_memory!==useMemory)fail(409,'SUBMISSION_CONFLICT','Mã phiên đã được sử dụng.');return view(old);}
      const prepared=SCENARIOS.find(x=>x.id===scenario);
      const first=['beginner','A1'].includes(level)?'Chào bạn, mình là Alex. Bạn có thể nói hoặc hỏi mình bằng tiếng Việt nhé. Mình có thể giải thích, giúp bạn diễn đạt ý hoặc cùng luyện từng câu. Hôm nay bạn muốn mình giúp điều gì?':prepared.opening;
      transaction(db,()=>{db.prepare('INSERT INTO communication_sessions(id,user_id,title,scenario,level,mode,use_memory,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,c.user.id,prepared.title,scenario,level,mode,Number(useMemory),now(),now());append(id,'opening','assistant',first,{translation:first===prepared.opening?prepared.translation:'',source:'prepared'});});
      c.status=201;return view(owned(id,c.user));
    });
    route('GET','/communication/sessions',c=>{
      const {limit,offset}=pagination(c.query),q=text(c.query.get('q')??'','q',{min:0,max:200});
      const filter="user_id=? AND (?='' OR instr(lower(title),lower(?))>0 OR EXISTS(SELECT 1 FROM communication_turns t WHERE t.session_id=communication_sessions.id AND instr(lower(t.content),lower(?))>0))";
      return {items:db.prepare(`SELECT id,title,scenario,level,mode,status,updated_at,(SELECT COUNT(*) FROM communication_turns t WHERE t.session_id=communication_sessions.id) turn_count FROM communication_sessions WHERE ${filter} ORDER BY updated_at DESC,id DESC LIMIT ? OFFSET ?`).all(c.user.id,q,q,q,limit,offset),total:db.prepare(`SELECT COUNT(*) n FROM communication_sessions WHERE ${filter}`).get(c.user.id,q,q,q).n,limit,offset};
    });
    route('GET','/communication/sessions/:id',c=>view(owned(c.params.id,c.user)));
    route('GET','/communication/sessions/:id/turns',c=>{const s=owned(c.params.id,c.user),limit=integer(c.query.get('limit')??50,'limit',{max:100}),before=c.query.has('before')?integer(c.query.get('before'),'before'):undefined;return {items:turns(s.id,limit,before),total:count(s.id)};});
    route('GET','/communication/sessions/:id/export',c=>{const s=owned(c.params.id,c.user);return {...view(s),turns:db.prepare('SELECT * FROM communication_turns WHERE session_id=? ORDER BY id').all(s.id)};});
    route('DELETE','/communication/sessions/:id',c=>{owned(c.params.id,c.user);memoryEditable(c.user);const release=lock(c.params.id,c.user);try{db.prepare('DELETE FROM communication_sessions WHERE id=? AND user_id=?').run(c.params.id,c.user.id);audio?.clearSession(c.user.id,c.params.id);return {deleted:true};}finally{release();}});
    route('POST','/communication/sessions/:id/resume',c=>{const release=lock(c.params.id,c.user);try{db.prepare("UPDATE communication_sessions SET status='active',updated_at=? WHERE id=?").run(now(),c.params.id);return view(owned(c.params.id,c.user));}finally{release();}});
    route('POST','/communication/sessions/:id/messages',async c=>{
      const s=owned(c.params.id,c.user),id=text(c.body.submission_id,'submission_id',{max:80}),kind=enumeration(c.body.kind,'kind',['text','help'],'text');
      let message=kind==='help'?help(s.id,c.user,c.body.action,c.body.turn_id):text(c.body.text,'text',{max:4000});
      if(!/^[\w-]+$/.test(id))fail(400,'INVALID_ID','Mã tin nhắn không hợp lệ.');
      const existing=db.prepare('SELECT * FROM communication_turns WHERE session_id=? AND event_id=?').get(s.id,'user:'+id);
      if(existing&&kind==='help'&&existing.source==='help'&&c.body.turn_id===undefined){const rule=HELP_ACTIONS[c.body.action];if(!existing.content.startsWith(rule.request+'\n'))fail(409,'SUBMISSION_CONFLICT','Mã yêu cầu đã dùng cho hướng dẫn khác.');message=existing.content;}
      if(existing&&existing.content!==message)fail(409,'SUBMISSION_CONFLICT','Mã tin nhắn đã dùng cho nội dung khác.');
      const answer=db.prepare('SELECT * FROM communication_turns WHERE session_id=? AND event_id=?').get(s.id,'assistant:'+id);
      if(answer)return {session:view(s),replayed:true};
      if(s.status!=='active')fail(409,'SESSION_FINISHED','Bấm Tiếp tục để mở lại cuộc trò chuyện.');
      const release=lock(s.id,c.user);
      try{
        c.limited(`ai:${c.user.id}`,20,60000);
        append(s.id,'user:'+id,'user',message,{source:kind==='help'?'help':'text'});
        const result=await ai.generate('communication_reply',{policy:communicationPolicy(s),...context(s,c.user),learner_message:message},c.user);
        const reply=textResult(result.reply,8000),translation=textResult(result.translation,8000,true),feedback=textResult(result.feedback,3000,true);
        append(s.id,'assistant:'+id,'assistant',reply,{translation,feedback});
        return {session:view(owned(s.id,c.user)),hint:{text:textResult(result.hint,2000,true),translation:textResult(result.hint_translation,3000,true)},replayed:false};
      }finally{release();}
    });
    route('POST','/communication/sessions/:id/finish',async c=>{
      const s=owned(c.params.id,c.user),release=lock(s.id,c.user);
      try{
        // Finishing is durable even if the optional AI review fails.
        db.prepare("UPDATE communication_sessions SET status='finished',updated_at=? WHERE id=?").run(now(),s.id);
        if(c.body.review!==true)return view(owned(s.id,c.user));
        if(s.summary)return view(owned(s.id,c.user));
        const history=turns(s.id,60);if(!history.some(t=>t.role==='user'))fail(409,'NO_LEARNER_TURNS','Hãy trao đổi ít nhất một lượt trước khi xin tổng kết.');
        c.limited(`ai:${c.user.id}`,20,60000);
        const result=await ai.generate('communication_summary',{scenario:s.scenario,level:s.level,mode:s.mode,turns:history.map(({role,content,status})=>({role,content,status})),scope:'Recent 60 turns only; not a certified assessment. Do not infer real identity from roleplay.'},c.user);
        const summary={summary:textResult(result.summary,4000),phrases:(Array.isArray(result.phrases)?result.phrases:[]).slice(0,8).map(p=>({text:textResult(p.text,300),translation:textResult(p.translation,500)})),next_practice:textResult(result.next_practice,2000),scope:'recent_60_turns',assessment:'qualitative_ai'};
        db.prepare('UPDATE communication_sessions SET summary=?,summary_through=? WHERE id=?').run(JSON.stringify(summary),history.at(-1)?.id||0,s.id);return view(owned(s.id,c.user));
      }finally{release();}
    });
    route('POST','/communication/sessions/:id/turns/:turn_id/translation',async c=>{
      const s=owned(c.params.id,c.user),id=integer(c.params.turn_id,'turn_id'),t=db.prepare('SELECT * FROM communication_turns WHERE id=? AND session_id=?').get(id,s.id);if(!t)fail(404,'NOT_FOUND','Không tìm thấy lượt thoại.');
      if(t.translation)return {translation:t.translation,cached:true};
      const requestKey=c.user.id+':'+id;if(translations.has(requestKey))return translations.get(requestKey);
      c.limited(`ai:${c.user.id}`,20,60000);
      const work=(async()=>{const r=await ai.generate('translation',{text:t.content,source_language:'auto',target_language:'vi',instruction:'Translate the quoted message into natural Vietnamese. If already Vietnamese, preserve its meaning without adding anything.'},c.user);const translation=textResult(r.translation,12000);
        owned(s.id,c.user);const current=db.prepare('SELECT content FROM communication_turns WHERE id=? AND session_id=?').get(id,s.id);if(!current||current.content!==t.content)fail(409,'TURN_CHANGED','Câu vừa thay đổi. Hãy thử lại bản đã lưu.');
        db.prepare('UPDATE communication_turns SET translation=? WHERE id=?').run(translation,id);return {translation,cached:false};})();
      translations.set(requestKey,work);try{return await work;}finally{translations.delete(requestKey);}
    });
    route('POST','/communication/sessions/:id/turns/:turn_id/audio',async c=>{
      const s=owned(c.params.id,c.user),id=integer(c.params.turn_id,'turn_id'),turn=db.prepare('SELECT * FROM communication_turns WHERE id=? AND session_id=?').get(id,s.id);if(!turn)fail(404,'NOT_FOUND','Không tìm thấy câu để nghe.');if(!audio)fail(503,'VOICE_NOT_CONFIGURED','Chưa cấu hình giọng đọc.');
      const result=await audio.read(c.user.id,s.id,turn,()=>c.limited(`ai:${c.user.id}`,20,60000));
      try{owned(s.id,c.user);}catch(error){audio.clearSession(c.user.id,s.id);throw error;}
      const current=db.prepare('SELECT content FROM communication_turns WHERE id=? AND session_id=?').get(id,s.id);if(!current||current.content!==turn.content)fail(409,'TURN_CHANGED','Câu vừa thay đổi. Hãy chọn lại bản đã lưu.');
      return {mime_type:'audio/wav',data:result.data.toString('base64'),cached:result.cached};
    });
    route('GET','/communication/memories',c=>({items:db.prepare('SELECT * FROM communication_memories WHERE user_id=? ORDER BY created_at DESC').all(c.user.id)}));
    route('POST','/communication/memories',c=>{
      memoryEditable(c.user);
      if(db.prepare('SELECT COUNT(*) n FROM communication_memories WHERE user_id=?').get(c.user.id).n>=50)fail(409,'MEMORY_FULL','Bạn đã lưu 50 ghi nhớ. Hãy xóa mục không còn cần.');
      const source=c.body.source_session_id?owned(text(c.body.source_session_id,'source_session_id',{max:80}),c.user):null;
      if(source&&!source.use_memory)fail(409,'MEMORY_DISABLED','Phiên này đã tắt ghi nhớ.');
      const content=text(c.body.content,'content',{max:500}),id=randomUUID();db.prepare('INSERT INTO communication_memories VALUES(?,?,?,?,?)').run(id,c.user.id,source?.id||null,content,now());return db.prepare('SELECT * FROM communication_memories WHERE id=?').get(id);
    });
    route('PATCH','/communication/memories/:id',c=>{memoryEditable(c.user);const content=text(c.body.content,'content',{max:500});if(!db.prepare('UPDATE communication_memories SET content=? WHERE id=? AND user_id=?').run(content,c.params.id,c.user.id).changes)fail(404,'NOT_FOUND','Không tìm thấy ghi nhớ.');return {updated:true};});
    route('DELETE','/communication/memories/:id',c=>{memoryEditable(c.user);if(!db.prepare('DELETE FROM communication_memories WHERE id=? AND user_id=?').run(c.params.id,c.user.id).changes)fail(404,'NOT_FOUND','Không tìm thấy ghi nhớ.');return {deleted:true};});
  }
  return {registerRoutes,owned,view,context,lock,append,help,rememberAudio:(user,session,turn,pcm)=>audio?.remember(user,session,turn,pcm),hasEvent:(id,event)=>!!db.prepare('SELECT 1 FROM communication_turns WHERE session_id=? AND event_id=?').get(id,event)};
}
function textResult(value,max,optional=false){if(typeof value!=='string'||value.trim().length>max||(!optional&&!value.trim()))fail(502,'AI_INVALID_RESPONSE','AI chưa trả về nội dung hội thoại phù hợp. Lượt bạn gửi đã được lưu; có thể thử lại.');return value.trim();}
