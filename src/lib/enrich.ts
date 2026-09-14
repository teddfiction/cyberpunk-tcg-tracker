import { norm } from "@/lib/format"
import type { EnrichedCard, Printing } from "@/types"

export type EnrichEntry = Printing & { name: string; slug: string | null }

export type EnrichIndex = {
  /** Clé `nomNormalisé|idExpansion` — appariement exact. */
  byNameExp: Map<string, EnrichEntry>
  /** Toutes les impressions d'un nom, pour le repli. */
  byName: Map<string, EnrichEntry[]>
  on: boolean
}

export const emptyIndex = (): EnrichIndex => ({
  byNameExp: new Map(),
  byName: new Map(),
  on: false,
})

/**
 * Rapproche un nom de set Netdeck d'un idExpansion Cardmarket.
 *
 * `norm()` produit exactement le `set.code` de l'API (« Welcome to Night City —
 * Retail » → `welcometonightcityretail`), donc l'égalité est la règle. Le
 * préfixe couvre les libellés partiels : « Pre-Release Beta » contre
 * « Pre-Release Beta Kit ». En cas d'ambiguïté, on garde le libellé le plus long.
 */
export function matchExpansion(
  setName: string | null,
  setCode: string | null,
  expansions: Record<string, string>
): string | null {
  const s = setCode || (setName ? norm(setName) : null)
  if (!s) return null
  let best: string | null = null
  for (const [id, label] of Object.entries(expansions)) {
    const l = norm(label)
    if (l === s || l.startsWith(s) || s.startsWith(l)) {
      if (!best || l.length > norm(expansions[best]).length) best = id
    }
  }
  return best
}

export function buildEnrichIndex(
  cards: EnrichedCard[] | null,
  expansions: Record<string, string>
): EnrichIndex {
  const index = emptyIndex()
  if (!cards?.length) return index
  index.on = true

  for (const card of cards) {
    const key = norm(card.name)
    for (const printing of card.printings) {
      const entry: EnrichEntry = { ...printing, name: card.name, slug: card.slug }
      const exp = matchExpansion(printing.set, printing.setCode, expansions)
      if (exp) index.byNameExp.set(`${key}|${exp}`, entry)
      index.byName.set(key, [...(index.byName.get(key) ?? []), entry])
    }
  }
  return index
}

/**
 * Retrouve l'impression correspondant à un produit Cardmarket.
 * Appariement strict nom + extension, repli sur le nom seul quand la carte
 * n'a qu'une impression connue — sans ce garde-fou, on attribuerait le mauvais
 * numéro de collecteur aux cartes réimprimées.
 */
export function lookup(index: EnrichIndex, name: string, exp: number): EnrichEntry | null {
  const key = norm(name)
  const exact = index.byNameExp.get(`${key}|${exp}`)
  if (exact) return exact
  const hits = index.byName.get(key)
  return hits?.length === 1 ? hits[0] : null
}
