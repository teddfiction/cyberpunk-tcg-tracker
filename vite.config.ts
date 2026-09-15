import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // 5173 par défaut — ce que documentent le README et CLAUDE.md. `PORT` permet
  // à un aperçu de tourner à côté du serveur de dev déjà lancé, sans le tuer.
  server: { port: Number(process.env.PORT) || 5173, open: true },
  build: { outDir: "dist", sourcemap: true },
})
