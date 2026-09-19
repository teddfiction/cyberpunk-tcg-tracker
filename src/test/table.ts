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
import { GRID_COLUMNS } from "@/components/grid-columns"
import { buildCards, buildRows } from "@/lib/dataset"
import { buildGrid, buildPrintings, searchCard } from "@/lib/printings"
import { emptyIndex } from "@/lib/enrich"
import { gridRows } from "@/lib/facets"
import { MODES, type Mode } from "@/lib/modes"
import { HIDDEN_COLUMNS, rowId, searchRow } from "@/lib/table"
import { buildEnrichIndex } from "@/lib/enrich"
import { CATALOG, CODES, ENRICHED, EXPANSIONS, PRICES } from "@/test/fixtures"
import type { Collection, GridCard, TableRow } from "@/types"

const build = (enrich = emptyIndex()) =>
  buildRows({ catalog: CATALOG, prices: PRICES, expansions: EXPANSIONS, codes: CODES, enrich })

export const rows = build()
export const cards = buildCards(rows, EXPANSIONS, CODES)

/** Mêmes produits, mais avec numéros et raretés Netdeck. */
export const enrichedRows = build(buildEnrichIndex(ENRICHED, EXPANSIONS))

type State = {
  sorting?: SortingState
  columnFilters?: ColumnFiltersState
  globalFilter?: string
}

export function makeTable(mode: Mode, state: State = {}, enriched = false): Table<TableRow> {
  const data: TableRow[] =
    MODES[mode].source === "cards" ? cards : enriched ? enrichedRows : rows

  const table = createTable<TableRow>({
    data,
    columns: columnsFor(mode, enriched),
    state: {},
    onStateChange: () => {},
    renderFallbackValue: null,
    getRowId: rowId,
    globalFilterFn: searchRow,
    meta: { codes: CODES, expansions: EXPANSIONS },
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

/** Les mêmes cartes, vues par la grille, avec les quantités d'une collection. */
export const gridOf = (collection: Collection = {}) =>
  buildGrid(
    ENRICHED,
    buildPrintings({ cards: ENRICHED, rows, expansions: EXPANSIONS, codes: CODES, collection })
  )

export const gridCards = gridOf()

/**
 * Instance headless de la grille. Le tri et les filtres s'y testent par l'ordre
 * qu'ils produisent, pas par les fonctions prises isolément. `data` permet d'y
 * passer la grille de la collection, qui partage colonnes et facettes.
 *
 * Les lignes passent par `gridRows`, comme dans `useTable` : une rareté cochée
 * décline les cartes par rareté, ici aussi.
 */
export function makeGrid(state: State = {}, data: GridCard[] = gridCards): Table<GridCard> {
  const table = createTable<GridCard>({
    data: gridRows(data, state.columnFilters ?? []),
    columns: GRID_COLUMNS,
    state: {},
    onStateChange: () => {},
    renderFallbackValue: null,
    getRowId: (c) => c.id,
    globalFilterFn: searchCard,
    meta: { codes: CODES, expansions: EXPANSIONS },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  table.setOptions((prev) => ({
    ...prev,
    state: { sorting: [], columnFilters: [], globalFilter: "", ...state },
  }))

  return table
}

/** Noms des cartes affichées par la grille, dans l'ordre. */
export const gridNames = (table: Table<GridCard>) =>
  table.getRowModel().rows.map((r) => r.original.name)

/** Tuiles affichées, par leur identifiant : ce qui sépare deux raretés d'une même carte. */
export const gridIds = (table: Table<GridCard>) => table.getRowModel().rows.map((r) => r.id)
