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
import { rarityRank } from "@/data/rarities"
import { matchExpansion } from "@/lib/enrich"
import { eur, minOf, norm, words } from "@/lib/format"
import type { CodeMap, EnrichedCard, GridCard, PrintRow, Row } from "@/types"

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
    let rank = 0
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
        rank: rank++,
      })
    }
  }

  return out.sort(
    (a, b) => a.name.localeCompare(b.name, "fr") || a.set.localeCompare(b.set, "fr")
  )
}

/**
 * Regroupe les impressions par carte, pour la grille.
 *
 * L'impression de référence est celle de rang 0 : l'endpoint liste de Netdeck
 * sert la version par défaut de la carte, et le script la pousse en tête. C'est
 * son visuel que porte la tuile.
 *
 * Elle se reconnaissait autrefois à son numéro de collecteur, seule à en porter
 * un. Ce n'est plus vrai — les 502 impressions en ont toutes un depuis que
 * l'export lit `collector_number` — et le critère ne discriminait donc plus
 * rien : la tuile retombait sur l'ordre alphabétique des sets.
 */
export function buildGrid(cards: EnrichedCard[] | null, printings: PrintRow[]): GridCard[] {
  if (!cards?.length) return []

  const byName = new Map<string, PrintRow[]>()
  for (const p of printings) {
    const group = byName.get(p.name)
    if (group) group.push(p)
    else byName.set(p.name, [p])
  }

  return cards
    .map((card) => {
      const ordered = [...(byName.get(card.name) ?? [])].sort((a, b) => a.rank - b.rank)

      const lows = ordered.map((p) => p.low ?? p.lowRange?.[0] ?? null)

      return {
        name: card.name,
        subname: card.subname ?? null,
        slug: card.slug,
        type: card.type ?? null,
        color: card.color ?? null,
        tags: card.tags ?? [],
        eddiable: !!card.eddiable,
        cost: card.cost ?? null,
        power: card.power ?? null,
        ram: card.ram ?? null,
        printings: ordered,
        sets: [...new Set(ordered.map((p) => p.set))],
        rarities: [...new Set(ordered.map((p) => p.rarity).filter((r): r is string => !!r))].sort(
          (a, b) => rarityRank(a) - rarityRank(b)
        ),
        thumb: ordered.find((p) => p.thumb)?.thumb ?? null,
        low: minOf(lows),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
}

/**
 * Une information de carte : un libellé terne, une valeur contrastée.
 * `dot` marque celle qui porte la pastille de couleur.
 */
export type CardStat = { label: string; value?: string; dot?: boolean }

/**
 * Caractéristiques d'une carte. La tuile et la modale des versions les montrent
 * toutes deux — d'où leur place ici plutôt que dans l'un des deux composants.
 *
 * La pastille de couleur s'accroche à la RAM, comme sur le site officiel. Une
 * carte sur 151 n'a pas de RAM : sa pastille passe alors en tête, faute de quoi
 * sa couleur ne s'afficherait nulle part.
 */
export function cardStats(card: GridCard): CardStat[] {
  const out: CardStat[] = []
  if (card.cost != null) out.push({ label: "Coût", value: String(card.cost) })
  if (card.power != null) out.push({ label: "Force", value: String(card.power) })
  if (card.ram != null) out.push({ label: "RAM", value: String(card.ram) })
  if (card.eddiable) out.push({ label: "€$" })

  // La pastille n'existe que s'il y a une couleur à montrer. Elle se pose sur
  // la RAM ; à défaut sur la première info, et à défaut sur une info dédiée.
  if (card.color) {
    const porteur = out.find((s) => s.label === "RAM") ?? out[0]
    if (porteur) porteur.dot = true
    else out.push({ label: card.color, dot: true })
  }
  return out
}

/**
 * Ce que porte la tuile : les caractéristiques, plus la cote Cardmarket. La
 * modale ne la reprend pas — elle en montre une par version.
 */
export const tileStats = (card: GridCard): CardStat[] =>
  card.low != null
    ? [...cardStats(card), { label: "Cardmarket dès", value: eur(card.low) ?? "" }]
    : cardStats(card)

/** Rendu texte d'une information, pour la description de la modale. */
export const statText = (s: CardStat) => [s.label, s.value].filter(Boolean).join(" ")

/** Recherche de la grille : nom, sous-titre, tags, type, couleur, sets, raretés. */
export const searchCard: FilterFn<GridCard> = (row, _columnId, needle) => {
  const terms = words(String(needle))
  if (!terms.length) return true
  const c = row.original
  const hay =
    " " +
    words(
      [c.name, c.subname, c.type, c.color, ...c.tags, ...c.sets, ...c.rarities]
        .filter(Boolean)
        .join(" ")
    ).join(" ")
  return terms.every((term) => hay.includes(" " + term))
}
