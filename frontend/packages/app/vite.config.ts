import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Two entries — the phone app (index.html) and the kitchen wall display (wall.html) — sharing
// one component/data layer. Dev-server proxy makes the API same-origin so session cookies work
// without any CORS/SameSite configuration; the Docker/nginx setup mirrors this in production.
export default defineConfig({
  plugins: [react()],
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
