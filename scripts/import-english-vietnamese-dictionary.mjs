// Downloads one JSONL text dataset only. Never follows image/audio URLs in records.
import {createHash,randomUUID} from 'node:crypto';
import {Readable,Transform} from 'node:stream';
import {createInterface} from 'node:readline';
import {mkdirSync,writeFileSync,renameSync,statSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {buildDictionary,DICTIONARY_DIRECTORY} from '../server/dictionary-store.mjs';

const url='https://kaikki.org/viwiktionary/Ti%E1%BA%BFng%20Anh/kaikki.org-dictionary-Ti%E1%BA%BFngAnh.jsonl';
const metadata={source:'Vietnamese Wiktionary via Kaikki/Wiktextract',source_url:'https://kaikki.org/viwiktionary/Ti%E1%BA%BFng%20Anh/',download_url:url,license:'CC-BY-SA-4.0 and GFDL',license_url:'https://vi.wiktionary.org/wiki/Wiktionary:Bản_quyền',attribution:'Wiktionary contributors; extraction by Kaikki.org / Wiktextract (Tatu Ylonen).'};
mkdirSync(DICTIONARY_DIRECTORY,{recursive:true});const temp=join(DICTIONARY_DIRECTORY,'import-'+randomUUID()+'.sqlite');
let input,lines;
try{
 const response=await fetch(url,{signal:AbortSignal.timeout(15*60*1000)});if(!response.ok||!response.body)throw Error('Dictionary download failed: HTTP '+response.status);
 const hash=createHash('sha256');let bytes=0;
 const meter=new Transform({transform(chunk,encoding,callback){bytes+=chunk.length;if(bytes>300*1024*1024)return callback(Error('Text dataset exceeds 300 MiB limit'));hash.update(chunk);callback(null,chunk);}});
 input=Readable.fromWeb(response.body);input.on('error',e=>meter.destroy(e));input.pipe(meter);lines=createInterface({input:meter,crlfDelay:Infinity});
 const stats=await buildDictionary(lines,temp,metadata);if(stats.headwords<50000||stats.senses<100000)throw Error('Incomplete dataset; keeping the installed dictionary unchanged');
 const sha256=hash.digest('hex'),file='en-vi-'+sha256.slice(0,16)+'.sqlite',output=join(DICTIONARY_DIRECTORY,file);
 // Immutable version names allow an existing server to finish using the old version.
 if(existsSync(output))rmSync(temp);else renameSync(temp,output);const report={...stats,file,download_bytes:bytes,source_sha256:sha256,sqlite_bytes:statSync(output).size};
 const manifest=join(DICTIONARY_DIRECTORY,'manifest-'+randomUUID()+'.json');writeFileSync(manifest,JSON.stringify(report,null,2)+'\n');renameSync(manifest,join(DICTIONARY_DIRECTORY,'manifest.json'));
 console.log(JSON.stringify({installed:true,...report}));
}catch(e){console.error(e.message);process.exitCode=1;}finally{lines?.close();input?.destroy();rmSync(temp,{force:true});}
