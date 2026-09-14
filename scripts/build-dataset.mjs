#!/usr/bin/env node
/**
 * build-dataset.mjs — convertit les exports bruts Cardmarket en src/data/dataset.json
 *
 *   npm run data:cardmarket
 *
 * Attend dans data/cardmarket/ :
 *   price_guide_23.json, products_singles_23.json, products_nonsingles_23.json
 * Les télécharger depuis :
 *   https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_23.json
 *   https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_23.json
 *   https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_23.json
 */
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const src = join(root, "data", "cardmarket")
const read = async (f) => JSON.parse(await readFile(join(src, f), "utf8"))

const shortCategory = (c) => {
  const s = String(c).replace("Cyberpunk ", "").replace("CPK ", "")
  return { "Booster Boxes": "Booster Box", "Box Sets": "Box Set", "Starter Decks": "Starter Deck" }[s] ?? s
}

const guide = await read("price_guide_23.json")
const singles = await read("products_singles_23.json")
const nonsingles = await read("products_nonsingles_23.json")

const products = [...singles.products, ...nonsingles.products]
const byId = new Map(guide.priceGuides.map((r) => [r.idProduct, r]))

const catalog = products.map((p) => ({
  id: p.idProduct,
  name: p.name,
  exp: p.idExpansion,
  cat: shortCategory(p.categoryName),
  mc: p.idMetacard,
}))

const prices = {}
for (const p of products) {
  const r = byId.get(p.idProduct)
  if (!r) continue
  prices[p.idProduct] = {
    avg: r.avg ?? null,
    low: r.low ?? null,
    trend: r.trend ?? null,
    avgF: r["avg-foil"] ?? null,
    lowF: r["low-foil"] ?? null,
    foil: "avg-foil" in r ? 1 : 0,
  }
}

const orphans = guide.priceGuides.filter((r) => !products.some((p) => p.idProduct === r.idProduct))
const uncoted = catalog.filter((p) => !prices[p.id])

await writeFile(
  join(root, "src", "data", "dataset.json"),
  JSON.stringify({ catalog, prices, pricesAt: guide.createdAt, catalogAt: singles.createdAt })
)

console.log(`dataset.json : ${catalog.length} produits, ${Object.keys(prices).length} cotés`)
console.log(`  ${orphans.length} lignes de prix sans produit, ${uncoted.length} produits sans cote`)
if (uncoted.length) console.log(`  sans cote : ${uncoted.map((p) => p.name).join(", ")}`)
