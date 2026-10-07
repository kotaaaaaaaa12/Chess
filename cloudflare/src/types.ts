export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ROOMS: DurableObjectNamespace;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  ROOM_LOCATION_HINT?: DurableObjectLocationHint;
}
export interface UserRow {
  id: string; username: string; display_name: string; email: string | null;
  avatar_url: string | null; password_hash: string | null;
  elo: number; wins: number; losses: number; draws: number; games_played: number;
}
export function publicUser(u: UserRow) {
  return { id: u.id, username: u.username, displayName: u.display_name, email: u.email,
    avatarUrl: u.avatar_url, stats: { elo: u.elo, wins: u.wins, losses: u.losses,
      draws: u.draws, gamesPlayed: u.games_played } };
}
export function getUser(env: Env, id: string) {
  return env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
}
