import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

// GitHub Pages serve 404.html para rotas não-arquivo; como a SPA usa history
// mode, copiamos o index.html para 404.html no fim do build para que
// deep-links/refresh reidratem o app em vez de cair num 404 real.
function spaFallback404(): Plugin {
  return {
    name: "spa-fallback-404",
    apply: "build",
    closeBundle() {
      const dist = resolve(import.meta.dirname, "dist");
      copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"));
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/inventario-isoforma/" : "/",
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    spaFallback404(),
  ],
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
  },
  server: {
    port: 3001,
    strictPort: true,
  },
}));
