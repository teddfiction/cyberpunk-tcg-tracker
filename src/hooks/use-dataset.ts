/**
 * Source de vérité des données : jeu embarqué, imports à chaud, enrichissement
 * Netdeck, et les lignes de table qui en découlent.
 *
 * Les imports sont conservés dans IndexedDB, donc survivent au rechargement.
 * L'écriture n'a lieu **qu'après un import réussi**, jamais sur un simple
 * changement d'état : au premier rendu l'app est encore sur le jeu embarqué, et
 * une sauvegarde automatique écraserait ce qu'on est en train de relire.
 */
import * as React from "react"

import dataset from "@/data/dataset.json"
import { DEFAULT_CODES, EXPANSIONS } from "@/data/expansions"
import { buildCards, buildRows, countByExpansion } from "@/lib/dataset"
import { buildEnrichIndex } from "@/lib/enrich"
import { describe, mergeCatalog, parse, readJsonFile, IngestError } from "@/lib/ingest"
import { fetchPriceGuide } from "@/lib/remote"
import { idbDelete, idbGet, idbSet } from "@/lib/store"
import type { CodeMap, Dataset, EnrichedCard, Price, Product } from "@/types"

const seed = dataset as unknown as Dataset

const KEY_DATA = "dataset"
const KEY_CODES = "codes"

/** Ce qui est conservé entre deux sessions. */
type Stored = {
  catalog: Product[]
  prices: Record<string, Price>
  pricesAt: string
  catalogAt: string
  enriched: EnrichedCard[] | null
  savedAt: string
}

export type Notice = { tone: "ok" | "error"; message: string }

export function useDataset() {
  const [catalog, setCatalog] = React.useState<Product[]>(seed.catalog)
  const [prices, setPrices] = React.useState<Record<string, Price>>(seed.prices)
  const [pricesAt, setPricesAt] = React.useState(seed.pricesAt)
  const [catalogAt, setCatalogAt] = React.useState(seed.catalogAt)
  const [codes, setCodes] = React.useState<CodeMap>(DEFAULT_CODES)
  const [enriched, setEnriched] = React.useState<EnrichedCard[] | null>(null)
  const [notice, setNotice] = React.useState<Notice | null>(null)
  /** Date du dernier import conservé, `null` si rien n'est stocké. */
  const [storedAt, setStoredAt] = React.useState<string | null>(null)
  /** Un téléchargement est en cours : le bouton doit le montrer et se bloquer. */
  const [fetching, setFetching] = React.useState(false)

  const hydrated = React.useRef(false)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      const [stored, storedCodes] = await Promise.all([
        idbGet<Stored>(KEY_DATA),
        idbGet<CodeMap>(KEY_CODES),
      ])
      if (!cancelled) {
        if (stored) {
          setCatalog(stored.catalog)
          setPrices(stored.prices)
          setPricesAt(stored.pricesAt)
          setCatalogAt(stored.catalogAt)
          setEnriched(stored.enriched)
          setStoredAt(stored.savedAt)
        }
        if (storedCodes) setCodes(storedCodes)
      }
      hydrated.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Les codes se modifient à la frappe : on les suit, mais jamais avant relecture.
  React.useEffect(() => {
    if (!hydrated.current) return
    void idbSet(KEY_CODES, codes)
  }, [codes])

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
      let changed = false

      // On accumule localement : les setters de React ne seraient pas lus à
      // temps pour construire ce qu'on doit écrire dans IndexedDB.
      let next: Omit<Stored, "savedAt"> = { catalog, prices, pricesAt, catalogAt, enriched }

      for (const file of list) {
        try {
          const parsed = parse(await readJsonFile(file), file.name)
          messages.push(describe(parsed, file.name, next.catalog))
          if (parsed.kind === "prices") {
            next = { ...next, prices: parsed.prices, pricesAt: parsed.pricesAt }
          } else if (parsed.kind === "catalog") {
            next = {
              ...next,
              catalog: mergeCatalog(next.catalog, parsed.products),
              catalogAt: parsed.catalogAt,
            }
          } else {
            next = { ...next, enriched: parsed.cards }
          }
          changed = true
        } catch (e) {
          failed = true
          messages.push(e instanceof IngestError ? e.message : `${file.name} : import impossible.`)
        }
      }

      if (changed) {
        setCatalog(next.catalog)
        setPrices(next.prices)
        setPricesAt(next.pricesAt)
        setCatalogAt(next.catalogAt)
        setEnriched(next.enriched)

        const savedAt = new Date().toISOString()
        const kept = await idbSet(KEY_DATA, { ...next, savedAt } satisfies Stored)
        setStoredAt(kept ? savedAt : null)
        if (!kept) {
          messages.push(
            "Ce navigateur refuse le stockage local : recharger la page reviendra au jeu embarqué."
          )
        }
      }

      setNotice({ tone: failed ? "error" : "ok", message: messages.join(" ") })
    },
    [catalog, prices, pricesAt, catalogAt, enriched]
  )

  /**
   * Télécharge le price guide du jour et le passe par `importFiles`.
   *
   * Aucune logique d'import n'est redupliquée ici : le fichier récupéré suit
   * exactement le chemin d'un fichier choisi à la main, compte rendu et
   * conservation compris.
   */
  const refreshPrices = React.useCallback(async () => {
    setFetching(true)
    try {
      await importFiles([await fetchPriceGuide()])
    } catch (e) {
      setNotice({
        tone: "error",
        message: e instanceof Error ? e.message : "Téléchargement impossible.",
      })
    } finally {
      setFetching(false)
    }
  }, [importFiles])

  /** Efface ce qui est conservé et repart du jeu embarqué. */
  const forget = React.useCallback(async () => {
    await Promise.all([idbDelete(KEY_DATA), idbDelete(KEY_CODES)])
    setCatalog(seed.catalog)
    setPrices(seed.prices)
    setPricesAt(seed.pricesAt)
    setCatalogAt(seed.catalogAt)
    setEnriched(null)
    setCodes(DEFAULT_CODES)
    setStoredAt(null)
    setNotice({ tone: "ok", message: "Données importées oubliées. Retour au jeu embarqué." })
  }, [])

  return {
    catalog,
    rows,
    cards,
    codes,
    setCodes,
    expCounts,
    expansions: EXPANSIONS,
    enriched: enrichIndex.on,
    /** Cartes Netdeck telles qu'importées — la base de cartes s'y adosse. */
    enrichedCards: enriched,
    pricesAt,
    catalogAt,
    storedAt,
    notice,
    setNotice,
    importFiles,
    refreshPrices,
    fetching,
    forget,
  }
}

export type DatasetApi = ReturnType<typeof useDataset>
