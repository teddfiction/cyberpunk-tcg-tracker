/**
 * Jeu de données synthétique des tests. Volontairement pas `dataset.json` :
 * les cotes changent à chaque `npm run data:refresh`, des tests assis dessus
 * casseraient sans qu'aucun code n'ait bougé.
 */
import type { CodeMap, EnrichedCard, Price, Product } from "@/types"

export const EXPANSIONS: Record<string, string> = {
  "1": "Alpha Kit",
  "2": "Beta Kit",
  "3": "Welcome to Night City — Retail",
}

export const CODES: CodeMap = {
  "1": { code: "A1", sure: true },
  "2": { code: "B1", sure: false },
  "3": { code: "C1", sure: false },
}

/** Couvre : une réimpression (mc 100), un scellé (mc 0), un produit sans cote. */
export const CATALOG: Product[] = [
  { id: 10, name: "Zébu - Calme", exp: 1, cat: "Single", mc: 100 },
  { id: 11, name: "Éclair - Vif", exp: 2, cat: "Single", mc: 101 },
  { id: 12, name: "Effet - Net", exp: 2, cat: "Single", mc: 102 },
  { id: 13, name: "Booster Box", exp: 1, cat: "Booster Box", mc: 0 },
  { id: 14, name: "Zébu - Calme", exp: 3, cat: "Single", mc: 100 },
]

/** 13 n'a aucune cote ; 11 n'a que du foil. */
export const PRICES: Record<string, Price> = {
  "10": { avg: 10, low: 8, trend: 9, avgF: null, lowF: null, foil: 0 },
  "11": { avg: null, low: null, trend: null, avgF: 4, lowF: 2, foil: 1 },
  "12": { avg: 3, low: 2, trend: 4, avgF: null, lowF: null, foil: 0 },
  "14": { avg: 20, low: 15, trend: 18, avgF: null, lowF: null, foil: 0 },
}

const printing = (uuid: string, set: string, setCode: string, number: string) => ({
  uuid,
  set,
  setCode,
  number,
  rarity: "Rare",
  artist: null,
})

/** « Zébu » a deux impressions, « Éclair » une seule : de quoi éprouver le repli. */
export const ENRICHED: EnrichedCard[] = [
  {
    name: "Zébu - Calme",
    slug: "zebu-calme",
    printings: [
      printing("u1", "Alpha Kit", "alphakit", "001"),
      printing("u2", "Welcome to Night City — Retail", "welcometonightcityretail", "101"),
    ],
  },
  {
    name: "Éclair - Vif",
    slug: "eclair-vif",
    printings: [printing("u3", "Beta Kit", "betakit", "007")],
  },
]
