import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fail, text } from './validation.mjs';
const scrypt = promisify(scryptCallback);
const digest = token => createHash('sha256').update(token).digest('hex');
export const publicUser = user => ({ id:user.id,email:user.email,name:user.name,settings:JSON.parse(user.settings),created_at:user.created_at });

export function auth(db, { secureCookies = false } = {}) {
  function authenticate(req) {
    const token = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('oq_session='))?.slice(11);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return db.prepare('SELECT u.* FROM auth_sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').get(digest(token),new Date().toISOString()) || null;
  }
  function session(c, user) {
    db.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').run(new Date().toISOString());
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(digest(token),user.id,new Date(Date.now()+7*86400000).toISOString());
    c.res.setHeader('Set-Cookie',`oq_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secureCookies ? '; Secure' : ''}`);
    return publicUser(user);
  }
  function registerRoutes(route) {
    route('POST','/auth/register',async c => {
      c.limited(`auth:${c.req.socket.remoteAddress}`,1000,60000);
      const email = text(c.body.email,'email',{max:254}).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400,'VALIDATION_ERROR','Invalid email.');
      const password = text(c.body.password,'password',{min:10,max:128});
      const name = text(c.body.name,'name',{max:100});
      const salt = randomBytes(16).toString('hex');
      const hash = Buffer.from(await scrypt(password,salt,64)).toString('hex');
      try {
        const result = db.prepare('INSERT INTO users(email,password_hash,name,created_at) VALUES(?,?,?,?)').run(email,`${salt}:${hash}`,name,new Date().toISOString());
        c.status = 201;
        return session(c,db.prepare('SELECT * FROM users WHERE id=?').get(Number(result.lastInsertRowid)));
      } catch (error) { if (error.code?.includes('CONSTRAINT')) fail(409,'EMAIL_EXISTS','Email is already registered.'); throw error; }
    },{public:true,summary:'Register an independent local account'});
    route('POST','/auth/login',async c => {
      c.limited(`auth:${c.req.socket.remoteAddress}`,1000,60000);
      const email = text(c.body.email,'email',{max:254}).toLowerCase();
      const password = text(c.body.password,'password',{max:128});
      const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
      const [salt, expected] = (user?.password_hash || `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
      const actual = Buffer.from(await scrypt(password,salt,64));
      if (!user || !timingSafeEqual(actual,Buffer.from(expected,'hex'))) fail(401,'INVALID_CREDENTIALS','Invalid email or password.');
      return session(c,user);
    },{public:true,summary:'Sign in with email and password'});
    route('POST','/auth/logout',c => {
      const token = c.req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('oq_session='))?.slice(11);
      if (token) db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').run(digest(token));
      c.res.setHeader('Set-Cookie',`oq_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureCookies ? '; Secure' : ''}`);
      return { logged_out:true };
    },{summary:'Invalidate the current session'});
    route('GET','/me',c => publicUser(c.user),{summary:'Current user profile and settings'});
    route('PATCH','/me',c => {
      const name = c.body.name === undefined ? c.user.name : text(c.body.name,'name',{max:100});
      const current = JSON.parse(c.user.settings);
      const incoming = c.body.settings || {};
      if (typeof incoming !== 'object' || Array.isArray(incoming)) fail(400,'VALIDATION_ERROR','settings must be an object.');
      const allowed = ['ui_language','native_language','learning_languages','theme','daily_goal','study'];
      const settings = { ...current,...Object.fromEntries(Object.entries(incoming).filter(([key])=>allowed.includes(key))) };
      if (JSON.stringify(settings).length > 16000) fail(400,'VALIDATION_ERROR','Settings are too large.');
      db.prepare('UPDATE users SET name=?,settings=? WHERE id=?').run(name,JSON.stringify(settings),c.user.id);
      return publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(c.user.id));
    },{summary:'Update profile and persisted study preferences'});
  }
  return { authenticate,registerRoutes };
}
