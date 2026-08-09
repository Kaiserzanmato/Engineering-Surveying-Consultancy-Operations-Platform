import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy init: neon() throws if DATABASE_URL is unset, and Next.js evaluates
// top-level module code at build time, so a naive module-level client would
// crash `next build` before env vars are configured. See vercel-storage skill.
function createDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
