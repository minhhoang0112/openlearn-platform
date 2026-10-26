import { openDatabase } from './database.mjs';
import { seedScreenshots } from './seed.mjs';
import { auth } from './auth.mjs';
import { createRouter } from './http.mjs';
import { contentService } from './content.mjs';
import { contentReadinessService } from './content-readiness.mjs';
import { dictionaryEntryService } from './dictionary-entry.mjs';
import { dictionaryTranslationService } from './dictionary-translation.mjs';
import { studyService } from './study.mjs';
import { srsPracticeService } from './srs-practice.mjs';
import { communityService } from './community.mjs';
import { aiService } from './ai.mjs';
import { lessonService } from './lessons.mjs';
import { courseService } from './courses.mjs';
import { exerciseService } from './exercises.mjs';
import { courseLearningService } from './course-learning.mjs';
import { learningProfileService } from './learning-profile.mjs';
import { learningService } from './learning.mjs';
import { learningMistakeService } from './learning-mistakes.mjs';
import { learningProgressService } from './learning-progress.mjs';
import { learningActivityService } from './learning-activity.mjs';
import { learningFeedbackService } from './learning-feedback.mjs';
import { learningAudioReviewService } from './learning-audio-reviews.mjs';
import { learningPhraseService } from './learning-phrases.mjs';
import { learningMaterialService } from './learning-materials.mjs';
import { materialCueService } from './material-cues.mjs';
import { materialSubtitleService } from './material-subtitles.mjs';
import { listeningPracticeService } from './listening-practice.mjs';

export function createApp({database=':memory:',seed=true,origins=['http://127.0.0.1:3000','http://localhost:3000'],secureCookies=false,ai={},dictionary={},log,learningClock}={}) {
  const db=openDatabase(database);if(seed)seedScreenshots(db);
  const authentication=auth(db,{secureCookies});
  const router=createRouter({db,authenticate:authentication.authenticate,origins,log});
  const {route,server,routes}=router;
  const content=contentService(db),study=studyService(db,content),community=communityService(db,content,study),provider=aiService(db,content,ai);
  route('GET','/health',()=>({status:'ok',database:'sqlite',schema_version:14}),{public:true,summary:'Service readiness'});
  route('GET','/capabilities',c=>({authentication:{email_password:true,google:false,apple:false},study_modes:['flashcard','learn','write','dictation','quiz','exam','match','comprehensive'],comprehensive_lessons:true,ai:{configured:provider.isConfigured(c.user),speaking:true,conversation:true,grammar:true,reading:true,pronunciation_audio:provider.hasAudio(c.user)},payments:false,personal_use:true,subscription_required:false,courses_curriculum:true,content:{screenshot_seed:true,full_original_catalog:false,original_course_bodies:false},srs:{review_policy:'due_v1',early_correct:'practice_only',lapse_retry_minutes:10,legacy_progress_preserved:true},storage:'server_sqlite',contract_version:"1.21.0"}),{public:true,summary:'Personal app feature support and current user AI connection; no subscriptions'});
  authentication.registerRoutes(route);content.registerRoutes(route);study.registerRoutes(route);community.registerRoutes(route);provider.registerRoutes(route);
  srsPracticeService(db,content).registerRoutes(route);
  contentReadinessService(content,user=>provider.isConfigured(user)).registerRoutes(route);
  const dictionaryEntries=dictionaryEntryService(db,content);dictionaryEntries.registerRoutes(route);
  dictionaryTranslationService(dictionaryEntries,dictionary).registerRoutes(route);
  lessonService(db,content,study,user=>provider.isConfigured(user)).registerRoutes(route);
  const courses=courseService(db,{seed});courses.registerRoutes(route);
  courseLearningService(db,courses).registerRoutes(route);
  exerciseService(db,content,provider).registerRoutes(route);
  const learningProfiles=learningProfileService(db);learningProfiles.registerRoutes(route);
  const mistakes=learningMistakeService(db,{clock:learningClock});mistakes.registerRoutes(route);
  learningService(db,learningProfiles,{seed,clock:learningClock,mistakes}).registerRoutes(route);
  const listening=listeningPracticeService(db,{clock:learningClock});listening.registerRoutes(route);
  learningProgressService(db,learningProfiles,mistakes,{clock:learningClock,listening}).registerRoutes(route);
  learningActivityService(db,learningProfiles,{clock:learningClock}).registerRoutes(route);
  learningFeedbackService(db,provider).registerRoutes(route);
  learningAudioReviewService(db,provider,{clock:learningClock}).registerRoutes(route);
  learningPhraseService(db,{clock:learningClock}).registerRoutes(route);
  learningMaterialService(db,{clock:learningClock}).registerRoutes(route);
  materialCueService(db,{clock:learningClock}).registerRoutes(route);
  materialSubtitleService(db).registerRoutes(route);
  function openapi() {
    const paths={};
    for(const r of routes) {
      const path=`/api/v1${r.path.replace(/:([a-z_]+)/g,'{$1}')}`;
      paths[path]??={};
      const parameters=[...r.path.matchAll(/:([a-z_]+)/g)].map(m=>({name:m[1],in:'path',required:true,schema:{type:'string'}}));
      paths[path][r.method.toLowerCase()]={summary:r.summary||r.path,operationId:`${r.method.toLowerCase()}${r.path.replace(/[:/\-]/g,'_')}`,security:r.isPublic?[]:[{sessionCookie:[]}],parameters,...(['POST','PATCH','PUT','DELETE'].includes(r.method)?{requestBody:{required:false,content:{'application/json':{schema:{type:'object',additionalProperties:true}}}},parameters:[...parameters,{name:'X-Requested-With',in:'header',required:true,schema:{type:'string',enum:['OpenQuiz']}}]}:{}),responses:{200:{description:'Success envelope: {data, request_id}'},400:{description:'Invalid request'},401:{description:'Sign in required'},403:{description:'Not authorized'},404:{description:'Resource not found'},409:{description:'Invalid state or conflict'},503:{description:'Optional provider not configured'}}};
    }
    return {openapi:'3.0.3',info:{title:'OpenQuiz Independent Backend',version:"1.21.0",description:'Route inventory. See docs/UPGRADE-V2-STATUS.md for implemented V2 routes and docs/ANTI-BE-HANDOFF.md for existing functionality.'},servers:[{url:'http://127.0.0.1:4000'}],paths,components:{securitySchemes:{sessionCookie:{type:'apiKey',in:'cookie',name:'oq_session'}}}};
  }
  route('GET','/openapi.json',c=>{c.res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});c.res.end(JSON.stringify(openapi()));},{public:true,summary:'Machine-readable API route inventory (raw OpenAPI, not an envelope)'});
  return {server,db,routes,openapi,close:()=>new Promise((resolve,reject)=>server.close(error=>{if(error){reject(error);return;}db.close();resolve();}))};
}
