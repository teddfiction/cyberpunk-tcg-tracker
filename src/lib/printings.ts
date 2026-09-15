/**
 * Lignes de la base de cartes : une par impression Netdeck.
 *
 * L'entité est ici l'impression et non l'annonce Cardmarket. C'est ce qui rend
 * visibles les cartes qu'aucun vendeur ne propose — invisibles dans la table
 * des cotes — et ce qui donne rareté et numéro sans détour.
 *
 * La cote Cardmarket n'est rattachée que lorsqu'un seul produit correspond à
 * cette carte dans cette extension. Quand plusieurs se partagent le nom, rien
 * ne dit lequel est cette impression : on montre la fourchette, on ne choisit
 * pas. Même règle que la colonne Rareté de l'autre table.
 */
import { matchExpansion } from "@/lib/enrich"
import { minOf, norm, words } from "@/lib/format"
import type { CodeMap, EnrichedCard, PrintRow, Row } from "@/types"

import type { FilterFn } from "@tanstack/react-table"

type BuildArgs = {
  cards: EnrichedCard[] | null
  rows: Row[]
  expansions: Record<string, string>
  codes: CodeMap
}

export function buildPrintings({ cards, rows, expansions, codes }: BuildArgs): PrintRow[] {
  if (!cards?.length) return []

  // Produits Cardmarket par carte et par extension, pour rattacher les cotes.
  const byNameExp = new Map<string, Row[]>()
  for (const r of rows) {
    const key = `${norm(r.name)}|${r.exp}`
    const group = byNameExp.get(key)
    if (group) group.push(r)
    else byNameExp.set(key, [r])
  }

  const out: PrintRow[] = []
  for (const card of cards) {
    for (const printing of card.printings) {
      if (!printing.uuid) continue
      const exp = matchExpansion(printing.set, printing.setCode, expansions)
      const group = exp ? (byNameExp.get(`${norm(card.name)}|${exp}`) ?? []) : []
      const lows = group.map((r) => r.low)
      const min = minOf(lows)
      const max = lows.reduce<number | null>((m, v) => (v != null && (m == null || v > m) ? v : m), null)

      out.push({
        uuid: printing.uuid,
        name: card.name,
        slug: card.slug,
        set: printing.set ?? "Set inconnu",
        exp,
        code: exp ? (codes[exp]?.code ?? "") : "",
        num: printing.number,
        rarity: printing.rarity,
        artist: printing.artist,
        thumb: printing.thumb ?? null,
        type: card.type ?? null,
        color: card.color ?? null,
        cost: card.cost ?? null,
        power: card.power ?? null,
        ram: card.ram ?? null,
        low: group.length === 1 ? (group[0].low ?? null) : null,
        lowRange: group.length > 1 && min != null && max != null && min !== max ? [min, max] : null,
        variants: group.length,
      })
    }
  }

  return out.sort(
    (a, b) => a.name.localeCompare(b.name, "fr") || a.set.localeCompare(b.set, "fr")
  )
}

/** Clé de ligne : les uuid Netdeck sont uniques sur l'ensemble des impressions. */
export const printingId = (p: PrintRow) => p.uuid

/**
 * Recherche plein texte, mêmes règles que l'autre table : mots sans accents,
 * ponctuation ignorée, chaque mot devant commencer un mot de la ligne.
 */
export const searchPrinting: FilterFn<PrintRow> = (row, _columnId, needle) => {
  const terms = words(String(needle))
  if (!terms.length) return true
  const p = row.original
  const hay =
    " " +
    words(
      `${p.name} ${p.set} ${p.num ?? ""} ${p.rarity ?? ""} ${p.type ?? ""} ${p.color ?? ""} ${p.artist ?? ""} ${p.code}`
    ).join(" ")
  return terms.every((term) => hay.includes(" " + term))
}
