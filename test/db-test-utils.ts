import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import { roles, permissions, grants } from "../scripts/seed";

// Ephemeral, in-memory Postgres (real Postgres compiled to WASM, not a
// mock/fake) for RBAC integration tests — no Docker, no network, no risk
// to the real dev/prod Neon database. Schema is built by replaying this
// repo's actual `drizzle/*.sql` migration files in order, not a
// hand-written CREATE TABLE fixture that could drift from what production
// actually runs.
const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../drizzle");

async function applyMigrations(client: PGlite) {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    // drizzle-kit's own statement delimiter, not valid SQL — split on it
    // rather than relying on semicolon-splitting (descriptions/comments
    // in the seed data below can contain semicolons in prose).
    const statements = sql.split("--> statement-breakpoint");
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }
}

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Creates a fresh, isolated, schema-migrated, RBAC-seeded test database.
 * Call once per test file (not per test) in beforeAll — each call is a
 * brand-new in-memory instance, so tests within a file still share state
 * across `it()` blocks unless they clean up after themselves.
 */
export async function createTestDb(): Promise<{ db: TestDb; client: PGlite }> {
  const client = new PGlite();
  await applyMigrations(client);
  const db = drizzle(client, { schema });

  // Same RBAC data scripts/seed.ts applies to real environments — see
  // that file's export comment for why these are shared, not duplicated.
  await db.insert(schema.roles).values(roles);
  await db.insert(schema.permissions).values(permissions);
  await db.insert(schema.rolePermissions).values(grants);

  return { db, client };
}

let idCounter = 0;
/** Deterministic-enough fake Clerk user id for test fixtures (Clerk ids look like "user_...", not a real one). */
export function fakeClerkId(label: string): string {
  idCounter += 1;
  return `user_test_${label}_${idCounter}`;
}

/** Inserts a users row + a single role assignment, returning the user id. */
export async function createTestUser(
  db: TestDb,
  opts: { label: string; role: (typeof schema.roleSlugEnum.enumValues)[number]; status?: "active" | "suspended" },
): Promise<string> {
  const id = fakeClerkId(opts.label);
  await db.insert(schema.users).values({
    id,
    email: `${opts.label}@example.test`,
    fullName: opts.label,
    status: opts.status ?? "active",
  });
  await db.insert(schema.userRoles).values({ userId: id, roleSlug: opts.role });
  return id;
}
