/**
 * Facettes de la grille : ce sur quoi on peut filtrer, et comment.
 *
 * Une entrée décrit à la fois le libellé du filtre, les valeurs qu'une carte y
 * apporte, et l'ordre dans lequel les options se présentent. Ajouter une
 * facette, c'est ajouter une ligne ici puis la colonne qui la porte dans
 * `components/grid-columns.ts`.
 */
import { rarityRank } from "@/data/rarities"
import { MISSING, OWNED, OWNED_FACET } from "@/lib/collection"
import { words } from "@/lib/format"
import type { GridCard } from "@/types"

export type FacetSort = "count" | "numeric" | "rarity"

export type Facet = {
  /** Identifiant de la colonne TanStack qui porte le filtre. */
  id: string
  label: string
  /** Valeurs qu'une carte apporte à cette facette. Vide = elle n'y figure pas. */
  values: (card: GridCard) => string[]
  sort: FacetSort
}

/**
 * Identifiant de la facette Rareté. Nommé parce que la grille s'y réfère en
 * dehors du registre : le visuel d'une tuile suit la rareté filtrée
 * (`printingIndex`), et une chaîne en dur se désaccorderait en silence.
 */
export const RARITY_FACET = "rarities"

export const FACETS: Facet[] = [
  { id: "color", label: "Couleur", values: (c) => (c.color ? [c.color] : []), sort: "count" },
  { id: "type", label: "Type", values: (c) => (c.type ? [c.type] : []), sort: "count" },
  { id: "tags", label: "Tags", values: (c) => c.tags, sort: "count" },
  { id: "cost", label: "Coût", values: (c) => num(c.cost), sort: "numeric" },
  { id: "power", label: "Puissance", values: (c) => num(c.power), sort: "numeric" },
  { id: "ram", label: "RAM", values: (c) => num(c.ram), sort: "numeric" },
  { id: "eddiable", label: "Eddies", values: (c) => [c.eddiable ? "Oui" : "Non"], sort: "count" },
  { id: "sets", label: "Set", values: (c) => c.sets, sort: "count" },
  { id: RARITY_FACET, label: "Rareté", values: (c) => c.rarities, sort: "rarity" },
  {
    id: OWNED_FACET,
    label: "Collection",
    values: (c) => [c.owned > 0 ? OWNED : MISSING],
    sort: "count",
  },
]

const num = (v: number | null) => (v != null ? [String(v)] : [])

export type FacetOption = { value: string; count: number }

/**
 * Options d'une facette, comptées sur les cartes fournies.
 *
 * Comptées sur **toutes** les cartes et non sur les seules visibles : sinon
 * cocher une option ferait disparaître les autres, et l'on ne pourrait plus
 * élargir sa sélection.
 *
 * Une valeur cochée reste proposée, fût-ce à zéro, sans quoi on ne pourrait
 * plus la décocher. Le cas se produit : les onglets de la collection partagent
 * leurs filtres, et un set coché dans « Collectées » peut n'avoir aucune version
 * dans « Manquantes » — ou disparaître quand on en retire la dernière version.
 */
export function facetOptions(
  facet: Facet,
  cards: GridCard[],
  selected: string[] = []
): FacetOption[] {
  const counts = new Map<string, number>(selected.map((value) => [value, 0]))
  for (const card of cards) {
    for (const value of facet.values(card)) counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  const options = [...counts.entries()].map(([value, count]) => ({ value, count }))

  if (facet.sort === "numeric") return options.sort((a, b) => Number(a.value) - Number(b.value))
  if (facet.sort === "rarity") return options.sort((a, b) => rarityRank(a.value) - rarityRank(b.value))
  return options.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "fr"))
}

/**
 * Options retenues par la saisie du champ de recherche d'un filtre.
 *
 * Même contrat que la recherche globale (`searchRow`, `searchCard`) : chaque
 * mot tapé doit **commencer** un mot de l'option, accents ignorés. Une seule
 * façon de chercher dans l'app plutôt que deux selon l'endroit — « night »
 * trouve « Welcome to Night City », « eta » ne trouve pas « Beta ».
 */
export function matchOptions(options: FacetOption[], query: string): FacetOption[] {
  const terms = words(query)
  if (!terms.length) return options
  return options.filter((o) => {
    const hay = " " + words(o.value).join(" ")
    return terms.every((term) => hay.includes(" " + term))
  })
}
