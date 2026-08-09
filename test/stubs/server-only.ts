// Stub for the `server-only` package under Vitest. `server-only` throws
// when imported outside Next.js's RSC compiler, which doesn't apply when
// running unit tests directly under Node/Vite — this makes the import a
// no-op for tests only, matching how Next.js itself treats it as a no-op
// marker in server contexts.
export {};
