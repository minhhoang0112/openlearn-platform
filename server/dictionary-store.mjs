import {DatabaseSync} from 'node:sqlite';
import {existsSync,readFileSync} from 'node:fs';
import {dirname,join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';

export const DICTIONARY_DIRECTORY=fileURLToPath(new URL('./data/dictionaries/',import.meta.url));
export const dictionaryKey=value=>String(value).normalize('NFKC').replace(/[‘’]/g,"'").trim().replace(/\s+/gu,' ').toLowerCase();
const clean=(value,max=4000)=>typeof value==='string'?value.trim().slice(0,max):'';

export async function buildDictionary(lines,path,metadata={}){
 const db=new DatabaseSync(path);let records=0,senses=0,forms=0;
 try{
  db.exec(`PRAGMA journal_mode=DELETE; PRAGMA synchronous=OFF; PRAGMA cache_size=-8192;
   CREATE TABLE entries(id INTEGER PRIMARY KEY,term_key TEXT NOT NULL,term TEXT NOT NULL,part_of_speech TEXT NOT NULL,phonetic TEXT NOT NULL,definition TEXT NOT NULL,example TEXT NOT NULL,example_translation TEXT NOT NULL,source_url TEXT NOT NULL);
   CREATE UNIQUE INDEX entries_exact ON entries(term_key,part_of_speech,definition);
   CREATE TABLE forms(form_key TEXT NOT NULL,lemma_key TEXT NOT NULL,PRIMARY KEY(form_key,lemma_key)) WITHOUT ROWID;
   CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL); PRAGMA user_version=1; BEGIN;`);
  const insert=db.prepare('INSERT OR IGNORE INTO entries(term_key,term,part_of_speech,phonetic,definition,example,example_translation,source_url) VALUES(?,?,?,?,?,?,?,?)');
  const alias=db.prepare('INSERT OR IGNORE INTO forms(form_key,lemma_key) VALUES(?,?)');
  const addForm=(form,lemma)=>{const a=dictionaryKey(form),b=dictionaryKey(lemma);if(a&&b&&a!==b&&a.length<=200&&b.length<=200)forms+=Number(alias.run(a,b).changes);};
  for await(const line of lines){
   if(!line.trim())continue;const row=JSON.parse(line);if(row.lang_code!=='en'||!clean(row.word,200))continue;
   records++;const term=clean(row.word,200),key=dictionaryKey(term),ipa=clean(row.sounds?.find(s=>s.ipa)?.ipa,200),pos=clean(row.pos,80),url='https://vi.wiktionary.org/wiki/'+encodeURIComponent(term)+'#Tiếng_Anh';
   for(const sense of row.senses||[]){
    for(const base of sense.form_of||[])if(typeof base.word==='string')addForm(term,base.word);
    const glosses=(sense.glosses||[]).filter(g=>typeof g==='string'&&g.trim());if(!glosses.length)continue;
    const qualifiers=(sense.raw_tags||[]).filter(x=>typeof x==='string').join(', '),definition=clean((qualifiers?'('+qualifiers+') ':'')+glosses.join('; '),6000);if(!definition)continue;
    const example=(sense.examples||[]).find(e=>typeof e.text==='string'&&e.text.trim());
    senses+=Number(insert.run(key,term,pos,ipa,definition,clean(example?.text,2000),clean(example?.translation,2000),url).changes);
   }
   for(const form of row.forms||[])if(typeof form.form==='string')addForm(form.form,term);
   if(records%2000===0){db.exec('COMMIT; BEGIN;');if(records%20000===0)console.log(JSON.stringify({records,senses,forms}));}
  }
  db.exec('COMMIT');
  const headwords=db.prepare('SELECT COUNT(DISTINCT term_key) n FROM entries').get().n;
  const info={...metadata,records,senses,headwords,forms,text_only:true,imported_at:new Date().toISOString()};
  const save=db.prepare('INSERT INTO metadata(key,value) VALUES(?,?)');for(const [key,value]of Object.entries(info))save.run(key,JSON.stringify(value));
  db.exec('ANALYZE; VACUUM;');if(db.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw Error('Dictionary integrity check failed');return info;
 }finally{db.close();}
}

export function openDictionary({databasePath}={}){
 let db=null,info={available:false,headwords:0,senses:0};
 try{
  if(databasePath===null)return {lookup:()=>null,info:()=>info,close(){}};
  if(databasePath===undefined){const manifest=join(DICTIONARY_DIRECTORY,'manifest.json');if(!existsSync(manifest))return {lookup:()=>null,info:()=>info,close(){}};
   const m=JSON.parse(readFileSync(manifest,'utf8'));if(typeof m.file!=='string'||basename(m.file)!==m.file||!/^en-vi-[a-z0-9-]+\.sqlite$/.test(m.file))throw Error('Invalid dictionary manifest');databasePath=join(dirname(manifest),m.file);
  }
  db=new DatabaseSync(databasePath,{readOnly:true});if(db.prepare('PRAGMA user_version').get().user_version!==1)throw Error('Unsupported dictionary format');
  info={...Object.fromEntries(db.prepare('SELECT key,value FROM metadata').all().map(r=>[r.key,JSON.parse(r.value)])),available:true};
  const exact=db.prepare('SELECT * FROM entries WHERE term_key=? ORDER BY (term=?) DESC,id LIMIT 20');
  const forms=db.prepare('SELECT e.* FROM forms f JOIN entries e ON e.term_key=f.lemma_key WHERE f.form_key=? ORDER BY e.id LIMIT 20');
  return {info:()=>info,lookup(term){const key=dictionaryKey(term),direct=exact.all(key,term),rows=direct.length?direct:forms.all(key);if(!rows.length)return null;
   return {kind:direct.length?'exact':'form',entries:rows.map(r=>({definition:r.definition,part_of_speech:r.part_of_speech,phonetic:r.phonetic,example:r.example,example_translation:r.example_translation,source:'wiktionary_vi',source_url:r.source_url,license:'CC-BY-SA-4.0',matched_term:r.term,lookup_kind:direct.length?'exact':'form',word_id:null,set_id:null}))};},close(){db.close();}};
 }catch(e){db?.close();throw new Error('Cannot open local English–Vietnamese dictionary: '+e.message);}
}
