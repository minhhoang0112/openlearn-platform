import {backup} from 'node:sqlite';
import {resolve} from 'node:path';
import {openDatabase} from '../server/database.mjs';
import {seedScreenshots} from '../server/seed.mjs';
const filename=resolve('server/data/openquiz.sqlite');
const db=openDatabase(filename);
try{
  const before={words:db.prepare('SELECT count(*) n FROM words').get().n,progress:db.prepare('SELECT count(*) n FROM word_progress').get().n};
  const snapshot=resolve('server/data/library-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
  await backup(db,snapshot);
  seedScreenshots(db);
  const after={words:db.prepare('SELECT count(*) n FROM words').get().n,progress:db.prepare('SELECT count(*) n FROM word_progress').get().n};
  if(before.progress!==after.progress)throw new Error('Unexpected progress count change');
  console.log(JSON.stringify({backup:snapshot,before,after}));
}finally{db.close();}
