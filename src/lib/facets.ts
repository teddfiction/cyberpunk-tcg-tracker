/**
 * Facettes de la grille : ce sur quoi on peut filtrer, et comment.
 *
 * Une entrée décrit à la fois le libellé du filtre, les valeurs qu'une carte y
 * apporte, et l'ordre dans lequel les options se présentent. Ajouter une
 * facette, c'est ajouter une ligne ici puis la colonne qui la porte dans
 * `components/grid-columns.ts`.
 */
import type { ColumnFiltersState } from "@tanstack/react-table"

import { rarityRank } from "@/data/rarities"
import { words } from "@/lib/format"
import { collectibles } from "@/lib/printings"
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
  // Pas de facette Possédée / Manquante : la possession se filtre dans la
  // collection, par son sélecteur Toutes / Possédées / Manquantes (`OWNED_FACET`).
]

const num = (v: number | null) => (v != null ? [String(v)] : [])

/**
 * Tuiles de la grille selon les filtres posés : cocher une rareté décline
 * chaque carte en ses cartes à collectionner — une tuile par rareté, et par
 * illustration alternative (`collectibles`). Sans quoi Sasha Yakovleva, cochée
 * en Secret et en Iconic Secret, ne ferait qu'une tuile — et la seconde, celle
 * qu'on cherchait peut-être, ne se verrait pas ; ni V - Streetkid féminine,
 * cochée en Rare.
 *
 * Appliquée avant TanStack (`rowsOf` de `useTable`), qui filtre et trie ensuite
 * ces tuiles comme les autres : la facette Rareté ne garde que les raretés
 * cochées, et chaque tuile ne porte que les sets, la cote et les exemplaires
 * des siennes. Pas de second moteur de filtrage.
 *
 * Sans rareté cochée, une tuile par carte : la base telle que la présente le
 * site officiel, chaque carte dans sa version par défaut. Sans effet sur la
 * collection, dont chaque tuile est déjà une carte à collectionner ou une
 * version : `collectibles` la rend telle quelle.
 */
export function gridRows(grid: GridCard[], filters: ColumnFiltersState): GridCard[] {
  return selectedIn(filters, RARITY_FACET).length ? grid.flatMap(collectibles) : grid
}

/** Valeurs cochées d'une facette, vide si elle n'est pas filtrée. */
const selectedIn = (filters: ColumnFiltersState, id: string) =>
  (filters.find((f) => f.id === id)?.value as string[] | undefined) ?? []

/**
 * Les options de chaque facette, comptées sur les tuiles qu'y cocher une option
 * donnerait : celles du moment, sauf pour la Rareté, toujours comptée sur la
 * grille déclinée. Cocher « Rare » donne 33 tuiles pour 32 cartes — V -
 * Streetkid en compte deux, ses illustrations a et b. Comptée sur les cartes,
 * la Rareté annoncerait 32 puis passerait à 33 au moment où on la coche.
 *
 * Toutes les tuiles, jamais les seules visibles : voir `facetOptions`.
 */
export function gridFacets(
  facets: Facet[],
  grid: GridCard[],
  filters: ColumnFiltersState
): { facet: Facet; options: FacetOption[] }[] {
  const tiles = gridRows(grid, filters)
  const declined = tiles === grid ? grid.flatMap(collectibles) : tiles
  return facets.map((facet) => ({
    facet,
    options: facetOptions(
      facet,
      facet.id === RARITY_FACET ? declined : tiles,
      selectedIn(filters, facet.id)
    ),
  }))
}

export type FacetOption = { value: string; count: number }

/**
 * Options d'une facette, comptées sur les cartes fournies.
 *
 * Comptées sur **toutes** les cartes et non sur les seules visibles : sinon
 * cocher une option ferait disparaître les autres, et l'on ne pourrait plus
 * élargir sa sélection.
 *
 * Une valeur cochée reste proposée, fût-ce à zéro, sans quoi on ne pourrait
 * plus la décocher. Le cas se produit : les niveaux de la collection partagent
 * leurs filtres, et une rareté cochée dans « Toutes les raretés » — Nova Rare —
 * n'a aucune tuile dans « Jeu de base ».
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
