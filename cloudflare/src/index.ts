import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { auth, requestUser, verifyToken } from './auth';
import { games } from './games';
import { getUser, type Env } from './types';
export { ChessRoom } from './room';

const app = new Hono<{ Bindings: Env }>();
app.use('/api/*', bodyLimit({ maxSize: 750000, onError: c => c.json({ error: 'Request is too large' }, 413) }));
app.use('/api/*', async (c, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const origin = c.req.header('Origin');
    if (origin && origin !== new URL(c.req.url).origin) return c.json({ error: 'Invalid origin' }, 403);
  }
  await next();
  c.header('Cache-Control', 'no-store');
  c.header('Referrer-Policy', 'no-referrer');
});
app.get('/api/health', c => c.json({ ok: true, platform: 'cloudflare', database: 'd1', multiplayer: 'durable-objects' }));
app.route('/api/auth', auth);
app.route('/api/games', games);
app.post('/api/rooms', async c => {
  const user = await requestUser(c.req.raw, c.env);
  if (!user) return c.json({ error: 'Not authenticated' }, 401);
  const body = await c.req.json<{ timeControl?: number }>();
  const timeControl = body.timeControl ?? 300;
  if (![0, 180, 300, 600, 900].includes(timeControl)) return c.json({ error: 'Invalid time control' }, 400);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 5; i++) {
    const roomId = [...crypto.getRandomValues(new Uint8Array(6))].map(n => chars[n % chars.length]).join('');
    const stub = c.env.ROOMS.get(c.env.ROOMS.idFromName(roomId), { locationHint: c.env.ROOM_LOCATION_HINT ?? 'apac' });
    const res = await stub.fetch(new Request('https://room/init', { method: 'POST', body: JSON.stringify({ roomId, timeControl, userId: user.id, name: user.display_name }) }));
    if (res.ok) return c.json({ roomId });
  }
  return c.json({ error: 'Could not create a room. Please try again.' }, 503);
});
app.get('/ws/:roomId', async c => {
  if (c.req.header('Upgrade')?.toLowerCase() !== 'websocket') return c.json({ error: 'WebSocket upgrade required' }, 426);
  if (c.req.header('Origin') && c.req.header('Origin') !== new URL(c.req.url).origin) return c.json({ error: 'Invalid origin' }, 403);
  const roomId = c.req.param('roomId').toUpperCase();
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(roomId)) return c.json({ error: 'Invalid room code' }, 400);
  const id = await verifyToken(c.env, c.req.query('token') ?? '');
  const user = id ? await getUser(c.env, id) : null;
  if (!user) return c.json({ error: 'Authentication required' }, 401);
  const headers = new Headers(c.req.raw.headers);
  headers.set('X-Player-Id', user.id);
  headers.set('X-Player-Name', encodeURIComponent(user.display_name));
  const stub = c.env.ROOMS.get(c.env.ROOMS.idFromName(roomId), { locationHint: c.env.ROOM_LOCATION_HINT ?? 'apac' });
  return stub.fetch(new Request(c.req.url, { headers }));
});
app.all('/api/*', c => c.json({ error: 'Not found' }, 404));
app.all('*', c => c.env.ASSETS.fetch(c.req.raw));
app.onError((err, c) => {
  console.error('Request failed', err.message);
  return c.json({ error: 'The server could not complete the request. Please try again.' }, 500);
});
export default app;
