/**
 * Instance TanStack Table : tri, filtres de colonnes et recherche.
 * TanStack est seul dépositaire de cet état — la barre de filtres lit et écrit
 * dans l'instance, il n'y a pas de copie React à garder synchrone.
 */
import * as React from "react"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"

import { HIDDEN_COLUMNS, defaultSortId, rowId, searchRow } from "@/lib/table"
import type { CodeMap, Mode, TableRow } from "@/types"

/** Repris par `reset()` : la remise à zéro repasse par cet état, pas par du vide. */
const INITIAL_SORTING: SortingState = [{ id: "low", desc: true }]
const INITIAL_FILTERS: ColumnFiltersState = [{ id: "priced", value: true }]

type Args = {
  data: TableRow[]
  columns: ColumnDef<TableRow>[]
  mode: Mode
  codes: CodeMap
  expansions: Record<string, string>
}

export function useTable({ data, columns, mode, codes, expansions }: Args) {
  const [sorting, setSorting] = React.useState<SortingState>(INITIAL_SORTING)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(INITIAL_FILTERS)
  const [globalFilter, setGlobalFilter] = React.useState("")

  /** Changer de mode peut faire disparaître la colonne triée : on retombe sur un tri valide. */
  const safeSorting = React.useMemo(() => {
    const ids = new Set(columns.map((c) => c.id))
    const kept = sorting.filter((s) => ids.has(s.id))
    return kept.length ? kept : [{ id: defaultSortId(mode), desc: true }]
  }, [sorting, columns, mode])

  return useReactTable<TableRow>({
    data,
    columns,
    state: { sorting: safeSorting, columnFilters, globalFilter },
    initialState: {
      sorting: INITIAL_SORTING,
      columnFilters: INITIAL_FILTERS,
      columnVisibility: HIDDEN_COLUMNS,
    },
    meta: { mode, codes, expansions },
    getRowId: rowId,
    globalFilterFn: searchRow,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
}
