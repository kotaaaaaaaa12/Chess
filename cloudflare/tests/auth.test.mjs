import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { pbkdf2Sync } from 'node:crypto';
import { SignJWT } from 'jose';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve('wrangler/package.json'));
const { Miniflare, Log, LogLevel, convertV4MiniflareOptions } = wranglerRequire('miniflare');
const { build } = wranglerRequire('esbuild');
const root = fileURLToPath(new URL('../../', import.meta.url));
const origin = 'https://chess.example.com';
const signingSecret = 'test-secret-with-more-than-thirty-two-characters';
async function session(id) {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(id)
    .setIssuer('chess-master').setAudience('chess-master').setIssuedAt().setExpirationTime('1d')
    .sign(new TextEncoder().encode(signingSecret));
}
async function fixture(t, { google = false } = {}) {
  const bundle = await build({ absWorkingDir: root, entryPoints: ['cloudflare/src/index.ts'], bundle: true,
    write: false, format: 'esm', platform: 'neutral', conditions: ['workerd', 'worker', 'browser'],
    external: ['cloudflare:workers'], loader: { '.sql': 'text' }, target: 'es2022' });
  let profile = { sub: 'legacy-subject', email: 'legacy@example.com', email_verified: true };
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text,
    compatibilityDate: '2026-10-07', compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'], durableObjects: { ROOMS: { className: 'ChessRoom', useSQLite: true } },
    log: new Log(LogLevel.ERROR), bindings: { JWT_SECRET: signingSecret,
      ...(google ? { GOOGLE_CLIENT_ID: 'test-id', GOOGLE_CLIENT_SECRET: 'test-secret' } : {}) },
    serviceBindings: { ASSETS: () => new Response('Chess Master') },
    outboundService: async request => {
      const url = new URL(request.url);
      if (url.href === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'mock-token' });
      if (url.href === 'https://openidconnect.googleapis.com/v1/userinfo') return Response.json(profile);
      throw new Error('Unexpected outbound request: ' + url.href);
    },
  }));
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('DB');
  const api = async (path, body, token, method = body ? 'POST' : 'GET', headers = {}) => {
    const response = await mf.dispatchFetch(origin + '/api/auth/' + path, { method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  };
  return { mf, db, api, setProfile: value => { profile = value; } };
}

test('ID-only registration creates an immediate session without email or external credentials', async t => {
  const { api, db, mf } = await fixture(t);
  const signed = await api('register', { username: ' Player_1 ', password: 'password123' });
  assert.equal(signed.status, 200); assert.ok(signed.data.token);
  assert.equal(signed.data.user.username, 'player_1'); assert.equal(signed.data.user.displayName, 'player_1');
  assert.equal(signed.data.user.email, null); assert.equal(signed.data.user.hasPassword, true);
  assert.equal((await api('me', undefined, signed.data.token)).status, 200);
  assert.deepEqual((await api('providers')).data, { google: false, email: false });
  assert.equal((await api('register', { username: 'player_1', password: 'password123' })).status, 409);
  assert.equal((await api('register', { username: 'weak_player', password: 'short' })).status, 400);
  assert.equal((await api('register', { username: 'bad-id', password: 'password123' })).status, 400);
  // Stale clients may still submit email; the server neither saves nor verifies it.
  const stale = await api('register', { username: 'stale_client', password: 'password123', email: 'ignored@example.com' });
  assert.equal(stale.status, 200); assert.equal(stale.data.user.email, null);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM auth_tokens').first()).n, 0);
  const profile = await api('profile', { username: 'updated_id', displayName: 'Updated Player', email: 'ignored@example.com' }, signed.data.token, 'PATCH');
  assert.equal(profile.status, 200); assert.equal(profile.data.user.email, null);
  assert.equal((await api('login', { username: 'updated_id', password: 'password123' })).status, 200);
  assert.equal((await api('login', { username: 'player_1', password: 'password123' })).status, 401);
  for (const path of ['forgot-password','resend-verification','verify-email','reset-password'])
    assert.equal((await api(path, { identifier: 'updated_id', token: 'old-link', password: 'other-password' })).status, 410);
  assert.equal((await api('login', { username: 'updated_id', password: 'password123' }, undefined, 'POST', { Origin: 'https://evil.example' })).status, 403);
  const invalid = await mf.dispatchFetch(origin + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'null' });
  assert.equal(invalid.status, 400);
});

test('password changes and logout revoke old sessions, including connected room sockets', async t => {
  const { api, mf } = await fixture(t);
  const signed = await api('register', { username: 'session_player', password: 'old-password' });
  const other = (await api('login', { username: 'session_player', password: 'old-password' })).data.token;
  const oldToken = signed.data.token;
  const room = await mf.dispatchFetch(origin + '/api/rooms', { method: 'POST', headers: {
    Authorization: `Bearer ${oldToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ timeControl: 300 }) });
  const roomId = (await room.json()).roomId;
  const socketResponse = await mf.dispatchFetch(origin + '/ws/' + roomId + '?token=' + oldToken, { headers: { Upgrade: 'websocket', Origin: origin } });
  assert.equal(socketResponse.status, 101);
  const ws = socketResponse.webSocket; ws.accept();
  assert.equal((await api('change-password', { currentPassword: 'wrong', password: 'new-password' }, oldToken)).status, 400);
  const changed = await api('change-password', { currentPassword: 'old-password', password: 'new-password' }, oldToken);
  assert.equal(changed.status, 200);
  assert.equal((await api('me', undefined, oldToken)).status, 401);
  assert.equal((await api('me', undefined, other)).status, 401);
  assert.equal((await api('me', undefined, changed.data.token)).status, 200);
  const closed = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Revoked socket stayed open')), 5000);
    ws.addEventListener('close', event => { clearTimeout(timeout); resolve(event.code); });
  });
  ws.send(JSON.stringify({ type: 'ping' })); assert.equal(await closed, 1008);
  assert.equal((await api('login', { username: 'session_player', password: 'old-password' })).status, 401);
  const current = (await api('login', { username: 'session_player', password: 'new-password' })).data.token;
  assert.equal((await api('logout', {}, changed.data.token)).status, 200);
  assert.equal((await api('me', undefined, changed.data.token)).status, 401);
  assert.equal((await api('me', undefined, current)).status, 200);
});

test('legacy users keep their IDs, short existing passwords, email records, and history', async t => {
  const { api, db } = await fixture(t);
  const initial = readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8');
  await db.batch(initial.split(';').map(s => s.trim()).filter(Boolean).map(sql => db.prepare(sql)));
  const salt = Buffer.alloc(16, 1);
  const hash = `pbkdf2-sha256$100000$${salt.toString('base64')}$${pbkdf2Sync('old123', salt, 100000, 32, 'sha256').toString('base64')}`;
  await db.batch([
    db.prepare('INSERT INTO users (id,username,display_name,email,password_hash,games_played) VALUES (?,?,?,?,?,?)').bind('legacy', 'legacy_player', 'Legacy Player', 'legacy@example.com', hash, 4),
    db.prepare("INSERT INTO games (id,user_id,played_at,summary,history,pgn) VALUES ('old-game','legacy','2026-01-01','{}','[]','1. e4')"),
  ]);
  // This also applies the existing bundled migrations to an old database.
  const signed = await api('login', { username: 'legacy_player', password: 'old123' });
  assert.equal(signed.status, 200); assert.equal(signed.data.user.stats.gamesPlayed, 4);
  await db.prepare("UPDATE auth_accounts SET verification_required=1,email_verified=0 WHERE user_id='legacy'").run();
  assert.equal((await api('login', { username: 'legacy_player', password: 'old123' })).status, 200);
  assert.equal((await api('me', undefined, await session('legacy'))).status, 200);
  assert.equal((await api('login', { username: 'legacy@example.com', password: 'old123' })).status, 401);
  assert.equal((await db.prepare('SELECT email FROM users').first()).email, 'legacy@example.com');
  assert.equal((await db.prepare('SELECT pgn FROM games').first()).pgn, '1. e4');
});

test('an existing linked account can add a password; new Google registration stays disabled', async t => {
  const { api, db, mf, setProfile } = await fixture(t, { google: true });
  assert.deepEqual((await api('providers')).data, { google: false, email: false });
  await db.batch([
    db.prepare('INSERT INTO users (id,username,display_name,email) VALUES (?,?,?,?)').bind('legacy-google', 'old_google_id', 'Existing Player', 'legacy@example.com'),
    db.prepare('INSERT INTO auth_accounts (user_id,email_verified) VALUES (?,1)').bind('legacy-google'),
    db.prepare('INSERT INTO oauth_accounts VALUES (?,?)').bind('legacy-subject', 'legacy-google'),
  ]);
  const oauth = async (correctState = true) => {
    const start = await mf.dispatchFetch(origin + '/api/auth/google', { redirect: 'manual' });
    assert.equal(start.status, 302);
    const state = new URL(start.headers.get('Location')).searchParams.get('state');
    const cookie = start.headers.get('Set-Cookie').split(';')[0];
    const callback = await mf.dispatchFetch(origin + '/api/auth/google/callback?code=mock-code&state=' + (correctState ? state : 'wrong'), {
      headers: { Cookie: cookie }, redirect: 'manual' });
    return new URL(callback.headers.get('Location'));
  };
  assert.ok((await oauth(false)).searchParams.get('auth_error'));
  const target = await oauth(); const code = new URLSearchParams(target.hash.slice(1)).get('code');
  assert.ok(code);
  const signed = await api('exchange', { code }); assert.equal(signed.status, 200);
  assert.equal((await api('exchange', { code })).status, 400);
  assert.equal((await api('change-password', { password: 'local-password' })).status, 401);
  const added = await api('change-password', { password: 'local-password' }, signed.data.token);
  assert.equal(added.status, 200); assert.equal(added.data.user.hasPassword, true);
  assert.equal(added.data.user.id, 'legacy-google');
  assert.equal((await api('login', { username: 'old_google_id', password: 'local-password' })).status, 200);
  assert.equal((await api('me', undefined, signed.data.token)).status, 401);
  assert.equal((await api('change-password', { password: 'replace-without-proof' }, added.data.token)).status, 400);
  setProfile({ sub: 'new-subject', email: 'new@example.com', email_verified: true });
  assert.ok((await oauth()).searchParams.get('auth_error'));
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').first()).n, 1);
});

test('ID sign-in attempts are rate limited', async t => {
  const { api } = await fixture(t);
  for (let i=0; i<25; i++) assert.equal((await api('login', { username: 'missing_id', password: 'bad-password' })).status, 401);
  assert.equal((await api('login', { username: 'missing_id', password: 'bad-password' })).status, 429);
});
