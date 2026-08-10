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
    // files in parallel by default, and several PGlite instances booting
    // concurrently can blow past the 10s default hookTimeout under CPU
    // contention (observed running the full suite, not any single file).
    // Raised rather than forcing serial file execution, which would slow
    // the whole suite down for every file, not just the heavy ones.
    hookTimeout: 30_000,
  },
});
