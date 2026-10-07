import { SignJWT, jwtVerify } from 'jose';
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env, UserRow } from './types';
import { publicUser, getUser } from './types';

const enc = new TextEncoder();
function secret(env: Env) {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return enc.encode(env.JWT_SECRET);
}
export async function signToken(env: Env, id: string) {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(id)
    .setIssuer('chess-master').setAudience('chess-master').setIssuedAt().setExpirationTime('7d').sign(secret(env));
}
export async function verifyToken(env: Env, token: string) {
  try {
    const { payload } = await jwtVerify(token, secret(env), { algorithms: ['HS256'], issuer: 'chess-master', audience: 'chess-master' });
    return payload.sub ?? null;
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

auth.post('/register', async c => {
  const b = await c.req.json();
  const username = typeof b.username === 'string' ? b.username.trim().toLowerCase() : '';
  if (!validUsername(username)) return c.json({ error: 'Username must contain 3–32 letters, numbers, or underscores' }, 400);
  if (typeof b.password !== 'string' || b.password.length < 6 || b.password.length > 128) return c.json({ error: 'Password must contain 6–128 characters' }, 400);
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() || null : null;
  if (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return c.json({ error: 'Invalid email address' }, 400);
  const displayName = (typeof b.displayName === 'string' ? b.displayName.trim() : '') || username;
  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare('INSERT INTO users (id, username, display_name, email, password_hash) VALUES (?, ?, ?, ?, ?)')
      .bind(id, username, displayName.slice(0, 64), email, await hashPassword(b.password)).run();
  } catch (e) {
    if (String(e).includes('UNIQUE')) return c.json({ error: 'Username or email already registered' }, 400);
    throw e;
  }
  const user = (await getUser(c.env, id))!;
  return c.json({ token: await signToken(c.env, id), user: publicUser(user) });
});
auth.post('/login', async c => {
  const b = await c.req.json();
  if (typeof b.username !== 'string' || typeof b.password !== 'string' || b.password.length > 128) return c.json({ error: 'Invalid username or password' }, 401);
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(b.username.trim().toLowerCase()).first<UserRow>();
  // Perform the same KDF for missing accounts to avoid a quick account-existence signal.
  const fallback = 'pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  const valid = await verifyPassword(b.password, user?.password_hash ?? fallback);
  if (!user?.password_hash || !valid) return c.json({ error: 'Invalid username or password' }, 401);
  return c.json({ token: await signToken(c.env, user.id), user: publicUser(user) });
});
auth.get('/providers', c => c.json({ google: !!(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET) }));
auth.get('/me', async c => {
  const user = await requestUser(c.req.raw, c.env);
  return user ? c.json({ user: publicUser(user) }) : c.json({ error: 'Not authenticated' }, 401);
});
auth.patch('/profile', async c => {
  const user = await requestUser(c.req.raw, c.env);
  if (!user) return c.json({ error: 'Not authenticated' }, 401);
  const b = await c.req.json();
  const username = b.username === undefined ? user.username : typeof b.username === 'string' ? b.username.trim().toLowerCase() : '';
  const displayName = b.displayName === undefined ? user.display_name : typeof b.displayName === 'string' ? b.displayName.trim().slice(0, 64) : '';
  if (!validUsername(username) || !displayName) return c.json({ error: 'Invalid username or display name' }, 400);
  try { await c.env.DB.prepare('UPDATE users SET username = ?, display_name = ? WHERE id = ?').bind(username, displayName, user.id).run(); }
  catch (e) { if (String(e).includes('UNIQUE')) return c.json({ error: 'Username already taken' }, 400); throw e; }
  return c.json({ token: await signToken(c.env, user.id), user: publicUser((await getUser(c.env, user.id))!) });
});

auth.get('/google', c => {
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
    if (!id) {
      const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(profile.email.toLowerCase()).first();
      if (existing) return fail('This email is already registered. Please sign in with your username and password.');
      id = crypto.randomUUID();
      const base = profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20) || 'player';
      const username = `${base}_${crypto.randomUUID().slice(0, 8)}`;
      await c.env.DB.batch([
        c.env.DB.prepare('INSERT INTO users (id, username, display_name, email, avatar_url) VALUES (?, ?, ?, ?, ?)').bind(id, username, (profile.name || base).slice(0, 64), profile.email.toLowerCase(), profile.picture ?? null),
        c.env.DB.prepare('INSERT INTO oauth_accounts (provider_account_id, user_id) VALUES (?, ?)').bind(profile.sub, id)
      ]);
    }
    target.searchParams.set('auth_token', await signToken(c.env, id));
    return c.redirect(target.href);
  } catch { return fail('Google sign-in failed. Please try again.'); }
});
