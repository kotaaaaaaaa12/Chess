import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __chessDbPool: Pool | undefined;
}

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local");
  }
  return new Pool({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
}

export function getDb() {
  if (!global.__chessDbPool) {
    global.__chessDbPool = createPool();
  }
  return drizzle(global.__chessDbPool, { schema });
}
