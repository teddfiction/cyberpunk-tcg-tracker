#!/usr/bin/env node
/**
 * fetch-cardmarket.mjs — télécharge les trois exports publics Cardmarket
 * dans data/cardmarket/ (dossier non versionné).
 *
 *   npm run data:fetch      # télécharge seulement
 *   npm run data:refresh    # télécharge puis régénère src/data/dataset.json
 *
 * Node 18+, aucune dépendance. Le price guide est republié quotidiennement ;
 * les deux listes de produits ne bougent qu'à la sortie d'une extension.
 */
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const BASE = "https://downloads.s3.cardmarket.com/productCatalog"
const FILES = [
  [`${BASE}/priceGuide/price_guide_23.json`, "price_guide_23.json"],
  [`${BASE}/productList/products_singles_23.json`, "products_singles_23.json"],
  [`${BASE}/productList/products_nonsingles_23.json`, "products_nonsingles_23.json"],
]

const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "cardmarket")
await mkdir(dest, { recursive: true })

const ko = (n) => `${Math.round(n / 1024)} Ko`

for (const [url, name] of FILES) {
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`${name} : ${res.status} ${res.statusText} — ${url}`)
    process.exit(1)
  }
  const body = await res.text()

  // Vérification minimale : un HTML d'erreur ou une redirection silencieuse
  // casserait build-dataset.mjs plus loin, avec un message bien moins clair.
  let json
  try {
    json = JSON.parse(body)
  } catch {
    console.error(`${name} : réponse non-JSON (${ko(body.length)}) — téléchargement interrompu.`)
    process.exit(1)
  }

  await writeFile(join(dest, name), body)
  console.log(`${name.padEnd(30)} ${ko(body.length).padStart(8)}   export du ${json.createdAt ?? "?"}`)
}

console.log("\ndata/cardmarket/ à jour. Enchaîner avec : npm run data:cardmarket")
