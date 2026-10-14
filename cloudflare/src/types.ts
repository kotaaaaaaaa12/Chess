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
  email_verified?: number; verification_required?: number; auth_version?: number;
  elo: number; wins: number; losses: number; draws: number; games_played: number;
}
export function publicUser(u: UserRow) {
  return { id: u.id, username: u.username, displayName: u.display_name, email: u.email,
    avatarUrl: u.avatar_url, emailVerified: !!u.email_verified, hasPassword: !!u.password_hash, stats: { elo: u.elo, wins: u.wins, losses: u.losses,
      draws: u.draws, gamesPlayed: u.games_played } };
}
export const userSelect = `SELECT u.*, COALESCE(a.email_verified,0) AS email_verified, COALESCE(a.verification_required,0) AS verification_required, COALESCE(a.auth_version,0) AS auth_version FROM users u LEFT JOIN auth_accounts a ON a.user_id=u.id`;
export function getUser(env: Env, id: string) {
  return env.DB.prepare(userSelect + ' WHERE u.id = ?').bind(id).first<UserRow>();
}
