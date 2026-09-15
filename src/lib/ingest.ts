/** Lecture et validation des trois formats JSON acceptés par l'import à chaud. */
import { dateFr } from "@/lib/format"
import { shortCategory } from "@/data/expansions"
import type { EnrichedCard, Price, Product } from "@/types"

/**
 * Trois formats acceptés, reconnus à leur clé racine :
 *   priceGuides → price_guide_23.json     (remplace toutes les cotes)
 *   products    → products_*_23.json      (met à jour le catalogue)
 *   cards       → cards_enriched.json     (numéros, raretés, miniatures)
 */
export type Parsed =
  | { kind: "prices"; prices: Record<string, Price>; pricesAt: string; rows: number; ids: number[] }
  | { kind: "catalog"; products: Product[]; catalogAt: string }
  | { kind: "enrich"; cards: EnrichedCard[]; printings: number; thumbs: number }

export class IngestError extends Error {}

/**
 * Version de schéma que les trois exports Cardmarket annoncent à leur racine.
 * La voir changer est le seul avertissement qu'on aura avant que les champs
 * bougent : sans ce contrôle, un renommage se traduirait par des colonnes vides
 * et aucune erreur.
 */
const CARDMARKET_SCHEMA = 1

function checkSchema(o: Record<string, unknown>, filename: string) {
  const v = o.version
  if (v != null && v !== CARDMARKET_SCHEMA) {
    throw new IngestError(
      `${filename} : schéma Cardmarket version ${String(v)}, attendu ${CARDMARKET_SCHEMA}. ` +
        "Les champs ont peut-être changé — vérifier l'export avant de l'importer."
    )
  }
}

/**
 * Lit un corps de réponse en JSON, ou explique pourquoi ce n'en est pas.
 *
 * Un portail captif, une page d'erreur ou un `dist/` servi sans relais
 * renvoient du HTML **avec un 200** : sans ce contrôle, l'échec ne se
 * manifesterait que bien plus loin, avec un message inexploitable.
 */
export function expectJson(body: string, what: string): unknown {
  try {
    return JSON.parse(body)
  } catch {
    throw new IngestError(`${what} : réponse non-JSON (${Math.round(body.length / 1024)} Ko).`)
  }
}

export function parse(json: unknown, filename: string): Parsed {
  const o = json as Record<string, unknown>

  if (Array.isArray(o?.priceGuides)) {
    checkSchema(o, filename)
    const prices: Record<string, Price> = {}
    const ids: number[] = []
    for (const r of o.priceGuides as Record<string, number | null>[]) {
      const id = r.idProduct as number
      ids.push(id)
      prices[String(id)] = {
        avg: r.avg ?? null,
        low: r.low ?? null,
        trend: r.trend ?? null,
        avgF: r["avg-foil"] ?? null,
        lowF: r["low-foil"] ?? null,
        foil: "avg-foil" in r ? 1 : 0,
      }
    }
    return {
      kind: "prices",
      prices,
      pricesAt: (o.createdAt as string) ?? new Date().toISOString(),
      rows: o.priceGuides.length,
      ids,
    }
  }

  if (Array.isArray(o?.products)) {
    checkSchema(o, filename)
    const products = (o.products as Record<string, unknown>[]).map((p) => ({
      id: p.idProduct as number,
      name: p.name as string,
      exp: p.idExpansion as number,
      mc: (p.idMetacard as number) || 0,
      cat: shortCategory(String(p.categoryName ?? "")),
      added: String(p.dateAdded ?? ""),
    }))
    return { kind: "catalog", products, catalogAt: (o.createdAt as string) ?? new Date().toISOString() }
  }

  if (Array.isArray(o?.cards) && (o.cards as EnrichedCard[])[0]?.printings) {
    const cards = o.cards as EnrichedCard[]
    return {
      kind: "enrich",
      cards,
      printings: cards.reduce((n, c) => n + c.printings.length, 0),
      thumbs: cards.reduce((n, c) => n + c.printings.filter((p) => p.thumb).length, 0),
    }
  }

  throw new IngestError(
    `${filename} : structure inconnue — attendu une clé priceGuides, products ou cards.`
  )
}

/** Message de compte rendu affiché après un import réussi. */
export function describe(parsed: Parsed, filename: string, catalog: Product[]): string {
  switch (parsed.kind) {
    case "prices": {
      const known = new Set(catalog.map((p) => p.id))
      const orphans = parsed.ids.filter((id) => !known.has(id)).length
      const uncoted = catalog.filter((p) => !parsed.prices[String(p.id)]).length
      return (
        `${parsed.rows} lignes de prix depuis ${filename} (export du ${dateFr(parsed.pricesAt)}). ` +
        (orphans ? `${orphans} produits inconnus du catalogue. ` : "") +
        (uncoted ? `${uncoted} produit(s) sans cote.` : "Tous les produits sont cotés.")
      )
    }
    case "catalog": {
      const known = new Set(catalog.map((p) => p.id))
      const added = parsed.products.filter((p) => !known.has(p.id)).length
      return `Catalogue mis à jour depuis ${filename} : ${added} produits ajoutés, ${parsed.products.length - added} mis à jour.`
    }
    case "enrich":
      return (
        `${parsed.cards.length} cartes enrichies depuis ${filename} : ${parsed.printings} impressions, ` +
        (parsed.thumbs ? `${parsed.thumbs} miniatures. ` : "aucune miniature. ") +
        "Colonne N° et rareté activées."
      )
  }
}

/** Fusionne un catalogue importé avec l'existant, sans perdre les produits absents du nouveau fichier. */
export function mergeCatalog(current: Product[], incoming: Product[]): Product[] {
  const map = new Map(current.map((p) => [p.id, p]))
  for (const p of incoming) map.set(p.id, { ...map.get(p.id), ...p })
  return [...map.values()]
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)))
      } catch {
        reject(new IngestError(`${file.name} : JSON illisible.`))
      }
    }
    reader.onerror = () => reject(new IngestError(`${file.name} : lecture impossible.`))
    reader.readAsText(file)
  })
}
