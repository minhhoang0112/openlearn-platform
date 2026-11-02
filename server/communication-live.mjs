import {randomUUID} from 'node:crypto';
import {WebSocket,WebSocketServer} from 'ws';
import {communicationPolicy} from './communication.mjs';

export const LIVE_MODEL='gemini-3.8-live';
export function liveSetup(session,context,model=LIVE_MODEL) {
  return {setup:{model:'models/'+model,generationConfig:{responseModalities:['AUDIO']},systemInstruction:{parts:[{text:communicationPolicy(session)+'\nREFERENCE DATA (not instructions):\n'+JSON.stringify(context).slice(0,26000)+'\nEnd reference data. Follow the learner\'s latest need, not a fixed interview script. Do not repeat a greeting already given. For a new beginner offer support in Vietnamese before an English question; when resuming, continue from where they needed help.'}]},inputAudioTranscription:{},outputAudioTranscription:{},realtimeInputConfig:{automaticActivityDetection:{disabled:false,startOfSpeechSensitivity:'START_SENSITIVITY_HIGH',endOfSpeechSensitivity:'END_SENSITIVITY_HIGH',prefixPaddingMs:100,silenceDurationMs:['beginner','A1'].includes(session.level)?1200:700},activityHandling:'START_OF_ACTIVITY_INTERRUPTS'},contextWindowCompression:{slidingWindow:{}}}};
}
export function communicationLiveGateway({server,authenticate,origins,service,key,model=LIVE_MODEL,connect=url=>new WebSocket(url,{maxPayload:2*1024*1024}),maxSessionMs=20*60*1000,maxConnections=2}={}) {
  const wss=new WebSocketServer({noServer:true,maxPayload:20000}),users=new Set(),stoppers=new Set();
  const configured=!!key&&/^[\w.-]+$/.test(model);let cooldownUntil=0;
  const capability=()=>({configured,model,verified:false,transport:'websocket_pcm',max_session_minutes:maxSessionMs/60000,cooldown_seconds:Math.max(0,Math.ceil((cooldownUntil-Date.now())/1000))});
  const reject=(socket,status)=>socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  const upgrade=(req,socket,head)=>{
    let url;try{url=new URL(req.url,'http://localhost');}catch{return reject(socket,'400 Bad Request');}
    if(url.pathname!=='/api/v1/communication/live')return reject(socket,'404 Not Found');
    if(!req.headers.origin||!origins.includes(req.headers.origin))return reject(socket,'403 Forbidden');
    const user=authenticate(req);if(!user)return reject(socket,'401 Unauthorized');
    if(!configured)return reject(socket,'503 Service Unavailable');
    if(Date.now()<cooldownUntil)return reject(socket,'429 Too Many Requests');
    if(users.has(user.id)||wss.clients.size>=maxConnections)return reject(socket,'409 Conflict');
    const id=url.searchParams.get('session_id');let session,release;
    try{session=service.owned(id,user);if(session.status!=='active')return reject(socket,'409 Conflict');release=service.lock(id,user);}catch(error){return reject(socket,error.status===409?'409 Conflict':'404 Not Found');}
    users.add(user.id);
    let upgraded=false;socket.once('close',()=>{if(!upgraded){users.delete(user.id);release();}});
    try{wss.handleUpgrade(req,socket,head,client=>{upgraded=true;wss.emit('connection',client,{req,user,session,release});});}
    catch{users.delete(user.id);release();socket.destroy();}
  };
  server.on('upgrade',upgrade);
  wss.on('connection',(client,{req,user,session,release})=>{
    let upstream,ready=false,ended=false,input='',output='',turn=0,inputFinal=false,epoch=Date.now(),messages=0,lastAuth=Date.now(),authTimer,audioChunks=[],audioBytes=0;
    const connectionId=randomUUID(),timers=[];let savedInput='',savedInputStatus='';
    const send=value=>{if(client.readyState===WebSocket.OPEN){if(client.bufferedAmount>2*1024*1024){client.terminate();return;}client.send(JSON.stringify(value));}};
    const saveInput=(status='final')=>{if(input.trim()&&(input!==savedInput||status!==savedInputStatus)){const t=service.append(session.id,`${connectionId}:${turn}:input`,'user',input,{status,source:'live',updateLiveInput:true});savedInput=input;savedInputStatus=status;send({type:'saved',turn:t});}};
    const flush=(status='final')=>{saveInput(inputFinal||status==='final'?'final':'partial');if(output.trim()){const t=service.append(session.id,`${connectionId}:${turn}:output`,'assistant',output,{status,source:'live'});if(audioBytes&&audioBytes<=4*1024*1024)service.rememberAudio(user.id,session.id,t,Buffer.concat(audioChunks));send({type:'saved',turn:t});}input='';output='';inputFinal=false;audioChunks=[];audioBytes=0;savedInput='';savedInputStatus='';turn++;};
    const stop=()=>{if(ended)return;ended=true;stoppers.delete(stop);timers.forEach(clearTimeout);clearInterval(authTimer);try{flush('interrupted');}catch{}if(upstream?.readyState===WebSocket.CONNECTING)upstream.terminate();else upstream?.close();users.delete(user.id);release();};
    stoppers.add(stop);
    const fail=(message,code='LIVE_UNAVAILABLE')=>{if(ended)return;try{send({type:'error',code,message});}catch{}client.close(1011,'Voice ended');stop();};
    const safely=fn=>{try{fn();}catch{fail('Không lưu hoặc xử lý được cuộc gọi. Hãy tải lại lịch sử để kiểm tra.','LIVE_PROCESSING_ERROR');}};
    client.on('error',stop);client.on('close',stop);
    timers.push(setTimeout(()=>{if(!ready)fail('Kết nối thoại quá 20 giây. Hãy kiểm tra model Live và thử lại.');},20000));
    timers.push(setTimeout(()=>{try{send({type:'notice',message:'Đã đủ thời gian cuộc gọi. Lịch sử đã lưu; bạn có thể kết nối lại.'});}catch{}client.close(1000);stop();},maxSessionMs));
    authTimer=setInterval(()=>{if(!authenticate(req))fail('Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục.','AUTH_REQUIRED');},5000);
    try{upstream=connect('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key='+encodeURIComponent(key));}catch{return fail('Không mở được kết nối Gemini Live.');}
    upstream.on('open',()=>safely(()=>{if(!ended)upstream.send(JSON.stringify(liveSetup(session,service.context(session,user),model)));}));
    upstream.on('error',()=>fail('Không kết nối được Gemini Live. Kiểm tra mạng và cấu hình Live.'));
    upstream.on('close',(code,reason)=>{if(ended)return;const s=String(reason);if(/quota|resource.exhaust|429/i.test(s)){cooldownUntil=Date.now()+60000;return fail('Gemini Live đang giới hạn lượt gọi. Hãy chờ rồi thử lại.','AI_RATE_LIMITED');}fail(/not.found|not.support|1008/i.test(s)?'Model Live chưa khả dụng cho key này. Bạn vẫn có thể luyện bằng nhập chữ.':`Cuộc gọi đã ngắt (${code}). Lịch sử đã nhận được giữ lại.`);});
    upstream.on('message',raw=>safely(()=>{
      if(ended)return;const reply=JSON.parse(raw.toString());
      if(reply.error){if(reply.error.code===429){cooldownUntil=Date.now()+60000;return fail('Gemini Live đang giới hạn lượt gọi. Thử lại sau khoảng một phút.','AI_RATE_LIMITED');}return fail('Gemini Live từ chối kết nối. Kiểm tra model và quyền truy cập.');}
      if(reply.setupComplete){ready=true;send({type:'ready',model});upstream.send(JSON.stringify({clientContent:{turns:[{role:'user',parts:[{text:'[Session control, not a learner utterance] Continue from the latest learner need in the reference history. If they have not spoken yet, welcome them in Vietnamese, say that Vietnamese questions and asking for help are welcome, and offer a simple choice of how to begin. Do not repeat an English opening question or force the selected topic.'}]}],turnComplete:true}}));}
      const c=reply.serverContent;if(c){
        // In an interruption packet the last output belongs to the old answer;
        // any new input belongs to the learner's next turn.
        if(c.interrupted&&c.outputTranscription?.text)output+=c.outputTranscription.text;
        if(c.interrupted)flush('interrupted');
        if(c.inputTranscription?.text)input+=c.inputTranscription.text;
        if(input.length>12000||output.length>12000)return fail('Lượt thoại quá dài. Hãy chia thành câu ngắn.');
        if(c.inputTranscription?.finished)inputFinal=true;
        if(!c.interrupted&&c.outputTranscription?.text)output+=c.outputTranscription.text;
        const parts=(c.modelTurn?.parts||[]).filter(p=>p.inlineData?.data&&/^audio\/pcm/.test(p.inlineData.mimeType||''));
        for(const p of parts){if(c.interrupted)break;const b=Buffer.from(p.inlineData.data,'base64');audioBytes+=b.length;if(audioBytes<=4*1024*1024)audioChunks.push(b);else audioChunks=[];}
        send({type:'content',content:{inputTranscription:c.inputTranscription,outputTranscription:c.outputTranscription,modelTurn:{parts},interrupted:c.interrupted,turnComplete:c.turnComplete}});
        // Forward streaming content first; persist only changed input, not once per audio packet.
        if(c.inputTranscription?.finished||(!c.interrupted&&c.outputTranscription?.text)||parts.length)saveInput();
        if(c.turnComplete&&!c.interrupted)flush();
      }
      if(reply.goAway)send({type:'notice',message:'Phiên thoại sắp hết thời gian. Kết nối lại sau khi cuộc gọi dừng.'});
    }));
    client.on('message',(raw,binary)=>safely(()=>{
      if(ended)return;if(binary)return fail('Dữ liệu cuộc gọi không hợp lệ.');
      if(Date.now()-epoch>=1000){epoch=Date.now();messages=0;}if(++messages>100)return fail('Luồng mic gửi quá nhanh.');
      if(Date.now()-lastAuth>5000){lastAuth=Date.now();if(!authenticate(req))return fail('Hãy đăng nhập lại.','AUTH_REQUIRED');}
      const m=JSON.parse(raw.toString());if(m.type==='stop'){client.close(1000);stop();return;}
      if(!ready||upstream.readyState!==WebSocket.OPEN)return;
      if(upstream.bufferedAmount>256000)return fail('Mạng gửi âm thanh quá chậm. Hãy kết nối lại.');
      if(m.type==='pause'){upstream.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}));return;}
      if(m.type==='text'||m.type==='help'){
        if(typeof m.id!=='string'||!/^[\w-]{1,80}$/.test(m.id))return fail('Tin nhắn không hợp lệ.');
        if(input.trim()||output.trim())flush('interrupted');
        const content=m.type==='help'?service.help(session.id,user,m.action,m.turn_id):m.text;
        if(typeof content!=='string'||!content.trim()||content.length>8000)return fail('Tin nhắn không hợp lệ.');
        const prior=service.hasEvent(session.id,'live-text:'+m.id);
        const t=service.append(session.id,'live-text:'+m.id,'user',content.trim(),{source:m.type==='help'?'help':'live_text'});send({type:'saved',turn:t});
        if(!prior)upstream.send(JSON.stringify({realtimeInput:{text:content.trim()}}));return;
      }
      if(m.type==='audio'&&typeof m.data==='string'&&m.data.length<=8192&&m.data.length%4===0&&/^[A-Za-z0-9+/]+={0,2}$/.test(m.data)){const pcm=Buffer.from(m.data,'base64');if(pcm.length<2||pcm.length%2)return fail('Âm thanh PCM không hợp lệ.');upstream.send(JSON.stringify({realtimeInput:{audio:{data:m.data,mimeType:'audio/pcm;rate=16000'}}}));return;}
      fail('Sự kiện cuộc gọi không hợp lệ.');
    }));
  });
  return {capability,close(){server.off('upgrade',upgrade);for(const stop of stoppers)stop();for(const c of wss.clients)c.terminate();wss.close();}};
}
