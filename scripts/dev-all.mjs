import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
const root=fileURLToPath(new URL('../',import.meta.url));
// Never terminate an unrelated process or attach FE to an older API by accident.
for(const port of [3000,4000]) {
  const available=await new Promise(resolve=>{
    const probe=createServer();probe.once('error',()=>resolve(false));
    probe.listen(port,'127.0.0.1',()=>probe.close(()=>resolve(true)));
  });
  if(!available) {
    console.error(`Port ${port} is already in use. If OpenQuiz is running, open http://127.0.0.1:3000. Otherwise stop the existing server in its own terminal before running again.`);
    process.exit(1);
  }
}
const children=[];
let stopping=false;
function stop(code=0) { if(stopping)return;stopping=true;for(const child of children)if(child.exitCode===null)child.kill();process.exitCode=code; }
const api=spawn(process.execPath,['--use-env-proxy','--watch','server/index.mjs'],{cwd:root,stdio:'inherit'});children.push(api);
api.on('error',error=>{console.error(error.message);stop(1);});
api.on('exit',code=>stop(code??1));
// Start FE only after this API process is alive and its health endpoint is ready.
let ready=false;
for(let attempt=0;attempt<40&&!stopping;attempt++) {
  try { const response=await fetch('http://127.0.0.1:4000/api/v1/health',{signal:AbortSignal.timeout(500)});if(response.ok){ready=true;break;} } catch {}
  await new Promise(resolve=>setTimeout(resolve,250));
}
if(ready&&!stopping) {
  const frontend=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','3000','--strictPort','--open'],{cwd:root,stdio:'inherit'});children.push(frontend);
  frontend.on('error',error=>{console.error(error.message);stop(1);});frontend.on('exit',code=>stop(code??0));
} else if(!stopping) { console.error('API did not become ready. Check Node.js version and port 4000.');stop(1); }
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop());
process.on('exit',()=>{for(const child of children)if(child.exitCode===null)child.kill();});
