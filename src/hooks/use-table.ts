/**
 * Instance TanStack Table, partagée par toutes les tables de l'app.
 *
 * TanStack est seul dépositaire de l'état — tri, filtres, recherche. Les barres
 * d'outils lisent et écrivent dans l'instance, il n'y a pas de copie React à
 * garder synchrone.
 *
 * Générique sur la forme de ligne : la table des cotes manipule des produits
 * Cardmarket, la base de cartes des impressions Netdeck. Tout le reste est
 * identique, et doit le rester — dupliquer ce câblage serait le début de la fin.
 */
import * as React from "react"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type SortingState,
  type TableMeta,
  type VisibilityState,
} from "@tanstack/react-table"

import { resolveSorting } from "@/lib/table"

type Args<T> = {
  data: T[]
  columns: ColumnDef<T>[]
  /** Colonne triée au départ, et de repli si le tri courant n'existe plus ici. */
  defaultSort: string
  /** Sens du tri initial. Décroissant par défaut : on cherche d'abord les gros prix. */
  defaultDesc?: boolean
  /** Clé de ligne stable — deux lignes peuvent porter le même identifiant métier. */
  getRowId: (row: T) => string
  /** Prédicat de recherche plein texte, déclaré sur une seule colonne. */
  globalFilterFn: FilterFn<T>
  meta: TableMeta<T>
  /** Colonnes masquées en permanence : elles ne portent que des filtres. */
  hidden?: VisibilityState
  /** Filtres actifs au départ, et rétablis par `resetColumnFilters()`. */
  initialFilters?: ColumnFiltersState
}

export function useTable<T>({
  data,
  columns,
  defaultSort,
  defaultDesc = true,
  getRowId,
  globalFilterFn,
  meta,
  hidden = {},
  initialFilters = [],
}: Args<T>) {
  const initialSorting = React.useMemo<SortingState>(
    () => [{ id: defaultSort, desc: defaultDesc }],
    [defaultSort, defaultDesc]
  )

  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(initialFilters)
  const [globalFilter, setGlobalFilter] = React.useState("")

  /** Changer de jeu de colonnes peut faire disparaître la colonne triée. */
  const safeSorting = React.useMemo(
    () => resolveSorting(sorting, columns.map((c) => c.id), defaultSort, defaultDesc),
    [sorting, columns, defaultSort, defaultDesc]
  )

  return useReactTable<T>({
    data,
    columns,
    state: { sorting: safeSorting, columnFilters, globalFilter },
    initialState: {
      sorting: initialSorting,
      columnFilters: initialFilters,
      columnVisibility: hidden,
    },
    meta,
    getRowId,
    globalFilterFn,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
}
