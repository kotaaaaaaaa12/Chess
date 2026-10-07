import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';
const suffix = Date.now().toString(36);
async function api(path, { token, body, method = body ? 'POST' : 'GET' } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body ? { 'Content-Type': 'application/json' } : {})
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
function socket(room, token) {
  const url = new URL(`/ws/${room}`, base); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  const ws = new WebSocket(url, { origin: new URL(base).origin });
  const messages = [];
  const pending = [];
  ws.on('message', data => {
    const m = JSON.parse(String(data));
    const index = pending.findIndex(p => p.type === m.type);
    if (index >= 0) { const p = pending.splice(index, 1)[0]; clearTimeout(p.timer); p.resolve(m); }
    else messages.push(m);
  });
  ws.on('error', () => {});
  const wait = type => new Promise((resolve, reject) => {
    const i = messages.findIndex(m => m.type === type);
    if (i >= 0) { resolve(messages.splice(i, 1)[0]); return; }
    const p = { type, resolve, timer: setTimeout(() => { pending.splice(pending.indexOf(p), 1); reject(new Error(`Timed out waiting for ${type}: ${JSON.stringify(messages)}`)); }, 5000) };
    pending.push(p);
  });
  return { ws, wait, send: m => ws.send(JSON.stringify(m)), close: () => ws.close() };
}

test('D1 accounts, private game history, atomic statistics, and WebSocket rooms', async t => {
  // Make concurrent first requests safe even when deployment has not run CLI migrations.
  const [a, b] = await Promise.all([
    api('/api/auth/register', { body: { username: `white_${suffix}`, password: 'test-password', displayName: 'White Player' } }),
    api('/api/auth/register', { body: { username: `black_${suffix}`, password: 'test-password', displayName: 'Black Player' } }),
  ]);
  assert.equal(a.status, 200); assert.equal(a.data.user.stats.elo, 1200);
  assert.equal(b.status, 200);
  assert.equal((await api('/api/health')).data.ok, true);
  assert.equal((await api('/api/auth/providers')).data.google, false);
  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Chess Master/);
  const wasm = await fetch(`${base}/stockfish/stockfish.wasm`);
  assert.equal(wasm.status, 200);
  const wasmBytes = new Uint8Array(await wasm.arrayBuffer());
  assert.deepEqual([...wasmBytes.slice(0, 4)], [0, 97, 115, 109]);
  const tokenA = a.data.token, tokenB = b.data.token;
  assert.equal((await api('/api/auth/login', { body: { username: `white_${suffix}`, password: 'wrong' } })).status, 401);
  assert.equal((await api('/api/auth/login', { body: { username: `white_${suffix}`, password: 'test-password' } })).status, 200);
  assert.equal((await api('/api/auth/me')).status, 401);
  assert.equal((await api('/api/auth/me', { token: tokenA })).data.user.displayName, 'White Player');
  assert.equal((await api('/api/auth/profile', { token: tokenA, method: 'PATCH', body: { displayName: 'Updated White' } })).data.user.displayName, 'Updated White');
  const piece = { name: 'whitePawn5', color: 'white', rank: 'pawn', position: 45 };
  const game = { clientGameId: crypto.randomUUID(), history: [[{ from: 25, to: 45, piece }]], playAgainst: 'minimax', aiDifficulty: 'easy', humanColor: 'white', result: 'win', rated: true,
    eloBefore: 99999, eloChange: 99999, moveCount: 999, openingName: '', timeControl: 300, pgn: '1. e4' };
  const saved = await api('/api/games', { token: tokenA, body: game });
  assert.equal(saved.status, 200); assert.equal(saved.data.game.moveCount, 1);
  assert.equal(saved.data.game.eloBefore, 1200); assert.ok(saved.data.game.eloChange <= 32);
  assert.equal(saved.data.stats.gamesPlayed, 1);
  const repeat = await api('/api/games', { token: tokenA, body: game });
  assert.equal(repeat.data.stats.gamesPlayed, 1);
  assert.equal((await api(`/api/games/${game.clientGameId}`, { token: tokenB })).status, 404);
  assert.equal((await api(`/api/games/${game.clientGameId}`, { token: tokenA })).data.game.pgn, '1. e4');
  assert.equal((await api('/api/games', { token: tokenA })).data.games.length, 1);
  const simultaneous = await Promise.all(Array.from({ length: 3 }, () => api('/api/games', { token: tokenA, body: { ...game, clientGameId: crypto.randomUUID() } })));
  simultaneous.forEach(r => assert.equal(r.status, 200));
  assert.equal((await api('/api/auth/me', { token: tokenA })).data.user.stats.gamesPlayed, 4);
  const room = await api('/api/rooms', { token: tokenA, body: { timeControl: 300 } });
  assert.equal(room.status, 200);
  const id = room.data.roomId;
  const white = socket(id, tokenA); t.after(() => white.close());
  assert.equal((await white.wait('room_created')).color, 'white');
  const black = socket(id, tokenB); t.after(() => black.close());
  assert.equal((await black.wait('room_joined')).color, 'black');
  assert.equal((await white.wait('game_start')).opponentName, 'Black Player');
  assert.equal((await black.wait('game_start')).opponentName, 'Updated White');
  black.send({ type: 'move', roomId: id, pieceName: 'blackPawn5', position: 55 });
  assert.equal((await black.wait('error')).message, 'Not your turn');
  white.send({ type: 'move', roomId: id, pieceName: 'whitePawn5', position: 55 });
  assert.equal((await white.wait('error')).message, 'Illegal move');
  // Fool's mate checks legal validation and ensures the final move precedes game_over.
  white.send({ type: 'move', roomId: id, pieceName: 'whitePawn6', position: 36 });
  assert.equal((await black.wait('move')).position, 36);
  black.send({ type: 'move', roomId: id, pieceName: 'blackPawn5', position: 55 });
  assert.equal((await white.wait('move')).position, 55);
  // Reconnect preserves the board and seat instead of resetting the game.
  black.close(); await white.wait('opponent_disconnected');
  const black2 = socket(id, tokenB); t.after(() => black2.close());
  const restored = await black2.wait('game_start');
  assert.equal(restored.history.length, 2); assert.equal(restored.color, 'black');
  await white.wait('opponent_reconnected');
  white.send({ type: 'move', roomId: id, pieceName: 'whitePawn7', position: 47 });
  await black2.wait('move');
  black2.send({ type: 'move', roomId: id, pieceName: 'blackQueen', position: 48 });
  await white.wait('move');
  const endWhite = await white.wait('game_over');
  assert.equal(endWhite.winner, 'black'); assert.equal(endWhite.winReason, 'checkmate');
  assert.equal((await black2.wait('game_over')).winner, 'black');
  // A distinct room has independent state and a draw can only be accepted by the other side.
  const room2 = (await api('/api/rooms', { token: tokenA, body: { timeControl: 0 } })).data.roomId;
  const w2 = socket(room2, tokenA); t.after(() => w2.close()); await w2.wait('room_created');
  const b2 = socket(room2, tokenB); t.after(() => b2.close()); await b2.wait('game_start'); await w2.wait('game_start');
  w2.send({ type: 'draw_offer', roomId: room2 }); await b2.wait('draw_offered');
  b2.send({ type: 'draw_accept', roomId: room2 });
  assert.equal((await w2.wait('game_over')).drawReason, 'agreement');
  assert.equal((await b2.wait('game_over')).drawReason, 'agreement');
});
