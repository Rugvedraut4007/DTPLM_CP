import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* The Spring Boot backend lives in ../backend and listens on :8080.
   Proxying /api through the dev server keeps every request same-origin,
   so the backend needs no CORS configuration. Point it somewhere else with
   VITE_API_TARGET=http://host:port npm run dev */
const target = process.env.VITE_API_TARGET || "http://localhost:8080";
const proxy = {
  "/api": { target, changeOrigin: true }
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy
  },
  preview: {
    port: 4173,
    proxy
  },
  build: {
    outDir: "dist"
  }
});
