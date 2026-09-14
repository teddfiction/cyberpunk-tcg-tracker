import * as React from "react"

import dataset from "@/data/dataset.json"
import { DEFAULT_CODES, EXPANSIONS } from "@/data/expansions"
import { buildCards, buildRows, countByExpansion } from "@/lib/dataset"
import { buildEnrichIndex } from "@/lib/enrich"
import { describe, mergeCatalog, parse, readJsonFile, IngestError } from "@/lib/ingest"
import type { CodeMap, Dataset, EnrichedCard, Price, Product } from "@/types"

const seed = dataset as unknown as Dataset

export type Notice = { tone: "ok" | "error"; message: string }

/**
 * Source de vérité de l'application. Le jeu de données embarqué sert d'amorce ;
 * tout import le remplace en mémoire, sans persistance — relancer la page
 * revient au jeu embarqué. Régénérer `src/data/dataset.json` via
 * `npm run data:cardmarket` pour changer l'amorce.
 */
export function useDataset() {
  const [catalog, setCatalog] = React.useState<Product[]>(seed.catalog)
  const [prices, setPrices] = React.useState<Record<string, Price>>(seed.prices)
  const [pricesAt, setPricesAt] = React.useState(seed.pricesAt)
  const [catalogAt, setCatalogAt] = React.useState(seed.catalogAt)
  const [codes, setCodes] = React.useState<CodeMap>(DEFAULT_CODES)
  const [enriched, setEnriched] = React.useState<EnrichedCard[] | null>(null)
  const [notice, setNotice] = React.useState<Notice | null>(null)

  const enrichIndex = React.useMemo(() => buildEnrichIndex(enriched, EXPANSIONS), [enriched])

  const rows = React.useMemo(
    () => buildRows({ catalog, prices, expansions: EXPANSIONS, codes, enrich: enrichIndex }),
    [catalog, prices, codes, enrichIndex]
  )
  const cards = React.useMemo(() => buildCards(rows, EXPANSIONS, codes), [rows, codes])
  const expCounts = React.useMemo(() => countByExpansion(rows), [rows])

  const importFiles = React.useCallback(
    async (files: FileList | File[] | null) => {
      const list = files ? Array.from(files) : []
      if (!list.length) return
      const messages: string[] = []
      let failed = false

      for (const file of list) {
        try {
          const parsed = parse(await readJsonFile(file), file.name)
          messages.push(describe(parsed, file.name, catalog))
          if (parsed.kind === "prices") {
            setPrices(parsed.prices)
            setPricesAt(parsed.pricesAt)
          } else if (parsed.kind === "catalog") {
            setCatalog((c) => mergeCatalog(c, parsed.products))
            setCatalogAt(parsed.catalogAt)
          } else {
            setEnriched(parsed.cards)
          }
        } catch (e) {
          failed = true
          messages.push(e instanceof IngestError ? e.message : `${file.name} : import impossible.`)
        }
      }
      setNotice({ tone: failed ? "error" : "ok", message: messages.join(" ") })
    },
    [catalog]
  )

  return {
    catalog,
    rows,
    cards,
    codes,
    setCodes,
    expCounts,
    expansions: EXPANSIONS,
    enriched: enrichIndex.on,
    pricesAt,
    catalogAt,
    notice,
    setNotice,
    importFiles,
  }
}

export type DatasetApi = ReturnType<typeof useDataset>
