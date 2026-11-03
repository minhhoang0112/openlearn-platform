import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openDatabase} from '../server/database.mjs';
import {seedSystemNetworkVocabulary,systemNetworkSource} from '../server/content/system-network-vocabulary.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
if(existsSync(resolve(root,'.env')))process.loadEnvFile(resolve(root,'.env'));
const arg=process.argv.indexOf('--user-id');
const ownerId=Number(arg>=0?process.argv[arg+1]:NaN);
if(!Number.isSafeInteger(ownerId)||ownerId<1)throw Error('Usage: npm run course:system-network -- --user-id <existing account ID> [--move-public]');
const database=process.env.DATABASE_PATH||resolve(root,'server/data/openquiz.sqlite');
if(!existsSync(database))throw Error('Start the web and create an account before importing the course.');
const db=openDatabase(database);
try{
  seedSystemNetworkVocabulary(db,{ownerId,movePublic:process.argv.includes('--move-public')});
  const path=db.prepare('SELECT id,title FROM learning_paths WHERE owner_id=? AND source=?').get(ownerId,systemNetworkSource);
  const count=db.prepare('SELECT count(*) n FROM path_sets WHERE path_id=?').get(path.id).n;
  console.log(JSON.stringify({owner_id:ownerId,path_id:path.id,title:path.title,sets:count,library:'/my-created'}));
}finally{db.close();}
