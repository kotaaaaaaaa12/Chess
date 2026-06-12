/**
 * One-time import from legacy data/users.json into PostgreSQL.
 * Run after: npm run db:migrate
 */
import { config } from "dotenv";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

config({ path: join(root, ".env.local") });
config({ path: join(root, ".env") });

const url = process.env.DATABASE_URL;
const usersFile = join(root, "data/users.json");

if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

if (!existsSync(usersFile)) {
  console.log("No data/users.json found — nothing to import.");
  process.exit(0);
}

const raw = JSON.parse(readFileSync(usersFile, "utf8"));
const legacyUsers = raw.users ?? [];

if (legacyUsers.length === 0) {
  console.log("No legacy users to import.");
  process.exit(0);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

let imported = 0;

try {
  for (const user of legacyUsers) {
    const exists = await pool.query("SELECT id FROM users WHERE username = $1", [user.username]);
    if (exists.rowCount > 0) {
      console.log(`Skip existing username: ${user.username}`);
      continue;
    }

    await pool.query(
      `INSERT INTO users (id, username, display_name, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        user.username,
        user.displayName,
        user.passwordHash || (await bcrypt.hash("changeme123", 10)),
        user.createdAt ?? new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
    imported++;
    console.log(`Imported: ${user.username}`);
  }
  console.log(`Done. Imported ${imported} user(s).`);
} catch (err) {
  console.error("Import failed:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
