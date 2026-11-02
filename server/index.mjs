import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { createApp } from './app.mjs';
import { routingEnvironment } from './ai-routing.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
if(existsSync(resolve(root,'.env')))process.loadEnvFile(resolve(root,'.env'));
if(Number(process.versions.node.split('.')[0])<24)throw new Error('Node.js 24.15+ is required.');
const port=Number(process.env.API_PORT||4000);
const host=process.env.API_HOST||'127.0.0.1';
const origins=(process.env.FRONTEND_ORIGINS||'http://127.0.0.1:3000,http://localhost:3000').split(',').map(s=>s.trim()).filter(Boolean);
const app=createApp({database:process.env.DATABASE_PATH||resolve(root,'server/data/openquiz.sqlite'),origins,secureCookies:process.env.NODE_ENV==='production',live:{key:process.env.GEMINI_LIVE_API_KEY||String(process.env.GEMINI_API_KEY||'').split(',')[0].trim(),model:process.env.GEMINI_LIVE_MODEL},ai:{url:process.env.AI_SERVICE_URL,key:process.env.AI_SERVICE_KEY,provider:process.env.AI_PROVIDER,geminiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL,...routingEnvironment(process.env)}});
app.server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use.`:error);app.db.close();process.exitCode=1;});
app.server.listen(port,host,()=>console.log(`OpenQuiz API: http://${host}:${port}/api/v1\nSQLite: persisted in server/data (or DATABASE_PATH)\nAPI inventory: /api/v1/openapi.json`));
let stopping=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(stopping)return;stopping=true;void app.close().then(()=>process.exit(0),()=>process.exit(1));app.server.closeIdleConnections();setTimeout(()=>process.exit(1),5000).unref();});
