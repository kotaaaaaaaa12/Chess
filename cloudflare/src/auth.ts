import { SignJWT, jwtVerify } from 'jose';
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env, UserRow } from './types';
import { publicUser, getUser, userSelect } from './types';
import { digest, now, issue, limited } from './auth-support';

const enc = new TextEncoder();
function secret(env: Env) {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return enc.encode(env.JWT_SECRET);
}
export async function signToken(env: Env, id: string, verifiedVersion?: number) {
  const user = await getUser(env, id);
  if (!user) throw new Error('Account not found');
  return new SignJWT({ v: verifiedVersion ?? user.auth_version ?? 0 }).setJti(crypto.randomUUID()).setProtectedHeader({ alg: 'HS256' }).setSubject(id)
    .setIssuer('chess-master').setAudience('chess-master').setIssuedAt().setExpirationTime('7d').sign(secret(env));
}
export async function verifyToken(env: Env, token: string) {
  try {
    const { payload } = await jwtVerify(token, secret(env), { algorithms: ['HS256'], issuer: 'chess-master', audience: 'chess-master' });
    if (!payload.sub) return null;
    const user = await getUser(env, payload.sub);
    if (!user || (payload.v ?? 0) !== (user.auth_version ?? 0)) return null;
    const revoked = await env.DB.prepare('SELECT token_hash FROM auth_revoked WHERE token_hash=? AND expires_at>?').bind(await digest(token), now()).first();
    return revoked ? null : user.id;
  } catch { return null; }
}
export async function requestUser(req: Request, env: Env) {
  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
  const id = token ? await verifyToken(env, token) : null;
  return id ? getUser(env, id) : null;
}
function b64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt).buffer, iterations: 100000 }, key, 256));
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$100000$${b64(salt)}$${b64(await derive(password, salt))}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [kind, iterations, salt, expected] = hash.split('$');
  if (kind !== 'pbkdf2-sha256' || iterations !== '100000' || !salt || !expected) return false;
  const actual = b64(await derive(password, Uint8Array.from(atob(salt), c => c.charCodeAt(0))));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
function validUsername(name: unknown): name is string { return typeof name === 'string' && /^[a-z0-9_]{3,32}$/.test(name); }
export const auth = new Hono<{ Bindings: Env }>();

auth.use('*', async (c, next) => {
  if (!['GET', 'HEAD'].includes(c.req.method)) {
    try {
      const body = await c.req.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) return c.json({error:'Invalid request body'},400);
    } catch { return c.json({error:'Invalid JSON request'},400); }
  }
  await next();
});
auth.post('/register', async c => {
  secret(c.env);
  const b = await c.req.json();
  const username = typeof b.username === 'string' ? b.username.trim().toLowerCase() : '';
  if (!validUsername(username)) return c.json({error:'User ID must contain 3–32 letters, numbers, or underscores'},400);
  if (typeof b.password !== 'string' || b.password.length < 8 || b.password.length > 128) return c.json({error:'Password must contain 8–128 characters'},400);
  if (await limited(c.env,c.req.raw,'register',username,10)) return c.json({error:'Too many registration attempts. Please try again later.'},429);
  const displayName = (typeof b.displayName === 'string' ? b.displayName.trim() : '') || username;
  const id = crypto.randomUUID();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO users (id,username,display_name,email,password_hash) VALUES (?,?,?,?,?)').bind(id,username,displayName.slice(0,64),null,await hashPassword(b.password)),
      c.env.DB.prepare('INSERT INTO auth_accounts (user_id,verification_required) VALUES (?,?)').bind(id,0),
    ]);
  } catch(e) {
    if (String(e).includes('UNIQUE')) return c.json({error:'User ID already registered'},409);
    throw e;
  }
  const user = (await getUser(c.env,id))!;
  return c.json({token:await signToken(c.env,id),user:publicUser(user)});
});
auth.post('/login', async c => {
  const b = await c.req.json();
  const identifier = typeof b.username === 'string' ? b.username.trim().toLowerCase() : '';
  if (!identifier || identifier.length>255 || typeof b.password !== 'string' || b.password.length>128) return c.json({error:'Invalid user ID or password'},401);
  if (await limited(c.env,c.req.raw,'login',identifier,25)) return c.json({error:'Too many sign-in attempts. Please try again later.'},429);
  const user = await c.env.DB.prepare(userSelect + ' WHERE u.username=?').bind(identifier).first<UserRow>();
  const fallback='pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  const valid = await verifyPassword(b.password,user?.password_hash??fallback);
  if (!user?.password_hash || !valid) return c.json({error:'Invalid user ID or password'},401);
  return c.json({token:await signToken(c.env,user.id,user.auth_version??0),user:publicUser(user)});
});
auth.get('/providers',c=>c.json({google:false,email:false}));
auth.post('/logout',async c=>{
  const token=c.req.header('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (token && await verifyToken(c.env,token)) await c.env.DB.prepare('INSERT OR REPLACE INTO auth_revoked (token_hash,expires_at) VALUES (?,?)').bind(await digest(token),now()+604800).run();
  return c.json({ok:true});
});
// Previous clients and old email links must not mutate ID-only accounts.
for (const path of ['/resend-verification','/forgot-password','/verify-email','/reset-password']) {
  auth.post(path, c => c.json({error:'Email-based authentication is no longer available.'},410));
}
auth.post('/change-password',async c=>{
  const user=await requestUser(c.req.raw,c.env);
  if(!user)return c.json({error:'Not authenticated'},401);
  const b=await c.req.json();
  if (typeof b.password!=='string'||b.password.length<8||b.password.length>128) return c.json({error:'Password must contain 8–128 characters'},400);
  if (await limited(c.env,c.req.raw,'change-password',user.id,10))return c.json({error:'Too many attempts. Please try again later.'},429);
  if (user.password_hash && (typeof b.currentPassword!=='string'||b.currentPassword.length>128||!await verifyPassword(b.currentPassword,user.password_hash)))return c.json({error:'Your current password is incorrect.'},400);
  const nextHash=await hashPassword(b.password);
  const result=await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash=? WHERE id=? AND password_hash IS ? AND EXISTS (SELECT user_id FROM auth_accounts WHERE user_id=? AND auth_version=?) RETURNING id').bind(nextHash,user.id,user.password_hash,user.id,user.auth_version??0),
    c.env.DB.prepare('UPDATE auth_accounts SET auth_version=auth_version+1 WHERE user_id=? AND auth_version=? AND EXISTS (SELECT id FROM users WHERE id=? AND password_hash=?)').bind(user.id,user.auth_version??0,user.id,nextHash),
  ]);
  if(!result[0].results.length)return c.json({error:'Your account changed. Please try again.'},409);
  return c.json({token:await signToken(c.env,user.id),user:publicUser((await getUser(c.env,user.id))!),message:'Password changed. Other sessions have been signed out.'});
});
auth.post('/exchange',async c=>{
  const b=await c.req.json();
  if(typeof b.code!=='string'||b.code.length>200)return c.json({error:'Invalid sign-in code'},400);
  if(await limited(c.env,c.req.raw,'exchange','',30))return c.json({error:'Too many attempts. Please try again later.'},429);
  const row=await c.env.DB.prepare("DELETE FROM auth_tokens WHERE token_hash=? AND purpose='google' AND expires_at>? RETURNING user_id,auth_version").bind(await digest(b.code),now()).first<{user_id:string;auth_version:number}>();
  const user=row?await getUser(c.env,row.user_id):null;
  if(!row||!user||row.auth_version!==(user.auth_version??0))return c.json({error:'This sign-in link has expired or was already used. Please sign in again.'},400);
  return c.json({token:await signToken(c.env,user.id,row.auth_version),user:publicUser(user)});
});
auth.get('/me', async c => {
  const user = await requestUser(c.req.raw, c.env);
  return user ? c.json({ user: publicUser(user) }) : c.json({ error: 'Not authenticated' }, 401);
});
auth.patch('/profile',async c=>{
  const user=await requestUser(c.req.raw,c.env);
  if(!user)return c.json({error:'Not authenticated'},401);
  const b=await c.req.json();
  const username=b.username===undefined?user.username:typeof b.username==='string'?b.username.trim().toLowerCase():'';
  const name=b.displayName===undefined?user.display_name:typeof b.displayName==='string'?b.displayName.trim().slice(0,64):'';
  if(!validUsername(username)||!name)return c.json({error:'Invalid user ID or display name'},400);
  try{
    const statements=[c.env.DB.prepare('UPDATE users SET username=?,display_name=? WHERE id=? AND EXISTS (SELECT user_id FROM auth_accounts WHERE user_id=? AND auth_version=?) RETURNING id').bind(username,name,user.id,user.id,user.auth_version??0)];
    const result=await c.env.DB.batch(statements);
    if(!result[0].results.length)return c.json({error:'Your account changed. Please sign in again.'},409);
  }catch(e){if(String(e).includes('UNIQUE'))return c.json({error:'User ID already registered'},409);throw e;}
  const updated=(await getUser(c.env,user.id))!;
  return c.json({token:await signToken(c.env,user.id,user.auth_version??0),user:publicUser(updated),message:'Profile saved.'});
});

auth.get('/google', async c => {
  secret(c.env);
  if (await limited(c.env,c.req.raw,'google','',20)) return c.json({error:'Too many sign-in attempts. Please try again later.'},429);
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) return c.json({ error: 'Google sign-in is not configured' }, 503);
  const state = crypto.randomUUID();
  setCookie(c, 'oauth_state', state, { httpOnly: true, secure: new URL(c.req.url).protocol === 'https:', sameSite: 'Lax', maxAge: 600, path: '/api/auth/google' });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: c.env.GOOGLE_CLIENT_ID, redirect_uri: new URL('/api/auth/google/callback', c.req.url).href,
    response_type: 'code', scope: 'openid email profile', state }).toString();
  return c.redirect(url.href);
});
auth.get('/google/callback', async c => {
  const target = new URL('/', c.req.url);
  const fail = (message: string) => { target.searchParams.set('auth_error', message); return c.redirect(target.href); };
  const state = getCookie(c, 'oauth_state');
  deleteCookie(c, 'oauth_state', { path: '/api/auth/google' });
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) return fail('Google sign-in is not configured');
  if (!state || state !== c.req.query('state') || !c.req.query('code')) return fail('Invalid OAuth state. Please try again.');
  try {
    const tokensRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({
      client_id: c.env.GOOGLE_CLIENT_ID, client_secret: c.env.GOOGLE_CLIENT_SECRET, code: c.req.query('code')!,
      grant_type: 'authorization_code', redirect_uri: new URL('/api/auth/google/callback', c.req.url).href }) });
    const tokens = await tokensRes.json() as { access_token?: string };
    if (!tokensRes.ok || !tokens.access_token) return fail('Google sign-in failed');
    const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const profile = await profileRes.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
    if (!profileRes.ok || !profile.sub || !profile.email || profile.email_verified !== true) return fail('A verified Google email is required');
    const linked = await c.env.DB.prepare('SELECT user_id FROM oauth_accounts WHERE provider_account_id = ?').bind(profile.sub).first<{ user_id: string }>();
    let id = linked?.user_id;
    if (!id) return fail('Create an account with a user ID and password.');
    const user=(await getUser(c.env,id))!;
    const issued=await issue(c.env,user,'google',120);
    target.hash=new URLSearchParams({auth_action:'google',code:issued.token}).toString();
    return c.redirect(target.href);
  } catch { return fail('Google sign-in failed. Please try again.'); }
});
