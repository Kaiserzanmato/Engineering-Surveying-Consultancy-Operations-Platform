import path from "node:path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // See test/stubs/server-only.ts for why this is stubbed under tests.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    // The *.integration.test.ts files each spin up their own ephemeral
    // PGlite (WASM Postgres) instance in beforeAll and replay every
    // migration into it. Fine individually (~1-2s), but vitest runs test
    // files in parallel by default — 5 PGlite instances booting
    // concurrently under real CPU contention was observed exceeding even
    // a 30s hookTimeout (2026-08-11), not just the original 10s default.
    // Raising the timeout further just tolerates worse contention instead
    // of fixing it, and a flaky-under-load suite is worse than a slightly
    // slower reliable one. Disabling file parallelism removes the
    // contention at its source: only one PGlite instance is ever booting
    // at a time, at the cost of summed rather than maxed file duration
    // (a few extra seconds total, not a meaningful cost for this suite's
    // size). Revisit if the suite grows large enough for that trade to
    // stop being worth it.
    fileParallelism: false,
    hookTimeout: 20_000,
  },
});
