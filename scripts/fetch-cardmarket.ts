#!/usr/bin/env node
/**
 * fetch-cardmarket.ts — télécharge les trois exports publics Cardmarket
 * dans data/cardmarket/ (dossier non versionné).
 *
 *   npm run data:fetch      # télécharge seulement
 *   npm run data:refresh    # télécharge puis régénère src/data/dataset.json
 *
 * Écrit en TypeScript et lancé par `tsx` pour partager `src/` : les URLs
 * viennent de `data/cardmarket.ts`, la garde non-JSON de `lib/ingest.ts`. Le
 * price guide est republié quotidiennement ; les deux listes de produits ne
 * bougent qu'à la sortie d'une extension.
 */
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { CARDMARKET_BASE, CARDMARKET_FILES } from "@/data/cardmarket"
import { IngestError, expectJson } from "@/lib/ingest"

const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "cardmarket")
await mkdir(dest, { recursive: true })

const ko = (n: number) => `${Math.round(n / 1024)} Ko`

for (const { path, name } of CARDMARKET_FILES) {
  const url = `${CARDMARKET_BASE}/${path}`
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`${name} : ${res.status} ${res.statusText} — ${url}`)
    process.exit(1)
  }
  const body = await res.text()

  let json: { createdAt?: string }
  try {
    json = expectJson(body, name) as { createdAt?: string }
  } catch (e) {
    console.error(e instanceof IngestError ? e.message : String(e))
    process.exit(1)
  }

  await writeFile(join(dest, name), body)
  console.log(`${name.padEnd(30)} ${ko(body.length).padStart(8)}   export du ${json.createdAt ?? "?"}`)
}

console.log("\ndata/cardmarket/ à jour. Enchaîner avec : npm run data:cardmarket")
