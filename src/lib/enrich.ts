/**
 * Jointure Netdeck ↔ Cardmarket : index par nom normalisé et extension, avec
 * repli prudent sur le nom seul.
 */
import { SET_ALIASES } from "@/data/expansions"
import { norm } from "@/lib/format"
import type { EnrichedCard, Printing } from "@/types"

export type EnrichEntry = Printing & { name: string; slug: string | null }

export type EnrichIndex = {
  /**
   * Clé `nomNormalisé|idExpansion` → **toutes** les impressions connues.
   * Une carte peut exister plusieurs fois dans une même extension (variantes de
   * rareté) : n'en garder qu'une attribuerait sa rareté à toutes les autres.
   */
  byNameExp: Map<string, EnrichEntry[]>
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
 * `SET_ALIASES` passe en premier : certains sets portent chez Netdeck un nom
 * qui n'a rien à voir avec celui de Cardmarket, et aucune comparaison de
 * libellés ne les rattrapera.
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
  const alias = SET_ALIASES[norm(setName ?? "")] ?? SET_ALIASES[norm(s)]
  if (alias) return alias
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

  const push = (map: Map<string, EnrichEntry[]>, key: string, entry: EnrichEntry) => {
    const list = map.get(key)
    if (list) list.push(entry)
    else map.set(key, [entry])
  }

  for (const card of cards) {
    const key = norm(card.name)
    for (const printing of card.printings) {
      const entry: EnrichEntry = { ...printing, name: card.name, slug: card.slug }
      const exp = matchExpansion(printing.set, printing.setCode, expansions)
      if (exp) push(index.byNameExp, `${key}|${exp}`, entry)
      push(index.byName, key, entry)
    }
  }
  return index
}

/**
 * Impressions connues pour un produit Cardmarket.
 *
 * Appariement strict nom + extension, avec repli sur le nom seul quand la carte
 * n'a qu'une impression connue — sans ce garde-fou, on attribuerait le mauvais
 * numéro de collecteur aux cartes réimprimées.
 *
 * Rend une liste, pas une impression : c'est à l'appelant de décider quoi faire
 * quand il y en a plusieurs. Ici, rien ne permet de dire laquelle correspond à
 * quel `idProduct`.
 */
export function printingsFor(index: EnrichIndex, name: string, exp: number): EnrichEntry[] {
  const key = norm(name)
  const exact = index.byNameExp.get(`${key}|${exp}`)
  if (exact?.length) return exact
  const all = index.byName.get(key)
  return all?.length === 1 ? all : []
}
