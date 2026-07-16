import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Two entries — the phone app (index.html) and the kitchen wall display (wall.html) — sharing
// one component/data layer. Dev-server proxy makes the API same-origin so session cookies work
// without any CORS/SameSite configuration; the Docker/nginx setup mirrors this in production.
export default defineConfig({
  plugins: [react()],
  // Exposes TURNSTILE_SITE_KEY (not just the default VITE_-prefixed vars) to import.meta.env, so
  // it can share a name with the backend's TURNSTILE_SECRET_KEY. Safe only because the Docker
  // build stage that runs `vite build` is never given TURNSTILE_SECRET_KEY as a build arg (see
  // Dockerfile.combined / packages/app/Dockerfile) — anything matching this prefix that IS present
  // at build time ends up readable in the shipped client bundle.
  envPrefix: ["VITE_", "TURNSTILE_"],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        wall: resolve(__dirname, "wall.html"),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5220",
      "/hubs": { target: "http://localhost:5220", ws: true },
    },
  },
});
