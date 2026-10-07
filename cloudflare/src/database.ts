import initialSchema from '../migrations/0001_init.sql';

const initialized = new WeakMap<D1Database, Promise<void>>();
const migrationName = '0001_init.sql';
const ledgerSchema = `CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;

async function initialize(db: D1Database) {
  const ledger = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'd1_migrations'").first();
  if (ledger && await db.prepare('SELECT name FROM d1_migrations WHERE name = ?').bind(migrationName).first()) return;

  // This initial migration contains only simple statements, with no triggers or embedded semicolons.
  const statements = initialSchema.split(';').map(sql => sql.trim()).filter(Boolean);
  await db.batch([
    db.prepare(ledgerSchema),
    ...statements.map(sql => db.prepare(sql)),
    db.prepare('INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)').bind(migrationName),
  ]);
}

export async function ensureDatabase(db: D1Database) {
  let pending = initialized.get(db);
  if (!pending) {
    pending = initialize(db);
    initialized.set(db, pending);
  }
  try {
    await pending;
  } catch (error) {
    // A transient D1 failure must not permanently poison this isolate's initialization cache.
    if (initialized.get(db) === pending) initialized.delete(db);
    throw error;
  }
}
