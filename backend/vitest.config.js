import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.js"],
    // One shared database, so test files run one at a time.
    fileParallelism: false,
    hookTimeout: 60_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: ["src/server.js"],
    },
  },
});
