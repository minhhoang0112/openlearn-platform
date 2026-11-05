import {api} from './client';
export interface GuidedLesson {
 id:number;title:string;part_id:number;part_title:string;part_number:number;lesson_number:number;ready:boolean;
 status:'available'|'in_progress'|'completed'|'locked'|'unavailable';session_id:string|null;completed_activities:number;total_activities:number;
 vocabulary:{english:string;vietnamese:string}[];
}
export interface GuidedMap {
 id:number;title:string;competence:string;language:string;objective:string;lessons:GuidedLesson[];next_lesson_id:number|null;completed_lessons:number;total_lessons:number;
}
export interface GuidedTask {
 id:string;activity:number;type:'intro'|'card'|'choice'|'listen'|'arrange'|'speak'|'write';prompt:string;english?:string;vietnamese?:string;
 options?:{id:string;text:string}[];tokens?:{id:string;text:string}[];retry_of?:string;
}
export interface GuidedSession {
 pronunciation_review:{transcript:string;feedback:string;improvements:string[]}|null;
 id:string;course_id:number;lesson_id:number;title:string;instruction:string;revision:number;status:'active'|'completed';current:GuidedTask|null;
 feedback:{correct:boolean;skipped:boolean;expected:string;message:string;explanation:string}|null;
 activities:{number:number;title:string;total:number;done:number;completed:boolean}[];
 index:number;total:number;completed_tasks:number;total_tasks:number;attempts:number;first_correct:number;graded_tasks:number;skipped_speaking:number;mistakes_remaining:number;completed_at:string|null;
}
export const guidedCourses={
 map:(id:number)=>api.request<GuidedMap>('GET',`/courses/${id}/guided-map`),
 start:(id:number,resume=true)=>api.request<GuidedSession>('POST',`/course-lessons/${id}/guided-session`,{resume}),
 get:(id:string)=>api.request<GuidedSession>('GET',`/guided-course-sessions/${id}`),
 answer:(s:GuidedSession,body:Record<string,unknown>)=>api.request<GuidedSession>('POST',`/guided-course-sessions/${s.id}/answer`,{...body,revision:s.revision}),
 listen:(id:string)=>api.request<{text:string;lang:string}>('POST',`/guided-course-sessions/${id}/listen`,{}),
 pronunciation:(s:GuidedSession,audio:{mime_type:string;data:string})=>api.request<GuidedSession>('POST',`/guided-course-sessions/${s.id}/pronunciation`,{revision:s.revision,audio}),
};
