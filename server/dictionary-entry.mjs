import {text} from './validation.mjs';
import {preparedDictionary} from './content/prepared-dictionary.mjs';
export function dictionaryEntryService(db,content){
  function lookup(query,user){
      const term=text(query,'q',{max:200}).normalize('NFKC');
      const rows=db.prepare("SELECT w.id,w.set_id FROM words w JOIN study_sets s ON s.id=w.set_id WHERE lower(trim(w.term))=lower(?) AND (s.visibility='public' OR s.owner_id=? OR EXISTS(SELECT 1 FROM assignments a JOIN class_members m ON a.class_id=m.class_id WHERE a.set_id=s.id AND m.user_id=?)) AND s.learning_language='en' AND s.native_language='vi' AND s.content_status NOT LIKE 'unavailable%' AND (s.owner_id IS NOT NULL OR s.source<>'draft_authored') ORDER BY (s.owner_id=?) DESC,w.id LIMIT 20").all(term,user.id,user.id,user.id);
      const cache=new Map(),entries=[];
      for(const row of rows){if(!cache.has(row.set_id))cache.set(row.set_id,content.words(row.set_id,user));const w=cache.get(row.set_id).find(w=>w.id===row.id);if(w)entries.push({definition:w.definition,part_of_speech:w.part_of_speech,phonetic:w.phonetic,example:w.example,example_translation:w.example_translation,source:w.example_source,word_id:w.id,set_id:w.set_id});}
      const prepared=preparedDictionary.find(row=>row[0]===term.toLowerCase());
      if(prepared&&!entries.some(e=>e.definition===prepared[1]))entries.push({definition:prepared[1],part_of_speech:prepared[2],phonetic:'',example:prepared[3],example_translation:prepared[4],source:'prepared_dictionary',word_id:null,set_id:null});
      return {term,found:entries.length>0,entries,speech_text:term,ai_required:false,scope:'accessible_library_and_prepared_dictionary'};
  }
  function registerRoutes(route){
    route('GET','/dictionary/entry',c=>lookup(c.query.get('q'),c.user),{summary:'Exact English word/phrase details for synonym popovers, with local Vietnamese senses and examples; no AI'});
  }
  return {registerRoutes,lookup};
}
