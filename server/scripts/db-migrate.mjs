import { config } from "dotenv";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

config({ path: join(root, ".env.local") });
config({ path: join(root, ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const migrationFiles = readdirSync(join(root, "drizzle"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

const pool = new pg.Pool({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  for (const file of migrationFiles) {
    const sql = readFileSync(join(root, "drizzle", file), "utf8");
    await pool.query(sql);
    console.log(`Applied: ${file}`);
  }
  console.log("All migrations applied successfully.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
