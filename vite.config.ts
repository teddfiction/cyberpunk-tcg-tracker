import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

/**
 * Les exports Cardmarket ne renvoient aucun en-tête CORS — vérifié : un `fetch`
 * depuis la page échoue, et `no-cors` ne rend qu'une réponse opaque. Le serveur
 * de dev relaie donc l'appel, ce qui le fait passer pour same-origin.
 *
 * Ce relais n'existe qu'en dev et en `preview` : un `dist/` servi en statique
 * n'a personne pour proxyfier. `fetchPriceGuide` le détecte et le dit.
 */
const PROXY = {
  "/cardmarket": {
    target: "https://downloads.s3.cardmarket.com/productCatalog",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/cardmarket/, ""),
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // 5173 par défaut — ce que documentent le README et CLAUDE.md. `PORT` permet
  // à un aperçu de tourner à côté du serveur de dev déjà lancé, sans le tuer.
  server: { port: Number(process.env.PORT) || 5173, open: true, proxy: PROXY },
  // `vite preview` a sa propre config : sans ça le bouton marcherait en dev et
  // échouerait sur le build, pour une raison invisible.
  preview: { proxy: PROXY },
  build: { outDir: "dist", sourcemap: true },
})
