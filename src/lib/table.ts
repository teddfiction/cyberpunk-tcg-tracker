/**
 * Sémantique de tri et de filtrage passée à TanStack Table.
 * Fonctions pures, sans JSX : les décisions métier (collation française, valeurs
 * manquantes toujours en bas, extensions multiples) vivent ici.
 */
import type {
  FilterFn,
  Row as TanstackRow,
  SortingState,
} from "@tanstack/react-table"

import { words } from "@/lib/format"
import type { AnyRow, TableRow } from "@/types"

/**
 * Collation française. `localeCompare` range « Éclat » avant « Effet » ;
 * la comparaison binaire par défaut de TanStack le mettrait après.
 *
 * Générique : elle ne lit qu'une valeur de colonne, et sert aux deux tables.
 */
export function sortText<T>(a: TanstackRow<T>, b: TanstackRow<T>, id: string): number {
  return String(a.getValue(id) ?? "").localeCompare(String(b.getValue(id) ?? ""), "fr")
}

/**
 * Recherche plein texte, tolérante à la saisie naturelle.
 *
 * Requête et ligne sont découpées en mots (sans accents, ponctuation ignorée) ;
 * chaque mot de la requête doit ensuite **commencer** un mot de la ligne.
 * « V corpo » trouve « V - Corporate Exile », « zebu » trouve « Zébu », l'ordre
 * des mots est libre, et un début de mot suffit — on cherche pendant la frappe.
 *
 * Le début de mot est ce qui tient les faux positifs : en sous-chaîne libre,
 * le « v » de « V corpo » s'appariait au v de « Surveillance » et ramenait
 * presque deux fois plus de lignes. Contrepartie assumée : un fragment pris au
 * milieu d'un mot ne trouve plus rien (« 01 » ne remonte plus « MS01B » —
 * « MS01 » oui).
 *
 * Déclarée sur la seule colonne Produit — sans ça TanStack la rejouerait à
 * l'identique sur chaque colonne de chaque ligne.
 */
export const searchRow: FilterFn<TableRow> = (row, _columnId, needle) => {
  const terms = words(String(needle))
  if (!terms.length) return true
  const r = row.original as AnyRow
  // L'espace de tête fait du début de chaîne un début de mot comme les autres.
  const hay = " " + words(`${r.name} ${r.expName} ${r.code ?? ""} ${r.num ?? ""} ${r.id}`).join(" ")
  return terms.every((term) => hay.includes(" " + term))
}

/** Extensions cochées dans la barre de filtres. Une carte passe si l'une des siennes correspond. */
export const filterExpansions: FilterFn<TableRow> = (row, id, value) => {
  const selected = value as string[]
  return !selected?.length || (row.getValue(id) as string[]).some((e) => selected.includes(e))
}

/**
 * Valeur scalaire parmi celles cochées. Aucune coche : aucun filtre — c'est ce
 * qui permet à une facette inutilisée de ne pas vider la grille.
 */
export function filterIn<T>(row: TanstackRow<T>, id: string, value: unknown): boolean {
  const selected = value as string[] | undefined
  return !selected?.length || selected.includes(String(row.getValue(id) ?? ""))
}

/** Au moins une des valeurs de la ligne parmi celles cochées. */
export function filterAny<T>(row: TanstackRow<T>, id: string, value: unknown): boolean {
  const selected = value as string[] | undefined
  if (!selected?.length) return true
  return ((row.getValue(id) as string[] | undefined) ?? []).some((v) => selected.includes(v))
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

/** « Masquer les lignes sans prix » est actif au départ, et rétabli par la réinitialisation. */
export const INITIAL_FILTERS = [{ id: "priced", value: true }]

/**
 * Le tri courant, ou celui par défaut quand la colonne triée n'existe pas dans
 * ce jeu de colonnes. Dérivé à chaque rendu plutôt que remis à zéro par un
 * effet : pas d'état transitoire incohérent entre deux peintures.
 */
export function resolveSorting(
  sorting: SortingState,
  columnIds: (string | undefined)[],
  defaultSort: string,
  defaultDesc = true
): SortingState {
  const ids = new Set(columnIds)
  const kept = sorting.filter((s) => ids.has(s.id))
  return kept.length ? kept : [{ id: defaultSort, desc: defaultDesc }]
}
