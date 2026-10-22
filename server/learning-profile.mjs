import {enumeration,fail,integer,list,text} from './validation.mjs';
import {transaction} from './database.mjs';

const defaults=()=>({time_budget_minutes:30,focus:'general',timezone:'Asia/Ho_Chi_Minh',preferred_days:[1,2,3,4,5],program_id:null});
const allowed=new Set(['time_budget_minutes','focus','timezone','preferred_days']);

export function learningProfileService(db){
  function read(userId){
    const user=db.prepare('SELECT settings FROM users WHERE id=?').get(userId);
    const settings=JSON.parse(user.settings),saved=settings.learning_profile;
    return {settings,profile:{...defaults(),...saved,is_default:!saved,updated_at:saved?.updated_at??null}};
  }
  function registerRoutes(route){
    route('GET','/learning/profile',c=>read(c.user.id).profile,{summary:'Own learning preferences; general foundation defaults, no inferred level or program enrollment'});
    route('PUT','/learning/profile',c=>transaction(db,()=>{
      if(!c.body||typeof c.body!=='object'||Array.isArray(c.body))fail(400,'VALIDATION_ERROR','Supply a learning profile object.');
      const keys=Object.keys(c.body);
      if(!keys.length||keys.some(k=>!allowed.has(k)))fail(400,'VALIDATION_ERROR','Supply only time_budget_minutes, focus, timezone or preferred_days.');
      const {settings,profile}=read(c.user.id),next={...profile};delete next.is_default;
      if(Object.hasOwn(c.body,'time_budget_minutes'))next.time_budget_minutes=enumeration(c.body.time_budget_minutes,'time_budget_minutes',[15,30,45]);
      if(Object.hasOwn(c.body,'focus'))next.focus=enumeration(c.body.focus,'focus',['general','system']);
      if(Object.hasOwn(c.body,'timezone')){
        const zone=text(c.body.timezone,'timezone',{max:100});
        // Require a named timezone rather than a raw UTC offset.
        if(zone!=='UTC'&&!zone.includes('/'))fail(400,'VALIDATION_ERROR','timezone must be an IANA timezone name.');
        try{new Intl.DateTimeFormat('en',{timeZone:zone});}catch{fail(400,'VALIDATION_ERROR','Unknown IANA timezone.');}
        next.timezone=zone;
      }
      if(Object.hasOwn(c.body,'preferred_days')){
        const days=list(c.body.preferred_days,'preferred_days',7).map(day=>integer(day,'preferred_days',{min:1,max:7}));
        if(!days.length||new Set(days).size!==days.length)fail(400,'VALIDATION_ERROR','Choose one or more distinct ISO weekdays (1–7).');
        next.preferred_days=days.sort((a,b)=>a-b);
      }
      next.updated_at=new Date().toISOString();settings.learning_profile=next;
      if(JSON.stringify(settings).length>16000)fail(400,'VALIDATION_ERROR','Settings are too large.');
      db.prepare('UPDATE users SET settings=? WHERE id=?').run(JSON.stringify(settings),c.user.id);
      return read(c.user.id).profile;
    }),{summary:'Save own learning preferences atomically, retaining existing study settings; does not create a plan or enroll a course'});
  }
  return {registerRoutes,getProfile:userId=>read(userId).profile};
}
