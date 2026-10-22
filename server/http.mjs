import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ApiError, fail } from './validation.mjs';

export function createRouter({ db, authenticate, origins, log = console.error }) {
  const routes = [];
  const rate = new Map();
  function route(method, path, handler, { public: isPublic = false, summary = '', maxBodyBytes = 1024 * 1024 } = {}) {
    if(!Number.isInteger(maxBodyBytes)||maxBodyBytes<1||maxBodyBytes>12*1024*1024)throw new Error('Invalid route body limit.');
    const keys = [];
    const regex = new RegExp(`^/api/v1${path.replace(/:([a-z_]+)/g, (_, key) => { keys.push(key); return '([^/]+)'; })}/?$`);
    routes.push({ method,path,handler,isPublic,summary,regex,keys,maxBodyBytes });
  }
  function limited(key, maximum, windowMs) {
    const now = Date.now();
    if (rate.size > 10000) for (const [k, v] of rate) if (v.until <= now) rate.delete(k);
    let entry = rate.get(key);
    if (!entry || entry.until <= now) rate.set(key, entry = { count: 0, until: now + windowMs });
    if (++entry.count > maximum) fail(429,'RATE_LIMITED','Too many requests. Try again later.');
  }
  const server = createServer(async (req, res) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-Id',requestId);
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    try {
      const origin = req.headers.origin;
      if (origin && !origins.includes(origin)) fail(403,'ORIGIN_NOT_ALLOWED','Origin is not allowed.');
      if (origin) { res.setHeader('Access-Control-Allow-Origin',origin); res.setHeader('Vary','Origin'); res.setHeader('Access-Control-Allow-Credentials','true'); }
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Requested-With');
        res.writeHead(204); res.end(); return;
      }
      limited(req.socket.remoteAddress,10000,60000);
      const url = new URL(req.url,'http://localhost');
      const definition = routes.find(r => r.method === req.method && r.regex.test(url.pathname));
      if (!definition) fail(404,'NOT_FOUND','API route not found.');
      const match = url.pathname.match(definition.regex);
      let params;
      try { params = Object.fromEntries(definition.keys.map((key, i) => [key,decodeURIComponent(match[i + 1])])); }
      catch { fail(400,'INVALID_PATH','Invalid URL encoding in path.'); }
      let body = {};
      if (['POST','PUT','PATCH','DELETE'].includes(req.method)&&req.headers['x-requested-with'] !== 'OpenQuiz') fail(403,'CSRF_HEADER_REQUIRED','Set X-Requested-With: OpenQuiz on mutations.');
      const user = authenticate(req);
      if (!definition.isPublic && !user) fail(401,'AUTH_REQUIRED','Sign in first.');
      if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
        if(Number(req.headers['content-length'])>definition.maxBodyBytes)fail(413,'PAYLOAD_TOO_LARGE','JSON body exceeds the limit for this route.');
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > definition.maxBodyBytes) fail(413,'PAYLOAD_TOO_LARGE','JSON body exceeds the limit for this route.'); chunks.push(chunk); }
        if (size) {
          if (!req.headers['content-type']?.startsWith('application/json')) fail(415,'JSON_REQUIRED','Use Content-Type: application/json.');
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400,'INVALID_JSON','Invalid JSON body.'); }
          if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400,'INVALID_JSON','Expected a JSON object.');
        }
      }
      const context = { req,res,db,user,params,query:url.searchParams,body,requestId,status:200,limited };
      const data = await definition.handler(context);
      if (res.writableEnded) return;
      const output = JSON.stringify({ data: data ?? null, request_id: requestId });
      res.writeHead(context.status, { 'Content-Type':'application/json; charset=utf-8' }); res.end(output);
    } catch (error) {
      const known = error instanceof ApiError;
      const status = known ? error.status : 500;
      if (!known) log(`[${requestId}] ${error.stack || error}`);
      if (res.writableEnded || res.destroyed) return;
      res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { code:known ? error.code : 'INTERNAL_ERROR', message:known ? error.message : 'Internal server error.', ...(known && error.details ? {details:error.details} : {}) }, request_id:requestId }));
    }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  return { server,route,routes };
}
