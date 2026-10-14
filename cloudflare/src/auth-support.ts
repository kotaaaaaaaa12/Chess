import type { Env, UserRow } from './types';
export const now = () => Math.floor(Date.now() / 1000);
export async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function limited(env: Env, request: Request, action: string, identifier = '', max = 20, seconds = 900) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  const keys = [await digest(`${action}:ip:${ip}`)];
  if (identifier) keys.push(await digest(`${action}:account:${identifier.toLowerCase()}`));
  const time = now();
  const results = await env.DB.batch(keys.map(key => env.DB.prepare(`
    INSERT INTO auth_rate_limits (key,hits,expires_at) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires_at<=? THEN 1 ELSE hits+1 END,
    expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END
    RETURNING hits`).bind(key, time + seconds, time, time)));
  return results.some(r => Number((r.results[0] as { hits: number }).hits) > max);
}
export async function issue(env: Env, user: UserRow, purpose: 'google', ttl: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const hash = await digest(token);
  await env.DB.prepare('INSERT INTO auth_tokens (token_hash,user_id,purpose,email,auth_version,expires_at) VALUES (?,?,?,?,?,?)')
    .bind(hash, user.id, purpose, user.email, user.auth_version ?? 0, now() + ttl).run();
  return { token, hash };
}
export async function cleanupAuth(env: Env) {
  const time = now();
  await env.DB.batch(['auth_tokens','auth_revoked','auth_rate_limits'].map(table => env.DB.prepare(`DELETE FROM ${table} WHERE expires_at <= ?`).bind(time)));
}
