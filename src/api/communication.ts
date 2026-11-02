import {api} from './client';
export type CommunicationTurn={id:number;event_id:string;role:'user'|'assistant';content:string;translation:string;feedback:string;status:string;source:string;created_at:string};
export type Scenario={id:string;title:string;goal:string;opening:string;translation:string;phrases:[string,string][]};
export type CommunicationSession={id:string;title:string;level:string;mode:string;scenario:string;use_memory:boolean;status:string;busy:boolean;turns:CommunicationTurn[];turn_count:number;updated_at:string;scenario_detail:Scenario;summary:null|{summary:string;phrases:{text:string;translation:string}[];next_practice:string;scope:string}};
export type CommunicationMemory={id:string;content:string;source_session_id:string|null};
export type CommunicationCapabilities={text:{configured:boolean};voice:{configured:boolean;model:string;cooldown_seconds:number;max_session_minutes:number}};
export const communicationApi={
  catalog:()=>api.request<{scenarios:Scenario[];levels:string[];modes:string[]}>('GET','/communication/catalog'),
  capabilities:()=>api.request<CommunicationCapabilities>('GET','/communication/capabilities'),
  sessions:(q='',offset=0)=>api.request<{items:CommunicationSession[];total:number}>('GET','/communication/sessions?'+new URLSearchParams({q,offset:String(offset),limit:'12'})),
  create:(data:{submission_id:string;scenario:string;level:string;mode:string;use_memory:boolean})=>api.request<CommunicationSession>('POST','/communication/sessions',data),
  session:(id:string)=>api.request<CommunicationSession>('GET',`/communication/sessions/${id}`),
  turns:(id:string,before:number)=>api.request<{items:CommunicationTurn[];total:number}>('GET',`/communication/sessions/${id}/turns?before=${before}`),
  message:(id:string,submission_id:string,text:string)=>api.request<{session:CommunicationSession;hint?:{text:string;translation:string}}>('POST',`/communication/sessions/${id}/messages`,{submission_id,text}),
  help:(id:string,action:string,turn_id?:number)=>api.request<{session:CommunicationSession;hint?:{text:string;translation:string}}>('POST',`/communication/sessions/${id}/messages`,{submission_id:crypto.randomUUID(),kind:'help',action,...(turn_id?{turn_id}:{})}),
  finish:(id:string,review=false)=>api.request<CommunicationSession>('POST',`/communication/sessions/${id}/finish`,{review}),
  resume:(id:string)=>api.request<CommunicationSession>('POST',`/communication/sessions/${id}/resume`,{}),
  remove:(id:string)=>api.request('DELETE',`/communication/sessions/${id}`,{}),
  translation:(id:string,turnId:number)=>api.request<{translation:string}>('POST',`/communication/sessions/${id}/turns/${turnId}/translation`,{}),
  audio:(id:string,turnId:number)=>api.request<{mime_type:string;data:string;cached:boolean}>('POST',`/communication/sessions/${id}/turns/${turnId}/audio`,{}),
  export:(id:string)=>api.request<CommunicationSession>('GET',`/communication/sessions/${id}/export`),
  memories:()=>api.request<{items:CommunicationMemory[]}>('GET','/communication/memories'),
  addMemory:(content:string,source_session_id?:string)=>api.request('POST','/communication/memories',{content,source_session_id}),
  editMemory:(id:string,content:string)=>api.request('PATCH',`/communication/memories/${id}`,{content}),
  deleteMemory:(id:string)=>api.request('DELETE',`/communication/memories/${id}`,{}),
};
