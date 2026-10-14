CREATE TABLE IF NOT EXISTS auth_accounts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  verification_required INTEGER NOT NULL DEFAULT 0,
  auth_version INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO auth_accounts (user_id, email_verified)
SELECT id, CASE WHEN id IN (SELECT user_id FROM oauth_accounts) THEN 1 ELSE 0 END FROM users;
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset', 'google')),
  email TEXT,
  auth_version INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_tokens_expiry ON auth_tokens(expires_at);
CREATE TABLE IF NOT EXISTS auth_revoked (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
