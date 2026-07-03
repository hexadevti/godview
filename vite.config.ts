import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/ — test config lives in vitest.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Force a single copy of three.js — globe.gl bundles its own three and a
  // version mismatch breaks rendering (Matrix4.determinantAffine not a function).
  resolve: {
    dedupe: ["three"],
  },
  server: {
    port: 5163,
    strictPort: true,
  },
  preview: {
    port: 5163,
    strictPort: true,
  },
});
