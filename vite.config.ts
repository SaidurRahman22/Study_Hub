import tailwindcss from "@tailwindcss/vite";
import svgr from "@svgr/rollup";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// svgr lets the admin template import .svg files as React components, which
// seven of its files do.
const plugins = [svgr(), react(), tailwindcss(), vitePluginManusRuntime()];

/**
 * Where the site will be served from.
 *
 * Vercel serves it at the domain root, so "/" is the default. XAMPP's htdocs
 * is usually shared with other projects, so the site goes in a sub-folder
 * there and every asset URL has to carry that prefix:
 *
 *   set APP_BASE=/studyhub/ && npm run build     (cmd)
 *   $env:APP_BASE="/studyhub/"; npm run build    (PowerShell)
 *
 * then copy dist/public into C:\xampp\htdocs\studyhub and open
 * http://localhost/studyhub/. Keep the leading and trailing slashes.
 */
const base = process.env.APP_BASE || "/";

export default defineConfig({
  base,
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // The vendored admin template writes its internal imports as
      // "src/components/..." (212 of them). This points that prefix at the
      // template's own folder rather than the site's source.
      src: path.resolve(import.meta.dirname, "client", "src", "tailadmin"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // The public site.
        main: path.resolve(import.meta.dirname, "client", "index.html"),
        // The admin, built as its own document so the template's stylesheet
        // never meets the site's. See client/admin.html.
        admin: path.resolve(import.meta.dirname, "client", "admin.html"),
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});