import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { parse } from "yaml";

export default defineConfig({
  base: "/",
  publicDir: "../../assets",
  plugins: [
    {
      name: "pokkan-yaml",
      transform(source, id) {
        if (!/\.ya?ml$/.test(id)) return;
        return { code: `export default ${JSON.stringify(parse(source))}`, map: null };
      }
    },
    react()
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: process.env.API_PROXY_TARGET || "http://localhost:3000", changeOrigin: false },
      "/auth": { target: process.env.API_PROXY_TARGET || "http://localhost:3000", changeOrigin: false }
    }
  },
  build: {
    emptyOutDir: true,
    outDir: "dist"
  }
});
