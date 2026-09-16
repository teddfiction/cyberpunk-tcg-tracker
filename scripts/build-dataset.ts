#!/usr/bin/env node
/**
 * build-dataset.ts — convertit les exports bruts Cardmarket en src/data/dataset.json
 *
 *   npm run data:cardmarket
 *
 * Attend dans data/cardmarket/ les trois fichiers listés par `CARDMARKET_FILES`,
 * téléchargés par `npm run data:fetch`.
 *
 * Ce script ne lit pas Cardmarket lui-même : il délègue à `parse()`, celui des
 * imports à chaud. Il n'existe ainsi qu'une lecture des exports, et elle est
 * testée. N'en réintroduire aucune ici : une copie divergerait de
 * `lib/ingest.ts` le jour où un champ change, sans qu'aucun test bronche.
 */
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { CARDMARKET_FILES } from "@/data/cardmarket"
import { expectJson, mergeCatalog, parse } from "@/lib/ingest"
import type { Price, Product } from "@/types"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const src = join(root, "data", "cardmarket")

let catalog: Product[] = []
let prices: Record<string, Price> = {}
let pricesAt = ""
let catalogAt = ""
let priced = 0

for (const { name } of CARDMARKET_FILES) {
  const body = await readFile(join(src, name), "utf8")
  const parsed = parse(expectJson(body, name), name)

  if (parsed.kind === "catalog") {
    catalog = mergeCatalog(catalog, parsed.products)
    catalogAt = parsed.catalogAt
  } else if (parsed.kind === "prices") {
    prices = parsed.prices
    pricesAt = parsed.pricesAt
    priced = parsed.rows
  }
}

// Les cotes sans produit au catalogue ne servent à rien dans le dérivé : elles
// ne seraient jamais lues, `buildRows` parcourant le catalogue.
const ids = new Set(catalog.map((p) => p.id))
const orphans = Object.keys(prices).filter((id) => !ids.has(Number(id)))
for (const id of orphans) delete prices[id]
const uncoted = catalog.filter((p) => !prices[String(p.id)])

await writeFile(
  join(root, "src", "data", "dataset.json"),
  JSON.stringify({ catalog, prices, pricesAt, catalogAt })
)

console.log(`dataset.json : ${catalog.length} produits, ${Object.keys(prices).length} cotés`)
console.log(`  ${priced} lignes de prix lues, ${orphans.length} sans produit, ${uncoted.length} produits sans cote`)
if (uncoted.length) console.log(`  sans cote : ${uncoted.map((p) => p.name).join(", ")}`)
