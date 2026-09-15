/** Fabrique une instance TanStack headless sur la fixture, pour les tests. */
import {
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnFiltersState,
  type SortingState,
  type Table,
} from "@tanstack/react-table"

import { columnsFor } from "@/components/columns"
import { buildCards, buildRows } from "@/lib/dataset"
import { emptyIndex } from "@/lib/enrich"
import { MODES, type Mode } from "@/lib/modes"
import { HIDDEN_COLUMNS, rowId, searchRow } from "@/lib/table"
import { CATALOG, CODES, EXPANSIONS, PRICES } from "@/test/fixtures"
import type { TableRow } from "@/types"

export const rows = buildRows({
  catalog: CATALOG,
  prices: PRICES,
  expansions: EXPANSIONS,
  codes: CODES,
  enrich: emptyIndex(),
})

export const cards = buildCards(rows, EXPANSIONS, CODES)

type State = {
  sorting?: SortingState
  columnFilters?: ColumnFiltersState
  globalFilter?: string
}

export function makeTable(mode: Mode, state: State = {}): Table<TableRow> {
  const data: TableRow[] = MODES[mode].source === "cards" ? cards : rows

  const table = createTable<TableRow>({
    data,
    columns: columnsFor(mode, false),
    state: {},
    onStateChange: () => {},
    renderFallbackValue: null,
    getRowId: rowId,
    globalFilterFn: searchRow,
    meta: { mode, codes: CODES, expansions: EXPANSIONS },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  table.setOptions((prev) => ({
    ...prev,
    state: {
      columnVisibility: HIDDEN_COLUMNS,
      sorting: [],
      columnFilters: [],
      globalFilter: "",
      ...state,
    },
  }))

  return table
}

/** Noms des lignes affichées, dans l'ordre. */
export const namesOf = (table: Table<TableRow>) =>
  table.getRowModel().rows.map((r) => r.original.name)
