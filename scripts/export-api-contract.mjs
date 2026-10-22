import { mkdirSync,writeFileSync } from 'node:fs';
import { createApp } from '../server/app.mjs';
const app=createApp({seed:false});
mkdirSync('docs',{recursive:true});
writeFileSync('docs/openapi.json',JSON.stringify(app.openapi(),null,2)+'\n');
writeFileSync('docs/API-ROUTES.md','# Implemented API routes\n\nGenerated from the registered server handlers. See API-CONTRACT.md for payloads.\n\n| Method | Path | Auth | Behavior |\n| --- | --- | --- | --- |\n'+app.routes.map(r=>`| ${r.method} | /api/v1${r.path} | ${r.isPublic?'Optional':'Required'} | ${r.summary} |`).join('\n')+'\n');
console.log(`Exported ${app.routes.length} routes to docs/openapi.json and docs/API-ROUTES.md`);
app.db.close();
