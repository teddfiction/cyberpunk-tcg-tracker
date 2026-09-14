import * as React from "react"

import { columnsFor, defaultSortKey } from "@/lib/columns"
import type { Filters, Mode } from "@/types"

const INITIAL: Filters = {
  q: "",
  mode: "normal",
  exps: [],
  hideEmpty: true,
  onlySingles: false,
  sort: { k: "low", dir: "desc" },
}

export function useFilters(enriched: boolean) {
  const [filters, setFilters] = React.useState<Filters>(INITIAL)

  const patch = React.useCallback(
    (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p })),
    []
  )

  /** Changer de mode peut faire disparaître la colonne triée : on retombe sur un tri valide. */
  const setMode = React.useCallback((mode: Mode) => {
    setFilters((f) => {
      const keys = columnsFor(mode, true).map((c) => c.k)
      return {
        ...f,
        mode,
        sort: keys.includes(f.sort.k) ? f.sort : { k: defaultSortKey(mode), dir: "desc" },
      }
    })
  }, [])

  const toggleSort = React.useCallback((k: string, textual: boolean) => {
    setFilters((f) => ({
      ...f,
      sort:
        f.sort.k === k
          ? { k, dir: f.sort.dir === "asc" ? "desc" : "asc" }
          : { k, dir: textual ? "asc" : "desc" },
    }))
  }, [])

  const reset = React.useCallback(() => setFilters(INITIAL), [])

  const columns = React.useMemo(
    () => columnsFor(filters.mode, enriched),
    [filters.mode, enriched]
  )

  return { filters, patch, setMode, toggleSort, reset, columns }
}
