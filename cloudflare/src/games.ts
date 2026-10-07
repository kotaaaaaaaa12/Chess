import { Hono } from 'hono';
import { requestUser } from './auth';
import { publicUser, getUser, type Env } from './types';
import { calculateEloChange, getOpponentElo } from '../../frontend/src/lib/chess/elo';
import type { SaveGameInput, GameSummary } from '../../frontend/src/lib/games/types';

export const games = new Hono<{ Bindings: Env }>();
games.get('/', async c => {
  const user = await requestUser(c.req.raw, c.env);
  if (!user) return c.json({ error: 'Not authenticated' }, 401);
  const rows = await c.env.DB.prepare('SELECT summary FROM games WHERE user_id = ? ORDER BY played_at DESC LIMIT 50').bind(user.id).all<{ summary: string }>();
  return c.json({ games: rows.results.map(r => JSON.parse(r.summary)) });
});
games.get('/:id', async c => {
  const user = await requestUser(c.req.raw, c.env);
  if (!user) return c.json({ error: 'Not authenticated' }, 401);
  const row = await c.env.DB.prepare('SELECT summary, history, pgn FROM games WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).first<{ summary: string; history: string; pgn: string }>();
  return row ? c.json({ game: { ...JSON.parse(row.summary), history: JSON.parse(row.history), pgn: row.pgn } }) : c.json({ error: 'Game not found' }, 404);
});
games.post('/', async c => {
  const user = await requestUser(c.req.raw, c.env);
  if (!user) return c.json({ error: 'Not authenticated' }, 401);
  const b = await c.req.json<SaveGameInput & { clientGameId?: string }>();
  if (!b || !Array.isArray(b.history) || b.history.length < 1 || b.history.length > 2000 ||
      !b.history.every(step => Array.isArray(step) && step.length <= 8 && step.every(m => m && typeof m.from === 'number' && typeof m.to === 'number' && m.piece && typeof m.piece.name === 'string')) ||
      !['human', 'minimax', 'stockfish', 'online'].includes(b.playAgainst) || !['white', 'black'].includes(b.humanColor) ||
      !['win', 'loss', 'draw'].includes(b.result) || !['easy', 'medium', 'hard'].includes(b.aiDifficulty) ||
      ![0, 180, 300, 600, 900].includes(b.timeControl) || typeof b.pgn !== 'string' || b.pgn.length > 100000)
    return c.json({ error: 'Invalid game payload' }, 400);
  const computer = b.playAgainst === 'minimax' || b.playAgainst === 'stockfish';
  const rated = computer && b.rated === true;
  const id = b.clientGameId && /^[a-f0-9-]{36}$/i.test(b.clientGameId) ? b.clientGameId : crypto.randomUUID();
  const existing = await c.env.DB.prepare('SELECT user_id, summary FROM games WHERE id = ?').bind(id).first<{ user_id: string; summary: string }>();
  if (existing) return existing.user_id === user.id ? c.json({ game: JSON.parse(existing.summary), stats: publicUser(user).stats }) : c.json({ error: 'Invalid game ID' }, 400);
  const text = (v: unknown, max: number) => typeof v === 'string' ? v.slice(0, max) : null;
  // Retry an optimistic D1 transaction when another game updated the same account.
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = (await getUser(c.env, user.id))!;
    const eloChange = rated ? calculateEloChange(current.elo, getOpponentElo(b.playAgainst, b.aiDifficulty), b.result) : 0;
    const summary: GameSummary = { id, playedAt: new Date().toISOString(), playAgainst: b.playAgainst,
      aiDifficulty: b.aiDifficulty, humanColor: b.humanColor, result: b.result, rated,
      eloBefore: current.elo, eloChange: Math.max(100, current.elo + eloChange) - current.elo,
      moveCount: b.history.length, openingName: text(b.openingName, 128), timeControl: b.timeControl,
      opponentName: text(b.opponentName, 64), drawReason: text(b.drawReason, 32),
      winner: b.winner === 'white' || b.winner === 'black' ? b.winner : null };
    const insert = c.env.DB.prepare(`INSERT INTO games (id, user_id, played_at, summary, history, pgn)
      SELECT ?, ?, ?, ?, ?, ? FROM users WHERE id = ? AND elo = ? AND games_played = ?`)
      .bind(id, user.id, summary.playedAt, JSON.stringify(summary), JSON.stringify(b.history), b.pgn, user.id, current.elo, current.games_played);
    const statements = [insert];
    if (computer) statements.push(c.env.DB.prepare(`UPDATE users SET elo = MAX(100, elo + ?),
      wins = wins + ?, losses = losses + ?, draws = draws + ?, games_played = games_played + 1
      WHERE id = ? AND EXISTS (SELECT 1 FROM games WHERE id = ?)`)
      .bind(eloChange, Number(b.result === 'win'), Number(b.result === 'loss'), Number(b.result === 'draw'), user.id, id));
    const results = await c.env.DB.batch(statements);
    if (results[0].meta.changes) return c.json({ game: summary, stats: publicUser((await getUser(c.env, user.id))!).stats });
  }
  return c.json({ error: 'Account is busy. Please try again.' }, 409);
});
