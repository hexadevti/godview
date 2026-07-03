import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts: vitest ships its own copy of vite, so
// mixing the `test` field into the app's vite config causes a plugin type clash.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
