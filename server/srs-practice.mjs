import {enumeration,pagination} from './validation.mjs';

export function srsPracticeService(db,content){
  function registerRoutes(route){
    route('GET','/srs/practice',c=>{
      const scope=enumeration(c.query.get('scope')??'due','scope',['due','all','mastered']),{limit,offset}=pagination(c.query),at=new Date().toISOString();
      const params=[c.user.id,c.user.id,c.user.id];
      let where="p.user_id=? AND(s.visibility='public' OR s.owner_id=? OR EXISTS(SELECT 1 FROM assignments a JOIN class_members m ON a.class_id=m.class_id WHERE a.set_id=s.id AND m.user_id=?))";
      if(scope==='due'){where+=' AND p.due_at<=?';params.push(at);}
      if(scope==='mastered')where+=" AND p.status='mastered'";
      const select=`FROM word_progress p JOIN words w ON w.id=p.word_id JOIN study_sets s ON s.id=w.set_id WHERE ${where}`;
      const groups=db.prepare(`SELECT s.id set_id,s.title,s.learning_language,s.native_language,s.content_status,COUNT(*) word_count ${select} GROUP BY s.id ORDER BY MIN(p.due_at),s.id LIMIT ? OFFSET ?`).all(...params,limit,offset);
      const items=groups.map(group=>{
        const selected=db.prepare(`SELECT w.id ${select} AND s.id=? ORDER BY p.due_at,w.id LIMIT 100`).all(...params,group.set_id).map(w=>w.id);
        const words=content.words(group.set_id,c.user).filter(w=>selected.includes(w.id));
        return {...group,word_ids:selected,selection_truncated:group.word_count>selected.length,examples_available:words.filter(w=>w.example.trim()).length,examples_missing:words.filter(w=>!w.example.trim()).map(w=>w.id),practice_route:`/study-set/${group.set_id}`,available:!group.content_status.startsWith('unavailable')};
      });
      const total=db.prepare(`SELECT COUNT(DISTINCT s.id) groups,COUNT(*) words ${select}`).get(...params);
      return {scope,as_of:at,items,total_groups:total.groups,total_words:total.words,limit,offset,selection_limit:100,subscription_required:false,modes:[
        ...['flashcard','learn','write','quiz','dictation','exam','match'].map(mode=>({id:mode,requires_ai:false,srs_effect:mode==='flashcard'?'explicit_self_rating':'graded_study_answers',selection:'study.settings.word_ids',max_words:100})),
        {id:'speaking',requires_ai:true,srs_effect:'none',selection:'ai.word_ids',max_words:20},
        {id:'conversation',requires_ai:true,srs_effect:'none',selection:'conversation.settings.word_ids',max_words:100},
        {id:'grammar',requires_ai:false,srs_effect:'none',selection:'exercise.word_ids',max_words:30},
        {id:'reading',requires_ai:true,srs_effect:'none',selection:'exercise.word_ids',max_words:30}
      ],notes:['No due words means an empty list; never replace with unrelated vocabulary.','Conversation, speaking and exercises do not certify recall or reschedule SRS.','Example dictation and grammar need saved examples; do not auto-generate missing examples.']};
    },{summary:'Read-only per-set SRS practice scopes for all learning modes; real counts, selected IDs and explicit scheduling effects'});
  }
  return {registerRoutes};
}
