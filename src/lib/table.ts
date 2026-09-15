/**
 * Sémantique de tri et de filtrage passée à TanStack Table.
 * Fonctions pures, sans JSX : les décisions métier (collation française, valeurs
 * manquantes toujours en bas, extensions multiples) vivent ici.
 */
import type { FilterFn, SortingFn, SortingState } from "@tanstack/react-table"

import { MODES, type Mode } from "@/lib/modes"
import type { AnyRow, TableRow } from "@/types"

/**
 * Collation française. `localeCompare` range « Éclat » avant « Effet » ;
 * la comparaison binaire par défaut de TanStack le mettrait après.
 */
export const sortText: SortingFn<TableRow> = (a, b, id) =>
  String(a.getValue(id) ?? "").localeCompare(String(b.getValue(id) ?? ""), "fr")

/**
 * Recherche plein texte. Déclarée sur la seule colonne Produit — sans ça
 * TanStack la rejouerait à l'identique sur chaque colonne de chaque ligne.
 */
export const searchRow: FilterFn<TableRow> = (row, _columnId, needle) => {
  const q = String(needle).trim().toLowerCase()
  if (!q) return true
  const r = row.original as AnyRow
  return `${r.name} ${r.expName} ${r.code ?? ""} ${r.num ?? ""} ${r.id}`.toLowerCase().includes(q)
}

/** Extensions cochées dans la barre de filtres. Une carte passe si l'une des siennes correspond. */
export const filterExpansions: FilterFn<TableRow> = (row, id, value) => {
  const selected = value as string[]
  return !selected?.length || (row.getValue(id) as string[]).some((e) => selected.includes(e))
}

/** Case à cocher : inactive, elle ne filtre rien. */
export const filterFlag: FilterFn<TableRow> = (row, id, value) =>
  !value || row.getValue(id) === true

/** Identifiants d'extension d'une ligne, sous la forme attendue par le filtre. */
export const expansionsOf = (r: TableRow): string[] =>
  "exps" in r ? r.exps.map(String) : [String(r.exp)]

/** Clé de ligne stable : une carte et un produit peuvent porter le même id. */
export const rowId = (r: TableRow) => ("nExp" in r ? `c${r.mc}` : `p${r.id}`)

/** Colonnes masquées en permanence : elles ne portent que les filtres de la barre. */
export const HIDDEN_COLUMNS = { exps: false, priced: false, single: false }

/**
 * Le tri courant, ou celui par défaut du mode quand la colonne triée n'existe
 * pas dans ce mode. Dérivé à chaque rendu plutôt que remis à zéro par un effet :
 * pas d'état transitoire incohérent entre deux peintures.
 */
export function resolveSorting(
  sorting: SortingState,
  columnIds: (string | undefined)[],
  mode: Mode
): SortingState {
  const ids = new Set(columnIds)
  const kept = sorting.filter((s) => ids.has(s.id))
  return kept.length ? kept : [{ id: MODES[mode].defaultSort, desc: true }]
}
